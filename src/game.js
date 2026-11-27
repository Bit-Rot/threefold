// Game controller + HTML UI for every screen.
import * as THREE from 'three';
import { Battle, DRAW_PER_TURN, MAX_HAND } from './engine/battle.js';
import * as R from './engine/run.js';
import { CARDS, CARD_LIST, EVO_RECIPES, RARITY_COLOR, TRIBES, cardDef } from './data/cards.js';
import { GEMS, GEM_LIST } from './data/gems.js';
import { RELICS, RELIC_LIST } from './data/relics.js';
import { LOCATIONS, LOCATION_LIST } from './data/locations.js';
import { HOME_UPGRADES } from './data/home.js';
import { OPPONENTS, BOSSES } from './data/enemies.js';
import { WARDENS, WARDEN_LIST } from './data/wardens.js';
import { EVENTS } from './data/events.js';
import { UNLOCKS, UNLOCK_MAP, HEAT } from './data/meta.js';
import { loadMeta, saveMeta, loadRun, saveRun, clearRun } from './core/save.js';
import { cardURL, instURL, glyphURL, enemyURL, artURL } from './art/cardRender.js';
import { Board } from './three/board.js';
import { MenuScene } from './three/menuScene.js';
import { sfx, setSound } from './audio.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const G = { meta: loadMeta(), run: null, screen: 'title', battle: null, sel: null, moveSel: null, modal: null, toast: null, archiveTab: 'Warden', codexTab: 'Cards', heat: 0, warden: 'bastion' };
window.__G = G;

// ---------------- renderer ----------------
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const board = new Board(renderer);
const menu = new MenuScene(renderer);
let mode = 'menu';

function layout() {
  const w = window.innerWidth, h = window.innerHeight;
  if (mode === 'battle') {
    const handH = $('#handbar')?.offsetHeight || Math.round(h * 0.26);
    const topH = $('#topbar')?.offsetHeight || 0;
    const bh = Math.max(200, h - handH - topH);
    canvas.style.top = topH + 'px'; canvas.style.height = bh + 'px'; canvas.style.width = w + 'px';
    renderer.setSize(w, bh, false); board.resize(w, bh);
  } else {
    canvas.style.top = '0px'; canvas.style.height = h + 'px'; canvas.style.width = w + 'px';
    renderer.setSize(w, h, false); menu.resize(w, h);
  }
}
window.addEventListener('resize', () => { layout(); });

function frame() {
  requestAnimationFrame(frame);
  if (mode === 'battle') { board.update(); updateHud(); } else menu.update();
}

// ---------------- persistence helpers ----------------
function persist() { saveMeta(G.meta); if (G.run && !G.run.over) saveRun(G.run); }
setSound(G.meta.settings.sound);

// ---------------- rendering ----------------
const root = $('#ui');
function go(screen) { G.screen = screen; G.modal = null; render(); }
function render() {
  const fn = SCREENS[G.screen] || SCREENS.title;
  const wantMode = G.screen === 'battle' ? 'battle' : 'menu';
  document.body.dataset.screen = G.screen;
  root.innerHTML = fn() + (G.modal ? modalHtml() : '') + (G.toast ? `<div class="toast">${G.toast}</div>` : '');
  if (wantMode !== mode) { mode = wantMode; }
  layout();
  if (G.screen === 'battle') afterBattleRender();
}
function toast(msg) { G.toast = msg; render(); clearTimeout(toast.t); toast.t = setTimeout(() => { G.toast = null; const t = $('.toast'); if (t) t.remove(); }, 2200); }

// ---------------- small components ----------------
const heartIcons = (r) => Array.from({ length: r.maxHearts }, (_, i) => `<img class="hrt ${i < r.hearts ? '' : 'empty'}" src="${glyphURL('heart', 48)}">`).join('');
function topbar(extra = '') {
  const r = G.run; if (!r) return '';
  return `<div class="topbar" id="topbar">
    <div class="tb-left"><span class="hearts">${heartIcons(r)}</span>
    <span class="pill gold"><img src="${glyphURL('coin', 40)}">${r.gold}</span>
    <span class="pill act">Boss ${r.act}/${R.ACTS}</span></div>
    <div class="tb-relics">${r.relics.map((id) => `<img class="relic" data-a="relicInfo" data-id="${id}" title="${esc(RELICS[id].name)}" src="${glyphURL(RELICS[id].icon, 64, '#3a2f48')}">`).join('')}</div>
    <div class="tb-right">${extra}<button class="btn sm" data-a="deck">Deck ${r.deck.length}</button><button class="btn sm ghost" data-a="menu">☰</button></div>
  </div>`;
}
function cardImg(id, opts = {}, attrs = '') { return `<img class="card" ${attrs} src="${cardURL(id, opts)}" alt="${esc(cardDef(id).name)}">`; }
function instImg(inst, attrs = '') { return `<img class="card" ${attrs} src="${instURL(inst)}" alt="${esc(cardDef(inst.id).name)}">`; }
function gemChip(id, attrs = '') { const g = GEMS[id]; return `<span class="gem" ${attrs} style="--g:${g.color}" title="${esc(g.text)}"><i></i>${esc(g.name)}</span>`; }

// ---------------- screens ----------------
const SCREENS = {};

SCREENS.title = () => {
  const saved = loadRun();
  return `<div class="screen center title">
    <div class="logo"><span>THREE</span><span class="fold">FOLD</span></div>
    <p class="tagline">Three lanes. Six turns. One run to break the machines.</p>
    <div class="menu-col">
      ${saved && !saved.over ? `<button class="btn big" data-a="continue">Continue Run <small>Boss ${saved.act}/${R.ACTS} · ${WARDENS[saved.warden]?.name}</small></button>` : ''}
      <button class="btn big primary" data-a="newRun">New Run</button>
      <button class="btn" data-a="archive">The Archive <small>${G.meta.shards} ✦ shards</small></button>
      <button class="btn" data-a="codex">Codex</button>
      <button class="btn" data-a="howto">How to Play</button>
      <button class="btn ghost" data-a="toggleSound">Sound: ${G.meta.settings.sound ? 'On' : 'Off'}</button>
    </div>
    <div class="foot">Runs ${G.meta.stats.runs} · Wins ${G.meta.stats.wins} · Max Heat ${G.meta.maxHeat}</div>
  </div>`;
};

SCREENS.howto = () => `<div class="screen scroll"><div class="panel prose">
  <h2>How to Play</h2>
  <p><b>Fights.</b> You and an opponent each play cards with <b>Power</b> into your own side of three lanes. After 6 turns, whoever has more Power in a lane wins it. <b>Win 2 of 3 lanes to win the fight</b> (if lanes are tied, total Power decides).</p>
  <p><b>Turns.</b> Your Energy each turn equals the turn number. Both sides draw up to ${DRAW_PER_TURN} fresh cards each turn, with room for ${MAX_HAND} including bonuses. Unplayed cards go back into circulation. Face-down plays reveal at the end of the turn, starting with whoever leads in more lanes. Tap a face-down card to take it back. The middle lane is your <b>Home</b>.</p>
  <p><b>Keywords.</b> <b>On Reveal</b>: triggers when the card reveals. <b>Ongoing</b>: always active while on the board. <b>End of turn</b>: triggers each end of turn. <b>Strike N</b>: the strongest enemy card in that lane gets −N Power. <b>Freeze</b>: your opponent can't play cards in that lane next turn. <b>Move</b>: tap the card on the board, then a lane (once per turn). <b>Lingering</b>: triggers when an effect discards the card. <b>Junk</b>: 0-Power clutter that fills slots.</p>
  <p><b>The run.</b> Each of the eight stages starts with a battle. Then choose one of two paths with two nodes apiece. Both paths lead to the same boss. Add a card to your deck after each fight. At a Gem node or Shop, choose a compatible card to socket the gem immediately. Forges bore empty sockets, evolve cards, and fuse duplicates. Lose a fight and you lose a heart. Lose all hearts and the run ends.</p>
  <p><b>Gold</b> = the total Power in the lanes you win. <b>Shards</b> are kept between runs; spend them in the Archive on new wardens, card caches, gems, relics, locations and perks.</p>
  <p><b>Evolution.</b> Apply an <b>Evo Gem</b> to an Evo base card at a Gem node or Shop. Bring that card and its catalyst to a Forge to evolve the base and consume the catalyst.</p>
  <button class="btn primary" data-a="title">Back</button></div></div>`;

SCREENS.wardens = () => {
  const un = R.unlockedSet(G.meta);
  return `<div class="screen scroll"><div class="panel wide">
  <h2>Choose your Warden</h2>
  <div class="wardens">${WARDEN_LIST.map((w) => {
    const locked = w.unlock && !un.has(w.unlock);
    return `<div class="warden ${G.warden === w.id ? 'sel' : ''} ${locked ? 'locked' : ''}" data-a="${locked ? 'archive' : 'pickWarden'}" data-id="${w.id}" style="--wc:${w.color}">
      <img class="portrait" src="${artURL(w.art, 'warden' + w.id)}">
      <div><h3>${w.name} <small>${w.title}</small></h3>
      <p>${esc(w.text)}</p>
      <p class="dim">Starting relic: ${esc(RELICS[w.relic]?.name || '—')}</p>
      ${locked ? `<p class="lock">🔒 Unlock in the Archive (${UNLOCK_MAP[w.unlock].cost} ✦)</p>` : ''}</div></div>`;
  }).join('')}</div>
  <div class="heat"><h3>Heat ${G.heat}</h3>
    <div class="row"><button class="btn sm" data-a="heat" data-d="-1" ${G.heat <= 0 ? 'disabled' : ''}>−</button>
    <div class="heat-list">${G.heat ? HEAT.slice(0, G.heat).map((h) => `<div>🔥 ${h.text}</div>`).join('') : '<div class="dim">No modifiers. Win a run to unlock Heat.</div>'}</div>
    <button class="btn sm" data-a="heat" data-d="1" ${G.heat >= G.meta.maxHeat ? 'disabled' : ''}>+</button></div></div>
  <div class="row end"><button class="btn ghost" data-a="title">Back</button><button class="btn big primary" data-a="startRun">Begin Run</button></div>
  </div></div>`;
};

// ---------- map ----------
SCREENS.map = () => {
  const r = G.run; const avail = R.availableNodes(r);
  const rows = r.map.rows.slice().reverse();
  const scout = r.perks.includes('perk_scout');
  const sel = G.mapSel ? R.nodeById(r, G.mapSel) : null;
  const hint = avail.length > 1 ? 'Choose a path by selecting a highlighted node.' : !r.pos ? 'Start at the highlighted battle.' : '';
  const nodeHtml = (n) => {
    const can = avail.includes(n.id);
    const done = r.visited?.includes(n.id);
    return `<button class="node ${n.type} ${can ? 'avail' : ''} ${done ? 'done' : ''} ${r.pos === n.id ? 'here' : ''} ${G.mapSel === n.id ? 'sel' : ''}" data-a="mapNode" data-id="${n.id}" aria-label="${esc(R.NODE_INFO[n.type].name + (n.n === 2 ? ' · ' + (n.col === 0 ? 'Left path' : 'Right path') : ''))}" style="--x:${(n.col + 0.5) / n.n}">
      <img src="${glyphURL(n.type, 72)}"><span>${R.NODE_INFO[n.type].name}</span></button>`;
  };
  let preview = '';
  if (sel) {
    const showEnc = sel.enc && (scout || avail.includes(sel.id));
    preview = `<div class="preview"><h3>${R.NODE_INFO[sel.type].name}</h3><p>${R.NODE_INFO[sel.type].desc}</p>
      ${sel.enc ? (showEnc ? encPreview(sel.enc, scout) : '<p class="dim">Unknown foes. (Scouting reveals distant fights.)</p>') : ''}
      <p class="dim">Not reachable yet.</p></div>`;
  }
  return `${topbar()}<div class="screen map">
    <div class="maptitle">Boss ${r.act} of ${R.ACTS} · ${esc(OPPONENTS[rows[0][0].enc.opponent].name)}</div>
    ${hint ? `<p class="map-hint">${hint}</p>` : ''}
    <div class="mapwrap"><svg class="maplines" id="maplines"></svg>
    ${rows.map((row) => `<div class="maprow">${row.map(nodeHtml).join('')}</div>`).join('')}</div>
    ${preview}
  </div>`;
};
function encPreview(enc, showLocs) {
  const o = OPPONENTS[enc.opponent]; const boss = o.boss ? BOSSES[o.boss] : null;
  return `<div class="enc"><div class="opp-row"><img src="${enemyURL(o.portrait)}"><div><b>${esc(o.name)}</b> <small>${esc(o.title)}</small><p>${esc(boss ? boss.text : o.text || '')}</p></div></div>
    ${showLocs ? `<p class="dim">Locations: ${esc(LOCATIONS[enc.locs[0]]?.name)} · Home · ${esc(LOCATIONS[enc.locs[2]]?.name)}</p>` : ''}</div>`;
}
function drawMapLines() {
  const svg = $('#maplines'); if (!svg || !G.run) return;
  const wrap = svg.parentElement; const wr = wrap.getBoundingClientRect();
  const visited = new Set(G.run.visited);
  const available = new Set(R.availableNodes(G.run));
  svg.setAttribute('width', wr.width); svg.setAttribute('height', wr.height);
  let html = '';
  for (const row of G.run.map.rows) for (const n of row) {
    const a = wrap.querySelector(`[data-id="${n.id}"]`); if (!a) continue;
    const ar = a.getBoundingClientRect();
    for (const id of n.next) {
      const b = wrap.querySelector(`[data-id="${id}"]`); if (!b) continue;
      const br = b.getBoundingClientRect();
      const x1 = ar.left + ar.width / 2 - wr.left, y1 = ar.top + ar.height / 2 - wr.top, x2 = br.left + br.width / 2 - wr.left, y2 = br.top + br.height / 2 - wr.top;
      const live = visited.has(n.id) && (visited.has(id) || available.has(id));
      html += `<path d="M${x1},${y1} C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}" class="${live ? 'live' : ''}"/>`;
    }
  }
  svg.innerHTML = html;
}

// ---------- battle ----------
SCREENS.battle = () => {
  const b = G.battle; const r = G.run;
  const boss = b.boss;
  return `<div class="topbar battle-top" id="topbar">
      <div class="tb-left"><span class="hearts">${heartIcons(r)}</span><span class="pill gold"><img src="${glyphURL('coin', 40)}">${r.gold}</span></div>
      <div class="turn">Turn <b>${Math.min(b.turn, b.maxTurns)}</b>/${b.maxTurns}</div>
      <div class="oppinfo" data-a="oppInfo"><img src="${enemyURL(b.opp.portrait)}"><span><b>${esc(b.opp.name)}</b><small>Hand ${b.S[1].hand.length} · Deck ${b.S[1].deck.length}</small></span></div>
      <div class="tb-right"><button class="btn sm ghost" data-a="battleHelp">?</button></div>
    </div>
    <div id="hud"></div>
    <div class="handbar" id="handbar">
      ${G.battleHint ? `<div class="hint">${G.battleHint}</div>` : boss ? `<div class="bossbanner">${esc(boss.name)}: ${esc(boss.text)}</div>` : ''}
      <div class="energy"><div class="orb"><b>${b.energy}</b></div><small>Energy</small></div>
      <div class="hand" id="hand">${b.hand.map((hc) => handCard(b, hc)).join('')}</div>
      <div class="handside">
        <button class="btn endturn ${b.over ? 'disabled' : ''}" data-a="endTurn">${b.turn >= b.maxTurns ? 'Finish' : 'End Turn'}</button>
        <small>Deck ${b.S[0].deck.length} · Hand ${b.S[0].hand.length}/${MAX_HAND}</small>
      </div>
    </div>
    ${b.over ? battleResultHtml() : ''}`;
};
function handCard(b, hc) {
  const cost = b.minCost(hc);
  const base = hc.def.cost + (hc.inst?.plus ? (hc.def.up?.cost ?? 0) : 0);
  const playable = [0, 1, 2].some((l) => b.canPlay(hc.hid, l).ok);
  const pw = b.handPower(hc);
  return `<div class="hc ${G.sel === hc.hid ? 'sel' : ''} ${playable ? 'ok' : 'no'}" data-hid="${hc.hid}">
    <img class="card" draggable="false" src="${cardURL(hc.def, { cost, plus: hc.inst?.plus, sockets: hc.inst?.sockets || [], bonus: hc.inst?.bonus, power: pw })}">
  </div>`;
}
function battleResultHtml() {
  const res = G.battle.result; const out = G.lastOutcome;
  return `<div class="overlay"><div class="panel result ${res.won ? 'win' : 'lose'}">
    <h2>${res.won ? 'Victory' : 'Defeat'}</h2>
    <div class="lanes-res">${res.laneResults.map((lr, i) => `<div class="lr ${lr.won ? 'w' : lr.lost ? 'l' : 't'}"><small>${i === 1 ? 'Home' : i === 0 ? 'Left' : 'Right'}</small><b>${lr.player}</b><span>vs</span><b>${lr.enemy}</b></div>`).join('')}</div>
    <p>${res.lanesWon} won · ${res.lanesLost} lost${res.tiebreak ? ' — decided by total Power' : ''}.</p>
    ${out ? `<p class="gains"><span>+${out.gold} gold</span> <span>+${out.shards} ✦</span>${out.heartLost ? ' <span class="bad">−1 heart</span>' : ''}</p>
    ${out.relic ? `<p>Relic: <b>${esc(RELICS[out.relic].name)}</b></p>` : ''}
    ${out.notes.map((n) => `<p class="dim">${esc(n)}</p>`).join('')}` : ''}
    <button class="btn big primary" data-a="afterBattle">Continue</button></div></div>`;
}

// HUD elements projected over the 3D board
let hudEls = null;
function afterBattleRender() {
  const hud = $('#hud'); if (!hud) return;
  const b = G.battle;
  hud.innerHTML = [0, 1, 2].map((i) => `<div class="ptotal" id="pt${i}"></div><div class="ptotal enemy" id="et${i}"></div><div class="lanelabel" id="ll${i}" data-a="laneInfo" data-lane="${i}"></div>`).join('');
  hudEls = [0, 1, 2].map((i) => ({ pt: $('#pt' + i), et: $('#et' + i), ll: $('#ll' + i) }));
  updateHudContent();
  bindHand();
  board.highlightLanes(G.sel ? [0, 1, 2].map((l) => b.canPlay(G.sel, l).ok) : G.moveSel ? [0, 1, 2].map((l) => l !== b.findCard(G.moveSel)?.lane && b.freeSlots(l, 0) > 0) : null);
}
function updateHudContent() {
  const b = G.battle; if (!b || !hudEls) return;
  b.lanes.forEach((lane, i) => {
    const p = lane.totals[0], e = lane.totals[1];
    hudEls[i].pt.innerHTML = `<b>${p}</b>`; hudEls[i].pt.className = 'ptotal ' + (p > e ? 'win' : p === e ? 'tie' : 'lose');
    hudEls[i].et.innerHTML = `<b>${e}</b>`; hudEls[i].et.className = 'ptotal enemy ' + (e > p ? 'ewin' : '');
    const name = lane.isHome ? 'Home' : lane.loc.name;
    const txt = lane.isHome ? (lane.home.length ? lane.home.map((h) => h.name).join(', ') : 'Your Home lane') : lane.loc.text;
    const frozen = lane.lock[0] === b.turn;
    hudEls[i].ll.innerHTML = `<b>${frozen ? '❄ ' : ''}${esc(name)}</b><small>${frozen ? 'Frozen: you can\'t play here this turn' : esc(txt)}</small>`;
    hudEls[i].ll.classList.toggle('frozen', frozen);
  });
}
function updateHud() {
  if (!hudEls || !G.battle) return;
  const top = canvas.offsetTop;
  for (let i = 0; i < 3; i++) {
    const p = board.toScreen(board.totalAnchor(i, 0));
    const e = board.toScreen(board.totalAnchor(i, 1));
    const l = board.toScreen(board.labelAnchor(i));
    hudEls[i].pt.style.transform = `translate(${p.x - 54}px, ${p.y + top}px) translate(-50%, -50%)`;
    hudEls[i].et.style.transform = `translate(${e.x - 54}px, ${e.y + top}px) translate(-50%, -50%)`;
    hudEls[i].ll.style.transform = `translate(${l.x}px, ${l.y + top}px) translate(-50%, -50%)`;
    hudEls[i].ll.style.maxWidth = Math.max(80, Math.abs(board.toScreen(board.labelAnchor(i).setX(board.labelAnchor(i).x + 1.3)).x - l.x) * 2) + 'px';
  }
  if (floats.length) {
    const now = performance.now();
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i]; const age = (now - f.t0) / 1000;
      if (age < 0) { f.el.style.opacity = 0; continue; }
      if (age > 1.4) { f.el.remove(); floats.splice(i, 1); continue; }
      const s = board.toScreen(board.floatAnchor(f.lane, f.side));
      f.el.style.opacity = Math.min(1, 2.5 * (1.4 - age));
      f.el.style.transform = `translate(${s.x + f.dx}px, ${s.y + top - 20 - age * 50}px) translate(-50%,-50%)`;
    }
  }
}
const floats = [];
function addFloat(lane, side, text, color, delay) {
  side = side === 'enemy' ? 1 : side === 'player' ? 0 : side;
  const hud = $('#hud'); if (!hud) return;
  const el = document.createElement('div'); el.className = 'float'; el.textContent = text; el.style.color = color;
  hud.appendChild(el); floats.push({ el, lane, side, t0: performance.now() + delay, dx: (Math.random() - 0.5) * 40 });
}

function processFx() {
  const b = G.battle; const list = b.drainFx(); let d = 0; const sound = {};
  for (const f of list) {
    const delay = d;
    switch (f.t) {
      case 'float': addFloat(f.lane, f.side ?? 0, f.text, f.color, delay); d += 80; break;
      case 'reveal': setTimeout(() => { board.revealFx(f.bid); sfx.play(); }, delay); d += 260; break;
      case 'strike': setTimeout(() => board.strike(f.lane, f.from, f.bid, f.n), delay); addFloat(f.lane, 1 - f.from, `−${f.n}`, f.from === 0 ? '#ffe27a' : '#ff8a8a', delay + 300); d += 160; sound.strike = 1; break;
      case 'freeze': setTimeout(() => board.freeze(f.lane, f.side), delay); sound.freeze = 1; break;
      case 'buff': if (f.n) setTimeout(() => board.buff(f.bid, f.n), delay); sound.buff = 1; break;
      case 'destroy': sound.destroy = 1; break;
      case 'gold': sound.coin = 1; break;
      case "stage": sound.click = 1; break;
      case 'unstage': board.unstage(f.bid); break;
      case 'revealOrder': addFloat(1, f.first, f.first === 0 ? 'You reveal first' : 'Opponent reveals first', '#e8d29a', delay); d += 120; break;
    }
  }
  for (const k of Object.keys(sound)) sfx[k]?.();
}

function bindHand() {
  const hand = $('#hand'); if (!hand) return;
  let drag = null;
  hand.querySelectorAll('.hc').forEach((el) => {
    el.addEventListener('pointerdown', (e) => {
      const hid = +el.dataset.hid;
      drag = { hid, x0: e.clientX, y0: e.clientY, el, moved: false, ghost: null };
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', (e) => {
      if (!drag || drag.el !== el) return;
      const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
      if (!drag.moved && Math.hypot(dx, dy) > 12) {
        drag.moved = true;
        drag.ghost = el.querySelector('img').cloneNode(); drag.ghost.className = 'dragghost'; document.body.appendChild(drag.ghost);
        G.sel = drag.hid; const b = G.battle; board.highlightLanes([0, 1, 2].map((l) => b.canPlay(drag.hid, l).ok));
      }
      if (drag.ghost) { drag.ghost.style.left = e.clientX + 'px'; drag.ghost.style.top = e.clientY + 'px'; }
    });
    el.addEventListener('pointerup', (e) => {
      if (!drag || drag.el !== el) return;
      const d = drag; drag = null;
      if (d.ghost) d.ghost.remove();
      if (!d.moved) { G.sel = G.sel === d.hid ? null : d.hid; G.moveSel = null; sfx.click(); render(); return; }
      const hit = pickAt(e.clientX, e.clientY);
      if (hit) tryPlay(d.hid, hit.lane); else { G.sel = null; render(); }
    });
  });
}
function pickAt(cx, cy) {
  const r = canvas.getBoundingClientRect();
  if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) return null;
  return board.pick(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
}
function tryPlay(hid, lane) {
  const b = G.battle;
  const res = b.play(hid, lane);
  if (!res.ok) { sfx.error(); toast(res.why || "Can't play there"); G.sel = null; render(); return; }
  G.sel = null;
  board.sync(); processFx(); render();
}
canvas.addEventListener('pointerup', (e) => {
  if (mode !== 'battle' || !G.battle || G.battle.over) return;
  const hit = pickAt(e.clientX, e.clientY); if (!hit) return;
  const b = G.battle;
  if (G.sel != null && hit.lane != null) { tryPlay(G.sel, hit.lane); return; }
  if (G.moveSel != null && hit.lane != null) {
    const bc = b.findCard(G.moveSel);
    if (bc && bc.lane !== hit.lane) { const r2 = b.playerMove(G.moveSel, hit.lane); if (!r2.ok) toast(r2.why || "Can't move there"); else sfx.play(); }
    G.moveSel = null; board.sync(); processFx(); render(); return;
  }
  if (hit.type === 'card') {
    const bc = b.findCard(hit.bid); if (!bc) return;
    if (bc.side === 0 && !bc.revealed) { b.unplay(bc.bid); processFx(); board.sync(); sfx.click(); render(); return; }
    G.modal = { type: 'boardCard', bid: bc.bid }; render(); return;
  }
  if (hit.type === 'opponent') { G.modal = { type: 'opponent' }; render(); return; }
  if (hit.type === 'lane') { G.modal = { type: 'lane', lane: hit.lane }; render(); }
});

// ---------- reward ----------
SCREENS.reward = () => {
  const r = G.run; const pr = r.pendingReward;
  if (pr.bossRelics) {
    return `${topbar()}<div class="screen scroll center"><div class="panel">
      <h2>Boss Treasure</h2><p>Choose a relic.</p>
      <div class="relic-choices">${pr.bossRelics.map((id) => relicCard(id, `data-a="bossRelic" data-id="${id}"`)).join('')}</div></div></div>`;
  }
  const canSkip = r.perks.includes('perk_skip');
  return `${topbar()}<div class="screen scroll center"><div class="panel wide">
    <h2>Add a card to your deck</h2><p class="dim">A card must be chosen after every fight${canSkip ? ' (or Skip for 10 gold)' : ''}.${G.banishMode ? ' <b class="bad">Banish mode: tap a card to remove it from reward pools.</b>' : ''}</p>
    <div class="choices">${pr.cards.map((id, i) => `<div class="choice">${cardImg(id, {}, `data-a="${G.banishMode ? 'banish' : 'takeCard'}" data-i="${i}"`)}${evoHint(id)}</div>`).join('')}</div>
    <div class="row center">
      ${r.rerolls > 0 ? `<button class="btn" data-a="reroll">Reroll (${r.rerolls})</button>` : ''}
      ${r.banishes > 0 ? `<button class="btn ${G.banishMode ? 'primary' : ''}" data-a="banishMode">Banish (${r.banishes})</button>` : ''}
      ${canSkip ? `<button class="btn ghost" data-a="skipCard">Skip (+10 gold)</button>` : ''}
    </div></div></div>`;
};
function evoHint(id) {
  const r = G.run;
  const asBase = EVO_RECIPES.find((e) => e.base === id); const asCat = EVO_RECIPES.filter((e) => e.catalyst === id);
  const parts = [];
  if (asBase) parts.push(`Evo base: + ${CARDS[asBase.catalyst].name}${r.deck.some((c) => c.id === asBase.catalyst) ? ' ✔' : ''}`);
  for (const e of asCat) parts.push(`Catalyst for ${CARDS[e.base].name}${r.deck.some((c) => c.id === e.base) ? ' ✔' : ''}`);
  return parts.length ? `<small class="evohint">✦ ${parts.map(esc).join(' · ')}</small>` : '';
}
function relicCard(id, attrs = '') { const rl = RELICS[id]; return `<div class="relic-card" ${attrs}><img src="${glyphURL(rl.icon, 96, '#3a2f48')}"><b>${esc(rl.name)}</b><small>${esc(rl.text)}</small><em>${rl.rarity}</em></div>`; }

// ---------- services ----------
SCREENS.shop = () => {
  const r = G.run; const s = r.node.shop;
  return `${topbar()}<div class="screen scroll"><div class="panel wide">
    <h2>The Wandering Market</h2>
    <div class="shop-cards">${s.items.map((it, i) => it.kind !== 'card' ? '' : `<div class="shop-item ${it.sold ? 'sold' : ''}">${cardImg(it.id, {}, `data-a="buy" data-i="${i}"`)}<span class="price ${r.gold < it.price ? 'bad' : ''}">${it.sold ? 'Sold' : it.price + 'g'}</span>${evoHint(it.id)}</div>`).join('')}</div>
    <div class="shop-row">${s.items.map((it, i) => {
      if (it.kind === 'gem') {
        const fits = r.deck.some((card) => R.canSocket(card, it.id));
        return `<button class="shop-mini ${it.sold ? 'sold' : ''}" data-a="buy" data-i="${i}" ${it.sold || !fits || r.gold < it.price ? 'disabled' : ''}>${gemChip(it.id)}<small>${esc(GEMS[it.id].text)}</small><span class="price ${r.gold < it.price ? 'bad' : ''}">${it.sold ? 'Sold' : !fits ? 'No compatible socket' : it.price + 'g'}</span></button>`;
      }
      if (it.kind === 'relic') return `<div class="shop-mini ${it.sold ? 'sold' : ''}" data-a="buy" data-i="${i}"><img src="${glyphURL(RELICS[it.id].icon, 56, '#3a2f48')}"><b>${esc(RELICS[it.id].name)}</b><small>${esc(RELICS[it.id].text)}</small><span class="price ${r.gold < it.price ? 'bad' : ''}">${it.sold ? 'Sold' : it.price + 'g'}</span></div>`;
      return '';
    }).join('')}
    <div class="shop-mini ${s.removeUsed ? 'sold' : ''}" data-a="shopRemove"><img src="${glyphURL('purge', 56)}"><b>Card Removal</b><small>Remove a card from your deck.</small><span class="price ${r.gold < s.removePrice ? 'bad' : ''}">${s.removeUsed ? 'Used' : s.removePrice + 'g'}</span></div>
    </div>
    <div class="row end"><button class="btn primary" data-a="leaveNode">Leave</button></div></div></div>`;
};

SCREENS.gem = () => {
  const { node } = G.run;
  return `${topbar()}<div class="screen scroll center"><div class="panel wide">
    <h2>Gem Cache</h2><p>${node.gemChoices.length ? 'Choose a gem, then choose a card to socket it into.' : 'Your deck has no compatible empty sockets.'}</p>
    <div class="shop-row">${node.gemChoices.map((id) => `<button class="shop-mini" data-a="chooseGem" data-id="${id}">${gemChip(id)}<small>${esc(GEMS[id].text)}</small></button>`).join('')}</div>
    <div class="row end"><button class="btn ghost" data-a="leaveNode">Leave</button></div></div></div>`;
};

SCREENS.forge = () => {
  const r = G.run; const st = r.node; const evo = R.evoOptions(r); const fuse = R.fuseOptions(r);
  const tab = st.tab === 'fuse' ? 'fuse' : 'evolve';
  const canBore = !st.bored && (r.perks.includes('perk_forgecraft') || r.gold >= 40);
  let body = '';
  if (tab === 'evolve') {
    body = evo.length ? `<div class="evo-list">${evo.map((o) => `<div class="evo ${o.ready ? 'ready' : ''}">
        ${instImg(r.deck.find((c) => c.uid === o.uid))}<span class="plus">+</span>${cardImg(o.recipe.catalyst, {}, `class="card ${o.catalystUid ? '' : 'missing'}"`)}<span class="plus">=</span>${cardImg(o.recipe.result)}
        <div>${o.hasGem ? '✔ Evo Gem socketed' : '✘ Needs an Evo Gem in an empty socket'}<br>${o.catalystUid ? '✔ Catalyst owned' : '✘ Catalyst not in deck'}<br>
        ${o.ready ? `<button class="btn primary" data-a="evolve" data-uid="${o.uid}">Evolve!</button>` : ''}</div></div>`).join('')}</div>` : '<p class="dim">None of your cards are Evo bases. Bases include: ' + EVO_RECIPES.map((e) => CARDS[e.base].name).join(', ') + '.</p>';
  } else {
    body = fuse.length ? `<p>Fuse two copies into one upgraded (+) card. Their gems must fit together in the result.</p><div class="evo-list">${fuse.map((f) => `<div class="evo ready">${instImg(r.deck.find((c) => c.uid === f.a))}<span class="plus">+</span>${instImg(r.deck.find((c) => c.uid === f.b))}<span class="plus">=</span>${cardImg(f.id, { plus: 1 })}<button class="btn primary" data-a="fuse" data-a1="${f.a}" data-b1="${f.b}">Fuse</button></div>`).join('')}</div>` : '<p class="dim">Fusion needs two un-upgraded copies with room for their combined gems.</p>';
  }
  return `${topbar()}<div class="screen scroll"><div class="panel wide">
    <h2>The Forge</h2>
    <div class="tabs">${['evolve', 'fuse'].map((t) => `<button class="tab ${tab === t ? 'on' : ''}" data-a="forgeTab" data-t="${t}">${t[0].toUpperCase() + t.slice(1)}${t === 'evolve' && evo.some((o) => o.ready) ? ' ✦' : ''}</button>`).join('')}</div>
    ${body}
    <div class="row end"><button class="btn" data-a="forgeBore" ${canBore ? '' : 'disabled'}>Bore a socket ${r.perks.includes('perk_forgecraft') ? '(free once)' : '(40g)'}</button><button class="btn primary" data-a="leaveNode">Leave Forge</button></div></div></div>`;
};

const pickerScreen = (title, desc, filter, action, leaveLabel = 'Leave') => () => {
  const r = G.run;
  return `${topbar()}<div class="screen scroll"><div class="panel wide"><h2>${title}</h2><p>${desc}</p>
    <div class="deckgrid">${sortDeck(r.deck).filter(filter).map((c) => instImg(c, `data-a="${action}" data-uid="${c.uid}"`)).join('')}</div>
    <div class="row end"><button class="btn ghost" data-a="leaveNode">${leaveLabel}</button></div></div></div>`;
};
SCREENS.purge = pickerScreen('Shrine of Ash', 'Choose a card to burn away forever.', () => true, 'purgeCard');
SCREENS.mirror = pickerScreen('Mirror Pool', 'Choose a card to duplicate (gems are not copied).', (c) => !cardDef(c.id).token, 'mirrorCard');
SCREENS.campUpgrade = pickerScreen('Campfire — Upgrade', 'Choose a card to upgrade (+2 Power).', (c) => !c.plus && !cardDef(c.id).token, 'upgradeCard', 'Back');
SCREENS.camp = () => {
  const r = G.run;
  return `${topbar()}<div class="screen center"><div class="panel">
    <h2>Campfire</h2><p>The fire crackles. Rest, or sharpen your deck.</p>
    <div class="row center"><button class="btn big" data-a="campHeal" ${r.hearts >= r.maxHearts ? 'disabled' : ''}>Rest (+1 heart)</button>
    <button class="btn big primary" data-a="campUpgradeScreen">Upgrade a card</button></div></div></div>`;
};
SCREENS.treasure = () => {
  const st = G.run.node;
  return `${topbar()}<div class="screen center"><div class="panel"><h2>Treasure</h2>
    ${st.relic ? relicCard(st.relic) : '<p>The chest held only gold.</p>'}<p class="gains"><span>+${st.gold} gold</span></p>
    <button class="btn primary" data-a="leaveNode">Continue</button></div></div>`;
};
SCREENS.home = () => {
  const r = G.run; const st = r.node;
  return `${topbar()}<div class="screen scroll center"><div class="panel wide"><h2>The Builder</h2>
    <p>Add an upgrade to your Home (middle) lane. Current: ${r.home.length ? r.home.map((h) => esc(HOME_UPGRADES[h].name)).join(', ') : 'an empty plot'}.</p>
    <div class="relic-choices">${st.choices.map((id) => `<div class="relic-card" data-a="pickHome" data-id="${id}"><img src="${glyphURL(HOME_UPGRADES[id].icon, 96, '#4a2a6a')}"><b>${esc(HOME_UPGRADES[id].name)}</b><small>${esc(HOME_UPGRADES[id].text)}</small></div>`).join('')}</div>
    <div class="row end"><button class="btn ghost" data-a="leaveNode">Skip</button></div></div></div>`;
};
SCREENS.event = () => {
  const r = G.run; const st = r.node; const ev = EVENTS.find((e) => e.id === st.event);
  return `${topbar()}<div class="screen scroll center"><div class="panel event">
    <img class="eventart" src="${artURL(ev.art, 'event' + ev.id)}">
    <h2>${esc(ev.title)}</h2><p>${esc(ev.text)}</p>
    ${st.result != null ? `<p class="result-text">${esc(st.result)}</p><button class="btn primary" data-a="leaveNode">Continue</button>` :
      `<div class="menu-col">${ev.choices.map((c, i) => `<button class="btn" data-a="eventChoice" data-i="${i}" ${c.can && !c.can(r) ? 'disabled' : ''}>${esc(c.label)}</button>`).join('')}</div>`}
  </div></div>`;
};

SCREENS.summary = () => {
  const s = G.summary; const r = s.run;
  return `<div class="screen scroll center"><div class="panel ${s.victory ? 'win' : 'lose'}">
    <h2>${s.victory ? 'The machines fall silent.' : 'Your run ends.'}</h2>
    <p>${s.victory ? `Victory with ${WARDENS[r.warden].name} at Heat ${r.heat}!` : `Run ended during boss stage ${r.act}.`}</p>
    <div class="stats"><div><b>${r.fightsWon}/${r.fights}</b><small>fights won</small></div><div><b>${r.deck.length}</b><small>cards</small></div><div><b>${r.relics.length}</b><small>relics</small></div><div><b>${r.stats.evolutions}</b><small>evolutions</small></div></div>
    <p class="gains"><span>+${s.shards} ✦ shards</span>${s.bonus ? ` <small>(incl. ${s.bonus} bonus)</small>` : ''}</p>
    <p class="dim">Total shards: ${G.meta.shards}. Spend them in the Archive.</p>
    <div class="row center"><button class="btn primary big" data-a="archive">The Archive</button><button class="btn" data-a="title">Title</button></div></div></div>`;
};

// ---------- archive ----------
SCREENS.archive = () => {
  const m = G.meta; const tabs = ['Warden', 'Cards', 'Gems', 'Relics', 'Locations', 'Perks'];
  const list = UNLOCKS.filter((u) => u.kind === G.archiveTab);
  const owned = new Set(m.unlocked); const grants = R.unlockedSet(m);
  return `<div class="screen scroll"><div class="panel wide">
    <h2>The Archive <span class="shards">${m.shards} ✦</span></h2>
    <p class="dim">Unlocks add new options to future runs; they don't make enemies easier.</p>
    <div class="tabs">${tabs.map((t) => `<button class="tab ${G.archiveTab === t ? 'on' : ''}" data-a="archiveTab" data-t="${t}">${t}</button>`).join('')}</div>
    <div class="unlocks">${list.map((u) => {
      const have = owned.has(u.id) || grants.has(u.id); const req = u.requires && !owned.has(u.requires) && !grants.has(u.requires);
      return `<div class="unlock ${have ? 'have' : ''}"><div><b>${esc(u.name)}</b><p>${esc(u.desc)}</p>${req ? `<small class="bad">Requires ${esc(UNLOCK_MAP[u.requires].name)}</small>` : ''}</div>
        ${have ? '<span class="owned">Unlocked</span>' : `<button class="btn ${m.shards >= u.cost && !req ? 'primary' : ''}" data-a="buyUnlock" data-id="${u.id}" ${m.shards < u.cost || req ? 'disabled' : ''}>${u.cost} ✦</button>`}</div>`;
    }).join('')}</div>
    <div class="row end"><button class="btn" data-a="title">Back</button></div></div></div>`;
};

// ---------- codex ----------
SCREENS.codex = () => {
  const tabs = ['Cards', 'Evolutions', 'Relics', 'Enemies', 'Locations', 'Home'];
  const un = R.unlockedSet(G.meta);
  let body = '';
  if (G.codexTab === 'Cards') body = `<div class="deckgrid small">${CARD_LIST.filter((c) => !c.evo).map((c) => un.has(c.set) || c.set === 'core' ? cardImg(c.id, {}, `data-a="inspectDef" data-id="${c.id}"`) : `<div class="card lockedcard"><span>🔒</span><small>${esc(UNLOCK_MAP[c.set]?.name || 'Locked')}</small></div>`).join('')}</div>`;
  if (G.codexTab === 'Evolutions') body = `<div class="evo-list">${EVO_RECIPES.map((e) => `<div class="evo">${cardImg(e.base)}<span class="plus">+</span>${cardImg(e.catalyst)}<span class="plus">=</span>${G.meta.recipes[e.result] ? cardImg(e.result, {}, `data-a="inspectDef" data-id="${e.result}"`) : '<div class="card lockedcard"><span>?</span><small>Evolve to discover</small></div>'}</div>`).join('')}</div>`;
  if (G.codexTab === 'Relics') body = `<div class="relic-choices">${RELIC_LIST.map((r) => (un.has(r.unlock) || !r.unlock ? relicCard(r.id) : `<div class="relic-card locked"><b>🔒 ${esc(r.name)}</b><small>${esc(UNLOCK_MAP[r.unlock]?.name)}</small></div>`)).join('')}</div>`;
  if (G.codexTab === 'Enemies') body = `<div class="enemy-list">${Object.values(OPPONENTS).map((o) => `<div class="enemy-entry ${o.tier}"><img src="${enemyURL(o.portrait)}"><div><b>${esc(o.name)}</b> <small>${o.tier === 'boss' ? 'Boss' : o.tier === 'elite' ? 'Elite' : 'Act ' + o.acts.join('–')}</small><p>${esc(o.boss ? BOSSES[o.boss].text : o.text)}</p></div></div>`).join('')}</div>`;
  if (G.codexTab === 'Locations') body = `<div class="enemy-list">${LOCATION_LIST.map((l) => `<div class="enemy-entry"><img src="${artURL({ f: 'none', bg: l.art.bg, pal: l.art.pal }, 'loc' + l.id)}"><div><b>${esc(l.name)}</b>${l.unlock && !un.has(l.unlock) ? ' 🔒' : ''}<p>${esc(l.text)}</p></div></div>`).join('')}</div>`;
  if (G.codexTab === 'Home') body = `<div class="relic-choices">${Object.values(HOME_UPGRADES).map((h) => `<div class="relic-card"><img src="${glyphURL(h.icon, 96, '#4a2a6a')}"><b>${esc(h.name)}</b><small>${esc(h.text)}</small></div>`).join('')}</div>`;
  return `<div class="screen scroll"><div class="panel wide"><h2>Codex</h2>
    <div class="tabs">${tabs.map((t) => `<button class="tab ${G.codexTab === t ? 'on' : ''}" data-a="codexTab" data-t="${t}">${t}</button>`).join('')}</div>${body}
    <div class="row end"><button class="btn" data-a="title">Back</button></div></div></div>`;
};

// ---------- modals ----------
function sortDeck(d) { return d.slice().sort((a, b) => cardDef(a.id).cost - cardDef(b.id).cost || cardDef(a.id).name.localeCompare(cardDef(b.id).name)); }
const KEYWORDS = { reveal: ['On Reveal', 'Triggers once when played.'], ongoing: ['Ongoing', 'Always active while on the board.'], move: ['Move', 'Tap it on the board, then another lane. Once per turn.'], strike: ['Strike', 'The strongest enemy card in that lane gets −N Power.'], freeze: ['Freeze', "Your opponent can't play cards in that lane next turn."], discard: ['Lingering', 'Triggers when discarded from your hand by an effect.'], junk: ['Junk', 'A 0-Power token that takes up a slot.'], destroy: ['Destroy', 'Destroyed cards go to your discard pile.'], grow: ['Grow', 'Gains power over time.'] };
function modalHtml() {
  const m = G.modal; const r = G.run;
  let inner = '';
  if (m.type === 'deck') inner = `<h2>Your Deck (${r.deck.length})</h2><div class="deckgrid">${sortDeck(r.deck).map((c) => instImg(c, `data-a="inspectInst" data-uid="${c.uid}"`)).join('')}</div>
     ${r.home.length ? `<h3>Home</h3><p>${r.home.map((h) => `<b>${esc(HOME_UPGRADES[h].name)}</b>: ${esc(HOME_UPGRADES[h].text)}`).join('<br>')}</p>` : ''}`;
  if (m.type === 'inspect') {
    const def = cardDef(m.id);
    const kws = (def.tags || []).filter((t) => KEYWORDS[t]).map((t) => `<p><b>${KEYWORDS[t][0]}</b>: ${KEYWORDS[t][1]}</p>`).join('');
    inner = `<div class="inspect"><img class="card big" src="${m.inst ? instURL(m.inst) : cardURL(m.id)}"><div>${kws}${(m.inst?.sockets || []).filter(Boolean).map((g) => `<p>${gemChip(g)} ${esc(GEMS[g].text)}</p>`).join('')}${evoHint(m.id)}</div></div>`;
  }
  if (m.type === 'boardCard') {
    const b = G.battle; const bc = b.findCard(m.bid);
    if (!bc) { G.modal = null; return ''; }
    const kws = (bc.def.tags || []).filter((t) => KEYWORDS[t]).map((t) => `<p><b>${KEYWORDS[t][0]}</b>: ${KEYWORDS[t][1]}</p>`).join('');
    inner = `<div class="inspect"><img class="card big" src="${cardURL(bc.def, { power: b.power(bc), plus: bc.inst?.plus, sockets: bc.inst?.sockets || [], bonus: bc.inst?.bonus })}"><div>
      <p>Base ${bc.base} · Buffs ${bc.buff >= 0 ? '+' : ''}${bc.buff} · Auras ${bc.aura >= 0 ? '+' : ''}${bc.aura}</p>${kws}
      ${b.canMoveCard(bc) ? `<button class="btn primary" data-a="startMove" data-bid="${bc.bid}">Move this card</button>` : ''}</div></div>`;
  }
  if (m.type === 'opponent') {
    const b = G.battle; const o = b.opp; const boss = b.boss;
    inner = `<div class="inspect"><img class="portrait" src="${enemyURL(o.portrait)}"><div><h2>${esc(o.name)}</h2><p class="dim">${esc(o.title)}</p><p>${esc(boss ? boss.text : o.text || '')}</p>
      <p><b>Hand:</b> ${b.S[1].hand.length} · <b>Deck:</b> ${b.S[1].deck.length}</p>${G.run.enc_bonus ? '' : ''}${b.enc.bonus ? `<p>Their cards have +${b.enc.bonus} Power.</p>` : ''}</div></div>`;
  }
  if (m.type === 'lane') {
    const b = G.battle; const lane = b.lanes[m.lane];
    inner = `<h2>${lane.isHome ? 'Home' : esc(lane.loc.name)}</h2><p>${lane.isHome ? (lane.home.map((h) => `<b>${esc(h.name)}</b>: ${esc(h.text)}`).join('<br>') || 'Your Home lane. Add upgrades at Builders.') : esc(lane.loc.text)}</p>
      <p>You <b>${lane.totals[0]}</b> · Opponent <b>${lane.totals[1]}</b></p>${lane.lock[0] === b.turn ? '<p>❄ Frozen: you can\'t play here this turn.</p>' : ''}`;
  }
  if (m.type === 'relic') { inner = relicCard(m.id); }
  if (m.type === 'pick') inner = `<h2>${esc(m.title)}</h2>${m.gem ? `<p>${gemChip(m.gem)} ${esc(GEMS[m.gem].text)}</p>` : ''}<div class="deckgrid">${sortDeck(r.deck).filter(m.filter || (() => true)).map((c) => instImg(c, `data-a="modalPick" data-uid="${c.uid}"`)).join('')}</div>`;
  if (m.type === 'menu') inner = `<h2>Paused</h2><div class="menu-col"><button class="btn" data-a="closeModal">Resume</button><button class="btn" data-a="howtoModal">How to Play</button><button class="btn" data-a="toggleSound">Sound: ${G.meta.settings.sound ? 'On' : 'Off'}</button><button class="btn" data-a="saveQuit">Save & Quit to Title</button><button class="btn bad" data-a="abandon">Abandon Run</button></div>`;
  if (m.type === 'help') inner = `<h2>Battle Basics</h2><div class="prose"><p>Drag a card onto a lane (or tap a card, then tap a lane). Win <b>2 of 3</b> lanes after ${G.battle?.maxTurns || 6} turns.</p><p>Energy = turn number. Played cards stay face-down until <b>End Turn</b>, then both sides reveal. Tap a face-down card to take it back.</p><p>The badges show each side's Power per lane (green = you're winning). Tap a revealed card to inspect or <b>Move</b> it; tap the opponent's portrait to see their info.</p></div>`;
  return `<div class="overlay" data-a="closeModalBg"><div class="panel modal ${m.type}">${inner}<button class="btn closex" data-a="closeModal">✕</button></div></div>`;
}

// ---------------- actions ----------------
const A = {};
A.title = () => go('title');
A.howto = () => go('howto');
A.toggleSound = () => { G.meta.settings.sound = !G.meta.settings.sound; setSound(G.meta.settings.sound); persist(); render(); };
A.newRun = () => { G.heat = Math.min(G.heat, G.meta.maxHeat); go('wardens'); };
A.pickWarden = (d) => { G.warden = d.id; render(); };
A.heat = (d) => { G.heat = Math.max(0, Math.min(G.meta.maxHeat, G.heat + +d.d)); render(); };
A.startRun = () => {
  G.run = R.newRun(G.meta, G.warden, G.heat);
  persist(); G.mapSel = null; go('map');
};
A.continue = () => {
  const saved = loadRun();
  if (!saved) return go('title');
  G.run = R.migrateRun(saved);
  G.mapSel = null;
  persist();
  resumeRun();
};
function resumeRun() {
  const r = G.run;
  if (r.over) return finishRun();
  if (r.pendingReward) return go('reward');
  if (r.node && !r.node.done) return openNode(R.nodeById(r, r.node.id), true);
  go('map');
}
A.archive = () => go('archive');
A.archiveTab = (d) => { G.archiveTab = d.t; render(); };
A.codex = () => go('codex');
A.codexTab = (d) => { G.codexTab = d.t; render(); };
A.buyUnlock = (d) => { const u = UNLOCK_MAP[d.id]; if (!u || G.meta.shards < u.cost) return; G.meta.shards -= u.cost; G.meta.unlocked.push(u.id); sfx.evolve(); persist(); toast(`Unlocked ${u.name}!`); };
A.deck = () => { G.modal = { type: 'deck' }; render(); };
A.menu = () => { G.modal = { type: 'menu' }; render(); };
A.howtoModal = () => go('howto');
A.closeModal = () => { G.modal = null; render(); };
A.closeModalBg = (d, el, ev) => { if (ev.target === el) { G.modal = null; render(); } };
A.relicInfo = (d) => { G.modal = { type: 'relic', id: d.id }; render(); };
A.inspectDef = (d) => { G.modal = { type: 'inspect', id: d.id }; render(); };
A.inspectInst = (d) => { const inst = G.run.deck.find((c) => c.uid === d.uid); G.modal = { type: 'inspect', id: inst.id, inst }; render(); };
A.saveQuit = () => { persist(); G.battle = null; go('title'); };
A.abandon = () => { if (!confirmAbandon()) return; G.run.over = 'defeat'; finishRun(); };
function confirmAbandon() { if (G._abandonArmed) { G._abandonArmed = false; return true; } G._abandonArmed = true; toast('Tap Abandon again to confirm.'); setTimeout(() => (G._abandonArmed = false), 3000); return false; }

// map
A.mapNode = (d) => {
  sfx.click();
  if (R.availableNodes(G.run).includes(d.id)) return A.enterNode(d);
  G.mapSel = d.id;
  render();
};
A.enterNode = (d) => openNode(R.nodeById(G.run, d.id));
window.__openNode = (id) => openNode(R.nodeById(G.run, id));
function openNode(n, resumed = false) {
  const r = G.run;
  if (!n || (!resumed && !R.enterNode(r, n.id))) return;
  if (!r.visited.includes(n.id)) r.visited.push(n.id);
  if (!resumed || !r.node || r.node.id !== n.id) r.node = { id: n.id, type: n.type, done: false };
  const st = r.node;
  if (n.type === 'shop' && !st.shop) st.shop = R.rollShop(r);
  if (n.type === 'gem' && !st.gemChoices) st.gemChoices = R.rollGemChoices(r);
  if (n.type === 'treasure' && !st.relicRolled) { st.relicRolled = true; st.relic = R.gainRandomRelicId(r); st.gold = 25 + R.rngFor(r).int(0, 25); r.gold += st.gold; }
  if (n.type === 'home' && !st.choices) st.choices = R.homeChoices(r, 3);
  if (n.type === 'event' && !st.event) st.event = R.rollEvent(r);
  persist();
  if (n.enc) { startBattle(n); return; }
  go(n.type);
}
A.leaveNode = () => { const r = G.run; r.node.done = true; G.mapSel = null; persist(); go('map'); };

// battle
function startBattle(n) {
  const r = G.run;
  G.battle = new Battle(r, n.enc, (r.seed ^ (r.fights * 7919) ^ n.row * 31) >>> 0);
  G.battle.start(); G.sel = null; G.moveSel = null; G.lastOutcome = null; G.battleHint = r.fights === 0 && !G.meta.tutorialDone ? 'Drag a card onto a lane, then End Turn to reveal. Win 2 of 3 lanes after 6 turns.' : null;
  mode = 'battle'; G.screen = 'battle'; render();
  board.setup(G.battle); processFx(); sfx.turn();
}
A.endTurn = () => {
  const b = G.battle; if (b.over) return;
  G.sel = null; G.moveSel = null; G.battleHint = null;
  if (!G.meta.tutorialDone) { G.meta.tutorialDone = true; }
  b.endTurn(); board.sync(); processFx();
  if (b.over) {
    const node = R.nodeById(G.run, G.run.node.id);
    G.lastOutcome = R.applyBattle(G.run, G.meta, node, b.result);
    G.run.node.done = true;
    (b.result.won ? sfx.win : sfx.lose)();
    persist();
  } else sfx.turn();
  render();
};
A.startMove = (d) => { G.moveSel = +d.bid; G.modal = null; G.sel = null; toast('Tap a lane to move it there.'); };
A.laneInfo = (d) => { G.modal = { type: 'lane', lane: +d.lane }; render(); };
A.oppInfo = () => { G.modal = { type: 'opponent' }; render(); };
A.battleHelp = () => { G.modal = { type: 'help' }; render(); };
A.afterBattle = () => {
  G.battle = null; mode = 'menu';
  if (G.run.over) return finishRun();
  go('reward');
};

// rewards
A.takeCard = (d) => {
  const r = G.run; const id = r.pendingReward.cards[+d.i];
  R.takeCard(r, id); sfx.play();
  afterReward(`${CARDS[id].name} added to your deck.`);
};
A.skipCard = () => { G.run.gold += 10; afterReward('Skipped.'); };
A.reroll = () => { const r = G.run; if (r.rerolls <= 0) return; r.rerolls--; r.pendingReward.cards = R.rollCards(r, R.rewardCount(r)); persist(); render(); };
A.banishMode = () => { G.banishMode = !G.banishMode; render(); };
A.banish = (d) => {
  const r = G.run; const id = r.pendingReward.cards[+d.i]; if (r.banishes <= 0) return;
  r.banishes--; r.banished.push(id); G.banishMode = false;
  r.pendingReward.cards[+d.i] = R.rollCards(r, 1)[0]; persist(); toast(`${CARDS[id].name} banished.`);
};
A.bossRelic = (d) => { const r = G.run; R.gainRelic(r, d.id); r.pendingReward.bossRelics = null; persist(); render(); };
function afterReward(msg) {
  const r = G.run; r.pendingReward = null;
  const node = R.nodeById(r, r.node.id);
  if (node.type === 'boss') {
    R.finishAct(r);
    if (r.over) return finishRun();
    persist(); G.mapSel = null; go('map'); return;
  }
  persist(); G.mapSel = null; go('map'); if (msg) toast(msg);
}
function finishRun() {
  const r = G.run; const res = R.endRun(r, G.meta);
  G.summary = { ...res, run: r };
  clearRun(); saveMeta(G.meta); G.run = null; G.battle = null; mode = 'menu';
  go('summary');
}

// shop
function chooseGemCard(id, title, apply) {
  const filter = (card) => R.canSocket(card, id);
  if (!G.run.deck.some(filter)) { sfx.error(); toast('No compatible empty sockets.'); return; }
  G.modal = { type: 'pick', title, gem: id, filter, onPick: apply };
  render();
}

A.buy = (d) => {
  const r = G.run; const shop = r.node.shop; const idx = +d.i; const it = shop.items[idx];
  if (!it || it.sold) return;
  if (r.gold < it.price) { sfx.error(); toast('Not enough gold.'); return; }
  if (it.kind === 'gem') {
    chooseGemCard(it.id, `Socket ${GEMS[it.id].name} · ${it.price}g`, (uid) => {
      if (R.buy(r, shop, idx, uid)) { sfx.coin(); persist(); toast('Gem socketed.'); }
    });
    return;
  }
  if (R.buy(r, shop, idx)) { sfx.coin(); persist(); render(); }
};
A.chooseGem = (d) => {
  const r = G.run;
  if (r.node.type !== 'gem' || !r.node.gemChoices.includes(d.id)) return;
  chooseGemCard(d.id, `Socket ${GEMS[d.id].name}`, (uid) => {
    if (R.claimGem(r, d.id, uid)) { sfx.buff(); A.leaveNode(); toast('Gem socketed.'); }
  });
};
A.shopRemove = () => {
  const r = G.run; const s = r.node.shop; if (s.removeUsed) return;
  if (r.gold < s.removePrice) { sfx.error(); toast('Not enough gold.'); return; }
  G.modal = { type: 'pick', title: `Remove a card (${s.removePrice}g)`, onPick: (uid) => { r.gold -= s.removePrice; s.removeUsed = true; r.removalsBought++; R.removeCard(r, uid); sfx.destroy(); persist(); } };
  render();
};
A.modalPick = (d) => { const m = G.modal; G.modal = null; m.onPick(d.uid); render(); };

// forge
A.forgeTab = (d) => { G.run.node.tab = d.t; render(); };
A.forgeBore = () => {
  const r = G.run; const free = r.perks.includes('perk_forgecraft');
  if (r.node.bored || (!free && r.gold < 40)) return;
  G.modal = { type: 'pick', title: 'Bore a socket into…', filter: (c) => c.sockets.length < 3 && !cardDef(c.id).token, onPick: (uid) => { if (!R.boreSocket(r, uid)) return; if (!free) r.gold -= 40; r.node.bored = true; sfx.buff(); persist(); } };
  render();
};
A.evolve = (d) => { const c = R.evolve(G.run, G.meta, d.uid); if (c) { sfx.evolve(); persist(); toast(`Evolved into ${CARDS[c.id].name}!`); } };
A.fuse = (d) => { const c = R.fuse(G.run, d.a1, d.b1); if (c) { sfx.evolve(); persist(); toast(`${CARDS[c.id].name}+ forged.`); } };

// other nodes
A.purgeCard = (d) => { R.removeCard(G.run, d.uid); sfx.destroy(); A.leaveNode(); toast('Card removed.'); };
A.mirrorCard = (d) => { const n = R.cloneCard(G.run, d.uid); sfx.evolve(); A.leaveNode(); toast(`${CARDS[n.id]?.name || 'Card'} duplicated.`); };
A.campHeal = () => { const r = G.run; r.hearts = Math.min(r.maxHearts, r.hearts + 1); sfx.buff(); A.leaveNode(); toast('You feel rested.'); };
A.campUpgradeScreen = () => go('campUpgrade');
A.upgradeCard = (d) => { R.upgradeCard(G.run, d.uid); sfx.buff(); A.leaveNode(); toast('Card upgraded.'); };
A.pickHome = (d) => { G.run.home.push(d.id); sfx.evolve(); A.leaveNode(); toast(`${HOME_UPGRADES[d.id].name} built.`); };
A.eventChoice = (d) => {
  const r = G.run; const ev = EVENTS.find((e) => e.id === r.node.event); const c = ev.choices[+d.i];
  if (c.can && !c.can(r)) return;
  r.node.result = c.apply(R.eventApi(r)) || ''; sfx.click(); persist(); render();
};

// event delegation
root.addEventListener('click', (e) => {
  const el = e.target.closest('[data-a]'); if (!el || el.disabled) return;
  const fn = A[el.dataset.a]; if (!fn) return;
  if (el.dataset.a !== 'closeModalBg') e.stopPropagation();
  fn(el.dataset, el, e);
});

// after each render: map lines
const mo = new MutationObserver(() => { if (G.screen === 'map') requestAnimationFrame(drawMapLines); });
mo.observe(root, { childList: true });
window.addEventListener('resize', () => { if (G.screen === 'map') drawMapLines(); });

window.__A = A; window.__R = R;
export function boot() {
  layout(); render(); frame();
  $('#loading')?.remove();
}
