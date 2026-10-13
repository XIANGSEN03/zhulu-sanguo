// 不开微信也能跑的自测：逐鹿三国小程序版的界面数据和舆图绘制
// 用法：node tools/test_zhulu.cjs
const assert = require('assert');
const path = require('path');
const Z = path.join(__dirname, '..', 'miniprogram', 'zhulu');
const R = require(path.join(Z, 'engine.js'));
const V = require(path.join(Z, 'view.js'));
const MapArt = require(path.join(Z, 'map.js'));

// 假画布：记录调用次数，任何方法都不报错
const calls = {};
const ctx = new Proxy({}, {
  get: (t, k) => (k in t ? t[k] : (...a) => { calls[k] = (calls[k] || 0) + 1; return { addColorStop() {} }; }),
  set: (t, k, v) => { t[k] = v; return true; },
});

const s = R.newGame('shu', 123);
const ui = { city: null, gen: null, form: null, chronMine: true };
assert.ok(V.title(null).lords.length === 4);
assert.ok(V.title(s).resume.name === '刘备');
assert.ok(V.bar(s).cities === 2);
assert.strictEqual(V.cities(s, ui, 0.82).length, 22);
const ov = V.overview(s);
assert.ok(ov.advisor && ov.tips.length && ov.powers.length === 4 && ov.mine.length === 2);

ui.city = 'xiapi'; ui.gen = 'guanyu';
const mine = V.city(s, ui);
assert.ok(mine.mine && mine.gens.length === 3 && mine.gens.find(g => g.id === 'guanyu').cmds.length === 9);
ui.city = 'chenliu';
const other = V.city(s, ui);
assert.ok(!other.mine && other.rel.text === '敌对' && other.gens.length);

// 四种表单
const f = { cmd: 'attack', gid: 'guanyu', target: 'shouchun', troops: 8000, deputies: ['mizhu'] };
ui.form = f; ui.city = 'xiapi';
const fa = V.form(s, ui);
assert.ok(fa.targets.length === 2 && fa.verdict.text && fa.deputies.length === 2 && fa.confirm === '出征寿春');
assert.deepStrictEqual(V.formTargets(s, ui).sort(), ['jianye', 'shouchun']);
ui.form = { cmd: 'move', gid: 'guanyu', target: 'xiaopei', troops: 3000 };
assert.ok(V.form(s, ui).confirm === '调往小沛');
ui.form = { cmd: 'employ', gid: 'mizhu' };
assert.ok(Array.isArray(V.form(s, ui).people));
ui.form = { cmd: 'diplomacy', gid: 'mizhu' };
assert.ok(V.form(s, ui).factions.length === 3);

MapArt.draw(ctx, s, { scale: 1.64, from: 'xiapi', targets: ['shouchun', 'jianye'], cmd: 'attack' });
assert.ok(calls.bezierCurveTo > 10 && calls.quadraticCurveTo > 30, '舆图应画出河流和道路');

// 打一仗、过几季、看战报和史册
const res = R.doCommand(s, 'guanyu', 'attack', { target: 'shouchun', troops: 10000, deputies: [] });
const bt = V.battle(s, res.battle), steps = V.battleSteps(res.battle);
assert.ok(bt.atk.lead === '关羽' && steps.length >= 3);
let rep;
for (let i = 0; i < 12 && !s.over; i++) { rep = V.report(s, R.endTurn(s)); }
assert.ok(rep.date && rep.button);
assert.ok(V.chronicle(s, true).groups.length && V.chronicle(s, false).groups.length);
s.over = { result: 'win', turn: s.turn };
assert.ok(V.over(s).title === '天下归心');

// 存档要能被微信原样存取（纯 JSON）
const copy = JSON.parse(JSON.stringify(s));
assert.deepStrictEqual(Object.keys(copy.cities).length, 22);
console.log('逐鹿三国小程序版自测通过；舆图绘制调用', Object.keys(calls).length, '种画布方法');
