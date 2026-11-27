// Meta progression: the Archive. Unlocks add options for future runs.
export const UNLOCKS = [
  // Card caches
  { id: 'cache_siege', kind: 'Cards', name: 'Siege Cache', desc: '6 Strike cards: Catapult Crew, Ballista, Siegecrafter, Storm Caller, Saboteur, Arbalest.', cost: 30 },
  { id: 'cache_patience', kind: 'Cards', name: 'Patience Cache', desc: '5 cards that reward timing and Energy management.', cost: 30 },
  { id: 'cache_tribes', kind: 'Cards', name: 'Banner Cache', desc: '7 tribe lords and allies: Knight Captain, Spirit Caller, Cog Marshal, Fiend Lord, Sage Elder, Beast Tamer, Starlit Unicorn.', cost: 35 },
  { id: 'cache_gold', kind: 'Cards', name: 'Gilded Cache', desc: '3 greedy cards: Merchant Prince, Gilded Golem, Golden Hen.', cost: 25 },
  { id: 'cache_crowns', kind: 'Cards', name: 'Crown Cache', desc: '6 legendaries: Elder Dragon, Sun Titan, Abyssal Leviathan, Void Oracle, World Serpent, Abyss Maw.', cost: 90, requires: 'cache_tribes' },
  { id: 'cache_tide', kind: 'Cards', name: 'Tide Cache', desc: 'Adds Move cards to reward and shop pools.', cost: 35 },
  { id: 'cache_ash', kind: 'Cards', name: 'Ash Cache', desc: 'Adds Destroy cards to reward and shop pools.', cost: 35 },
  { id: 'cache_hex', kind: 'Cards', name: 'Hex Cache', desc: 'Adds Discard cards to reward and shop pools.', cost: 35 },
  // Gems
  { id: 'gem_echo', kind: 'Gems', name: 'Echo Gem', desc: 'Adds the Echo Gem (On Reveal triggers twice) to Gem nodes and shops.', cost: 25 },
  { id: 'gem_bulwark', kind: 'Gems', name: 'Bulwark Gem', desc: "Adds the Bulwark Gem (can't be destroyed or weakened).", cost: 20 },
  { id: 'gem_drift', kind: 'Gems', name: 'Drift Gem', desc: 'Adds the Drift Gem (gains Move).', cost: 20 },
  { id: 'gem_surge', kind: 'Gems', name: 'Surge Gem', desc: 'Adds the Surge Gem (+4 when played on turn 5+).', cost: 20 },
  { id: 'gem_root', kind: 'Gems', name: 'Root Gem', desc: 'Adds the Root Gem (grows +1 each turn).', cost: 25 },
  { id: 'gem_frost', kind: 'Gems', name: 'Frost Gem', desc: 'Adds the Frost Gem (On Reveal: Freeze).', cost: 30 },
  // Relics
  { id: 'relics_tribes', kind: 'Relics', name: 'Tribal Relics', desc: '6 tribe relics: +1 Power for Knights, Beasts, Spirits, Constructs, Fiends or Sages.', cost: 30 },
  { id: 'relics_rare', kind: 'Relics', name: 'Rare Relics', desc: 'Deep Pockets, Phoenix Feather, Echo Shell, Overflow Urn.', cost: 60 },
  { id: 'relics_tide', kind: 'Relics', name: 'Tide Relics', desc: 'Tidal Compass, Lodestone.', cost: 25 },
  { id: 'relics_ash', kind: 'Relics', name: 'Ash Relics', desc: 'Grave Lily, Pyre Brand.', cost: 25 },
  { id: 'relics_hex', kind: 'Relics', name: 'Hex Relics', desc: 'Rag Doll.', cost: 15 },
  // Locations
  { id: 'locs_tide', kind: 'Locations', name: 'Riverbank', desc: 'Adds the Riverbank location.', cost: 15 },
  { id: 'locs_mystic', kind: 'Locations', name: 'Mystic Sites', desc: 'Adds Star Altar, Junkyard and Mirror Pool.', cost: 30 },
  // Perks (options, not raw power)
  { id: 'perk_reroll', kind: 'Perks', name: 'Reroll', desc: 'Once per run, reroll a card reward.', cost: 20 },
  { id: 'perk_reroll2', kind: 'Perks', name: 'Reroll II', desc: '+2 more rerolls per run.', cost: 45, requires: 'perk_reroll' },
  { id: 'perk_skip', kind: 'Perks', name: 'Skip', desc: 'You may skip a forced card pick (+10 gold instead).', cost: 35 },
  { id: 'perk_banish', kind: 'Perks', name: 'Banish', desc: 'Twice per run, banish a card from reward pools for the rest of the run.', cost: 30 },
  { id: 'perk_scout', kind: 'Perks', name: 'Scouting', desc: 'Map nodes show the enemy lineup and locations of upcoming fights.', cost: 15 },
];
export const UNLOCK_MAP = Object.fromEntries(UNLOCKS.map((u) => [u.id, u]));

export const HEAT = [
  { lvl: 1, text: 'Opponents start with 1 extra card in hand.' },
  { lvl: 2, text: 'Shops cost 15% more.' },
  { lvl: 4, text: 'Start with a Junk in your deck.' },
  { lvl: 5, text: "Bosses' cards have +1 Power." },
  { lvl: 6, text: 'Card rewards offer one fewer choice.' },
  { lvl: 7, text: 'Start with 1 fewer heart.' },
  { lvl: 8, text: "All opponents' cards have +1 Power." },
];
