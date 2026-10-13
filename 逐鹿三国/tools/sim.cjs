// 平衡性模拟：四家全部交给电脑，跑很多局，看谁赢、多久结束、有没有报错。
// 用法：node tools/sim.cjs [局数] [季度上限]
for (const f of ['data.js', 'rules.js', 'ai.js']) require('../' + f);
const ZL = globalThis.ZL;

const games = Number(process.argv[2] || 20), maxTurns = Number(process.argv[3] || 60);
const tally = {}, ends = [];
for (let i = 0; i < games; i++) {
  const s = ZL.newGame('shu', 1000 + i * 7919);
  let battles = 0, takes = 0;
  while (!s.over && s.turn <= maxTurns) {
    ZL.AI.run(s, s.player); // 玩家这家也交给电脑
    const reps = ZL.endTurn(s);
    for (const r of reps.concat(s.chronicle.filter(c => c.date === ZL.dateLabel(s, -1)))) if (r.kind === 'battle') { battles++; if (r.battle.result === 'take') takes++; }
  }
  const count = {};
  for (const c of Object.values(s.cities)) count[c.owner || '中立'] = (count[c.owner || '中立'] || 0) + 1;
  const leader = Object.entries(count).filter(([k]) => k !== '中立').sort((a, b) => b[1] - a[1])[0];
  tally[leader[0]] = (tally[leader[0]] || 0) + 1;
  ends.push({ seed: i, turn: s.turn, date: ZL.dateLabel(s), over: s.over && s.over.result, count, battles, takes });
}
for (const e of ends) console.log(e.date.padEnd(12), String(e.over || '-').padEnd(5), JSON.stringify(e.count));
console.log('领先次数', tally);
