// 校准：估算的“把握”与实际攻城成功率是否一致
for (const f of ['data.js', 'rules.js', 'ai.js']) require('../' + f);
const ZL = globalThis.ZL;
const base = ZL.newGame('shu', 42);
for (const ratio of [0.8, 1.0, 1.2, 1.45, 1.7, 2.0, 2.5]) {
  let take = 0, lossA = 0; const N = 300;
  for (let i = 0; i < N; i++) {
    const s = JSON.parse(JSON.stringify(base)); s.seed = 7 + i * 131;
    const from = s.cities.chenliu, to = s.cities.xiaopei; // 张辽 打 张飞
    to.troops = 10000; to.train = 70; to.defense = 700;
    from.train = 70; from.food = 99999;
    const leader = s.generals.zhangliao;
    const per = ZL.estimate(s, 'chenliu', 'xiaopei', 10000, leader) / 10000;
    const send = Math.round(ratio / per);
    from.troops = send + 1000;
    const r = ZL.doCommand(s, 'zhangliao', 'attack', { target: 'xiaopei', troops: send, deputies: [] });
    if (r.battle.result === 'take') take++;
    lossA += 1 - r.battle.a / r.battle.a0;
  }
  console.log('估算', ratio, '攻克率', (take / N * 100).toFixed(0) + '%', '攻方平均损失', (lossA / N * 100).toFixed(0) + '%');
}
