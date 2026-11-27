// Core battle rules — symmetric lane battler. Both sides play cards from their own decks;
// cards are staged during the turn and revealed at end of turn (the side winning more lanes reveals first).
// Energy equals the turn number. Both sides get a fresh five-card draw each turn.
// DOM-free so it can run in Node for simulation tests.
import { CARDS, TOKENS, cardDef } from '../data/cards.js';
import { GEMS } from '../data/gems.js';
import { RELICS } from '../data/relics.js';
import { LOCATIONS } from '../data/locations.js';
import { HOME_UPGRADES } from '../data/home.js';
import { OPPONENTS, BOSSES } from '../data/enemies.js';
import { WARDENS } from '../data/wardens.js';
import { makeRng } from '../core/rng.js';

export const DRAW_PER_TURN = 5;
export const MAX_HAND = 7;
export const BASE_CAP = 4;
const PLAYER = 0, ENEMY = 1;

let BID = 1;

function sideState() {
  return {
    hand: [], deck: [], discard: [], nextHand: [], drawNext: 0, energy: 0, energyNext: 0, bank: 0, nextCostReduction: 0,
    playedAll: [], playedThisTurn: [], staged: [], destroyedCount: 0, discardedCount: 0, strikeBonus: 0,
    movesThisTurn: 0, cardsPlayedTotal: 0,
  };
}
function laneFlags() { return { protect: false, ongoingBonus: 0, flat: 0 }; }

export class Battle {
  constructor(run, encounter, seed) {
    this.run = run;
    this.enc = encounter;
    this.rng = makeRng(seed ?? (Math.random() * 1e9) | 0);
    this.me = PLAYER;
    this.turn = 0;
    this.opp = OPPONENTS[encounter.opponent];
    this.boss = this.opp?.boss ? BOSSES[this.opp.boss] : null;
    this.maxTurns = 6 + (this.boss?.extraTurns || 0);
    this.S = [sideState(), sideState()];
    this.fx = [];
    this.over = false;
    this.result = null;
    this.flags = {};
    this.relics = (run.relics || []).map((id) => RELICS[id]).filter(Boolean);
    this.warden = WARDENS[run.warden] || null;

    const self = this;
    this.lanes = [0, 1, 2].map((i) => {
      const isHome = i === 1;
      const loc = isHome ? null : LOCATIONS[encounter.locs[i]] || null;
      const lane = {
        idx: i, isHome, loc,
        home: isHome ? (run.home || []).map((id) => HOME_UPGRADES[id]).filter(Boolean) : [],
        slotsBy: [[], []], cap: [BASE_CAP, BASE_CAP], sf: [laneFlags(), laneFlags()], totals: [0, 0],
        lock: [0, 0], playedHere: [0, 0], revealedHere: [0, 0], destroyedBy: [0, 0],
      };
      // perspective-relative accessors (b.me decides whose side "slots"/"total" mean)
      Object.defineProperty(lane, 'slots', { get() { return lane.slotsBy[self.me].map((c) => (c && c.revealed ? c : null)); } });
      Object.defineProperty(lane, 'flags', { get() { return lane.sf[self.me]; } });
      Object.defineProperty(lane, 'total', { get() { return lane.totals[self.me]; } });
      Object.defineProperty(lane, 'foeTotal', { get() { return lane.totals[1 - self.me]; } });
      Object.defineProperty(lane, 'playedHereThisTurn', { get() { return lane.playedHere[self.me]; } });
      Object.defineProperty(lane, 'revealedHereThisTurn', { get() { return lane.revealedHere[self.me]; } });
      Object.defineProperty(lane, 'destroyedHere', { get() { return lane.destroyedBy[self.me]; } });
      return lane;
    });
    for (const lane of this.lanes) {
      for (const side of [PLAYER, ENEMY]) {
        lane.cap[side] = this.computeCap(lane, side);
        lane.slotsBy[side] = new Array(lane.cap[side]).fill(null);
      }
    }
    // decks
    this.S[PLAYER].deck = this.rng.shuffle(run.deck.map((inst) => this.makeHandCard(inst, null, PLAYER)));
    const bonus = encounter.bonus || 0;
    const oppDeck = (this.opp?.deck || []).map((id, k) => ({ uid: 'e' + k, id, plus: encounter.plus && k % 2 === 0 ? 1 : 0, bonus, sockets: [null] }));
    this.S[ENEMY].deck = this.rng.shuffle(oppDeck.map((inst) => this.makeHandCard(inst, null, ENEMY)));
  }

  // ---------- perspective ----------
  as(side, fn) { const prev = this.me; this.me = side; try { return fn(); } finally { this.me = prev; } }
  foe(side = this.me) { return 1 - side; }
  get side() { return this.S[this.me]; }
  get hand() { return this.S[this.me].hand; }
  set hand(v) { this.S[this.me].hand = v; }
  get drawPile() { return this.S[this.me].deck; }
  get discardPile() { return this.S[this.me].discard; }
  get energy() { return this.S[this.me].energy; }
  set energy(v) { this.S[this.me].energy = v; }
  get nextCostReduction() { return this.S[this.me].nextCostReduction; }
  set nextCostReduction(v) { this.S[this.me].nextCostReduction = v; }
  get playedAll() { return this.S[this.me].playedAll; }
  get playedThisTurn() { return this.S[this.me].playedThisTurn; }
  get destroyedCount() { return this.S[this.me].destroyedCount; }
  get discardedCount() { return this.S[this.me].discardedCount; }
  get strikeBonus() { return this.S[this.me].strikeBonus; }
  set strikeBonus(v) { this.S[this.me].strikeBonus = v; }

  // ---------- helpers ----------
  computeCap(lane, side) {
    let cap = BASE_CAP;
    if (lane.loc?.cap) cap = lane.loc.cap;
    if (side === PLAYER) {
      for (const h of lane.home) cap += h.capBonus || 0;
      if (!lane.isHome) for (const r of this.relics) cap += r.outerCap || 0;
    }
    return Math.max(2, Math.min(6, cap));
  }

  makeHandCard(inst, defOverride, side = this.me) {
    const def = defOverride || cardDef(inst.id);
    return { hid: BID++, inst, def, side, costMod: 0 };
  }

  handPower(hc) {
    return this.basePowerOf(hc.def, hc.inst) + (hc.extra || 0) + (hc.def.handPower?.(this) || 0);
  }

  gems(inst) { return (inst?.sockets || []).filter(Boolean).map((g) => GEMS[g]).filter(Boolean); }
  hasGem(inst, id) { return (inst?.sockets || []).includes(id); }

  basePowerOf(def, inst) {
    let p = def.power + (inst?.plus ? (def.up?.power ?? 2) : 0) + (inst?.bonus || 0);
    for (const g of this.gems(inst)) p += g.power || 0;
    return p;
  }

  costOf(hc, laneIdx = null) {
    return this.as(hc.side ?? this.me, () => {
      const def = hc.def, inst = hc.inst;
      let c = def.cost + (inst?.plus ? (def.up?.cost ?? 0) : 0) + hc.costMod;
      for (const g of this.gems(inst)) c += g.cost || 0;
      if (def.costFn) c += def.costFn(this, hc);
      c -= this.nextCostReduction;
      if (this.me === PLAYER) {
        for (const r of this.relics) if (r.costMod) c += r.costMod(this, hc) || 0;
        if (this.warden?.costMod) c += this.warden.costMod(this, hc) || 0;
      }
      if (laneIdx != null) {
        const lane = this.lanes[laneIdx];
        if (lane.loc?.costMod) c += lane.loc.costMod(this, lane, hc) || 0;
        if (this.me === PLAYER) for (const h of lane.home) if (h.costMod) c += h.costMod(this, lane, hc) || 0;
      }
      return Math.max(0, c);
    });
  }
  minCost(hc) { return Math.min(...[0, 1, 2].map((i) => this.costOf(hc, i))); }

  cardsIn(laneIdx, side = this.me) { return this.lanes[laneIdx].slotsBy[side].filter((c) => c && c.revealed); }
  foesIn(laneIdx) { return this.cardsIn(laneIdx, this.foe()); }
  allCards(side = this.me) { return this.lanes.flatMap((l) => l.slotsBy[side].filter((c) => c && c.revealed)); }
  everyCard() { return [...this.allCards(PLAYER), ...this.allCards(ENEMY)]; }
  boardCards(side) { return this.lanes.flatMap((l) => l.slotsBy[side].filter(Boolean)); }
  freeSlots(laneIdx, side = this.me) { return this.lanes[laneIdx].slotsBy[side].filter((s) => !s).length; }
  otherLanes(laneIdx) { return [0, 1, 2].filter((i) => i !== laneIdx); }
  adjacent(laneIdx) { return [laneIdx - 1, laneIdx + 1].filter((i) => i >= 0 && i < 3); }
  hasTag(bc, tag) { return (bc.def.tags || []).includes(tag); }
  winning(laneIdx, side = this.me) { const l = this.lanes[laneIdx]; return l.totals[side] > l.totals[1 - side]; }
  push(fx) { this.fx.push(fx); }
  float(lane, text, color = '#ffe27a', side = this.me) { this.push({ t: 'float', lane, text, color, side }); }
  findCard(bid) { for (const l of this.lanes) for (const s of [0, 1]) for (const c of l.slotsBy[s]) if (c && c.bid === bid) return c; return null; }

  // ---------- hooks ----------
  // Run `hook` for every source belonging to `side`: relics/warden/home (player), opponent/boss passive (enemy),
  // locations (both sides, under that side's perspective), and that side's revealed cards.
  emitFor(side, hook, ...args) {
    this.as(side, () => {
      if (side === PLAYER) {
        for (const r of this.relics) if (typeof r[hook] === 'function') r[hook](this, ...args);
        if (this.warden && typeof this.warden[hook] === 'function') this.warden[hook](this, ...args);
        for (const h of this.lanes[1].home) if (typeof h[hook] === 'function') h[hook](this, this.lanes[1], ...args);
      } else {
        if (this.opp && typeof this.opp[hook] === 'function') this.opp[hook](this, ...args);
        if (this.boss && typeof this.boss[hook] === 'function') this.boss[hook](this, ...args);
      }
      for (const lane of this.lanes) if (lane.loc && typeof lane.loc[hook] === 'function') lane.loc[hook](this, lane, ...args);
      for (const bc of this.allCards(side)) { const fn = bc.def[hook]; if (typeof fn === 'function' && !bc.gone) fn(this, bc, ...args); }
    });
  }
  emit(hook, subject, ...rest) { this.emitFor(subject?.side ?? this.me, hook, subject, ...rest); }

  // ---------- power ----------
  recompute() {
    for (const lane of this.lanes) lane.sf = [laneFlags(), laneFlags()];
    const all = this.lanes.flatMap((l) => [...l.slotsBy[0], ...l.slotsBy[1]].filter(Boolean));
    for (const bc of all) bc.aura = 0;
    for (const side of [PLAYER, ENEMY]) {
      this.as(side, () => {
        this.S[side].strikeBonus = 0;
        if (side === PLAYER) {
          for (const r of this.relics) { if (r.ongoing) r.ongoing(this); if (r.strikeBonus) this.S[side].strikeBonus += r.strikeBonus; }
          if (this.warden?.ongoing) this.warden.ongoing(this);
          for (const h of this.lanes[1].home) if (h.ongoing) h.ongoing(this, this.lanes[1]);
        } else {
          if (this.opp?.ongoing) this.opp.ongoing(this);
          if (this.boss?.ongoing) this.boss.ongoing(this);
        }
        for (const lane of this.lanes) if (lane.loc?.ongoing) lane.loc.ongoing(this, lane);
        for (const bc of this.allCards(side)) if (bc.def.ongoing) bc.def.ongoing(this, bc);
      });
    }
    for (const bc of all) if (bc.revealed && this.hasTag(bc, 'ongoing')) bc.aura += this.lanes[bc.lane].sf[bc.side].ongoingBonus;
    for (const lane of this.lanes) for (const side of [0, 1]) {
      lane.totals[side] = lane.slotsBy[side].reduce((a, bc) => a + (bc && bc.revealed ? this.power(bc) : 0), 0) + (lane.sf[side].flat || 0);
    }
  }
  power(bc) { return bc.base + bc.buff + bc.aura; }
  aura(bc, n) { if (bc) bc.aura += n; }
  buff(bc, n, silent) {
    if (!bc || bc.gone) return;
    if (n < 0 && this.isProtected(bc)) { this.float(bc.lane, 'Protected', '#b9d6ff', bc.side); return; }
    bc.buff += n;
    if (!silent) this.push({ t: 'buff', bid: bc.bid, n });
  }
  isProtected(bc) { return this.hasGem(bc.inst, 'bulwark') || this.lanes[bc.lane]?.sf[bc.side].protect; }

  // ---------- turn flow ----------
  start() {
    for (const side of [PLAYER, ENEMY]) this.emitFor(side, 'battleStart');
    this.beginTurn();
  }

  beginTurn() {
    this.turn++;
    for (const side of [PLAYER, ENEMY]) {
      const S = this.S[side];
      S.playedThisTurn = []; S.staged = []; S.movesThisTurn = 0;
      S.energy = this.turn + S.energyNext + S.bank;
      S.energyNext = 0; S.bank = 0;
      S.hand = S.nextHand.splice(0);
      let n = DRAW_PER_TURN + S.drawNext;
      S.drawNext = 0;
      if (side === PLAYER) for (const r of this.relics) n += (r.drawBonus || 0) + (this.turn === 1 ? r.startCards || 0 : 0);
      if (this.turn === 1) {
        if (side === PLAYER) n += this.warden?.startCards || 0;
        else n += (this.enc.enemyStartBonus || 0) - this.relics.reduce((sum, r) => sum + (r.enemyStartMinus || 0), 0);
      }
      this.as(side, () => this.drawCards(n));
    }
    for (const lane of this.lanes) { lane.playedHere = [0, 0]; lane.revealedHere = [0, 0]; }
    for (const bc of [...this.boardCards(0), ...this.boardCards(1)]) bc.movedThisTurn = false;
    for (const side of [PLAYER, ENEMY]) this.emitFor(side, 'turnStart');
    this.recompute();
    this.push({ t: 'turn', turn: this.turn });
  }

  drawCards(n) {
    const S = this.side;
    for (let i = 0; i < n && S.hand.length < MAX_HAND; i++) {
      if (!S.deck.length) {
        if (!S.discard.length) break;
        S.deck = this.rng.shuffle(S.discard.splice(0));
      }
      const hc = S.deck.pop();
      hc.costMod = 0;
      hc.extra = 0;
      S.hand.push(hc);
    }
  }

  canPlay(hid, laneIdx, side = PLAYER) {
    return this.as(side, () => {
      if (this.over) return { ok: false, why: 'Battle over' };
      const hc = this.hand.find((h) => h.hid === hid);
      if (!hc) return { ok: false, why: 'No card' };
      const lane = this.lanes[laneIdx];
      if (!lane.slotsBy[side].some((s) => !s)) return { ok: false, why: 'Lane is full' };
      if (lane.lock[side] === this.turn) return { ok: false, why: 'Frozen: no cards can be played here this turn' };
      const cost = this.costOf(hc, laneIdx);
      if (cost > this.energy) return { ok: false, why: 'Not enough energy' };
      if (side === PLAYER && this.boss?.canPlay) { const r = this.boss.canPlay(this, hc, laneIdx); if (r) return { ok: false, why: r }; }
      if (lane.loc?.canPlay) { const r = lane.loc.canPlay(this, lane, hc); if (r) return { ok: false, why: r }; }
      return { ok: true, cost };
    });
  }

  // Stage a card face-down; it reveals at end of turn.
  play(hid, laneIdx, side = PLAYER) {
    const chk = this.canPlay(hid, laneIdx, side);
    if (!chk.ok) return chk;
    return this.as(side, () => {
      const hc = this.hand.find((h) => h.hid === hid);
      this.hand = this.hand.filter((h) => h !== hc);
      this.energy -= chk.cost;
      const bc = this.place(hc.def, hc.inst, laneIdx, { hc, staged: true });
      if (!bc) return { ok: false };
      bc.usedDiscount = this.nextCostReduction;
      this.nextCostReduction = 0;
      bc.paid = chk.cost; bc.hc = hc;
      this.side.staged.push(bc);
      this.side.playedThisTurn.push(bc);
      this.side.cardsPlayedTotal++;
      this.lanes[laneIdx].playedHere[side]++;
      this.push({ t: 'stage', bid: bc.bid, lane: laneIdx, side });
      return { ok: true, bc };
    });
  }

  // Take back a staged (unrevealed) card this turn.
  unplay(bid) {
    const bc = this.findCard(bid);
    if (!bc || bc.revealed || bc.side !== PLAYER || this.over) return false;
    const S = this.S[PLAYER];
    this.lanes[bc.lane].slotsBy[PLAYER][bc.slot] = null;
    this.lanes[bc.lane].playedHere[PLAYER]--;
    S.staged = S.staged.filter((c) => c !== bc);
    S.playedThisTurn = S.playedThisTurn.filter((c) => c !== bc);
    S.cardsPlayedTotal--;
    S.energy += bc.paid;
    S.nextCostReduction += bc.usedDiscount;
    bc.gone = true;
    S.hand.push(bc.hc);
    this.push({ t: 'unstage', bid });
    return true;
  }

  reveal(bc) {
    this.as(bc.side, () => {
      bc.revealed = true;
      this.push({ t: 'reveal', bid: bc.bid, lane: bc.lane, side: bc.side });
      this.side.playedAll.push(bc);
      this.recompute();
      const n = this.revealCount(bc);
      if (bc.def.onReveal) for (let i = 0; i < n; i++) { if (bc.gone) break; bc.def.onReveal(this, bc); if (i > 0) this.float(bc.lane, 'Echo!', '#9fe8ff'); }
      for (const g of this.gems(bc.inst)) if (g.onReveal && !bc.gone) g.onReveal(this, bc);
      this.emit('onPlay', bc);
      this.lanes[bc.lane].revealedHere[bc.side]++;
      this.recompute();
    });
  }

  revealCount(bc) {
    let n = 1;
    if (!bc.def.onReveal) return n;
    if (this.hasGem(bc.inst, 'echo')) n++;
    const lane = this.lanes[bc.lane];
    if (lane.loc?.echo) n++;
    if (bc.side === PLAYER) {
      for (const h of lane.home) if (h.echoFirst && !this.flags.echo_home) { n++; this.flags.echo_home = true; }
      for (const r of this.relics) if (r.echoFirstPerTurn && !this.flags['echo_t' + this.turn]) { n++; this.flags['echo_t' + this.turn] = true; }
    }
    return n;
  }

  // Put a card into a slot on the current side. Tokens/created cards reveal immediately.
  place(def, inst, laneIdx, opts = {}) {
    const side = this.me;
    const lane = this.lanes[laneIdx];
    const slot = lane.slotsBy[side].findIndex((s) => !s);
    if (slot < 0) return null;
    const bc = {
      bid: BID++, def, inst, side, lane: laneIdx, slot,
      base: opts.hc ? this.handPower(opts.hc) : this.basePowerOf(def, inst), buff: 0, aura: 0,
      turnPlayed: this.turn, movedThisTurn: false, token: !!opts.token, revealed: !opts.staged,
    };
    if (opts.hc?.extra) bc.extra = opts.hc.extra;
    lane.slotsBy[side][slot] = bc;
    if (!opts.staged) this.push({ t: 'spawn', bid: bc.bid, lane: laneIdx, side });
    return bc;
  }

  spawn(tokenId, laneIdx, buff = 0, side = this.me) {
    return this.as(side, () => {
      const bc = this.place(TOKENS[tokenId], null, laneIdx, { token: true });
      if (bc && buff) bc.buff += buff;
      this.recompute();
      return bc;
    });
  }

  canMoveCard(bc) {
    if (this.over || !bc.revealed || bc.movedThisTurn || bc.side !== PLAYER) return false;
    const lane = this.lanes[bc.lane];
    if (lane.loc?.noMoveOut) return false;
    if (bc.def.move || this.hasGem(bc.inst, 'drift')) return true;
    if (lane.home.some((h) => h.movable)) return true;
    for (const r of this.relics) if (r.freeMovePerTurn && this.S[PLAYER].movesThisTurn < 1) return true;
    return false;
  }

  playerMove(bid, toLane) {
    const bc = this.findCard(bid);
    if (!bc || !this.canMoveCard(bc)) return { ok: false, why: "Can't move" };
    if (bc.lane === toLane) return { ok: false, why: 'Same lane' };
    const ok = this.as(PLAYER, () => this.moveCard(bc, toLane));
    if (ok) { this.S[PLAYER].movesThisTurn++; this.recompute(); }
    return { ok, why: ok ? null : 'No room there' };
  }

  moveCard(bc, toLane) {
    if (bc.gone) return false;
    return this.as(bc.side, () => {
      const dest = this.lanes[toLane];
      const slot = dest.slotsBy[bc.side].findIndex((s) => !s);
      if (slot < 0 || dest.loc?.noMoveIn) return false;
      const from = bc.lane;
      this.lanes[from].slotsBy[bc.side][bc.slot] = null;
      bc.lane = toLane; bc.slot = slot; bc.movedThisTurn = true;
      dest.slotsBy[bc.side][slot] = bc;
      this.push({ t: 'move', bid: bc.bid, from, to: toLane });
      if (bc.def.onMoved) bc.def.onMoved(this, bc, from);
      for (const g of this.gems(bc.inst)) if (g.onMoved) g.onMoved(this, bc);
      this.emit('onAnyMove', bc, from);
      return true;
    });
  }

  destroy(bc) {
    if (!bc || bc.gone) return false;
    if (this.isProtected(bc)) { this.float(bc.lane, 'Protected', '#b9d6ff', bc.side); return false; }
    return this.as(bc.side, () => {
      const lane = this.lanes[bc.lane];
      lane.slotsBy[bc.side][bc.slot] = null;
      bc.gone = true;
      if (!bc.token) this.side.destroyedCount++;
      lane.destroyedBy[bc.side]++;
      this.push({ t: 'destroy', bid: bc.bid, lane: bc.lane, side: bc.side });
      if (bc.def.onDestroyed) bc.def.onDestroyed(this, bc);
      this.emit('onAnyDestroyed', bc);
      if (bc.inst && !bc.inst.temp && !bc.returned) this.side.discard.push(this.makeHandCard(bc.inst));
      this.recompute();
      return true;
    });
  }

  damage(bc, n) { if (bc && n > 0) this.buff(bc, -n); }

  // Strike N: the strongest revealed enemy card in that lane gets -N Power.
  strike(laneIdx, n) {
    const amt = Math.max(0, n + (this.strikeBonus || 0));
    if (amt <= 0) return 0;
    const foes = this.cardsIn(laneIdx, this.foe());
    if (!foes.length) { this.float(laneIdx, 'Strike missed', '#aaa', this.foe()); return 0; }
    const t = foes.slice().sort((a, c) => this.power(c) - this.power(a))[0];
    this.push({ t: 'strike', lane: laneIdx, from: this.me, bid: t.bid, n: amt });
    this.buff(t, -amt, true);
    this.recompute();
    this.emit('onStrike', null, laneIdx, amt);
    return amt;
  }

  // Freeze: the opponent can't play cards in that lane next turn.
  freeze(laneIdx) {
    const foe = this.foe();
    this.lanes[laneIdx].lock[foe] = this.turn + 1;
    this.push({ t: 'freeze', lane: laneIdx, side: foe });
    this.float(laneIdx, 'Frozen!', '#9fe8ff', foe);
  }

  gainEnergyNext(n) { this.side.energyNext += n; }
  gainEnergy(n) { this.side.energy += n; }
  gold(n) { if (this.me !== PLAYER) return; this.run.pendingGold = (this.run.pendingGold || 0) + n; this.push({ t: 'gold', n }); }

  drawNextTurn(n = 1) { this.side.drawNext += n; }

  queueCard(def, inst = null, costMod = 0) {
    if (this.side.nextHand.length >= MAX_HAND - DRAW_PER_TURN) return null;
    const hc = this.makeHandCard(inst || { id: def.id, uid: 'tmp' + BID, temp: true, sockets: def.token ? [] : [null] }, def);
    hc.costMod = costMod;
    this.side.nextHand.push(hc);
    return hc;
  }

  discardRandom(n = 1, exclude) {
    let out = 0;
    for (let i = 0; i < n; i++) {
      const pool = this.hand.filter((h) => h !== exclude);
      if (!pool.length) break;
      this.discardHandCard(this.rng.pick(pool)); out++;
    }
    return out;
  }
  discardHandCard(hc) {
    this.hand = this.hand.filter((h) => h !== hc);
    this.side.discardedCount++;
    this.push({ t: 'discard', hid: hc.hid, side: this.me });
    if (hc.def.onDiscard) hc.def.onDiscard(this, hc);
    this.emit('onDiscard', hc);
    if (!hc.inst?.temp) this.side.discard.push(hc);
  }

  weakestLane(side = this.me) {
    let best = 0, bestD = Infinity;
    for (const l of this.lanes) { const d = l.totals[side] - l.totals[1 - side]; if (d < bestD) { bestD = d; best = l.idx; } }
    return best;
  }

  // ---------- enemy AI ----------
  aiPlan() {
    const opp = this.opp || {};
    const style = opp.style || {};
    this.as(ENEMY, () => {
      const est = this.lanes.map((l) => l.totals[1]);
      let guard = 0;
      while (guard++ < 12) {
        let best = null;
        for (const hc of this.hand) for (let l = 0; l < 3; l++) {
          const c = this.canPlay(hc.hid, l, ENEMY); if (!c.ok) continue;
          if (this.boss?.enemyCanPlay && this.boss.enemyCanPlay(this, hc, l)) continue;
          const lane = this.lanes[l];
          const diff = lane.totals[0] - est[l];
          let score = this.handPower(hc) + c.cost * 1.2;
          if (diff >= -3 && diff <= 9) score += 4; else if (diff > 16) score -= 5; else if (diff < -12) score -= 3;
          if (style.lane != null && l === style.lane) score += 2;
          if (hc.def.tags?.includes('ongoing')) score += style.ongoing || 0;
          if (hc.def.tags?.includes('strike') && this.cardsIn(l, PLAYER).length) score += 2;
          score += this.rng.next() * 2.5;
          if (!best || score > best.score) best = { hc, l, score, cost: c.cost };
        }
        if (!best) break;
        // keep a little energy for a bigger card next turn sometimes
        this.play(best.hc.hid, best.l, ENEMY);
        est[best.l] += this.handPower(best.hc);
      }
    });
  }

  endTurn() {
    if (this.over) return;
    this.aiPlan();
    // reveal order: whoever is winning more lanes reveals first (ties: player first)
    const ahead = [0, 1].map((s) => this.lanes.filter((l) => l.totals[s] > l.totals[1 - s]).length);
    const first = ahead[ENEMY] > ahead[PLAYER] ? ENEMY : PLAYER;
    this.push({ t: 'revealOrder', first });
    for (const side of [first, 1 - first]) {
      for (const bc of this.S[side].staged.slice()) if (!bc.gone) this.reveal(bc);
    }
    // end of turn effects
    for (const side of [first, 1 - first]) {
      this.as(side, () => {
        for (const bc of this.allCards(side)) {
          if (bc.gone) continue;
          if (bc.def.endTurn) bc.def.endTurn(this, bc);
          for (const g of this.gems(bc.inst)) if (g.endTurn && !bc.gone) g.endTurn(this, bc);
        }
      });
      this.recompute();
      // emitFor without cards' endTurn (already done)
      this.as(side, () => {
        if (side === PLAYER) {
          for (const r of this.relics) r.endTurn?.(this);
          this.warden?.endTurn?.(this);
          for (const h of this.lanes[1].home) h.endTurn?.(this, this.lanes[1]);
        } else { this.opp?.endTurn?.(this); this.boss?.endTurn?.(this); }
        for (const lane of this.lanes) lane.loc?.endTurn?.(this, lane);
      });
      this.recompute();
    }
    for (const r of this.relics) if (r.bank) this.S[PLAYER].bank = Math.min(r.bank, this.S[PLAYER].energy);
    for (const s of [0, 1]) this.S[s].staged = [];
    if (this.turn >= this.maxTurns) { this.finish(); return; }
    // Routine cleanup feeds the next shuffle without triggering effect discards.
    for (const side of this.S) side.discard.push(...side.hand.splice(0).filter((hc) => !hc.inst?.temp));
    this.beginTurn();
  }

  laneScores() { return this.lanes.map((l) => ({ player: l.totals[0], enemy: l.totals[1] })); }

  finish() {
    this.recompute();
    const scores = this.laneScores();
    const laneResults = scores.map((s) => ({ ...s, won: s.player > s.enemy, lost: s.enemy > s.player }));
    const lanesWon = laneResults.filter((r) => r.won).length;
    const lanesLost = laneResults.filter((r) => r.lost).length;
    let won = lanesWon > lanesLost;
    let tiebreak = false;
    if (lanesWon === lanesLost) {
      const tp = scores.reduce((a, s) => a + s.player, 0), te = scores.reduce((a, s) => a + s.enemy, 0);
      won = tp > te; tiebreak = true;
    }
    let gold = laneResults.reduce((a, r) => a + (r.won ? Math.max(0, r.player) : 0), 0);
    let mult = 1;
    for (const r of this.relics) if (r.goldMult) mult += r.goldMult;
    for (const h of this.lanes[1].home) if (h.goldMult) mult += h.goldMult;
    gold = Math.round(gold * mult) + (this.run.pendingGold || 0);
    this.run.pendingGold = 0;
    this.result = { won, lanesWon, lanesLost, tiebreak, laneResults, gold, notes: [] };
    this.emitFor(PLAYER, 'battleEnd', this.result);
    this.over = true;
    this.push({ t: 'end', result: this.result });
  }

  drainFx() { const f = this.fx; this.fx = []; return f; }
}

export { CARDS, PLAYER, ENEMY };
