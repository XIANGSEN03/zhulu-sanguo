const LEVELS = require('./levels');
const DIRECTIONS = [[0, -1], [0, 1], [-1, 0], [1, 0]];
const ZONES = 'ABCDEFGHJKLMNPQRS';
const STORAGE_KEY = 'warehouse-sokoban-mini-v1';

function parseLevel(i) {
  if (!Number.isInteger(i) || !LEVELS[i]) throw new RangeError('关卡不存在');
  const rows = LEVELS[i].map;
  const H = rows.length, W = Math.max.apply(null, rows.map(row => row.length));
  const wall = new Uint8Array(W * H), goal = new Uint8Array(W * H);
  const inside = new Uint8Array(W * H), live = new Uint8Array(W * H);
  const boxes = [], goals = [];
  let player = -1;
  rows.forEach((row, y) => {
    for (let x = 0; x < W; x++) {
      const c = row[x] || ' ', k = y * W + x;
      if (c === '#') wall[k] = 1;
      if (c === '.' || c === '*' || c === '+') { goal[k] = 1; goals.push(k); }
      if (c === '$' || c === '*') boxes.push(k);
      if (c === '@' || c === '+') player = k;
    }
  });
  if (player < 0 || boxes.length !== goals.length) throw new Error('关卡数据不完整');
  const stack = [player]; inside[player] = 1;
  while (stack.length) {
    const k = stack.pop(), x = k % W, y = Math.floor(k / W);
    DIRECTIONS.forEach(([dx, dy]) => {
      const nx = x + dx, ny = y + dy, n = ny * W + nx;
      if (nx >= 0 && ny >= 0 && nx < W && ny < H && !wall[n] && !inside[n]) { inside[n] = 1; stack.push(n); }
    });
  }
  const q = goals.slice(); goals.forEach(k => { live[k] = 1; });
  for (let h = 0; h < q.length; h++) {
    const k = q[h], x = k % W, y = Math.floor(k / W);
    DIRECTIONS.forEach(([dx, dy]) => {
      const bx = x + dx, by = y + dy, px = x + 2 * dx, py = y + 2 * dy;
      if (px < 0 || py < 0 || px >= W || py >= H) return;
      const b = by * W + bx, p = py * W + px;
      if (inside[b] && inside[p] && !live[b]) { live[b] = 1; q.push(b); }
    });
  }
  const codes = {};
  goals.forEach((k, j) => { codes[k] = ZONES[i % ZONES.length] + '-' + String(j + 1).padStart(2, '0'); });
  return { i, W, H, wall, goal, inside, live, goals, codes, startPlayer: player, startBoxes: boxes, ox: -(W - 1) / 2, oz: -(H - 1) / 2 };
}

function grade(i, moves) {
  const opt = LEVELS[i].opt;
  return moves <= opt ? 3 : moves <= Math.ceil(opt * 1.5) ? 2 : 1;
}

function validSnapshot(l, s) {
  if (!s || !Number.isInteger(s.player) || !l.inside[s.player]) return false;
  if (!Array.isArray(s.boxPos) || s.boxPos.length !== l.startBoxes.length) return false;
  if (new Set(s.boxPos).size !== s.boxPos.length || s.boxPos.includes(s.player)) return false;
  if (!s.boxPos.every(k => Number.isInteger(k) && l.inside[k])) return false;
  return Number.isInteger(s.moves) && s.moves >= 0 && Number.isInteger(s.pushes) && s.pushes >= 0 && s.pushes <= s.moves && Number.isInteger(s.facing) && s.facing >= 0 && s.facing <= 3;
}

class Game {
  constructor(saved) {
    saved = saved && typeof saved === 'object' ? saved : {};
    this.best = {};
    const best = saved.best && typeof saved.best === 'object' ? saved.best : {};
    LEVELS.forEach((_, i) => { if (Number.isInteger(best[i]) && best[i] > 0) this.best[i] = best[i]; });
    this.sound = saved.sound !== false;
    this.sky = ['day', 'dusk', 'night'].includes(saved.sky) ? saved.sky : 'dusk';
    this.quality = saved.quality === 'detail' ? 'detail' : 'smooth';
    this.load(Number.isInteger(saved.cur) && LEVELS[saved.cur] ? saved.cur : 0);
    if (validSnapshot(this.level, saved.state)) {
      this.restore(saved.state);
      this.history = Array.isArray(saved.history) ? saved.history.filter(s => validSnapshot(this.level, s)).slice(-300) : [];
    }
  }
  load(i) {
    this.level = parseLevel(i);
    this.player = this.level.startPlayer;
    this.boxPos = this.level.startBoxes.slice();
    this.moves = 0; this.pushes = 0; this.facing = 1; this.history = [];
    this.rebuildIndex();
  }
  rebuildIndex() {
    this.boxIdx = new Int16Array(this.level.W * this.level.H).fill(-1);
    this.boxPos.forEach((k, j) => { this.boxIdx[k] = j; });
  }
  snapshot() { return { player: this.player, boxPos: this.boxPos.slice(), moves: this.moves, pushes: this.pushes, facing: this.facing }; }
  restore(s) {
    this.player = s.player; this.boxPos = s.boxPos.slice(); this.moves = s.moves; this.pushes = s.pushes; this.facing = s.facing;
    this.rebuildIndex();
  }
  get placed() { return this.boxPos.reduce((n, k) => n + (this.level.goal[k] ? 1 : 0), 0); }
  get won() { return this.placed === this.boxPos.length; }
  get completed() { return LEVELS.filter((_, i) => this.best[i]).length; }
  move(d) {
    if (!Number.isInteger(d) || !DIRECTIONS[d] || this.won) return { moved: false };
    this.facing = d;
    const l = this.level, [dx, dy] = DIRECTIONS[d], x = this.player % l.W, y = Math.floor(this.player / l.W);
    const nx = x + dx, ny = y + dy, n = ny * l.W + nx;
    if (nx < 0 || ny < 0 || nx >= l.W || ny >= l.H || !l.inside[n]) return { moved: false };
    const bi = this.boxIdx[n], from = this.player;
    let b2 = -1;
    if (bi >= 0) {
      const bx = nx + dx, by = ny + dy; b2 = by * l.W + bx;
      if (bx < 0 || by < 0 || bx >= l.W || by >= l.H || !l.inside[b2] || this.boxIdx[b2] >= 0) return { moved: false };
    }
    this.history.push(this.snapshot());
    if (this.history.length > 300) this.history.shift();
    if (bi >= 0) { this.boxPos[bi] = b2; this.boxIdx[n] = -1; this.boxIdx[b2] = bi; this.pushes++; }
    this.player = n; this.moves++;
    if (this.won && (!this.best[l.i] || this.moves < this.best[l.i])) this.best[l.i] = this.moves;
    return { moved: true, from, to: n, bi, bFrom: n, bTo: b2, placed: bi >= 0 && !!l.goal[b2], deadlock: bi >= 0 && !l.live[b2], won: this.won };
  }
  undo() {
    if (!this.history.length) return false;
    this.restore(this.history.pop()); return true;
  }
  exportSave() { return { version: 1, cur: this.level.i, best: Object.assign({}, this.best), sound: this.sound, sky: this.sky, quality: this.quality, state: this.snapshot(), history: this.history.slice(-300) }; }
  view() {
    return { orderNo: 'SJ-' + String(this.level.i + 1).padStart(3, '0'), orderName: LEVELS[this.level.i].name, levelIndex: this.level.i, moves: this.moves, pushes: this.pushes, placed: this.placed, total: this.boxPos.length, standard: LEVELS[this.level.i].opt, completed: this.completed, canUndo: this.history.length > 0, won: this.won };
  }
  orders() { return LEVELS.map((l, i) => ({ i, no: 'SJ-' + String(i + 1).padStart(3, '0'), name: l.name, standard: l.opt, best: this.best[i] || 0, stars: this.best[i] ? '★'.repeat(grade(i, this.best[i])) : '', current: i === this.level.i })); }
  result() {
    const i = this.level.i, opt = LEVELS[i].opt, stars = grade(i, this.moves), d = new Date();
    const note = this.moves === opt ? '和标准步数一样，一步都没多走。' : this.moves < opt ? '比标准步数少走了 ' + (opt - this.moves) + ' 步！' : '比标准步数多走了 ' + (this.moves - opt) + ' 步。';
    return { title: LEVELS[i].name, moves: this.moves, standard: opt, stars: '★'.repeat(stars), rating: ['', '完成', '良好', '优秀'][stars], note: note + (this.completed === LEVELS.length ? ' 17 张上架单全部做完了！' : ''), last: i === LEVELS.length - 1, date: d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0') };
  }
}

module.exports = { Game, LEVELS, DIRECTIONS, STORAGE_KEY, parseLevel, grade, validSnapshot };
