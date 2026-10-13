// 录介绍视频的画面：无界面 Chromium 打开 index.html，用假时钟一帧一帧地走（每帧 1/30 秒），
// 每走一帧截一张图。这样 3D 再慢也不掉帧，CSS 动画、打字机、攻城动画都和真机一样流畅。
// 用法：node tools/record-video.cjs <playwright 路径> <输出目录> [chromium 路径]
//   环境变量 DRY=1：不截逐帧图，只在每个镜头开头截一张，用来快速检查流程
//   环境变量 ONLY=sandbox,siege：只保存这几个镜头的帧（其余照走，不截图）
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.argv[2]);
const OUT = process.argv[3];
const EXE = process.argv[4];
const DRY = !!process.env.DRY;
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
const SEED_NOW = 20261649;   // 和 plan-video.cjs 选出的种子一致：首季关羽攻寿春，有单挑和火计
const url = 'file://' + (process.env.GAME || path.resolve(__dirname, '..', 'index.html'));
const W = 1440, H = 810;

const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a, b, t) => a + (b - a) * t;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: EXE, args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 4 / 3 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => m.type() === 'error' && !/fonts|ERR_/.test(m.text()) && errors.push(m.text()));

  await page.clock.install({ time: SEED_NOW - 5000 });
  await page.addInitScript(() => {
    window.__SB_PAUSE = true;
    // CSS 动画和过渡也按假时钟走
    window.__adv = ms => {
      for (const a of document.getAnimations()) {
        if (a.playState === 'running') a.pause();
        a.__vt = (a.__vt || 0) + ms;
        try { a.currentTime = a.__vt; } catch (e) { /* 已移除 */ }
      }
    };
    window.addEventListener('DOMContentLoaded', () => {
      const st = document.createElement('style');
      st.textContent = `#__cur{position:fixed;left:0;top:0;width:30px;height:30px;z-index:99999;pointer-events:none;transform:translate(-100px,-100px);
          background:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='30' height='30' viewBox='0 0 30 30'><path d='M4 3 L4 24 L9.5 18.5 L13.5 27 L17 25.4 L13 17 L20.5 17 Z' fill='white' stroke='%23111' stroke-width='1.6' stroke-linejoin='round'/></svg>") no-repeat;
          filter:drop-shadow(0 2px 3px rgba(0,0,0,.45));}
        .__rip{position:fixed;z-index:99998;pointer-events:none;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;
          border:3px solid #E3C08A;animation:__rip .55s ease-out forwards;}
        @keyframes __rip{from{transform:scale(.3);opacity:1}to{transform:scale(1.5);opacity:0}}`;
      document.head.appendChild(st);
      const c = document.createElement('div'); c.id = '__cur'; document.body.appendChild(c);
      window.__cur = (x, y) => { c.style.transform = `translate(${x - 4}px, ${y - 3}px)`; };
      document.addEventListener('mousedown', e => {
        const r = document.createElement('div'); r.className = '__rip';
        r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px';
        document.body.appendChild(r); setTimeout(() => r.remove(), 700);
      }, true);
    });
  });
  await page.goto(url);

  // ---------- 逐帧 ----------
  let fi = 0, shotName = null, shotDir = null, shotFrames = 0;
  const marks = [];
  const saving = () => shotDir && (!ONLY.length || ONLY.includes(shotName)) && !DRY;
  async function frame() {
    const ms = fi % 3 === 2 ? 33.34 : 33.33;
    await page.clock.runFor(ms);
    await page.evaluate(ms => window.__adv(ms), ms);
    // 沙盘平时暂停自转，这里每帧手动画一张（镜头不动时隔帧画，旗子照样飘）；被剧情、详情、攻城盖住时不画
    await page.evaluate(([k, dry]) => {
      if (!ZL.Sandbox.active() || ['scene', 'profile', 'title', 'siege'].some(id => !document.getElementById(id).hidden)) return;
      const c = ZL.Sandbox._cam(), v = c.view, g = c.goal;
      const moving = Math.abs(v.tx - g.tx) + Math.abs(v.tz - g.tz) + Math.abs(v.dist - g.dist) + Math.abs(v.az - g.az) * 50 + Math.abs(v.pitch - g.pitch) * 50 > 0.05;
      if (dry ? k % 20 === 0 : moving || k % 2 === 0) ZL.Sandbox._frame(dry ? 1 : 1 / 30);
    }, [fi, DRY]);
    if (saving()) await page.screenshot({ path: path.join(shotDir, `${String(shotFrames).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 93 });
    fi++; shotFrames++;
  }
  const hold = async sec => { for (let i = Math.round(sec * 30); i > 0; i--) await frame(); };
  async function shot(name) {
    if (shotName) marks.push({ name: shotName, frames: shotFrames });
    shotName = name; shotFrames = 0;
    shotDir = path.join(OUT, name);
    if (!DRY && (!ONLY.length || ONLY.includes(name))) { fs.rmSync(shotDir, { recursive: true, force: true }); fs.mkdirSync(shotDir, { recursive: true }); }
    console.log('镜头', name);
    if (DRY) await page.screenshot({ path: path.join(OUT, `dry-${marks.length}-${name}.jpg`), type: 'jpeg', quality: 70 });
  }
  // 等页面里某个条件成立（边等边走帧，所以等待过程也录进去）
  async function until(fn, arg, maxSec = 30) {
    for (let i = 0; i < maxSec * 30; i++) { if (await page.evaluate(fn, arg)) return; await frame(); }
    throw new Error('等不到：' + fn.toString());
  }

  // ---------- 鼠标 ----------
  let mx = W * 0.62, my = H * 0.86;
  await page.evaluate(([x, y]) => window.__cur(x, y), [mx, my]);
  async function center(sel) {
    const el = await page.waitForSelector(sel, { state: 'visible', timeout: 15000 });
    await el.evaluate(e => e.scrollIntoView({ block: 'nearest', behavior: 'instant' }));
    const b = await el.boundingBox();
    return [b.x + b.width / 2, b.y + b.height / 2];
  }
  async function moveTo(x, y, sec = 0.6) {
    const x0 = mx, y0 = my, n = Math.max(1, Math.round(sec * 30));
    for (let i = 1; i <= n; i++) {
      const k = ease(i / n);
      mx = lerp(x0, x, k); my = lerp(y0, y, k) - Math.sin(Math.PI * k) * 18;
      await page.mouse.move(mx, my);
      await page.evaluate(([x, y]) => window.__cur(x, y), [mx, my]);
      await frame();
    }
  }
  async function click(sel, sec = 0.6, after = 0.25) {
    const [x, y] = typeof sel === 'string' ? await center(sel) : sel;
    await moveTo(x, y, sec);
    await hold(0.12);
    await page.mouse.down(); await frame(); await frame(); await page.mouse.up();
    await hold(after);
  }
  const vis = sel => page.evaluate(s => { const e = document.querySelector(s); return !!(e && e.offsetParent !== null && !e.closest('[hidden]')); }, sel);

  // 剧情：点对话框推进，直到出现选项或剧情结束
  async function talk(lines, perLine = 2.2) {
    for (let i = 0; i < lines; i++) {
      if (!(await vis('#scene .sc-box')) || (await vis('.sc-choices'))) return;
      await hold(perLine);
      await click([W * 0.5 + (i % 2 ? 40 : -20), H * 0.86], 0.35, 0.1);
    }
  }
  async function toChoices() {
    for (let i = 0; i < 12 && !(await vis('.sc-choices')); i++) {
      await hold(1.6);
      if (!(await vis('#scene .sc-box')) || (await vis('.sc-choices'))) break;
      await click([W * 0.52, H * 0.87], 0.3, 0.1);
    }
    return vis('.sc-choices');
  }
  async function finishScene() {
    for (let i = 0; i < 12 && (await vis('#scene .sc-box')); i++) { await hold(1.4); await click([W * 0.5, H * 0.87], 0.3, 0.1); }
    await until(() => document.getElementById('scene').hidden, null, 10);
  }

  // 沙盘镜头：goal 设成目标，沙盘自己会平滑跟过去；这里再按缓动插值一次，让长镜头更稳
  const cam = () => page.evaluate(() => { const c = ZL.Sandbox._cam(); return c && { goal: Object.assign({}, c.goal), cityPos: c.cityPos }; });
  async function fly(to, sec) {
    const c = await cam(), from = c.goal, n = Math.round(sec * 30);
    for (let i = 1; i <= n; i++) {
      const k = ease(i / n), g = {};
      for (const key in to) g[key] = lerp(from[key], to[key], k);
      await page.evaluate(g => Object.assign(ZL.Sandbox._cam().goal, g), g);
      await frame();
    }
  }

  // =================== 分镜 ===================
  await hold(1.5);   // 字体、图片
  await shot('title');
  await hold(1.4);
  await moveTo(...(await center('.lord.f-wei')), 0.7); await hold(0.4);
  await moveTo(...(await center('.lord.f-wu')), 0.6); await hold(0.4);
  await page.clock.setSystemTime(SEED_NOW);   // 开局种子
  await click('.lord.f-shu', 0.6, 0.2);

  await shot('story');
  await until(() => !document.getElementById('scene').hidden);
  await talk(4, 2.4);
  await hold(1.0);
  await click('[data-sc="skip"]', 0.7, 0.8);

  await shot('brief');
  await until(() => !document.getElementById('overlay').hidden);
  await hold(2.2);
  await click('#overlay .primary', 0.6, 0.6);

  await shot('board');
  await hold(1.2);
  await click('#view-toggle', 0.8, 0.1);
  await until(() => ZL.Sandbox.active() && document.querySelector('.sandbox canvas'), null, 60);
  await hold(0.8);

  await shot('sandbox');
  const c0 = await cam(), xp = c0.cityPos.xiapi, xc = c0.cityPos.xuchang;
  await page.evaluate(() => document.querySelector('.sb-hint') && (document.querySelector('.sb-hint').style.display = 'none'));
  await hold(0.6);
  await fly({ tx: xc.x, tz: xc.z + 8, dist: 120, pitch: 0.62, az: 0.25 }, 3.4);
  await fly({ az: -0.35, dist: 100, pitch: 0.5 }, 3.0);
  await fly({ tx: xp.x, tz: xp.z + 10, dist: 150, pitch: 0.7, az: 0.1 }, 3.2);
  await hold(0.6);

  await shot('order');
  await click(`.sb-label[data-city="xiapi"]`, 0.7, 0.5);
  await click('[data-act="gen"][data-gen="guanyu"]', 0.7, 0.4);
  await click('[data-act="cmd"][data-cmd="attack"][data-gen="guanyu"]', 0.6, 0.6);
  await click('[data-act="pick"][data-target="shouchun"]', 0.6, 0.8);
  await page.evaluate(() => { const r = document.getElementById('f-troops'); if (r) { r.value = 8000; r.dispatchEvent(new Event('input', { bubbles: true })); } });
  await hold(1.2);
  await page.evaluate(() => { window.__SIEGE_T = 0; });
  await click('[data-act="confirm"]', 0.7, 0.1);

  await shot('siege');
  await until(() => document.querySelector('#siege canvas'), null, 60);
  // 攻城动画按帧给时间：每帧 1/30 秒，正好一帧画一次
  for (let k = 0; k <= 9 * 30; k += DRY ? 45 : 1) { await page.evaluate(t => { window.__SIEGE_T = t; }, k / 30); await frame(); }
  await hold(0.5);   // 停在“攻克”印上
  await page.keyboard.press('Escape');   // 动画自己的时钟没走完，直接收尾
  await until(() => document.getElementById('siege').hidden, null, 20);
  await page.evaluate(() => { window.__SIEGE_T = null; });

  await shot('report');   // 战报逐条展开，盖“攻克”印
  await until(() => { const e = document.getElementById('bt-done'); return e && !e.hidden; }, null, 30);
  await hold(1.6);
  await click('#bt-done', 0.6, 0.4);

  await shot('after');
  await hold(0.4);
  if (await vis('#scene .sc-box')) { await talk(3, 2.2); await finishScene(); }
  // 回到寿春看新换的旗
  await page.evaluate(() => ZL.Sandbox.focus('shouchun'));
  await page.evaluate(() => Object.assign(ZL.Sandbox._cam().goal, { dist: 95, pitch: 0.55 }));
  await hold(3.0);
  console.log('寿春归属', await page.evaluate(() => ZL.Sandbox && document.querySelector('.sb-label[data-city="shouchun"]').className));
  await click('[data-act="home"]', 0.7, 0.4);

  await shot('profile');
  await click('[data-act="roster"]', 0.7, 0.8);
  await hold(1.2);
  for (const g of ['guanyu', 'zhangfei']) await click(`.pf-pick[data-gen="${g}"]`, 0.6, 1.8);

  await shot('audience');
  await click('[data-act="audience"]', 0.7, 0.3);
  if (await toChoices()) {
    await hold(1.4);
    await click('.sc-choice >> nth=0', 0.6, 0.3);
  }
  await finishScene();
  await hold(0.5);
  if (await vis('#profile')) await click('[data-act="profile-close"] >> nth=0', 0.6, 0.4);
  if (await vis('[data-act="home"]')) await click('[data-act="home"]', 0.6, 0.4);

  await shot('council');
  await click('[data-act="council"]', 0.8, 0.3);
  if (await toChoices()) {
    await hold(1.2);
    await click('.sc-choice >> nth=0', 0.7, 0.3);
  }
  await finishScene();
  await hold(1.0);

  await shot('end');
  marks.push({ name: shotName, frames: shotFrames });
  fs.writeFileSync(path.join(OUT, 'marks.json'), JSON.stringify(marks, null, 1));
  console.log('共', fi, '帧；错误', errors);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
