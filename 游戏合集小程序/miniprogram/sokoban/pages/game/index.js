const { Game, LEVELS, STORAGE_KEY } = require('../../game/core');
const { createPlatform } = require('../../game/platform');
const createScene = require('../../game/scene');
const { createAudio } = require('../../game/audio');

function point(touch) {
  return { x: Number.isFinite(touch.clientX) ? touch.clientX : touch.x, y: Number.isFinite(touch.clientY) ? touch.clientY : touch.y };
}
function pinch(touches) {
  const a = point(touches[0]), b = point(touches[1]);
  return { d: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

Page({
  data: {
    ready: false, error: '', loading: '正在布置仓库…', canvasOn: true,
    navTop: 28, navHeight: 36, capsuleSpace: 96, safeBottom: 12,
    sceneTop: 210, sceneHeight: 350,
    orderNo: 'SJ-001', orderName: '收货口', levelIndex: 0,
    moves: 0, pushes: 0, placed: 0, total: 1, standard: 3, completed: 0, canUndo: false,
    skyLabel: '黄昏', sound: true, scenic: false, overhead: false,
    toast: '', sheetOpen: false, orders: [], resultOpen: false, result: {}, levelCount: LEVELS.length
  },
  onLoad(query) {
    this._disposed = false; this._visible = true; this._queued = null;
    this._updateWindow();
    let saved;
    try { saved = wx.getStorageSync(STORAGE_KEY); } catch (e) { saved = null; }
    this._game = new Game(saved);
    if (query && query.level !== undefined && /^\d+$/.test(query.level)) {
      const i = Number(query.level); if (LEVELS[i]) this._game.load(i);
    }
    this._sync();
    if (wx.showShareMenu) wx.showShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] });
  },
  onReady() { this._audio = createAudio(wx); this._initScene(); },
  onShow() {
    this._visible = true;
    if (this._scene) { this._scene.resume(); if (this._game.won) this._showResult(); }
  },
  onHide() {
    this._visible = false; this._queued = null; this._gesture = null;
    this._stopHold(); this._clearWin(); clearTimeout(this._toastTimer);
    if (this._scene) { this._scene.settle(); this._scene.pause(); }
    if (this._audio) this._audio.stop();
    this._persist();
  },
  onUnload() {
    this.onHide(); this._disposed = true;
    if (this._scene) this._scene.destroy();
    if (this._audio) this._audio.destroy();
    this._scene = null; this._audio = null;
  },
  onResize() { this._updateWindow(); this._measure(); },
  _updateWindow() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this._window = info;
    let capsule = null;
    try { capsule = wx.getMenuButtonBoundingClientRect(); } catch (e) {}
    this.setData({
      navTop: capsule && capsule.top > 0 ? capsule.top : (info.statusBarHeight || 20) + 6,
      navHeight: capsule && capsule.height > 0 ? Math.max(32, capsule.height) : 36,
      capsuleSpace: capsule && capsule.left > 0 ? info.windowWidth - capsule.left + 8 : 96,
      safeBottom: info.safeArea ? Math.max(10, info.screenHeight - info.safeArea.bottom) : 12
    });
  },
  _queryCanvas(callback) {
    wx.createSelectorQuery().in(this)
      .select('#scene').fields({ node: true, size: true })
      .select('#scene').boundingClientRect()
      .select('.hud-header').boundingClientRect()
      .select('.hud-footer').boundingClientRect()
      .exec(callback);
  },
  _initScene() {
    this._queryCanvas(results => {
      if (this._disposed) return;
      const item = results && results[0];
      if (!item || !item.node || !wx.createOffscreenCanvas) {
        this.setData({ error: '当前微信版本不支持这个 3D 场景，请更新微信后重试。', loading: '' }); return;
      }
      try {
        this._canvasRect = results[1];
        const platform = createPlatform(wx, item.node, this._window.pixelRatio);
        this._scene = createScene({
          platform, game: this._game, width: item.width, height: item.height,
          pixelRatio: this._window.pixelRatio,
          onSky: (name, label) => { if (!this._disposed) this.setData({ skyLabel: label }); },
          onAnimationEnd: () => this._afterAnimation(),
          onContextLost: () => this._recoverScene()
        });
        this._applyInsets(results);
        if (this._visible) this._scene.resume();
        this.setData({ ready: true, loading: '', error: '' });
        this._sync();
        if (this._game.won) this._showResult();
        else if (this._game.level.i === 0 && !this._game.best[0]) this._toast('把托盘纸箱推进黄框库位。只能推，不能拉；推错了可以撤销。', 6000);
      } catch (e) {
        console.error('仓库场景初始化失败', e);
        if (this._scene) this._scene.destroy(); this._scene = null;
        this.setData({ ready: false, loading: '', error: '仓库加载失败。请退出小程序后重新打开，或更新微信再试。' });
      }
    });
  },
  // 显卡收回了绘图上下文（锁屏、休眠、驱动重置等）后画面会一直空着。
  // 这里拆掉旧画布和场景、重建新的；进度在 this._game 里，不受影响。1 分钟内最多自动恢复 3 次。
  _recoverScene() {
    if (this._disposed || this._recovering) return;
    const now = Date.now();
    this._recoveries = (this._recoveries || []).filter(t => now - t < 60000);
    const old = this._scene; this._scene = null;
    this._queued = null; this._gesture = null; this._stopHold(); this._clearWin();
    if (old) { try { old.destroy(); } catch (e) { /* 上下文已丢失，释放失败可以忽略 */ } }
    if (this._recoveries.length >= 3) {
      this.setData({ ready: false, loading: '', error: '3D 画面反复丢失，请退出小程序后重新打开。进度已保存。' });
      return;
    }
    this._recoveries.push(now); this._recovering = true;
    console.warn('3D 画面的绘图上下文丢失，正在重建');
    this.setData({ canvasOn: false, overhead: false, scenic: false }, () => {
      this.setData({ canvasOn: true }, () => {
        this._recovering = false;
        if (this._disposed) return;
        this._initScene();
        this._toast('画面刚才丢失了，已自动恢复，进度不受影响。', 3200);
      });
    });
  },
  _applyInsets(results) {
    if (!this._scene || this._disposed || this.data.sheetOpen || this.data.resultOpen) return;
    const header = results[2], footer = results[3];
    const sceneTop = Math.ceil((header ? header.bottom : 200) + 8);
    const sceneBottom = Math.floor((footer ? footer.top : this._window.windowHeight - 200) - 8);
    const sceneHeight = Math.max(40, sceneBottom - sceneTop);
    const width = this._window.windowWidth;
    // Native WebGL surfaces may paint above ordinary WXML siblings. Keep its
    // physical bounds between the header and footer, and hide it for dialogs.
    this.setData({ sceneTop, sceneHeight }, () => {
      if (!this._scene || this._disposed) return;
      this._canvasRect = { left: 0, top: sceneTop, width, height: sceneHeight };
      this._scene.setInsets(0, 0); this._scene.resize(width, sceneHeight);
    });
  },
  _measure() {
    if (!this._scene || this._disposed) return;
    this._queryCanvas(results => {
      if (!this._scene || this._disposed || !results || !results[0]) return;
      this._applyInsets(results);
    });
  },
  _persist() {
    if (!this._game) return;
    try { wx.setStorageSync(STORAGE_KEY, this._game.exportSave()); } catch (e) { /* The game remains playable when storage is full. */ }
  },
  _sync() {
    if (!this._game || this._disposed) return;
    this.setData(Object.assign(this._game.view(), { sound: this._game.sound, orders: this._game.orders() }));
  },
  _toast(message, duration) {
    clearTimeout(this._toastTimer); if (this._disposed) return;
    this.setData({ toast: message }, () => this._measure());
    this._toastTimer = setTimeout(() => { if (!this._disposed) this.setData({ toast: '' }, () => this._measure()); }, duration || 2800);
  },
  _clearWin() { clearTimeout(this._winTimer); this._winTimer = null; },
  _showResult() {
    this._clearWin();
    if (!this._disposed && this._visible && this._game.won) {
      if (this._scene) this._scene.pause();
      this.setData({ resultOpen: true, result: this._game.result() });
    }
  },
  _afterAnimation() {
    if (!this._visible || this._disposed) return;
    if (this._game.won) {
      this._queued = null;
      if (this._game.sound && this._audio) this._audio.play('win');
      this._clearWin(); this._winTimer = setTimeout(() => this._showResult(), 1000);
    } else if (this._queued !== null) {
      const d = this._queued; this._queued = null; this._move(d);
    }
  },
  _move(d) {
    if (!this._scene || !this._visible || this._disposed || this.data.sheetOpen || this.data.resultOpen || this._game.won) return;
    if (this._scene.isMoving()) { this._queued = d; return; }
    if (this.data.scenic) { this._scene.setScenic(false); this.setData({ scenic: false }, () => this._measure()); }
    const result = this._game.move(d); this._scene.move(result);
    if (!result.moved) return;
    if (this._game.sound && this._audio) this._audio.play(result.placed ? 'place' : result.bi >= 0 ? 'push' : 'step');
    if (result.deadlock) this._toast('这箱推进死角了，按撤销退一步。', 3800);
    this._sync(); this._persist();
  },
  _load(i) {
    if (!this._scene || !LEVELS[i]) return;
    this._queued = null; this._gesture = null; this._clearWin(); this._stopHold(); clearTimeout(this._toastTimer);
    this._game.load(i); this._scene.load(); this._scene.setScenic(false);
    this.setData({ sheetOpen: false, resultOpen: false, scenic: false, toast: '' }, () => { this._measure(); if (this._visible) this._scene.resume(); });
    this._sync(); this._persist();
  },
  onUndo() {
    if (!this._scene || !this._game.undo()) return;
    this._clearWin(); this._queued = null; this._stopHold(); this._scene.sync();
    this.setData({ resultOpen: false, toast: '' }, () => { this._measure(); if (this._visible) this._scene.resume(); }); this._sync(); this._persist();
  },
  onRestart() { this._load(this._game.level.i); },
  onPrevious() { this._load(this._game.level.i - 1); },
  onNext() { this._load(this._game.level.i + 1); },
  onOpenOrders() {
    if (!this._scene) return;
    this._stopHold(); this._queued = null; this._scene.settle(); this._scene.pause();
    this.setData({ sheetOpen: true, orders: this._game.orders() });
  },
  onCloseOrders() { this.setData({ sheetOpen: false }, () => { this._measure(); if (this._visible && this._scene) this._scene.resume(); }); },
  onChooseOrder(e) { this._load(Number(e.currentTarget.dataset.index)); },
  onToggleSky() { if (this._scene) { this._scene.cycleSky(); this._persist(); } },
  onToggleSound() {
    this._game.sound = !this._game.sound;
    if (!this._game.sound && this._audio) this._audio.stop();
    this._sync(); this._persist();
  },
  onToggleScenic() {
    if (!this._scene) return;
    const scenic = !this.data.scenic;
    this._scene.setScenic(scenic); this._stopHold(); this._queued = null;
    this.setData({ scenic, resultOpen: false }, () => { this._measure(); if (this._visible) this._scene.resume(); });
  },
  onLookAround() {
    if (!this._scene) return;
    this._scene.setScenic(true);
    this.setData({ scenic: true, resultOpen: false }, () => { this._measure(); if (this._visible) this._scene.resume(); });
  },
  onToggleOverhead() {
    if (!this._scene) return;
    const overhead = !this.data.overhead;
    this._scene.setOverhead(overhead);
    this.setData({ overhead, scenic: false }, () => this._measure());
  },
  onResetView() {
    if (!this._scene) return;
    this._scene.resetView(); this.setData({ scenic: false }, () => this._measure());
  },
  onDirectionStart(e) {
    if (!this._scene) return;
    this._stopHold(); const d = Number(e.currentTarget.dataset.dir);
    const vectors = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    const step = () => { if (this._scene) this._move(this._scene.screenToDir(vectors[d][0], vectors[d][1])); };
    step(); this._holdDelay = setTimeout(() => { this._holdInterval = setInterval(step, 190); }, 320);
  },
  onDirectionEnd() { this._stopHold(); },
  _stopHold() { clearTimeout(this._holdDelay); clearInterval(this._holdInterval); },
  onSceneTouchStart(e) {
    if (!this._scene || this.data.sheetOpen || this.data.resultOpen) return;
    if (e.touches.length >= 2) this._gesture = Object.assign({ type: 'multi' }, pinch(e.touches));
    else if (e.touches.length === 1) {
      const p = point(e.touches[0]); this._gesture = { type: 'single', sx: p.x, sy: p.y, x: p.x, y: p.y };
    }
  },
  onSceneTouchMove(e) {
    const g = this._gesture;
    if (!g || !this._scene || this.data.sheetOpen || this.data.resultOpen) return;
    if (e.touches.length >= 2) {
      const p = pinch(e.touches);
      if (g.type === 'multi') { this._scene.zoom(g.d / p.d); this._scene.orbit(p.x - g.x, p.y - g.y); }
      this._gesture = Object.assign({ type: 'multi' }, p);
    } else if (g.type === 'single' && e.touches.length === 1) {
      const p = point(e.touches[0]);
      if (this.data.scenic) this._scene.orbit(p.x - g.x, p.y - g.y);
      g.x = p.x; g.y = p.y;
    }
  },
  onSceneTouchEnd(e) {
    const g = this._gesture; this._gesture = null;
    if (!g || g.type !== 'single' || !this._scene || this.data.scenic) return;
    const p = e.changedTouches && e.changedTouches[0] ? point(e.changedTouches[0]) : g;
    const dx = p.x - g.sx, dy = p.y - g.sy, distance = Math.hypot(dx, dy);
    if (distance > 24) this._move(this._scene.screenToDir(Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) : 0, Math.abs(dx) > Math.abs(dy) ? 0 : Math.sign(dy)));
    else if (distance < 10) {
      const rect = this._canvasRect || { left: 0, top: 0 };
      const d = this._scene.tap(p.x - rect.left, p.y - rect.top); if (d !== null) this._move(d);
    }
  },
  onSceneTouchCancel() { this._gesture = null; this._stopHold(); },
  noop() {},
  // 回游戏大厅；从分享卡片直接进来时没有上一页，就重新打开大厅
  onBack() {
    if (getCurrentPages().length > 1) wx.navigateBack();
    else wx.reLaunch({ url: '/pages/home/index' });
  },
  onShareAppMessage() { return { title: '仓库推箱子 3D · 你能用 ' + LEVELS[this._game.level.i].opt + ' 步完成吗？', path: '/sokoban/pages/game/index?level=' + this._game.level.i }; },
  onShareTimeline() { return { title: '仓库推箱子 3D · 17 张上架单等你挑战', query: 'level=' + this._game.level.i }; }
});
