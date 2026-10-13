// 界面：只负责“画出来”和“把点击转成指令”。所有数值都交给 rules.js 计算。
(function () {
  'use strict';
  const R = globalThis.ZL;
  const SAVE_KEY = 'zhulu-save-v1';
  const VIEW_KEY = 'zhulu-view';   // 记住上次用的是平面舆图还是 3D 沙盘
  const LABEL_UP = {}; // 需要把名字放到城池上方的城（目前没有）
  const STAT = { lea: '统', str: '武', int: '智', pol: '政' };
  const CMD_ORDER = ['commerce', 'farm', 'search', 'recruit', 'train', 'employ', 'attack', 'move', 'diplomacy'];
  const FORM_CMDS = ['attack', 'move', 'employ', 'diplomacy'];
  const DID = {
    commerce: '已开发商业', farm: '已开发农业', recruit: '已征兵', train: '已训练', attack: '已出征',
    move: '已调动', search: '已搜索', employ: '已登用', diplomacy: '已出使', joined: '新近归附',
  };
  const KIND = { battle: '战', ally: '盟', people: '人', civil: '政', event: '事' };
  const motion = !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const isNarrow = () => window.matchMedia('(max-width: 979px)').matches;

  let S = null;          // 当前对局（纯数据，可以直接存档）
  let preview = false;   // 开场画面背后那张舆图用的是示意局
  const ui = { city: null, gen: null, form: null, chronMine: true, profile: null };
  let modalKind = null, afterModal = null, btTimer = null, battleSkip = null, toastTimer = null;

  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const fc = f => 'f-' + (f || 'none');
  const fname = f => (f ? S.factions[f].name : '中立');
  const fmark = f => (f ? S.factions[f].mark : '');
  const fmt = R.fmt;
  // 立绘（见 portraits.js）：head 头像、bust 半身像；flag 给半身像角上加一面势力小旗
  const face = (g, kind = 'head', f) => `<span class="face ${kind}${f !== undefined ? ' ' + fc(f) : ''}">${R.portrait(g, kind)}${kind === 'bust' && f ? `<span class="flag sm">${fmark(f)}</span>` : ''}</span>`;
  // 点头像打开武将详情页
  const faceBtn = (g, kind = 'head', f) => `<button class="face-btn" data-act="profile" data-gen="${g.id}" aria-label="查看${esc(g.name)}">${face(g, kind, f)}</button>`;
  // 战报里只有名字：按名字找回武将画立绘；找不到的（守城校尉、某某部将）只挂一面势力旗
  const leadFace = (name, f) => {
    const g = Object.values(S.generals).find(x => x.name === name);
    return g ? face(g, 'bust', f) : `<span class="flag lg">${fmark(f) || '守'}</span>`;
  };

  // ---------- 存档（浏览器本地，存不了也不影响玩） ----------
  function save() {
    if (preview || !S) return;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* 隐私模式等情况下忽略 */ }
  }
  function readSave() {
    try {
      const t = localStorage.getItem(SAVE_KEY);
      const s = t && JSON.parse(t);
      return s && s.version === 1 ? s : null;
    } catch (e) { return null; }
  }
  function dropSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* 忽略 */ } }

  // ---------- 舆图：静态底图（只画一次） ----------
  function silkTexture() {
    try {
      const n = 220, cv = document.createElement('canvas');
      cv.width = cv.height = n;
      const g = cv.getContext('2d');
      const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || 'black';
      let seed = 5;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      g.fillStyle = ink; g.strokeStyle = ink;
      for (let i = 0; i < 2600; i++) { g.globalAlpha = 0.02 + rnd() * 0.06; g.fillRect(rnd() * n, rnd() * n, 1 + rnd() * 1.4, 1); }
      for (let i = 0; i < 80; i++) {
        g.globalAlpha = 0.02 + rnd() * 0.04; g.lineWidth = 0.6 + rnd();
        const y = rnd() * n, x = rnd() * n - 60, len = 40 + rnd() * 140;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + len, y + (rnd() - 0.5) * 2); g.stroke();
      }
      return cv.toDataURL('image/png');
    } catch (e) { return ''; }
  }
  function peaks() {
    let out = '', seed = 11;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (const rg of R.MAP.ranges) {
      for (let i = 0; i < rg.pts.length - 1; i++) {
        const [x1, y1] = rg.pts[i], [x2, y2] = rg.pts[i + 1];
        const steps = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) / 19));
        for (let k = 0; k < steps; k++) {
          const t = k / steps;
          const x = x1 + (x2 - x1) * t + (rnd() - 0.5) * 10, y = y1 + (y2 - y1) * t + (rnd() - 0.5) * 12;
          const h = 10 + rnd() * 11, w = 9 + rnd() * 6;
          out += `<path class="peak" d="M${(x - w).toFixed(1)} ${(y + h * 0.45).toFixed(1)}L${x.toFixed(1)} ${(y - h).toFixed(1)}L${(x + w).toFixed(1)} ${(y + h * 0.45).toFixed(1)}"/>`;
          out += `<path class="peak-shade" d="M${x.toFixed(1)} ${(y - h).toFixed(1)}L${(x + w * 0.35).toFixed(1)} ${(y + h * 0.45).toFixed(1)}"/>`;
        }
      }
    }
    return out;
  }
  function roadPath(a, b) {
    const A = R.CITIES[a], B = R.CITIES[b];
    const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1;
    const bend = (((A.x * 7 + B.y * 3) % 17) - 8) * 0.9; // 每条路固定的轻微弯曲，看起来像手绘
    const cx = (A.x + B.x) / 2 - (dy / len) * bend, cy = (A.y + B.y) / 2 + (dx / len) * bend;
    return `M${A.x} ${A.y}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${B.x} ${B.y}`;
  }
  function buildMap() {
    const M = R.MAP, tex = silkTexture();
    const big = 'x="-600" y="-600" width="2080" height="2000"';
    const grads = Object.keys(R.FACTIONS).map(f =>
      `<radialGradient id="g-${f}"><stop offset="0" style="stop-color:var(--${f});stop-opacity:0.62"/><stop offset="0.55" style="stop-color:var(--${f});stop-opacity:0.34"/><stop offset="1" style="stop-color:var(--${f});stop-opacity:0"/></radialGradient>`).join('');
    const ranges = M.ranges.map(r => {
      const m = r.pts[Math.floor(r.pts.length / 2)];
      return `<text class="range-label" x="${m[0]}" y="${m[1] + 36}" text-anchor="middle">${r.name}</text>`;
    }).join('');
    $('#map').innerHTML = `
      <defs>
        ${grads}
        ${tex ? `<pattern id="tex" width="220" height="220" patternUnits="userSpaceOnUse"><image href="${tex}" width="220" height="220"/></pattern>` : ''}
        <pattern id="waves" width="40" height="20" patternUnits="userSpaceOnUse"><path class="wave" fill="none" d="M0 14Q10 6 20 14T40 14"/></pattern>
        <radialGradient id="vig" cx="50%" cy="46%" r="72%"><stop offset="0.55" style="stop-color:var(--ink);stop-opacity:0"/><stop offset="1" style="stop-color:var(--ink);stop-opacity:0.42"/></radialGradient>
      </defs>
      <rect class="silk" ${big}/>
      ${tex ? `<rect ${big} fill="url(#tex)"/>` : ''}
      <path class="sea" d="${M.coast}"/>
      <path class="sea-waves" d="${M.coast}" fill="url(#waves)"/>
      <g id="terr" class="terr"></g>
      <path class="river" d="${M.yellowRiver}"/><path class="river-hi" d="${M.yellowRiver}"/>
      <path class="river" d="${M.yangtze}"/><path class="river-hi" d="${M.yangtze}"/>
      <g>${peaks()}</g>${ranges}
      <text class="river-label" transform="translate(588 306) rotate(-30)">黄河</text>
      <text class="river-label" transform="translate(222 686) rotate(14)">长江</text>
      <text class="sea-label" x="830" y="430" text-anchor="middle">东海</text>
      <text class="sea-label" x="808" y="138" text-anchor="middle">渤海</text>
      <rect class="vig" ${big} fill="url(#vig)"/>
      <g class="cartouche">
        <rect x="24" y="22" width="52" height="164"/><rect class="inner" x="29" y="27" width="42" height="154"/>
        <text x="50" y="62">建</text><text x="50" y="96">安</text><text x="50" y="130">舆</text><text x="50" y="164">图</text>
      </g>
      <g class="seal-stamp"><rect x="31" y="198" width="38" height="44" rx="3"/><text x="50" y="217">逐</text><text x="50" y="237">鹿</text></g>
      <g id="roads"></g>
      <g id="cities"></g>`;
  }

  // ---------- 舆图：随局势变化的部分 ----------
  function renderMap() {
    const form = ui.form;
    const fromId = form ? S.generals[form.gid].city : null;
    const tg = new Set(formTargets());
    $('#terr').innerHTML = Object.values(S.cities).filter(c => c.owner).map(c => {
      const p = R.CITIES[c.id];
      return `<circle cx="${p.x}" cy="${p.y}" r="92" fill="url(#g-${c.owner})"/>`;
    }).join('');
    $('#roads').innerHTML = R.ROADS.map(([a, b]) => {
      const hot = fromId && ((a === fromId && tg.has(b)) || (b === fromId && tg.has(a)));
      return `<path class="road${hot ? ' hot ' + form.cmd : ''}" d="${roadPath(a, b)}"/>`;
    }).join('');
    const seats = new Set(Object.values(S.factions).filter(f => f.alive && S.generals[f.ruler]).map(f => S.generals[f.ruler].city));
    $('#cities').innerHTML = Object.values(S.cities).map(c => {
      const p = R.CITIES[c.id], up = LABEL_UP[c.id];
      const idle = !preview && c.owner === S.player ? R.idleIn(S, c.id, S.player).length : 0;
      const cls = ['city', fc(c.owner),
        c.id === ui.city && !form ? 'sel' : '', tg.has(c.id) ? 'target' : '',
        form && form.target === c.id ? 'picked' : '', c.id === fromId ? 'from' : ''].filter(Boolean).join(' ');
      const seat = c.owner && seats.has(c.id);
      return `<g class="${cls}" data-city="${c.id}" transform="translate(${p.x} ${p.y})" tabindex="${preview ? -1 : 0}" role="button" aria-label="${c.name}，${fname(c.owner)}，兵${fmt(c.troops)}">
        <circle class="hit" r="36"/><circle class="pulse" r="25"/>
        ${seat ? '<rect class="seat" x="-17" y="-17" width="34" height="34" rx="3"/>' : ''}
        <rect class="wall" x="-12" y="-12" width="24" height="24" rx="2"/>
        <text class="mk" y="6">${fmark(c.owner)}</text>
        <text class="nm" y="${up ? -38 : 37}">${c.name}</text>
        <text class="tp" y="${up ? -20 : 54}">${fmt(c.troops)}</text>
        ${idle ? `<g class="idle" transform="translate(15 -15)"><circle r="9"/><text y="4">${idle}</text></g>` : ''}
      </g>`;
    }).join('');
    // 3D 沙盘：同一份局势再画一遍
    if (sandboxOn()) {
      const idle = {};
      if (!preview) for (const c of R.citiesOf(S, S.player)) idle[c.id] = R.idleIn(S, c.id, S.player).length;
      R.Sandbox.update({ S, sel: ui.city, form: !!form, from: fromId, targets: [...tg], cmd: form && form.cmd, picked: form && form.target, idle, seats });
    }
  }

  // ---------- 3D 沙盘（见 sandbox3d.js）：舆图右上角切换，平面舆图一直保留 ----------
  let view3d = (() => { try { return localStorage.getItem(VIEW_KEY) === '3d'; } catch (e) { return false; } })();
  let opening3d = false;
  const sandboxOn = () => !!(R.Sandbox && R.Sandbox.active());
  function ensureView() {
    const want = view3d && !preview && !!S, board = $('#board'), btn = $('#view-toggle');
    const can = !!(R.Sandbox && R.Kit3D && R.Kit3D.canRun());
    btn.hidden = preview || !can;
    btn.textContent = want ? '舆图' : '沙盘';
    btn.setAttribute('aria-pressed', String(want));
    btn.title = want ? '切回平面舆图' : '切到 3D 沙盘';
    if (want && can && !sandboxOn() && !opening3d) {
      opening3d = true; board.classList.add('is-3d', 'loading-3d');
      R.Sandbox.open(board, { pick: id => selectCity(id, true) }).then(ok => {
        opening3d = false; board.classList.remove('loading-3d');
        if (!ok) { view3d = false; board.classList.remove('is-3d'); toast('这台设备打不开 3D 沙盘，已切回平面舆图', 'bad'); }
        render();
        if (ok) { const seat = S.generals[S.factions[S.player].ruler]; R.Sandbox.focus(ui.city || (seat && seat.city)); }
      });
    }
    if (!want && (sandboxOn() || opening3d)) { R.Sandbox.close(); opening3d = false; board.classList.remove('is-3d', 'loading-3d'); }
  }
  function setView(on) {
    view3d = on;
    try { localStorage.setItem(VIEW_KEY, on ? '3d' : '2d'); } catch (e) { /* 存不了就只在这次有效 */ }
    render();
  }
  function centerOn(id) {
    if (sandboxOn() && id) { R.Sandbox.focus(id); return; }
    if (!isNarrow() || !id) return;
    const sc = $('#mapscroll'), p = R.CITIES[id], k = $('#map').clientWidth / 880;
    sc.scrollTo({ left: p.x * k - sc.clientWidth / 2, top: p.y * k - sc.clientHeight / 2, behavior: motion ? 'smooth' : 'auto' });
  }

  // ---------- 顶栏 ----------
  function renderBar() {
    const f = S.player, fac = S.factions[f], st = R.factionStrength(S, f);
    const idle = R.generalsOf(S, f).filter(g => !g.acted).length;
    $('#bar').innerHTML = `
      <div class="bar-lord ${fc(f)}"><span class="flag">${fac.mark}</span>
        <div><div class="lord-name">${esc(fac.name)}</div><div class="date">${R.dateLabel(S)}</div></div></div>
      <dl class="bar-res">
        <div><dt>城池</dt><dd>${st.cities}<small> / ${R.winTarget(S)}</small></dd></div>
        <div><dt>兵力</dt><dd>${fmt(st.troops)}</dd></div>
        <div><dt>金</dt><dd>${st.gold}</dd></div>
        <div><dt>粮</dt><dd>${st.food}</dd></div>
      </dl>
      <div class="bar-act">
        <button class="ghost" data-act="menu">主菜单</button>
        <button class="ghost" data-act="roster">武将</button>
        <button class="ghost" data-act="chronicle">史册</button>
        <button class="primary" data-act="end">结束本季<small>${idle ? idle + ' 人待命' : '诸将皆已领命'}</small></button>
      </div>`;
  }

  // ---------- 侧栏 ----------
  function renderPanel() {
    const p = $('#panel');
    if (ui.form) p.innerHTML = formView();
    else if (ui.city) p.innerHTML = S.cities[ui.city].owner === S.player ? myCityView() : otherCityView();
    else p.innerHTML = overview();
  }

  function overview() {
    const f = S.player, adv = R.AI.advise(S);
    const tips = adv.tips.map(t => t.city
      ? `<li><button class="tip" data-act="city" data-city="${t.city}">${esc(t.text)}<span class="tip-go">前往 ›</span></button></li>`
      : `<li><p class="tip">${esc(t.text)}</p></li>`).join('') || '<li><p class="tip">四境安宁，主公可从容经营。</p></li>';
    const rows = Object.values(S.factions)
      .map(x => ({ x, st: R.factionStrength(S, x.id) }))
      .sort((a, b) => (b.x.alive - a.x.alive) || b.st.cities - a.st.cities)
      .map(({ x, st }) => {
        const rel = x.id === f ? '本家' : !x.alive ? '覆灭' : R.isAllied(S, f, x.id) ? `同盟 · 剩${R.allyUntil(S, f, x.id) - S.turn}季` : '敌对';
        return `<tr class="${x.id === f ? 'me' : ''} ${x.alive ? '' : 'dead'}">
          <td><span class="who ${fc(x.id)}"><span class="flag sm">${x.mark}</span>${esc(x.name)}</span></td>
          <td>${st.cities}</td><td>${fmt(st.troops)}</td><td>${rel}</td></tr>`;
      }).join('');
    const neutral = Object.values(S.cities).filter(c => !c.owner).length;
    const mine = R.citiesOf(S, f);
    const list = mine.map(c => {
      const idle = R.idleIn(S, c.id, f).length, fs = R.foodSeasons(c);
      return `<button class="cityrow" data-act="city" data-city="${c.id}">
        <span class="cn">${c.name}</span><span class="idlepill">${idle ? idle + ' 人待命' : ''}</span>
        <span class="cs"><span>兵 ${fmt(c.troops)}</span><span>金 ${c.gold}</span><span class="${fs < 4 ? 'tone-bad' : ''}">粮 ${c.food}</span><span>将 ${R.officersIn(S, c.id, f).length}</span></span>
      </button>`;
    }).join('');
    const pct = Math.min(100, mine.length / R.winTarget(S) * 100);
    return `
      <section class="advisor">
        <div class="who">${adv.advisor ? faceBtn(adv.advisor, 'head', f) : ''}
          <div><div class="eyebrow">军师进言</div><div class="name">${adv.advisor ? adv.advisor.name : ''}</div></div>
          ${adv.advisor && adv.advisor.id !== S.factions[f].ruler ? '<button class="council-btn" data-act="council">与军师议事 ›</button>' : ''}</div>
        <ol class="tips">${tips}</ol>
      </section>
      <section class="sec">
        <div class="sec-h"><h3 class="eyebrow">天下大势</h3><span class="sub">先得 ${R.winTarget(S)} 城者胜 · 中立 ${neutral} 城</span></div>
        <div class="progress" title="我方城池进度"><i style="width:${pct}%"></i></div>
        <table class="powers"><thead><tr><th>势力</th><th>城</th><th>兵</th><th>关系</th></tr></thead><tbody>${rows}</tbody></table>
      </section>
      <section class="sec">
        <div class="sec-h"><h3 class="eyebrow">我的城池</h3><span class="sub">点城池给武将下令</span></div>
        <div class="citylist">${list}</div>
      </section>`;
  }

  function head(c) {
    const seat = c.owner && S.generals[S.factions[c.owner].ruler] && S.generals[S.factions[c.owner].ruler].city === c.id;
    let rel = '';
    if (c.owner && c.owner !== S.player) rel = R.isAllied(S, S.player, c.owner) ? '<span class="pill tone-good">同盟</span>' : '<span class="pill tone-bad">敌对</span>';
    if (!c.owner) rel = '<span class="pill dim">中立</span>';
    return `<div class="topline"><button class="link" data-act="home">‹ 总览</button>${rel}</div>
      <header class="city-h ${fc(c.owner)}"><span class="flag md">${fmark(c.owner) || '中'}</span><h2>${c.name}</h2>
        <div class="meta"><span class="owner">${c.owner ? esc(fname(c.owner)) + '势力' : '中立 · ' + esc(c.keeper || '')}${seat ? ' · 君主所在' : ''}</span></div></header>`;
  }
  function statsGrid(c) {
    const cell = (k, v, m, low) => `<div class="stat"><dt>${k}</dt><dd>${v}</dd>${m == null ? '' : `<div class="meter${low ? ' low' : ''}"><i style="width:${Math.round(Math.max(0, Math.min(1, m)) * 100)}%"></i></div>`}</div>`;
    return `<dl class="stats">
      ${cell('兵力', fmt(c.troops))}
      ${cell('训练', c.train, c.train / 100, c.train < 50)}
      ${cell('城防', c.defense, c.defense / c.defenseMax, c.defense < c.defenseMax * 0.5)}
      ${cell('民心', c.morale, c.morale / 100, c.morale < 40)}
      ${cell('金', c.gold)}
      ${cell('粮', c.food)}
      ${cell('商业', c.commerce, c.commerce / 999)}
      ${cell('农业', c.farm, c.farm / 999)}
    </dl>`;
  }
  function g4(g) {
    const top = Math.max(g.lea, g.str, g.int, g.pol);
    return ['lea', 'str', 'int', 'pol'].map(k => `<span class="${g[k] === top || g[k] >= 90 ? 'hi' : ''}"><i>${STAT[k]}</i>${g[k]}</span>`).join('');
  }
  function genItem(g, foreign) {
    const open = !foreign && ui.gen === g.id && !g.acted;
    const ruler = g.faction && S.factions[g.faction].ruler === g.id;
    const status = foreign ? '' : g.acted
      ? `<span class="gstat done">${DID[g.did] || '已行动'}</span>`
      : `<span class="gstat ready">${open ? '下令中' : '待命'}</span>`;
    return `<li class="gen ${fc(g.faction)} ${!foreign && g.acted ? 'done' : ''} ${open ? 'open' : ''}">
      <div class="gen-head">${faceBtn(g, open ? 'bust' : 'head')}
      <button class="gen-row" ${foreign ? 'disabled' : `data-act="gen" data-gen="${g.id}"`} ${!foreign && g.acted ? 'disabled' : ''} aria-expanded="${open}">
        <span><span class="gname">${g.name}${ruler ? '<span class="pill tone-warn">君主</span>' : ''}</span><span class="g4">${g4(g)}</span></span>
        ${status}
      </button></div>
      ${open ? `<div class="gen-cmds">${cmdButtons(g)}</div>` : ''}
    </li>`;
  }
  function cmdButtons(g) {
    return CMD_ORDER.map(id => {
      const def = R.COMMANDS.find(c => c.id === id);
      const chk = R.canDo(S, g.id, id);
      const sub = chk.ok ? [def.gold ? '金' + def.gold : '', R.preview(S, g.id, id)].filter(Boolean).join(' · ') : chk.why;
      return `<button class="cmd" data-act="cmd" data-cmd="${id}" data-gen="${g.id}" ${chk.ok ? '' : 'disabled'}><b>${def.name}</b><small>${esc(sub)}</small></button>`;
    }).join('');
  }
  function peopleSec(c) {
    const list = R.recruitableIn(S, c.id);
    if (!list.length) return '';
    const idle = R.idleIn(S, c.id, S.player);
    return `<section class="sec"><div class="sec-h"><h3 class="eyebrow">城中人物</h3><span class="sub">在野贤士与俘虏</span></div>
      <div class="people">${list.map(t => `<div class="person ${fc(t.former)}">${faceBtn(t)}
        <span class="pinfo"><span class="gname">${t.name}<span class="pill dim">${t.captive ? '俘虏' : '在野'}</span></span><span class="g4">${g4(t)}</span></span>
        ${idle.length ? `<button class="ghost" data-act="quick-employ" data-target="${t.id}">登用</button>` : ''}</div>`).join('')}</div>
      ${idle.length ? '' : '<p class="hint">城中武将都已行动，下季再来登用。</p>'}</section>`;
  }
  function neighborsSec(c) {
    return `<section class="sec"><h3 class="eyebrow">邻城</h3><div class="chips">${R.ADJ[c.id].map(id => {
      const n = S.cities[id];
      return `<button class="chip ${fc(n.owner)}" data-act="city" data-city="${id}"><span class="dot"></span>${n.name}<small>${n.owner ? esc(fname(n.owner)) : '中立'} · ${fmt(n.troops)}</small></button>`;
    }).join('')}</div></section>`;
  }

  function myCityView() {
    const c = S.cities[ui.city], f = S.player;
    const gens = R.officersIn(S, c.id, f).sort((a, b) => (a.acted - b.acted) || (b.lea + b.str + b.int + b.pol) - (a.lea + a.str + a.int + a.pol));
    const fs = R.foodSeasons(c);
    return `${head(c)}${statsGrid(c)}
      <p class="hint ${fs < 4 ? 'warn' : ''}">每季收金约 ${R.income(c)}，秋收粮约 ${R.harvest(c)}；存粮可支撑 ${fs === Infinity ? '很久' : fs + ' 季'}。</p>
      <section class="sec"><div class="sec-h"><h3 class="eyebrow">武将</h3><span class="sub">点武将下令，每人每季一道</span></div>
        ${gens.length ? `<ul class="gens">${gens.map(g => genItem(g)).join('')}</ul>` : '<p class="empty">城中无将，无法下令。可以从相邻的己方城调武将过来。</p>'}
      </section>
      ${peopleSec(c)}${neighborsSec(c)}`;
  }

  function otherCityView() {
    const c = S.cities[ui.city], f = S.player;
    const gens = c.owner ? R.officersIn(S, c.id, c.owner) : [];
    const hostile = R.isHostile(S, f, c);
    const launch = R.ADJ[c.id].map(id => S.cities[id]).filter(n => n.owner === f && R.idleIn(S, n.id, f).length && n.troops >= 1000);
    const touching = R.ADJ[c.id].some(id => S.cities[id].owner === f);
    let action = '';
    if (!hostile) action = `<p class="hint">与${esc(fname(c.owner))}结盟中，不能攻打。</p>`;
    else if (launch.length) {
      action = `<section class="sec"><h3 class="eyebrow">出兵</h3><div class="choices">${launch.map(n => {
        const leader = R.best(R.idleIn(S, n.id, f), 'lea');
        const o = R.oddsLabel(R.estimate(S, n.id, c.id, Math.floor(n.troops * 0.85), leader));
        return `<button class="choice ${fc(f)}" data-act="launch" data-from="${n.id}" data-target="${c.id}"><span class="flag sm">${fmark(f)}</span>
          <b>自${n.name}出征</b><span class="pill tone-${o.tone}">${o.text}</span>
          <small>${leader.name}领兵 · 城中兵 ${fmt(n.troops)}</small></button>`;
      }).join('')}</div></section>`;
    } else if (touching) action = '<p class="hint">相邻的己方城里没有待命武将，或兵不足一千，暂时打不了这里。</p>';
    else action = '<p class="hint">这座城不与我方接壤，要先攻下中间的城池。</p>';
    return `${head(c)}${statsGrid(c)}${action}
      <section class="sec"><h3 class="eyebrow">守将</h3>${gens.length
        ? `<ul class="gens">${gens.map(g => genItem(g, true)).join('')}</ul>`
        : `<p class="empty">${c.owner ? '城中无将，由守城校尉统兵。' : `${esc(c.keeper || '')}的部将据城自守，不会主动出击。`}</p>`}</section>
      ${neighborsSec(c)}`;
  }

  // ---------- 指令表单（出征 / 调动 / 登用 / 外交） ----------
  function formTargets() {
    const f = ui.form;
    if (!f) return [];
    const g = S.generals[f.gid], c = S.cities[g.city];
    if (f.cmd === 'attack') return R.ADJ[c.id].filter(id => R.isHostile(S, g.faction, S.cities[id]));
    if (f.cmd === 'move') return R.ADJ[c.id].filter(id => S.cities[id].owner === g.faction);
    return [];
  }
  function openForm(cmd, gid, preset) {
    const g = S.generals[gid], c = S.cities[g.city];
    ui.form = { cmd, gid };
    ui.city = c.id; ui.gen = gid;
    const t = formTargets();
    if (cmd === 'attack') {
      if (R.Siege && !/nostory/.test(location.hash)) R.Siege.preload();
      ui.form.target = preset && t.includes(preset.target) ? preset.target : t.slice().sort((a, b) => S.cities[a].troops - S.cities[b].troops)[0];
      ui.form.troops = Math.max(1000, Math.min(c.troops, Math.floor(c.troops * 0.85 / 100) * 100));
      ui.form.deputies = [];
    } else if (cmd === 'move') {
      ui.form.target = t[0];
      ui.form.troops = Math.floor(c.troops * 0.5 / 100) * 100;
    }
    render();
    if (isNarrow()) $('#panel').scrollIntoView({ behavior: motion ? 'smooth' : 'auto', block: 'start' });
  }
  // 出征提示：耗粮、留守，以及留守太少时提醒身后的敌军
  const troopHint = (c, n, target) => {
    const food = Math.round(n * 0.1), left = c.troops - n;
    const danger = R.ADJ[c.id].map(id => S.cities[id])
      .filter(x => x.id !== target && x.owner && R.isHostile(S, S.player, x))
      .sort((a, b) => b.troops - a.troops)[0];
    let warn = '';
    if (food > c.food) warn = ' · <span class="tone-bad">粮草不够</span>';
    else if (danger && left < danger.troops * 0.5) warn = `<br><span class="tone-bad">留守单薄：邻城${danger.name}有${esc(fname(danger.owner))}兵 ${fmt(danger.troops)}</span>`;
    return `耗粮 ${food}（城中存粮 ${c.food}）· 留守 ${fmt(left)}${warn}`;
  };
  const verdict = (r, o) => `<span class="dim">胜算</span><b class="tone-${o.tone}">${o.text}</b><small>攻守战力比 ${r.toFixed(2)}<br>到 1.6 几乎必克</small>`;

  function formView() {
    const f = ui.form, g = S.generals[f.gid], c = S.cities[g.city];
    const back = `<div class="topline"><button class="link" data-act="cancel">‹ 返回${c.name}</button></div>`;
    if (f.cmd === 'attack') {
      const cards = formTargets().map(id => {
        const t = S.cities[id], o = R.oddsLabel(R.estimate(S, c.id, id, f.troops, g));
        return `<button class="choice ${fc(t.owner)} ${f.target === id ? 'on' : ''}" data-act="pick" data-target="${id}">
          <span class="flag sm">${fmark(t.owner) || '中'}</span><b>${t.name}</b><span class="pill tone-${o.tone}" data-odds="${id}">${o.text}</span>
          <small>${t.owner ? esc(fname(t.owner)) : '中立 · ' + esc(t.keeper)} · 守军 ${fmt(t.troops)} · 城防 ${t.defense}</small></button>`;
      }).join('');
      const others = R.idleIn(S, c.id, g.faction).filter(x => x.id !== g.id);
      const deps = others.length ? others.map(x => {
        const on = f.deputies.includes(x.id), off = !on && f.deputies.length >= 2;
        return `<label class="dep ${off ? 'off' : ''}"><input type="checkbox" data-act="dep" value="${x.id}" ${on ? 'checked' : ''} ${off ? 'disabled' : ''}><b>${x.name}</b><small>武 ${x.str} · 智 ${x.int}</small></label>`;
      }).join('') : '<p class="hint">城中没有其他待命武将。</p>';
      const r = R.estimate(S, c.id, f.target, f.troops, g);
      return `${back}
        <header class="form-h">${face(g, 'bust', g.faction)}<div><span class="eyebrow">出征</span><h2>${g.name}<small>统 ${g.lea} · 自${c.name}发兵</small></h2></div></header>
        <section class="sec"><div class="sec-h"><h3 class="eyebrow">攻打哪座城</h3><span class="sub">也可以点地图上的红圈</span></div><div class="choices">${cards}</div></section>
        <section class="sec"><h3 class="eyebrow">带多少兵</h3>
          <div class="range"><input type="range" id="f-troops" min="1000" max="${c.troops}" step="100" value="${f.troops}" aria-label="出征兵力"><output id="f-out">${fmt(f.troops)}</output></div>
          <p class="hint" id="f-hint">${troopHint(c, f.troops, f.target)}</p></section>
        <section class="sec"><div class="sec-h"><h3 class="eyebrow">副将</h3><span class="sub">最多两位：武力高能单挑，智力高能用计</span></div><div class="deps">${deps}</div></section>
        <div class="verdict" id="f-verdict">${verdict(r, R.oddsLabel(r))}</div>
        <button class="primary wide" data-act="confirm" id="f-go">出征${S.cities[f.target].name}</button>`;
    }
    if (f.cmd === 'move') {
      const cards = formTargets().map(id => {
        const t = S.cities[id];
        return `<button class="choice ${fc(t.owner)} ${f.target === id ? 'on' : ''}" data-act="pick" data-target="${id}">
          <span class="flag sm">${fmark(t.owner)}</span><b>${t.name}</b><span></span>
          <small>兵 ${fmt(t.troops)} · 将 ${R.officersIn(S, id, g.faction).length} · 粮 ${t.food}</small></button>`;
      }).join('');
      return `${back}
        <header class="form-h">${face(g, 'bust', g.faction)}<div><span class="eyebrow">调动</span><h2>${g.name}<small>自${c.name}移驻</small></h2></div></header>
        <section class="sec"><h3 class="eyebrow">去哪座城</h3><div class="choices">${cards}</div></section>
        <section class="sec"><h3 class="eyebrow">随行兵力</h3>
          <div class="range"><input type="range" id="f-troops" min="0" max="${c.troops}" step="100" value="${f.troops}" aria-label="随行兵力"><output id="f-out">${fmt(f.troops)}</output></div>
          <p class="hint" id="f-hint">${moveHint(c, f)}</p></section>
        <button class="primary wide" data-act="confirm">调往${S.cities[f.target].name}</button>`;
    }
    if (f.cmd === 'employ') {
      const list = R.recruitableIn(S, c.id).map(t => {
        const wolong = t.wolong && S.factions[g.faction].ruler === 'liubei';
        const p = R.employChance(S, g.id, t.id);
        const tag = wolong ? `三顾茅庐 · 已拜访 ${S.flags.visits} 次` : `把握约 ${Math.round(p * 100)}%`;
        const tone = wolong ? 'warn' : p >= 0.5 ? 'good' : p >= 0.25 ? 'warn' : 'bad';
        return `<button class="choice ${fc(t.former)}" data-act="employ" data-target="${t.id}">${face(t)}
          <b>${t.name}</b><span class="pill tone-${tone}">${tag}</span>
          <small>${t.captive ? '俘虏' + (t.former ? ' · 原属' + esc(fname(t.former)) : '') : '在野'} · 统${t.lea} 武${t.str} 智${t.int} 政${t.pol}</small></button>`;
      }).join('');
      return `${back}
        <header class="form-h">${face(g, 'bust', g.faction)}<div><span class="eyebrow">登用</span><h2>${g.name}<small>政 ${g.pol} · 政治越高越容易说动</small></h2></div></header>
        <section class="sec"><h3 class="eyebrow">招揽谁</h3><div class="choices">${list}</div></section>`;
    }
    if (f.cmd === 'diplomacy') {
      const list = Object.values(S.factions).filter(x => x.alive && x.id !== g.faction).map(x => {
        const allied = R.isAllied(S, g.faction, x.id), p = R.allyChance(S, g.faction, x.id, g.int);
        const tag = allied ? `已结盟 · 剩${R.allyUntil(S, g.faction, x.id) - S.turn}季` : `把握约 ${Math.round(p * 100)}%`;
        const tone = allied ? 'good' : p >= 0.5 ? 'good' : p >= 0.3 ? 'warn' : 'bad';
        return `<button class="choice ${fc(x.id)}" data-act="ally" data-target="${x.id}" ${allied ? 'disabled' : ''}><span class="flag sm">${x.mark}</span>
          <b>${esc(x.name)}</b><span class="pill tone-${tone}">${tag}</span>
          <small>${R.citiesOf(S, x.id).length} 城 · 兵 ${fmt(R.factionStrength(S, x.id).troops)}</small></button>`;
      }).join('');
      return `${back}
        <header class="form-h">${face(g, 'bust', g.faction)}<div><span class="eyebrow">外交</span><h2>${g.name}<small>智 ${g.int} · 自${c.name}出使</small></h2></div></header>
        <p class="hint">花费金 200。结盟后两年内互不攻伐。有共同的强敌时更容易谈成，刚交过手则很难。</p>
        <section class="sec"><h3 class="eyebrow">与谁结盟</h3><div class="choices">${list}</div></section>`;
    }
    return back;
  }
  function moveHint(c, f) {
    const t = S.cities[f.target];
    return `${c.name}留守 ${fmt(c.troops - f.troops)} · ${t.name}将有 ${fmt(t.troops + f.troops)}`;
  }
  // 拖动兵力滑块时只更新相关文字，不整块重画（保持滑块的焦点）
  function liveForm() {
    const f = ui.form, g = S.generals[f.gid], c = S.cities[g.city];
    $('#f-out').textContent = fmt(f.troops);
    if (f.cmd === 'attack') {
      $('#f-hint').innerHTML = troopHint(c, f.troops, f.target);
      const r = R.estimate(S, c.id, f.target, f.troops, g);
      $('#f-verdict').innerHTML = verdict(r, R.oddsLabel(r));
      for (const el of document.querySelectorAll('[data-odds]')) {
        const o = R.oddsLabel(R.estimate(S, c.id, el.dataset.odds, f.troops, g));
        el.className = `pill tone-${o.tone}`; el.textContent = o.text;
      }
    } else {
      $('#f-hint').innerHTML = moveHint(c, f);
    }
  }

  // ---------- 执行指令 ----------
  function exec(gid, cmd, opt) {
    const res = R.doCommand(S, gid, cmd, opt || {});
    if (res.error) { toast(res.error, 'bad'); return; }
    ui.form = null; ui.gen = null;
    if (res.battle) {
      ui.city = res.battle.result === 'take' ? res.battle.to : res.battle.from;
      render();
      playSiege(res.battle, () => showBattle(res.battle));
    } else {
      render();
      const t = opt && opt.target && S.generals[opt.target];
      if (cmd === 'employ' && t && t.wolong && S.factions[S.player].ruler === 'liubei') {
        playStory(R.STORY.scene('wolong' + Math.min(3, S.flags.visits), S), () => toast(res.text, res.big ? 'big' : ''));
      } else if (cmd === 'employ' && res.joined) {
        playStory(R.STORY.join(S, S.generals[res.joined]), () => toast(res.text));
      } else toast(res.text, res.big ? 'big' : '');
    }
  }
  function endTurn() {
    if (S.over) { showOver(); return; }
    const reps = R.endTurn(S);
    ui.form = null; ui.gen = null;
    if (ui.city && S.cities[ui.city].owner !== S.player) ui.city = null;
    render();
    // 本季新触发、又与玩家有关的历史事件，先演剧情再看战报
    const fired = S.flags.fired, p = S.player, ids = [];
    if (fired.zhaoyun === S.turn && p === 'shu') ids.push('zhaoyun');
    if (fired.sunce === S.turn && p === 'wu') ids.push('sunce');
    if (fired.yuanshao === S.turn && p === 'yuan') ids.push('yuanshao');
    if (fired.sunliu === S.turn && (p === 'wu' || p === 'shu')) ids.push('sunliu');
    playQueue(ids, () => showReport(reps));
  }

  // ---------- 3D 攻城动画（见 siege3d.js）：玩家出征时先演一遍，再看战报 ----------
  function playSiege(b, done) {
    if (!R.Siege || /nostory/.test(location.hash)) { done(); return; }
    const css = f => getComputedStyle(document.documentElement).getPropertyValue('--' + (f || 'neutral')).trim();
    const head = (name, f) => { const g = Object.values(S.generals).find(x => x.name === name); return g ? face(g, 'head', f) : `<span class="flag md ${fc(f)}">${fmark(f) || '守'}</span>`; };
    R.Siege.play(b, {
      atkColor: css(b.attacker), defColor: css(b.defender), from: S.cities[b.from].name, to: S.cities[b.to].name,
      atkMark: fmark(b.attacker), defMark: fmark(b.defender) || (S.cities[b.to].keeper || '守').slice(0, 1), atkSurname: b.atkLead.slice(0, 1),
      atkHead: head(b.atkLead, b.attacker), defHead: head(b.defLead, b.defender),
    }, done);
  }

  // ---------- 军议、召见：用剧情对话的形式和军师、武将交谈，可以当场下令 ----------
  const rulerId = () => S.factions[S.player].ruler;
  const seatName = () => { const r = S.generals[rulerId()]; return r && r.faction === S.player ? S.cities[r.city].name : ''; };
  // 在某城找一位能做这件事、某项能力最高的待命武将
  const bestFor = (cityId, cmd, stat) => R.best(R.idleIn(S, cityId, S.player).filter(x => R.canDo(S, x.id, cmd).ok), stat);
  const doAt = (g, cmd, opt) => { closeProfile(); selectCity(g.city, false); exec(g.id, cmd, opt); };
  function council() {
    const adv = R.AI.advise(S), a = adv.advisor, ruler = rulerId();
    if (!a || a.id === ruler) { toast('帐下还没有可以议事的谋士'); return; }
    const lines = [{ text: `${R.dateLabel(S)}，${seatName()}府中。${S.factions[S.player].name}召集众将议事。` },
      { who: a.id, text: adv.tips.length > 1 ? `主公，臣有${'一二三'[Math.min(3, adv.tips.length) - 1]}事启奏。` : '主公，臣有一事启奏。' }];
    adv.tips.forEach((tip, i) => {
      const last = i === adv.tips.length - 1, choices = [], act = tip.act || {}, c = tip.city && S.cities[tip.city];
      const ok = (text, fn, reply) => choices.push({ text, act: fn, end: true, then: reply ? [reply] : [{ who: a.id, text: '主公英明。' }] });
      if (act.kind === 'attack' && S.generals[act.gen]) {
        const g = S.generals[act.gen], t = S.cities[act.target];
        ok(`就依此计，令${g.name}出兵${t.name}！`, () => { closeProfile(); if (R.canDo(S, g.id, 'attack').ok) openForm('attack', g.id, { target: t.id }); else selectCity(c.id, false); }, { who: g.id, text: g.str >= 85 ? '末将得令！' : '遵命！' });
      } else if (act.kind === 'farm' && c) {
        const g = bestFor(c.id, 'farm', 'pol');
        if (g) ok(`传令${c.name}，由${g.name}督劝农桑。`, () => doAt(g, 'farm'));
      } else if (act.kind === 'recruit' && c) {
        const g = bestFor(c.id, 'recruit', 'lea');
        if (g) ok(`传令${c.name}，由${g.name}征兵固守。`, () => doAt(g, 'recruit'));
      } else if (act.kind === 'employ' && S.generals[act.target]) {
        const t = S.generals[act.target], g = bestFor(t.city, 'employ', 'pol');
        if (g) ok(`遣${g.name}去请${t.name}。`, () => doAt(g, 'employ', { target: t.id }));
      } else if (act.kind === 'ally' && S.factions[act.target]) {
        const g = R.best(R.generalsOf(S, S.player).filter(x => !x.acted && R.canDo(S, x.id, 'diplomacy').ok), 'int');
        if (g) ok(`遣${g.name}出使${S.factions[act.target].name}。`, () => doAt(g, 'diplomacy', { target: act.target }));
      }
      if (c && !choices.length) ok(`去${c.name}看看。`, () => { closeProfile(); selectCity(c.id, false); }, { who: a.id, text: '主公请。' });
      choices.push({ text: last ? '知道了。' : '还有呢？' });
      lines.push({ who: a.id, answer: ruler, text: tip.text, choices });
    });
    lines.push({ who: a.id, text: '臣言尽于此，请主公定夺。' });
    playStory({ bg: 'palace', place: `${seatName()} · 议事`, lines });
  }
  function audience(id) {
    const g = S.generals[id], ruler = rulerId(), c = S.cities[g.city];
    if (!g || g.faction !== S.player || id === ruler) return;
    const war = g.str >= 85 && g.int < 75, wise = g.int >= 85, admin = !wise && g.pol >= 85;
    const self = war ? '末将' : '臣', fs = R.foodSeasons(c);
    const hostile = R.ADJ[c.id].map(x => S.cities[x]).filter(n => R.isHostile(S, S.player, n));
    const threat = hostile.filter(n => n.owner).sort((x, y) => y.troops - x.troops)[0];
    const send = Math.floor(c.troops * 0.85);
    const chance = !g.acted && c.troops >= 4000 ? hostile.map(n => ({ n, r: R.estimate(S, c.id, n.id, send, g) })).filter(x => x.r >= 1.3).sort((x, y) => y.r - x.r)[0] : null;
    const lines = [{ text: `${g.name}入帐拜见。` },
      { who: g.id, text: war ? `主公唤${self}，可是要打仗了？` : wise ? '主公召见，必有要事相商。' : admin ? `${c.name}诸事，臣都记在心上，主公请问。` : `${self}在。主公有何吩咐？` }];
    if (g.city !== S.generals[ruler].city) lines.push({ who: g.id, text: `${self}自${c.name}赶来。` });
    if (threat && threat.troops > c.troops * 1.2) lines.push({ who: g.id, text: `${threat.name}有${fname(threat.owner)}兵${fmt(threat.troops)}，${c.name}只有${fmt(c.troops)}，还请主公早作防备。` });
    if (chance) lines.push({ who: g.id, text: war ? `${chance.n.name}守军不过${fmt(chance.n.troops)}，${self}愿领兵取之！` : `${chance.n.name}守备空虚，可以图之。` });
    if (fs < 4) lines.push({ who: g.id, text: `${c.name}存粮只够${fs}季，须早开农田。` });
    if (lines.length === 2 || (!chance && fs >= 4 && !(threat && threat.troops > c.troops * 1.2))) lines.push({ who: g.id, text: `${c.name}兵${fmt(c.troops)}、粮${c.food}，眼下还算安定。` });
    if (g.acted) {
      lines.push({ who: g.id, text: `${self}本季${DID[g.did] || '已领命'}，正在办理。` });
      lines.push({ who: ruler, text: '好，辛苦了。' });
    } else {
      const yes = war ? '得令！' : '臣领命。', choices = [];
      const pick = (text, fn) => choices.push({ text, act: fn, end: true, then: [{ who: g.id, text: yes }] });
      if (chance && R.canDo(S, g.id, 'attack').ok) pick(`准！命你出征${chance.n.name}。`, () => { closeProfile(); openForm('attack', g.id, { target: chance.n.id }); });
      if (threat && threat.troops > c.troops && R.canDo(S, g.id, 'recruit').ok) pick('速速征兵固守。', () => doAt(g, 'recruit'));
      const dev = fs < 6 || c.farm < c.commerce ? 'farm' : 'commerce';
      if (R.canDo(S, g.id, dev).ok) pick(dev === 'farm' ? '且去督劝农桑。' : '且去整顿市集。', () => doAt(g, dev));
      if (c.troops >= 1000 && c.train < 90 && R.canDo(S, g.id, 'train').ok) pick('加紧操练兵马。', () => doAt(g, 'train'));
      choices.push({ text: '辛苦了，下去歇着吧。', then: [{ who: g.id, text: `${self}告退。` }] });
      lines.push({ who: ruler, text: '依你看，眼下该做什么？', choices });
    }
    playStory({ bg: 'palace', place: `${seatName()} · 召见`, lines });
  }

  // ---------- 剧情对话（演出见 scene.js，台词见 story.js） ----------
  const sceneHooks = {
    art: g => { const h = R.portrait(g, 'full'); return h.startsWith('<img') ? h : ''; }, // 没有画好的立绘就不上台
    head: g => R.portrait(g, 'head'),
    color: g => getComputedStyle(document.documentElement).getPropertyValue('--' + (g.faction || 'neutral')).trim(),
    face: g => (R.FACES && R.FACES[g.id]) || [0.5, 0.42],
  };
  // 把剧本里的武将 id 换成武将；已经不在了（阵亡、被俘）的人，他的台词跳过
  function castLines(lines) {
    const out = [];
    for (const l of lines) {
      const g = l.who ? S.generals[l.who] : null;
      if (l.who && (!g || !g.alive || g.captive)) continue;
      const ans = l.answer && S.generals[l.answer];
      out.push({ who: g, answer: ans && ans.alive && !ans.captive ? ans : undefined, text: l.text,
        choices: l.choices && l.choices.map(c => ({ text: c.text, act: c.act, end: c.end, then: castLines(c.then || []) })) });
    }
    return out;
  }
  function playStory(sc, done) {
    const fin = done || (() => {});
    // 网址末尾加 #nostory 可以关掉剧情和攻城动画（自动试玩、录视频的脚本用）
    const lines = sc && R.Scene && !/nostory/.test(location.hash) ? castLines(sc.lines) : [];
    if (!lines.length) { fin(); return; }
    R.Scene.play({ bg: sc.bg, place: sc.place, lines }, sceneHooks, fin);
  }
  function playQueue(ids, done) {
    const next = () => { const id = ids.shift(); if (!id) { done(); return; } playStory(R.STORY.scene(id, S), next); };
    next();
  }

  // ---------- 浮层 ----------
  function openModal(html, kind, onClose) {
    const o = $('#overlay');
    clearTimeout(btTimer);
    o.innerHTML = `<div class="scrim" ${kind === 'battle' || kind === 'over' ? '' : 'data-act="close"'}></div><div class="modal ${kind}" role="dialog" aria-modal="true">${html}</div>`;
    o.hidden = false;
    modalKind = kind; afterModal = onClose || null;
    const b = o.querySelector('.modal .primary:not([hidden]), .modal button:not([hidden])');
    if (b) b.focus({ preventScroll: true });
  }
  function closeModal() {
    const o = $('#overlay');
    if (o.hidden) return;
    const kind = modalKind, fn = afterModal;
    clearTimeout(btTimer);
    o.hidden = true; o.innerHTML = ''; modalKind = null; afterModal = null; battleSkip = null;
    if (fn) fn();
    else if (S && S.over && !preview && kind !== 'over') showOver();
  }

  function showBattle(b) {
    const max = Math.max(b.a0, b.d0, 1);
    openModal(`
      <div class="bt-head">
        <div class="side ${fc(b.attacker)}">${leadFace(b.atkLead, b.attacker)}<div><b>${esc(b.atkLead)}</b><small>${esc(b.atkName)}军 · 攻</small></div></div>
        <div class="bt-vs">战</div>
        <div class="side def ${fc(b.defender)}"><div><b>${esc(b.defLead)}</b><small>${esc(b.defName)}${b.defender ? '军' : ''} · 守</small></div>${leadFace(b.defLead, b.defender)}</div>
      </div>
      <p class="bt-place">${S.cities[b.from].name}　→　${S.cities[b.to].name}</p>
      <div class="forces">
        <div class="force ${fc(b.attacker)}"><span class="who">攻方</span><div class="track"><i id="bt-a" style="width:${b.a0 / max * 100}%"></i></div><span class="n" id="bt-an">${fmt(b.a0)}</span></div>
        <div class="force ${fc(b.defender)}"><span class="who">守方</span><div class="track"><i id="bt-d" style="width:${b.d0 / max * 100}%"></i></div><span class="n" id="bt-dn">${fmt(b.d0)}</span></div>
      </div>
      <ol class="bt-log" id="bt-log"></ol>
      <div class="bt-stamp ${b.result === 'take' ? '' : 'lose'}" id="bt-stamp" hidden>${b.result === 'take' ? '攻克' : '败退'}</div>
      <div class="modal-actions"><button class="ghost" data-act="bt-skip" id="bt-skip">跳过</button><button class="primary" data-act="close" id="bt-done" hidden>继续</button></div>`, 'battle');
    const tail = [];
    if (b.captured.length) tail.push({ kind: 'end', text: `生擒${b.captured.join('、')}，押入城中。`, a: b.a, d: 0 });
    if (b.fled.length) tail.push({ kind: 'round', text: `${b.fled.join('、')}突围而走。`, a: b.a, d: 0 });
    const steps = b.steps.concat(tail);
    let i = 0;
    const show = st => {
      $('#bt-log').insertAdjacentHTML('beforeend', `<li class="${st.kind}">${esc(st.text)}</li>`);
      $('#bt-a').style.width = (st.a / max * 100) + '%'; $('#bt-an').textContent = fmt(st.a);
      $('#bt-d').style.width = (st.d / max * 100) + '%'; $('#bt-dn').textContent = fmt(st.d);
    };
    const finish = () => {
      $('#bt-stamp').hidden = false; $('#bt-skip').hidden = true;
      const d = $('#bt-done'); d.hidden = false; d.focus({ preventScroll: true });
      battleSkip = null;
    };
    const next = () => {
      if (i >= steps.length) { finish(); return; }
      show(steps[i++]);
      btTimer = setTimeout(next, 760);
    };
    battleSkip = () => { clearTimeout(btTimer); while (i < steps.length) show(steps[i++]); finish(); };
    if (motion) btTimer = setTimeout(next, 300); else battleSkip();
  }

  function showReport(reps) {
    const date = R.dateLabel(S);
    const events = reps.filter(r => r.kind === 'event');
    const rest = reps.filter(r => r.kind !== 'event');
    const mine = rest.filter(r => r.mine), others = rest.filter(r => !r.mine);
    const li = r => `<li class="${r.mine ? '' : 'other'} ${r.warn ? 'warn' : ''}"><span class="kind k-${r.kind}">${KIND[r.kind] || '事'}</span><span class="txt">${esc(r.text)}</span></li>`;
    openModal(`
      <header class="modal-h"><span class="eyebrow">${S.turn === 1 ? '开局' : '本季战报'}</span><h2>${date}</h2></header>
      ${events.map(e => `<article class="notice"><span class="eyebrow">${e.mine ? '大事' : '天下大事'}</span><h3>${esc(e.title)}</h3><p>${esc(e.text)}</p></article>`).join('')}
      ${S.turn === 1 ? '<p class="hint">建安五年之内，各路诸侯忙于自保，不会主动来犯；但你先打谁，谁就会还击。</p>' : `<section class="sec"><h3 class="eyebrow">我方境内</h3>${mine.length ? `<ul class="rep">${mine.map(li).join('')}</ul>` : '<p class="quiet">本季我方境内无事。</p>'}</section>`}
      ${others.length ? `<details class="rep-more"><summary>各方动向 ${others.length} 条</summary><ul class="rep">${others.map(li).join('')}</ul></details>` : ''}
      <div class="modal-actions"><button class="primary" data-act="close">${S.over ? '查看结局' : `开始${date.split(' · ')[1]}季政务`}</button></div>`, 'report');
  }

  function showChronicle() {
    const keep = r => !ui.chronMine || r.mine || r.kind === 'event' || r.kind === 'battle';
    const groups = [];
    for (const r of S.chronicle.filter(keep).slice().reverse()) {
      if (!groups.length || groups[groups.length - 1].date !== r.date) groups.push({ date: r.date, items: [] });
      groups[groups.length - 1].items.push(r);
    }
    const body = groups.map(g => `<div class="sec"><h3>${g.date}</h3><ul class="rep">${g.items.map(r =>
      `<li class="${r.mine ? '' : 'other'} ${r.warn ? 'warn' : ''}"><span class="kind k-${r.kind}">${KIND[r.kind] || '事'}</span><span class="txt">${r.title ? `<b>${esc(r.title)}</b>　` : ''}${esc(r.text)}</span></li>`).join('')}</ul></div>`).join('');
    openModal(`
      <header class="modal-h"><span class="eyebrow">史册</span><h2>${esc(S.factions[S.player].name)}纪事</h2></header>
      <div class="seg" role="group" aria-label="筛选"><button data-act="chron-mine" class="${ui.chronMine ? 'on' : ''}">我方与大事</button><button data-act="chron-all" class="${ui.chronMine ? '' : 'on'}">全部</button></div>
      <div class="chron">${body || '<p class="quiet">尚无记载。</p>'}</div>
      <div class="modal-actions"><button class="primary" data-act="close">合上史册</button></div>`, 'chronicle');
  }

  function showOver() {
    const win = S.over.result === 'win', st = R.factionStrength(S, S.player);
    const years = Math.max(1, Math.round((S.turn - 1) / 4));
    openModal(`
      <span class="eyebrow">${R.dateLabel(S)}</span>
      <h2>${win ? '天下归心' : '大业未竟'}</h2>
      <p class="dim">${win
        ? `${esc(S.factions[S.player].name)}已据 ${st.cities} 城，群雄束手，天下大势已定。`
        : `${esc(S.factions[S.player].name)}失去了最后的城池。胜败乃兵家常事，可再整旗鼓。`}</p>
      <div class="facts">
        <div><b>${years}</b><span>年</span></div><div><b>${st.cities}</b><span>城</span></div>
        <div><b>${R.generalsOf(S, S.player).length}</b><span>将</span></div>
        <div><b>${S.chronicle.filter(r => r.kind === 'battle' && r.mine).length}</b><span>战</span></div>
      </div>
      <div class="modal-actions" style="justify-content:center"><button class="ghost" data-act="close">再看看舆图</button><button class="primary" data-act="restart">再开一局</button></div>`, 'over');
  }

  function toast(text, tone) {
    const t = $('#toast');
    t.className = tone || '';
    t.innerHTML = `<span class="chop">${tone === 'bad' ? '否' : '令'}</span><span>${esc(text)}</span>`;
    requestAnimationFrame(() => t.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), tone === 'big' ? 4600 : 2800);
  }

  // ---------- 武将详情 ----------
  const sum4 = g => g.lea + g.str + g.int + g.pol;
  const isRuler = g => !!(g.faction && S.factions[g.faction].ruler === g.id);
  // 列表：我方，或天下所有已知武将（隐居未被访得的不列）。本家在前，其次各势力、在野和俘虏
  function profileList(mode) {
    const order = [S.player, ...Object.keys(S.factions).filter(f => f !== S.player), null];
    return Object.values(S.generals)
      .filter(g => g.alive && !g.hidden && (mode === 'all' || g.faction === S.player))
      .sort((a, b) => order.indexOf(a.faction) - order.indexOf(b.faction) || isRuler(b) - isRuler(a) || sum4(b) - sum4(a));
  }
  function openProfile(id, mode) {
    const g = S.generals[id];
    if (!g) return;
    ui.profile = { id, mode: mode || (g.faction === S.player ? 'mine' : 'all') };
    showProfile(true);
  }
  function closeProfile() {
    ui.profile = null;
    $('#profile').hidden = true; $('#profile').innerHTML = '';
  }
  // 单挑：双方武力各加 0~30 的随机数比大小。算对上武力 70 的对手时的胜率
  function duelOdds(str) {
    const t = 70 - str;
    if (t <= -30) return 1;
    if (t >= 30) return 0;
    return t <= 0 ? 1 - (t + 30) ** 2 / 1800 : (30 - t) ** 2 / 1800;
  }
  // 所长：全部按 rules.js 里的公式算，数字就是游戏里真实的效果
  function talents(g) {
    const pct = v => Math.round(v * 100) + '%';
    const lead = (0.7 + g.lea / 300) / (0.7 + 50 / 300);
    return [
      { k: '统', name: '统兵', val: '战力 ×' + lead.toFixed(2), note: '带兵出征、守城时，每名士卒的战力（以统率 50 为 1）', stat: g.lea },
      { k: '斗', name: '单挑', val: pct(duelOdds(g.str)), note: '阵前单挑武力 70 的对手时的胜率', stat: g.str },
      { k: '计', name: '火计', val: pct(R.clamp(0.12 + (g.int - 60) / 90, 0, 0.55)), note: '出征时对智力 60 的守将用计成功的把握', stat: g.int },
      { k: '政', name: '开发', val: '+' + R.gainDev(g), note: '每次开发商业或农业的增量', stat: g.pol },
      { k: '募', name: '征兵', val: '+' + fmt(R.gainRecruit(g)), note: '每次征兵大约募得的兵数', stat: g.lea },
      { k: '练', name: '训练', val: '+' + R.gainTrain(g), note: '每次训练提升的训练度', stat: g.lea },
      { k: '访', name: '寻访', val: pct(Math.min(1, 0.25 + g.int / 250)), note: '城中有隐士时，搜索访得的把握', stat: g.int },
      { k: '招', name: '登用', val: pct(R.clamp(0.25 + (g.pol - 50) / 120, 0.05, 0.9)), note: '劝说在野贤士的把握（俘虏要再低一成）', stat: g.pol },
    ];
  }
  function tagsOf(g) {
    const t = [];
    if (isRuler(g)) t.push('君主');
    if (g.lea >= 90) t.push('统帅');
    if (g.str >= 90) t.push('猛将');
    if (g.int >= 90) t.push('智囊');
    if (g.pol >= 90) t.push('能臣');
    if (g.loyal) t.push('忠义');
    if (g.wolong) t.push('隐士');
    return t;
  }
  function profileState(g) {
    const c = S.cities[g.city];
    if (g.captive) return `被俘 · 囚于${c.name}`;
    if (!g.faction) return `在野 · 隐于${c.name}`;
    if (g.faction !== S.player) return `${esc(fname(g.faction))}麾下 · 驻${c.name}`;
    return `${g.acted ? DID[g.did] || '已行动' : '待命'} · 驻${c.name}`;
  }
  function showProfile(fresh) {
    const P = ui.profile, list = profileList(P.mode);
    if (!list.some(x => x.id === P.id)) P.mode = 'all';
    const g = S.generals[P.id], L = R.LORE[g.id] || {};
    const f = g.faction, mine = f === S.player;
    const rail = profileList(P.mode).map(x => `<button class="pf-pick ${fc(x.faction)} ${x.id === g.id ? 'on' : ''}" data-act="profile" data-gen="${x.id}" data-mode="${P.mode}" aria-label="${esc(x.name)}" ${x.id === g.id ? 'aria-current="true"' : ''}>
        ${face(x, 'head')}<span>${esc(x.name)}</span></button>`).join('');
    const bars = [['lea', '统率'], ['str', '武力'], ['int', '智力'], ['pol', '政治']].map(([k, n]) =>
      `<div class="pf-stat ${g[k] >= 90 ? 'hi' : ''}"><dt>${n}</dt><div class="meter"><i style="width:${g[k]}%"></i></div><dd>${g[k]}</dd></div>`).join('');
    const tal = talents(g).map(t => `<div class="pf-tal ${t.stat >= 85 ? 'hi' : ''}" title="${esc(t.note)}"><span class="ico">${t.k}</span><b>${t.name}</b><span class="v">${t.val}</span><small>${esc(t.note)}</small></div>`).join('');
    const canOrder = mine && !g.acted && !S.over;
    const nMine = profileList('mine').length, nAll = profileList('all').length;
    $('#profile').className = fc(f);
    $('#profile').innerHTML = `
      <header class="pf-top">
        <button class="ghost" data-act="profile-close">‹ 返回</button>
        <div class="seg" role="group" aria-label="名录"><button data-act="profile-mode" data-mode="mine" class="${P.mode === 'mine' ? 'on' : ''}">我方 ${nMine}</button><button data-act="profile-mode" data-mode="all" class="${P.mode === 'all' ? 'on' : ''}">天下 ${nAll}</button></div>
      </header>
      <nav class="pf-rail" aria-label="武将名录">${rail}</nav>
      <div class="pf-stage">
        <span class="pf-ink" aria-hidden="true">${esc(g.name.slice(-1))}</span>
        ${(art => `<div class="pf-art ${art.startsWith('<img') ? 'card' : 'sketch'}">${art}</div>`)(R.portrait(g, 'full'))}
      </div>
      <section class="pf-info">
        <div class="pf-name">
          <span class="flag md">${fmark(f) || (g.captive ? '囚' : '野')}</span>
          <h2>${esc(g.name)}</h2>${L.zi ? `<span class="zi">字${esc(L.zi)}</span>` : ''}
        </div>
        ${L.title ? `<p class="pf-title"><span>称号</span>${esc(L.title)}</p>` : ''}
        <p class="pf-meta">${profileState(g)}${L.from ? ` · ${esc(L.from)}人` : ''}</p>
        ${tagsOf(g).length ? `<p class="pf-tags">${tagsOf(g).map(t => `<span>${t}</span>`).join('')}</p>` : ''}
        <dl class="pf-stats">${bars}<div class="pf-sum"><dt>四维合计</dt><dd>${sum4(g)}</dd></div></dl>
        <section class="pf-sec"><h3 class="eyebrow">所长</h3><div class="pf-tals">${tal}</div></section>
        ${L.basis ? `<section class="pf-sec"><h3 class="eyebrow">列传</h3><p class="pf-bio">${esc(L.basis)}</p></section>` : ''}
        <div class="pf-act">${mine && !isRuler(g) && !S.over ? `<button class="primary" data-act="audience" data-gen="${g.id}">召见${esc(g.name)}</button>` : ''}
          ${mine && isRuler(g) && !S.over ? '<button class="primary" data-act="council">召集军议</button>' : ''}
          ${canOrder ? `<button class="ghost" data-act="profile-order" data-gen="${g.id}">去${S.cities[g.city].name}下令</button>` : ''}
          <button class="ghost" data-act="profile-close">返回舆图</button></div>
      </section>`;
    $('#profile').hidden = false;
    const on = $('#profile .pf-pick.on');
    if (on) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (fresh) { $('#profile').scrollTop = 0; const b = $('#profile .pf-top .ghost'); if (b) b.focus({ preventScroll: true }); }
  }
  function stepProfile(d) {
    const list = profileList(ui.profile.mode), i = list.findIndex(x => x.id === ui.profile.id);
    if (!list.length) return;
    ui.profile.id = list[(i + d + list.length) % list.length].id;
    showProfile();
  }

  // ---------- 开场 ----------
  function showTitle() {
    const saved = readSave();
    const all = Object.keys(R.CITIES).length, need = Math.ceil(all * 2 / 3);
    const lords = Object.entries(R.FACTIONS).map(([id, f]) => {
      const cities = Object.values(R.CITIES).filter(c => c.owner === id);
      const gens = Object.values(R.GENERALS).filter(g => g.faction === id).length;
      const troops = cities.reduce((t, c) => t + c.troops, 0);
      const tone = f.level === '易' ? 'good' : f.level === '中' ? 'warn' : 'bad';
      return `<button class="lord ${fc(id)}" data-act="start" data-faction="${id}">
        <span class="top">${face(Object.assign({ id: f.ruler }, R.GENERALS[f.ruler]), 'bust', id)}<span class="lname">${f.name}</span><span class="pill lvl tone-${tone}">${f.level}</span></span>
        <span class="facts"><span>${cities.length} 城</span><span>${gens} 将</span><span>兵 ${fmt(troops)}</span></span>
        <p>${esc(f.blurb)}</p></button>`;
    }).join('');
    const resume = saved && !saved.over
      ? `<div class="resume ${fc(saved.player)}"><span class="flag md">${saved.factions[saved.player].mark}</span>
          <div class="what"><b>${esc(saved.factions[saved.player].name)}</b><small>${R.dateLabel(saved)} · ${Object.values(saved.cities).filter(c => c.owner === saved.player).length} 城 · 存档在本浏览器</small></div>
          <button class="primary" data-act="resume">继续上次</button></div>` : '';
    $('#title').innerHTML = `<div class="ts">
      <div class="ts-logo"><h1>逐鹿</h1><span class="ts-seal"><span>三</span><span>国</span></span></div>
      <p class="ts-sub">${R.SCENARIO.name} · 建安五年</p>
      <p class="ts-intro">${esc(R.SCENARIO.intro)}</p>
      ${resume}
      <section class="sec"><div class="sec-h"><h2 class="eyebrow">择一明主</h2><span class="sub">${resume ? '开新局会覆盖上面的存档' : '难度：易 · 中 · 难'}</span></div>
        <div class="lords">${lords}</div></section>
      <div class="ts-rules">
        <div><b>一季一令</b><span>每季给每位武将下一道命令：开发、征兵、训练、出征、登用、外交。</span></div>
        <div><b>先得 ${need} 城者胜</b><span>天下共 ${all} 城。攻下相邻的城池扩张地盘，丢光城池即告失败。</span></div>
        <div><b>军师进言</b><span>看不清局势时，先读军师的建议：哪里缺粮，哪里可取，谁可招揽。</span></div>
      </div></div>`;
    $('#title').hidden = false;
    $('#title').scrollTop = 0;
    const first = $('#title [data-act="resume"]');
    if (first) first.focus({ preventScroll: true });
  }
  function startGame(fid) {
    S = R.newGame(fid); preview = false;
    ui.city = null; ui.gen = null; ui.form = null;
    $('#title').hidden = true;
    render();
    const seat = S.generals[S.factions[fid].ruler].city;
    centerOn(seat);
    playQueue(['intro_' + fid], () => showReport(S.reports));
  }
  function resumeGame() {
    const saved = readSave();
    if (saved) S = saved;
    preview = false;
    ui.city = null; ui.gen = null; ui.form = null;
    $('#title').hidden = true;
    render();
    centerOn(S.generals[S.factions[S.player].ruler] && S.generals[S.factions[S.player].ruler].city);
  }
  function enterTitle() {
    if (!S || preview) { S = R.newGame('wei', 20001); preview = true; }
    render();
    showTitle();
  }

  // ---------- 总渲染 ----------
  function render() {
    if (!S) return;
    ensureView();
    renderMap();
    $('#app').classList.toggle('preview', preview);
    if (preview) { $('#bar').innerHTML = ''; $('#panel').innerHTML = ''; return; }
    renderBar();
    renderPanel();
    save();
  }
  function selectCity(id, fromMap) {
    if (preview) return;
    if (ui.form && formTargets().includes(id)) { ui.form.target = id; render(); return; }
    ui.form = null; ui.gen = null; ui.city = id;
    render();
    if (sandboxOn() && !fromMap) R.Sandbox.focus(id);
    if (isNarrow()) {
      if (fromMap) $('#panel').scrollIntoView({ behavior: motion ? 'smooth' : 'auto', block: 'start' });
      else centerOn(id);
    } else $('#panel').scrollTop = 0;
  }

  // ---------- 事件 ----------
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act], [data-city]');
    if (!el) return;
    const act = el.dataset.act;
    if (!act) { selectCity(el.dataset.city, true); return; }
    switch (act) {
      case 'city': selectCity(el.dataset.city, false); break;
      case 'home': ui.city = null; ui.gen = null; ui.form = null; render(); break;
      case 'gen': ui.gen = ui.gen === el.dataset.gen ? null : el.dataset.gen; render(); break;
      case 'cmd': {
        const { cmd, gen } = el.dataset;
        if (FORM_CMDS.includes(cmd)) openForm(cmd, gen);
        else exec(gen, cmd);
        break;
      }
      case 'pick': ui.form.target = el.dataset.target; render(); break;
      case 'cancel': ui.form = null; render(); break;
      case 'confirm': {
        const f = ui.form;
        exec(f.gid, f.cmd, { target: f.target, troops: f.troops, deputies: f.deputies });
        break;
      }
      case 'employ': exec(ui.form.gid, 'employ', { target: el.dataset.target }); break;
      case 'ally': exec(ui.form.gid, 'diplomacy', { target: el.dataset.target }); break;
      case 'launch': {
        const leader = R.best(R.idleIn(S, el.dataset.from, S.player), 'lea');
        if (leader) openForm('attack', leader.id, { target: el.dataset.target });
        break;
      }
      case 'quick-employ': {
        const t = S.generals[el.dataset.target];
        const g = R.best(R.idleIn(S, t.city, S.player), 'pol');
        if (g) exec(g.id, 'employ', { target: t.id });
        break;
      }
      case 'end': endTurn(); break;
      case 'chronicle': showChronicle(); break;
      case 'view3d': setView(!view3d); break;
      case 'roster': {
        const ruler = S.generals[S.factions[S.player].ruler];
        openProfile(ruler && ruler.faction === S.player ? ruler.id : (profileList('mine')[0] || {}).id, 'mine');
        break;
      }
      case 'profile': openProfile(el.dataset.gen, el.dataset.mode); break;
      case 'profile-mode': {
        ui.profile.mode = el.dataset.mode;
        const list = profileList(ui.profile.mode);
        if (!list.some(x => x.id === ui.profile.id) && list.length) ui.profile.id = list[0].id;
        showProfile();
        break;
      }
      case 'profile-close': closeProfile(); break;
      case 'council': council(); break;
      case 'audience': audience(el.dataset.gen); break;
      case 'profile-order': {
        const g = S.generals[el.dataset.gen];
        closeProfile();
        selectCity(g.city, false);
        ui.gen = g.id; render();
        break;
      }
      case 'chron-mine': ui.chronMine = true; showChronicle(); break;
      case 'chron-all': ui.chronMine = false; showChronicle(); break;
      case 'close': closeModal(); break;
      case 'bt-skip': if (battleSkip) battleSkip(); break;
      case 'start': closeModal(); startGame(el.dataset.faction); break;
      case 'resume': resumeGame(); break;
      case 'menu': save(); closeProfile(); showTitle(); break;
      case 'restart': afterModal = null; modalKind = 'over'; closeModal(); dropSave(); S = null; enterTitle(); break;
    }
  });
  document.addEventListener('input', e => {
    if (e.target.id === 'f-troops' && ui.form) { ui.form.troops = Number(e.target.value); liveForm(); }
  });
  document.addEventListener('change', e => {
    if (e.target.dataset.act === 'dep' && ui.form) {
      const id = e.target.value, list = ui.form.deputies;
      ui.form.deputies = e.target.checked ? list.concat(id).slice(0, 2) : list.filter(x => x !== id);
      renderPanel();
    }
    if (e.target.id === 'f-troops' && ui.form) save();
  });
  document.addEventListener('keydown', e => {
    if ((R.Scene && R.Scene.active()) || (R.Siege && R.Siege.active())) return;
    const city = e.target.closest && e.target.closest('g.city');
    if (city && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); selectCity(city.dataset.city, true); return; }
    if (ui.profile && $('#overlay').hidden) {
      if (e.key === 'Escape') { closeProfile(); return; }
      if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(e.key) && !e.target.closest('input, .seg')) {
        e.preventDefault(); stepProfile(e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1); return;
      }
    }
    if (e.key !== 'Escape') return;
    if (!$('#overlay').hidden) { if (battleSkip) battleSkip(); else if (modalKind !== 'over') closeModal(); return; }
    if (!$('#title').hidden || preview) return;
    if (ui.form) { ui.form = null; render(); } else if (ui.city) { ui.city = null; ui.gen = null; render(); }
  });

  // ---------- 启动 ----------
  function boot(data) {
    buildMap();
    if (data && data.S) {
      S = data.S; preview = false; ui.city = data.city || null;
      render();
    } else enterTitle();
  }
  boot({});
})();
