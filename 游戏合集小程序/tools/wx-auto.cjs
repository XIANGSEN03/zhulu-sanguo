// 微信开发者工具自动化接口的最小客户端（不依赖 npm 包）。
// 先用 cli.bat auto --project <项目目录> --auto-port 9420 打开自动化端口，再运行：
//   node tools/wx-auto.cjs run "log" "data" "shot:预览/a.png" "call:onUndo" "wait:500" ...
// 步骤：
//   log            开始收集控制台日志和异常（结束时统一打印）
//   info           基础库版本、当前页面路径
//   data[:键,键]   当前页面 data（可只取部分键）
//   shot:文件      模拟器截图，保存为 png
//   call:方法[:JSON参数数组]  调用当前页面的方法
//   tap:选择器     点击页面上的元素
//   eval:代码      在逻辑层执行一段函数体（可 return 结果）
//   wx:方法[:JSON参数数组]    调用 wx.xxx
//   relaunch[:路径] 重新打开页面
//   tapn:选择器:序号     点第 n 个匹配元素
//   press:选择器:序号    对第 n 个元素按下再抬起（方向键用触摸事件）
//   exists:选择器       页面上有没有这个元素
//   wait:毫秒
// 注意：别在 eval 里取 3D 画布节点（fields({node:true})），会卡住模拟器显示层。
const fs = require('fs');
const path = require('path');

const PORT = process.env.WX_AUTO_PORT || 9420;

function connect() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${PORT}`);
    const pending = new Map();
    const listeners = {};
    let seq = 0;
    ws.onopen = () => resolve({
      send(method, params = {}) {
        const id = `c${++seq}`;
        ws.send(JSON.stringify({ id, method, params }));
        return new Promise((res, rej) => {
          const timer = setTimeout(() => { pending.delete(id); rej(new Error(`${method} 超时`)); }, 30000);
          pending.set(id, { res, rej, timer });
        });
      },
      on(method, fn) { (listeners[method] || (listeners[method] = [])).push(fn); },
      close() { ws.close(); }
    });
    ws.onerror = () => reject(new Error(`连不上 ws://127.0.0.1:${PORT}，先运行 cli.bat auto`));
    ws.onmessage = event => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const p = pending.get(msg.id); pending.delete(msg.id); clearTimeout(p.timer);
        if (msg.error) p.rej(new Error(msg.error.message || JSON.stringify(msg.error))); else p.res(msg.result || {});
      } else if (msg.method) (listeners[msg.method] || []).forEach(fn => fn(msg.params));
    };
  });
}

const fmt = v => typeof v === 'string' ? v : JSON.stringify(v);

async function run(steps) {
  const c = await connect();
  const logs = [];
  const page = async () => c.send('App.getCurrentPage');
  try {
    for (const step of steps) {
      const [cmd, ...rest] = step.split(':');
      const arg = rest.join(':');
      if (cmd === 'log') {
        c.on('App.logAdded', p => logs.push(`[${p.type}] ${(p.args || []).map(fmt).join(' ')}`));
        c.on('App.exceptionThrown', p => logs.push(`[exception] ${fmt(p.exceptionDetails || p)}`));
        await c.send('App.enableLog');
      } else if (cmd === 'info') {
        const info = await c.send('Tool.getInfo');
        const cur = await page();
        console.log('info', JSON.stringify({ SDKVersion: info.SDKVersion, page: cur.path, query: cur.query }));
      } else if (cmd === 'data') {
        const cur = await page();
        const { data } = await c.send('Page.getData', { pageId: cur.pageId, path: '' });
        const keys = arg ? arg.split(',') : Object.keys(data).filter(k => k !== 'orders');
        const out = {}; keys.forEach(k => { out[k] = data[k]; });
        console.log('data', JSON.stringify(out));
      } else if (cmd === 'shot') {
        const { data } = await c.send('App.captureScreenshot');
        const file = path.resolve(arg || 'shot.png');
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, Buffer.from(data, 'base64'));
        console.log('shot', file);
      } else if (cmd === 'call') {
        // Page.callMethod 在当前开发者工具里拿不到页面方法，改为在逻辑层取当前页面实例来调用
        const [method, json] = [rest[0], rest.slice(1).join(':')];
        const body = `const ps = getCurrentPages(), p = ps[ps.length - 1];
          if (typeof p[${JSON.stringify(method)}] !== 'function') throw new Error('页面没有方法 ${method}');
          const r = p[${JSON.stringify(method)}](...${json || '[]'}); return r === undefined ? null : JSON.parse(JSON.stringify(r));`;
        const r = await c.send('App.callFunction', { functionDeclaration: `function(){${body}}`, args: [] });
        console.log('call', method, fmt(r.result));
      } else if (cmd === 'tap') {
        const cur = await page();
        const el = await c.send('Page.getElement', { pageId: cur.pageId, selector: arg });
        await c.send('Element.tap', { pageId: cur.pageId, elementId: el.elementId });
        console.log('tap', arg);
      } else if (cmd === 'tapn') {
        // tapn:选择器:序号  点击第 n 个匹配的元素（从 0 开始）
        const sel = rest.slice(0, -1).join(':'), n = Number(rest[rest.length - 1]);
        const cur = await page();
        const { elements } = await c.send('Page.getElements', { pageId: cur.pageId, selector: sel });
        if (!elements || !elements[n]) throw new Error(`找不到第 ${n} 个 ${sel}`);
        await c.send('Element.tap', { pageId: cur.pageId, elementId: elements[n].elementId });
        console.log('tapn', sel, n);
      } else if (cmd === 'press') {
        // press:选择器:序号  对第 n 个元素发送手指按下 + 抬起（方向键用的是触摸事件，不是 tap）
        const sel = rest.slice(0, -1).join(':'), n = Number(rest[rest.length - 1]);
        const cur = await page();
        const { elements } = await c.send('Page.getElements', { pageId: cur.pageId, selector: sel });
        if (!elements || !elements[n]) throw new Error(`找不到第 ${n} 个 ${sel}`);
        const t = [{ identifier: 0, pageX: 1, pageY: 1, clientX: 1, clientY: 1 }];
        const base = { pageId: cur.pageId, elementId: elements[n].elementId };
        await c.send('Element.touchstart', Object.assign({ touches: t, changedTouches: t }, base));
        await new Promise(r => setTimeout(r, 60));
        await c.send('Element.touchend', Object.assign({ touches: [], changedTouches: t }, base));
        console.log('press', sel, n);
      } else if (cmd === 'exists') {
        const cur = await page();
        let found = true;
        try { await c.send('Page.getElement', { pageId: cur.pageId, selector: arg }); } catch (e) { found = false; }
        console.log('exists', arg, found);
      } else if (cmd === 'rect') {
        // rect:选择器  元素在页面上的位置和大小
        const cur = await page();
        const el = await c.send('Page.getElement', { pageId: cur.pageId, selector: arg });
        const ids = { elementId: el.elementId, pageId: cur.pageId };
        const off = await c.send('Element.getOffset', ids);
        console.log('rect', arg, fmt(off));
      } else if (cmd === 'eval') {
        const r = await c.send('App.callFunction', { functionDeclaration: `function(){${arg}}`, args: [] });
        console.log('eval', fmt(r.result));
      } else if (cmd === 'wx') {
        const [method, json] = [rest[0], rest.slice(1).join(':')];
        const r = await c.send('App.callWxMethod', { method, args: json ? JSON.parse(json) : [] });
        console.log('wx', method, fmt(r.result));
      } else if (cmd === 'relaunch') {
        await c.send('App.callWxMethod', { method: 'reLaunch', args: [{ url: arg || '/pages/game/index' }] });
        console.log('relaunch', arg || '/pages/game/index');
      } else if (cmd === 'wait') {
        await new Promise(r => setTimeout(r, Number(arg) || 500));
      } else {
        throw new Error('不认识的步骤 ' + step);
      }
    }
  } finally {
    if (logs.length) { console.log('--- 控制台 ---'); logs.forEach(l => console.log(l)); }
    c.close();
  }
}

const [, , cmd, ...steps] = process.argv;
if (cmd !== 'run' || !steps.length) { console.log('用法: node tools/wx-auto.cjs run 步骤...'); process.exit(1); }
run(steps).catch(e => { console.error('失败:', e.message); process.exit(1); });
