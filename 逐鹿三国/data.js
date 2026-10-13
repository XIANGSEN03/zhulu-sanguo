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
})(globalThis.ZL = globalThis.ZL || {});
