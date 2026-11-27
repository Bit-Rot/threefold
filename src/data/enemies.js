// Opponents: AI players with their own 12-card decks, a play style and sometimes a passive.
// portrait = key for the enemy portrait painter.
const O = {};
function opp(id, name, title, portrait, tier, acts, deck, extra = {}) { O[id] = { id, name, title, portrait, tier, acts, deck, ...extra }; }

// ---- Act 1 ----
opp('goblin_raiders', 'Goblin Raiders', 'Cheap and many', 'march', 'basic', [1, 2],
  ['recruit', 'recruit', 'sprite', 'arbalest', 'spearman', 'spearman', 'twin_blades', 'cinder_imp', 'drummer', 'slinger', 'hill_ogre', 'banner_knight'],
  { style: { aggro: true }, text: 'Floods the board with cheap cards.' });
opp('drum_cult', 'The Drum Cult', 'Beat, buff, repeat', 'metronome', 'basic', [1, 2],
  ['recruit', 'recruit', 'lantern_keeper', 'war_banner', 'hearth_cook', 'drummer', 'drummer', 'guardian', 'hill_ogre', 'banner_knight', 'mossling', 'stone_giant'],
  { style: { ongoing: 2 }, text: 'Stacks buffs on a wide board.' });
opp('moonwatch', 'Moonwatch Owls', 'Slow and patient', 'nightfall', 'basic', [1, 2],
  ['sprite', 'mossling', 'lamplighter', 'lantern_keeper', 'spearman', 'frost_witch', 'starfall_owl', 'hourglass_sage', 'guardian', 'ironroot', 'hill_ogre', 'stone_giant'],
  { text: 'Freezes a lane, then grows.' });
opp('tide_serpents', 'Tide Serpents', 'Shifting currents', 'tide', 'basic', [1, 2],
  ['blink_fox', 'recruit', 'wind_dancer', 'drift_courier', 'salamander', 'spearman', 'riptide_siren', 'guardian', 'lone_wolf', 'tide_turtle', 'gale_rider', 'hill_ogre'],
  { text: 'Moves cards around to steal lanes.' });
opp('magpie', 'Magpie Hoard', 'Greedy collectors', 'hoarder', 'basic', [1, 2],
  ['recruit', 'golden_hen', 'prospector', 'scholar', 'alchemist', 'twin_blades', 'spearman', 'mimic', 'guardian', 'gold_golem', 'hill_ogre', 'merchant'],
  { text: 'Draws deep and copies your best card.' });
opp('soot_works', 'Soot Works', 'Clanking machinery', 'factory', 'basic', [1, 2, 3],
  ['clockwork_squire', 'clockwork_squire', 'scrap_thrower', 'tinker', 'spearman', 'watchtower', 'scrap_golem', 'guardian', 'cog_marshal', 'catapult', 'hill_ogre', 'stone_giant'],
  { text: 'Throws Junk into your lanes.' });
// ---- Act 2–3 ----
opp('siege_crew', 'Siege Crew', 'Artillery corps', 'siege', 'basic', [2, 3],
  ['arbalest', 'arbalest', 'slinger', 'saboteur', 'ballista', 'siegecrafter', 'guardian', 'catapult', 'hill_ogre', 'thunder_hawk', 'storm_caller', 'stone_giant'],
  { text: 'Strikes your strongest cards.' });
opp('marsh_leech', 'Marsh Leeches', 'Feed on the fallen', 'leech', 'basic', [2, 3],
  ['ashling', 'cinder_imp', 'rag_picker', 'pyre_priest', 'spearman', 'gravedigger', 'grave_knight', 'guardian', 'soulbinder', 'hill_ogre', 'bone_colossus', 'abyss_maw'],
  { text: 'Destroys its own cards for power.' });
opp('patron_court', "The Patron's Court", 'Old money', 'commission', 'basic', [2, 3],
  ['sprite', 'lantern_keeper', 'war_banner', 'knight_captain', 'drummer', 'guardian', 'grand_choir', 'banner_knight', 'beacon', 'bulwark_golem', 'queen_thorns', 'sun_titan'],
  { style: { ongoing: 3 }, text: 'Ongoing cards that protect each other.' });
opp('hex_coven', 'Hex Coven', 'Whispers and ash', 'reel', 'basic', [2, 3],
  ['ember_wisp', 'hex_scribe', 'rag_picker', 'whisper_rat', 'wailing_shade', 'scholar', 'ghost_lantern', 'drummer', 'bonfire_hag', 'hill_ogre', 'void_oracle', 'stone_giant'],
  { text: 'Discards for value.' });
opp('scrap_hauler', 'Scrap Haulers', 'Garbage gang', 'junkline', 'basic', [3],
  ['scrap_thrower', 'scrap_thrower', 'scrap_thrower', 'tinker', 'clockwork_squire', 'scrap_golem', 'scrap_golem', 'guardian', 'catapult', 'hill_ogre', 'avalanche', 'stone_giant'],
  { text: 'Buries your lanes in Junk.' });

// ---- Elites (stronger decks + a passive) ----
opp('elite_ram', 'Siege Ram', 'Elite', 'siege', 'elite', [1, 2, 3],
  ['arbalest', 'slinger', 'saboteur', 'siegecrafter', 'ballista', 'guardian', 'catapult', 'thunder_hawk', 'hill_ogre', 'storm_caller', 'doom_trebuchet', 'stone_giant'],
  { text: 'Passive: its Strikes deal +1.', ongoing(b) { b.strikeBonus += 1; } });
opp('elite_bandit', 'Bandit Engine', 'Elite', 'reel', 'elite', [1, 2, 3],
  ['prospector', 'golden_hen', 'alchemist', 'scholar', 'mimic', 'echo_bard', 'guardian', 'merchant', 'hill_ogre', 'gilded_dragon', 'sun_titan', 'stone_giant'],
  { text: 'Passive: draws an extra card each turn.', turnStart(b) { if (b.turn > 1) b.drawCards(1); } });
opp('elite_hauler', 'Scrap Colossus', 'Elite', 'junkline', 'elite', [2, 3],
  ['scrap_thrower', 'scrap_thrower', 'tinker', 'clockwork_squire', 'scrap_golem', 'cog_marshal', 'guardian', 'catapult', 'avalanche', 'bulwark_golem', 'mountain_king', 'stone_giant'],
  { text: 'Passive: start of fight, a Junk appears on your side of every lane.', battleStart(b) { for (let i = 0; i < 3; i++) b.spawn('junk', i, 0, 0); } });
opp('elite_leech', 'Leech Queen', 'Elite', 'leech', 'elite', [2, 3],
  ['ashling', 'ashling', 'cinder_imp', 'pyre_priest', 'gravedigger', 'grave_knight', 'phoenix_chick', 'soulbinder', 'hill_ogre', 'bone_colossus', 'abyss_maw', 'ashen_phoenix'],
  { text: 'Passive: end of turn, drains 1 Power from your strongest card.', endTurn(b) { const c = b.allCards(0).sort((a, d) => b.power(d) - b.power(a))[0]; if (c) b.buff(c, -1); } });
opp('elite_patron', 'The Patron', 'Elite', 'commission', 'elite', [2, 3],
  ['lantern_keeper', 'sprite', 'war_banner', 'knight_captain', 'grand_choir', 'guardian', 'beacon', 'banner_knight', 'bulwark_golem', 'queen_thorns', 'sun_lantern', 'sun_titan'],
  { text: 'Passive: its Ongoing cards have +1 Power.', ongoing(b) { for (const l of b.lanes) l.flags.ongoingBonus += 1; } });

// ---- Bosses ----
opp('boss_conductor', 'The Conductor', 'Act I Boss', 'baton', 'boss', [1],
  ['recruit', 'sprite', 'drummer', 'drummer', 'lantern_keeper', 'war_banner', 'guardian', 'banner_knight', 'hill_ogre', 'grand_choir', 'bulwark_golem', 'stone_giant'],
  { boss: 'conductor' });
opp('boss_brood', 'Brood Mother', 'Act II Boss', 'brood', 'boss', [2],
  ['blink_fox', 'cinder_imp', 'pack_alpha', 'lone_wolf', 'beast_tamer', 'salamander', 'thunder_hawk', 'tide_turtle', 'hill_ogre', 'starlit_unicorn', 'moon_howler', 'elder_dragon'],
  { boss: 'brood' });
opp('boss_engine', 'The Grand Engine', 'Act III Boss', 'engine', 'boss', [3],
  ['clockwork_squire', 'tinker', 'siegecrafter', 'cog_marshal', 'scrap_golem', 'catapult', 'crystal_golem', 'bulwark_golem', 'avalanche', 'doom_trebuchet', 'mountain_king', 'stone_giant'],
  { boss: 'engine' });

export const OPPONENTS = O;

export const BOSSES = {
  conductor: {
    id: 'conductor', name: 'The Conductor', act: 1,
    text: 'You may play at most 2 cards per turn. Each turn the crescendo lane is marked: the Conductor\'s cards there get +2.',
    turnStart(b) { b.flags.cresc = (b.turn + (b.flags.crescOff ??= b.rng.int(0, 2))) % 3; },
    canPlay(b) { return b.S[0].playedThisTurn.length >= 2 ? 'The Conductor allows only 2 cards per turn' : null; },
    ongoing(b) { const l = b.flags.cresc; if (l != null) for (const c of b.cardsIn(l, 1)) b.aura(c, 2); },
  },
  brood: {
    id: 'brood', name: 'Brood Mother', act: 2,
    text: 'End of every other turn, a 2-Power Broodling hatches in a random lane on her side.',
    endTurn(b) { if (b.turn % 2) return; const lanes = [0, 1, 2].filter((i) => b.freeSlots(i, 1) > 0); if (lanes.length) b.spawn('broodling', b.rng.pick(lanes), 0, 1); },
  },
  engine: {
    id: 'engine', name: 'The Grand Engine', act: 3, extraTurns: 1,
    text: 'A 7-turn fight. The Engine gains +1 Energy every turn.',
    turnStart(b) { b.S[1].energy += 1; },
  },
};

export const ACT_POOLS = {
  1: { basic: Object.values(O).filter((o) => o.tier === 'basic' && o.acts.includes(1)).map((o) => o.id), elite: Object.values(O).filter((o) => o.tier === 'elite' && o.acts.includes(1)).map((o) => o.id) },
  2: { basic: Object.values(O).filter((o) => o.tier === 'basic' && o.acts.includes(2)).map((o) => o.id), elite: Object.values(O).filter((o) => o.tier === 'elite' && o.acts.includes(2)).map((o) => o.id) },
  3: { basic: Object.values(O).filter((o) => o.tier === 'basic' && o.acts.includes(3)).map((o) => o.id), elite: Object.values(O).filter((o) => o.tier === 'elite' && o.acts.includes(3)).map((o) => o.id) },
};
export const BOSS_BY_ACT = { 1: 'boss_conductor', 2: 'boss_brood', 3: 'boss_engine' };
