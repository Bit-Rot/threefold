// Outer-lane locations. Hooks receive (battle, lane, ...).
const L = [];
function loc(id, name, text, art, hooks = {}) { L.push({ id, name, text, art, ...hooks }); }
const mine = (b, lane) => lane.slots.filter(Boolean);

loc('open_field', 'Open Field', 'No effect.', { bg: 'field', pal: 'moss' });
loc('ember_forge', 'Ember Forge', 'Cards played here get +1 Power.', { bg: 'fire', pal: 'ember' }, {
  onPlay(b, lane, bc) { if (bc.lane === lane.idx) b.buff(bc, 1, true); },
});
loc('frozen_lake', 'Frozen Lake', "Cards can't move in or out. On Reveal cards played here get +1 Power.", { bg: 'snow', pal: 'frost' }, {
  noMoveIn: true, noMoveOut: true, onPlay(b, lane, bc) { if (bc.lane === lane.idx && bc.def.onReveal) b.buff(bc, 1, true); },
});
loc('narrow_pass', 'Narrow Pass', 'Only 3 slots. Cards here have +1 Power.', { bg: 'cave', pal: 'bone' }, {
  cap: 3, ongoing(b, lane) { for (const c of mine(b, lane)) b.aura(c, 1); },
});
loc('grand_hall', 'Grand Hall', 'This lane has 5 slots.', { bg: 'castle', pal: 'gold' }, { cap: 5 });
loc('whisper_woods', 'Whispering Woods', 'On Reveal effects here trigger twice.', { bg: 'forest', pal: 'forest' }, { echo: true });
loc('graveyard', 'Old Graveyard', 'When a card is destroyed here, its owner\'s other cards here get +2.', { bg: 'grave', pal: 'bone' }, {
  onAnyDestroyed(b, lane, bc) { if (bc.lane === lane.idx) for (const c of mine(b, lane)) b.buff(c, 2, true); },
});
loc('bazaar', 'Bazaar', 'When you play a card here, gain 3 gold.', { bg: 'market', pal: 'gold' }, {
  onPlay(b, lane, bc) { if (bc.lane === lane.idx) b.gold(3); },
});
loc('library', 'Sunken Library', 'The first card each player plays here each turn draws them a card.', { bg: 'library', pal: 'ocean' }, {
  onPlay(b, lane, bc) { if (bc.lane === lane.idx && lane.revealedHereThisTurn === 0) b.drawCards(1); },
});
loc('storm_peak', 'Storm Peak', 'End of turn: each player Strikes 2 here.', { bg: 'storm', pal: 'storm' }, {
  endTurn(b, lane) { b.strike(lane.idx, 2); },
});
loc('swamp', 'Mire', 'Cards here have -1 Power. Cards here cost 1 less.', { bg: 'swamp', pal: 'moss' }, {
  costMod() { return -1; }, ongoing(b, lane) { for (const c of mine(b, lane)) b.aura(c, -1); },
});
loc('ashfall', 'Ashfall Crater', 'End of turn: each side\'s weakest card here loses 1 Power. Cards here cost 1 less.', { bg: 'fire', pal: 'shadow' }, {
  costMod() { return -1; },
  endTurn(b, lane) { const m = mine(b, lane); if (m.length) b.buff(m.sort((a, c) => b.power(a) - b.power(c))[0], -1); },
});
loc('duel_grounds', 'Duel Grounds', 'Each player\'s strongest card here has +3 Power.', { bg: 'ruins', pal: 'crimson' }, {
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
loc('ancient_ruins', 'Ancient Ruins', 'End of turn 4: all cards here get +3.', { bg: 'ruins', pal: 'bone' }, {
  endTurn(b, lane) { if (b.turn === 4) for (const c of mine(b, lane)) b.buff(c, 3); },
});
loc('star_altar', 'Star Altar', 'Cards played here on turn 6 or later get +4.', { bg: 'void', pal: 'violet' }, {
  unlock: 'locs_mystic', onPlay(b, lane, bc) { if (bc.lane === lane.idx && b.turn >= 6) b.buff(bc, 4, true); },
});
loc('junkyard', 'Junkyard', 'Start: a Junk appears on each side here. Junk here has +3 Power.', { bg: 'workshop', pal: 'rust' }, {
  unlock: 'locs_mystic', battleStart(b, lane) { b.spawn('junk', lane.idx); },
  ongoing(b, lane) { for (const c of mine(b, lane)) if (c.def.id === 'junk') b.aura(c, 3); },
});
loc('mirror_pool', 'Mirror Pool', 'The first card each player plays here is copied into an empty slot beside it.', { bg: 'sea', pal: 'frost' }, {
  unlock: 'locs_mystic', onPlay(b, lane, bc) {
    if (bc.lane !== lane.idx || b.flags['mirror' + lane.idx + b.me]) return; b.flags['mirror' + lane.idx + b.me] = true;
    const copy = b.place(bc.def, null, lane.idx, { token: true }); if (copy) { copy.base = b.basePowerOf(bc.def, bc.inst); b.float(lane.idx, 'Mirrored!', '#9fe8ff'); }
  },
});
loc('watchfort', 'Watchfort', 'No cards can be played here on turn 1.', { bg: 'castle', pal: 'steel' }, {
  battleStart(b, lane) { lane.lock[b.me] = 1; },
});

export const LOCATIONS = Object.fromEntries(L.map((l) => [l.id, l]));
export const LOCATION_LIST = L;
