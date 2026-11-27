// Card definitions. Mechanic keywords borrow from lane battlers (On Reveal, Ongoing, Move, Destroy, Discard),
// but every name and illustration here is original.
//
// art: { f: figure, ...params, bg: background, pal: palette }  — see art/painter.js

const others = (b, bc) => b.cardsIn(bc.lane).filter((c) => c !== bc);
const weakest = (arr, b) => arr.slice().sort((a, c) => b.power(a) - b.power(c))[0];
const strongest = (arr, b) => arr.slice().sort((a, c) => b.power(c) - b.power(a))[0];

export const TRIBES = ['Knight', 'Beast', 'Spirit', 'Construct', 'Fiend', 'Sage'];

const L = [];
function C(id, name, cost, power, rarity, tribe, text, art, opts = {}) {
  L.push({ id, name, cost, power, rarity, tribe, text, art, tags: [], set: 'core', ...opts });
}

// ---------------- Vanilla / starters ----------------
C('recruit', 'Recruit', 1, 2, 'common', 'Knight', '', { f: 'hum', hat: 'cap', item: 'sword', pal: 'steel', bg: 'castle' });
C('spearman', 'Spearman', 2, 3, 'common', 'Knight', '', { f: 'hum', hat: 'helm', item: 'spear', pal: 'steel', bg: 'field' });
C('guardian', 'Guardian', 3, 5, 'common', 'Knight', '', { f: 'hum', hat: 'greathelm', item: 'shield', pal: 'gold', bg: 'castle' });
C('hill_ogre', 'Hill Ogre', 4, 7, 'common', 'Fiend', '', { f: 'brute', pal: 'moss', bg: 'field' });
C('stone_giant', 'Stone Giant', 6, 12, 'uncommon', 'Construct', '', { f: 'golem', pal: 'bone', bg: 'cave' });

// ---------------- On Reveal ----------------
C('sprite', 'Hearth Sprite', 1, 1, 'common', 'Spirit', 'On Reveal: Give another card here +2.', { f: 'wisp', pal: 'dawn', bg: 'forest' }, {
  tags: ['reveal'], onReveal(b, bc) { const o = others(b, bc); if (o.length) b.buff(b.rng.pick(o), 2); },
});
C('hearth_cook', 'Hearth Cook', 2, 2, 'common', 'Sage', 'On Reveal: Draw a card.', { f: 'hum', hat: 'chef', item: 'ladle', pal: 'ember', bg: 'tavern' }, {
  tags: ['reveal'], onReveal(b) { b.drawCards(1); },
});
C('drummer', 'War Drummer', 3, 3, 'common', 'Knight', 'On Reveal: Your other cards here get +1.', { f: 'hum', hat: 'feather', item: 'drum', pal: 'crimson', bg: 'field' }, {
  tags: ['reveal'], onReveal(b, bc) { for (const c of others(b, bc)) b.buff(c, 1); },
});
C('slinger', 'Slinger', 2, 2, 'common', 'Knight', 'On Reveal: Strike 3 here.', { f: 'hum', hat: 'hood', item: 'bow', pal: 'forest', bg: 'forest' }, {
  tags: ['reveal', 'strike'], onReveal(b, bc) { b.strike(bc.lane, 3); },
});
C('lamplighter', 'Lamplighter', 1, 2, 'common', 'Sage', 'On Reveal: +1 Energy next turn.', { f: 'hum', hat: 'tophat', item: 'lantern', pal: 'violet', bg: 'night' }, {
  tags: ['reveal'], onReveal(b) { b.gainEnergyNext(1); },
});
C('prospector', 'Prospector', 2, 2, 'common', 'Sage', 'On Reveal: Gain 6 gold.', { f: 'hum', hat: 'miner', item: 'pick', pal: 'gold', bg: 'cave' }, {
  tags: ['reveal'], onReveal(b) { b.gold(6); },
});
C('banner_knight', 'Banner Knight', 4, 4, 'uncommon', 'Knight', 'On Reveal: Your cards in other lanes get +1.', { f: 'hum', hat: 'greathelm', item: 'banner', pal: 'crimson', bg: 'castle' }, {
  tags: ['reveal'], onReveal(b, bc) { for (const c of b.allCards()) if (c.lane !== bc.lane) b.buff(c, 1); },
});
C('frost_witch', 'Frost Witch', 3, 2, 'uncommon', 'Spirit', 'On Reveal: Freeze this lane. Your opponent can\'t play cards here next turn.', { f: 'hum', hat: 'witch', item: 'staff', pal: 'frost', bg: 'snow' }, {
  tags: ['reveal', 'freeze'], onReveal(b, bc) { b.freeze(bc.lane); },
});
C('thunder_hawk', 'Thunder Hawk', 4, 4, 'uncommon', 'Beast', 'On Reveal: Strike 2 in every lane.', { f: 'bird', pal: 'storm', bg: 'storm' }, {
  tags: ['reveal', 'strike'], onReveal(b) { for (let i = 0; i < 3; i++) b.strike(i, 2); },
});
C('mirror_imp', 'Mirror Imp', 2, 1, 'uncommon', 'Fiend', 'On Reveal: Add a copy of a random card from your deck to your hand. It costs 1 less.', { f: 'imp', pal: 'violet', bg: 'void' }, {
  tags: ['reveal'], onReveal(b) {
    const pool = b.drawPile.filter((h) => h.def.id !== 'mirror_imp');
    if (pool.length) { const h = b.rng.pick(pool); b.addToHand(h.def, null, -1); }
  },
});
C('scholar', 'Scholar', 2, 1, 'common', 'Sage', 'On Reveal: Draw 2 cards.', { f: 'hum', hat: 'scholar', item: 'book', pal: 'ocean', bg: 'library' }, {
  tags: ['reveal'], onReveal(b) { b.drawCards(2); },
});
C('alchemist', 'Alchemist', 2, 2, 'common', 'Sage', 'On Reveal: The next card you play costs 2 less.', { f: 'hum', hat: 'goggles', item: 'potion', pal: 'moss', bg: 'library' }, {
  tags: ['reveal'], onReveal(b) { b.nextCostReduction = 2; },
});
C('twin_blades', 'Twin Blades', 2, 2, 'common', 'Knight', 'On Reveal: Summon a 2-power Twin here.', { f: 'hum', hat: 'bandana', item: 'daggers', pal: 'crimson', bg: 'ruins' }, {
  tags: ['reveal'], onReveal(b, bc) { b.spawn('twin', bc.lane); },
});
C('merchant', 'Merchant Prince', 4, 3, 'rare', 'Sage', 'On Reveal: Gain gold equal to your power here.', { f: 'hum', hat: 'turban', item: 'coins', pal: 'gold', bg: 'market' }, {
  tags: ['reveal'], set: 'cache_gold', onReveal(b, bc) { b.recompute(); b.gold(Math.max(0, b.lanes[bc.lane].total)); },
});
C('starfall_owl', 'Starfall Owl', 3, 3, 'uncommon', 'Beast', 'On Reveal: Your other On Reveal cards get +1.', { f: 'owl', pal: 'violet', bg: 'night' }, {
  tags: ['reveal'], onReveal(b, bc) { for (const c of b.allCards()) if (c !== bc && c.def.onReveal) b.buff(c, 1); },
});
C('echo_bard', 'Echo Bard', 3, 2, 'rare', 'Sage', 'On Reveal: Repeat the On Reveal of the last card you played.', { f: 'hum', hat: 'feather', item: 'lute', pal: 'dawn', bg: 'tavern' }, {
  tags: ['reveal'], onReveal(b, bc) {
    const prev = b.playedAll.slice(0, -1).reverse().find((c) => c.def.onReveal && c.def.id !== 'echo_bard' && !c.gone);
    if (prev) { prev.def.onReveal(b, prev); b.float(bc.lane, 'Encore!', '#9fe8ff'); }
  },
});
C('gravedigger', 'Gravedigger', 3, 3, 'uncommon', 'Fiend', 'On Reveal: Destroy your weakest other card here and gain its power.', { f: 'hum', hat: 'hood', item: 'shovel', pal: 'bone', bg: 'grave' }, {
  tags: ['reveal', 'destroy'], set: 'cache_ash', onReveal(b, bc) {
    const o = others(b, bc); if (!o.length) return; const w = weakest(o, b); const p = b.power(w);
    if (b.destroy(w)) b.buff(bc, Math.max(0, p));
  },
});
C('mimic', 'Mimic Chest', 3, 0, 'uncommon', 'Fiend', "On Reveal: This card's power becomes equal to your strongest card here.", { f: 'chest', pal: 'ember', bg: 'cave' }, {
  tags: ['reveal'], onReveal(b, bc) { const o = others(b, bc); if (!o.length) return; const s = strongest(o, b); b.buff(bc, Math.max(0, b.power(s) - b.power(bc))); },
});
C('tinker', 'Tinker', 2, 2, 'common', 'Construct', 'On Reveal: Destroy all Junk here. +2 power for each.', { f: 'hum', hat: 'goggles', item: 'wrench', pal: 'steel', bg: 'workshop' }, {
  tags: ['reveal'], onReveal(b, bc) { let n = 0; for (const c of others(b, bc)) if (c.def.id === 'junk') { b.destroy(c); n++; } if (n) b.buff(bc, 2 * n); },
});
C('pyre_priest', 'Pyre Priest', 2, 3, 'uncommon', 'Fiend', 'On Reveal: Destroy your weakest other card here. If you do, +3 power.', { f: 'hum', hat: 'mitre', item: 'torch', pal: 'ember', bg: 'fire' }, {
  tags: ['reveal', 'destroy'], set: 'cache_ash', onReveal(b, bc) { const o = others(b, bc); if (!o.length) return; if (b.destroy(weakest(o, b))) b.buff(bc, 3); },
});
C('riptide_siren', 'Riptide Siren', 3, 3, 'uncommon', 'Spirit', 'On Reveal: Pull your weakest card from another lane to here.', { f: 'mermaid', pal: 'ocean', bg: 'sea' }, {
  tags: ['reveal', 'move'], set: 'cache_tide', onReveal(b, bc) {
    const o = b.allCards().filter((c) => c.lane !== bc.lane); if (!o.length) return; b.moveCard(weakest(o, b), bc.lane);
  },
});
C('bonfire_hag', 'Bonfire Hag', 4, 3, 'rare', 'Fiend', 'On Reveal: Discard your hand. Strike 2 here for each card discarded.', { f: 'hum', hat: 'witch', item: 'cauldron', pal: 'ember', bg: 'fire' }, {
  tags: ['reveal', 'discard', 'strike'], set: 'cache_hex', onReveal(b, bc) { let n = 0; for (const h of b.hand.slice()) { b.discardHandCard(h); n++; } for (let i = 0; i < n; i++) b.strike(bc.lane, 2); },
});
C('rag_picker', 'Rag Picker', 1, 1, 'common', 'Fiend', 'On Reveal: Discard a random card from your hand. If you do, +3 power.', { f: 'hum', hat: 'hood', item: 'sack', pal: 'bone', bg: 'ruins' }, {
  tags: ['reveal', 'discard'], set: 'cache_hex', onReveal(b, bc) { if (b.discardRandom(1)) b.buff(bc, 3); },
});
C('saboteur', 'Saboteur', 2, 2, 'uncommon', 'Fiend', 'On Reveal: Freeze the enemy here and Strike 1.', { f: 'hum', hat: 'mask', item: 'bomb', pal: 'shadow', bg: 'night' }, {
  tags: ['reveal', 'freeze', 'strike'], set: 'cache_siege', onReveal(b, bc) { b.freeze(bc.lane); b.strike(bc.lane, 1); },
});
C('catapult', 'Catapult Crew', 4, 2, 'uncommon', 'Construct', 'On Reveal: Strike 6 here.', { f: 'catapult', pal: 'wood', bg: 'field' }, {
  tags: ['reveal', 'strike'], set: 'cache_siege', onReveal(b, bc) { b.strike(bc.lane, 6); },
});
C('arbalest', 'Arbalest', 1, 1, 'common', 'Knight', 'On Reveal: Strike 2 here.', { f: 'hum', hat: 'helm', item: 'crossbow', pal: 'wood', bg: 'castle' }, {
  tags: ['reveal', 'strike'], set: 'cache_siege', onReveal(b, bc) { b.strike(bc.lane, 2); },
});
C('storm_caller', 'Storm Caller', 5, 4, 'rare', 'Spirit', 'On Reveal: Strike 3 in every lane.', { f: 'hum', hat: 'hood', item: 'orb', pal: 'storm', bg: 'storm' }, {
  tags: ['reveal', 'strike'], set: 'cache_siege', onReveal(b) { for (let i = 0; i < 3; i++) b.strike(i, 3); },
});
C('time_weaver', 'Time Weaver', 4, 3, 'uncommon', 'Sage', 'On Reveal: +2 Energy next turn.', { f: 'hum', hat: 'scholar', item: 'hourglass', pal: 'violet', bg: 'void' }, {
  tags: ['reveal'], set: 'cache_patience', onReveal(b) { b.gainEnergyNext(2); },
});
C('avalanche', 'Avalanche Titan', 6, 8, 'rare', 'Construct', 'On Reveal: Destroy all Junk on your side. +3 power for each.', { f: 'golem', pal: 'frost', bg: 'snow' }, {
  tags: ['reveal'], onReveal(b, bc) { let n = 0; for (const c of b.allCards()) if (c.def.id === 'junk') { b.destroy(c); n++; } if (n) b.buff(bc, 3 * n); },
});

C('scrap_thrower', 'Scrap Thrower', 2, 3, 'common', 'Construct', "On Reveal: Add a Junk to your opponent's side here.", { f: 'robot', pal: 'rust', bg: 'workshop' }, {
  tags: ['reveal', 'junk'], onReveal(b, bc) { b.spawn('junk', bc.lane, 0, b.foe()); },
});
C('ice_sentry', 'Ice Sentry', 3, 4, 'uncommon', 'Construct', 'On Reveal: Freeze a random other lane.', { f: 'golem', pal: 'frost', bg: 'snow' }, {
  tags: ['reveal', 'freeze'], onReveal(b, bc) { b.freeze(b.rng.pick(b.otherLanes(bc.lane))); },
});
C('duelist', 'Duelist', 2, 2, 'common', 'Knight', 'On Reveal: Strike 2 here. If that leaves no enemy card here stronger than this, +2 Power.', { f: 'hum', hat: 'feather', item: 'sword', pal: 'dawn', bg: 'ruins' }, {
  tags: ['reveal', 'strike'], onReveal(b, bc) { b.strike(bc.lane, 2); b.recompute(); if (!b.foesIn(bc.lane).some((c) => b.power(c) > b.power(bc))) b.buff(bc, 2); },
});

// ---------------- Ongoing ----------------
C('lantern_keeper', 'Lantern Keeper', 2, 1, 'common', 'Spirit', 'Ongoing: Your other cards here have +1.', { f: 'ghost', item: 'lantern', pal: 'dawn', bg: 'night' }, {
  tags: ['ongoing'], ongoing(b, bc) { for (const c of others(b, bc)) b.aura(c, 1); },
});
C('war_banner', 'Standard Bearer', 3, 2, 'common', 'Knight', 'Ongoing: Your 1- and 2-cost cards have +1.', { f: 'hum', hat: 'helm', item: 'banner', pal: 'steel', bg: 'field' }, {
  tags: ['ongoing'], ongoing(b, bc) { for (const c of b.allCards()) if (c !== bc && c.def.cost <= 2) b.aura(c, 1); },
});
C('watchtower', 'Watchtower', 3, 3, 'common', 'Construct', 'Ongoing: Enemy cards here have -1 Power.', { f: 'tower', pal: 'wood', bg: 'field' }, {
  tags: ['ongoing'], ongoing(b, bc) { for (const c of b.foesIn(bc.lane)) b.aura(c, -1); },
});
C('bulwark_golem', 'Bulwark Golem', 5, 5, 'rare', 'Construct', "Ongoing: Your cards here can't be destroyed or weakened.", { f: 'golem', pal: 'steel', bg: 'castle' }, {
  tags: ['ongoing'], ongoing(b, bc) { b.lanes[bc.lane].flags.protect = true; },
});
C('grand_choir', 'Grand Choir', 4, 3, 'rare', 'Spirit', 'Ongoing: Your Ongoing cards here have +2.', { f: 'angel', pal: 'gold', bg: 'temple' }, {
  tags: ['ongoing'], ongoing(b, bc) { b.lanes[bc.lane].flags.ongoingBonus += 2; },
});
C('ironroot', 'Ironroot Treant', 4, 2, 'uncommon', 'Spirit', 'Ongoing: +2 power for each other card here.', { f: 'treant', pal: 'forest', bg: 'forest' }, {
  tags: ['ongoing'], ongoing(b, bc) { b.aura(bc, 2 * others(b, bc).length); },
});
C('lone_wolf', 'Lone Wolf', 3, 3, 'common', 'Beast', 'Ongoing: +5 if this is your only card here.', { f: 'wolf', pal: 'shadow', bg: 'snow' }, {
  tags: ['ongoing'], ongoing(b, bc) { if (!others(b, bc).length) b.aura(bc, 5); },
});
C('pack_alpha', 'Pack Alpha', 3, 2, 'uncommon', 'Beast', 'Ongoing: Your other Beasts have +1.', { f: 'wolf', pal: 'ember', bg: 'forest' }, {
  tags: ['ongoing'], ongoing(b, bc) { for (const c of b.allCards()) if (c !== bc && c.def.tribe === 'Beast') b.aura(c, 1); },
});
C('beacon', 'Signal Beacon', 4, 1, 'uncommon', 'Construct', 'Ongoing: Your cards in other lanes have +1.', { f: 'tower', item: 'fire', pal: 'ember', bg: 'night' }, {
  tags: ['ongoing'], ongoing(b, bc) { for (const c of b.allCards()) if (c.lane !== bc.lane) b.aura(c, 1); },
});
C('soulbinder', 'Soulbinder', 4, 2, 'rare', 'Fiend', 'Ongoing: +2 power for each card destroyed this fight.', { f: 'hum', hat: 'horns', item: 'chain', pal: 'shadow', bg: 'grave' }, {
  tags: ['ongoing', 'destroy'], set: 'cache_ash', ongoing(b, bc) { b.aura(bc, 2 * b.destroyedCount); },
});
C('wailing_shade', 'Wailing Shade', 2, 1, 'uncommon', 'Spirit', "Ongoing: +1 power for each card you've discarded this fight.", { f: 'ghost', pal: 'frost', bg: 'grave' }, {
  tags: ['ongoing', 'discard'], set: 'cache_hex', ongoing(b, bc) { b.aura(bc, Math.min(12, b.discardedCount)); },
});
C('gold_golem', 'Gilded Golem', 3, 2, 'uncommon', 'Construct', 'Ongoing: +1 power for every 30 gold you have (max +6).', { f: 'golem', pal: 'gold', bg: 'market' }, {
  tags: ['ongoing'], set: 'cache_gold', ongoing(b, bc) { b.aura(bc, bc.side === 0 ? Math.min(6, Math.floor((b.run.gold || 0) / 30)) : 3); },
});
C('leviathan', 'Abyssal Leviathan', 6, 6, 'legendary', 'Beast', 'Ongoing: Enemy cards here have -2 Power.', { f: 'serpent', pal: 'ocean', bg: 'sea' }, {
  tags: ['ongoing'], set: 'cache_crowns', ongoing(b, bc) { for (const c of b.foesIn(bc.lane)) b.aura(c, -2); },
});
C('siegecrafter', 'Siegecrafter', 3, 3, 'uncommon', 'Construct', 'Ongoing: Your Strikes deal +1.', { f: 'hum', hat: 'goggles', item: 'hammer', pal: 'wood', bg: 'workshop' }, {
  tags: ['ongoing', 'strike'], set: 'cache_siege', ongoing(b) { b.strikeBonus += 1; },
});
C('queen_thorns', 'Queen of Thorns', 5, 5, 'rare', 'Spirit', 'Ongoing: Enemy cards here have -1 Power. End of turn: Strike 2 here.', { f: 'hum', hat: 'crown', item: 'rose', pal: 'forest', bg: 'garden' }, {
  tags: ['ongoing', 'strike'], ongoing(b, bc) { for (const c of b.foesIn(bc.lane)) b.aura(c, -1); }, endTurn(b, bc) { b.strike(bc.lane, 2); },
});
C('scrap_golem', 'Scrap Golem', 3, 2, 'uncommon', 'Construct', 'Ongoing: +2 power for each Junk on your side.', { f: 'golem', pal: 'rust', bg: 'workshop' }, {
  tags: ['ongoing'], ongoing(b, bc) { b.aura(bc, 2 * b.allCards().filter((c) => c.def.id === 'junk').length); },
});
C('crystal_golem', 'Crystal Golem', 4, 5, 'uncommon', 'Construct', 'Ongoing: +3 Power while you have unspent Energy.', { f: 'crystal', pal: 'frost', bg: 'cave' }, {
  tags: ['ongoing'], set: 'cache_patience', ongoing(b, bc) { if (b.energy > 0) b.aura(bc, 3); },
});

// ---------------- End of Turn ----------------
C('mossling', 'Mossling', 1, 1, 'common', 'Spirit', 'End of turn: +1 power.', { f: 'mushroom', pal: 'moss', bg: 'forest' }, {
  tags: ['grow'], endTurn(b, bc) { b.buff(bc, 1); },
});
C('salamander', 'Ember Salamander', 2, 1, 'common', 'Beast', 'End of turn: Strike 1 here.', { f: 'lizard', pal: 'ember', bg: 'fire' }, {
  tags: ['strike'], endTurn(b, bc) { b.strike(bc.lane, 1); },
});
C('hourglass_sage', 'Hourglass Sage', 3, 2, 'common', 'Sage', 'End of turn: Give a random other card here +1.', { f: 'hum', hat: 'scholar', item: 'hourglass', pal: 'dawn', bg: 'temple' }, {
  tags: ['grow'], endTurn(b, bc) { const o = others(b, bc); if (o.length) b.buff(b.rng.pick(o), 1); },
});
C('tide_turtle', 'Tide Turtle', 4, 4, 'common', 'Beast', "End of turn: If you're winning here, +2 power.", { f: 'turtle', pal: 'ocean', bg: 'sea' }, {
  tags: ['grow'], set: 'cache_tide', endTurn(b, bc) { if (b.winning(bc.lane)) b.buff(bc, 2); },
});
C('ballista', 'Ballista', 3, 1, 'uncommon', 'Construct', 'End of turn: Strike 2 here.', { f: 'ballista', pal: 'wood', bg: 'castle' }, {
  tags: ['strike'], set: 'cache_siege', endTurn(b, bc) { b.strike(bc.lane, 2); },
});
C('golden_hen', 'Golden Hen', 1, 1, 'uncommon', 'Beast', 'End of turn: Gain 2 gold.', { f: 'hen', pal: 'gold', bg: 'field' }, {
  set: 'cache_gold', endTurn(b) { b.gold(2); },
});
C('clockwork_squire', 'Clockwork Squire', 1, 2, 'common', 'Construct', 'End of turn: If this lane is full, +2 power.', { f: 'robot', pal: 'steel', bg: 'workshop' }, {
  tags: ['grow'], endTurn(b, bc) { if (b.freeSlots(bc.lane) === 0) b.buff(bc, 2); },
});
C('world_serpent', 'World Serpent', 5, 7, 'legendary', 'Beast', 'End of turn: Strike 1 in every lane.', { f: 'serpent', pal: 'moss', bg: 'void' }, {
  tags: ['strike'], set: 'cache_crowns', endTurn(b) { for (let i = 0; i < 3; i++) b.strike(i, 1); },
});

// ---------------- Move ----------------
C('wind_dancer', 'Wind Dancer', 2, 3, 'common', 'Spirit', 'Move. After this moves, +2 power.', { f: 'hum', hat: 'veil', item: 'fan', pal: 'frost', bg: 'sky' }, {
  tags: ['move'], move: true, set: 'cache_tide', onMoved(b, bc) { b.buff(bc, 2); },
});
C('blink_fox', 'Blink Fox', 1, 2, 'common', 'Beast', 'Move. After this moves, Strike 2 in its new lane.', { f: 'fox', pal: 'ember', bg: 'forest' }, {
  tags: ['move', 'strike'], move: true, set: 'cache_tide', onMoved(b, bc) { b.strike(bc.lane, 2); },
});
C('gale_rider', 'Gale Rider', 4, 4, 'uncommon', 'Knight', 'Move. Whenever one of your cards moves, +1 power.', { f: 'hum', hat: 'helm', item: 'lance', pal: 'storm', bg: 'sky' }, {
  tags: ['move'], move: true, set: 'cache_tide', onAnyMove(b, bc, moved) { b.buff(bc, 1); },
});
C('drift_courier', 'Drift Courier', 2, 2, 'common', 'Sage', 'Move. After this moves, draw a card.', { f: 'hum', hat: 'cap', item: 'satchel', pal: 'ocean', bg: 'sky' }, {
  tags: ['move'], move: true, set: 'cache_tide', onMoved(b) { b.drawCards(1); },
});
C('stormrunner', 'Stormrunner', 3, 3, 'uncommon', 'Knight', 'Move. After this moves, your other cards in its new lane get +1.', { f: 'hum', hat: 'hood', item: 'spear', pal: 'storm', bg: 'storm' }, {
  tags: ['move'], move: true, set: 'cache_tide', onMoved(b, bc) { for (const c of others(b, bc)) b.buff(c, 1); },
});

// ---------------- Destroy ----------------
C('ashling', 'Ashling', 1, 2, 'common', 'Spirit', 'When destroyed: Strike 3 here.', { f: 'wisp', pal: 'ember', bg: 'fire' }, {
  tags: ['destroy', 'strike'], set: 'cache_ash', onDestroyed(b, bc) { b.strike(bc.lane, 3); },
});
C('phoenix_chick', 'Phoenix Chick', 2, 2, 'uncommon', 'Beast', 'When destroyed: Return it to your hand with +2 power.', { f: 'bird', pal: 'ember', bg: 'fire' }, {
  tags: ['destroy'], set: 'cache_ash', onDestroyed(b, bc) { if (!bc.inst || bc.inst.temp) return; const h = b.addToHand(bc.def, bc.inst); if (h) { h.extra = (bc.extra || 0) + 2; bc.returned = true; } },
});
C('cinder_imp', 'Cinder Imp', 1, 3, 'common', 'Fiend', 'When destroyed: Your other cards here get +2.', { f: 'imp', pal: 'ember', bg: 'fire' }, {
  tags: ['destroy'], set: 'cache_ash', onDestroyed(b, bc) { for (const c of b.cardsIn(bc.lane)) b.buff(c, 2); },
});
C('bone_colossus', 'Bone Colossus', 6, 10, 'rare', 'Construct', 'Costs 1 less for each card destroyed this fight.', { f: 'skeleton', pal: 'bone', bg: 'grave' }, {
  tags: ['destroy'], set: 'cache_ash', costFn(b) { return -b.destroyedCount; },
});
C('grave_knight', 'Grave Knight', 3, 4, 'uncommon', 'Knight', 'Ongoing: +2 power for each card destroyed in this lane.', { f: 'hum', hat: 'skullhelm', item: 'sword', pal: 'bone', bg: 'grave' }, {
  tags: ['ongoing', 'destroy'], set: 'cache_ash', ongoing(b, bc) { b.aura(bc, 2 * b.lanes[bc.lane].destroyedHere); },
});
C('abyss_maw', 'Abyss Maw', 5, 4, 'legendary', 'Fiend', 'On Reveal: Destroy your other cards here. +4 power for each.', { f: 'maw', pal: 'shadow', bg: 'void' }, {
  tags: ['reveal', 'destroy'], set: 'cache_crowns', onReveal(b, bc) { let n = 0; for (const c of others(b, bc)) if (b.destroy(c)) n++; b.buff(bc, 4 * n); },
});

// ---------------- Discard / Lingering ----------------
C('hex_scribe', 'Hex Scribe', 2, 2, 'common', 'Sage', 'Lingering: When this is discarded, Strike 2 in a random lane.', { f: 'hum', hat: 'hood', item: 'quill', pal: 'violet', bg: 'library' }, {
  tags: ['discard', 'strike'], set: 'cache_hex', onDiscard(b) { b.strike(b.rng.int(0, 2), 2); },
});
C('ghost_lantern', 'Ghost Lantern', 3, 2, 'uncommon', 'Spirit', 'Lingering: When this is discarded, give a random card of yours on the board +2.', { f: 'ghost', item: 'lantern', pal: 'frost', bg: 'grave' }, {
  tags: ['discard'], set: 'cache_hex', onDiscard(b) { const a = b.allCards(); if (a.length) b.buff(b.rng.pick(a), 2); },
});
C('ember_wisp', 'Ember Wisp', 1, 1, 'common', 'Spirit', 'Lingering: When this is discarded, +1 Energy next turn.', { f: 'wisp', pal: 'violet', bg: 'night' }, {
  tags: ['discard'], set: 'cache_hex', onDiscard(b) { b.gainEnergyNext(1); },
});
C('whisper_rat', 'Whisper Rat', 1, 2, 'common', 'Beast', 'Lingering: When this is discarded, gain 3 gold.', { f: 'rat', pal: 'bone', bg: 'ruins' }, {
  tags: ['discard'], set: 'cache_hex', onDiscard(b) { b.gold(3); },
});

// ---------------- Hold ----------------
C('patient_monk', 'Patient Monk', 2, 1, 'uncommon', 'Sage', '+1 Power for each turn this spent in your hand (max +6).', { f: 'hum', hat: 'bald', item: 'beads', pal: 'dawn', bg: 'temple' }, {
  tags: ['hold'], set: 'cache_patience',
});
C('sleeper_giant', 'Sleeper Giant', 5, 8, 'uncommon', 'Construct', 'Costs 1 less for each turn it spent in your hand.', { f: 'golem', pal: 'moss', bg: 'cave' }, {
  tags: ['hold'], set: 'cache_patience', costFn(b, hc) { return -(hc.age || 0); },
});
C('oathkeeper', 'Oathkeeper', 3, 3, 'uncommon', 'Knight', 'On Reveal: If this spent 2+ turns in your hand, your other cards here get +2.', { f: 'hum', hat: 'greathelm', item: 'greatsword', pal: 'gold', bg: 'temple' }, {
  tags: ['hold', 'reveal'], set: 'cache_patience', onReveal(b, bc) { if (bc.wasHeld) for (const c of others(b, bc)) b.buff(c, 2); },
});

// ---------------- Tribe lords ----------------
C('knight_captain', 'Knight Captain', 3, 3, 'uncommon', 'Knight', 'Ongoing: Your other Knights have +1.', { f: 'hum', hat: 'plume', item: 'sword', pal: 'steel', bg: 'castle' }, {
  tags: ['ongoing'], set: 'cache_tribes', ongoing(b, bc) { for (const c of b.allCards()) if (c !== bc && c.def.tribe === 'Knight') b.aura(c, 1); },
});
C('spirit_caller', 'Spirit Caller', 3, 2, 'uncommon', 'Spirit', 'Ongoing: Your other Spirits here have +2.', { f: 'hum', hat: 'veil', item: 'bell', pal: 'frost', bg: 'temple' }, {
  tags: ['ongoing'], set: 'cache_tribes', ongoing(b, bc) { for (const c of others(b, bc)) if (c.def.tribe === 'Spirit') b.aura(c, 2); },
});
C('cog_marshal', 'Cog Marshal', 3, 3, 'uncommon', 'Construct', 'Ongoing: Your other Constructs have +1.', { f: 'robot', pal: 'gold', bg: 'workshop' }, {
  tags: ['ongoing'], set: 'cache_tribes', ongoing(b, bc) { for (const c of b.allCards()) if (c !== bc && c.def.tribe === 'Construct') b.aura(c, 1); },
});
C('fiend_lord', 'Fiend Lord', 4, 4, 'uncommon', 'Fiend', 'Ongoing: Your other Fiends have +1.', { f: 'brute', hat: 'horns', pal: 'crimson', bg: 'fire' }, {
  tags: ['ongoing'], set: 'cache_tribes', ongoing(b, bc) { for (const c of b.allCards()) if (c !== bc && c.def.tribe === 'Fiend') b.aura(c, 1); },
});
C('sage_elder', 'Sage Elder', 3, 2, 'uncommon', 'Sage', 'Ongoing: Your other Sages have +1.', { f: 'hum', hat: 'wizard', item: 'staff', pal: 'ocean', bg: 'library' }, {
  tags: ['ongoing'], set: 'cache_tribes', ongoing(b, bc) { for (const c of b.allCards()) if (c !== bc && c.def.tribe === 'Sage') b.aura(c, 1); },
});
C('beast_tamer', 'Beast Tamer', 2, 2, 'common', 'Beast', 'On Reveal: Your Beasts in hand cost 1 less.', { f: 'hum', hat: 'bandana', item: 'whip', pal: 'forest', bg: 'field' }, {
  tags: ['reveal'], set: 'cache_tribes', onReveal(b) { for (const h of b.hand) if (h.def.tribe === 'Beast') h.costMod -= 1; },
});

// ---------------- Legendaries ----------------
C('elder_dragon', 'Elder Dragon', 6, 9, 'legendary', 'Beast', 'On Reveal: Strike 4 in every lane.', { f: 'dragon', pal: 'crimson', bg: 'fire' }, {
  tags: ['reveal', 'strike'], set: 'cache_crowns', onReveal(b) { for (let i = 0; i < 3; i++) b.strike(i, 4); },
});
C('sun_titan', 'Sun Titan', 6, 8, 'legendary', 'Knight', 'On Reveal: Your other cards get +2.', { f: 'hum', hat: 'halo', item: 'greatsword', pal: 'gold', bg: 'sky' }, {
  tags: ['reveal'], set: 'cache_crowns', onReveal(b, bc) { for (const c of b.allCards()) if (c !== bc) b.buff(c, 2); },
});
C('void_oracle', 'Void Oracle', 5, 4, 'legendary', 'Sage', 'On Reveal: Draw 3 cards. They cost 1 less.', { f: 'eye', pal: 'violet', bg: 'void' }, {
  tags: ['reveal'], set: 'cache_crowns', onReveal(b) { const before = b.hand.length; b.drawCards(3); for (const h of b.hand.slice(before)) h.costMod -= 1; },
});
C('starlit_unicorn', 'Starlit Unicorn', 4, 4, 'rare', 'Beast', 'Ongoing: Your cards in adjacent lanes have +1.', { f: 'unicorn', pal: 'dawn', bg: 'sky' }, {
  tags: ['ongoing'], set: 'cache_tribes', ongoing(b, bc) { for (const c of b.allCards()) if (b.adjacent(bc.lane).includes(c.lane)) b.aura(c, 1); },
});

// ---------------- Evolutions (created only via Evo recipes) ----------------
const E = (id, name, cost, power, tribe, text, art, opts) => C(id, name, cost, power, 'evolved', tribe, text, art, { evo: true, set: 'evo', ...opts });
E('mountain_king', 'Mountain King', 6, 14, 'Construct', "Ongoing: Your cards here can't be destroyed or weakened, and your other cards here have +1.", { f: 'golem', hat: 'crown', pal: 'gold', bg: 'cave' }, {
  tags: ['ongoing'], ongoing(b, bc) { b.lanes[bc.lane].flags.protect = true; for (const c of others(b, bc)) b.aura(c, 1); },
});
E('storm_archer', 'Storm Archer', 2, 3, 'Knight', 'On Reveal: Strike 4 here. End of turn: Strike 2 here.', { f: 'hum', hat: 'hood', item: 'bow', pal: 'storm', bg: 'storm' }, {
  tags: ['reveal', 'strike'], onReveal(b, bc) { b.strike(bc.lane, 4); }, endTurn(b, bc) { b.strike(bc.lane, 2); },
});
E('sun_lantern', 'Sun Lantern', 2, 2, 'Spirit', 'Ongoing: Your other cards here have +2.', { f: 'ghost', item: 'lantern', pal: 'gold', bg: 'sky' }, {
  tags: ['ongoing'], ongoing(b, bc) { for (const c of others(b, bc)) b.aura(c, 2); },
});
E('world_tree', 'World Tree', 1, 2, 'Spirit', 'End of turn: Your cards here get +1.', { f: 'treant', pal: 'dawn', bg: 'garden' }, {
  tags: ['grow'], endTurn(b, bc) { for (const c of b.cardsIn(bc.lane)) b.buff(c, 1); },
});
E('moon_howler', 'Moon Howler', 3, 4, 'Beast', 'Ongoing: +8 if this is your only card here. Your Beasts in other lanes have +1.', { f: 'wolf', pal: 'frost', bg: 'night' }, {
  tags: ['ongoing'], ongoing(b, bc) { if (!others(b, bc).length) b.aura(bc, 8); for (const c of b.allCards()) if (c.lane !== bc.lane && c.def.tribe === 'Beast') b.aura(c, 1); },
});
E('ashen_phoenix', 'Ashen Phoenix', 2, 3, 'Beast', 'End of turn: Strike 1 here. When destroyed: Return it to your hand with +3 power.', { f: 'bird', pal: 'gold', bg: 'fire' }, {
  tags: ['destroy', 'strike'], endTurn(b, bc) { b.strike(bc.lane, 1); },
  onDestroyed(b, bc) { if (!bc.inst || bc.inst.temp) return; const h = b.addToHand(bc.def, bc.inst); if (h) { h.extra = (bc.extra || 0) + 3; bc.returned = true; } },
});
E('tempest_dancer', 'Tempest Dancer', 3, 4, 'Spirit', 'Move. After this moves, +3 power and Strike 2 in its new lane.', { f: 'hum', hat: 'veil', item: 'fan', pal: 'storm', bg: 'storm' }, {
  tags: ['move', 'strike'], move: true, onMoved(b, bc) { b.buff(bc, 3); b.strike(bc.lane, 2); },
});
E('archmage', 'Archmage', 3, 2, 'Sage', 'On Reveal: Draw 2 cards. The next card you play costs 3 less.', { f: 'hum', hat: 'wizard', item: 'orb', pal: 'violet', bg: 'void' }, {
  tags: ['reveal'], onReveal(b) { b.drawCards(2); b.nextCostReduction = 3; },
});
E('champion', 'Champion', 1, 4, 'Knight', 'On Reveal: Your other cards here get +2.', { f: 'hum', hat: 'plume', item: 'greatsword', pal: 'gold', bg: 'castle' }, {
  tags: ['reveal'], onReveal(b, bc) { for (const c of others(b, bc)) b.buff(c, 2); },
});
E('ash_queen', 'Ash Queen', 3, 3, 'Fiend', 'On Reveal: Discard your hand. For each card discarded, +3 power and Strike 2 here.', { f: 'hum', hat: 'crown', item: 'torch', pal: 'ember', bg: 'fire' }, {
  tags: ['reveal', 'discard'], onReveal(b, bc) { let n = 0; for (const h of b.hand.slice()) { b.discardHandCard(h); n++; } b.buff(bc, 3 * n); for (let i = 0; i < n; i++) b.strike(bc.lane, 2); },
});
E('gilded_dragon', 'Gilded Dragon', 4, 6, 'Beast', 'On Reveal: Strike 3 in every lane. End of turn: Gain 4 gold.', { f: 'dragon', pal: 'gold', bg: 'market' }, {
  tags: ['reveal', 'strike'], onReveal(b) { for (let i = 0; i < 3; i++) b.strike(i, 3); }, endTurn(b) { b.gold(4); },
});
E('doom_trebuchet', 'Doom Trebuchet', 4, 3, 'Construct', 'Ongoing: Your Strikes deal +2. On Reveal: Strike 8 here.', { f: 'catapult', pal: 'shadow', bg: 'storm' }, {
  tags: ['ongoing', 'reveal', 'strike'], ongoing(b) { b.strikeBonus += 2; }, onReveal(b, bc) { b.strike(bc.lane, 8); },
});

export const EVO_RECIPES = [
  { base: 'stone_giant', catalyst: 'guardian', result: 'mountain_king' },
  { base: 'slinger', catalyst: 'ballista', result: 'storm_archer' },
  { base: 'lantern_keeper', catalyst: 'ghost_lantern', result: 'sun_lantern' },
  { base: 'mossling', catalyst: 'ironroot', result: 'world_tree' },
  { base: 'lone_wolf', catalyst: 'pack_alpha', result: 'moon_howler' },
  { base: 'phoenix_chick', catalyst: 'salamander', result: 'ashen_phoenix' },
  { base: 'wind_dancer', catalyst: 'gale_rider', result: 'tempest_dancer' },
  { base: 'scholar', catalyst: 'alchemist', result: 'archmage' },
  { base: 'recruit', catalyst: 'drummer', result: 'champion' },
  { base: 'rag_picker', catalyst: 'bonfire_hag', result: 'ash_queen' },
  { base: 'prospector', catalyst: 'golden_hen', result: 'gilded_dragon' },
  { base: 'catapult', catalyst: 'siegecrafter', result: 'doom_trebuchet' },
];

// ---------------- Tokens ----------------
export const TOKENS = {
  junk: { id: 'junk', name: 'Junk', cost: 0, power: 0, rarity: 'token', tribe: null, text: 'Clutter. Takes up a slot.', art: { f: 'junk', pal: 'rust', bg: 'workshop' }, tags: ['junk'], token: true },
  broodling: { id: 'broodling', name: 'Broodling', cost: 0, power: 2, rarity: 'token', tribe: 'Beast', text: 'Hatched by the Brood Mother.', art: { f: 'spider', pal: 'violet', bg: 'cave' }, tags: [], token: true },
  twin: { id: 'twin', name: 'Twin', cost: 0, power: 2, rarity: 'token', tribe: 'Knight', text: 'A summoned double.', art: { f: 'hum', hat: 'bandana', item: 'daggers', pal: 'shadow', bg: 'ruins' }, tags: [], token: true },
};

// Patient Monk bonus is applied in place(): handled via basePowerOf hook below.
export const CARDS = Object.fromEntries(L.map((c) => [c.id, c]));
export const CARD_LIST = L;
export function cardDef(id) { return CARDS[id] || TOKENS[id]; }

export const RARITY_WEIGHT = { common: 60, uncommon: 30, rare: 9, legendary: 3 };
export const RARITY_COLOR = { common: '#9aa3b2', uncommon: '#4fc3a1', rare: '#5aa0ff', legendary: '#ffb547', evolved: '#ff5fd2', token: '#777' };
