// 舆图底图：在 Canvas 2D 上画绢本、海、河、山、势力晕染和道路。
// 城池、地名这些要点击、要用书法字的东西，用 WXML 叠在画布上面（见 pages/game/index.wxml）。
// 颜色和网页版 style.css 里的变量保持一致。
const ZL = require('./engine');

const COLOR = {
  silk: '#D7C59F', ink: '#2B231A', inkSoft: '#6B5B46', water: '#5A8C93', waterHi: '#8DB2B3',
  hill: '#7D8D5F', seal: '#B53F2B',
  wei: '#4A78A8', yuan: '#C29330', wu: '#C04E37', shu: '#4C9361',
};
const MAP_W = 880, MAP_H = 800;

function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

// 把 data.js 里的 SVG 路径（只用到 M L C S Q Z 这几种绝对坐标命令）转成画布指令
function parsePath(d) {
  const tokens = d.match(/[MLCSQZ]|-?\d*\.?\d+/gi);
  const out = [];
  let i = 0, cmd = null, cx = 0, cy = 0, sx = 0, sy = 0, lastCtrl = null;
  const num = () => parseFloat(tokens[i++]);
  while (i < tokens.length) {
    if (/^[MLCSQZ]$/i.test(tokens[i])) {
      cmd = tokens[i++].toUpperCase();
      if (cmd === 'Z') { out.push({ c: 'Z' }); cx = sx; cy = sy; lastCtrl = null; continue; }
    }
    if (cmd === 'M') { cx = num(); cy = num(); sx = cx; sy = cy; out.push({ c: 'M', p: [cx, cy] }); cmd = 'L'; lastCtrl = null; }
    else if (cmd === 'L') { cx = num(); cy = num(); out.push({ c: 'L', p: [cx, cy] }); lastCtrl = null; }
    else if (cmd === 'C' || cmd === 'S') {
      const p = cmd === 'C'
        ? [num(), num(), num(), num(), num(), num()]
        : [lastCtrl ? 2 * cx - lastCtrl[0] : cx, lastCtrl ? 2 * cy - lastCtrl[1] : cy, num(), num(), num(), num()];
      out.push({ c: 'C', p }); lastCtrl = [p[2], p[3]]; cx = p[4]; cy = p[5];
    } else if (cmd === 'Q') {
      const p = [num(), num(), num(), num()];
      out.push({ c: 'Q', p }); cx = p[2]; cy = p[3]; lastCtrl = null;
    } else i++;
  }
  return out;
}
function trace(ctx, segs) {
  ctx.beginPath();
  for (const s of segs) {
    if (s.c === 'M') ctx.moveTo(s.p[0], s.p[1]);
    else if (s.c === 'L') ctx.lineTo(s.p[0], s.p[1]);
    else if (s.c === 'C') ctx.bezierCurveTo(...s.p);
    else if (s.c === 'Q') ctx.quadraticCurveTo(...s.p);
    else ctx.closePath();
  }
}
const PATHS = {
  coast: parsePath(ZL.MAP.coast),
  yellow: parsePath(ZL.MAP.yellowRiver),
  yangtze: parsePath(ZL.MAP.yangtze),
};

// 道路轻微弯曲，和网页版用同一个公式，看起来像手绘
function roadCurve(a, b) {
  const A = ZL.CITIES[a], B = ZL.CITIES[b];
  const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1;
  const bend = (((A.x * 7 + B.y * 3) % 17) - 8) * 0.9;
  return [A.x, A.y, (A.x + B.x) / 2 - (dy / len) * bend, (A.y + B.y) / 2 + (dx / len) * bend, B.x, B.y];
}

function seeded(seed) {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
}

function drawSilk(ctx) {
  ctx.fillStyle = COLOR.silk;
  ctx.fillRect(0, 0, MAP_W, MAP_H);
  const rnd = seeded(5);
  ctx.fillStyle = COLOR.ink;
  for (let i = 0; i < 9000; i++) {
    ctx.globalAlpha = 0.02 + rnd() * 0.06;
    ctx.fillRect(rnd() * MAP_W, rnd() * MAP_H, 1 + rnd() * 1.4, 1);
  }
  ctx.strokeStyle = COLOR.ink;
  for (let i = 0; i < 260; i++) {
    ctx.globalAlpha = 0.02 + rnd() * 0.04;
    ctx.lineWidth = 0.6 + rnd();
    const y = rnd() * MAP_H, x = rnd() * MAP_W - 60, len = 40 + rnd() * 140;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y + (rnd() - 0.5) * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawSea(ctx) {
  trace(ctx, PATHS.coast);
  ctx.fillStyle = rgba(COLOR.water, 0.32);
  ctx.fill();
  ctx.save();
  trace(ctx, PATHS.coast);
  ctx.clip();
  ctx.strokeStyle = rgba(COLOR.water, 0.45);
  ctx.lineWidth = 1.2;
  for (let y = -10; y < MAP_H + 20; y += 20) {
    ctx.beginPath();
    for (let x = 560; x < MAP_W + 40; x += 40) {
      ctx.moveTo(x, y + 14);
      ctx.quadraticCurveTo(x + 10, y + 6, x + 20, y + 14);
      ctx.quadraticCurveTo(x + 30, y + 22, x + 40, y + 14);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawTerritory(ctx, S) {
  for (const c of Object.values(S.cities)) {
    if (!c.owner) continue;
    const p = ZL.CITIES[c.id], col = COLOR[c.owner];
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 92);
    g.addColorStop(0, rgba(col, 0.31));
    g.addColorStop(0.55, rgba(col, 0.17));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(p.x - 92, p.y - 92, 184, 184);
  }
}

function drawRivers(ctx) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const path of [PATHS.yellow, PATHS.yangtze]) {
    trace(ctx, path);
    ctx.strokeStyle = rgba(COLOR.water, 0.85); ctx.lineWidth = 7; ctx.stroke();
    trace(ctx, path);
    ctx.strokeStyle = rgba(COLOR.waterHi, 0.7); ctx.lineWidth = 1.6; ctx.stroke();
  }
}

function drawPeaks(ctx) {
  const rnd = seeded(11);
  ctx.lineJoin = 'round';
  for (const rg of ZL.MAP.ranges) {
    for (let i = 0; i < rg.pts.length - 1; i++) {
      const [x1, y1] = rg.pts[i], [x2, y2] = rg.pts[i + 1];
      const steps = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) / 19));
      for (let k = 0; k < steps; k++) {
        const t = k / steps;
        const x = x1 + (x2 - x1) * t + (rnd() - 0.5) * 10, y = y1 + (y2 - y1) * t + (rnd() - 0.5) * 12;
        const h = 10 + rnd() * 11, w = 9 + rnd() * 6;
        ctx.beginPath();
        ctx.moveTo(x - w, y + h * 0.45); ctx.lineTo(x, y - h); ctx.lineTo(x + w, y + h * 0.45);
        ctx.fillStyle = rgba(COLOR.hill, 0.38); ctx.fill();
        ctx.strokeStyle = COLOR.inkSoft; ctx.lineWidth = 1.4; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x + w * 0.35, y + h * 0.45);
        ctx.strokeStyle = rgba(COLOR.inkSoft, 0.5); ctx.lineWidth = 1; ctx.stroke();
      }
    }
  }
}

function drawVignette(ctx) {
  const g = ctx.createRadialGradient(MAP_W / 2, MAP_H * 0.46, 260, MAP_W / 2, MAP_H * 0.46, 720);
  g.addColorStop(0, rgba(COLOR.ink, 0));
  g.addColorStop(1, rgba(COLOR.ink, 0.3));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, MAP_W, MAP_H);
}

// hot：要高亮的道路（出征、调动时从出发城到可选目标）
function drawRoads(ctx, hot) {
  ctx.lineCap = 'round';
  for (const [a, b] of ZL.ROADS) {
    const h = hot && hot.get(a + '|' + b);
    const q = roadCurve(a, b);
    ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.quadraticCurveTo(q[2], q[3], q[4], q[5]);
    if (h) {
      ctx.setLineDash([10, 7]); ctx.lineWidth = 3;
      ctx.strokeStyle = h === true ? COLOR.seal : COLOR.ink;
    } else {
      ctx.setLineDash([1, 7]); ctx.lineWidth = 2.2;
      ctx.strokeStyle = rgba(COLOR.inkSoft, 0.75);
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

// 整张图重画一遍（底纹用固定种子，每次画出来都一样）
// opt: { scale: 地图单位到画布像素的倍数, from: 出发城, targets: 可选目标城, cmd: 'attack' | 'move' }
function draw(ctx, S, opt) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, MAP_W * opt.scale, MAP_H * opt.scale);
  ctx.setTransform(opt.scale, 0, 0, opt.scale, 0, 0);
  drawSilk(ctx);
  drawSea(ctx);
  drawTerritory(ctx, S);
  drawRivers(ctx);
  drawPeaks(ctx);
  drawVignette(ctx);
  let hot = null;
  if (opt.from && opt.targets && opt.targets.length) {
    hot = new Map();
    for (const t of opt.targets) {
      const v = opt.cmd === 'attack' ? true : 'move';
      hot.set(opt.from + '|' + t, v); hot.set(t + '|' + opt.from, v);
    }
  }
  drawRoads(ctx, hot);
}

// 叠在画布上的文字标注（地图单位坐标）
const LABELS = [
  { text: '黄河', x: 588, y: 306, rot: -30, kind: 'river' },
  { text: '长江', x: 222, y: 686, rot: 14, kind: 'river' },
  { text: '东海', x: 830, y: 420, rot: 0, kind: 'sea' },
  { text: '渤海', x: 808, y: 128, rot: 0, kind: 'sea' },
].concat(ZL.MAP.ranges.map(r => {
  const m = r.pts[Math.floor(r.pts.length / 2)];
  return { text: r.name, x: m[0], y: m[1] + 30, rot: 0, kind: 'range' };
}));

module.exports = { draw, MAP_W, MAP_H, LABELS };
