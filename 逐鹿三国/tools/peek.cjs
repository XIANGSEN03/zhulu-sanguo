for (const f of ['data.js', 'rules.js', 'ai.js']) require('../' + f);
const ZL = globalThis.ZL;
const s = ZL.newGame('shu', 1000);
const did = {};
const orig = ZL.doCommand;
ZL.doCommand = function (s2, gid, cmd, opt) { did[cmd] = (did[cmd] || 0) + 1; return orig.apply(this, arguments); };
let bt = 0, tk = 0;
for (let t = 1; t <= 40; t++) {
  ZL.AI.run(s, s.player);
  const reps = ZL.endTurn(s);
  for (const r of reps) if (r.kind === 'battle') { bt++; if (r.battle.result === 'take') tk++; }
  if (t % 8 === 0) {
    const row = Object.keys(s.factions).map(f => { const st = ZL.factionStrength(s, f); return `${f}:${st.cities}城 兵${ZL.fmt(st.troops)} 金${st.gold} 粮${st.food}`; });
    console.log(ZL.dateLabel(s), row.join(' | '));
  }
}
console.log('battles', bt, 'takes', tk, did);
const avgTrain = Object.values(s.cities).filter(c=>c.owner).map(c=>c.name+c.train+'/'+c.defense+'/'+ZL.fmt(c.troops)).join(' ');
console.log(avgTrain);
