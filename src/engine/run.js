// Run-level systems: map generation, encounters, rewards, shops, fusion, meta payouts.
import { CARD_LIST, CARDS, EVO_RECIPES, RARITY_WEIGHT, cardDef } from '../data/cards.js';
import { GEM_LIST, GEMS } from '../data/gems.js';
import { RELIC_LIST, RELICS, RELIC_PRICE } from '../data/relics.js';
import { LOCATION_LIST } from '../data/locations.js';
import { HOME_LIST } from '../data/home.js';
import { ACT_POOLS, BOSSES, OPPONENTS, BOSS_ORDER } from '../data/enemies.js';
import { STARTER_DECKS } from '../data/starterDecks.js';
import { cardUnlock, relicUnlock, locationUnlock, expandLegacyUnlocks, recordProgress } from '../data/achievements.js';
import { LEVELS, levelAvailable } from '../data/levels.js';
import { makeRng } from '../core/rng.js';

export const ACTS = BOSS_ORDER.length;
export function regionFor(act) { return Math.min(3, 1 + Math.floor((act - 1) * 3 / ACTS)); }

// ---------- unlocks ----------
export function unlockedSet(meta) {
  return new Set(['core', ...(meta.unlocked || [])]);
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

export function makeInst(run, id, extra = {}) {
  const def = cardDef(id);
  return { uid: 'c' + run.nextUid++, id, plus: 0, bonus: 0, sockets: def.token ? [] : [null], ...extra };
}

const RETIRED_CARDS = {
  tinker: 'twin_blades',
  scrap_thrower: 'slinger',
  scrap_golem: 'ice_sentry',
  avalanche: 'queen_thorns',
};

// ---------- new run ----------
export function newRun(meta, starterDeckId, heat = 0, seed) {
  return beginRun(meta, starterDeckId, heat, seed);
}

export function startLevel(meta, level, starterDeckId = meta.starterDeckId, seed) {
  if (!levelAvailable(meta, level)) return null;
  return beginRun(meta, starterDeckId, 0, seed, LEVELS[level - 1]);
}

function beginRun(meta, starterDeckId, heat, seed, level) {
  seed = seed ?? ((Math.random() * 2 ** 31) | 0);
  const starter = STARTER_DECKS[starterDeckId];
  const run = {
    v: 7, seed, rngState: seed || 1, starterDeckId, heat, act: level?.stage ?? 1, level: level?.id ?? null, nextUid: 1,
    deck: [], relics: [], gold: 60, hearts: 3, maxHearts: 3, home: [],
    map: null, pos: null, visited: [], fightsWon: 0, fights: 0, shards: 0, log: [],
    rerolls: 0, banishes: 0, banished: [], secondWind: {}, removalsBought: 0, over: false,
    unlocked: [...unlockedSet(meta)], perks: [...(meta.unlocked || [])].filter((u) => u.startsWith('perk_')),
    stats: { evolutions: 0, cardsAdded: 0, removed: 0, bosses: 0 }, earnedAchievements: [],
  };
  if (heat >= 7) { run.hearts--; run.maxHearts--; }
  for (const id of starter.cards) run.deck.push(makeInst(run, id));
  if (heat >= 4) run.deck.push(makeInst(run, 'junk'));
  if (run.perks.includes('perk_reroll')) run.rerolls += 1;
  if (run.perks.includes('perk_reroll2')) run.rerolls += 2;
  if (run.perks.includes('perk_banish')) run.banishes = 2;
  run.map = genActMap(run, run.act);
  return run;
}

export function migrateRun(run) {
  if (![1, 2, 3, 4, 5, 6].includes(run.v)) return run;
  if (run.v < 5) migrateNodesAndGems(run);
  run.starterDeckId = run.starterDeckId ?? run.warden;
  delete run.warden;
  run.unlocked = expandLegacyUnlocks(run.unlocked);
  run.level = null;
  run.earnedAchievements ??= [];
  run.v = 7;
  return run;
}

function migrateNodesAndGems(run) {
  if (run.v === 1) {
    run.gold += (run.gems || []).reduce((sum, id) => sum + (GEMS[id]?.price || 0), 0);
    delete run.gems;
  }
  run.visited ||= [];
  // Preserve encounters already entered and the choices made on their maps.
  if (run.v < 3 && !run.pos) run.map = genActMap(run, run.act);
  for (const card of run.deck) {
    card.id = RETIRED_CARDS[card.id] ?? card.id;
    card.sockets = (card.sockets ?? (cardDef(card.id).token ? [] : [null])).map((gem) => {
      if (gem !== 'evo') return gem;
      run.gold += GEMS.evo.price;
      return null;
    });
  }
  for (const item of run.node?.shop?.items || []) {
    if (item.kind === 'card') item.id = RETIRED_CARDS[item.id] ?? item.id;
  }
  migrateRemovedNodes(run);
  if (run.pendingReward && (run.v < 4 || run.pendingReward.kind === 'elite')) {
    const reward = run.pendingReward;
    reward.kind = nodeById(run, run.pos)?.enc?.kind ?? 'battle';
    reward.cards = rollRewardCards(run, reward.kind, reward.cards.length);
  }
}

// ---------- map ----------
const SERVICES = ['forge', 'purge', 'mirror', 'camp', 'treasure', 'home'];
export const NODE_INFO = {
  battle: { name: 'Battle', desc: 'A fight. Win 2 of 3 lanes.' },
  boss: { name: 'Boss', desc: 'Both paths lead to this fight.' },
  gem: { name: 'Gem', desc: 'Socket a gem or spend an Evo Gem to evolve a card here.' },
  shop: { name: 'Shop', desc: 'Buy cards, gems, relics and card removal.' },
  forge: { name: 'Fuse', desc: 'Combine two copies of a card into one upgraded card.' },
  purge: { name: 'Shrine of Ash', desc: 'Remove a card from your deck.' },
  mirror: { name: 'Mirror Pool', desc: 'Duplicate a card in your deck.' },
  camp: { name: 'Campfire', desc: 'Refill all your hearts.' },
  treasure: { name: 'Treasure', desc: 'A relic and some gold.' },
  home: { name: 'Builder', desc: 'Add an upgrade to your Home lane.' },
};

function migrateRemovedNodes(run) {
  const nodes = run.map.rows.flat();
  const used = new Set(nodes.map((node) => node.type));
  for (const node of nodes) {
    if (node.type === 'event') {
      node.type = SERVICES.find((type) => !used.has(type)) ?? 'treasure';
      used.add(node.type);
      if (run.node?.id === node.id) {
        if (run.node.result != null) run.node.done = true;
        delete run.node.event;
        delete run.node.result;
      }
    } else if (node.type === 'elite') {
      node.type = 'battle';
      node.enc = makeEncounter(run, run.act, node);
    }
    if (run.node?.id === node.id) run.node.type = node.type;
  }
}

export function genActMap(run, act) {
  const rng = rngFor(run);
  const opening = (run.level ?? act) === 1;
  const lastStops = rng.shuffle(opening ? ['gem', 'shop'] : [rng.pick(['gem', 'shop']), rng.pick(SERVICES)]);
  const firstStops = opening ? rng.shuffle(['home', 'camp']) : rng.sample(SERVICES.filter((type) => !lastStops.includes(type)), 2);
  const rows = [['battle'], firstStops, lastStops, ['boss']];
  let id = 0;
  const map = { act, rows: rows.map((r, ri) => r.map((type, ci) => ({ id: `a${act}n${id++}`, type, row: ri, col: ci, n: r.length, next: [] }))) };
  const [[battle], branches, stops, [boss]] = map.rows;
  battle.next.push(...branches.map((node) => node.id));
  branches.forEach((node, col) => node.next.push(stops[col].id));
  stops.forEach((node) => node.next.push(boss.id));
  // pre-roll encounters so the map can scout them
  for (const row of map.rows) for (const node of row) if (['battle', 'boss'].includes(node.type)) node.enc = makeEncounter(run, act, node);
  return map;
}

export function nodeById(run, id) { for (const r of run.map.rows) for (const n of r) if (n.id === id) return n; return null; }
export function availableNodes(run) {
  if (!run.pos) return run.map.rows[0].map((n) => n.id);
  const cur = nodeById(run, run.pos);
  return cur ? cur.next : [];
}

export function makeEncounter(run, act, node) {
  const rng = rngFor(run);
  const region = regionFor(act);
  const pools = ACT_POOLS[region];
  const set = new Set(run.unlocked);
  const locs = LOCATION_LIST.filter((l) => open(set, locationUnlock(l)) && l.id !== 'open_field');
  const two = rng.sample(locs, 2);
  const locIds = [two[0].id, null, rng.chance(0.12) ? 'open_field' : two[1].id];
  const level = LEVELS[run.level - 1];
  const bonus = level?.extraPower ?? (Math.max(0, region - 2) + (run.heat >= 8 ? 1 : 0));
  const enemyStartBonus = run.heat >= 1 ? 1 : 0;
  if (node.type === 'boss') return { kind: 'boss', opponent: BOSS_ORDER[act - 1], locs: locIds, bonus: bonus + (run.heat >= 5 ? 1 : 0), plus: !level && region >= 2, enemyStartBonus };
  const used = run._usedOpp || (run._usedOpp = []);
  const fresh = pools.filter((id) => !used.includes(id));
  const pick = rng.pick(fresh.length ? fresh : pools); used.push(pick); if (used.length > 6) used.shift();
  return { kind: 'battle', opponent: pick, locs: locIds, bonus, plus: !level && region >= 3, enemyStartBonus };
}

// ---------- pools ----------
export function cardPool(run) {
  const set = new Set(run.unlocked);
  return CARD_LIST.filter((c) => !c.evo && open(set, cardUnlock(c)) && !run.banished.includes(c.id));
}
export function relicPool(run) {
  const set = new Set(run.unlocked);
  return RELIC_LIST.filter((r) => open(set, relicUnlock(r)) && !run.relics.includes(r.id));
}
export function gemPool(run) { const set = new Set(run.unlocked); return GEM_LIST.filter((g) => open(set, g.unlock)); }

const RARITIES = ['common', 'uncommon', 'rare', 'legendary'];
function eligibleCards(run, minRarity = 'common') {
  const min = RARITIES.indexOf(minRarity);
  return cardPool(run).filter((c) => RARITIES.indexOf(c.rarity) >= min);
}
function cardWeight(run) {
  const actBoost = (regionFor(run.act) - 1) * 0.5;
  return (c) => RARITY_WEIGHT[c.rarity] * (c.rarity === 'common' ? 1 : 1 + actBoost);
}

export function rollCards(run, n, minRarity) {
  const rng = rngFor(run);
  const pool = eligibleCards(run, minRarity);
  const weight = cardWeight(run);
  const cards = [];
  while (cards.length < n && pool.length) {
    const card = rng.weighted(pool, weight);
    cards.push(card.id);
    pool.splice(pool.indexOf(card), 1);
  }
  return cards;
}

export function rewardCount(run) {
  let n = 3;
  for (const id of run.relics) n += RELICS[id]?.rewardBonus || 0;
  if (run.heat >= 6) n--;
  return Math.max(2, n);
}

const rewardBand = (cost) => cost <= 2 ? 0 : cost <= 4 ? 1 : 2;
export function rollRewardCards(run, kind, count = rewardCount(run), kept = []) {
  const minRarity = kind === 'boss' ? 'rare' : 'common';
  const pool = eligibleCards(run, minRarity).filter((card) => !kept.includes(card.id));
  const rng = rngFor(run);
  const weight = cardWeight(run);
  const cards = [...kept];
  const pick = (choices) => {
    if (!choices.length) return;
    const card = rng.weighted(choices, weight);
    cards.push(card.id);
    pool.splice(pool.indexOf(card), 1);
  };
  // Guarantee a cheap pick and vary the second band when Heat reduces the offer to two cards.
  for (const band of [0, ...rng.shuffle([1, 2])]) {
    if (cards.length >= count) break;
    if (!cards.some((id) => rewardBand(CARDS[id].cost) === band)) {
      pick(pool.filter((card) => rewardBand(card.cost) === band));
    }
  }
  while (cards.length < count && pool.length) pick(pool);
  return kept.length ? cards : rng.shuffle(cards);
}

export function banishRewardCard(run, index) {
  const reward = run.pendingReward;
  const id = reward?.cards[index];
  if (!id || run.banishes <= 0) return null;
  run.banishes--;
  run.banished.push(id);
  const kept = reward.cards.filter((_, i) => i !== index);
  const offer = rollRewardCards(run, reward.kind, reward.cards.length, kept);
  reward.cards.splice(index, 1, ...offer.slice(kept.length));
  return id;
}

// ---------- battle results ----------
export function applyBattle(run, meta, node, result) {
  const enc = node.enc;
  const out = { won: result.won, gold: result.gold, shards: 0, heartLost: false, lanesWon: result.lanesWon, notes: result.notes || [] };
  run.fights++;
  run.gold += result.gold;
  out.shards = result.lanesWon + (result.won ? 2 : 0);
  if (result.won) {
    run.fightsWon++;
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
  out.unlocked = recordProgress(meta, {
    ...result.progress, gold: result.gold, wins: Number(result.won), bosses: Number(result.won && enc.kind === 'boss'),
    sweeps: Number(result.lanesWon === 3),
  });
  (run.earnedAchievements ??= []).push(...out.unlocked);
  if (run.level && enc.kind === 'boss') {
    run.over = result.won ? 'victory' : 'defeat';
    return out;
  }
  // reward offer
  run.pendingReward = { kind: enc.kind, cards: rollRewardCards(run, enc.kind), bossRelics: null };
  if (enc.kind === 'boss' && result.won) {
    const choices = rollRelicChoices(run, 3);
    if (choices.length) run.pendingReward.bossRelics = choices;
  }
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

export function takeCard(run, id) { run.deck.push(makeInst(run, id)); run.stats.cardsAdded++; }

// ---------- act / node progression ----------
export function enterNode(run, id) {
  if (run.over || run.pendingReward || (run.node && !run.node.done) || !availableNodes(run).includes(id)) return false;
  run.pos = id;
  return true;
}
export function restAtCamp(run) {
  const node = run.node;
  if (node?.type !== 'camp' || node.done || node.heartsRestored != null) return;
  node.heartsRestored = run.maxHearts - run.hearts;
  run.hearts = run.maxHearts;
}
export function finishAct(run) {
  if (run.act >= ACTS) { run.over = 'victory'; return; }
  run.act++;
  run.pos = null;
  run.node = null;
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
  const gems = rng.sample(gemPool(run).filter((g) => !g.evo || canOfferGem(run, g.id)), 2)
    .map((g) => ({ kind: 'gem', id: g.id, price: Math.round(g.price * m), sold: false }));
  const relics = rng.sample(relicPool(run), 2).map((r) => ({ kind: 'relic', id: r.id, price: Math.round(RELIC_PRICE[r.rarity] * m), sold: false }));
  return { items: [...cards, ...gems, ...relics], removePrice: Math.round((60 + 25 * run.removalsBought) * m), removeUsed: false };
}
export function buy(run, shop, idx, uid, evo) {
  const it = shop.items[idx];
  if (!it || it.sold || run.gold < it.price) return false;
  if (it.kind === 'gem' && !applyGem(run, it.id, uid, evo)) return false;
  run.gold -= it.price; it.sold = true;
  if (it.kind === 'card') takeCard(run, it.id);
  if (it.kind === 'relic') gainRelic(run, it.id);
  return true;
}

// ---------- deck manipulation ----------
export function removeCard(run, uid) { const i = run.deck.findIndex((c) => c.uid === uid); if (i >= 0) { run.deck.splice(i, 1); run.stats.removed++; return true; } return false; }
export function cloneCard(run, uid) { const c = run.deck.find((c) => c.uid === uid); if (!c) return null; const n = makeInst(run, c.id, { plus: c.plus }); run.deck.push(n); return n; }
export function canSocket(card, gemId) {
  return Boolean(card && GEMS[gemId] && !GEMS[gemId].evo && !cardDef(card.id).token && card.sockets.includes(null));
}
function applyGem(run, gemId, uid, { meta, catalystUid } = {}) {
  if (GEMS[gemId]?.evo) return evolve(run, meta, uid, catalystUid);
  const card = run.deck.find((c) => c.uid === uid);
  if (!canSocket(card, gemId)) return false;
  card.sockets[card.sockets.indexOf(null)] = gemId;
  return true;
}
export function canOfferGem(run, gemId) {
  return GEMS[gemId]?.evo ? evoOptions(run).length > 0 : run.deck.some((card) => canSocket(card, gemId));
}
export function rollGemChoices(run) {
  const eligible = gemPool(run).filter((g) => canOfferGem(run, g.id));
  return rngFor(run).sample(eligible, 3).map((g) => g.id);
}
export function claimGem(run, gemId, uid, evo) {
  const node = run.node;
  if (node?.type !== 'gem' || node.done || !node.gemChoices?.includes(gemId) || !applyGem(run, gemId, uid, evo)) return false;
  node.done = true;
  return true;
}
export function evoOptions(run) {
  const out = [];
  for (const base of run.deck) {
    const recipe = EVO_RECIPES.find((r) => r.base === base.id);
    if (!recipe) continue;
    for (const catalyst of run.deck) {
      if (catalyst.id === recipe.catalyst && catalyst.uid !== base.uid) out.push({ base, catalyst, recipe });
    }
  }
  return out;
}
function evolve(run, meta, uid, catalystUid) {
  const option = evoOptions(run).find(({ base, catalyst }) => base.uid === uid && catalyst.uid === catalystUid);
  if (!option) return false;
  const { base, catalyst, recipe } = option;
  removeCard(run, catalyst.uid); run.stats.removed--;
  base.id = recipe.result;
  run.stats.evolutions++;
  if (meta) {
    meta.recipes[base.id] = true; meta.stats.evolutions++;
    (run.earnedAchievements ??= []).push(...recordProgress(meta, { evolved: 1 }));
  }
  return true;
}
export function fuseOptions(run) {
  const groups = {};
  for (const c of run.deck) if (!c.plus && !cardDef(c.id).token) (groups[c.id] ||= []).push(c);
  const options = [];
  for (const group of Object.values(groups)) {
    for (const [i, first] of group.entries()) {
      const second = group.slice(i + 1).find((card) => canFuse(first, card));
      if (!second) continue;
      options.push({ id: first.id, a: first.uid, b: second.uid, sockets: combineSockets(first, second), bonus: (first.bonus || 0) + (second.bonus || 0) });
      break;
    }
  }
  return options;
}
function combineSockets(a, b) {
  const count = Math.max(a.sockets.length, b.sockets.length);
  const gems = [...a.sockets, ...b.sockets].filter(Boolean);
  return gems.length > count ? null : [...gems, ...Array(count - gems.length).fill(null)];
}
function canFuse(a, b) {
  return a && b && a.uid !== b.uid && a.id === b.id && !a.plus && !b.plus && !cardDef(a.id).token && combineSockets(a, b);
}
export function fuse(run, a, b) {
  const A = run.deck.find((c) => c.uid === a), B = run.deck.find((c) => c.uid === b);
  const sockets = canFuse(A, B);
  if (!sockets) return null;
  A.plus = 1;
  A.bonus = (A.bonus || 0) + (B.bonus || 0);
  A.sockets = sockets;
  removeCard(run, b); run.stats.removed--;
  return A;
}

export function homeChoices(run, n = 3) {
  const rng = rngFor(run);
  const cap = 4 + run.home.filter((h) => h === 'foundation').length;
  const pool = HOME_LIST.filter((h) => (h.stack ? true : !run.home.includes(h.id)) && !(h.id === 'foundation' && cap >= 6));
  return rng.sample(pool, n).map((h) => h.id);
}

// ---------- end of run ----------
export function endRun(run, meta) {
  const victory = run.over === 'victory';
  const bonus = run.level ? (victory ? 5 : 0) : (victory ? 20 + run.heat * 5 : 0) + (run.act - 1) * 3;
  run.shards += bonus;
  meta.shards += run.shards;
  meta.stats.runs++;
  let nextLevel = null;
  if (run.level) {
    if (victory && run.level === (meta.levelsCleared ?? 0) + 1) {
      meta.levelsCleared = run.level;
      if (run.level < LEVELS.length) nextLevel = run.level + 1;
    }
  } else {
    if (victory) { meta.stats.wins++; meta.maxHeat = Math.max(meta.maxHeat, Math.min(8, run.heat + 1)); }
    meta.stats.bestAct = Math.max(meta.stats.bestAct, run.act);
  }
  return { victory, shards: run.shards, bonus, nextLevel };
}

export { OPPONENTS, BOSSES };
