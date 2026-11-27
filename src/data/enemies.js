// Asymmetric enemy lanes. The enemy side of each lane is a point-generating machine borrowed from another genre.
// Every enemy exposes: start, planIntent, act (end of turn), onPlay, strike, final, display, intent, view.

class EnemyLane {
  constructor(type, scale, rng, laneIdx) {
    this.type = type; this.id = type.id; this.name = type.name; this.genre = type.genre;
    this.scale = scale; this.rng = rng; this.laneIdx = laneIdx;
    this.score = 0; this.frozen = 0; this.state = {};
  }
  S(n) { return Math.max(1, Math.round(n * this.scale)); }
  gain(b, lane, n, label) {
    n = Math.round(n);
    if (n <= 0) return 0;
    if (lane.flags.noGain) { b.float(lane.idx, 'Blocked', '#b9d6ff', 'enemy'); return 0; }
    n = Math.max(0, n - (lane.flags.gainReduce || 0));
    if (n <= 0) { b.float(lane.idx, 'Reduced to 0', '#b9d6ff', 'enemy'); return 0; }
    this.score += n;
    b.push({ t: 'egain', lane: lane.idx, n });
    b.float(lane.idx, `+${n}${label ? ' ' + label : ''}`, '#ff7b7b', 'enemy');
    return n;
  }
  strike(b, lane, n) { const d = Math.min(this.score, n); this.score -= d; return d; }
  final() { return this.score; }
  display() { return this.score; }
  intent() { return { text: '', icon: 'up' }; }
  start() {}
  planIntent() {}
  act() {}
  view() { return { kind: this.id }; }
}

const T = {};
function type(id, name, genre, tier, blurb, Cls) { T[id] = { id, name, genre, tier, blurb, Cls }; }

// ---- Rising Tide (threshold meter) ----
type('tide', 'The Swell', 'Tide', 'basic', 'Gains a little more every turn.', class extends EnemyLane {
  seq(t) { return [1, 2, 2, 3, 3, 4, 5][t - 1] ?? 5; }
  intent(b) { return { text: `+${this.S(this.seq(b.turn))}`, icon: 'up' }; }
  act(b, lane) { this.gain(b, lane, this.S(this.seq(b.turn))); }
  view(b) { return { kind: 'tide', next: this.S(this.seq(b.turn)) }; }
});

// ---- Metronome (rhythm) ----
const BEATS = [[0, 4, 0, 4, 0, 8, 4], [3, 0, 3, 0, 3, 6, 3], [2, 2, 5, 2, 2, 5, 2], [1, 3, 1, 3, 1, 7, 3]];
type('metronome', 'Drum Fiend', 'Rhythm', 'basic', 'Follows a fixed, visible beat.', class extends EnemyLane {
  start() { this.state.beat = this.rng.pick(BEATS); }
  beatAt(t) { return this.state.beat[(t - 1) % this.state.beat.length]; }
  intent(b) { const v = this.beatAt(b.turn); return { text: v ? `+${this.S(v)}` : 'Rest', icon: v ? 'drum' : 'rest' }; }
  act(b, lane) { const v = this.beatAt(b.turn); if (v) this.gain(b, lane, this.S(v), '♪'); }
  view(b) { return { kind: 'metronome', beats: this.state.beat.slice(0, b.maxTurns).map((v) => (v ? this.S(v) : 0)), at: b.turn - 1 }; }
});

// ---- March (tower defense) ----
class March extends EnemyLane {
  start() { this.state.walkers = []; this.spawn(); }
  spawn() { const p = this.S(this.rng.int(2, 3) * (this.state.big || 1)); this.state.walkers.push({ hp: p, power: p, step: 0 }); }
  front() { return this.state.walkers.slice().sort((a, c) => c.step - a.step)[0]; }
  hit(n) {
    let left = n;
    const ws = this.state.walkers.slice().sort((a, c) => c.step - a.step);
    for (const w of ws) { if (left <= 0) break; const d = Math.min(w.hp, left); w.hp -= d; left -= d; }
    this.state.walkers = this.state.walkers.filter((w) => w.hp > 0);
    return left;
  }
  strike(b, lane, n) { const left = this.hit(n); const d = Math.min(this.score, left); this.score -= d; return n; }
  intent() {
    const arriving = this.state.walkers.filter((w) => w.step >= 2);
    const sum = arriving.reduce((a, w) => a + w.hp, 0);
    return { text: sum ? `${sum} arriving` : `Marching (${this.state.walkers.length})`, icon: 'walker' };
  }
  act(b, lane) {
    // each of your cards here strikes the front walker for 1
    const n = lane.slots.filter((c) => c && c.def.id !== 'junk').length;
    if (n) this.hit(n);
    for (const w of this.state.walkers) w.step++;
    const arrived = this.state.walkers.filter((w) => w.step >= 3);
    this.state.walkers = this.state.walkers.filter((w) => w.step < 3);
    for (const w of arrived) {
      this.gain(b, lane, w.hp, 'breach');
      if (this.state.ravage) { const m = lane.slots.filter(Boolean); if (m.length) b.damage(m.sort((a, c) => b.power(a) - b.power(c))[0], w.hp); }
    }
    this.spawn();
    if (this.state.double) this.spawn();
  }
  view() { return { kind: 'march', walkers: this.state.walkers.map((w) => ({ ...w })) }; }
}
type('march', 'Goblin Horde', 'Tower Defense', 'basic', 'Walkers advance 3 steps; arrivals add their health. Each of your cards here hits the front walker for 1 per turn.', March);

// ---- Factory (idle / incremental) ----
type('factory', 'Soot Factory', 'Idle', 'basic', 'Production compounds every turn. Each Strike also wrecks a generator.', class extends EnemyLane {
  start() { this.state.rate = 0; this.state.growth = this.S(1); }
  strike(b, lane, n) { const d = Math.min(this.score, n); this.score -= d; if (this.state.rate > 0) { this.state.rate--; b.float(lane.idx, '−1 rate', '#9fe8ff', 'enemy'); } return n; }
  intent() { return { text: `+${this.state.rate + this.state.growth}`, icon: 'gear' }; }
  act(b, lane) { this.state.rate += this.state.growth; this.gain(b, lane, this.state.rate, '⚙'); }
  view() { return { kind: 'factory', rate: this.state.rate, growth: this.state.growth }; }
});

// ---- Nightfall (day/night waves) ----
type('nightfall', 'Moonwatch', 'Day/Night', 'basic', 'Quiet days, brutal nights on turns 3 and 6.', class extends EnemyLane {
  night(t) { return t % 3 === 0; }
  amt(t) { return this.night(t) ? this.S(7) : this.S(1); }
  intent(b) { return { text: this.night(b.turn) ? `Night: +${this.amt(b.turn)}` : `Day: +${this.amt(b.turn)}`, icon: this.night(b.turn) ? 'moon' : 'sun' }; }
  act(b, lane) { this.gain(b, lane, this.amt(b.turn), this.night(b.turn) ? '☾' : ''); }
  view(b) { return { kind: 'nightfall', night: this.night(b.turn) }; }
});

// ---- Hoarder (reactive) ----
type('hoarder', 'Magpie Hoard', 'Reactive', 'basic', 'Gains whenever you play a card here.', class extends EnemyLane {
  intent() { return { text: `+${this.S(2)} · +${this.S(2)} per card you play here`, icon: 'eye' }; }
  onPlay(b, lane) { this.gain(b, lane, this.S(2), 'greed'); }
  act(b, lane) { this.gain(b, lane, this.S(2)); }
  view() { return { kind: 'hoarder' }; }
});

// ---- Siege Engine (tactics telegraph) ----
type('siege', 'Siege Ram', 'Tactics', 'elite', 'Marks your strongest card here and smashes it.', class extends EnemyLane {
  planIntent(b, lane) {
    const m = lane.slots.filter(Boolean).sort((a, c) => b.power(c) - b.power(a));
    this.state.target = m[0]?.bid ?? null;
  }
  intent(b, lane) {
    const t = lane.slots.find((c) => c && c.bid === this.state.target);
    return { text: t ? `Smash ${t.def.name} (−${this.S(3)}) · +${this.S(2)}` : `+${this.S(3)}`, icon: 'ram' };
  }
  act(b, lane) {
    const t = lane.slots.find((c) => c && c.bid === this.state.target);
    if (t) { b.damage(t, this.S(3)); this.gain(b, lane, this.S(2)); } else this.gain(b, lane, this.S(3));
  }
  view() { return { kind: 'siege', target: this.state.target }; }
});

// ---- Junk Line (falling-block garbage) ----
type('junkline', 'Scrap Hauler', 'Garbage', 'elite', 'Dumps Junk into your slots. If your side here is full, the overflow hurts it instead.', class extends EnemyLane {
  intent() { return { text: `+${this.S(3)} · dumps Junk`, icon: 'junk' }; }
  act(b, lane) {
    if (!lane.slots.some((s) => !s)) {
      const loss = Math.min(this.score, this.S(5)); this.score -= loss;
      b.float(lane.idx, `Overflow −${loss}`, '#9fe8ff', 'enemy');
      return;
    }
    this.gain(b, lane, this.S(3));
    b.spawn('junk', lane.idx);
  }
  view() { return { kind: 'junkline' }; }
});

// ---- Reel (slot machine) ----
const SYMBOLS = [{ k: 'skull', v: 0 }, { k: 'cherry', v: 1 }, { k: 'cherry', v: 1 }, { k: 'bell', v: 2 }, { k: 'bell', v: 2 }, { k: 'bar', v: 3 }, { k: 'seven', v: 5 }];
type('reel', 'Bandit Engine', 'Slot Machine', 'elite', 'Spins three visible symbols each turn. Pairs ×1.5, triples ×2. Your first Strike each turn turns its best symbol into a skull.', class extends EnemyLane {
  planIntent() { this.state.spin = [0, 1, 2].map(() => ({ ...this.rng.pick(SYMBOLS) })); this.state.jammed = false; }
  total() {
    const s = this.state.spin || [];
    let sum = s.reduce((a, x) => a + x.v, 0);
    const counts = {}; for (const x of s) if (x.v) counts[x.k] = (counts[x.k] || 0) + 1;
    const best = Math.max(0, ...Object.values(counts));
    if (best === 3) sum *= 2; else if (best === 2) sum *= 1.5;
    return this.S(sum);
  }
  strike(b, lane, n) {
    if (!this.state.jammed && this.state.spin) {
      const s = this.state.spin.slice().sort((a, c) => c.v - a.v)[0];
      if (s && s.v > 0) { s.k = 'skull'; s.v = 0; this.state.jammed = true; b.float(lane.idx, 'Jammed!', '#9fe8ff', 'enemy'); }
    }
    const d = Math.min(this.score, n); this.score -= d; return n;
  }
  intent() { return { text: `Spin: +${this.total()}`, icon: 'reel' }; }
  act(b, lane) { this.gain(b, lane, this.total(), '🎰'); }
  view() { return { kind: 'reel', spin: (this.state.spin || []).map((x) => x.k) }; }
});

// ---- Commission (puzzle request) ----
const REQS = [
  { k: 'exact', make: (e) => { const n = e.S(e.rng.int(9, 13)); return { n, text: `Have exactly ${n} Power here` }; }, ok: (b, l, r) => l.total === r.n },
  { k: 'count', make: () => ({ text: 'Have 4+ cards here' }), ok: (b, l) => l.slots.filter(Boolean).length >= 4 },
  { k: 'cheap', make: () => ({ text: 'Have 3+ cards here, all costing 2 or less' }), ok: (b, l) => { const m = l.slots.filter(Boolean); return m.length >= 3 && m.every((c) => c.def.cost <= 2); } },
  { k: 'odd', make: (e) => { const n = e.S(8); return { n, text: `Have an odd Power of ${n}+ here` }; }, ok: (b, l, r) => l.total >= r.n && l.total % 2 === 1 },
  { k: 'tribes', make: () => ({ text: 'Have 3 different tribes here' }), ok: (b, l) => new Set(l.slots.filter(Boolean).map((c) => c.def.tribe).filter(Boolean)).size >= 3 },
];
type('commission', 'The Patron', 'Puzzle', 'elite', 'Fulfil the request by the end of the fight and this lane is yours. Fail and it is lost.', class extends EnemyLane {
  start() { const r = this.rng.pick(REQS); this.state.req = r; this.state.r = r.make(this); }
  met(b, lane) { return this.state.req.ok(b, lane, this.state.r); }
  final(b, lane) { return this.met(b, lane) ? 0 : 999; }
  display(b, lane) { return this.met(b, lane) ? 0 : 99; }
  strike(b, lane, n) { return 0; }
  intent(b, lane) { return { text: (this.met(b, lane) ? '✔ ' : '✘ ') + this.state.r.text, icon: 'scroll' }; }
  view(b, lane) { return { kind: 'commission', met: this.met(b, lane), text: this.state.r.text }; }
});

// ---- Leech ----
type('leech', 'Marsh Leech', 'Drain', 'elite', 'Drains 1 Power from each of your cards here each turn and keeps it.', class extends EnemyLane {
  intent(b, lane) { return { text: `Drain ${lane.slots.filter(Boolean).length} · +${this.S(1)}`, icon: 'drop' }; }
  act(b, lane) {
    let n = 0;
    for (const c of lane.slots.filter(Boolean)) { if (!b.isProtected(c) && c.def.id !== 'junk') { b.damage(c, 1); n++; } }
    this.gain(b, lane, n + this.S(1), 'drain');
  }
  view() { return { kind: 'leech' }; }
});

// ---- Boss lane types ----
type('baton', 'The Conductor', 'Rhythm', 'boss', 'Each turn the crescendo lands on one lane.', class extends EnemyLane {
  intent(b, lane) { const c = b.flags.cresc === lane.idx; return { text: c ? `CRESCENDO +${this.S(7)}` : `+${this.S(2)}`, icon: c ? 'drum' : 'up' }; }
  act(b, lane) { this.gain(b, lane, b.flags.cresc === lane.idx ? this.S(7) : this.S(2), b.flags.cresc === lane.idx ? '♫' : ''); }
  view(b, lane) { return { kind: 'metronome', boss: true, cresc: b.flags.cresc === lane.idx }; }
});
type('brood', 'Brood Mother', 'Tower Defense', 'boss', 'Spawns two walkers a turn. Breaches also wound your weakest card here.', class extends March {
  start() { this.state.double = true; this.state.ravage = true; this.state.walkers = []; this.spawn(); this.spawn(); }
});
type('engine', 'The Grand Engine', 'Idle', 'boss', 'Compounding production with heavy growth.', class extends EnemyLane {
  start() { this.state.rate = this.S(1); this.state.growth = this.S(1.5); }
  strike(b, lane, n) { const d = Math.min(this.score, n); this.score -= d; if (this.state.rate > 0) this.state.rate--; return n; }
  intent() { return { text: `+${this.state.rate + this.state.growth}`, icon: 'gear' }; }
  act(b, lane) { this.state.rate += this.state.growth; this.gain(b, lane, this.state.rate, '⚙'); }
  view() { return { kind: 'factory', rate: this.state.rate, boss: true }; }
});
type('engine_ram', 'Engine Ram', 'Tactics', 'boss', 'Smashes your strongest card here each turn.', class extends EnemyLane {
  planIntent(b, lane) { const m = lane.slots.filter(Boolean).sort((a, c) => b.power(c) - b.power(a)); this.state.target = m[0]?.bid ?? null; }
  intent(b, lane) { const t = lane.slots.find((c) => c && c.bid === this.state.target); return { text: t ? `Smash ${t.def.name} (−${this.S(4)}) · +${this.S(3)}` : `+${this.S(4)}`, icon: 'ram' }; }
  act(b, lane) { const t = lane.slots.find((c) => c && c.bid === this.state.target); if (t) { b.damage(t, this.S(4)); this.gain(b, lane, this.S(3)); } else this.gain(b, lane, this.S(4)); }
  view() { return { kind: 'siege', boss: true, target: this.state.target }; }
});

export const ENEMY_TYPES = T;

export const BOSSES = {
  conductor: {
    id: 'conductor', name: 'The Conductor', act: 1, enemies: ['baton', 'baton', 'baton'],
    text: 'You may play at most 3 cards per turn. Each turn the crescendo (+7) lands on a telegraphed lane.',
    turnStart(b) { b.flags.cresc = (b.turn + (b.flags.crescOff ?? (b.flags.crescOff = b.rng.int(0, 2)))) % 3; },
    canPlay(b) { return b.playedThisTurn.length >= 3 ? 'The Conductor allows only 3 cards per turn' : null; },
  },
  brood: {
    id: 'brood', name: 'Brood Mother', act: 2, enemies: ['brood', 'brood', 'brood'],
    text: 'Walkers march in every lane, two per turn. Breaches also wound your weakest card in that lane.',
  },
  engine: {
    id: 'engine', name: 'The Grand Engine', act: 3, enemies: ['engine', 'engine_ram', 'engine'], extraTurns: 1,
    text: 'A 7-turn fight. Compounding factories flank a ram that smashes your strongest Home card.',
  },
};

export const ACT_POOLS = {
  1: { basic: ['tide', 'metronome', 'march', 'factory', 'nightfall', 'hoarder'], elite: ['siege', 'junkline', 'reel'] },
  2: { basic: ['tide', 'metronome', 'march', 'factory', 'nightfall', 'hoarder', 'siege', 'junkline'], elite: ['reel', 'commission', 'leech', 'siege', 'junkline'] },
  3: { basic: ['metronome', 'march', 'factory', 'nightfall', 'hoarder', 'siege', 'junkline', 'reel', 'leech'], elite: ['reel', 'commission', 'leech', 'siege', 'junkline', 'factory'] },
};

export function makeEnemyLane(typeId, scale, rng, laneIdx) {
  const t = T[typeId] || T.tide;
  const e = new t.Cls(t, scale, rng, laneIdx);
  return e;
}
