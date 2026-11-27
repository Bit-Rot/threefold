// Run-level systems: map generation, encounters, rewards, shops, forge, events, meta payouts.
import { CARD_LIST, CARDS, EVO_RECIPES, RARITY_WEIGHT, cardDef } from '../data/cards.js';
import { GEM_LIST, GEMS } from '../data/gems.js';
import { RELIC_LIST, RELICS, RELIC_PRICE } from '../data/relics.js';
import { LOCATION_LIST } from '../data/locations.js';
import { HOME_LIST, HOME_UPGRADES } from '../data/home.js';
import { ACT_POOLS, BOSSES, ENEMY_TYPES } from '../data/enemies.js';
import { WARDENS } from '../data/wardens.js';
import { EVENTS } from '../data/events.js';
import { UNLOCK_MAP } from '../data/meta.js';
import { makeRng } from '../core/rng.js';

export const ACTS = 3;

// ---------- unlocks ----------
export function unlockedSet(meta) {
  const s = new Set(['core']);
  for (const id of meta.unlocked || []) {
    s.add(id);
    for (const g of UNLOCK_MAP[id]?.grants || []) s.add(g);
  }
  return s;
}
const open = (set, key) => !key || set.has(key);

// ---------- rng ----------
export function rngFor(run) {
  const r = makeRng(1);
  r.state = run.rngState;
  const wrap = Object.create(r);
  for (const k of ['next', 'int', 'pick', 'chance', 'shuffle', 'sample', 'weighted']) {
    wrap[k] = (...a) => { r.state = run.rngState; const v = r[k](...a); run.rngState = r.state; return v; };
  }
  return wrap;
}

export function socketsFor(def) { return ['rare', 'legendary', 'evolved'].includes(def.rarity) ? 2 : 1; }
export function makeInst(run, id, extra = {}) {
  const def = cardDef(id);
  return { uid: 'c' + run.nextUid++, id, plus: 0, bonus: 0, sockets: new Array(def.token ? 0 : socketsFor(def)).fill(null), ...extra };
}

// ---------- new run ----------
export function newRun(meta, wardenId, heat = 0, seed) {
  seed = seed ?? ((Math.random() * 2 ** 31) | 0);
  const warden = WARDENS[wardenId];
  const run = {
    v: 1, seed, rngState: seed || 1, warden: wardenId, heat, act: 1, nextUid: 1,
    deck: [], relics: [], gems: [], gold: 60, hearts: 3, maxHearts: 3, home: [],
    map: null, pos: null, fightsWon: 0, fights: 0, shards: 0, log: [],
    rerolls: 0, banishes: 0, banished: [], secondWind: {}, removalsBought: 0, over: false,
    unlocked: [...unlockedSet(meta)], perks: [...(meta.unlocked || [])].filter((u) => u.startsWith('perk_')),
    stats: { evolutions: 0, cardsAdded: 0, removed: 0, elites: 0, bosses: 0 },
  };
  if (heat >= 7) { run.hearts--; run.maxHearts--; }
  for (const id of warden.deck) run.deck.push(makeInst(run, id));
  if (heat >= 4) run.deck.push(makeInst(run, 'junk'));
  if (warden.relic) gainRelic(run, warden.relic);
  if (wardenId === 'forgemaster') {
    const rng = rngFor(run);
    for (const c of rng.sample(run.deck.filter((c) => c.id !== 'junk'), 2)) c.sockets.push(null);
    run.gems.push('ember');
  }
  if (run.perks.includes('perk_reroll')) run.rerolls += 1;
  if (run.perks.includes('perk_reroll2')) run.rerolls += 2;
  if (run.perks.includes('perk_banish')) run.banishes = 2;
  run.map = genActMap(run, 1);
  return run;
}

// ---------- map ----------
const SERVICES = ['shop', 'forge', 'purge', 'mirror', 'camp', 'event', 'treasure', 'home', 'event', 'shop'];
export const NODE_INFO = {
  battle: { name: 'Battle', desc: 'A fight. Win 2 of 3 lanes.' },
  elite: { name: 'Elite', desc: 'A harder fight. Rewards a relic and a gem.' },
  boss: { name: 'Boss', desc: 'The guardian of this act.' },
  shop: { name: 'Shop', desc: 'Buy cards, gems, relics and card removal.' },
  forge: { name: 'Forge', desc: 'Socket gems, evolve cards, fuse duplicates.' },
  purge: { name: 'Shrine of Ash', desc: 'Remove a card from your deck.' },
  mirror: { name: 'Mirror Pool', desc: 'Duplicate a card in your deck.' },
  camp: { name: 'Campfire', desc: 'Upgrade a card or heal a heart.' },
  event: { name: 'Mystery', desc: 'Something strange on the road.' },
  treasure: { name: 'Treasure', desc: 'A relic and some gold.' },
  home: { name: 'Builder', desc: 'Add an upgrade to your Home lane.' },
};

export function genActMap(run, act) {
  const rng = rngFor(run);
  const rows = [];
  const svcRow = (n, must) => {
    const types = must ? [must] : [];
    while (types.length < n) { const t = rng.pick(SERVICES); if (!types.includes(t) || rng.chance(0.15)) types.push(t); }
    return rng.shuffle(types);
  };
  rows.push(['battle']);
  rows.push(svcRow(3, act === 1 ? 'home' : rng.pick(['home', 'shop'])));
  rows.push(rng.shuffle(['battle', 'elite', rng.chance(0.5) ? 'battle' : 'elite']));
  rows.push(svcRow(3, rng.pick(['camp', 'forge'])));
  rows.push(['boss']);
  let id = 0;
  const map = { act, rows: rows.map((r, ri) => r.map((type, ci) => ({ id: `a${act}n${id++}`, type, row: ri, col: ci, n: r.length, next: [] }))) };
  for (let ri = 0; ri < map.rows.length - 1; ri++) {
    const cur = map.rows[ri], nxt = map.rows[ri + 1];
    for (const node of cur) {
      const x = (node.col + 0.5) / cur.length;
      const cand = nxt.map((m) => ({ m, d: Math.abs((m.col + 0.5) / nxt.length - x) })).sort((a, b) => a.d - b.d);
      node.next.push(cand[0].m.id);
      if (cand[1] && cand[1].d < 0.45) node.next.push(cand[1].m.id);
    }
    for (const m of nxt) if (!cur.some((n) => n.next.includes(m.id))) {
      const x = (m.col + 0.5) / nxt.length;
      cur.slice().sort((a, b) => Math.abs((a.col + 0.5) / cur.length - x) - Math.abs((b.col + 0.5) / cur.length - x))[0].next.push(m.id);
    }
  }
  // pre-roll encounters so the map can scout them
  for (const row of map.rows) for (const node of row) if (['battle', 'elite', 'boss'].includes(node.type)) node.enc = makeEncounter(run, act, node);
  return map;
}

export function nodeById(run, id) { for (const r of run.map.rows) for (const n of r) if (n.id === id) return n; return null; }
export function availableNodes(run) {
  if (!run.pos) return run.map.rows[0].map((n) => n.id);
  const cur = nodeById(run, run.pos);
  return cur ? cur.next : [];
}

function heatMult(run) { let m = 1; if (run.heat >= 1) m += 0.1; if (run.heat >= 8) m += 0.1; return m; }

export function makeEncounter(run, act, node) {
  const rng = rngFor(run);
  const pools = ACT_POOLS[act];
  const set = new Set(run.unlocked);
  const locs = LOCATION_LIST.filter((l) => open(set, l.unlock) && l.id !== 'open_field');
  const pickLocs = () => { const two = rng.sample(locs, 2); return [two[0].id, null, rng.chance(0.15) ? 'open_field' : two[1].id]; };
  const actBase = [0.62, 1.0, 1.45][act - 1];
  if (node.type === 'boss') {
    const boss = Object.values(BOSSES).find((b) => b.act === act);
    let scale = [0.9, 1.25, 1.6][act - 1] * heatMult(run) * (run.heat >= 5 ? 1.15 : 1);
    return { kind: 'boss', boss: boss.id, enemies: boss.enemies.slice(), locs: pickLocs(), scale };
  }
  const rowF = node.row >= 2 ? 1.18 : 1;
  if (node.type === 'elite') {
    const el = rng.sample(pools.elite, 2);
    const ba = rng.pick(pools.basic.filter((t) => !el.includes(t)));
    const enemies = rng.shuffle([...el, ba]);
    return { kind: 'elite', enemies, locs: pickLocs(), scale: actBase * rowF * 1.15 * heatMult(run) * (run.heat >= 3 ? 1.15 : 1) };
  }
  const enemies = rng.sample(pools.basic, 3);
  return { kind: 'battle', enemies, locs: pickLocs(), scale: actBase * rowF * heatMult(run) };
}

// ---------- pools ----------
export function cardPool(run) {
  const set = new Set(run.unlocked);
  return CARD_LIST.filter((c) => !c.evo && open(set, c.set) && !run.banished.includes(c.id));
}
export function relicPool(run) {
  const set = new Set(run.unlocked);
  return RELIC_LIST.filter((r) => open(set, r.unlock) && !run.relics.includes(r.id) && !WARDEN_RELICS.includes(r.id));
}
const WARDEN_RELICS = [];
export function gemPool(run) { const set = new Set(run.unlocked); return GEM_LIST.filter((g) => open(set, g.unlock)); }

export function rollCards(run, n, minRarity) {
  const rng = rngFor(run);
  const order = ['common', 'uncommon', 'rare', 'legendary'];
  const minI = minRarity ? order.indexOf(minRarity) : 0;
  const pool = cardPool(run).filter((c) => order.indexOf(c.rarity) >= minI);
  const actBoost = (run.act - 1) * 0.5;
  const out = [];
  let guard = 0;
  while (out.length < n && guard++ < 200) {
    const c = rng.weighted(pool, (c) => RARITY_WEIGHT[c.rarity] * (c.rarity === 'common' ? 1 : 1 + actBoost));
    if (!out.includes(c.id)) out.push(c.id);
  }
  return out;
}

export function rewardCount(run) {
  let n = 3;
  for (const id of run.relics) n += RELICS[id]?.rewardBonus || 0;
  if (run.heat >= 6) n--;
  return Math.max(2, n);
}

// ---------- battle results ----------
export function applyBattle(run, meta, node, result) {
  const enc = node.enc;
  const out = { won: result.won, gold: result.gold, shards: 0, heartLost: false, lanesWon: result.lanesWon, notes: result.notes || [], relic: null, gem: null };
  run.fights++;
  run.gold += result.gold;
  out.shards = result.lanesWon + (result.won ? 2 : 0);
  if (result.won) {
    run.fightsWon++;
    if (enc.kind === 'elite') { out.shards += 3; run.stats.elites++; out.relic = gainRandomRelicId(run); out.gem = gainRandomGemId(run); }
    if (enc.kind === 'boss') {
      out.shards += 8; run.stats.bosses++;
      for (const id of run.relics) RELICS[id]?.afterBoss?.(run);
    }
  } else {
    const sw = run.relics.includes('second_wind') && !run.secondWind[run.act];
    if (sw) { run.secondWind[run.act] = true; out.notes.push('Second Wind: no heart lost'); }
    else { run.hearts--; out.heartLost = true; }
  }
  out.shards = Math.round(out.shards * (1 + run.heat * 0.1));
  run.shards += out.shards;
  meta.stats.fights++;
  // reward offer
  const minR = enc.kind === 'boss' ? 'rare' : enc.kind === 'elite' ? 'uncommon' : null;
  run.pendingReward = { cards: rollCards(run, rewardCount(run), minR), bossRelics: null };
  if (enc.kind === 'boss' && result.won) run.pendingReward.bossRelics = rollRelicChoices(run, 3);
  if (run.hearts <= 0) run.over = 'defeat';
  return out;
}

export function rollRelicChoices(run, n) { const rng = rngFor(run); return rng.sample(relicPool(run), n).map((r) => r.id); }

export function gainRelic(run, id) {
  if (!RELICS[id] || run.relics.includes(id)) return;
  run.relics.push(id);
  RELICS[id].onGain?.(run);
}
export function gainRandomRelicId(run) { const pool = relicPool(run); if (!pool.length) { run.gold += 50; return null; } const r = rngFor(run).pick(pool); gainRelic(run, r.id); return r.id; }
export function gainRandomGemId(run) { const g = rngFor(run).pick(gemPool(run)); run.gems.push(g.id); return g.id; }

export function takeCard(run, id) { run.deck.push(makeInst(run, id)); run.stats.cardsAdded++; }

// ---------- act / node progression ----------
export function enterNode(run, id) { run.pos = id; }
export function finishAct(run) {
  if (run.act >= ACTS) { run.over = 'victory'; return; }
  run.act++;
  run.pos = null;
  run.map = genActMap(run, run.act);
  for (const id of run.relics) RELICS[id]?.onAct?.(run);
}

// ---------- shop ----------
export const CARD_PRICE = { common: 45, uncommon: 70, rare: 110, legendary: 160, evolved: 200 };
export function priceMult(run) {
  let m = 1; for (const id of run.relics) m -= RELICS[id]?.shopDiscount || 0;
  if (run.heat >= 2) m += 0.15;
  return Math.max(0.4, m);
}
export function rollShop(run) {
  const rng = rngFor(run);
  let nCards = 5; for (const id of run.relics) nCards += RELICS[id]?.shopBonus || 0;
  const m = priceMult(run);
  const cards = rollCards(run, nCards).map((id) => ({ kind: 'card', id, price: Math.round(CARD_PRICE[CARDS[id].rarity] * m * (0.9 + rng.next() * 0.2)), sold: false }));
  const gems = rng.sample(gemPool(run), 2).map((g) => ({ kind: 'gem', id: g.id, price: Math.round(g.price * m), sold: false }));
  const relics = rng.sample(relicPool(run), 2).map((r) => ({ kind: 'relic', id: r.id, price: Math.round(RELIC_PRICE[r.rarity] * m), sold: false }));
  return { items: [...cards, ...gems, ...relics], removePrice: Math.round((60 + 25 * run.removalsBought) * m), removeUsed: false };
}
export function buy(run, shop, idx) {
  const it = shop.items[idx];
  if (!it || it.sold || run.gold < it.price) return false;
  run.gold -= it.price; it.sold = true;
  if (it.kind === 'card') takeCard(run, it.id);
  if (it.kind === 'gem') run.gems.push(it.id);
  if (it.kind === 'relic') gainRelic(run, it.id);
  return true;
}

// ---------- deck manipulation ----------
export function removeCard(run, uid) { const i = run.deck.findIndex((c) => c.uid === uid); if (i >= 0) { run.deck.splice(i, 1); run.stats.removed++; return true; } return false; }
export function cloneCard(run, uid) { const c = run.deck.find((c) => c.uid === uid); if (!c) return null; const n = makeInst(run, c.id, { plus: c.plus }); run.deck.push(n); return n; }
export function upgradeCard(run, uid) { const c = run.deck.find((c) => c.uid === uid); if (!c || c.plus) return false; c.plus = 1; return true; }
export function socketGem(run, gemIdx, uid) {
  const c = run.deck.find((c) => c.uid === uid); const gid = run.gems[gemIdx];
  if (!c || !gid) return false;
  const s = c.sockets.indexOf(null); if (s < 0) return false;
  if (gid === 'evo' && !EVO_RECIPES.some((r) => r.base === c.id)) return false;
  c.sockets[s] = gid; run.gems.splice(gemIdx, 1); return true;
}
export function boreSocket(run, uid) { const c = run.deck.find((c) => c.uid === uid); if (!c || c.sockets.length >= 3) return false; c.sockets.push(null); return true; }
export function evoOptions(run) {
  const out = [];
  for (const c of run.deck) {
    const r = EVO_RECIPES.find((r) => r.base === c.id); if (!r) continue;
    const cat = run.deck.find((d) => d.id === r.catalyst && d.uid !== c.uid);
    out.push({ uid: c.uid, recipe: r, hasGem: c.sockets.includes('evo'), catalystUid: cat?.uid || null, ready: c.sockets.includes('evo') && !!cat });
  }
  return out;
}
export function evolve(run, meta, uid) {
  const o = evoOptions(run).find((o) => o.uid === uid && o.ready); if (!o) return null;
  const c = run.deck.find((c) => c.uid === uid);
  removeCard(run, o.catalystUid); run.stats.removed--;
  c.id = o.recipe.result;
  const sock = c.sockets.map((g) => (g === 'evo' ? null : g));
  while (sock.length < 2) sock.push(null);
  c.sockets = sock;
  run.stats.evolutions++;
  if (meta) { meta.recipes[o.recipe.result] = true; meta.stats.evolutions++; }
  return c;
}
export function fuseOptions(run) {
  const groups = {};
  for (const c of run.deck) if (!c.plus && !cardDef(c.id).token) (groups[c.id] ||= []).push(c);
  return Object.values(groups).filter((g) => g.length >= 2).map((g) => ({ id: g[0].id, a: g[0].uid, b: g[1].uid }));
}
export function fuse(run, a, b) {
  const A = run.deck.find((c) => c.uid === a), B = run.deck.find((c) => c.uid === b);
  if (!A || !B || A.id !== B.id) return null;
  A.plus = 1;
  A.bonus = (A.bonus || 0) + (B.bonus || 0);
  const gems = [...A.sockets.filter(Boolean), ...B.sockets.filter(Boolean)];
  const n = Math.min(3, Math.max(A.sockets.length, B.sockets.length) + 1);
  A.sockets = new Array(n).fill(null);
  gems.slice(0, n).forEach((g, i) => (A.sockets[i] = g));
  for (const g of gems.slice(n)) run.gems.push(g);
  removeCard(run, b); run.stats.removed--;
  return A;
}

export function homeChoices(run, n = 3) {
  const rng = rngFor(run);
  const cap = 4 + run.home.filter((h) => h === 'foundation').length;
  const pool = HOME_LIST.filter((h) => (h.stack ? true : !run.home.includes(h.id)) && !(h.id === 'foundation' && cap >= 6));
  return rng.sample(pool, n).map((h) => h.id);
}

// ---------- events ----------
export function rollEvent(run) { return rngFor(run).pick(EVENTS).id; }
export function eventApi(run) {
  const rng = rngFor(run);
  const nonJunk = () => run.deck.filter((c) => !cardDef(c.id).token);
  const api = {
    run, rng,
    gold(n) { run.gold = Math.max(0, run.gold + n); },
    hearts(n) { run.hearts = Math.max(1, Math.min(run.maxHearts, run.hearts + n)); },
    gainGem(id) { run.gems.push(id); return `Gained ${GEMS[id].name}.`; },
    gainRandomGem() { const id = gainRandomGemId(run); return `Gained ${GEMS[id].name}.`; },
    gainRandomRelic() { const id = gainRandomRelicId(run); return id ? `Gained ${RELICS[id].name}!` : 'Nothing left to find (+50 gold).'; },
    gainRandomCard(min) { const id = rollCards(run, 1, min)[0]; takeCard(run, id); return `${CARDS[id].name} joins your deck.`; },
    addSocketRandom() { const c = rng.pick(nonJunk().filter((c) => c.sockets.length < 3)); if (!c) return 'Nothing to bore.'; c.sockets.push(null); return `${cardDef(c.id).name} gained a socket.`; },
    duplicateRandom() { const c = rng.pick(nonJunk()); const n = cloneCard(run, c.uid); return `${cardDef(n.id).name} was duplicated.`; },
    transformRandom(up) {
      const c = rng.pick(nonJunk()); const order = ['common', 'uncommon', 'rare', 'legendary'];
      const r = cardDef(c.id).rarity; const target = up ? order[Math.min(3, order.indexOf(r) + 1)] : r;
      const id = rollCards(run, 1, target)[0]; const old = cardDef(c.id).name; c.id = id; c.plus = 0;
      return `${old} became ${CARDS[id].name}.`;
    },
    upgradeRandom(n) { const pool = rng.sample(nonJunk().filter((c) => !c.plus), n); pool.forEach((c) => (c.plus = 1)); return pool.length ? `Upgraded ${pool.map((c) => cardDef(c.id).name).join(', ')}.` : 'Nothing to upgrade.'; },
    removeWhere(fn) { const c = rng.pick(run.deck.filter((c) => fn(cardDef(c.id)))); if (!c) return 'Nothing to remove.'; removeCard(run, c.uid); return `Removed ${cardDef(c.id).name}.`; },
    removeRandom() { const c = rng.pick(run.deck); if (!c) return ''; removeCard(run, c.uid); return `${cardDef(c.id).name} burned away.`; },
    removeWeakest() { const c = run.deck.slice().sort((a, b) => cardDef(a.id).power - cardDef(b.id).power)[0]; if (!c) return ''; removeCard(run, c.uid); return `Removed ${cardDef(c.id).name}.`; },
    gainRandomHome() { const id = homeChoices(run, 1)[0]; if (!id) return 'Your Home is complete.'; run.home.push(id); return `Home upgraded: ${HOME_UPGRADES[id].name}.`; },
    evoHints() {
      const opts = evoOptions(run);
      if (!opts.length) return 'None of your cards can evolve yet. Recipes: ' + EVO_RECIPES.slice(0, 3).map((r) => `${CARDS[r.base].name} + ${CARDS[r.catalyst].name}`).join('; ') + '…';
      return 'Your deck can evolve: ' + opts.map((o) => `${CARDS[o.recipe.base].name} + ${CARDS[o.recipe.catalyst].name} → ${CARDS[o.recipe.result].name}`).join('; ');
    },
  };
  return api;
}

// ---------- end of run ----------
export function endRun(run, meta) {
  const victory = run.over === 'victory';
  let bonus = victory ? 20 + run.heat * 5 : 0;
  bonus += (run.act - 1) * 3;
  run.shards += bonus;
  meta.shards += run.shards;
  meta.stats.runs++;
  if (victory) { meta.stats.wins++; meta.maxHeat = Math.max(meta.maxHeat, Math.min(8, run.heat + 1)); }
  meta.stats.bestAct = Math.max(meta.stats.bestAct, victory ? 4 : run.act);
  return { victory, shards: run.shards, bonus };
}

export { ENEMY_TYPES, BOSSES };
