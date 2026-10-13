// 为介绍视频排练一局：用固定种子按同样顺序下令，挑一个剧情最好看的种子。
// 浏览器里录屏时把 Date.now 固定成同一个数，开局种子就一样，结果完全一致。
// 用法：node tools/plan-video.cjs [试多少个种子]
for (const f of ['data.js', 'rules.js', 'ai.js']) require('../' + f);
const ZL = globalThis.ZL;

// 录屏脚本会按这个顺序点击；每一步 [武将, 指令, 参数]
const PLAN = [
  // 建安五年春
  [['guanyu', 'attack', { target: 'shouchun', troops: 8000, deputies: [] }],
   ['liubei', 'commerce'], ['mizhu', 'farm'],
   ['zhangfei', 'recruit'], ['sunqian', 'commerce'], ['jianyong', 'farm']],
  // 夏：赵云来投；关羽在寿春搜索，糜竺移驻寿春准备登用
  [['guanyu', 'search'], ['mizhu', 'move', { target: 'shouchun', troops: 0 }],
   ['zhaoyun', 'recruit'], ['liubei', 'train'],
   ['zhangfei', 'train'], ['sunqian', 'commerce'], ['jianyong', 'farm']],
  // 秋：糜竺登用鲁肃；孙乾出使江东
  [['mizhu', 'employ', { target: 'lusu' }], ['guanyu', 'train'],
   ['sunqian', 'diplomacy', { target: 'wu' }],
   ['liubei', 'commerce'], ['zhaoyun', 'train'], ['zhangfei', 'train'], ['jianyong', 'farm']],
  // 冬：休养生息，准备来年
  [['zhangfei', 'train'], ['liubei', 'commerce'], ['guanyu', 'train'], ['mizhu', 'farm'],
   ['lusu', 'commerce'], ['zhaoyun', 'train'], ['sunqian', 'farm'], ['jianyong', 'commerce']],
];

function run(fixed, log) {
  const seed = (fixed ^ 0x9e3779b9) >>> 0;
  const s = ZL.newGame('shu', seed);
  const out = { fixed, events: [], results: [] };
  out.events.push(...s.reports.filter(r => r.kind === 'event').map(r => r.title));
  PLAN.forEach((turn, ti) => {
    for (const [gid, cmd, opt0] of turn) {
      const g = s.generals[gid];
      if (!g || !g.alive || g.faction !== 'shu' || g.acted) { out.results.push(`T${ti + 1} ${gid} 不能行动`); continue; }
      const opt = Object.assign({}, opt0 || {});
      if (opt.troops === 'most') opt.troops = Math.floor(s.cities[g.city].troops * 0.85 / 100) * 100;
      if (cmd === 'employ' && !(s.generals[opt.target] && !s.generals[opt.target].hidden && s.generals[opt.target].city === g.city)) { out.results.push(`T${ti + 1} ${opt.target} 不在`); continue; }
      const r = ZL.doCommand(s, gid, cmd, opt);
      const extra = r.battle ? ` [${r.battle.result}${r.battle.steps.some(x => x.kind === 'duel') ? ' 单挑' : ''}${r.battle.steps.some(x => x.kind === 'plot') ? ' 计策' : ''}]` : '';
      out.results.push(`T${ti + 1} ${r.error ? '错误 ' + r.error : r.text}${extra}`);
    }
    const reps = ZL.endTurn(s);
    out.events.push(...reps.filter(r => r.kind === 'event').map(r => r.title));
    out.results.push(...reps.filter(r => r.mine && r.kind === 'battle').map(r => `T${ti + 1} 战报：${r.text}`));
  });
  const txt = out.results.join('\n');
  out.score = (txt.includes('攻克寿春') ? 3 : 0) + (/攻克寿春.*单挑/.test(txt) ? 3 : 0) + (/攻克寿春.*计策/.test(txt) ? 1 : 0)
    + (txt.includes('访得贤才鲁肃') ? 2 : 0) + (txt.includes('鲁肃愿效') ? 2 : 0)
    + (txt.includes('结为同盟') ? 2 : 0) + (out.events.includes('小霸王陨落') ? 2 : 0)
    + (txt.includes('错误') || txt.includes('不能行动') || txt.includes('不在') ? -3 : 0)
    + (ZL.citiesOf(s, 'shu').length === 3 ? 2 : -5);
  out.cities = ZL.citiesOf(s, 'shu').map(c => c.name).join('、');
  if (log) console.log(txt + '\n事件：' + out.events.join('、') + '\n城池：' + out.cities);
  return out;
}

if (require.main === module) {
  const n = Number(process.argv[2] || 400);
  const tries = [];
  for (let i = 0; i < n; i++) tries.push(run(20261012 + i * 7));
  tries.sort((a, b) => b.score - a.score);
  console.log('最佳几个：', tries.slice(0, 5).map(t => `${t.fixed}(${t.score}分)`).join(' '));
  console.log('---- 最佳种子的过程 ----');
  run(tries[0].fixed, true);
}
module.exports = { PLAN, run };
