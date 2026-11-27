// Core battle rules. DOM-free so it can run in Node for simulation tests.
import { CARDS, TOKENS, cardDef } from '../data/cards.js';
import { GEMS } from '../data/gems.js';
import { RELICS } from '../data/relics.js';
import { LOCATIONS } from '../data/locations.js';
import { HOME_UPGRADES } from '../data/home.js';
import { makeEnemyLane, BOSSES } from '../data/enemies.js';
import { WARDENS } from '../data/wardens.js';
import { makeRng } from '../core/rng.js';

export const ENERGY_BY_TURN = [3, 3, 4, 4, 5, 6];
export const HAND_SIZE = 5;
export const BASE_CAP = 4;

let BID = 1;

export class Battle {
  constructor(run, encounter, seed) {
    this.run = run;
    this.enc = encounter;
    this.rng = makeRng(seed ?? (Math.random() * 1e9) | 0);
    this.turn = 0;
    this.boss = encounter.boss ? BOSSES[encounter.boss] : null;
    this.maxTurns = 6 + (this.boss?.extraTurns || 0);
    this.energy = 0;
    this.bank = 0;
    this.energyNext = 0;
    this.nextCostReduction = 0;
    this.hand = [];
    this.drawPile = [];
    this.discardPile = [];
    this.fx = [];
    this.log = [];
    this.over = false;
    this.result = null;
    this.destroyedCount = 0;
    this.discardedCount = 0;
    this.playedThisTurn = [];
    this.playedAll = [];
    this.movesThisTurn = 0;
    this.freeMoves = 0;
    this.flags = {};
    this.relics = (run.relics || []).map((id) => RELICS[id]).filter(Boolean);
    this.warden = WARDENS[run.warden] || null;

    // Lanes: outer lanes have random locations, the middle lane is the player's Home.
    this.lanes = [0, 1, 2].map((i) => {
      const isHome = i === 1;
      const loc = isHome ? null : LOCATIONS[encounter.locs[i]];
      const lane = {
        idx: i, isHome, loc,
        home: isHome ? (run.home || []).map((id) => HOME_UPGRADES[id]).filter(Boolean) : [],
        slots: [], cap: BASE_CAP, enemy: null, flags: {}, playedHereThisTurn: 0,
        destroyedHere: 0, total: 0,
      };
      return lane;
    });
    for (const lane of this.lanes) {
      lane.cap = this.computeCap(lane);
      lane.slots = new Array(lane.cap).fill(null);
      lane.enemy = makeEnemyLane(encounter.enemies[lane.idx], encounter.scale, this.rng, lane.idx, this);
    }

    // Build the draw pile from the run deck.
    this.drawPile = this.rng.shuffle(run.deck.map((inst) => this.makeHandCard(inst)));
  }

  // ---------- helpers ----------
  computeCap(lane) {
    let cap = BASE_CAP;
    if (lane.loc?.cap) cap = lane.loc.cap;
    for (const h of lane.home) cap += h.capBonus || 0;
    if (!lane.isHome) for (const r of this.relics) cap += r.outerCap || 0;
    if (this.boss?.cap) cap = this.boss.cap(lane, cap);
    return Math.max(2, Math.min(6, cap));
  }

  makeHandCard(inst, defOverride) {
    const def = defOverride || cardDef(inst.id);
    return { hid: BID++, inst, def, costMod: 0, held: false, wasHeld: false, hold: false };
  }

  gems(inst) { return (inst?.sockets || []).filter(Boolean).map((g) => GEMS[g]).filter(Boolean); }
  hasGem(inst, id) { return (inst?.sockets || []).includes(id); }

  basePowerOf(def, inst) {
    let p = def.power + (inst?.plus ? (def.up?.power ?? 2) : 0) + (inst?.bonus || 0);
    for (const g of this.gems(inst)) p += g.power || 0;
    return p;
  }

  costOf(hc, laneIdx = null) {
    const def = hc.def, inst = hc.inst;
    let c = def.cost + (inst?.plus ? (def.up?.cost ?? 0) : 0) + hc.costMod;
    for (const g of this.gems(inst)) c += g.cost || 0;
    if (def.costFn) c += def.costFn(this, hc);
    c -= this.nextCostReduction;
    for (const r of this.relics) if (r.costMod) c += r.costMod(this, hc) || 0;
    if (this.warden?.costMod) c += this.warden.costMod(this, hc) || 0;
    if (laneIdx != null) {
      const lane = this.lanes[laneIdx];
      if (lane.loc?.costMod) c += lane.loc.costMod(this, lane, hc) || 0;
      for (const h of lane.home) if (h.costMod) c += h.costMod(this, lane, hc) || 0;
    }
    return Math.max(0, c);
  }

  minCost(hc) { return Math.min(...[0, 1, 2].map((i) => this.costOf(hc, i))); }

  cardsIn(laneIdx) { return this.lanes[laneIdx].slots.filter(Boolean); }
  allCards() { return this.lanes.flatMap((l) => l.slots.filter(Boolean)); }
  freeSlots(laneIdx) { return this.lanes[laneIdx].slots.filter((s) => !s).length; }
  otherLanes(laneIdx) { return [0, 1, 2].filter((i) => i !== laneIdx); }
  adjacent(laneIdx) { return [laneIdx - 1, laneIdx + 1].filter((i) => i >= 0 && i < 3); }
  laneOf(bc) { return this.lanes[bc.lane]; }
  hasTag(bc, tag) { return (bc.def.tags || []).includes(tag); }
  isTribe(bc, tribe) { return bc.def.tribe === tribe; }
  push(fx) { this.fx.push(fx); }
  float(lane, text, color = '#ffe27a', side = 'player') { this.push({ t: 'float', lane, text, color, side }); }

  // ---------- hook dispatch ----------
  *sources() {
    for (const r of this.relics) yield [r, null];
    if (this.warden) yield [this.warden, null];
    if (this.boss) yield [this.boss, null];
    for (const lane of this.lanes) {
      if (lane.loc) yield [lane.loc, lane];
      for (const h of lane.home) yield [h, lane];
    }
  }
  emit(hook, ...args) {
    for (const [src, lane] of this.sources()) {
      if (typeof src[hook] === 'function') {
        if (lane) src[hook](this, lane, ...args); else src[hook](this, ...args);
      }
    }
    // board cards listening to global events
    for (const bc of this.allCards()) {
      const fn = bc.def[hook];
      if (typeof fn === 'function') fn(this, bc, ...args);
    }
  }

  // ---------- power ----------
  recompute() {
    for (const lane of this.lanes) {
      lane.flags = { gainReduce: 0, protect: false, noGain: false, ongoingBonus: 0 };
    }
    this.strikeBonus = 0;
    const cards = this.allCards();
    for (const bc of cards) bc.aura = 0;
    // passive sources first (they may set flags that card auras read)
    for (const [src, lane] of this.sources()) {
      if (src.ongoing) { if (lane) src.ongoing(this, lane); else src.ongoing(this); }
    }
    for (const bc of cards) if (bc.def.ongoing) bc.def.ongoing(this, bc);
    // ongoing bonus for ongoing cards (shrines, Iron Banner etc.)
    for (const bc of cards) {
      if (this.hasTag(bc, 'ongoing')) bc.aura += this.lanes[bc.lane].flags.ongoingBonus;
    }
    for (const r of this.relics) if (r.strikeBonus) this.strikeBonus += r.strikeBonus;
    for (const lane of this.lanes) {
      lane.total = lane.slots.reduce((a, bc) => a + (bc ? this.power(bc) : 0), 0) + (lane.flags.flat || 0);
    }
  }
  power(bc) { return bc.base + bc.buff + bc.aura; }
  aura(bc, n) { if (bc) bc.aura += n; }
  buff(bc, n, silent) {
    if (!bc || bc.gone) return;
    if (n < 0 && this.isProtected(bc)) return;
    bc.buff += n;
    if (!silent) this.push({ t: 'buff', bid: bc.bid, n });
  }
  isProtected(bc) { return this.hasGem(bc.inst, 'bulwark') || this.lanes[bc.lane]?.flags.protect; }

  // ---------- turn flow ----------
  start() {
    this.emit('battleStart');
    for (const lane of this.lanes) lane.enemy.start?.(this, lane);
    this.beginTurn();
  }

  beginTurn() {
    this.turn++;
    this.playedThisTurn = [];
    this.movesThisTurn = 0;
    this.freeMoves = 0;
    for (const lane of this.lanes) lane.playedHereThisTurn = 0;
    for (const bc of this.allCards()) bc.movedThisTurn = false;
    const base = ENERGY_BY_TURN[Math.min(this.turn, ENERGY_BY_TURN.length) - 1] + Math.max(0, this.turn - ENERGY_BY_TURN.length);
    this.energy = base + this.energyNext + this.bank;
    this.energyNext = 0;
    this.bank = 0;
    let n = HAND_SIZE;
    for (const r of this.relics) if (r.handBonus) n += r.handBonus(this) || 0;
    this.drawCards(n);
    this.emit('turnStart');
    for (const lane of this.lanes) lane.enemy.planIntent?.(this, lane);
    this.recompute();
    this.push({ t: 'turn', turn: this.turn });
  }

  drawCards(n) {
    for (let i = 0; i < n; i++) {
      if (this.hand.length >= 9) break;
      if (!this.drawPile.length) {
        if (!this.discardPile.length) break;
        this.drawPile = this.rng.shuffle(this.discardPile);
        this.discardPile = [];
      }
      const hc = this.drawPile.pop();
      hc.costMod = 0; hc.hold = false;
      this.hand.push(hc);
    }
  }

  holdSlots() {
    let n = 1 + (this.warden?.holdBonus || 0);
    for (const r of this.relics) n += r.holdBonus || 0;
    return n;
  }

  toggleHold(hid) {
    const hc = this.hand.find((h) => h.hid === hid);
    if (!hc) return;
    if (hc.hold) { hc.hold = false; return; }
    const holding = this.hand.filter((h) => h.hold);
    if (holding.length >= this.holdSlots()) holding[0].hold = false;
    hc.hold = true;
  }

  canPlay(hid, laneIdx) {
    if (this.over) return { ok: false, why: 'Battle over' };
    const hc = this.hand.find((h) => h.hid === hid);
    if (!hc) return { ok: false, why: 'No card' };
    const lane = this.lanes[laneIdx];
    if (!lane.slots.some((s) => !s)) return { ok: false, why: 'Lane is full' };
    const cost = this.costOf(hc, laneIdx);
    if (cost > this.energy) return { ok: false, why: 'Not enough energy' };
    if (this.boss?.canPlay) {
      const r = this.boss.canPlay(this, hc, laneIdx);
      if (r) return { ok: false, why: r };
    }
    if (lane.loc?.canPlay) {
      const r = lane.loc.canPlay(this, lane, hc);
      if (r) return { ok: false, why: r };
    }
    return { ok: true, cost };
  }

  play(hid, laneIdx) {
    const chk = this.canPlay(hid, laneIdx);
    if (!chk.ok) return chk;
    const hc = this.hand.find((h) => h.hid === hid);
    this.hand = this.hand.filter((h) => h !== hc);
    this.energy -= chk.cost;
    this.nextCostReduction = 0;
    const bc = this.place(hc.def, hc.inst, laneIdx, { wasHeld: hc.wasHeld, hc });
    if (!bc) return { ok: false };
    this.push({ t: 'play', bid: bc.bid, lane: laneIdx });
    this.playedThisTurn.push(bc);
    this.playedAll.push(bc);
    this.lanes[laneIdx].playedHereThisTurn++;
    // On Reveal (with echoes)
    const reveals = this.revealCount(bc);
    if (bc.def.onReveal) {
      for (let i = 0; i < reveals; i++) {
        if (bc.gone) break;
        bc.def.onReveal(this, bc);
        if (i > 0) this.float(laneIdx, 'Echo!', '#9fe8ff');
      }
    }
    for (const g of this.gems(bc.inst)) if (g.onReveal) g.onReveal(this, bc);
    this.emit('onPlay', bc);
    this.lanes[laneIdx].enemy.onPlay?.(this, this.lanes[laneIdx], bc);
    this.recompute();
    return { ok: true, bc };
  }

  revealCount(bc) {
    let n = 1;
    if (this.hasGem(bc.inst, 'echo')) n++;
    const lane = this.lanes[bc.lane];
    if (lane.loc?.echo) n++;
    for (const h of lane.home) if (h.echoFirst && !this.flags['echo_home']) { n++; this.flags['echo_home'] = true; }
    for (const r of this.relics) if (r.echoFirstPerTurn && !this.flags['echo_t' + this.turn] && bc.def.onReveal) { n++; this.flags['echo_t' + this.turn] = true; }
    return n;
  }

  // Put a card on the board (from hand or created). Returns the board card.
  place(def, inst, laneIdx, opts = {}) {
    const lane = this.lanes[laneIdx];
    const slot = lane.slots.findIndex((s) => !s);
    if (slot < 0) return null;
    const bc = {
      bid: BID++, def, inst, lane: laneIdx, slot,
      base: this.basePowerOf(def, inst), buff: 0, aura: 0,
      turnPlayed: this.turn, movedThisTurn: false, wasHeld: !!opts.wasHeld, token: !!opts.token,
    };
    if (opts.hc?.extra) { bc.base += opts.hc.extra; bc.extra = opts.hc.extra; }
    if (def.id === 'patient_monk' && opts.wasHeld) bc.base += 5;
    lane.slots[slot] = bc;
    if (opts.token) this.push({ t: 'spawn', bid: bc.bid, lane: laneIdx });
    return bc;
  }

  spawn(tokenId, laneIdx, buff = 0) {
    const def = TOKENS[tokenId];
    const bc = this.place(def, null, laneIdx, { token: true });
    if (bc && buff) bc.buff += buff;
    return bc;
  }

  canMoveCard(bc) {
    if (this.over || bc.movedThisTurn) return false;
    const lane = this.lanes[bc.lane];
    if (lane.loc?.noMoveOut) return false;
    if (bc.def.move || this.hasGem(bc.inst, 'drift')) return true;
    if (lane.home.some((h) => h.movable)) return true;
    for (const r of this.relics) if (r.freeMovePerTurn && this.movesThisTurn < 1) return true;
    return false;
  }

  playerMove(bid, toLane) {
    const bc = this.allCards().find((c) => c.bid === bid);
    if (!bc || !this.canMoveCard(bc)) return { ok: false, why: "Can't move" };
    if (bc.lane === toLane) return { ok: false, why: 'Same lane' };
    const ok = this.moveCard(bc, toLane);
    if (ok) { this.movesThisTurn++; this.recompute(); }
    return { ok };
  }

  moveCard(bc, toLane) {
    if (bc.gone) return false;
    const dest = this.lanes[toLane];
    const slot = dest.slots.findIndex((s) => !s);
    if (slot < 0) return false;
    if (dest.loc?.noMoveIn) return false;
    const from = bc.lane;
    this.lanes[from].slots[bc.slot] = null;
    bc.lane = toLane; bc.slot = slot; bc.movedThisTurn = true;
    dest.slots[slot] = bc;
    this.push({ t: 'move', bid: bc.bid, from, to: toLane });
    if (bc.def.onMoved) bc.def.onMoved(this, bc, from);
    for (const g of this.gems(bc.inst)) if (g.onMoved) g.onMoved(this, bc);
    this.emit('onAnyMove', bc, from);
    return true;
  }

  destroy(bc, why) {
    if (!bc || bc.gone) return false;
    if (this.isProtected(bc)) { this.float(bc.lane, 'Protected', '#b9d6ff'); return false; }
    const lane = this.lanes[bc.lane];
    lane.slots[bc.slot] = null;
    bc.gone = true;
    if (!bc.token) this.destroyedCount++;
    lane.destroyedHere++;
    this.push({ t: 'destroy', bid: bc.bid, lane: bc.lane });
    if (bc.def.onDestroyed) bc.def.onDestroyed(this, bc);
    this.emit('onAnyDestroyed', bc);
    // destroyed run cards go to discard so they can come back later
    if (bc.inst && !bc.inst.temp && !bc.returned) this.discardPile.push(this.makeHandCard(bc.inst));
    return true;
  }

  damage(bc, n) {
    if (!bc || bc.gone || n <= 0) return;
    if (this.isProtected(bc)) { this.float(bc.lane, 'Protected', '#b9d6ff'); return; }
    bc.buff -= n;
    this.push({ t: 'buff', bid: bc.bid, n: -n });
    this.recompute();
    if (this.power(bc) <= 0 && !bc.token) this.destroy(bc, 'damage');
  }

  strike(laneIdx, n, src) {
    const amt = Math.max(0, n + (this.strikeBonus || 0));
    if (amt <= 0) return 0;
    const lane = this.lanes[laneIdx];
    const dealt = lane.enemy.strike(this, lane, amt);
    this.push({ t: 'strike', lane: laneIdx, n: amt });
    this.emit('onStrike', laneIdx, amt);
    return dealt;
  }

  freeze(laneIdx, turns = 1) {
    const e = this.lanes[laneIdx].enemy;
    e.frozen = Math.max(e.frozen || 0, turns);
    this.push({ t: 'freeze', lane: laneIdx });
    this.float(laneIdx, 'Frozen!', '#9fe8ff', 'enemy');
  }

  gainEnergyNext(n) { this.energyNext += n; }
  gainEnergy(n) { this.energy += n; }
  gold(n) { this.run.pendingGold = (this.run.pendingGold || 0) + n; this.push({ t: 'gold', n }); }

  addToHand(def, inst = null, costMod = 0) {
    if (this.hand.length >= 9) return null;
    const hc = this.makeHandCard(inst || { id: def.id, uid: 'tmp' + BID, temp: true }, def);
    hc.costMod = costMod;
    if (!inst) hc.inst.temp = true;
    this.hand.push(hc);
    return hc;
  }

  discardRandom(n = 1, exclude) {
    let out = 0;
    for (let i = 0; i < n; i++) {
      const pool = this.hand.filter((h) => h !== exclude);
      if (!pool.length) break;
      const hc = this.rng.pick(pool);
      this.discardHandCard(hc);
      out++;
    }
    return out;
  }

  discardHandCard(hc) {
    this.hand = this.hand.filter((h) => h !== hc);
    this.discardedCount++;
    this.push({ t: 'discard', hid: hc.hid });
    if (hc.def.onDiscard) hc.def.onDiscard(this, hc);
    this.emit('onDiscard', hc);
    if (!hc.inst?.temp) this.discardPile.push(hc);
  }

  weakestLane() {
    // lane where we are losing by the most (or winning by least)
    let best = 0, bestD = Infinity;
    for (const l of this.lanes) { const d = l.total - l.enemy.display(this, l); if (d < bestD) { bestD = d; best = l.idx; } }
    return best;
  }

  endTurn() {
    if (this.over) return;
    // card end-of-turn effects
    for (const bc of this.allCards()) {
      if (bc.gone) continue;
      if (bc.def.endTurn) bc.def.endTurn(this, bc);
      for (const g of this.gems(bc.inst)) if (g.endTurn && !bc.gone) g.endTurn(this, bc);
    }
    this.recompute();
    this.emit('endTurn');
    this.recompute();
    // enemy actions resolve together
    for (const lane of this.lanes) {
      const e = lane.enemy;
      if (e.frozen > 0) { e.frozen--; this.float(lane.idx, 'Frozen — skips', '#9fe8ff', 'enemy'); continue; }
      e.act(this, lane);
    }
    if (this.boss?.afterEnemies) this.boss.afterEnemies(this);
    this.recompute();
    // banking
    for (const r of this.relics) if (r.bank) this.bank = Math.min(r.bank, this.energy);
    // discard hand except held
    const keep = [];
    for (const hc of this.hand.slice()) {
      if (hc.hold) { hc.wasHeld = true; hc.hold = false; keep.push(hc); continue; }
      hc.wasHeld = false;
      this.discardHandCard(hc);
    }
    this.hand = keep;
    if (this.turn >= this.maxTurns) { this.finish(); return; }
    this.beginTurn();
  }

  laneScores() {
    return this.lanes.map((l) => ({ player: l.total, enemy: l.enemy.final(this, l) }));
  }

  finish() {
    this.recompute();
    const scores = this.laneScores();
    const laneResults = scores.map((s) => ({ ...s, won: s.player > s.enemy }));
    const lanesWon = laneResults.filter((r) => r.won).length;
    let need = 2;
    if (this.boss?.winsNeeded) need = this.boss.winsNeeded;
    const won = lanesWon >= need;
    let gold = laneResults.reduce((a, r) => a + (r.won ? Math.max(0, r.player) : 0), 0);
    let mult = 1;
    for (const r of this.relics) if (r.goldMult) mult += r.goldMult;
    for (const h of this.lanes[1].home) if (h.goldMult) mult += h.goldMult;
    gold = Math.round(gold * mult) + (this.run.pendingGold || 0);
    this.run.pendingGold = 0;
    this.result = { won, lanesWon, laneResults, gold };
    this.emit('battleEnd', this.result);
    this.over = true;
    this.push({ t: 'end', result: this.result });
  }

  drainFx() { const f = this.fx; this.fx = []; return f; }
}

export { CARDS };
