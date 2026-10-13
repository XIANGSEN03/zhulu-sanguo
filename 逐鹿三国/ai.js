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
})(globalThis.ZL = globalThis.ZL || {});
