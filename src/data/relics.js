// Relics: passive run modifiers. icon = painter glyph key, rarity drives shop price.
const R = [];
function relic(id, name, rarity, text, icon, hooks = {}) { R.push({ id, name, rarity, text, icon, ...hooks }); }
const tribeRelic = (id, name, tribe, icon) => relic(id, name, 'common', `Your ${tribe}s have +1 Power.`, icon, {
  unlock: 'relics_tribes',
  ongoing(b) { for (const c of b.allCards()) if (c.def.tribe === tribe) b.aura(c, 1); },
});

relic('lucky_coin', 'Lucky Coin', 'common', '+15% gold from fights.', 'coin', { goldMult: 0.15 });
relic('satchel', 'Spare Satchel', 'uncommon', 'Start each fight with 1 extra card in hand.', 'bag', { startCards: 1 });
relic('kindling', 'Kindling', 'common', 'Turn 1: +1 Energy.', 'flame', { turnStart(b) { if (b.turn === 1) b.gainEnergy(1); } });
relic('hourglass', 'Last Light', 'uncommon', 'Final turn: +2 Energy.', 'hourglass', { turnStart(b) { if (b.turn === b.maxTurns) b.gainEnergy(2); } });
relic('whetstone', 'Whetstone', 'common', 'Your Strikes deal +1.', 'blade', { strikeBonus: 1 });
relic('war_horn', 'War Horn', 'uncommon', 'The first card you play each fight costs 0.', 'horn', {
  costMod(b, hc) { return b.S[0].cardsPlayedTotal === 0 ? -99 : 0; },
});
relic('second_wind', 'Second Wind', 'rare', 'The first fight you lose each act costs no heart.', 'feather');
relic('crown_thirds', 'Crown of Thirds', 'uncommon', 'Win all 3 lanes: +25 gold.', 'crown', {
  battleEnd(b, r) { if (r.lanesWon === 3) r.gold += 25; },
});
relic('anchor_stone', 'Anchor Stone', 'common', 'Your 4+ cost cards have +1 Power.', 'anchor', {
  ongoing(b) { for (const c of b.allCards()) if (c.def.cost >= 4) b.aura(c, 1); },
});
relic('feather_charm', 'Feather Charm', 'common', 'Cards played on turns 1–2 get +1 Power.', 'feather', {
  onPlay(b, bc) { if (b.turn <= 2) b.buff(bc, 1, true); },
});
relic('patience_stone', 'Patience Stone', 'uncommon', 'From turn 3 onward, your first card each turn costs 1 less.', 'stone', { costMod(b) { return b.turn >= 3 && !b.playedThisTurn.length ? -1 : 0; } });
relic('bone_charm', 'Bone Charm', 'uncommon', 'When one of your cards is destroyed, +1 Energy next turn (max 2 per turn).', 'skull', {
  onAnyDestroyed(b, bc) { if (bc.token) return; const k = 'bone' + b.turn; b.flags[k] = (b.flags[k] || 0) + 1; if (b.flags[k] <= 2) b.gainEnergyNext(1); },
});
relic('ember_heart', 'Ember Heart', 'common', 'End of turn: Strike 1 in a random lane.', 'heart', { endTurn(b) { b.strike(b.rng.int(0, 2), 1); } });
relic('iron_banner', 'Iron Banner', 'uncommon', 'Your Ongoing cards have +1 Power.', 'banner', {
  ongoing(b) { for (const l of b.lanes) l.flags.ongoingBonus += 1; },
});
relic('scroll_case', 'Scroll Case', 'common', 'Draw 1 extra card on turn 2.', 'scroll', { turnStart(b) { if (b.turn === 1) b.drawNextTurn(); } });
relic('deep_pockets', 'Deep Pockets', 'rare', 'Draw 1 extra card each turn.', 'bag', { drawBonus: 1, unlock: 'relics_rare' });
relic('star_map', 'Star Map', 'uncommon', 'Card rewards offer 4 choices.', 'map', { rewardBonus: 1 });
relic('ledger', "Merchant's Ledger", 'common', 'Shop prices are 20% lower.', 'book', { shopDiscount: 0.2 });
relic('ice_shard', 'Ice Shard', 'uncommon', "Turn 1: your opponent can't play cards in a random lane.", 'crystal', { battleStart(b) { b.freeze(b.rng.int(0, 2)); } });
relic('phoenix_feather', 'Phoenix Feather', 'rare', 'The first of your cards destroyed each fight returns to next turn’s hand if a bonus slot is free.', 'feather', {
  unlock: 'relics_rare',
  onAnyDestroyed(b, bc) { if (bc.token || b.flags.pf || !bc.inst || bc.inst.temp) return; b.flags.pf = true; if (!bc.returned && b.queueCard(bc.def, bc.inst)) bc.returned = true; },
});
relic('tidal_compass', 'Tidal Compass', 'uncommon', 'Once per turn, you may Move any card.', 'compass', { freeMovePerTurn: true, unlock: 'relics_tide' });
relic('lodestone', 'Lodestone', 'common', 'Whenever one of your cards moves, it gets +1 Power.', 'magnet', { onAnyMove(b, bc) { b.buff(bc, 1); }, unlock: 'relics_tide' });
relic('home_totem', 'Hearth Totem', 'common', 'Your cards in your Home lane have +1 Power.', 'totem', {
  ongoing(b) { for (const c of b.cardsIn(1)) b.aura(c, 1); },
});
relic('bloodstone', 'Bloodstone', 'rare', '+1 max heart (gained when picked up).', 'heart', { onGain(run) { run.maxHearts++; run.hearts++; } });
relic('ember_crown', 'Ember Crown', 'rare', 'Start of turn 4: Strike 3 in every lane.', 'crown', { turnStart(b) { if (b.turn === 4) for (let i = 0; i < 3; i++) b.strike(i, 3); } });
relic('rag_doll', 'Rag Doll', 'uncommon', 'Whenever an effect discards one of your cards, give a random ally on the board +1 Power.', 'doll', {
  unlock: 'relics_hex', onDiscard(b) { const a = b.allCards(); if (a.length) b.buff(b.rng.pick(a), 1, true); },
});
relic('echo_shell', 'Echo Shell', 'rare', 'The first On Reveal you play each turn triggers twice.', 'shell', { echoFirstPerTurn: true, unlock: 'relics_rare' });
relic('sharp_arrow', 'Fletching', 'common', 'Your 1-cost cards have +1 Power.', 'arrow', {
  ongoing(b) { for (const c of b.allCards()) if (c.def.cost === 1) b.aura(c, 1); },
});
relic('quiet_bell', 'Quiet Bell', 'uncommon', 'Your opponent starts each fight with 1 fewer card in hand.', 'bell', { enemyStartMinus: 1 });
relic('overflow_urn', 'Overflow Urn', 'rare', 'Unspent Energy carries over to next turn (up to 2).', 'urn', { bank: 2, unlock: 'relics_rare' });
relic('ox_yoke', 'Ox Yoke', 'rare', 'Your outer lanes have +1 slot.', 'yoke', { outerCap: 1 });
relic('sanctum_key', 'Sanctum Key', 'uncommon', 'Heal 1 heart after defeating a boss.', 'key', { afterBoss(run) { run.hearts = Math.min(run.maxHearts, run.hearts + 1); } });
relic('grave_lily', 'Grave Lily', 'uncommon', 'When one of your cards is destroyed, your other cards in that lane get +1.', 'flower', {
  unlock: 'relics_ash', onAnyDestroyed(b, bc) { for (const c of b.cardsIn(bc.lane)) b.buff(c, 1, true); },
});
relic('pyre_brand', 'Pyre Brand', 'uncommon', 'When one of your cards is destroyed, Strike 2 in its lane.', 'flame', {
  unlock: 'relics_ash', onAnyDestroyed(b, bc) { if (!bc.token) b.strike(bc.lane, 2); },
});
relic('gold_tooth', 'Gold Tooth', 'common', 'Win a fight: +8 gold.', 'coin', { battleEnd(b, r) { if (r.won) r.gold += 8; } });
relic('cartographer', "Cartographer's Pen", 'uncommon', 'Gain 15 gold whenever you enter a new act.', 'map', { onAct(run) { run.gold += 15; } });
relic('lucky_die', 'Loaded Die', 'uncommon', 'Shops have 1 extra card for sale.', 'die', { shopBonus: 1 });
relic('thorn_ring', 'Thorn Ring', 'uncommon', 'The first card you play in each lane each fight gets +2.', 'ring', {
  onPlay(b, bc) { const k = 'thorn' + bc.lane; if (!b.flags[k]) { b.flags[k] = true; b.buff(bc, 2, true); } },
});
tribeRelic('knight_sigil', 'Knight Sigil', 'Knight', 'shield');
tribeRelic('beast_fang', 'Beast Fang', 'Beast', 'fang');
tribeRelic('spirit_bell', 'Spirit Bell', 'Spirit', 'bell');
tribeRelic('cog_heart', 'Cog Heart', 'Construct', 'cog');
tribeRelic('fiend_horn', 'Fiend Horn', 'Fiend', 'horn');
tribeRelic('sage_quill', 'Sage Quill', 'Sage', 'quill');

export const RELICS = Object.fromEntries(R.map((r) => [r.id, r]));
export const RELIC_LIST = R;
export const RELIC_PRICE = { common: 110, uncommon: 150, rare: 200 };
