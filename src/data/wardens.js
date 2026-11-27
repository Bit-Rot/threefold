// Wardens: playable characters with a starter deck and a passive.
export const WARDENS = {
  bastion: {
    id: 'bastion', name: 'Bastion', title: 'the Shieldwall', color: '#e0b04a',
    text: 'Your first Ongoing card each fight gets +3 Power.',
    deck: ['recruit', 'sprite', 'spearman', 'lantern_keeper', 'twin_blades', 'guardian', 'drummer', 'watchtower', 'hill_ogre', 'banner_knight', 'bulwark_golem', 'stone_giant'],
    relic: 'home_totem',
    art: { f: 'hum', hat: 'greathelm', item: 'shield', pal: 'gold', bg: 'castle' },
    onPlay(b, bc) { if (!b.flags.bastion && (bc.def.tags || []).includes('ongoing')) { b.flags.bastion = true; b.buff(bc, 3); } },
  },
  tidecaller: {
    id: 'tidecaller', name: 'Mira', title: 'the Tidecaller', color: '#4fc3e0', unlock: 'warden_tide',
    text: 'The first card you Move each turn gets +2 Power and Strikes 1 in its new lane.',
    deck: ['blink_fox', 'recruit', 'wind_dancer', 'drift_courier', 'spearman', 'riptide_siren', 'stormrunner', 'guardian', 'tide_turtle', 'gale_rider', 'hill_ogre', 'stone_giant'],
    relic: 'lodestone',
    art: { f: 'mermaid', pal: 'ocean', bg: 'sea' },
    onAnyMove(b, bc) { const k = 'tide' + b.turn; if (!b.flags[k]) { b.flags[k] = true; b.buff(bc, 2); b.strike(bc.lane, 1); } },
  },
  pyre: {
    id: 'pyre', name: 'Ashka', title: 'the Pyre-Saint', color: '#ff6a3d', unlock: 'warden_pyre',
    text: 'Whenever one of your cards is destroyed, Strike 2 in its lane and gain 2 gold.',
    deck: ['ashling', 'cinder_imp', 'recruit', 'pyre_priest', 'spearman', 'twin_blades', 'gravedigger', 'grave_knight', 'guardian', 'soulbinder', 'hill_ogre', 'bone_colossus'],
    relic: 'grave_lily',
    art: { f: 'hum', hat: 'mitre', item: 'torch', pal: 'ember', bg: 'fire' },
    onAnyDestroyed(b, bc) { if (bc.token) return; b.strike(bc.lane, 2); b.gold(2); },
  },
  hexwright: {
    id: 'hexwright', name: 'Vesk', title: 'the Hexwright', color: '#b07dff', unlock: 'warden_hex',
    text: 'Start each fight with 1 extra card. Whenever an effect discards one of your cards, Strike 1 in a random lane.',
    deck: ['ember_wisp', 'rag_picker', 'hex_scribe', 'scholar', 'wailing_shade', 'spearman', 'ghost_lantern', 'guardian', 'drummer', 'bonfire_hag', 'hill_ogre', 'stone_giant'],
    relic: 'rag_doll',
    art: { f: 'hum', hat: 'witch', item: 'quill', pal: 'violet', bg: 'library' },
    startCards: 1,
    onDiscard(b) { b.strike(b.rng.int(0, 2), 1); },
  },
  forgemaster: {
    id: 'forgemaster', name: 'Brannoc', title: 'the Forgemaster', color: '#c9c9d6', unlock: 'warden_forge',
    text: 'Your gemmed cards have +1 Power.',
    deck: ['recruit', 'clockwork_squire', 'spearman', 'forge_guard', 'slinger', 'guardian', 'siegecrafter', 'watchtower', 'catapult', 'hill_ogre', 'bulwark_golem', 'stone_giant'],
    relic: 'whetstone',
    art: { f: 'hum', hat: 'goggles', item: 'hammer', pal: 'steel', bg: 'workshop' },
    ongoing(b) { for (const c of b.allCards()) if ((c.inst?.sockets || []).some(Boolean)) b.aura(c, 1); },
  },
};
export const WARDEN_LIST = Object.values(WARDENS);
