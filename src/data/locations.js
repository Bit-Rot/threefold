// Outer-lane locations. Hooks receive (battle, lane, ...).
const L = [];
function loc(id, name, text, art, hooks = {}) { L.push({ id, name, text, art, ...hooks }); }
const mine = (b, lane) => lane.slots.filter(Boolean);

loc('open_field', 'Open Field', 'No effect.', { bg: 'field', pal: 'moss' });
loc('ember_forge', 'Ember Forge', 'Cards played here get +1 Power.', { bg: 'fire', pal: 'ember' }, {
  onPlay(b, lane, bc) { if (bc.lane === lane.idx) b.buff(bc, 1, true); },
});
loc('frozen_lake', 'Frozen Lake', "Cards can't move in or out. The enemy here gains 1 less each turn.", { bg: 'snow', pal: 'frost' }, {
  noMoveIn: true, noMoveOut: true, ongoing(b, lane) { lane.flags.gainReduce += 1; },
});
loc('narrow_pass', 'Narrow Pass', 'Only 3 slots. Cards here have +1 Power.', { bg: 'cave', pal: 'bone' }, {
  cap: 3, ongoing(b, lane) { for (const c of mine(b, lane)) b.aura(c, 1); },
});
loc('grand_hall', 'Grand Hall', 'This lane has 5 slots.', { bg: 'castle', pal: 'gold' }, { cap: 5 });
loc('whisper_woods', 'Whispering Woods', 'On Reveal effects here trigger twice.', { bg: 'forest', pal: 'forest' }, { echo: true });
loc('graveyard', 'Old Graveyard', 'When a card of yours is destroyed here, your cards here get +2.', { bg: 'grave', pal: 'bone' }, {
  onAnyDestroyed(b, lane, bc) { if (bc.lane === lane.idx) for (const c of mine(b, lane)) b.buff(c, 2, true); },
});
loc('bazaar', 'Bazaar', 'Playing a card here gains 3 gold.', { bg: 'market', pal: 'gold' }, {
  onPlay(b, lane, bc) { if (bc.lane === lane.idx) b.gold(3); },
});
loc('library', 'Sunken Library', 'The first card you play here each turn draws a card.', { bg: 'library', pal: 'ocean' }, {
  onPlay(b, lane, bc) { if (bc.lane === lane.idx && lane.playedHereThisTurn === 0) b.drawCards(1); },
});
loc('storm_peak', 'Storm Peak', 'End of turn: Strike 2 here.', { bg: 'storm', pal: 'storm' }, {
  endTurn(b, lane) { b.strike(lane.idx, 2); },
});
loc('swamp', 'Mire', 'Your cards here have -1 Power. The enemy here gains 1 less each turn.', { bg: 'swamp', pal: 'moss' }, {
  ongoing(b, lane) { for (const c of mine(b, lane)) b.aura(c, -1); lane.flags.gainReduce += 1; },
});
loc('ashfall', 'Ashfall Crater', 'End of turn: your weakest card here loses 1 Power. Cards here cost 1 less.', { bg: 'fire', pal: 'shadow' }, {
  costMod() { return -1; },
  endTurn(b, lane) { const m = mine(b, lane); if (m.length) b.buff(m.sort((a, c) => b.power(a) - b.power(c))[0], -1); },
});
loc('duel_grounds', 'Duel Grounds', 'Your strongest card here has +3 Power.', { bg: 'ruins', pal: 'crimson' }, {
  ongoing(b, lane) { const m = mine(b, lane); if (m.length) b.aura(m.sort((a, c) => (c.base + c.buff) - (a.base + a.buff))[0], 3); },
});
loc('cliffside', 'Cliffside Stair', 'Cards cost 1 less here on turn 4 and later.', { bg: 'sky', pal: 'dawn' }, {
  costMod(b) { return b.turn >= 4 ? -1 : 0; },
});
loc('haunted_keep', 'Haunted Keep', 'Your Ongoing cards here have +2 Power.', { bg: 'night', pal: 'violet' }, {
  ongoing(b, lane) { lane.flags.ongoingBonus += 2; },
});
loc('riverbank', 'Riverbank', 'Cards that move here get +2 Power.', { bg: 'sea', pal: 'ocean' }, {
  unlock: 'locs_tide', onAnyMove(b, lane, bc) { if (bc.lane === lane.idx) b.buff(bc, 2, true); },
});
loc('ancient_ruins', 'Ancient Ruins', 'End of turn 4: your cards here get +3.', { bg: 'ruins', pal: 'bone' }, {
  endTurn(b, lane) { if (b.turn === 4) for (const c of mine(b, lane)) b.buff(c, 3); },
});
loc('star_altar', 'Star Altar', 'Turn 6 only: cards played here get +4.', { bg: 'void', pal: 'violet' }, {
  unlock: 'locs_mystic', onPlay(b, lane, bc) { if (bc.lane === lane.idx && b.turn >= 6) b.buff(bc, 4, true); },
});
loc('junkyard', 'Junkyard', 'Start: a Junk appears here. Junk here has +3 Power.', { bg: 'workshop', pal: 'rust' }, {
  unlock: 'locs_mystic', battleStart(b, lane) { b.spawn('junk', lane.idx); },
  ongoing(b, lane) { for (const c of mine(b, lane)) if (c.def.id === 'junk') b.aura(c, 3); },
});
loc('mirror_pool', 'Mirror Pool', 'The first card played here each fight is copied into an empty slot here.', { bg: 'sea', pal: 'frost' }, {
  unlock: 'locs_mystic', onPlay(b, lane, bc) {
    if (bc.lane !== lane.idx || b.flags['mirror' + lane.idx]) return; b.flags['mirror' + lane.idx] = true;
    const copy = b.place(bc.def, null, lane.idx, { token: true }); if (copy) { copy.base = b.basePowerOf(bc.def, bc.inst); b.float(lane.idx, 'Mirrored!', '#9fe8ff'); }
  },
});
loc('watchfort', 'Watchfort', 'Turn 1: Freeze the enemy here.', { bg: 'castle', pal: 'steel' }, {
  battleStart(b, lane) { b.freeze(lane.idx); },
});

export const LOCATIONS = Object.fromEntries(L.map((l) => [l.id, l]));
export const LOCATION_LIST = L;
