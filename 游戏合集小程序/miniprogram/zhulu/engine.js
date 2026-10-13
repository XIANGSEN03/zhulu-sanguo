// 由 tools/sync_zhulu.py 从网页版生成，不要直接改这个文件。
// 要改规则或数值：改网页版的 data.js / rules.js / ai.js，再运行 python tools/sync_zhulu.py。
var ZL = {};
// ---------- data.js ----------
// 剧本数据：建安五年（200 年）· 官渡前夜
// 只放“开局是什么样”，不放任何规则。改数值、加城、加武将都只改这个文件。
(function (ZL) {
  ZL.SCENARIO = {
    name: '官渡前夜',
    startYear: 200,
    intro: '建安五年春，袁绍尽起河北之众，欲南下攻许都；曹操屯兵官渡相拒。刘备据徐州，孙策雄踞江东，荆襄、关中群雄观望。天下大势，在此一举。',
  };

  // 势力。aggression 越低越好战（攻守兵力比达到它才出兵）
  ZL.FACTIONS = {
    wei:  { name: '曹操', mark: '曹', ruler: 'caocao',   aggression: 1.3, level: '易', blurb: '挟天子以令诸侯。兵精将广，却夹在袁绍与刘备之间。' },
    yuan: { name: '袁绍', mark: '袁', ruler: 'yuanshao', aggression: 1.4,  level: '易', blurb: '四世三公，坐拥河北五城，兵力天下第一。' },
    wu:   { name: '孙策', mark: '孙', ruler: 'sunce',    aggression: 1.4,  level: '中', blurb: '小霸王据江东四城，背靠长江，进可图荆州。' },
    shu:  { name: '刘备', mark: '刘', ruler: 'liubei',   aggression: 1.35, level: '难', blurb: '只有徐州两城，强敌环伺。关张在侧，卧龙未出。' },
  };

  // 城池。x / y 是地图坐标（大致按真实地理位置摆放）
  // keeper：中立城的守将名，只用于显示
  const C = (name, x, y, owner, o) => Object.assign({ name, x, y, owner }, o);
  ZL.CITIES = {
    ji:        C('蓟',   590,  86, 'yuan', { troops:  9000, defense:  700, gold: 400, food: 3000, commerce: 260, farm: 300 }),
    nanpi:     C('南皮', 604, 196, 'yuan', { troops: 15000, defense:  800, gold: 500, food: 4500, commerce: 300, farm: 380 }),
    jinyang:   C('晋阳', 372, 200, 'yuan', { troops: 10000, defense:  900, gold: 400, food: 3200, commerce: 240, farm: 300 }),
    ye:        C('邺',   488, 300, 'yuan', { troops: 30000, defense: 1100, gold: 1100, food: 9000, commerce: 460, farm: 480, capital: true }),
    beihai:    C('北海', 720, 282, 'yuan', { troops:  9000, defense:  600, gold: 350, food: 3000, commerce: 280, farm: 320 }),
    luoyang:   C('洛阳', 365, 404, 'wei',  { troops: 12000, defense:  950, gold: 500, food: 3800, commerce: 340, farm: 300 }),
    chenliu:   C('陈留', 510, 392, 'wei',  { troops: 16000, defense:  800, gold: 450, food: 4200, commerce: 320, farm: 360 }),
    xuchang:   C('许昌', 446, 446, 'wei',  { troops: 22000, defense: 1000, gold: 900, food: 6500, commerce: 420, farm: 400, capital: true }),
    wan:       C('宛',   380, 505, 'wei',  { troops: 10000, defense:  700, gold: 350, food: 3000, commerce: 280, farm: 320 }),
    xiaopei:   C('小沛', 612, 392, 'shu',  { troops:  7000, defense:  500, gold: 300, food: 2400, commerce: 220, farm: 260 }),
    xiapi:     C('下邳', 676, 430, 'shu',  { troops: 12000, defense:  900, gold: 650, food: 4200, commerce: 330, farm: 340, capital: true }),
    shouchun:  C('寿春', 596, 520, null,   { troops:  5000, defense:  600, gold: 300, food: 2500, commerce: 260, farm: 300, keeper: '袁术残部' }),
    jianye:    C('建业', 704, 616, 'wu',   { troops: 11000, defense:  850, gold: 500, food: 3800, commerce: 340, farm: 320 }),
    wu:        C('吴',   805, 630, 'wu',   { troops: 13000, defense:  900, gold: 800, food: 4800, commerce: 400, farm: 380, capital: true }),
    kuaiji:    C('会稽', 790, 715, 'wu',   { troops:  8000, defense:  600, gold: 350, food: 3000, commerce: 260, farm: 300 }),
    chaisang:  C('柴桑', 556, 742, 'wu',   { troops:  8000, defense:  650, gold: 300, food: 2800, commerce: 240, farm: 280 }),
    changan:   C('长安', 190, 425, null,   { troops:  9000, defense:  900, gold: 400, food: 3500, commerce: 300, farm: 320, keeper: '马腾' }),
    hanzhong:  C('汉中',  90, 500, null,   { troops:  6000, defense:  800, gold: 300, food: 3000, commerce: 220, farm: 340, keeper: '张鲁' }),
    xiangyang: C('襄阳', 360, 575, null,   { troops: 18000, defense:  950, gold: 600, food: 4800, commerce: 360, farm: 380, keeper: '刘表' }),
    jiangling: C('江陵', 350, 668, null,   { troops: 13000, defense:  700, gold: 400, food: 3800, commerce: 300, farm: 360, keeper: '刘表' }),
    jiangxia:  C('江夏', 471, 640, null,   { troops: 11000, defense:  650, gold: 300, food: 2600, commerce: 240, farm: 280, keeper: '黄祖' }),
    changsha:  C('长沙', 440, 748, null,   { troops:  9000, defense:  500, gold: 300, food: 3000, commerce: 240, farm: 320, keeper: '张羡' }),
  };

  // 道路：相邻的城才能互相出兵、调动
  ZL.ROADS = [
    ['ji', 'nanpi'], ['nanpi', 'ye'], ['nanpi', 'beihai'], ['jinyang', 'ye'], ['jinyang', 'luoyang'],
    ['ye', 'chenliu'], ['beihai', 'xiaopei'], ['luoyang', 'changan'], ['luoyang', 'xuchang'], ['luoyang', 'wan'],
    ['chenliu', 'xuchang'], ['chenliu', 'xiaopei'], ['xuchang', 'wan'], ['xuchang', 'shouchun'], ['xiaopei', 'xiapi'],
    ['xiapi', 'shouchun'], ['xiapi', 'jianye'], ['shouchun', 'jianye'], ['wan', 'xiangyang'], ['changan', 'hanzhong'],
    ['hanzhong', 'xiangyang'], ['xiangyang', 'jiangling'], ['xiangyang', 'jiangxia'], ['jiangling', 'jiangxia'],
    ['jiangling', 'changsha'], ['jiangxia', 'chaisang'], ['chaisang', 'changsha'], ['chaisang', 'jianye'],
    ['jianye', 'wu'], ['wu', 'kuaiji'],
  ];

  // 武将：统率 lea、武力 str、智力 int、政治 pol
  // faction 为 null 是在野武将，hidden 表示要靠“搜索”才能发现；loyal 表示极难被敌方登用
  const G = (name, faction, city, lea, str, int, pol, o) => Object.assign({ name, faction, city, lea, str, int, pol }, o);
  ZL.GENERALS = {
    caocao:     G('曹操',   'wei',  'xuchang',  96, 72,  91, 94, { loyal: true }),
    xunyu:      G('荀彧',   'wei',  'xuchang',  52, 14,  95, 98),
    guojia:     G('郭嘉',   'wei',  'xuchang',  58, 15,  98, 84),
    xunyou:     G('荀攸',   'wei',  'xuchang',  62, 25,  94, 82),
    xuchu:      G('许褚',   'wei',  'xuchang',  66, 96,  36, 20, { loyal: true }),
    xiahoudun:  G('夏侯惇', 'wei',  'chenliu',  88, 90,  58, 70, { loyal: true }),
    zhangliao:  G('张辽',   'wei',  'chenliu',  93, 92,  78, 58),
    xiahouyuan: G('夏侯渊', 'wei',  'luoyang',  87, 91,  54, 62, { loyal: true }),
    xuhuang:    G('徐晃',   'wei',  'luoyang',  88, 90,  66, 52),
    caoren:     G('曹仁',   'wei',  'wan',      89, 86,  62, 55, { loyal: true }),
    yujin:      G('于禁',   'wei',  'wan',      80, 78,  62, 50),

    yuanshao:   G('袁绍',   'yuan', 'ye',       82, 70,  70, 74, { loyal: true }),
    yanliang:   G('颜良',   'yuan', 'ye',       80, 94,  32, 30),
    tianfeng:   G('田丰',   'yuan', 'ye',       72, 22,  93, 84, { loyal: true }),
    shenpei:    G('审配',   'yuan', 'ye',       74, 56,  76, 74, { loyal: true }),
    wenchou:    G('文丑',   'yuan', 'nanpi',    78, 94,  28, 26),
    jushou:     G('沮授',   'yuan', 'nanpi',    80, 30,  92, 82, { loyal: true }),
    zhanghe:    G('张郃',   'yuan', 'jinyang',  89, 88,  70, 56),
    gaogan:     G('高干',   'yuan', 'jinyang',  70, 72,  56, 52),
    gaolan:     G('高览',   'yuan', 'ji',       76, 82,  46, 42),
    yuanshang:  G('袁尚',   'yuan', 'ji',       64, 74,  44, 48),
    yuantan:    G('袁谭',   'yuan', 'beihai',   66, 70,  42, 46),

    liubei:     G('刘备',   'shu',  'xiapi',    78, 74,  76, 80, { loyal: true }),
    guanyu:     G('关羽',   'shu',  'xiapi',    95, 97,  75, 62, { loyal: true }),
    mizhu:      G('糜竺',   'shu',  'xiapi',    28, 30,  64, 82),
    zhangfei:   G('张飞',   'shu',  'xiaopei',  86, 98,  40, 22, { loyal: true }),
    sunqian:    G('孙乾',   'shu',  'xiaopei',  32, 30,  72, 74),
    jianyong:   G('简雍',   'shu',  'xiaopei',  30, 32,  70, 72),

    sunce:      G('孙策',   'wu',   'wu',       92, 96,  70, 72, { loyal: true }),
    sunquan:    G('孙权',   'wu',   'wu',       76, 66,  80, 90, { loyal: true }),
    zhangzhao:  G('张昭',   'wu',   'wu',       30, 18,  82, 97),
    zhouyu:     G('周瑜',   'wu',   'jianye',   97, 72,  96, 86, { loyal: true }),
    handang:    G('韩当',   'wu',   'jianye',   76, 82,  50, 46),
    chengpu:    G('程普',   'wu',   'kuaiji',   82, 80,  66, 62),
    zhoutai:    G('周泰',   'wu',   'kuaiji',   76, 92,  40, 32),
    huanggai:   G('黄盖',   'wu',   'chaisang', 78, 80,  66, 58),
    taishici:   G('太史慈', 'wu',   'chaisang', 82, 94,  62, 48),

    zhaoyun:    G('赵云',   null,   'nanpi',    91, 96,  76, 66, { hidden: true }),
    zhugeliang: G('诸葛亮', null,   'xiangyang',94, 38, 100, 96, { wolong: true }),
    xushu:      G('徐庶',   null,   'xiangyang',80, 62,  92, 82, { hidden: true }),
    pangtong:   G('庞统',   null,   'jiangling',84, 34,  97, 86, { hidden: true }),
    huangzhong: G('黄忠',   null,   'changsha', 88, 94,  60, 52, { hidden: true }),
    weiyan:     G('魏延',   null,   'jiangxia', 84, 91,  64, 44, { hidden: true }),
    ganning:    G('甘宁',   null,   'jiangxia', 86, 94,  66, 40, { hidden: true }),
    machao:     G('马超',   null,   'changan',  88, 97,  42, 30, { hidden: true }),
    lusu:       G('鲁肃',   null,   'shouchun', 82, 54,  92, 88, { hidden: true }),
  };

  // 地图装饰：河流与山脉（只用于绘制）
  ZL.MAP = {
    width: 880,
    height: 800,
    yellowRiver: 'M-10,292 C70,262 150,190 228,236 S252,372 304,388 S432,372 520,350 S636,274 690,240 S748,218 790,212',
    yangtze: 'M-10,612 C110,630 240,700 342,700 S446,660 500,668 S578,720 620,698 S676,590 730,566 S820,540 900,522',
    coast: 'M766,-10 L752,64 C742,118 700,160 672,186 C704,230 760,236 800,232 C842,228 868,236 890,248 L890,262 C858,282 826,300 806,320 C786,352 774,392 776,432 C780,482 804,520 844,546 C866,582 866,622 856,662 C846,702 830,742 826,810 L900,810 L900,-10 Z',
    ranges: [
      { name: '太行山', pts: [[420, 150], [432, 214], [428, 270], [414, 330]] },
      { name: '秦岭',   pts: [[60, 455], [140, 462], [220, 470], [290, 474]] },
      { name: '大别山', pts: [[470, 562], [520, 576], [566, 590]] },
      { name: '武夷山', pts: [[640, 760], [700, 744], [740, 770]] },
    ],
  };
})(ZL);
// ---------- rules.js ----------
// 游戏规则：所有数值计算和结算都在这里，不碰界面。
// 状态 s 是一个纯数据对象（可以直接存档成 JSON），每个函数都只读写它。
(function (ZL) {
  const SEASONS = ['春', '夏', '秋', '冬'];
  const DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

  // ---------- 小工具 ----------
  function cnNum(n) {
    if (n < 10) return DIGITS[n];
    const t = Math.floor(n / 10), o = n % 10;
    return (t === 1 ? '' : DIGITS[t]) + '十' + (o ? DIGITS[o] : '');
  }
  function dateLabel(s, offset = 0) {
    const turn = s.turn - 1 + offset;
    const year = ZL.SCENARIO.startYear + Math.floor(turn / 4);
    const n = year - 195; // 建安元年 = 196 年
    return `建安${n === 1 ? '元' : cnNum(n)}年 · ${SEASONS[turn % 4]}`;
  }
  // 可复现的随机数（存档里带着种子，读档后结果一致）
  function rand(s) {
    let t = (s.seed = (s.seed + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const between = (s, a, b) => a + (b - a) * rand(s);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = (s, arr) => arr[Math.floor(rand(s) * arr.length)];
  function shuffle(s, arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand(s) * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function fmt(n) {
    n = Math.round(n);
    if (Math.abs(n) >= 10000) return (n / 10000).toFixed(n % 10000 === 0 ? 0 : 1) + '万';
    return String(n);
  }

  // 相邻关系（由道路生成，静态）
  const ADJ = {};
  for (const id of Object.keys(ZL.CITIES)) ADJ[id] = [];
  for (const [a, b] of ZL.ROADS) { ADJ[a].push(b); ADJ[b].push(a); }

  // ---------- 开局 ----------
  function newGame(player, seed) {
    const s = {
      version: 1, seed: (seed >>> 0) || ((Date.now() ^ 0x9e3779b9) >>> 0), turn: 1, player,
      factions: {}, cities: {}, generals: {}, alliances: {}, flags: { visits: 0, fired: {} },
      reports: [], chronicle: [], over: null,
    };
    for (const [id, f] of Object.entries(ZL.FACTIONS)) {
      s.factions[id] = { id, name: f.name, mark: f.mark, ruler: f.ruler, alive: true };
    }
    for (const [id, c] of Object.entries(ZL.CITIES)) {
      s.cities[id] = {
        id, name: c.name, owner: c.owner, keeper: c.keeper || null,
        troops: c.troops, train: c.owner ? 60 : 50, defense: c.defense, defenseMax: c.defense,
        gold: c.gold, food: c.food, commerce: c.commerce, farm: c.farm, morale: 70,
        garrison: c.owner ? 0 : c.troops,
      };
    }
    for (const [id, g] of Object.entries(ZL.GENERALS)) {
      s.generals[id] = {
        id, name: g.name, faction: g.faction, city: g.city, lea: g.lea, str: g.str, int: g.int, pol: g.pol,
        loyal: !!g.loyal, hidden: !!g.hidden, wolong: !!g.wolong, captive: false, former: null,
        alive: true, acted: false, did: null,
      };
    }
    startTurn(s);
    return s;
  }

  // ---------- 查询 ----------
  const citiesOf = (s, f) => Object.values(s.cities).filter(c => c.owner === f);
  const generalsOf = (s, f) => Object.values(s.generals).filter(g => g.alive && g.faction === f);
  const officersIn = (s, cityId, f) => Object.values(s.generals)
    .filter(g => g.alive && g.city === cityId && g.faction === f);
  const idleIn = (s, cityId, f) => officersIn(s, cityId, f).filter(g => !g.acted);
  // 城里能登用的人：已被发现的在野武将 + 俘虏
  const recruitableIn = (s, cityId) => Object.values(s.generals)
    .filter(g => g.alive && g.city === cityId && !g.faction && !g.hidden);
  const hiddenIn = (s, cityId) => Object.values(s.generals)
    .filter(g => g.alive && g.city === cityId && !g.faction && g.hidden);

  const pairKey = (a, b) => [a, b].sort().join('|');
  function allyUntil(s, a, b) {
    if (!a || !b || a === b) return 0;
    const t = s.alliances[pairKey(a, b)] || 0;
    return t > s.turn ? t : 0;
  }
  const isAllied = (s, a, b) => allyUntil(s, a, b) > 0;
  // f 能否攻击这座城：不是自己的，也不是盟友的
  const isHostile = (s, f, city) => city.owner !== f && !(city.owner && isAllied(s, f, city.owner));

  function best(list, key) {
    return list.reduce((m, g) => (!m || g[key] > m[key] ? g : m), null);
  }
  // 单位兵力的战斗力：训练度和主将统率各占一部分
  const perTroop = (train, lea) => (0.6 + train / 250) * (0.7 + lea / 300);
  const wallBonus = defense => 1 + defense / 4000;

  // 守城方的将领。中立城没有武将，用一个虚拟守将
  function defenders(s, city) {
    if (!city.owner) {
      const k = city.keeper || '';
      return [{ name: k.length > 2 ? k : `${k}部将`, lea: 62, str: 64, int: 55, virtual: true }];
    }
    const list = officersIn(s, city.id, city.owner);
    return list.length ? list : [{ name: '守城校尉', lea: 50, str: 50, int: 40, virtual: true }];
  }

  // 估算出征把握：攻方战力 / 守方战力
  function estimate(s, fromId, toId, troops, leader) {
    const from = s.cities[fromId], to = s.cities[toId];
    const def = defenders(s, to);
    const ap = troops * perTroop(from.train, leader.lea);
    const dp = Math.max(1, to.troops) * perTroop(to.train, best(def, 'lea').lea) * wallBonus(to.defense);
    return ap / dp;
  }
  function oddsLabel(ratio) {
    if (ratio >= 1.6) return { text: '必胜', tone: 'good' };
    if (ratio >= 1.3) return { text: '占优', tone: 'good' };
    if (ratio >= 1.05) return { text: '相当', tone: 'warn' };
    return { text: '不利', tone: 'bad' };
  }

  function factionStrength(s, f) {
    const cs = citiesOf(s, f);
    return { cities: cs.length, troops: cs.reduce((t, c) => t + c.troops, 0), gold: cs.reduce((t, c) => t + c.gold, 0), food: cs.reduce((t, c) => t + c.food, 0) };
  }
  // 每季收金、秋收粮（民心越高收得越多）
  const income = c => Math.round(c.commerce * (0.5 + c.morale / 200) * 0.5);
  const harvest = c => Math.round(c.farm * 4 * (0.5 + c.morale / 200));
  const winTarget = s => Math.ceil(Object.keys(s.cities).length * 2 / 3);
  const foodSeasons = c => (c.troops > 0 ? Math.floor(c.food / (c.troops * 0.03)) : Infinity);

  function record(s, entry) {
    entry.date = dateLabel(s);
    s.reports.push(entry);
    s.chronicle.push(entry);
    if (s.chronicle.length > 300) s.chronicle.splice(0, s.chronicle.length - 300);
  }
  const involves = (s, ...factions) => factions.includes(s.player);

  // ---------- 指令 ----------
  ZL.COMMANDS = [
    { id: 'commerce',  name: '开发商业', group: '内政', stat: 'pol', gold: 50 },
    { id: 'farm',      name: '开发农业', group: '内政', stat: 'pol', gold: 50 },
    { id: 'recruit',   name: '征兵',     group: '军事', stat: 'lea', gold: 150 },
    { id: 'train',     name: '训练',     group: '军事', stat: 'lea', gold: 0 },
    { id: 'attack',    name: '出征',     group: '军事', stat: 'lea', gold: 0 },
    { id: 'move',      name: '调动',     group: '军事', stat: null,  gold: 0 },
    { id: 'search',    name: '搜索',     group: '人事', stat: 'int', gold: 0 },
    { id: 'employ',    name: '登用',     group: '人事', stat: 'pol', gold: 0 },
    { id: 'diplomacy', name: '外交',     group: '外交', stat: 'int', gold: 200 },
  ];
  const CMD = {};
  ZL.COMMANDS.forEach(c => { CMD[c.id] = c; });

  const gainDev = g => Math.round(8 + g.pol * 0.22);
  const gainRecruit = g => Math.round((600 + g.lea * 12) / 10) * 10;
  const gainTrain = g => Math.round(5 + g.lea / 12);

  // 指令预览：界面上按钮下面那一行字
  function preview(s, gid, cmd) {
    const g = s.generals[gid], c = s.cities[g.city];
    switch (cmd) {
      case 'commerce': return `商业 +${gainDev(g)}`;
      case 'farm': return `农业 +${gainDev(g)}`;
      case 'recruit': return `兵 +${fmt(gainRecruit(g))}`;
      case 'train': return `训练 +${Math.min(gainTrain(g), 100 - c.train)}`;
      case 'attack': return '进攻相邻城';
      case 'move': return '移往己方城';
      case 'search': return hiddenIn(s, c.id).length ? '似有贤才隐居' : '寻访钱粮人才';
      case 'employ': return recruitableIn(s, c.id).length ? `可登用 ${recruitableIn(s, c.id).length} 人` : '城中无人可招';
      case 'diplomacy': return '结盟两年';
    }
    return '';
  }

  // 能不能下这个指令；不能时给出原因
  function canDo(s, gid, cmd) {
    const g = s.generals[gid];
    if (!g || !g.alive || g.acted) return { ok: false, why: '本季已行动' };
    const c = s.cities[g.city], def = CMD[cmd];
    if (def.gold && c.gold < def.gold) return { ok: false, why: `需金 ${def.gold}` };
    switch (cmd) {
      case 'commerce': if (c.commerce >= 999) return { ok: false, why: '商业已满' }; break;
      case 'farm': if (c.farm >= 999) return { ok: false, why: '农业已满' }; break;
      case 'recruit':
        if (c.troops >= 60000) return { ok: false, why: '兵力已满' };
        if (c.morale < 30) return { ok: false, why: '民心过低' };
        break;
      case 'train':
        if (c.troops <= 0) return { ok: false, why: '城中无兵' };
        if (c.train >= 100) return { ok: false, why: '训练已满' };
        break;
      case 'attack': {
        if (c.troops < 1000) return { ok: false, why: '兵不足一千' };
        if (!ADJ[c.id].some(id => isHostile(s, g.faction, s.cities[id]))) return { ok: false, why: '邻近无敌城' };
        if (c.food < 100) return { ok: false, why: '粮草不足' };
        break;
      }
      case 'move':
        if (!ADJ[c.id].some(id => s.cities[id].owner === g.faction)) return { ok: false, why: '邻近无己方城' };
        break;
      case 'employ':
        if (!recruitableIn(s, c.id).length) return { ok: false, why: '城中无人可招' };
        break;
      case 'diplomacy':
        if (!Object.values(s.factions).some(f => f.alive && f.id !== g.faction && !isAllied(s, f.id, g.faction))) {
          return { ok: false, why: '无可结盟者' };
        }
        break;
    }
    return { ok: true };
  }

  // 登用成功率
  function employChance(s, gid, tid) {
    const g = s.generals[gid], t = s.generals[tid];
    if (t.wolong) return s.factions[g.faction].ruler === 'liubei' ? (s.flags.visits >= 2 ? 1 : 0) : 0.03;
    let p = 0.25 + (g.pol - 50) / 120;
    if (t.captive) {
      p -= 0.1;
      if (t.loyal && t.former && s.factions[t.former] && s.factions[t.former].alive) p = 0.04;
    }
    return clamp(p, 0.05, 0.9);
  }
  // 外交成功率：共同的强敌越强越容易结盟
  function allyChance(s, f, target, intel) {
    const strongest = Object.values(s.factions).filter(x => x.alive)
      .map(x => ({ id: x.id, n: citiesOf(s, x.id).length })).sort((a, b) => b.n - a.n)[0];
    let p = 0.15 + intel / 300;
    if (strongest && strongest.id !== f && strongest.id !== target && strongest.n >= 6) p += 0.25;
    if (s.flags.hit && s.flags.hit[pairKey(f, target)] >= s.turn - 4) p -= 0.3; // 刚打过仗
    return clamp(p, 0.05, 0.85);
  }

  // 执行指令。返回 { text, battle? } 给界面展示
  function doCommand(s, gid, cmd, opt = {}) {
    const check = canDo(s, gid, cmd);
    if (!check.ok) return { error: check.why };
    const g = s.generals[gid], c = s.cities[g.city], def = CMD[cmd];
    const mine = g.faction === s.player;
    let text = '';
    let res = {};
    switch (cmd) {
      case 'commerce': {
        const add = Math.min(999 - c.commerce, gainDev(g) + Math.round(between(s, 0, 4)));
        c.commerce += add; c.gold -= def.gold;
        text = `${g.name}在${c.name}整顿市集，商业 +${add}`;
        break;
      }
      case 'farm': {
        const add = Math.min(999 - c.farm, gainDev(g) + Math.round(between(s, 0, 4)));
        c.farm += add; c.gold -= def.gold;
        text = `${g.name}在${c.name}督劝农桑，农业 +${add}`;
        break;
      }
      case 'recruit': {
        const add = Math.min(60000 - c.troops, Math.round(gainRecruit(g) * between(s, 0.9, 1.1) / 10) * 10);
        c.train = Math.round((c.train * c.troops + 35 * add) / (c.troops + add));
        c.troops += add; c.gold -= def.gold; c.morale = Math.max(10, c.morale - 6);
        text = `${g.name}在${c.name}募兵 ${fmt(add)}，民心略降`;
        break;
      }
      case 'train': {
        const add = Math.min(100 - c.train, gainTrain(g));
        c.train += add;
        text = `${g.name}操练${c.name}兵马，训练 +${add}`;
        break;
      }
      case 'search': {
        const hidden = hiddenIn(s, c.id);
        if (hidden.length && rand(s) < 0.25 + g.int / 250) {
          const t = pick(s, hidden);
          t.hidden = false;
          text = `${g.name}寻访${c.name}乡野，访得贤才${t.name}`;
          res.found = t.id;
        } else {
          const r = rand(s);
          if (r < 0.45) { const v = Math.round(between(s, 60, 160)); c.gold += v; text = `${g.name}在${c.name}查得隐田，得金 ${v}`; }
          else if (r < 0.75) { const v = Math.round(between(s, 150, 400)); c.food += v; text = `${g.name}在${c.name}开仓清点，得粮 ${v}`; }
          else text = `${g.name}在${c.name}寻访多日，一无所获`;
        }
        break;
      }
      case 'employ': {
        const t = s.generals[opt.target];
        if (!t || t.city !== c.id || t.faction || t.hidden) return { error: '此人不在城中' };
        if (t.wolong && s.factions[g.faction].ruler === 'liubei') {
          s.flags.visits += 1;
          if (s.flags.visits >= 3) {
            join(s, t, g.faction);
            text = `三顾茅庐。${g.name}第三次拜访隆中，诸葛亮感其诚意，出山相助`;
            res.big = true;
          } else {
            text = s.flags.visits === 1
              ? `${g.name}往隆中拜访诸葛亮，童子言先生出游未归`
              : `${g.name}冒雪再访隆中，诸葛亮仍不在草庐`;
          }
          break;
        }
        if (rand(s) < employChance(s, gid, t.id)) {
          join(s, t, g.faction);
          text = `${g.name}说动${t.name}，${t.name}愿效犬马之劳`;
          res.joined = t.id;
        } else {
          text = t.captive ? `${t.name}不肯归降` : `${t.name}婉拒了${g.name}的邀请`;
        }
        break;
      }
      case 'move': {
        const to = s.cities[opt.target];
        if (!to || !ADJ[c.id].includes(to.id) || to.owner !== g.faction) return { error: '只能调往相邻的己方城' };
        const n = clamp(Math.round(opt.troops || 0), 0, c.troops);
        c.troops -= n;
        to.train = to.troops + n > 0 ? Math.round((to.train * to.troops + c.train * n) / (to.troops + n)) : to.train;
        to.troops += n;
        g.city = to.id;
        text = n ? `${g.name}率兵 ${fmt(n)} 自${c.name}移驻${to.name}` : `${g.name}自${c.name}移驻${to.name}`;
        break;
      }
      case 'diplomacy': {
        const t = s.factions[opt.target];
        if (!t || !t.alive || t.id === g.faction || isAllied(s, g.faction, t.id)) return { error: '无法与其结盟' };
        c.gold -= def.gold;
        if (rand(s) < allyChance(s, g.faction, t.id, g.int)) {
          s.alliances[pairKey(g.faction, t.id)] = s.turn + 8;
          text = `${g.name}出使${t.name}，两家结为同盟，约期两年`;
          res.allied = t.id;
        } else {
          text = `${g.name}出使${t.name}，${t.name}不肯结盟`;
        }
        break;
      }
      case 'attack': {
        const to = s.cities[opt.target];
        if (!to || !ADJ[c.id].includes(to.id) || !isHostile(s, g.faction, to)) return { error: '不能攻打这座城' };
        const n = clamp(Math.round(opt.troops || 0), 1000, c.troops);
        const cost = Math.round(n * 0.1);
        if (c.food < cost) return { error: `粮草不足，需粮 ${cost}` };
        const deputies = (opt.deputies || []).map(id => s.generals[id])
          .filter(d => d && d.id !== g.id && d.city === c.id && d.faction === g.faction && !d.acted).slice(0, 2);
        c.troops -= n; c.food -= cost;
        const team = [g, ...deputies];
        team.forEach(x => { x.acted = true; x.did = 'attack'; });
        const battle = fight(s, { faction: g.faction, from: c.id, to: to.id, team: team.map(x => x.id), troops: n, train: c.train });
        res.battle = battle;
        text = battle.summary;
        break;
      }
    }
    g.acted = true;
    g.did = cmd;
    // 电脑的日常内政不进史册，只记大事
    const notable = mine || res.joined || res.big || res.allied || res.found;
    if (cmd !== 'attack' && notable) {
      record(s, { kind: cmd === 'diplomacy' ? 'ally' : cmd === 'employ' || cmd === 'search' ? 'people' : 'civil', text, mine });
    }
    return Object.assign({ text }, res);
  }

  function join(s, t, f) {
    t.faction = f; t.captive = false; t.hidden = false; t.former = null;
    t.acted = true; t.did = 'joined';
  }

  // ---------- 战斗 ----------
  // 返回完整的战斗过程（每一回合双方剩余兵力 + 演义式文字），界面按它播放
  function fight(s, att) {
    const from = s.cities[att.from], city = s.cities[att.to];
    const atkTeam = att.team.map(id => s.generals[id]);
    const defTeam = defenders(s, city);
    const defFaction = city.owner;
    const aLead = atkTeam[0], dLead = best(defTeam, 'lea');
    const aBrave = best(atkTeam, 'str'), dBrave = best(defTeam, 'str');
    const aWise = best(atkTeam, 'int'), dWise = best(defTeam, 'int');
    const defName = defFaction ? s.factions[defFaction].name : (city.keeper || '守军');
    const atkName = s.factions[att.faction].name;
    const a0 = att.troops, d0 = city.troops;
    let a = a0, d = d0, aBoost = 1, dBoost = 1;
    const steps = [];
    const push = (kind, text) => steps.push({ kind, text, a: Math.round(a), d: Math.round(d) });

    push('open', `${aLead.name}率军 ${fmt(a0)} 自${from.name}杀奔${city.name}。${dLead.name}据城而守，守军 ${fmt(d0)}。`);

    if (d > 0) {
      // 计策
      const pa = clamp(0.12 + (aWise.int - dWise.int) / 90, 0, 0.55);
      const pd = clamp(0.08 + (dWise.int - aWise.int) / 90, 0, 0.4);
      if (rand(s) < pa) {
        const loss = Math.round(d * between(s, 0.12, 0.2)); d -= loss;
        push('plot', `${aWise.name}定下火计，夜焚敌营，守军折损 ${fmt(loss)}。`);
      } else if (rand(s) < pd) {
        const loss = Math.round(a * between(s, 0.1, 0.16)); a -= loss;
        push('plot', `${dWise.name}识破来意，城外设伏，攻军折损 ${fmt(loss)}。`);
      }
      // 单挑
      if (rand(s) < 0.4) {
        const sa = aBrave.str + between(s, 0, 30), sd = dBrave.str + between(s, 0, 30);
        if (sa >= sd) {
          d *= 0.92; aBoost = 1.08;
          push('duel', `${aBrave.name}阵前搦战，${dBrave.name}出马迎敌。战不数合，${dBrave.name}抵挡不住，拨马便走。`);
        } else {
          a *= 0.92; dBoost = 1.08;
          push('duel', `${aBrave.name}阵前搦战，${dBrave.name}挺枪出城，杀得${aBrave.name}大败而回。`);
        }
      }
    }

    let result = 'hold';
    if (d < 300) result = 'take';
    const lines = shuffle(s, [
      `${aLead.name}督军再攻，矢石如雨。`,
      `攻城车直逼城门，${dLead.name}死守不退。`,
      `${aBrave.name}奋勇登城，守军拼死搏杀。`,
      `城上滚木擂石齐下，攻军折损甚众。`,
      `${aLead.name}分兵三路，围城猛攻。`,
      `${dLead.name}夜出劫营，被${aLead.name}击退。`,
    ]);
    for (let r = 1; r <= 6 && result === 'hold'; r++) {
      const ap = a * perTroop(att.train, aLead.lea) * aBoost;
      const dp = d * perTroop(city.train, dLead.lea) * wallBonus(city.defense) * dBoost;
      a = Math.max(0, a - dp * 0.15 * between(s, 0.85, 1.15));
      d = Math.max(0, d - ap * 0.15 * between(s, 0.85, 1.15));
      city.defense = Math.max(0, Math.round(city.defense - ap / 120));
      const line = r === 1 ? `两军鏖战于${city.name}城下。` : lines[r - 2];
      push('round', line);
      if (d < 300) result = 'take';
      else if (a < a0 * 0.35 || (r >= 3 && a < d * 0.6)) result = 'retreat';
    }
    if (result === 'hold') result = 'retreat';

    a = Math.round(a); d = Math.round(d);
    const battle = {
      from: from.id, to: city.id, attacker: att.faction, defender: defFaction,
      atkName, defName, atkLead: aLead.name, defLead: dLead.name,
      a0, d0, a, d, result, steps, captured: [], fled: [],
    };
    // 记下双方交过手，影响之后的外交
    if (defFaction) { s.flags.hit = s.flags.hit || {}; s.flags.hit[pairKey(att.faction, defFaction)] = s.turn; }
    // 玩家先动手打了谁，谁就不再手下留情（见 ai.js 的开局保护）
    if (defFaction && att.faction === s.player) { s.flags.provoked = s.flags.provoked || {}; s.flags.provoked[defFaction] = s.turn; }

    if (result === 'take') {
      push('end', `${city.name}城破！${atkName}军入城。`);
      city.owner = att.faction; city.troops = a; city.train = att.train; city.garrison = 0;
      city.morale = Math.max(30, city.morale - 10);
      atkTeam.forEach(g => { g.city = city.id; });
      if (defFaction) {
        // 守将：有退路的多半突围，没有就被俘
        for (const g of officersIn(s, city.id, defFaction)) {
          const ways = ADJ[city.id].filter(id => s.cities[id].owner === defFaction);
          const any = citiesOf(s, defFaction);
          if (any.length && rand(s) < (ways.length ? 0.65 : 0.4)) {
            g.city = (ways.length ? pick(s, ways) : pick(s, any).id);
            battle.fled.push(g.name);
          } else {
            g.faction = null; g.captive = true; g.former = defFaction; g.acted = true;
            battle.captured.push(g.name);
          }
        }
        afterLoss(s, defFaction, battle);
      }
      battle.summary = `${atkName}军攻克${city.name}` + (battle.captured.length ? `，俘获${battle.captured.join('、')}` : '');
    } else {
      push('end', `${aLead.name}久攻不下，收兵回${from.name}。`);
      from.troops += a;
      city.troops = d;
      battle.summary = `${atkName}军进攻${city.name}，被${defName}击退`;
    }
    record(s, { kind: 'battle', text: battle.summary, mine: involves(s, att.faction, defFaction), battle: { a0, d0, a, d, result, from: from.name, to: city.name } });
    checkOver(s);
    return battle;
  }

  // 丢城之后：君主被俘要换人，城丢光了就灭亡
  function afterLoss(s, f, battle) {
    const fac = s.factions[f];
    if (!citiesOf(s, f).length) {
      fac.alive = false;
      record(s, { kind: 'event', title: `${fac.name}势力覆灭`, text: `${fac.name}失去最后一座城池，势力覆灭。`, mine: f === s.player });
      return;
    }
    const ruler = s.generals[fac.ruler];
    if (!ruler || !ruler.alive || ruler.faction !== f) succeed(s, f, `${ruler ? ruler.name : fac.name}被擒`);
  }
  function succeed(s, f, reason, prefer) {
    const fac = s.factions[f];
    const cands = generalsOf(s, f);
    if (!cands.length) {
      fac.alive = false;
      for (const c of citiesOf(s, f)) { c.owner = null; c.keeper = `${fac.name}旧部`; c.garrison = c.troops; }
      record(s, { kind: 'event', title: `${fac.name}势力瓦解`, text: `${reason}，${fac.name}麾下无人继位，余部各自据城自守。`, mine: f === s.player });
      return;
    }
    const heir = (prefer && cands.find(g => g.id === prefer)) ||
      cands.slice().sort((x, y) => (y.lea + y.int + y.pol) - (x.lea + x.int + x.pol))[0];
    fac.ruler = heir.id; fac.name = heir.name;
    record(s, { kind: 'event', title: `${heir.name}继位`, text: `${reason}，${heir.name}继承基业。`, mine: f === s.player });
  }

  // ---------- 回合流程 ----------
  function startTurn(s) {
    s.reports = [];
    for (const g of Object.values(s.generals)) { g.acted = false; g.did = null; }
    const season = (s.turn - 1) % 4;
    for (const c of Object.values(s.cities)) {
      if (c.owner) {
        if (s.turn > 1) {
          c.gold += income(c);
          if (season === 2) c.food += harvest(c);
        }
        if (c.morale < 70) c.morale += 1;
      } else {
        c.troops = Math.min(c.garrison, c.troops + 300);
      }
      c.defense = Math.min(c.defenseMax, c.defense + 25);
    }
    events(s);
  }

  // 结束回合：电脑势力行动 → 军粮消耗 → 进入下一季
  function endTurn(s) {
    if (s.over) return;
    s.reports = []; // 本季玩家自己的行动已经即时展示过，战报只收电脑行动和新事件
    const order = shuffle(s, Object.keys(s.factions).filter(f => f !== s.player && s.factions[f].alive));
    for (const f of order) {
      if (s.over) break;
      if (s.factions[f].alive) ZL.AI.run(s, f);
    }
    for (const c of Object.values(s.cities)) {
      if (!c.owner) continue;
      c.food -= Math.round(c.troops * 0.03);
      if (c.food < 0) {
        const lost = Math.round(c.troops * 0.12);
        c.troops -= lost; c.food = 0; c.morale = Math.max(10, c.morale - 5);
        record(s, { kind: 'civil', text: `${c.name}军粮断绝，士卒逃散 ${fmt(lost)}`, mine: c.owner === s.player, warn: true });
      }
    }
    for (const [k, t] of Object.entries(s.alliances)) {
      if (t === s.turn + 1) {
        const [x, y] = k.split('|');
        record(s, { kind: 'ally', text: `${s.factions[x].name}与${s.factions[y].name}的盟约到期`, mine: involves(s, x, y) });
      }
    }
    const carried = s.reports;
    s.turn += 1;
    checkOver(s);
    startTurn(s);
    // 战报 = 电脑行动 + 新一季开始时的事件
    s.reports = carried.concat(s.reports);
    return s.reports;
  }

  function checkOver(s) {
    if (s.over) return;
    const mine = citiesOf(s, s.player).length;
    const rivals = Object.values(s.factions).filter(f => f.alive && f.id !== s.player).length;
    if (!mine || !s.factions[s.player].alive) s.over = { result: 'lose', turn: s.turn };
    else if (mine >= winTarget(s) || !rivals) s.over = { result: 'win', turn: s.turn };
  }

  // ---------- 事件 ----------
  function events(s) {
    const fired = s.flags.fired;
    const once = (id, fn) => { if (!fired[id] && fn() !== false) fired[id] = s.turn; };
    const fac = id => s.factions[id];
    const gen = id => s.generals[id];

    if (s.turn === 1) {
      once('intro', () => record(s, { kind: 'event', title: '官渡前夜', text: ZL.SCENARIO.intro, mine: true, carry: true }));
    }
    // 赵云来投（200 年夏）
    if (s.turn === 2) once('zhaoyun', () => {
      const z = gen('zhaoyun'), lb = gen('liubei');
      if (!z.alive || z.faction || z.captive || !fac('shu').alive || !lb.alive || lb.faction !== 'shu') return false;
      z.faction = 'shu'; z.hidden = false; z.city = lb.city;
      record(s, { kind: 'event', title: '子龙来投', text: `常山赵云离开河北，千里南下投奔刘备，现已抵达${s.cities[lb.city].name}。`, mine: s.player === 'shu' });
    });
    // 孙策遇刺（200 年秋）
    if (s.turn === 3) once('sunce', () => {
      const sc = gen('sunce');
      if (!sc.alive || fac('wu').ruler !== 'sunce' || rand(s) > (s.player === 'wu' ? 0.5 : 0.6)) return false;
      sc.alive = false;
      succeed(s, 'wu', '孙策出猎丹徒，遭许贡门客行刺，伤重而亡', 'sunquan');
      record(s, { kind: 'event', title: '小霸王陨落', text: `孙策临终嘱孙权：“举贤任能，各尽其心，以保江东，我不如卿。”`, mine: s.player === 'wu' });
    });
    // 袁绍病逝（202 年夏）
    if (s.turn === 10) once('yuanshao', () => {
      const ys = gen('yuanshao');
      if (!ys.alive || fac('yuan').ruler !== 'yuanshao') return false;
      ys.alive = false;
      succeed(s, 'yuan', '袁绍忧愤成疾，呕血而亡', 'yuanshang');
      for (const c of citiesOf(s, 'yuan')) c.morale = Math.max(10, c.morale - 15);
      record(s, { kind: 'event', title: '河北生变', text: '袁谭、袁尚兄弟争位，河北诸城人心浮动（民心 -15）。', mine: s.player === 'yuan' });
    });
    // 孙刘联盟：曹操势大时自动结盟
    if (!fired.sunliu) {
      const wei = citiesOf(s, 'wei').length;
      if (wei >= 9 && fac('wei').alive && fac('wu').alive && fac('shu').alive && !isAllied(s, 'wu', 'shu')) {
        s.alliances[pairKey('wu', 'shu')] = s.turn + 12;
        fired.sunliu = s.turn;
        record(s, { kind: 'event', title: '孙刘联盟', text: `曹操已据 ${wei} 城，${fac('wu').name}与${fac('shu').name}遣使往来，结盟共抗曹军，约期三年。`, mine: involves(s, 'wu', 'shu') });
      }
    }
    // 随机事件
    if (s.turn > 1 && rand(s) < 0.4) {
      const owned = Object.values(s.cities).filter(c => c.owner);
      const c = pick(s, owned), season = (s.turn - 1) % 4, mine = c.owner === s.player;
      const r = rand(s);
      if (season === 2 && r < 0.3) { const v = Math.round(c.farm * 2); c.food += v; record(s, { kind: 'civil', text: `${c.name}五谷丰登，额外收粮 ${v}`, mine }); }
      else if ((season === 1 || season === 2) && r < 0.5) { const v = Math.round(c.food * 0.3); c.food -= v; record(s, { kind: 'civil', text: `${c.name}遭遇蝗灾，损粮 ${v}`, mine, warn: true }); }
      else if (r < 0.65) { const v = Math.round(c.troops * 0.08); c.troops -= v; record(s, { kind: 'civil', text: `${c.name}疫病流行，士卒病亡 ${fmt(v)}`, mine, warn: true }); }
      else if (r < 0.85) { c.gold += 120; record(s, { kind: 'civil', text: `商旅云集${c.name}，得金 120`, mine }); }
      else { c.troops += 800; c.morale = Math.min(100, c.morale + 5); record(s, { kind: 'civil', text: `流民归附${c.name}，得兵 800，民心 +5`, mine }); }
    }
  }

  Object.assign(ZL, {
    ADJ, SEASONS, newGame, startTurn, endTurn, doCommand, canDo, preview, fight,
    citiesOf, generalsOf, officersIn, idleIn, recruitableIn, hiddenIn, defenders,
    isAllied, allyUntil, isHostile, estimate, oddsLabel, employChance, allyChance,
    factionStrength, winTarget, foodSeasons, income, harvest, dateLabel, fmt, best, rand, between, clamp, pick, shuffle,
    gainDev, gainRecruit, gainTrain, perTroop, wallBonus,
  });
})(ZL);
// ---------- ai.js ----------
// 电脑势力的决策 + 军师进言，全部按规则计算。
(function (ZL) {
  const R = ZL;

  // 开局保护：第一年不主动打玩家，除非玩家先打了这一家
  const spared = (s, f, city) => city.owner === s.player && s.turn <= 4 && !(s.flags.provoked && s.flags.provoked[f]);

  // 选本季的主攻方向：前线城 + 相邻己方城能凑出的兵，对比守方战力，挑最好打的
  function plan(s, f) {
    let top = null;
    for (const c of R.citiesOf(s, f)) {
      const helpers = R.ADJ[c.id].map(id => s.cities[id]).filter(h => h.owner === f);
      const pool = c.troops + helpers.reduce((t, h) => t + h.troops * 0.6, 0);
      for (const id of R.ADJ[c.id]) {
        const n = s.cities[id];
        if (!R.isHostile(s, f, n) || spared(s, f, n)) continue;
        let guard = Math.max(1, n.troops) * R.wallBonus(n.defense);
        if (!n.owner) guard *= 1.1;                                // 中立城不急着打
        const score = pool / guard;
        if (!top || score > top.score) top = { stage: c.id, target: n.id, score };
      }
    }
    return top;
  }

  function run(s, f) {
    const agg = ZL.FACTIONS[f].aggression;
    const camp = plan(s, f);
    // 每季出兵次数有限（地盘越大越多），免得一家同时四面开打
    const maxAttacks = 1 + Math.floor(R.citiesOf(s, f).length / 6);
    let attacks = 0;
    // 集结城最后行动，好让援兵先到
    const order = R.shuffle(s, R.citiesOf(s, f)).sort((a, b) => (camp && a.id === camp.stage) - (camp && b.id === camp.stage));
    for (const c of order) {
      if (c.owner !== f || s.over) continue; // 本回合可能刚丢了这座城
      let idle = R.idleIn(s, c.id, f);
      if (!idle.length) continue;
      const neigh = R.ADJ[c.id].map(id => s.cities[id]);
      const hostile = neigh.filter(n => R.isHostile(s, f, n));
      const threat = hostile.filter(n => n.owner).reduce((t, n) => t + n.troops, 0);
      const use = (g, cmd, opt) => {
        const r = R.doCommand(s, g.id, cmd, opt);
        idle = idle.filter(x => !x.acted);
        return r;
      };

      // 1. 登用城里的人才和俘虏
      for (const t of R.recruitableIn(s, c.id)) {
        if (!idle.length) break;
        if (t.wolong && s.factions[f].ruler !== 'liubei') continue;
        const g = R.best(idle, 'pol');
        if (!t.wolong && R.employChance(s, g.id, t.id) < 0.2) continue;
        use(g, 'employ', { target: t.id });
      }

      // 2. 出征：兵力比达到本家的进攻门槛才打
      if (s.turn > 1 && attacks < maxAttacks && idle.length && c.troops >= 4000) {
        const leader = R.best(idle, 'lea');
        const others = hostile.filter(n => n.owner);
        let target = null, top = 0, send = 0;
        for (const n of hostile) {
          if (spared(s, f, n)) continue;
          // 身后还有别的敌城就多留点兵
          const rest = others.filter(o => o.id !== n.id).reduce((t, o) => t + o.troops, 0);
          const keep = rest ? Math.min(c.troops * 0.5, rest * 0.5) : c.troops * 0.1;
          const n2 = Math.floor((c.troops - keep) / 100) * 100;
          if (n2 < 3000) continue;
          const ratio = R.estimate(s, c.id, n.id, n2, leader);
          const need = agg + (n.owner ? 0 : 0.1);
          if (ratio >= need && ratio > top) { top = ratio; target = n; send = n2; }
        }
        if (target && leader.lea >= 55 && c.food >= send * 0.1) {
          const rest = idle.filter(g => g.id !== leader.id);
          const deputies = [];
          const brave = R.best(rest, 'str');
          if (brave && brave.str >= 70) deputies.push(brave.id);
          const wise = R.best(rest.filter(g => !deputies.includes(g.id)), 'int');
          if (wise && wise.int >= 70) deputies.push(wise.id);
          use(leader, 'attack', { target: target.id, troops: send, deputies });
          attacks++;
          if (c.owner !== f) continue;
        }
      }

      // 3. 其余武将：先保兵力，再支援主攻方向，然后练兵、内政
      const frontier = hostile.length > 0;
      const keepHome = Math.max(frontier ? 4000 : 1500, threat * 0.7);
      let recruited = false, trained = false, moved = false;
      for (const g of idle.slice().sort((x, y) => y.lea - x.lea)) {
        if (g.acted) continue;
        const ok = cmd => R.canDo(s, g.id, cmd).ok;
        const rich = c.gold > 500 && R.foodSeasons(c) > 8;
        if (!recruited && g.lea >= 50 && ok('recruit') && (c.troops < Math.max(frontier ? 9000 : 4000, threat * 0.9) || rich)) {
          use(g, 'recruit'); recruited = true; continue;
        }
        if (!moved && camp && c.id !== camp.stage && R.ADJ[c.id].includes(camp.stage) && c.troops - keepHome > 2000) {
          use(g, 'move', { target: camp.stage, troops: Math.floor(c.troops - keepHome) }); moved = true; continue;
        }
        if (!moved && !frontier && c.troops > 4000) {
          const fronts = neigh.filter(n => n.owner === f && R.ADJ[n.id].some(id => R.isHostile(s, f, s.cities[id])));
          if (fronts.length) {
            const to = fronts.find(n => camp && n.id === camp.stage) || fronts.sort((x, y) => x.troops - y.troops)[0];
            use(g, 'move', { target: to.id, troops: Math.floor(c.troops * 0.7) }); moved = true; continue;
          }
        }
        if (!trained && frontier && g.lea >= 60 && c.troops >= 3000 && c.train < 85 && ok('train')) {
          use(g, 'train'); trained = true; continue;
        }
        if (!moved && R.officersIn(s, c.id, f).length >= 3) {
          const empty = neigh.find(n => n.owner === f && !R.officersIn(s, n.id, f).length);
          if (empty) { use(g, 'move', { target: empty.id, troops: Math.floor(c.troops * 0.2) }); moved = true; continue; }
        }
        if (R.hiddenIn(s, c.id).length && R.rand(s) < 0.25) { use(g, 'search'); continue; }
        const wantFarm = R.foodSeasons(c) < 6 || c.farm < c.commerce;
        const dev = wantFarm && ok('farm') ? 'farm' : ok('commerce') ? 'commerce' : ok('farm') ? 'farm' : null;
        if (dev) { use(g, dev); continue; }
        if (ok('train')) use(g, 'train');
      }
    }
  }

  // 军师进言：按轻重缓急挑三条。act 是“依计而行”时界面要做的事（只是提示，规则不看它）
  function advise(s) {
    const f = s.player;
    const mine = R.citiesOf(s, f);
    const officers = R.generalsOf(s, f);
    const ruler = s.factions[f].ruler;
    const advisor = officers.filter(g => g.id !== ruler).sort((a, b) => b.int - a.int)[0] || officers[0];
    const tips = [];

    for (const c of mine) {
      const n = R.foodSeasons(c);
      if (n < 3) tips.push({ pri: 9, city: c.id, act: { kind: 'farm' }, text: `${c.name}存粮只够 ${n} 季，宜速开发农业，或调兵往他城就食。` });
    }
    for (const c of mine) {
      for (const id of R.ADJ[c.id]) {
        const n = s.cities[id];
        if (n.owner && n.owner !== f && !R.isAllied(s, f, n.owner) && n.troops > c.troops * 1.4 && n.troops > 6000) {
          tips.push({ pri: 8, city: c.id, act: { kind: 'recruit' }, text: `${s.factions[n.owner].name}屯兵 ${R.fmt(n.troops)} 于${n.name}，${c.name}仅 ${R.fmt(c.troops)}，宜征兵固守。` });
          break;
        }
      }
    }
    for (const c of mine) {
      const idle = R.idleIn(s, c.id, f);
      if (!idle.length || c.troops < 5000) continue;
      const leader = R.best(idle, 'lea');
      for (const id of R.ADJ[c.id]) {
        const n = s.cities[id];
        if (!R.isHostile(s, f, n)) continue;
        if (R.estimate(s, c.id, n.id, Math.floor(c.troops * 0.8), leader) >= 1.6) {
          tips.push({ pri: 7, city: c.id, act: { kind: 'attack', gen: leader.id, target: n.id }, text: `${n.name}守军仅 ${R.fmt(n.troops)}，${c.name}兵精粮足，可令${leader.name}取之。` });
          break;
        }
      }
    }
    for (const c of mine) {
      for (const t of R.recruitableIn(s, c.id)) {
        if (!t.wolong) tips.push({ pri: 6, city: c.id, act: { kind: 'employ', target: t.id }, text: `${c.name}有${t.captive ? '俘将' : '贤士'}${t.name}，可遣人登用。` });
      }
    }
    const zg = s.generals.zhugeliang;
    if (ruler === 'liubei' && zg.alive && !zg.faction) {
      const xy = s.cities.xiangyang;
      tips.push(xy.owner === f
        ? { pri: 9, city: 'xiangyang', text: `卧龙诸葛亮隐居襄阳隆中，主公当亲往拜访，以示诚意（已拜访 ${s.flags.visits} 次）。` }
        : { pri: 4, city: null, text: '闻襄阳隆中有卧龙，得之可安天下。若取襄阳，主公当亲往拜访。' });
    }
    const ranked = Object.values(s.factions).filter(x => x.alive)
      .map(x => ({ id: x.id, n: R.citiesOf(s, x.id).length })).sort((a, b) => b.n - a.n);
    if (ranked[0] && ranked[0].id !== f && ranked[0].n >= 7) {
      const partner = ranked.find(x => x.id !== f && x.id !== ranked[0].id && !R.isAllied(s, f, x.id));
      if (partner) tips.push({ pri: 5, city: null, act: { kind: 'ally', target: partner.id }, text: `${s.factions[ranked[0].id].name}已据 ${ranked[0].n} 城，可遣使联合${s.factions[partner.id].name}，共御强敌。` });
    }
    const idleCount = officers.filter(g => !g.acted).length;
    if (idleCount) tips.push({ pri: 1, city: null, text: `尚有 ${idleCount} 位将军待命，可分派内政、练兵。` });

    tips.sort((a, b) => b.pri - a.pri);
    return { advisor, tips: tips.slice(0, 3) };
  }

  ZL.AI = { run, advise };
})(ZL);
module.exports = ZL;
