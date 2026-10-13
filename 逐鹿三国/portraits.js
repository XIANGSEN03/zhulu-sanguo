// 武将立绘。有画好的立绘（立绘/ 文件夹，列在 PAINTED 里）就用图片；
// 没有的（新武将、无名守将）用 SVG 现画一幅仿明清绣像的版画像代替。
// 用法：ZL.portrait(general, 'bust') 半身像（4:5）；'head' 头像（1:1）；'full' 整张卡（详情页大图，没有图片时退回半身像）。
// SVG 版每人的长相写在 LOOKS 里；背景晕染用外层元素的 --fc（当前势力色），武将换了阵营底色会跟着变。
(function (ZL) {
  const INK = '#2B231A';
  const SKIN = { fair: '#F0D6B4', light: '#E8C59E', mid: '#DDB084', tan: '#C9976A', ruddy: '#B9583F', dark: '#A27250' };
  const HAIR = { black: '#201A14', grey: '#8F887D', white: '#E6E1D6', purple: '#4B3046', brown: '#4A3322' };
  const METAL = { iron: '#6D7378', bronze: '#9E7B45', silver: '#C9CDCF', gold: '#C9A04A', black: '#3A3833' };

  // 长相表。字段：
  // face 脸型 oval/square/round/long/wide · skin 肤色 · brow 眉 thin/sword/silkworm/bushy/knit · eye 眼 calm/sharp/phoenix/round/narrow
  // beard 胡须 none/mustache/goatee/three/short/long/bristly · hair 发色（也是眉色、须色，可用 beardC 单独指定须色）
  // hat 冠帽 crown/guan/scarf/lunjin/helmet/headband/bun · hatC 冠帽颜色 · plume 盔缨颜色 · gold 冠上有金饰
  // body 衣甲 robe/armor · bodyC 主色 · trim 领缘/护项颜色 · weapon 兵器 spear/snake/glaive/halberd/axe/sword/bow/fan
  // extra 其他：eyepatch 独眼 · scars 伤疤 · wrinkles 皱纹 · ears 大耳 · feathers 插羽 · lion 狮盔 · eyeC 瞳色 · smile 笑意
  const LOOKS = {
    // 曹魏
    caocao:     { face: 'square', skin: 'light', brow: 'sword', eye: 'sharp', beard: 'short', hat: 'crown', hatC: '#1E1A16', gold: 1, body: 'robe', bodyC: '#6E2A24', trim: '#1E1A16', weapon: 'sword' },
    xunyu:      { face: 'oval', skin: 'fair', brow: 'thin', eye: 'calm', beard: 'three', hat: 'crown', hatC: '#1E1A16', body: 'robe', bodyC: '#2E4868', trim: '#E9E1CF', smile: 1 },
    guojia:     { face: 'long', skin: 'fair', brow: 'thin', eye: 'narrow', beard: 'goatee', hat: 'scarf', hatC: '#55707C', body: 'robe', bodyC: '#5E7F8C', trim: '#E9E1CF', smile: 1 },
    xunyou:     { face: 'long', skin: 'light', brow: 'knit', eye: 'calm', beard: 'three', hat: 'crown', hatC: '#1E1A16', body: 'robe', bodyC: '#4B5B49', trim: '#E9E1CF' },
    xuchu:      { face: 'wide', skin: 'tan', brow: 'bushy', eye: 'round', beard: 'bristly', hat: 'headband', hatC: '#9C3A2A', body: 'armor', bodyC: '#4A4239', trim: '#9C3A2A', weapon: 'glaive' },
    xiahoudun:  { face: 'square', skin: 'mid', brow: 'sword', eye: 'sharp', beard: 'short', hat: 'helmet', hatC: 'iron', plume: '#B23A2A', body: 'armor', bodyC: '#2F4058', trim: '#B23A2A', weapon: 'spear', extra: ['eyepatch'] },
    zhangliao:  { face: 'oval', skin: 'light', brow: 'sword', eye: 'sharp', beard: 'goatee', hat: 'helmet', hatC: 'bronze', plume: '#B23A2A', body: 'armor', bodyC: '#3B4D66', trim: '#4A78A8', weapon: 'halberd' },
    xiahouyuan: { face: 'square', skin: 'tan', brow: 'sword', eye: 'sharp', beard: 'short', hat: 'helmet', hatC: 'iron', plume: '#2E4868', body: 'armor', bodyC: '#3E4A55', trim: '#B23A2A', weapon: 'bow' },
    xuhuang:    { face: 'square', skin: 'mid', brow: 'bushy', eye: 'sharp', beard: 'short', hat: 'helmet', hatC: 'iron', plume: '#B23A2A', body: 'armor', bodyC: '#4F4A42', trim: '#2E4868', weapon: 'axe' },
    caoren:     { face: 'square', skin: 'mid', brow: 'sword', eye: 'calm', beard: 'short', hat: 'helmet', hatC: 'bronze', plume: '#2E4868', body: 'armor', bodyC: '#2F4058', trim: '#B23A2A', weapon: 'spear' },
    yujin:      { face: 'oval', skin: 'light', brow: 'knit', eye: 'calm', beard: 'goatee', hat: 'helmet', hatC: 'iron', plume: '#2E4868', body: 'armor', bodyC: '#4B5560', trim: '#4A78A8', weapon: 'spear' },
    // 袁绍
    yuanshao:   { face: 'oval', skin: 'fair', brow: 'thin', eye: 'calm', beard: 'three', hat: 'crown', hatC: '#1E1A16', gold: 1, body: 'robe', bodyC: '#8A6527', trim: '#1E1A16', weapon: 'sword' },
    yanliang:   { face: 'wide', skin: 'dark', brow: 'bushy', eye: 'round', beard: 'bristly', hat: 'helmet', hatC: 'iron', plume: '#B23A2A', body: 'armor', bodyC: '#3A3530', trim: '#C29330', weapon: 'glaive' },
    tianfeng:   { face: 'long', skin: 'light', brow: 'knit', eye: 'calm', beard: 'three', hair: 'grey', hat: 'crown', hatC: '#1E1A16', body: 'robe', bodyC: '#3C3A33', trim: '#C9B88E', extra: ['wrinkles'] },
    shenpei:    { face: 'square', skin: 'mid', brow: 'sword', eye: 'sharp', beard: 'short', hat: 'crown', hatC: '#1E1A16', body: 'robe', bodyC: '#5C3426', trim: '#C9B88E' },
    wenchou:    { face: 'round', skin: 'dark', brow: 'bushy', eye: 'round', beard: 'bristly', hat: 'helmet', hatC: 'bronze', plume: '#201A14', body: 'armor', bodyC: '#4A3B2A', trim: '#C29330', weapon: 'spear' },
    jushou:     { face: 'oval', skin: 'light', brow: 'knit', eye: 'calm', beard: 'three', hat: 'crown', hatC: '#1E1A16', body: 'robe', bodyC: '#2F4F4C', trim: '#E9E1CF' },
    zhanghe:    { face: 'oval', skin: 'light', brow: 'sword', eye: 'sharp', beard: 'goatee', hat: 'helmet', hatC: 'silver', plume: '#B23A2A', body: 'armor', bodyC: '#5A4A2E', trim: '#C29330', weapon: 'spear' },
    gaogan:     { face: 'square', skin: 'mid', brow: 'sword', eye: 'calm', beard: 'short', hat: 'helmet', hatC: 'iron', plume: '#C29330', body: 'armor', bodyC: '#544632', trim: '#7A2E26', weapon: 'sword' },
    gaolan:     { face: 'square', skin: 'tan', brow: 'bushy', eye: 'sharp', beard: 'short', hat: 'helmet', hatC: 'bronze', plume: '#B23A2A', body: 'armor', bodyC: '#4A4036', trim: '#C29330', weapon: 'spear' },
    yuanshang:  { face: 'oval', skin: 'fair', brow: 'thin', eye: 'calm', beard: 'none', hat: 'guan', hatC: '#C9A04A', body: 'armor', bodyC: '#8A6527', trim: '#E9E1CF', weapon: 'sword' },
    yuantan:    { face: 'oval', skin: 'light', brow: 'sword', eye: 'sharp', beard: 'mustache', hat: 'helmet', hatC: 'gold', plume: '#B23A2A', body: 'armor', bodyC: '#6E5428', trim: '#7A2E26', weapon: 'sword' },
    // 刘备
    liubei:     { face: 'oval', skin: 'fair', brow: 'thin', eye: 'calm', beard: 'three', hat: 'crown', hatC: '#1E1A16', gold: 1, body: 'robe', bodyC: '#3D6A4C', trim: '#D9C27E', weapon: 'sword', extra: ['ears'], smile: 1 },
    guanyu:     { face: 'long', skin: 'ruddy', brow: 'silkworm', eye: 'phoenix', beard: 'long', hat: 'scarf', hatC: '#2F6B45', body: 'armor', bodyC: '#2F6B45', trim: '#D9C27E', weapon: 'glaive' },
    mizhu:      { face: 'round', skin: 'fair', brow: 'thin', eye: 'narrow', beard: 'goatee', hat: 'crown', hatC: '#1E1A16', body: 'robe', bodyC: '#7A5A2A', trim: '#E9E1CF', smile: 1 },
    zhangfei:   { face: 'wide', skin: 'dark', brow: 'bushy', eye: 'round', beard: 'bristly', hat: 'helmet', hatC: 'black', plume: '#B23A2A', body: 'armor', bodyC: '#2A2A28', trim: '#4C9361', weapon: 'snake' },
    sunqian:    { face: 'oval', skin: 'light', brow: 'thin', eye: 'calm', beard: 'three', hat: 'crown', hatC: '#1E1A16', body: 'robe', bodyC: '#4E6070', trim: '#E9E1CF' },
    jianyong:   { face: 'round', skin: 'mid', brow: 'thin', eye: 'narrow', beard: 'goatee', hat: 'scarf', hatC: '#7A5A3A', body: 'robe', bodyC: '#9A7A48', trim: '#E9E1CF', smile: 1 },
    // 孙吴
    sunce:      { face: 'oval', skin: 'light', brow: 'sword', eye: 'sharp', beard: 'none', hat: 'helmet', hatC: 'gold', plume: '#B23A2A', body: 'armor', bodyC: '#8C2F22', trim: '#D9C27E', weapon: 'spear', smile: 1 },
    sunquan:    { face: 'square', skin: 'light', brow: 'sword', eye: 'calm', beard: 'short', hair: 'purple', hat: 'crown', hatC: '#1E1A16', gold: 1, body: 'robe', bodyC: '#8C2F22', trim: '#D9C27E', extra: ['eyeC'] },
    zhangzhao:  { face: 'long', skin: 'light', brow: 'knit', eye: 'calm', beard: 'three', hair: 'white', hat: 'crown', hatC: '#1E1A16', body: 'robe', bodyC: '#3E3A42', trim: '#E9E1CF', extra: ['wrinkles'] },
    zhouyu:     { face: 'oval', skin: 'fair', brow: 'sword', eye: 'calm', beard: 'none', hat: 'guan', hatC: '#C9A04A', body: 'robe', bodyC: '#A33B2B', trim: '#EDE6D6', weapon: 'sword', smile: 1 },
    handang:    { face: 'square', skin: 'tan', brow: 'sword', eye: 'sharp', beard: 'short', hat: 'helmet', hatC: 'iron', plume: '#B23A2A', body: 'armor', bodyC: '#5A3A2E', trim: '#C04E37', weapon: 'bow' },
    chengpu:    { face: 'long', skin: 'mid', brow: 'knit', eye: 'calm', beard: 'three', hair: 'grey', hat: 'helmet', hatC: 'iron', plume: '#B23A2A', body: 'armor', bodyC: '#4A3A34', trim: '#C04E37', weapon: 'snake', extra: ['wrinkles'] },
    zhoutai:    { face: 'square', skin: 'tan', brow: 'bushy', eye: 'sharp', beard: 'short', hat: 'headband', hatC: '#B23A2A', body: 'armor', bodyC: '#3A3330', trim: '#C04E37', weapon: 'sword', extra: ['scars'] },
    huanggai:   { face: 'square', skin: 'mid', brow: 'bushy', eye: 'calm', beard: 'short', hair: 'grey', hat: 'helmet', hatC: 'bronze', plume: '#B23A2A', body: 'armor', bodyC: '#5A4430', trim: '#C04E37', weapon: 'sword', extra: ['wrinkles'] },
    taishici:   { face: 'oval', skin: 'light', brow: 'sword', eye: 'sharp', beard: 'mustache', hat: 'helmet', hatC: 'iron', plume: '#B23A2A', body: 'armor', bodyC: '#6A3328', trim: '#D9C27E', weapon: 'halberd' },
    // 在野
    zhaoyun:    { face: 'oval', skin: 'fair', brow: 'sword', eye: 'calm', beard: 'none', hat: 'helmet', hatC: 'silver', plume: '#EDE6D6', body: 'armor', bodyC: '#C7C6BE', trim: '#EDE6D6', weapon: 'spear' },
    zhugeliang: { face: 'long', skin: 'fair', brow: 'thin', eye: 'calm', beard: 'three', hat: 'lunjin', hatC: '#262B33', body: 'robe', bodyC: '#ECE5D4', trim: '#262B33', weapon: 'fan', smile: 1 },
    xushu:      { face: 'oval', skin: 'light', brow: 'sword', eye: 'calm', beard: 'goatee', hat: 'scarf', hatC: '#2C3A4E', body: 'robe', bodyC: '#33465E', trim: '#E9E1CF', weapon: 'sword' },
    pangtong:   { face: 'wide', skin: 'dark', brow: 'bushy', eye: 'narrow', beard: 'short', hat: 'scarf', hatC: '#262320', body: 'robe', bodyC: '#5E4A34', trim: '#E9E1CF', smile: 1 },
    huangzhong: { face: 'long', skin: 'mid', brow: 'knit', eye: 'sharp', beard: 'long', hair: 'white', hat: 'helmet', hatC: 'bronze', plume: '#B23A2A', body: 'armor', bodyC: '#8A6A2A', trim: '#B23A2A', weapon: 'bow', extra: ['wrinkles'] },
    weiyan:     { face: 'square', skin: 'ruddy', brow: 'bushy', eye: 'sharp', beard: 'short', hat: 'helmet', hatC: 'iron', plume: '#201A14', body: 'armor', bodyC: '#3A3330', trim: '#B23A2A', weapon: 'glaive' },
    ganning:    { face: 'square', skin: 'tan', brow: 'sword', eye: 'sharp', beard: 'mustache', hat: 'headband', hatC: '#B23A2A', body: 'armor', bodyC: '#5E4430', trim: '#D9C27E', weapon: 'sword', extra: ['feathers'] },
    machao:     { face: 'oval', skin: 'fair', brow: 'sword', eye: 'sharp', beard: 'none', hat: 'helmet', hatC: 'silver', plume: '#EDE6D6', body: 'armor', bodyC: '#D3D0C6', trim: '#B23A2A', weapon: 'spear', extra: ['lion'] },
    lusu:       { face: 'round', skin: 'light', brow: 'thin', eye: 'calm', beard: 'short', hat: 'crown', hatC: '#1E1A16', body: 'robe', bodyC: '#2F5450', trim: '#E9E1CF', smile: 1 },
  };
  // 没有名字的守将（守城校尉、某某部将）
  const SOLDIER = { face: 'square', skin: 'mid', brow: 'sword', eye: 'sharp', beard: 'short', hat: 'helmet', hatC: 'iron', plume: '#7A6E5C', body: 'armor', bodyC: '#5A564E', trim: '#7A6E5C', weapon: 'spear' };

  // 新加的武将没写长相时，按能力值配一副：武将披甲、文官着袍
  function guess(g) {
    let h = 0;
    for (const ch of String(g.id || g.name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const pick = arr => arr[(h = (h * 1103515245 + 12345) >>> 0) % arr.length];
    const war = (g.str || 50) + (g.lea || 50) > (g.int || 50) + (g.pol || 50);
    return war
      ? { face: pick(['square', 'oval', 'wide']), skin: pick(['mid', 'tan', 'light']), brow: pick(['sword', 'bushy']), eye: pick(['sharp', 'calm', 'round']),
          beard: pick(['short', 'goatee', 'mustache', 'bristly']), hat: 'helmet', hatC: pick(['iron', 'bronze']), plume: '#B23A2A',
          body: 'armor', bodyC: pick(['#4A4239', '#3E4A55', '#5A3A2E']), trim: '#B23A2A', weapon: pick(['spear', 'glaive', 'sword']) }
      : { face: pick(['oval', 'long']), skin: pick(['fair', 'light']), brow: pick(['thin', 'knit']), eye: pick(['calm', 'narrow']),
          beard: pick(['three', 'goatee', 'short']), hat: pick(['crown', 'scarf']), hatC: '#1E1A16',
          body: 'robe', bodyC: pick(['#2E4868', '#4B5B49', '#5C3426']), trim: '#E9E1CF' };
  }

  // ---------- 小工具 ----------
  const f1 = n => Math.round(n * 10) / 10;
  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k))));
    return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
  }
  // 以 x=60 为中轴左右对称地画：fn(d) 里 d 为 -1（画面左）或 1（画面右）
  const both = fn => fn(-1) + fn(1);
  const P = (d, fill, extra = '') => `<path d="${d}" fill="${fill}"${extra}/>`;

  // 脸型：W 颧宽（半边）、J 下颌宽、C 下巴位置
  const FACE = {
    oval: { W: 16.5, J: 9.5, C: 89 }, square: { W: 17.5, J: 13, C: 89 }, round: { W: 18.5, J: 12, C: 87 },
    long: { W: 16, J: 9.5, C: 92 }, wide: { W: 19.5, J: 14.5, C: 89 },
  };
  const TOP = 41;

  // ---------- 各部件 ----------
  function weaponBack(w, L) {
    const shaft = (x1, y1, x2, y2, c = '#5B4128') => `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${INK}" stroke-width="5.2" fill="none"/><path d="M${x1} ${y1}L${x2} ${y2}" stroke="${c}" stroke-width="3" fill="none"/>`;
    const blade = '#D5D8D6';
    const tassel = (x, y) => P(`M${x - 3} ${y}C${x - 7} ${y + 6} ${x - 6} ${y + 12} ${x - 9} ${y + 16}C${x - 3} ${y + 13} ${x} ${y + 9} ${x + 3} ${y + 1}Z`, '#B23A2A');
    switch (w) {
      case 'spear':
        return shaft(96, 152, 104, 22) + P('M104 4C108 11 108.5 17 106.5 22L101.5 21.5C100.5 16 101 10 104 4Z', blade) + tassel(104, 23);
      case 'snake':
        return shaft(96, 152, 104, 24) + P('M106 2C102 6 108 9 104 13C100 17 107 19 106.5 24L101.5 23.5C101 19 97.5 16 101.5 12C105 8.5 99.5 6 106 2Z', blade) + tassel(104, 25);
      case 'glaive':
        return shaft(94, 152, 102, 34) + P('M101 36C98 24 101 12 110 4C109 12 114 20 112 30C110.5 35 106 38 101 36Z', blade)
          + P('M103.5 30C105 24 107 18 109.5 13', 'none', ` stroke="${INK}" stroke-width="0.8" opacity="0.6"`) + tassel(101, 37);
      case 'halberd':
        return shaft(96, 152, 104, 20) + P('M104 2C107.5 9 108 15 106.5 20L101.5 19.5C100.5 14 101 8 104 2Z', blade)
          + P('M106.5 24C113 18 117 22 117 30C114 27 110 27 106.8 30Z', blade) + P('M101 24C95 19 91 23 91.5 30C94 27 98 27 101 30Z', blade) + tassel(103.5, 31);
      case 'axe':
        return shaft(95, 152, 102, 14) + P('M103 18C112 14 118 22 117 36C115 44 110 45 104 40Z', blade)
          + P('M101 16L104 6L106 16Z', blade);
      case 'sword':
        return `<path d="M30 122L15 60" stroke="${INK}" stroke-width="6" fill="none"/><path d="M30 122L15 60" stroke="#3A2A1E" stroke-width="3.6" fill="none"/>`
          + P('M11.5 75.5L23 72.5L23.8 75.6L12.3 78.6Z', '#C9A04A') + `<path d="M16.6 74L13.6 61.5" stroke="${INK}" stroke-width="3.6" fill="none"/>`
          + `<circle cx="13.2" cy="59.6" r="2.4" fill="#C9A04A"/><path d="M13 60C8 64 7 70 9 76" fill="none" stroke="#B23A2A" stroke-width="1.6"/>`;
      case 'bow':
        return `<path d="M24 32C4 60 4 96 22 128" fill="none" stroke="${INK}" stroke-width="5"/><path d="M24 32C4 60 4 96 22 128" fill="none" stroke="#7A4A2A" stroke-width="2.8"/>`
          + `<path d="M24 32L22 128" stroke="${INK}" stroke-width="0.7" opacity="0.8"/>`;
    }
    return '';
  }

  function bodyPart(L) {
    const c = L.bodyC, edge = shade(c, -0.28), trim = L.trim;
    const outline = 'M2 152C4 122 22 106 46 101L74 101C98 106 116 122 118 152Z';
    if (L.body === 'robe') {
      return P(outline, c)
        + P('M50 101L60 118L70 101Z', '#F1EADB')
        + P('M48 101L54 101L62.5 116L59.5 121Z', trim)
        + P('M66 101L73 101L43 152L34 152Z', trim)
        + `<path d="M22 122C26 134 26 144 25 152M98 122C94 134 94 144 95 152" fill="none" stroke="${edge}" stroke-width="1.2"/>`;
    }
    // 铠甲：披风、身甲、甲片、护心镜、披膊、护项
    let scales = '';
    for (let r = 0; r < 6; r++) {
      const y = 114 + r * 6.5, off = r % 2 ? 3 : 0;
      for (let x = 36 + off; x <= 82; x += 6) scales += `M${x} ${y}q3 4.5 6 0`;
    }
    const pauldron = d => {
      const x = v => f1(60 + d * v);
      return P(`M${x(14)} 104C${x(28)} 100 ${x(42)} 106 ${x(48)} 118C${x(46)} 126 ${x(44)} 132 ${x(42)} 136C${x(34)} 134 ${x(28)} 128 ${x(24)} 120C${x(20)} 114 ${x(16)} 108 ${x(14)} 104Z`, c)
        + `<path d="M${x(20)} 110C${x(30)} 108 ${x(40)} 112 ${x(45)} 121M${x(24)} 118C${x(32)} 117 ${x(40)} 121 ${x(44)} 129" fill="none" stroke="${edge}" stroke-width="1.3"/>`;
    };
    return P('M0 152C0 124 16 108 40 103L80 103C104 108 120 124 120 152Z', trim)
      + P('M10 152C12 126 26 110 46 104L74 104C94 110 108 126 110 152Z', c)
      + `<path d="${scales}" fill="none" stroke="${edge}" stroke-width="1.1"/>`
      + `<circle cx="60" cy="126" r="7.5" fill="${METAL.silver}"/><circle cx="60" cy="126" r="4.2" fill="none" stroke="${INK}" stroke-width="0.8" opacity="0.6"/>`
      + both(pauldron)
      + P('M47 99C52 104 68 104 73 99L75 106C68 112 52 112 45 106Z', trim);
  }

  function hairBack(L, F, hair) {
    const { W } = F;
    return P(`M${60 - W - 2.5} 72C${60 - W - 5} 44 ${60 - W + 2} 28 60 28C${60 + W - 2} 28 ${60 + W + 5} 44 ${60 + W + 2.5} 72Z`, hair);
  }

  function faceShape(F) {
    const { W, J, C } = F;
    return `M${60 - W} 58C${60 - W} 42 ${f1(60 - W * 0.6)} ${TOP - 3} 60 ${TOP - 3}C${f1(60 + W * 0.6)} ${TOP - 3} ${60 + W} 42 ${60 + W} 58`
      + `C${60 + W} 70 ${60 + J + 3} ${C - 10} ${60 + J} ${C - 5}Q${f1(60 + J * 0.4)} ${C + 0.5} 60 ${C}Q${f1(60 - J * 0.4)} ${C + 0.5} ${60 - J} ${C - 5}`
      + `C${60 - J - 3} ${C - 10} ${60 - W} 70 ${60 - W} 58Z`;
  }

  function ears(L, F, skin) {
    const big = (L.extra || []).includes('ears');
    return both(d => `<ellipse cx="${f1(60 + d * (F.W - 0.2))}" cy="${big ? 69 : 65}" rx="3.4" ry="${big ? 9 : 6}" fill="${skin}"/>`);
  }

  function eyes(L, eyeC) {
    const T = { calm: [4.3, 2.6, 0.5, 1.6], sharp: [4.6, 2.2, 1.4, 1.5], phoenix: [5.2, 1.5, 2.8, 1.25], round: [4.4, 3.8, 0, 2.1], narrow: [4.3, 1.1, 0.4, 1.1] }[L.eye] || [4.3, 2.6, 0.5, 1.6];
    const [w, h, lift, pr] = T;
    const ey = 64;
    const patch = (L.extra || []).includes('eyepatch');
    return both(d => {
      const ex = 60 + d * 7.6, inX = f1(ex - d * w), outX = f1(ex + d * w);
      if (patch && d === 1) {
        return `<ellipse cx="${ex}" cy="${ey}" rx="5.6" ry="4.6" fill="#1E1A16"/><path d="M${ex - 4} ${ey - 2}L${60 - 14} 48M${ex + 4} ${ey - 2}L${60 + 18} 56" stroke="#1E1A16" stroke-width="1.3" fill="none"/>`;
      }
      const almond = `M${inX} ${ey}Q${ex} ${f1(ey - h * 1.3)} ${outX} ${f1(ey - lift)}Q${ex} ${f1(ey + h * 0.8)} ${inX} ${ey}Z`;
      return P(almond, '#F6F0E2', ` stroke="none"`)
        + `<circle cx="${f1(ex + d * 0.3)}" cy="${f1(ey - lift * 0.3)}" r="${pr}" fill="${eyeC}" stroke="none"/>`
        + `<path d="M${inX} ${ey}Q${ex} ${f1(ey - h * 1.3)} ${outX} ${f1(ey - lift)}" fill="none" stroke="${INK}" stroke-width="1.5"/>`
        + (L.eye === 'round' ? `<path d="M${inX} ${ey}Q${ex} ${f1(ey + h * 0.8)} ${outX} ${f1(ey - lift)}" fill="none" stroke="${INK}" stroke-width="0.9"/>` : '')
        + (L.eye === 'phoenix' ? `<path d="M${outX} ${f1(ey - lift)}l${d * 2} -1" stroke="${INK}" stroke-width="1.1" fill="none"/>` : '');
    });
  }

  function brows(L, hair) {
    // t 粗细 · a 弓起 · s 眉梢高低（负数上扬）· io 眉头高低（正数压低，显得凶）
    const T = { thin: [1.5, 1.6, 0.6, 0], sword: [2.6, 1, -3.2, 0.4], silkworm: [3.6, 3.2, 0.8, 0.6], bushy: [4, 0.3, -3, 1.8], knit: [2.1, 1.2, 1.6, -1.6] }[L.brow] || [1.5, 1.6, 0.6, 0];
    const [t, a, s, io] = T, by = 57;
    return both(d => {
      const x = v => f1(60 + d * v);
      return P(`M${x(3.4)} ${f1(by + io - t / 2)}Q${x(9)} ${f1(by - a - t / 2)} ${x(15)} ${f1(by + s)}Q${x(9)} ${f1(by - a + t / 2)} ${x(3.4)} ${f1(by + io + t / 2)}Z`, hair, ' stroke="none"');
    });
  }

  function noseMouth(L, skin) {
    const curve = L.smile ? 1.4 : L.brow === 'bushy' || L.brow === 'knit' ? -0.6 : 0.3;
    return `<path d="M59.2 64.5C58.6 68 57 70.6 57.7 71.7Q60 73.1 62.4 71.7" fill="none" stroke="${shade(skin, -0.45)}" stroke-width="1.15"/>`
      + `<path d="M55.4 79.6Q60 ${f1(79.6 + curve)} 64.6 79.6" fill="none" stroke="#7E3A2A" stroke-width="1.35"/>`
      + `<path d="M57.6 81.7Q60 82.5 62.4 81.7" fill="none" stroke="${shade(skin, -0.3)}" stroke-width="0.8"/>`;
  }

  function cheeks(L, F, skin) {
    let out = '';
    if (['fair', 'light'].includes(L.skin)) out += both(d => `<ellipse cx="${f1(60 + d * 10.5)}" cy="73" rx="4" ry="2.6" fill="#E08A72" opacity="0.22" stroke="none"/>`);
    const ex = L.extra || [];
    if (ex.includes('wrinkles')) {
      out += `<path d="M54.5 48.5Q60 47 65.5 48.5M55.5 51.5Q60 50.4 64.5 51.5" fill="none" stroke="${shade(skin, -0.35)}" stroke-width="0.7"/>`
        + both(d => `<path d="M${f1(60 + d * 6)} 71.5Q${f1(60 + d * 8.6)} 76 ${f1(60 + d * 7.4)} 80.5M${f1(60 + d * 12.5)} 64.5l${d * 2.6} 1.2M${f1(60 + d * 12.3)} 66.6l${d * 2.4} 1.8" fill="none" stroke="${shade(skin, -0.32)}" stroke-width="0.7"/>`);
    }
    if (ex.includes('scars')) out += `<path d="M66 68L74 76M68.5 66.5L73.5 71.5M47 70L52 77" fill="none" stroke="#8A3A2C" stroke-width="0.9" opacity="0.8"/>`;
    return out;
  }

  function beard(L, F, c) {
    const { W, J, C } = F;
    const stache = both(d => P(`M60 76.4C${f1(60 + d * 3)} 75.8 ${f1(60 + d * 6.6)} 77 ${f1(60 + d * 8.6)} 81.6C${f1(60 + d * 5.4)} 79.6 ${f1(60 + d * 2.6)} 78.5 60 78.5Z`, c, ' stroke="none"'));
    const tuft = (len, w = 2.4) => P(`M${f1(60 - w)} 83C${f1(60 - w - 0.6)} ${f1(87 + len * 0.3)} ${f1(60 - 0.6)} ${f1(86 + len * 0.8)} 60 ${86 + len}C${f1(60 + 0.6)} ${f1(86 + len * 0.8)} ${f1(60 + w + 0.6)} ${f1(87 + len * 0.3)} ${f1(60 + w)} 83Q60 84.2 ${f1(60 - w)} 83Z`, c, ' stroke="none"');
    // 满腮短须：沿下颌外缘，嘴边留空
    const full = (drop, jag) => {
      const pts = [];
      const N = 14;
      for (let i = 0; i <= N; i++) {
        const t = i / N, ang = Math.PI * (1 - t);
        const rx = W + 0.8, ry = C + drop - 68;
        let x = 60 + Math.cos(ang) * rx * (0.62 + 0.38 * Math.abs(Math.cos(ang))), y = 68 + Math.sin(ang) * ry;
        if (jag && i % 2) { x += (x - 60) * 0.1; y += 3; }
        pts.push(`${f1(x)} ${f1(y)}`);
      }
      return P(`M${60 - W + 0.6} 66L${pts.join('L')}L${60 + W - 0.6} 66C${60 + W - 3} 72 ${60 + J} 77 64.8 82.6Q60 85 55.2 82.6C${60 - J} 77 ${60 - W + 3} 72 ${60 - W + 0.6} 66Z`, c, ' stroke="none"');
    };
    switch (L.beard) {
      case 'mustache': return stache;
      case 'goatee': return stache + tuft(9);
      case 'three': return stache + tuft(22, 2.2) + both(d => P(`M${f1(60 + d * (J + 0.5))} ${C - 6}C${f1(60 + d * (J + 1.5))} ${C + 2} ${f1(60 + d * (J - 1))} ${C + 8} ${f1(60 + d * (J - 2.5))} ${C + 13}C${f1(60 + d * (J - 2))} ${C + 6} ${f1(60 + d * (J - 2))} ${C} ${f1(60 + d * (J - 2))} ${C - 6}Z`, c, ' stroke="none"'));
      case 'short': return full(4, false) + stache;
      case 'bristly': return full(9, true) + both(d => P(`M60 76C${f1(60 + d * 4)} 75 ${f1(60 + d * 9)} 76 ${f1(60 + d * 13)} 79L${f1(60 + d * 9.5)} 80L${f1(60 + d * 11)} 82.5L${f1(60 + d * 6)} 80.5L60 79Z`, c, ' stroke="none"'));
      case 'long': {
        const strands = `<path d="M55 96C54 108 56 118 58 130M60 95C60 110 60 122 60 136M65 96C66 108 64 118 62 130" fill="none" stroke="${shade(c, 0.22)}" stroke-width="0.8"/>`;
        return full(5, false) + stache
          + P(`M${60 - J - 1} ${C - 4}C${60 - J - 3} ${C + 14} 54 120 60 140C66 120 ${60 + J + 3} ${C + 14} ${60 + J + 1} ${C - 4}Z`, c, ' stroke="none"') + strands;
      }
    }
    return '';
  }

  // 冠帽画在脸的上面；ribbons 是要画在头后面的飘带
  function hatBack(L) {
    if (L.hat === 'scarf' || L.hat === 'lunjin') {
      const c = L.hatC;
      return P('M66 34C78 36 90 44 98 58C92 56 86 52 80 50C86 58 90 66 92 76C84 68 76 56 70 46Z', shade(c, -0.15));
    }
    if (L.hat === 'headband') return P('M76 50C86 52 92 58 96 68C90 64 84 60 79 58Z', L.hatC);
    return '';
  }
  function hat(L, F, hair) {
    const { W } = F;
    const c = L.hatC, ex = L.extra || [];
    const bun = `<ellipse cx="60" cy="31" rx="7.5" ry="6.5" fill="${hair}"/>`;
    const cap = P(`M${60 - W - 0.5} 58C${60 - W - 1} 40 ${60 - W * 0.5} 33 60 33C${60 + W * 0.5} 33 ${60 + W + 1} 40 ${60 + W + 0.5} 58C${60 + W - 2} 50 ${60 + 8} 44 60 45C${60 - 8} 44 ${60 - W + 2} 50 ${60 - W - 0.5} 58Z`, hair);
    switch (L.hat) {
      case 'crown': {
        const pin = L.gold ? '#C9A04A' : '#B9B3A6';
        return cap + bun
          + P('M48 40L49.5 16C54 13.5 66 13.5 70.5 16L72 40C66 37 54 37 48 40Z', c)
          + `<path d="M55 37.5L55.5 16M60 37L60 14.6M65 37.5L64.5 16" fill="none" stroke="#4A433A" stroke-width="0.9"/>`
          + P(`M${60 - W + 1} 46C${60 - W + 1} 38 ${60 + W - 1} 38 ${60 + W - 1} 46C${60 + 6} 42 ${60 - 6} 42 ${60 - W + 1} 46Z`, c)
          + `<path d="M36 33L84 30" stroke="${INK}" stroke-width="3"/><path d="M36 33L84 30" stroke="${pin}" stroke-width="1.6"/>`
          + (L.gold ? `<circle cx="60" cy="25" r="3.2" fill="#C9A04A"/>` : '');
      }
      case 'guan':
        return cap + bun + P('M52 36L50.5 24C54 21 66 21 69.5 24L68 36Z', c)
          + `<path d="M53 30.5L67 30.5" stroke="${shade(c, -0.3)}" stroke-width="1"/><path d="M42 30L78 27.5" stroke="${INK}" stroke-width="2.6"/><path d="M42 30L78 27.5" stroke="#E9E1CF" stroke-width="1.2"/>`;
      case 'scarf':
        return cap + P(`M${60 - W - 1.5} 54C${60 - W - 3} 36 ${60 - W + 2} 22 60 21C${60 + W - 2} 22 ${60 + W + 3} 36 ${60 + W + 1.5} 54C${60 + W - 3} 48 ${60 + 8} 45 60 46C${60 - 8} 45 ${60 - W + 3} 48 ${60 - W - 1.5} 54Z`, c)
          + `<path d="M50 26C55 30 65 30 70 26" fill="none" stroke="${shade(c, -0.3)}" stroke-width="1"/>`
          + P('M60 21C57 15 62 11 66 14C68 16 65 20 62 22Z', shade(c, -0.12));
      case 'lunjin':
        return cap + P(`M${60 - W - 1.5} 54C${60 - W - 2} 38 ${60 - W} 24 ${60 - W + 3} 12L${60 + W - 3} 12C${60 + W} 24 ${60 + W + 2} 38 ${60 + W + 1.5} 54C${60 + W - 3} 48 ${60 + 8} 45 60 46C${60 - 8} 45 ${60 - W + 3} 48 ${60 - W - 1.5} 54Z`, c)
          + `<path d="M50 14L51 44M60 12L60 45M70 14L69 44M${60 - W + 1} 28L${60 + W - 1} 28" fill="none" stroke="#4A5260" stroke-width="0.9"/>`;
      case 'headband':
        return cap + bun + `<path d="M50 30L70 32" stroke="#C9A04A" stroke-width="1.6"/>`
          + P(`M${60 - W - 0.8} 52C${60 - W} 44 ${60 + W} 44 ${60 + W + 0.8} 52L${60 + W + 0.6} 56.5C${60 + W - 2} 50.5 ${60 - W + 2} 50.5 ${60 - W - 0.6} 56.5Z`, c)
          + (ex.includes('feathers') ? `<path d="M56 28C50 18 46 10 40 2M64 28C68 16 74 8 82 2" fill="none" stroke="${INK}" stroke-width="3.6"/><path d="M56 28C50 18 46 10 40 2M64 28C68 16 74 8 82 2" fill="none" stroke="#D8B85A" stroke-width="2"/>` : '');
      case 'helmet': {
        const m = METAL[c] || c, dark = shade(m, -0.3);
        const plume = L.plume || '#B23A2A';
        return P(`M58 20C52 10 60 2 70 6C64 8 63 14 66 20Z`, plume)
          + P(`M${60 - W - 3.5} 76C${60 - W - 5} 66 ${60 - W - 5} 56 ${60 - W - 4} 50C${60 - W - 4} 32 ${60 - 12} 22 60 22C${60 + 12} 22 ${60 + W + 4} 32 ${60 + W + 4} 50C${60 + W + 5} 56 ${60 + W + 5} 66 ${60 + W + 3.5} 76L${60 + W - 0.5} 74C${60 + W} 66 ${60 + W} 58 ${60 + W - 1} 54C${60 + 8} 48 ${60 - 8} 48 ${60 - W + 1} 54C${60 - W} 58 ${60 - W} 66 ${60 - W + 0.5} 74Z`, m)
          + P(`M${60 - W - 4} 47C${60 - 8} 41 ${60 + 8} 41 ${60 + W + 4} 47L${60 + W + 3} 52C${60 + 8} 46 ${60 - 8} 46 ${60 - W - 3} 52Z`, dark)
          + `<path d="M60 23L60 42" stroke="${dark}" stroke-width="2.2"/><path d="M56 22L60 15L64 22Z" fill="${m}"/>`
          + `<circle cx="60" cy="46.5" r="2" fill="#C9A04A"/>`
          + (ex.includes('lion') ? `<circle cx="60" cy="38" r="5.4" fill="#C9A04A"/><path d="M56.5 37.5l1.6 0M61.9 37.5l1.6 0M58 41Q60 42.4 62 41" stroke="${INK}" stroke-width="0.9" fill="none"/>` : '');
      }
      default:
        return cap + bun + `<path d="M50 30L70 32" stroke="#C9A04A" stroke-width="1.6"/>`;
    }
  }

  function fan() {
    let ribs = '';
    for (let i = -3; i <= 3; i++) ribs += `M86 140L${f1(86 + Math.sin(i * 0.26) * 22)} ${f1(140 - Math.cos(i * 0.26) * 26)}`;
    return P('M86 140C72 128 66 112 72 102C78 94 94 94 100 102C106 112 100 128 86 140Z', '#F2EDE2')
      + `<path d="${ribs}" fill="none" stroke="#9A9284" stroke-width="0.8"/>`
      + `<path d="M86 140L84 152" stroke="${INK}" stroke-width="4"/><path d="M86 140L84 152" stroke="#7A4A2A" stroke-width="2.2"/>`
      + P('M72 152C74 144 80 140 90 141C96 142 100 146 101 152Z', '#ECE5D4');
  }

  // ---------- 组装 ----------
  function draw(L) {
    const F = FACE[L.face] || FACE.oval;
    const skin = SKIN[L.skin] || SKIN.light;
    const hair = HAIR[L.hair] || HAIR.black;
    const beardC = HAIR[L.beardC] || hair;
    const eyeC = (L.extra || []).includes('eyeC') ? '#2F5B4C' : '#1E1A16';
    const head = (L.hat === 'helmet' ? '' : hairBack(L, F, hair)) + ears(L, F, skin)
      + P(faceShape(F), skin)
      + cheeks(L, F, skin) + brows(L, hair) + eyes(L, eyeC) + noseMouth(L, skin) + beard(L, F, beardC);
    return `<g fill="none" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round">`
      + weaponBack(L.weapon, L) + hatBack(L)
      + bodyPart(L)
      + P('M52 82L52 103Q60 108 68 103L68 82Z', shade(skin, -0.12))
      + head + hat(L, F, hair)
      + (L.weapon === 'fan' ? fan() : '')
      + '</g>';
  }

  // 立绘/ 里有图片的武将（由 tools/crop_art.py 从 立绘/原图/ 的单人立绘生成）
  const PAINTED = new Set([
    'caocao', 'xunyu', 'guojia', 'xunyou', 'xuchu', 'xiahoudun', 'zhangliao', 'xiahouyuan', 'xuhuang', 'caoren', 'yujin',
    'yuanshao', 'yanliang', 'tianfeng', 'shenpei', 'wenchou', 'jushou', 'zhanghe', 'gaogan', 'gaolan', 'yuanshang', 'yuantan',
    'liubei', 'guanyu', 'zhangfei', 'mizhu', 'sunqian', 'jianyong',
    'sunce', 'sunquan', 'zhangzhao', 'zhouyu', 'handang', 'chengpu', 'zhoutai', 'huanggai', 'taishici',
    'zhaoyun', 'zhugeliang', 'xushu', 'pangtong', 'huangzhong', 'weiyan', 'machao', 'ganning', 'lusu',
  ]);

  const cache = {};
  function lookOf(g) {
    if (!g || g.virtual || !g.id) return SOLDIER;
    return LOOKS[g.id] || guess(g);
  }
  // kind: 'bust' 半身像（4:5）· 'head' 头像（1:1）
  function portrait(g, kind = 'bust') {
    if (g && !g.virtual && PAINTED.has(g.id)) {
      return `<img class="portrait" src="立绘/${g.id}${kind === 'head' ? '-head' : kind === 'full' ? '-full' : ''}.jpg" alt="" draggable="false">`;
    }
    const key = (g && !g.virtual && g.id) || '_soldier';
    const art = cache[key] || (cache[key] = draw(lookOf(g)));
    const box = kind === 'head' ? '25 20 70 70' : '0 0 120 150';
    return `<svg class="portrait" viewBox="${box}" aria-hidden="true" focusable="false">`
      + `<rect x="-10" y="-10" width="140" height="170" fill="#E2D3AF"/>`
      + `<circle cx="60" cy="64" r="50" style="fill:var(--fc, #8A8476)" opacity="0.38"/>`
      + `<circle cx="60" cy="64" r="34" style="fill:var(--fc, #8A8476)" opacity="0.22"/>`
      + art + '</svg>';
  }

  ZL.LOOKS = LOOKS;
  ZL.portrait = portrait;
})(globalThis.ZL = globalThis.ZL || {});
