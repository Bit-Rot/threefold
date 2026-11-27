export const STARTER_DECKS = {
  bastion: {
    id: 'bastion', name: 'Shieldwall', color: '#e0b04a', cover: 'bulwark_golem',
    text: 'Fill a lane with allies and protect your buffs with Bulwark Golem.',
    cards: ['recruit', 'sprite', 'spearman', 'lantern_keeper', 'twin_blades', 'guardian', 'drummer', 'watchtower', 'hill_ogre', 'banner_knight', 'bulwark_golem', 'stone_giant'],
  },
  tidecaller: {
    id: 'tidecaller', name: 'Tidecaller', color: '#4fc3e0', cover: 'riptide_siren',
    text: 'Move cards between lanes to build Power and swing contested lanes.',
    cards: ['blink_fox', 'recruit', 'wind_dancer', 'drift_courier', 'spearman', 'riptide_siren', 'stormrunner', 'guardian', 'tide_turtle', 'gale_rider', 'hill_ogre', 'stone_giant'],
  },
  pyre: {
    id: 'pyre', name: 'Pyre', color: '#ff6a3d', cover: 'pyre_priest',
    text: 'Sacrifice your own cards to trigger effects and grow Soulbinder.',
    cards: ['ashling', 'cinder_imp', 'recruit', 'pyre_priest', 'spearman', 'twin_blades', 'gravedigger', 'grave_knight', 'guardian', 'soulbinder', 'hill_ogre', 'bone_colossus'],
  },
  hexwright: {
    id: 'hexwright', name: 'Hexcraft', color: '#b07dff', cover: 'bonfire_hag',
    text: 'Discard cards to trigger Lingering effects and weaken your opponent.',
    cards: ['ember_wisp', 'rag_picker', 'hex_scribe', 'scholar', 'wailing_shade', 'spearman', 'ghost_lantern', 'guardian', 'drummer', 'bonfire_hag', 'hill_ogre', 'stone_giant'],
  },
  forgemaster: {
    id: 'forgemaster', name: 'Siege', color: '#c9c9d6', cover: 'catapult',
    text: 'Group Constructs and amplify your Strikes with Siegecrafter.',
    cards: ['recruit', 'clockwork_squire', 'spearman', 'forge_guard', 'slinger', 'guardian', 'siegecrafter', 'watchtower', 'catapult', 'hill_ogre', 'bulwark_golem', 'stone_giant'],
  },
};

export const STARTER_DECK_LIST = Object.values(STARTER_DECKS);
