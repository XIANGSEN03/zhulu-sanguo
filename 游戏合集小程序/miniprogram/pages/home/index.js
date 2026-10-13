// 游戏大厅：两张游戏卡片，显示各自的存档进度，点进去打开对应分包。
const SEASONS = ['春', '夏', '秋', '冬'];
const DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const SOKOBAN_LEVELS = 17;

function cnNum(n) {
  if (n < 10) return DIGITS[n];
  const t = Math.floor(n / 10), o = n % 10;
  return (t === 1 ? '' : DIGITS[t]) + '十' + (o ? DIGITS[o] : '');
}
// 与逐鹿三国规则里的 dateLabel 相同：第 1 季是建安五年春
function dateLabel(turn) {
  const n = 5 + Math.floor((turn - 1) / 4);
  return `建安${cnNum(n)}年 · ${SEASONS[(turn - 1) % 4]}`;
}
function read(key) {
  try { return wx.getStorageSync(key) || null; } catch (e) { return null; }
}

Page({
  data: {
    navTop: 28, navHeight: 32, capsuleSpace: 96, safeBottom: 12,
    flags: [{ id: 'wei', mark: '曹' }, { id: 'yuan', mark: '袁' }, { id: 'wu', mark: '孙' }, { id: 'shu', mark: '刘' }],
    zhulu: { text: '新开一局', owner: '' },
    sokoban: { text: '从第 1 单开始', pct: 0 },
  },
  onLoad() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    let cap = null;
    try { cap = wx.getMenuButtonBoundingClientRect(); } catch (e) { /* 用默认值 */ }
    this.setData({
      navTop: cap && cap.top > 0 ? cap.top : (info.statusBarHeight || 20) + 6,
      navHeight: cap && cap.height > 0 ? Math.max(32, cap.height) : 32,
      capsuleSpace: cap && cap.left > 0 ? info.windowWidth - cap.left + 8 : 96,
      safeBottom: info.safeArea ? Math.max(12, info.screenHeight - info.safeArea.bottom) : 12,
    });
    if (wx.showShareMenu) wx.showShareMenu({ menus: ['shareAppMessage'] });
  },
  // 每次回到大厅都刷新一下两边的进度
  onShow() {
    const z = read('zhulu-save-v1');
    let zhulu = { text: '新开一局', owner: '' };
    if (z && z.version === 1 && z.factions && z.factions[z.player]) {
      const cities = Object.keys(z.cities).filter(id => z.cities[id].owner === z.player).length;
      zhulu = z.over
        ? { text: z.over.result === 'win' ? `上局${z.factions[z.player].name}一统天下 · 再开一局` : '上局大业未竟 · 再开一局', owner: '' }
        : { text: `继续：${z.factions[z.player].name} · ${dateLabel(z.turn)} · ${cities} 城`, owner: z.player };
    }
    const s = read('warehouse-sokoban-mini-v1');
    let sokoban = { text: '从第 1 单开始', pct: 0 };
    if (s && s.best) {
      const done = Object.keys(s.best).filter(k => s.best[k] > 0).length;
      const cur = Number.isInteger(s.cur) ? s.cur + 1 : 1;
      sokoban = { text: done >= SOKOBAN_LEVELS ? `17 单全部上架 · 可以刷新纪录` : `已完成 ${done} / ${SOKOBAN_LEVELS} 单 · 上次做到第 ${cur} 单`, pct: Math.round(done / SOKOBAN_LEVELS * 100) };
    }
    this.setData({ zhulu, sokoban });
  },
  go(e) { wx.navigateTo({ url: e.currentTarget.dataset.url }); },
  onShareAppMessage() { return { title: '两局小游戏：逐鹿三国 · 仓库推箱子 3D', path: '/pages/home/index' }; },
});
