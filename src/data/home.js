// Home lane upgrades: the middle lane is yours for the whole run and grows as you build it.
const H = [];
function home(id, name, text, icon, hooks = {}) { H.push({ id, name, text, icon, ...hooks }); }
const mine = (b, lane) => lane.slots.filter(Boolean);

home('foundation', 'Stone Foundation', '+1 slot in your Home (max 6).', 'brick', { capBonus: 1, stack: true });
home('barracks', 'Barracks', 'Your cards in your Home have +1 Power.', 'tent', { stack: true, ongoing(b, lane) { for (const c of mine(b, lane)) b.aura(c, 1); } });
home('watchfire', 'Watch Fire', 'End of turn: Strike 1 in your Home.', 'flame', { stack: true, endTurn(b, lane) { b.strike(lane.idx, 1); } });
home('war_room', 'War Room', 'The first card you play in your Home each turn costs 1 less.', 'map', {
  costMod(b, lane) { return lane.playedHereThisTurn === 0 ? -1 : 0; },
});
home('vault', 'Vault', '+10% gold from fights.', 'chest', { stack: true, goldMult: 0.1 });
home('shrine', 'Shrine', 'Your Ongoing cards in your Home have +2 Power.', 'temple', { ongoing(b, lane) { lane.flags.ongoingBonus += 2; } });
home('echo_chamber', 'Echo Chamber', 'The first On Reveal in your Home each fight triggers twice.', 'bell', { echoFirst: true });
home('moat', 'Moat', 'Enemy cards in your Home have -1 Power.', 'wave', { stack: true, ongoing(b, lane) { for (const c of b.foesIn(lane.idx)) b.aura(c, -1); } });
home('training_yard', 'Training Yard', 'End of turn: a random card in your Home gets +1.', 'sword', {
  stack: true, endTurn(b, lane) { const m = mine(b, lane); if (m.length) b.buff(b.rng.pick(m), 1); },
});
home('portal', 'Waygate', 'Cards in your Home can Move. Cards that move into your Home get +1.', 'portal', {
  movable: true, onAnyMove(b, lane, bc) { if (bc.lane === lane.idx) b.buff(bc, 1, true); },
});
home('garden', 'Hearth Garden', 'Win your Home lane: a random card there permanently gains +1 Power.', 'flower', {
  battleEnd(b, lane, r) {
    if (!r.laneResults[lane.idx].won) return;
    const m = mine(b, lane).filter((c) => c.inst && !c.inst.temp);
    if (m.length) { const c = b.rng.pick(m); c.inst.bonus = (c.inst.bonus || 0) + 1; r.notes = (r.notes || []).concat(`${c.def.name} grew +1 permanently`); }
  },
});
home('bell_tower', 'Bell Tower', "Turn 1: Your opponent can't play cards in your Home.", 'bell', { battleStart(b, lane) { b.freeze(lane.idx); } });
home('library', 'Reading Room', 'The first card you play in your Home each turn draws 1 extra card next turn.', 'book', {
  onPlay(b, lane, bc) { if (bc.lane === lane.idx && lane.revealedHereThisTurn === 0) b.drawNextTurn(); },
});
home('ramparts', 'Ramparts', "Your cards in your Home can't be destroyed or weakened.", 'shield', { ongoing(b, lane) { lane.flags.protect = true; } });
home('beacon_spire', 'Beacon Spire', 'Your cards in the outer lanes have +1 Power if you are winning your Home.', 'tower', {
  ongoing(b, lane) { /* uses last computed totals */ if (b.winning(lane.idx)) for (const c of b.allCards()) if (c.lane !== lane.idx) b.aura(c, 1); },
});

export const HOME_UPGRADES = Object.fromEntries(H.map((h) => [h.id, h]));
export const HOME_LIST = H;
