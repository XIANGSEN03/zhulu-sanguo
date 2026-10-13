// 把对局状态 S 和界面状态 ui 整理成 WXML 能直接显示的纯数据。
// 逻辑与网页版 ui.js 一一对应；所有数值仍由 engine.js（规则）计算。
const R = require('./engine');

const STAT = { lea: '统', str: '武', int: '智', pol: '政' };
const CMD_ORDER = ['commerce', 'farm', 'search', 'recruit', 'train', 'employ', 'attack', 'move', 'diplomacy'];
const DID = {
  commerce: '已开发商业', farm: '已开发农业', recruit: '已征兵', train: '已训练', attack: '已出征',
  move: '已调动', search: '已搜索', employ: '已登用', diplomacy: '已出使', joined: '新近归附',
};
const KIND = { battle: '战', ally: '盟', people: '人', civil: '政', event: '事' };
const fmt = R.fmt;
const seal = g => g.name.slice(-1); // 头像印章：名字最后一个字
const fid = f => f || 'none';
const fname = (S, f) => (f ? S.factions[f].name : '中立');
const fmark = (S, f) => (f ? S.factions[f].mark : '');
const pct = (v, max) => Math.round(Math.max(0, Math.min(1, v / max)) * 100);

// ---------- 开场 ----------
function title(saved) {
  const all = Object.keys(R.CITIES).length;
  const lords = Object.keys(R.FACTIONS).map(id => {
    const f = R.FACTIONS[id];
    const cities = Object.values(R.CITIES).filter(c => c.owner === id);
    return {
      id, mark: f.mark, name: f.name, level: f.level,
      tone: f.level === '易' ? 'good' : f.level === '中' ? 'warn' : 'bad',
      facts: `${cities.length} 城 · ${Object.values(R.GENERALS).filter(g => g.faction === id).length} 将 · 兵 ${fmt(cities.reduce((t, c) => t + c.troops, 0))}`,
      blurb: f.blurb,
    };
  });
  const resume = saved && !saved.over ? {
    owner: saved.player, mark: saved.factions[saved.player].mark, name: saved.factions[saved.player].name,
    info: `${R.dateLabel(saved)} · ${Object.values(saved.cities).filter(c => c.owner === saved.player).length} 城`,
  } : null;
  return { scenario: R.SCENARIO.name, intro: R.SCENARIO.intro, lords, resume, all, need: Math.ceil(all * 2 / 3) };
}

// ---------- 顶栏 ----------
function bar(S) {
  const f = S.player, st = R.factionStrength(S, f);
  const idle = R.generalsOf(S, f).filter(g => !g.acted).length;
  return {
    owner: f, mark: S.factions[f].mark, name: S.factions[f].name, date: R.dateLabel(S),
    cities: st.cities, target: R.winTarget(S), troops: fmt(st.troops), gold: st.gold, food: st.food,
    idle: idle ? `${idle} 人待命` : '诸将皆已领命',
  };
}

// ---------- 舆图上的城池 ----------
function formTargets(S, ui) {
  const f = ui.form;
  if (!f) return [];
  const g = S.generals[f.gid], c = S.cities[g.city];
  if (f.cmd === 'attack') return R.ADJ[c.id].filter(id => R.isHostile(S, g.faction, S.cities[id]));
  if (f.cmd === 'move') return R.ADJ[c.id].filter(id => S.cities[id].owner === g.faction);
  return [];
}
function cities(S, ui, k) {
  const targets = formTargets(S, ui);
  const from = ui.form ? S.generals[ui.form.gid].city : null;
  const seats = {};
  Object.values(S.factions).forEach(f => { if (f.alive && S.generals[f.ruler]) seats[S.generals[f.ruler].city] = true; });
  return Object.values(S.cities).map(c => {
    const p = R.CITIES[c.id];
    return {
      id: c.id, name: c.name, owner: fid(c.owner), mark: fmark(S, c.owner), troops: fmt(c.troops),
      left: Math.round(p.x * k), top: Math.round(p.y * k),
      idle: c.owner === S.player ? R.idleIn(S, c.id, S.player).length : 0,
      seat: !!(c.owner && seats[c.id]),
      sel: c.id === ui.city && !ui.form, target: targets.indexOf(c.id) >= 0,
      picked: !!(ui.form && ui.form.target === c.id), from: c.id === from,
    };
  });
}

// ---------- 总览 ----------
function overview(S) {
  const f = S.player, adv = R.AI.advise(S);
  const powers = Object.values(S.factions)
    .map(x => ({ x, st: R.factionStrength(S, x.id) }))
    .sort((a, b) => (b.x.alive - a.x.alive) || b.st.cities - a.st.cities)
    .map(({ x, st }) => ({
      id: x.id, mark: x.mark, name: x.name, cities: st.cities, troops: fmt(st.troops),
      rel: x.id === f ? '本家' : !x.alive ? '覆灭' : R.isAllied(S, f, x.id) ? `同盟 剩${R.allyUntil(S, f, x.id) - S.turn}季` : '敌对',
      me: x.id === f, dead: !x.alive,
    }));
  const mine = R.citiesOf(S, f).map(c => {
    const idle = R.idleIn(S, c.id, f).length;
    return {
      id: c.id, name: c.name, idle: idle ? `${idle} 人待命` : '', troops: fmt(c.troops), gold: c.gold, food: c.food,
      foodLow: R.foodSeasons(c) < 4, gens: R.officersIn(S, c.id, f).length,
    };
  });
  return {
    advisor: adv.advisor ? { seal: seal(adv.advisor), name: adv.advisor.name } : null,
    tips: adv.tips.length ? adv.tips.map(t => ({ text: t.text, city: t.city || '' })) : [{ text: '四境安宁，主公可从容经营。', city: '' }],
    powers, mine, target: R.winTarget(S), neutral: Object.values(S.cities).filter(c => !c.owner).length,
    progress: pct(mine.length, R.winTarget(S)),
  };
}

// ---------- 城池 ----------
function g4(g) {
  const top = Math.max(g.lea, g.str, g.int, g.pol);
  return ['lea', 'str', 'int', 'pol'].map(k => ({ k: STAT[k], v: g[k], hi: g[k] === top || g[k] >= 90 }));
}
function genItem(S, ui, g, foreign) {
  const open = !foreign && ui.gen === g.id && !g.acted;
  const item = {
    id: g.id, seal: seal(g), name: g.name, owner: fid(g.faction), stats: g4(g),
    ruler: !!(g.faction && S.factions[g.faction].ruler === g.id), open,
    done: !foreign && g.acted, foreign: !!foreign,
    status: foreign ? '' : g.acted ? (DID[g.did] || '已行动') : open ? '下令中' : '待命',
    cmds: [],
  };
  if (open) {
    item.cmds = CMD_ORDER.map(id => {
      const def = R.COMMANDS.find(c => c.id === id);
      const chk = R.canDo(S, g.id, id);
      const sub = chk.ok ? [def.gold ? '金' + def.gold : '', R.preview(S, g.id, id)].filter(Boolean).join(' · ') : chk.why;
      return { id, name: def.name, sub, ok: chk.ok };
    });
  }
  return item;
}
function stats(c) {
  return [
    { k: '兵力', v: fmt(c.troops), m: -1 },
    { k: '训练', v: c.train, m: c.train, low: c.train < 50 },
    { k: '城防', v: c.defense, m: pct(c.defense, c.defenseMax), low: c.defense < c.defenseMax * 0.5 },
    { k: '民心', v: c.morale, m: c.morale, low: c.morale < 40 },
    { k: '金', v: c.gold, m: -1 },
    { k: '粮', v: c.food, m: -1 },
    { k: '商业', v: c.commerce, m: pct(c.commerce, 999) },
    { k: '农业', v: c.farm, m: pct(c.farm, 999) },
  ];
}
function neighbors(S, c) {
  return R.ADJ[c.id].map(id => {
    const n = S.cities[id];
    return { id, name: n.name, owner: fid(n.owner), info: `${n.owner ? fname(S, n.owner) : '中立'} · ${fmt(n.troops)}` };
  });
}
function city(S, ui) {
  const c = S.cities[ui.city], f = S.player;
  const ruler = c.owner && S.generals[S.factions[c.owner].ruler];
  const base = {
    id: c.id, name: c.name, owner: fid(c.owner), mark: fmark(S, c.owner) || '中',
    ownerText: (c.owner ? fname(S, c.owner) + '势力' : '中立 · ' + (c.keeper || '')) + (ruler && ruler.city === c.id ? ' · 君主所在' : ''),
    stats: stats(c), neighbors: neighbors(S, c),
  };
  if (c.owner === f) {
    const gens = R.officersIn(S, c.id, f)
      .sort((a, b) => (a.acted - b.acted) || (b.lea + b.str + b.int + b.pol) - (a.lea + a.str + a.int + a.pol))
      .map(g => genItem(S, ui, g));
    const fs = R.foodSeasons(c);
    const idle = R.idleIn(S, c.id, f).length > 0;
    return Object.assign(base, {
      mine: true, rel: null,
      hint: `每季收金约 ${R.income(c)}，秋收粮约 ${R.harvest(c)}；存粮可支撑 ${fs === Infinity ? '很久' : fs + ' 季'}。`,
      hintWarn: fs < 4, gens,
      people: R.recruitableIn(S, c.id).map(t => ({
        id: t.id, seal: seal(t), name: t.name, owner: fid(t.former), tag: t.captive ? '俘虏' : '在野', stats: g4(t),
      })),
      canEmploy: idle,
    });
  }
  const hostile = R.isHostile(S, f, c);
  const launch = hostile ? R.ADJ[c.id].map(id => S.cities[id])
    .filter(n => n.owner === f && R.idleIn(S, n.id, f).length && n.troops >= 1000)
    .map(n => {
      const leader = R.best(R.idleIn(S, n.id, f), 'lea');
      const o = R.oddsLabel(R.estimate(S, n.id, c.id, Math.floor(n.troops * 0.85), leader));
      return { from: n.id, name: `自${n.name}出征`, info: `${leader.name}领兵 · 城中兵 ${fmt(n.troops)}`, odds: o.text, tone: o.tone };
    }) : [];
  let action = '';
  if (!hostile) action = `与${fname(S, c.owner)}结盟中，不能攻打。`;
  else if (!launch.length) {
    action = R.ADJ[c.id].some(id => S.cities[id].owner === f)
      ? '相邻的己方城里没有待命武将，或兵不足一千，暂时打不了这里。'
      : '这座城不与我方接壤，要先攻下中间的城池。';
  }
  const gens = c.owner ? R.officersIn(S, c.id, c.owner).map(g => genItem(S, ui, g, true)) : [];
  return Object.assign(base, {
    mine: false,
    rel: !c.owner ? { text: '中立', tone: 'dim' } : R.isAllied(S, f, c.owner) ? { text: '同盟', tone: 'good' } : { text: '敌对', tone: 'bad' },
    launch, action, gens,
    emptyText: c.owner ? '城中无将，由守城校尉统兵。' : `${c.keeper || ''}的部将据城自守，不会主动出击。`,
  });
}

// ---------- 指令表单 ----------
function troopHint(S, c, n, target) {
  const food = Math.round(n * 0.1), left = c.troops - n;
  const danger = R.ADJ[c.id].map(id => S.cities[id])
    .filter(x => x.id !== target && x.owner && R.isHostile(S, S.player, x))
    .sort((a, b) => b.troops - a.troops)[0];
  let warn = '';
  if (food > c.food) warn = '粮草不够';
  else if (danger && left < danger.troops * 0.5) warn = `留守单薄：邻城${danger.name}有${fname(S, danger.owner)}兵 ${fmt(danger.troops)}`;
  return { hint: `耗粮 ${food}（城中存粮 ${c.food}）· 留守 ${fmt(left)}`, warn };
}
function form(S, ui) {
  const f = ui.form, g = S.generals[f.gid], c = S.cities[g.city];
  const base = { cmd: f.cmd, back: `‹ 返回${c.name}`, general: g.name };
  if (f.cmd === 'attack') {
    const r = R.estimate(S, c.id, f.target, f.troops, g), o = R.oddsLabel(r);
    const others = R.idleIn(S, c.id, g.faction).filter(x => x.id !== g.id);
    const th = troopHint(S, c, f.troops, f.target);
    return Object.assign(base, {
      eyebrow: '出征', sub: `统 ${g.lea} · 自${c.name}发兵`,
      targets: formTargets(S, ui).map(id => {
        const t = S.cities[id], od = R.oddsLabel(R.estimate(S, c.id, id, f.troops, g));
        return {
          id, name: t.name, owner: fid(t.owner), mark: fmark(S, t.owner) || '中', on: f.target === id,
          info: `${t.owner ? fname(S, t.owner) : '中立 · ' + t.keeper} · 守军 ${fmt(t.troops)} · 城防 ${t.defense}`,
          odds: od.text, tone: od.tone,
        };
      }),
      min: 1000, max: c.troops, troops: f.troops, troopsText: fmt(f.troops), hint: th.hint, warn: th.warn,
      deputies: others.map(x => {
        const on = f.deputies.indexOf(x.id) >= 0;
        return { id: x.id, name: x.name, info: `武 ${x.str} · 智 ${x.int}`, on, off: !on && f.deputies.length >= 2 };
      }),
      verdict: { text: o.text, tone: o.tone, ratio: r.toFixed(2) },
      confirm: `出征${S.cities[f.target].name}`,
    });
  }
  if (f.cmd === 'move') {
    const t = S.cities[f.target];
    return Object.assign(base, {
      eyebrow: '调动', sub: `自${c.name}移驻`,
      targets: formTargets(S, ui).map(id => {
        const x = S.cities[id];
        return { id, name: x.name, owner: fid(x.owner), mark: fmark(S, x.owner), on: f.target === id, info: `兵 ${fmt(x.troops)} · 将 ${R.officersIn(S, id, g.faction).length} · 粮 ${x.food}`, odds: '', tone: '' };
      }),
      min: 0, max: c.troops, troops: f.troops, troopsText: fmt(f.troops),
      hint: `${c.name}留守 ${fmt(c.troops - f.troops)} · ${t.name}将有 ${fmt(t.troops + f.troops)}`, warn: '',
      confirm: `调往${t.name}`,
    });
  }
  if (f.cmd === 'employ') {
    return Object.assign(base, {
      eyebrow: '登用', sub: `政 ${g.pol} · 政治越高越容易说动`,
      people: R.recruitableIn(S, c.id).map(t => {
        const wolong = t.wolong && S.factions[g.faction].ruler === 'liubei';
        const p = R.employChance(S, g.id, t.id);
        return {
          id: t.id, seal: seal(t), name: t.name, owner: fid(t.former),
          tag: wolong ? `三顾茅庐 · 已拜访 ${S.flags.visits} 次` : `把握约 ${Math.round(p * 100)}%`,
          tone: wolong ? 'warn' : p >= 0.5 ? 'good' : p >= 0.25 ? 'warn' : 'bad',
          info: `${t.captive ? '俘虏' + (t.former ? ' · 原属' + fname(S, t.former) : '') : '在野'} · 统${t.lea} 武${t.str} 智${t.int} 政${t.pol}`,
        };
      }),
    });
  }
  // 外交
  return Object.assign(base, {
    eyebrow: '外交', sub: `智 ${g.int} · 自${c.name}出使`,
    factions: Object.values(S.factions).filter(x => x.alive && x.id !== g.faction).map(x => {
      const allied = R.isAllied(S, g.faction, x.id), p = R.allyChance(S, g.faction, x.id, g.int);
      return {
        id: x.id, mark: x.mark, name: x.name, allied,
        tag: allied ? `已结盟 · 剩${R.allyUntil(S, g.faction, x.id) - S.turn}季` : `把握约 ${Math.round(p * 100)}%`,
        tone: allied || p >= 0.5 ? 'good' : p >= 0.3 ? 'warn' : 'bad',
        info: `${R.citiesOf(S, x.id).length} 城 · 兵 ${fmt(R.factionStrength(S, x.id).troops)}`,
      };
    }),
  });
}

// ---------- 浮层 ----------
function repItem(r) {
  return { kind: r.kind, tag: KIND[r.kind] || '事', text: r.text, title: r.title || '', mine: !!r.mine, warn: !!r.warn };
}
function report(S, reps) {
  const date = R.dateLabel(S);
  const rest = reps.filter(r => r.kind !== 'event');
  return {
    kind: 'report', eyebrow: S.turn === 1 ? '开局' : '本季战报', date, first: S.turn === 1,
    events: reps.filter(r => r.kind === 'event').map(e => ({ tag: e.mine ? '大事' : '天下大事', title: e.title, text: e.text })),
    mine: rest.filter(r => r.mine).map(repItem),
    others: rest.filter(r => !r.mine).map(repItem), othersOpen: false,
    button: S.over ? '查看结局' : `开始${date.split(' · ')[1]}季政务`,
  };
}
function chronicle(S, mineOnly) {
  const keep = r => !mineOnly || r.mine || r.kind === 'event' || r.kind === 'battle';
  const groups = [];
  S.chronicle.filter(keep).slice().reverse().forEach(r => {
    if (!groups.length || groups[groups.length - 1].date !== r.date) groups.push({ date: r.date, items: [] });
    groups[groups.length - 1].items.push(repItem(r));
  });
  return { kind: 'chronicle', title: `${S.factions[S.player].name}纪事`, mineOnly, groups };
}
function over(S) {
  const win = S.over.result === 'win', st = R.factionStrength(S, S.player), name = S.factions[S.player].name;
  return {
    kind: 'over', date: R.dateLabel(S), title: win ? '天下归心' : '大业未竟',
    text: win ? `${name}已据 ${st.cities} 城，群雄束手，天下大势已定。` : `${name}失去了最后的城池。胜败乃兵家常事，可再整旗鼓。`,
    facts: [
      { v: Math.max(1, Math.round((S.turn - 1) / 4)), k: '年' }, { v: st.cities, k: '城' },
      { v: R.generalsOf(S, S.player).length, k: '将' },
      { v: S.chronicle.filter(r => r.kind === 'battle' && r.mine).length, k: '战' },
    ],
  };
}
function battle(S, b) {
  return {
    kind: 'battle',
    atk: { owner: fid(b.attacker), mark: fmark(S, b.attacker), lead: b.atkLead, side: `${b.atkName}军 · 攻` },
    def: { owner: fid(b.defender), mark: fmark(S, b.defender) || '守', lead: b.defLead, side: `${b.defName}${b.defender ? '军' : ''} · 守` },
    place: `${S.cities[b.from].name}　→　${S.cities[b.to].name}`,
    a: fmt(b.a0), aw: Math.round(b.a0 / Math.max(b.a0, b.d0, 1) * 100),
    d: fmt(b.d0), dw: Math.round(b.d0 / Math.max(b.a0, b.d0, 1) * 100),
    log: [], stamp: b.result === 'take' ? '攻克' : '败退', win: b.result === 'take', done: false,
  };
}
// 战斗要逐条播放的步骤（含最后的俘获、突围）
function battleSteps(b) {
  const tail = [];
  if (b.captured.length) tail.push({ kind: 'end', text: `生擒${b.captured.join('、')}，押入城中。`, a: b.a, d: 0 });
  if (b.fled.length) tail.push({ kind: 'round', text: `${b.fled.join('、')}突围而走。`, a: b.a, d: 0 });
  const max = Math.max(b.a0, b.d0, 1);
  return b.steps.concat(tail).map(st => ({
    kind: st.kind, text: st.text, a: fmt(st.a), aw: Math.round(st.a / max * 100), d: fmt(st.d), dw: Math.round(st.d / max * 100),
  }));
}

module.exports = { title, bar, cities, formTargets, overview, city, form, troopHint, report, chronicle, over, battle, battleSteps };
