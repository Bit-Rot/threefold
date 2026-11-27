// Wardens: playable characters with a starter deck and a passive.
export const WARDENS = {
  bastion: {
    id: 'bastion', name: 'Bastion', title: 'the Shieldwall', color: '#e0b04a',
    text: 'Your first Ongoing card each fight gets +3 Power.',
    deck: ['recruit', 'recruit', 'recruit', 'recruit', 'spearman', 'spearman', 'spearman', 'guardian', 'guardian', 'lantern_keeper', 'watchtower', 'drummer'],
    relic: 'home_totem',
    art: { f: 'hum', hat: 'greathelm', item: 'shield', pal: 'gold', bg: 'castle' },
    onPlay(b, bc) { if (!b.flags.bastion && (bc.def.tags || []).includes('ongoing')) { b.flags.bastion = true; b.buff(bc, 3); } },
  },
  tidecaller: {
    id: 'tidecaller', name: 'Mira', title: 'the Tidecaller', color: '#4fc3e0', unlock: 'warden_tide',
    text: 'The first card you Move each turn gets +2 Power and Strikes 1 in its new lane.',
    deck: ['recruit', 'recruit', 'recruit', 'spearman', 'spearman', 'guardian', 'wind_dancer', 'wind_dancer', 'blink_fox', 'drift_courier', 'riptide_siren', 'tide_turtle'],
    relic: 'lodestone',
    art: { f: 'mermaid', pal: 'ocean', bg: 'sea' },
    onAnyMove(b, bc) { const k = 'tide' + b.turn; if (!b.flags[k]) { b.flags[k] = true; b.buff(bc, 2); b.strike(bc.lane, 1); } },
  },
  pyre: {
    id: 'pyre', name: 'Ashka', title: 'the Pyre-Saint', color: '#ff6a3d', unlock: 'warden_pyre',
    text: 'Whenever one of your cards is destroyed, Strike 2 in its lane and gain 2 gold.',
    deck: ['recruit', 'recruit', 'recruit', 'spearman', 'spearman', 'guardian', 'ashling', 'ashling', 'cinder_imp', 'pyre_priest', 'gravedigger', 'soulbinder'],
    relic: 'grave_lily',
    art: { f: 'hum', hat: 'mitre', item: 'torch', pal: 'ember', bg: 'fire' },
    onAnyDestroyed(b, bc) { if (bc.token) return; b.strike(bc.lane, 2); b.gold(2); },
  },
  hexwright: {
    id: 'hexwright', name: 'Vesk', title: 'the Hexwright', color: '#b07dff', unlock: 'warden_hex',
    text: 'You may Hold 1 extra card. Whenever you discard a card, Strike 1 in a random lane.',
    deck: ['recruit', 'recruit', 'recruit', 'spearman', 'spearman', 'guardian', 'hex_scribe', 'hex_scribe', 'ember_wisp', 'ghost_lantern', 'rag_picker', 'wailing_shade'],
    relic: 'rag_doll',
    art: { f: 'hum', hat: 'witch', item: 'quill', pal: 'violet', bg: 'library' },
    holdBonus: 1,
    onDiscard(b) { b.strike(b.rng.int(0, 2), 1); },
  },
  forgemaster: {
    id: 'forgemaster', name: 'Brannoc', title: 'the Forgemaster', color: '#c9c9d6', unlock: 'warden_forge',
    text: 'Start each run with 2 extra sockets on random cards and an Ember Gem. Your gemmed cards have +1 Power.',
    deck: ['recruit', 'recruit', 'recruit', 'spearman', 'spearman', 'spearman', 'guardian', 'guardian', 'tinker', 'clockwork_squire', 'catapult', 'stone_giant'],
    relic: 'whetstone',
    art: { f: 'hum', hat: 'goggles', item: 'hammer', pal: 'steel', bg: 'workshop' },
    ongoing(b) { for (const c of b.allCards()) if ((c.inst?.sockets || []).some(Boolean)) b.aura(c, 1); },
  },
};
export const WARDEN_LIST = Object.values(WARDENS);
