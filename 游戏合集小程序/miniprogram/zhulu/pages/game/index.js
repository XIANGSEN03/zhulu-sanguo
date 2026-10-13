// 《逐鹿三国》小程序页面：负责显示和把点击变成指令，规则全在 engine.js。
const R = require('../../engine');
const V = require('../../view');
const MapArt = require('../../map');

const SAVE_KEY = 'zhulu-save-v1';
const FORM_CMDS = ['attack', 'move', 'employ', 'diplomacy'];
const K = 0.82; // 舆图缩放：1 个地图单位显示为 0.82px

Page({
  data: {
    screen: 'title', navTop: 28, navHeight: 32, capsuleSpace: 96, safeBottom: 8, boardH: 340,
    mapW: Math.round(MapArt.MAP_W * K), mapH: Math.round(MapArt.MAP_H * K),
    labels: MapArt.LABELS.map(l => ({ text: l.text, kind: l.kind, left: Math.round(l.x * K), top: Math.round(l.y * K), rot: l.rot })),
    title: null, bar: null, cities: [], panel: null, modal: null, toast: null, mapImg: '',
    scrollLeft: 0, scrollTop: 0, panelTop: 0,
  },

  onLoad() {
    this.S = null;
    this.ui = { city: null, gen: null, form: null, chronMine: true };
    this._layout();
    this.showTitle();
    if (wx.showShareMenu) wx.showShareMenu({ menus: ['shareAppMessage'] });
  },
  onHide() { this._save(); },
  onUnload() {
    clearTimeout(this._btTimer); clearTimeout(this._toastTimer);
    this._save(); this._ctx = null;
  },
  _layout() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    let cap = null;
    try { cap = wx.getMenuButtonBoundingClientRect(); } catch (e) { /* 拿不到胶囊位置就用默认值 */ }
    this._info = info;
    this.setData({
      navTop: cap && cap.top > 0 ? cap.top : (info.statusBarHeight || 20) + 6,
      navHeight: cap && cap.height > 0 ? Math.max(32, cap.height) : 32,
      capsuleSpace: cap && cap.left > 0 ? info.windowWidth - cap.left + 8 : 96,
      safeBottom: info.safeArea ? Math.max(8, info.screenHeight - info.safeArea.bottom) : 8,
      boardH: Math.max(260, Math.round(info.windowHeight * 0.42)),
    });
  },

  // ---------- 存档（微信本地存储） ----------
  _save() {
    if (!this.S) return;
    try { wx.setStorageSync(SAVE_KEY, this.S); } catch (e) { /* 存储满了等情况，不影响继续玩 */ }
  },
  _readSave() {
    try {
      const s = wx.getStorageSync(SAVE_KEY);
      return s && s.version === 1 ? s : null;
    } catch (e) { return null; }
  },

  // ---------- 开场 / 开局 ----------
  showTitle() {
    this._ctx = null; this._canvas = null; this._mapKey = '';
    this.setData({ screen: 'title', mapImg: '', title: V.title(this._readSave()), modal: null, toast: null });
  },
  startGame(faction) {
    this.S = R.newGame(faction);
    this.ui = { city: null, gen: null, form: null, chronMine: true };
    this._enterGame(() => this.setData({ modal: V.report(this.S, this.S.reports) }));
  },
  resumeGame() {
    const s = this._readSave();
    if (!s) { this.showTitle(); return; }
    this.S = s;
    this.ui = { city: null, gen: null, form: null, chronMine: true };
    this._enterGame();
  },
  _enterGame(then) {
    this.setData({ screen: 'game', bar: V.bar(this.S), panel: { view: 'overview' } }, () => {
      this._initCanvas(() => {
        this.render();
        const ruler = this.S.generals[this.S.factions[this.S.player].ruler];
        if (ruler) this._centerOn(ruler.city);
        if (then) then();
      });
    });
  },
  _initCanvas(done) {
    wx.createSelectorQuery().in(this).select('#mapsrc').fields({ node: true, size: true }).exec(res => {
      const item = res && res[0];
      if (item && item.node) {
        const dpr = Math.min(2, this._info.pixelRatio || 2);
        item.node.width = Math.round(this.data.mapW * dpr);
        item.node.height = Math.round(this.data.mapH * dpr);
        this._canvas = item.node;
        this._ctx = item.node.getContext('2d');
        this._dpr = dpr; this._mapKey = '';
      }
      done();
    });
  },

  // ---------- 渲染 ----------
  render() {
    const S = this.S, ui = this.ui;
    this.setData({ bar: V.bar(S), cities: V.cities(S, ui, K), panel: this._panel() });
    this._drawMap();
    this._save();
  },
  _panel() {
    const S = this.S, ui = this.ui;
    if (ui.form) return Object.assign({ view: 'form' }, V.form(S, ui));
    if (ui.city) return Object.assign({ view: 'city' }, V.city(S, ui));
    return Object.assign({ view: 'overview' }, V.overview(S));
  },
  // 底图只在城池易主时重画：在屏幕外的画布上画好，导出成图片再显示
  _drawMap() {
    if (!this._ctx) return;
    const S = this.S;
    const key = Object.values(S.cities).map(c => c.owner || '-').join(',');
    if (key === this._mapKey) return;
    this._mapKey = key;
    MapArt.draw(this._ctx, S, { scale: K * this._dpr });
    wx.canvasToTempFilePath({
      canvas: this._canvas, fileType: 'jpg', quality: 0.92,
      success: res => { if (this._mapKey === key) this.setData({ mapImg: res.tempFilePath }); },
      fail: err => console.error('舆图导出失败', err),
    });
  },
  _centerOn(id) {
    const p = R.CITIES[id];
    if (!p) return;
    this._jitter = !this._jitter; // scroll-left 值不变时组件不会滚动，加一点点差异
    this.setData({
      scrollLeft: Math.max(0, p.x * K - (this._info.windowWidth - 24) / 2) + (this._jitter ? 0.5 : 0),
      scrollTop: Math.max(0, p.y * K - this.data.boardH / 2),
    });
  },
  _panelToTop() {
    this._ptop = !this._ptop;
    this.setData({ panelTop: this._ptop ? 0.5 : 0 });
  },

  // ---------- 操作 ----------
  onCity(e) { this._selectCity(e.currentTarget.dataset.id, true); },
  _selectCity(id, fromMap) {
    const ui = this.ui;
    if (ui.form && V.formTargets(this.S, ui).indexOf(id) >= 0) { ui.form.target = id; this.render(); return; }
    ui.form = null; ui.gen = null; ui.city = id;
    this.render();
    this._panelToTop();
    if (!fromMap) this._centerOn(id);
  },
  onAct(e) {
    const d = e.currentTarget.dataset, ui = this.ui, S = this.S;
    switch (d.act) {
      case 'start': this.startGame(d.id); break;
      case 'resume': this.resumeGame(); break;
      case 'menu': this._save(); this.showTitle(); break;
      case 'city': this._selectCity(d.id, false); break;
      case 'tip': if (d.id) this._selectCity(d.id, false); break;
      case 'home': ui.city = null; ui.gen = null; ui.form = null; this.render(); this._panelToTop(); break;
      case 'gen': ui.gen = ui.gen === d.id ? null : d.id; this.render(); break;
      case 'cmd':
        if (!d.ok) return;
        if (FORM_CMDS.indexOf(d.cmd) >= 0) this._openForm(d.cmd, d.gen);
        else this._exec(d.gen, d.cmd);
        break;
      case 'pick': ui.form.target = d.id; this.render(); break;
      case 'dep': {
        if (d.off) return;
        const list = ui.form.deputies;
        ui.form.deputies = list.indexOf(d.id) >= 0 ? list.filter(x => x !== d.id) : list.concat(d.id).slice(0, 2);
        this.render();
        break;
      }
      case 'cancel': ui.form = null; this.render(); break;
      case 'confirm': {
        const f = ui.form;
        this._exec(f.gid, f.cmd, { target: f.target, troops: f.troops, deputies: f.deputies });
        break;
      }
      case 'employ': this._exec(ui.form.gid, 'employ', { target: d.id }); break;
      case 'ally': if (!d.allied) this._exec(ui.form.gid, 'diplomacy', { target: d.id }); break;
      case 'launch': {
        const leader = R.best(R.idleIn(S, d.from, S.player), 'lea');
        if (leader) this._openForm('attack', leader.id, d.target);
        break;
      }
      case 'quick-employ': {
        const t = S.generals[d.id];
        const g = R.best(R.idleIn(S, t.city, S.player), 'pol');
        if (g) this._exec(g.id, 'employ', { target: t.id });
        break;
      }
      case 'end': this._endTurn(); break;
      case 'chronicle': this.setData({ modal: V.chronicle(S, ui.chronMine) }); break;
      case 'chron': ui.chronMine = d.v === 'mine'; this.setData({ modal: V.chronicle(S, ui.chronMine) }); break;
      case 'others': this.setData({ 'modal.othersOpen': !this.data.modal.othersOpen }); break;
      case 'close': this._closeModal(); break;
      case 'bt-skip': if (this._battleSkip) this._battleSkip(); break;
      case 'restart':
        this._battleSkip = null; clearTimeout(this._btTimer);
        try { wx.removeStorageSync(SAVE_KEY); } catch (err) { /* 忽略 */ }
        this.S = null; this.showTitle();
        break;
      default: break;
    }
  },
  // 拖动兵力滑块：拖动中只改文字，松手后再记住数值
  onTroops(e) {
    const f = this.ui.form;
    if (!f) return;
    f.troops = Number(e.detail.value);
    const vm = V.form(this.S, this.ui);
    const patch = { 'panel.troopsText': vm.troopsText, 'panel.hint': vm.hint, 'panel.warn': vm.warn };
    if (vm.targets) patch['panel.targets'] = vm.targets;
    if (vm.verdict) patch['panel.verdict'] = vm.verdict;
    if (e.type === 'change') patch['panel.troops'] = vm.troops;
    this.setData(patch);
  },
  _openForm(cmd, gid, target) {
    const S = this.S, ui = this.ui, g = S.generals[gid], c = S.cities[g.city];
    ui.form = { cmd, gid }; ui.city = c.id; ui.gen = gid;
    const t = V.formTargets(S, ui);
    if (cmd === 'attack') {
      ui.form.target = target && t.indexOf(target) >= 0 ? target : t.slice().sort((a, b) => S.cities[a].troops - S.cities[b].troops)[0];
      ui.form.troops = Math.max(1000, Math.min(c.troops, Math.floor(c.troops * 0.85 / 100) * 100));
      ui.form.deputies = [];
    } else if (cmd === 'move') {
      ui.form.target = t[0];
      ui.form.troops = Math.floor(c.troops * 0.5 / 100) * 100;
    }
    this.render();
    this._panelToTop();
  },
  _exec(gid, cmd, opt) {
    const res = R.doCommand(this.S, gid, cmd, opt || {});
    if (res.error) { this._toast(res.error, 'bad'); return; }
    this.ui.form = null; this.ui.gen = null;
    if (res.battle) {
      this.ui.city = res.battle.result === 'take' ? res.battle.to : res.battle.from;
      this.render();
      this._showBattle(res.battle);
    } else {
      this.render();
      this._toast(res.text, res.big ? 'big' : '');
    }
  },
  _endTurn() {
    const S = this.S;
    if (S.over) { this.setData({ modal: V.over(S) }); return; }
    const reps = R.endTurn(S);
    this.ui.form = null; this.ui.gen = null;
    if (this.ui.city && S.cities[this.ui.city].owner !== S.player) this.ui.city = null;
    this.render();
    this.setData({ modal: V.report(S, reps) });
  },

  // ---------- 浮层 ----------
  _closeModal() {
    const kind = this.data.modal && this.data.modal.kind;
    clearTimeout(this._btTimer); this._battleSkip = null;
    this.setData({ modal: null });
    if (this.S && this.S.over && kind !== 'over') this.setData({ modal: V.over(this.S) });
  },
  _showBattle(b) {
    const steps = V.battleSteps(b), log = [];
    let i = 0;
    this.setData({ modal: V.battle(this.S, b) });
    const patchFor = st => ({ 'modal.log': log, 'modal.a': st.a, 'modal.aw': st.aw, 'modal.d': st.d, 'modal.dw': st.dw });
    const finish = () => { this._battleSkip = null; this.setData({ 'modal.done': true }); };
    const next = () => {
      if (i >= steps.length) { finish(); return; }
      const st = steps[i++];
      log.push({ kind: st.kind, text: st.text });
      this.setData(patchFor(st));
      this._btTimer = setTimeout(next, 760);
    };
    this._battleSkip = () => {
      clearTimeout(this._btTimer);
      let last = null;
      while (i < steps.length) { last = steps[i++]; log.push({ kind: last.kind, text: last.text }); }
      if (last) this.setData(patchFor(last));
      finish();
    };
    this._btTimer = setTimeout(next, 300);
  },
  _toast(text, tone) {
    clearTimeout(this._toastTimer);
    this.setData({ toast: { text, tone: tone || '', chop: tone === 'bad' ? '否' : '令' } });
    this._toastTimer = setTimeout(() => this.setData({ toast: null }), tone === 'big' ? 4600 : 2800);
  },

  onBack() {
    this._save();
    if (getCurrentPages().length > 1) wx.navigateBack();
    else wx.reLaunch({ url: '/pages/home/index' });
  },
  onShareAppMessage() {
    return { title: '逐鹿三国 · 建安五年官渡前夜，你选哪位明主？', path: '/zhulu/pages/game/index' };
  },
  noop() {},
});
