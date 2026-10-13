// 剧情对话的演出：水墨山水背景（Canvas 现画）、立绘登场、打字机式对白、选项、自动、跳过、回看。
// 用法：ZL.Scene.play({ bg, place, lines }, hooks, done)
//   lines 里的 who 是武将对象（旁白为 null），choices 的 then 也是同样格式；ui.js 的 playStory 负责把剧本翻译成这个样子
//   带选项的一行可以写 answer（谁来说出选项，比如君主）；选项可以带 act（对话结束后执行的函数，比如打开出征表单）和 end（说完 then 就收尾）
//   hooks：art(g) 立绘 HTML（返回空串就不上台，只在对白框里露头像） · head(g) 头像 HTML · color(g) 势力色 · face(g) 脸在立绘上的位置 [x, y]
(function (ZL) {
  const motion = !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  let cur = null;

  // ---------- 背景 ----------
  const BG = {
    night:  { sky: ['#0A1113', '#1C2A2C'], hills: ['#2B3C40', '#1F2D31', '#152125', '#0B1214'], mist: 'rgba(160,185,185,0.10)',
              orb: { x: 0.92, y: 0.13, r: 0.03, c: '#ECE2C8', glow: 'rgba(236,226,200,0.20)' }, stars: 1, fx: 'fireflies' },
    palace: { sky: ['#110C0D', '#2E1D19'], hills: ['#2B2421', '#1D1816'], mist: 'rgba(210,150,100,0.07)',
              orb: { x: 0.08, y: 0.14, r: 0.028, c: '#E9D4AE', glow: 'rgba(233,212,174,0.16)' }, stars: 1, roofs: 1, fx: 'embers' },
    dawn:   { sky: ['#EBCBA0', '#A2B5B0'], hills: ['#9AACAA', '#7C9295', '#5E767B', '#435A60'], mist: 'rgba(248,236,214,0.42)',
              orb: { x: 0.86, y: 0.15, r: 0.04, c: '#FAEBCB', glow: 'rgba(250,235,203,0.40)' }, water: 1, fx: 'mist' },
    forest: { sky: ['#33473A', '#0D1511'], forest: 1, fx: 'motes' },
    snow:   { sky: ['#BCC4C6', '#8F9A9E'], hills: ['#D9DEDD', '#B7C0C1', '#8E9A9D', '#5F6C70'], mist: 'rgba(238,242,242,0.40)', pines: 1, fx: 'snow' },
    spring: { sky: ['#ECE5C9', '#B8C8B0'], hills: ['#AEBFA9', '#8BA38D', '#668470', '#43614F'], mist: 'rgba(250,246,230,0.45)', bamboo: 1, fx: 'petals' },
  };
  const rng = seed => { let s = (seed >>> 0) || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
  function ridge(r, w, base, amp, rough) {
    const f = [1 + r() * 1.6, 3 + r() * 4, 9 + r() * 9], p = [r() * 6, r() * 6, r() * 6], pts = [];
    for (let x = -10; x <= w + 10; x += Math.max(4, w / 260)) {
      const t = x / w;
      pts.push([x, base - amp * (0.6 * Math.sin(t * f[0] * Math.PI + p[0]) + 0.3 * Math.sin(t * f[1] * Math.PI + p[1])
        + rough * 0.14 * Math.sin(t * f[2] * Math.PI + p[2]) + (r() - 0.5) * rough * 0.05)]);
    }
    return pts;
  }
  function fillRidge(g, pts, h, top, bottom) {
    const ys = pts.map(p => p[1]), y0 = Math.min(...ys);
    const lg = g.createLinearGradient(0, y0, 0, h);
    lg.addColorStop(0, top); lg.addColorStop(1, bottom || top);
    g.beginPath(); g.moveTo(pts[0][0], h);
    for (const [x, y] of pts) g.lineTo(x, y);
    g.lineTo(pts[pts.length - 1][0], h); g.closePath(); g.fillStyle = lg; g.fill();
  }
  function band(g, w, y, hh, c) {
    const lg = g.createLinearGradient(0, y - hh, 0, y + hh);
    lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(0.5, c); lg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = lg; g.fillRect(0, y - hh, w, hh * 2);
  }
  function paint(cv, kind, seed) {
    const g = cv.getContext('2d'), w = cv.width, h = cv.height, B = BG[kind] || BG.night, r = rng(seed);
    let lg = g.createLinearGradient(0, 0, 0, h);
    lg.addColorStop(0, B.sky[0]); lg.addColorStop(1, B.sky[1]);
    g.fillStyle = lg; g.fillRect(0, 0, w, h);
    if (B.stars) for (let i = 0; i < 160; i++) {
      g.globalAlpha = 0.15 + r() * 0.5; g.fillStyle = '#E8E0CC';
      g.fillRect(r() * w, r() * h * 0.5, 1 + r() * 1.2, 1 + r() * 1.2);
    }
    g.globalAlpha = 1;
    if (B.orb) {
      const o = B.orb, x = o.x * w, y = o.y * h, rr = o.r * Math.min(w, h) * 1.6;
      const rg = g.createRadialGradient(x, y, 0, x, y, rr * 6);
      rg.addColorStop(0, o.glow); rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg; g.fillRect(0, 0, w, h);
      g.fillStyle = o.c; g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill();
    }
    if (B.hills) B.hills.forEach((c, i) => {
      const n = B.hills.length, base = h * (0.48 + i * (0.36 / n)), amp = h * (0.2 - i * 0.03);
      const pts = ridge(r, w, base, amp, 1 + i * 0.6);
      fillRidge(g, pts, h, c, B.hills[Math.min(n - 1, i + 1)]);
      band(g, w, base + h * 0.06, h * 0.07, B.mist);
      if (B.pines && i >= n - 2) pines(g, r, pts, i === n - 1 ? '#3D4A4E' : '#6E7B7E', h * (i === n - 1 ? 0.05 : 0.03));
    });
    if (B.roofs) roofs(g, r, w, h);
    if (B.water) water(g, r, w, h);
    if (B.forest) forest(g, r, w, h);
    if (B.bamboo) bamboo(g, r, w, h);
    // 绢本纸纹 + 暗角
    for (let i = 0; i < (w * h) / 900; i++) { g.globalAlpha = 0.025 + r() * 0.03; g.fillStyle = r() < 0.5 ? '#000' : '#fff'; g.fillRect(r() * w, r() * h, 1.4, 1); }
    g.globalAlpha = 1;
    const vg = g.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.35, w / 2, h * 0.45, Math.max(w, h) * 0.8);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    g.fillStyle = vg; g.fillRect(0, 0, w, h);
  }
  function pines(g, r, pts, c, s) {
    g.fillStyle = c;
    for (let k = 0; k < pts.length; k += 3 + Math.floor(r() * 6)) {
      const [x, y] = pts[k], hh = s * (0.6 + r());
      for (let j = 0; j < 4; j++) {
        const yy = y - hh * j * 0.32, ww = hh * (0.42 - j * 0.08);
        g.beginPath(); g.moveTo(x - ww, yy); g.lineTo(x, yy - hh * 0.5); g.lineTo(x + ww, yy); g.fill();
      }
    }
  }
  function roofs(g, r, w, h) {
    // 宫阙剪影：几重飞檐，檐下挂灯
    const ground = h * 0.86;
    [[0.12, 0.62, 0.34], [0.52, 0.56, 0.42], [0.86, 0.66, 0.3]].forEach(([cx, top, span]) => {
      const x0 = (cx - span / 2) * w, x1 = (cx + span / 2) * w, y = top * h, eave = h * 0.035;
      g.fillStyle = '#0C0909';
      g.fillRect(x0 + span * w * 0.12, y, (x1 - x0) * 0.76, ground - y);
      g.beginPath();
      g.moveTo(x0 - eave * 1.6, y - eave * 0.9);
      g.quadraticCurveTo(x0 + span * w * 0.1, y - eave * 0.1, x0 + span * w * 0.22, y - eave * 1.6);
      g.lineTo(x1 - span * w * 0.22, y - eave * 1.6);
      g.quadraticCurveTo(x1 - span * w * 0.1, y - eave * 0.1, x1 + eave * 1.6, y - eave * 0.9);
      g.lineTo(x1 - span * w * 0.06, y + eave * 0.5); g.lineTo(x0 + span * w * 0.06, y + eave * 0.5); g.closePath(); g.fill();
      for (let k = 0; k < 3; k++) {
        const lx = x0 + (x1 - x0) * (0.25 + k * 0.25), ly = y + eave * 2.2, rr = h * 0.06;
        const rg = g.createRadialGradient(lx, ly, 0, lx, ly, rr);
        rg.addColorStop(0, 'rgba(232,140,70,0.55)'); rg.addColorStop(1, 'rgba(232,140,70,0)');
        g.fillStyle = rg; g.fillRect(lx - rr, ly - rr, rr * 2, rr * 2);
        g.fillStyle = '#E39A55'; g.fillRect(lx - 3, ly - 5, 6, 10);
      }
    });
    g.fillStyle = '#080606'; g.fillRect(0, ground, w, h - ground);
  }
  function water(g, r, w, h) {
    const y0 = h * 0.74, lg = g.createLinearGradient(0, y0, 0, h);
    lg.addColorStop(0, 'rgba(120,145,148,0.95)'); lg.addColorStop(1, 'rgba(48,66,72,1)');
    g.fillStyle = lg; g.fillRect(0, y0, w, h - y0);
    g.strokeStyle = 'rgba(245,232,210,0.35)'; g.lineWidth = 1;
    for (let i = 0; i < 90; i++) {
      const y = y0 + (h - y0) * Math.pow(r(), 1.4), x = r() * w, l = 20 + r() * 90;
      g.globalAlpha = 0.2 + r() * 0.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y); g.stroke();
    }
    g.globalAlpha = 1; g.fillStyle = '#26363A';
    [[0.18, 0.79, 1], [0.66, 0.83, 1.4], [0.83, 0.77, 0.7]].forEach(([bx, by, s]) => {
      const x = bx * w, y = by * h, L = w * 0.06 * s;
      g.beginPath(); g.moveTo(x - L, y); g.quadraticCurveTo(x, y + L * 0.28, x + L, y); g.lineTo(x + L * 0.8, y + L * 0.06); g.lineTo(x - L * 0.8, y + L * 0.06); g.fill();
      g.fillRect(x - 1.5, y - L * 0.9, 3, L * 0.9);
      g.beginPath(); g.moveTo(x + 2, y - L * 0.85); g.quadraticCurveTo(x + L * 0.55, y - L * 0.5, x + 2, y - L * 0.12); g.fill();
    });
  }
  function forest(g, r, w, h) {
    // 林间：远近三层树干、天光、地面
    const layers = [['rgba(70,92,74,0.55)', 0.006, 22], ['rgba(36,50,40,0.85)', 0.012, 12], ['#0A100C', 0.024, 7]];
    const rays = () => {
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6; i++) {
        const x = w * (0.35 + r() * 0.35), spread = w * (0.04 + r() * 0.06);
        const lg = g.createLinearGradient(0, 0, 0, h * 0.9);
        lg.addColorStop(0, 'rgba(225,235,200,0.16)'); lg.addColorStop(1, 'rgba(225,235,200,0)');
        g.fillStyle = lg; g.beginPath(); g.moveTo(x, -10); g.lineTo(x + spread * 0.4, -10);
        g.lineTo(x + spread * 3 + w * 0.1, h * 0.9); g.lineTo(x + spread * 1.2 + w * 0.05, h * 0.9); g.fill();
      }
      g.restore();
    };
    const top = g.createRadialGradient(w * 0.55, -h * 0.05, 0, w * 0.55, -h * 0.05, h * 0.7);
    top.addColorStop(0, 'rgba(230,236,205,0.55)'); top.addColorStop(1, 'rgba(230,236,205,0)');
    g.fillStyle = top; g.fillRect(0, 0, w, h);
    layers.forEach(([c, wd, n], li) => {
      g.fillStyle = c;
      for (let i = 0; i < n; i++) {
        const x = r() * w, tw = w * wd * (0.6 + r() * 0.9);
        if (li === 2 && x > w * 0.32 && x < w * 0.68) continue; // 近景树干让开中间，别挡人物
        g.beginPath(); g.moveTo(x - tw / 2, h); g.lineTo(x - tw * 0.32, -10); g.lineTo(x + tw * 0.32, -10); g.lineTo(x + tw / 2, h); g.fill();
      }
      if (li === 0) rays();
      band(g, w, h * (0.55 + li * 0.1), h * 0.08, 'rgba(180,200,170,0.07)');
    });
    const gr = g.createLinearGradient(0, h * 0.72, 0, h);
    gr.addColorStop(0, 'rgba(12,20,14,0)'); gr.addColorStop(1, 'rgba(8,12,9,0.95)');
    g.fillStyle = gr; g.fillRect(0, h * 0.72, w, h * 0.28);
    g.strokeStyle = 'rgba(70,98,60,0.55)'; g.lineWidth = 1.2;
    for (let i = 0; i < 220; i++) {
      const x = r() * w, y = h * (0.86 + r() * 0.14), l = 8 + r() * 22;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (r() - 0.5) * 8, y - l / 2, x + (r() - 0.5) * 14, y - l); g.stroke();
    }
  }
  function bamboo(g, r, w, h) {
    // 两侧竹林
    for (let side = 0; side < 2; side++) for (let i = 0; i < 7; i++) {
      const x = side ? w * (0.86 + r() * 0.14) : w * r() * 0.14, tw = 5 + r() * 7, c = r() < 0.5 ? '#3E5B45' : '#2D4634';
      g.fillStyle = c; g.fillRect(x, -10, tw, h + 20);
      g.fillStyle = 'rgba(20,30,22,0.6)';
      for (let y = r() * 60; y < h; y += 60 + r() * 40) g.fillRect(x - 1, y, tw + 2, 2.5);
      g.fillStyle = c;
      for (let k = 0; k < 6; k++) {
        const ly = r() * h * 0.7, dir = r() < 0.5 ? -1 : 1;
        g.save(); g.translate(x + tw / 2, ly); g.rotate(dir * (0.5 + r() * 0.6));
        g.beginPath(); g.ellipse(dir * 26, 0, 28, 4.5, 0, 0, Math.PI * 2); g.fill(); g.restore();
      }
    }
  }

  // ---------- 粒子：雪、花瓣、萤火、火星、浮尘、薄雾 ----------
  function makeFx(kind, w, h) {
    const n = { snow: 140, petals: 36, fireflies: 20, embers: 40, motes: 46, mist: 10 }[kind] || 0;
    const r = Math.random, P = [];
    for (let i = 0; i < n; i++) P.push({ x: r() * w, y: r() * h, s: r(), a: r() * Math.PI * 2, v: 0.4 + r() });
    return { kind, P };
  }
  function stepFx(g, fx, w, h, t) {
    g.clearRect(0, 0, w, h);
    const d = Math.min(w, h) / 900;
    for (const p of fx.P) {
      switch (fx.kind) {
        case 'snow':
          p.y += (0.6 + p.s * 1.4) * d * 1.6; p.x += Math.sin(t / 900 + p.a) * 0.4 * d;
          if (p.y > h) { p.y = -5; p.x = Math.random() * w; }
          g.fillStyle = `rgba(255,255,255,${0.35 + p.s * 0.55})`; g.beginPath(); g.arc(p.x, p.y, (1 + p.s * 2.4) * d * 1.4, 0, 7); g.fill(); break;
        case 'petals':
          p.y += (0.5 + p.s) * d; p.x += (0.6 + Math.sin(t / 700 + p.a)) * d; p.a += 0.02;
          if (p.y > h || p.x > w + 10) { p.y = -10; p.x = Math.random() * w * 0.8; }
          g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = `rgba(240,${190 + p.s * 30},${195 + p.s * 30},0.8)`;
          g.beginPath(); g.ellipse(0, 0, 5 * d + 2, 2.4 * d + 1, 0, 0, 7); g.fill(); g.restore(); break;
        case 'fireflies': case 'motes': {
          p.x += Math.cos(p.a) * 0.3 * p.v * d; p.y += Math.sin(p.a) * 0.25 * p.v * d - (fx.kind === 'motes' ? 0.05 : 0); p.a += (Math.random() - 0.5) * 0.12;
          if (p.x < 0 || p.x > w || p.y < 0 || p.y > h) { p.x = Math.random() * w; p.y = h * (0.3 + Math.random() * 0.6); }
          const glow = fx.kind === 'fireflies' ? 0.4 + 0.6 * Math.abs(Math.sin(t / 600 + p.a * 3)) : 0.25 + p.s * 0.3;
          const c = fx.kind === 'fireflies' ? '238,214,140' : '230,238,210';
          const rr = (fx.kind === 'fireflies' ? 3 : 2) * d + 1;
          const rg = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr * 2.5);
          rg.addColorStop(0, `rgba(${c},${glow})`); rg.addColorStop(1, `rgba(${c},0)`);
          g.fillStyle = rg; g.fillRect(p.x - rr * 2.5, p.y - rr * 2.5, rr * 5, rr * 5); break;
        }
        case 'embers':
          p.y -= (0.4 + p.s) * d * 1.2; p.x += Math.sin(t / 500 + p.a) * 0.5 * d;
          if (p.y < h * 0.2) { p.y = h * (0.85 + Math.random() * 0.15); p.x = Math.random() * w; }
          g.fillStyle = `rgba(240,${120 + p.s * 80},60,${0.3 + p.s * 0.6})`; g.fillRect(p.x, p.y, 2 * d + 1, 2 * d + 1); break;
        case 'mist':
          p.x += 0.15 * p.v * d; if (p.x > w + 300) p.x = -300;
          { const yy = h * (0.45 + p.s * 0.35), rr = w * 0.25;
            const rg = g.createRadialGradient(p.x, yy, 0, p.x, yy, rr);
            rg.addColorStop(0, 'rgba(250,240,220,0.10)'); rg.addColorStop(1, 'rgba(250,240,220,0)');
            g.fillStyle = rg; g.fillRect(p.x - rr, yy - rr, rr * 2, rr * 2); }
          break;
      }
    }
  }

  // ---------- 播放 ----------
  const $ = (s, el) => (el || document).querySelector(s);
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  function play(scene, hooks, done) {
    if (cur) end(true);
    const root = $('#scene');
    root.innerHTML = `
      <canvas class="sc-bg"></canvas><canvas class="sc-fx"></canvas>
      <div class="sc-cast"></div>
      ${scene.place ? `<div class="sc-place"><span>${esc(scene.place)}</span></div>` : ''}
      <div class="sc-top">
        <div class="sc-tools">
          <button class="sc-btn icon" data-sc="hide" aria-label="隐藏对话框" title="隐藏对话框"><i><b>◎</b></i></button>
          <button class="sc-btn icon" data-sc="log" aria-label="回看" title="回看"><i><b>≡</b></i></button>
        </div>
        <div class="sc-tools">
          <button class="sc-btn" data-sc="auto" aria-pressed="false">自动<i><b>▶</b></i></button>
          <button class="sc-btn" data-sc="skip">跳过<i><b>▶▶</b></i></button>
        </div>
      </div>
      <div class="sc-choices" hidden></div>
      <div class="sc-box" aria-live="polite">
        <div class="sc-head"></div>
        <div class="sc-body">
          <div class="sc-name"><b></b></div>
          <p class="sc-text"></p>
        </div>
        <span class="sc-next" aria-hidden="true">▼</span>
      </div>
      <div class="sc-log" hidden></div>`;
    root.hidden = false;
    requestAnimationFrame(() => root.classList.add('show'));
    cur = { root, hooks, done, lines: scene.lines.slice(), i: -1, cast: [], seq: 0, log: [], auto: false, typing: null, choosing: false, timer: null, raf: 0 };
    const bg = $('.sc-bg', root), fxc = $('.sc-fx', root), seed = [...(scene.bg || 'x')].reduce((a, c) => a * 31 + c.charCodeAt(0), 7);
    const size = () => {
      const k = Math.min(2, window.devicePixelRatio || 1), w = Math.round(root.clientWidth * k), h = Math.round(root.clientHeight * k);
      for (const c of [bg, fxc]) { c.width = w; c.height = h; }
      paint(bg, scene.bg, seed);
      cur.fx = makeFx((BG[scene.bg] || BG.night).fx, w, h);
      if (!motion) stepFx(fxc.getContext('2d'), cur.fx, w, h, 0);
    };
    size();
    cur.onResize = () => { if (cur) size(); };
    window.addEventListener('resize', cur.onResize);
    if (motion) {
      const g = fxc.getContext('2d');
      const loop = t => { if (!cur) return; stepFx(g, cur.fx, fxc.width, fxc.height, t); cur.raf = requestAnimationFrame(loop); };
      cur.raf = requestAnimationFrame(loop);
    }
    root.onclick = onClick;
    document.addEventListener('keydown', onKey, true);
    setTimeout(advance, scene.place && motion ? 900 : 60);
  }

  function onClick(e) {
    const b = e.target.closest('[data-sc]');
    if (cur.root.classList.contains('bare')) { cur.root.classList.remove('bare'); return; }
    if (!b) { if (!$('.sc-log', cur.root).hidden) { $('.sc-log', cur.root).hidden = true; return; } advance(); return; }
    switch (b.dataset.sc) {
      case 'skip': end(); break;
      case 'auto':
        cur.auto = !cur.auto; b.setAttribute('aria-pressed', cur.auto); b.classList.toggle('on', cur.auto);
        if (cur.auto && !cur.typing && !cur.choosing) schedule();
        break;
      case 'hide': cur.root.classList.add('bare'); break;
      case 'log': showLog(); break;
      case 'choose': choose(+b.dataset.i); break;
    }
  }
  function onKey(e) {
    if (!cur) return;
    if (['Enter', ' ', 'ArrowRight', 'ArrowDown'].includes(e.key)) {
      if (cur.choosing && e.target.closest && e.target.closest('[data-sc="choose"]')) return; // 让选项按钮自己响应
      e.preventDefault(); e.stopPropagation(); advance();
    } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); end(); }
  }

  function advance() {
    if (!cur) return;
    clearTimeout(cur.timer);
    if (cur.typing) { finishTyping(); return; }
    if (cur.choosing) return;
    cur.i++;
    if (cur.i >= cur.lines.length) { end(); return; }
    show(cur.lines[cur.i]);
  }
  function schedule() {
    clearTimeout(cur.timer);
    const line = cur.lines[cur.i];
    cur.timer = setTimeout(advance, 1100 + (line ? line.text.length * 60 : 0));
  }

  function stage(g) {
    const castEl = $('.sc-cast', cur.root);
    if (g) {
      let a = cur.cast.find(x => x.g.id === g.id);
      const art = a ? '' : cur.hooks.art(g);
      if (!a && art) {
        if (cur.cast.length >= 2) {
          const old = cur.cast.slice().sort((x, y) => x.t - y.t)[0];
          cur.cast = cur.cast.filter(x => x !== old);
          old.el.classList.add('out'); setTimeout(() => old.el.remove(), 500);
        }
        const el = document.createElement('div');
        const [fx, fy] = cur.hooks.face(g);
        el.className = 'sc-actor';
        el.style.setProperty('--fx', (fx * 100).toFixed(1) + '%');
        el.style.setProperty('--fy', (fy * 100).toFixed(1) + '%');
        el.innerHTML = art;
        castEl.appendChild(el);
        a = { g, el, t: 0, order: ++cur.seq };
        cur.cast.push(a);
        if (motion) requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in'))); else el.classList.add('in');
      }
      if (a) a.t = ++cur.seq;
    }
    const sorted = cur.cast.slice().sort((x, y) => x.order - y.order);
    sorted.forEach((a, k) => {
      a.el.classList.remove('slot-c', 'slot-l', 'slot-r');
      a.el.classList.add(sorted.length === 1 ? 'slot-c' : k === 0 ? 'slot-l' : 'slot-r');
      a.el.classList.toggle('on', !!g && a.g.id === g.id);
    });
  }

  function show(line) {
    const root = cur.root, box = $('.sc-box', root), who = line.who;
    stage(who);
    box.classList.toggle('narr', !who);
    $('.sc-head', root).innerHTML = who ? cur.hooks.head(who) : '';
    $('.sc-name b', root).textContent = who ? who.name : '';
    box.style.setProperty('--sc-fc', who ? cur.hooks.color(who) : 'transparent');
    cur.log.push({ name: who ? who.name : '', text: line.text });
    type($('.sc-text', root), line.text, () => {
      if (line.choices && line.choices.length) offer(line);
      else if (cur.auto) schedule();
    });
  }
  function type(el, text, then) {
    clearInterval(cur.typing);
    cur.root.classList.add('typing');
    if (!motion) { el.textContent = text; cur.typing = null; cur.root.classList.remove('typing'); then(); return; }
    let n = 0;
    el.textContent = '';
    cur.finish = () => { clearInterval(cur.typing); cur.typing = null; el.textContent = text; cur.root.classList.remove('typing'); then(); };
    cur.typing = setInterval(() => {
      n += 1; el.textContent = text.slice(0, n);
      if (n >= text.length) cur.finish();
    }, 34);
  }
  function finishTyping() { if (cur.finish) cur.finish(); }

  function offer(line) {
    cur.choosing = line;
    const el = $('.sc-choices', cur.root);
    el.innerHTML = line.choices.map((c, i) => `<button class="sc-choice" data-sc="choose" data-i="${i}"><i>◆</i>${esc(c.text)}</button>`).join('');
    el.hidden = false;
    cur.root.classList.add('choosing');
    const b = el.querySelector('button'); if (b) b.focus({ preventScroll: true });
  }
  function choose(i) {
    const line = cur.choosing, c = line && line.choices[i];
    if (!c) return;
    cur.choosing = false;
    $('.sc-choices', cur.root).hidden = true;
    cur.root.classList.remove('choosing');
    // 选项原话由 answer（回话的人，比如君主）说出；没有就由提问的人自己说
    cur.lines.splice(cur.i + 1, 0, { who: line.answer || line.who, text: c.text }, ...(c.then || []));
    if (c.act) cur.afterAct = c.act;   // 对话结束后执行（比如打开出征表单）
    if (c.end) cur.lines.length = cur.i + 2 + (c.then || []).length;   // 选了就收尾，后面的不再说
    advance();
  }

  function showLog() {
    const el = $('.sc-log', cur.root);
    el.innerHTML = `<div class="sc-log-in"><h3>回看</h3>${cur.log.map(l => `<p>${l.name ? `<b>${esc(l.name)}</b>` : ''}<span class="${l.name ? '' : 'narr'}">${esc(l.text)}</span></p>`).join('')}<small>点任意处返回</small></div>`;
    el.hidden = false;
    el.scrollTop = el.scrollHeight;
  }

  function end(silent) {
    if (!cur) return;
    const c = cur;
    cur = null;
    clearTimeout(c.timer); clearInterval(c.typing); cancelAnimationFrame(c.raf);
    window.removeEventListener('resize', c.onResize);
    document.removeEventListener('keydown', onKey, true);
    c.root.classList.remove('show');
    const finish = () => {
      c.root.hidden = true; c.root.innerHTML = ''; c.root.className = '';
      if (!silent && c.done) c.done();
      if (!silent && c.afterAct) c.afterAct();
    };
    if (motion && !silent) setTimeout(finish, 320); else finish();
  }

  ZL.Scene = { play, active: () => !!cur };
})(globalThis.ZL = globalThis.ZL || {});
