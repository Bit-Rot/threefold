// Gems socket into cards. Most gems change what a card does, not just its numbers.
export const GEMS = {
  ember: { id: 'ember', name: 'Ember Gem', color: '#ff6a3d', text: '+2 Power.', power: 2, price: 45 },
  thrift: { id: 'thrift', name: 'Thrift Gem', color: '#7dffb0', text: 'Costs 1 less.', cost: -1, price: 60 },
  echo: { id: 'echo', name: 'Echo Gem', color: '#9fe8ff', text: 'On Reveal triggers twice.', price: 70, unlock: 'gem_echo' },
  spark: {
    id: 'spark', name: 'Spark Gem', color: '#ffe27a', text: 'On Reveal: Strike 2 here.', price: 45,
    onReveal(b, bc) { b.strike(bc.lane, 2); },
  },
  bulwark: { id: 'bulwark', name: 'Bulwark Gem', color: '#b9d6ff', text: "Can't be destroyed or weakened.", price: 50, unlock: 'gem_bulwark' },
  drift: {
    id: 'drift', name: 'Drift Gem', color: '#62d4ff', text: 'Gains Move. After it moves, +1 Power.', price: 50, unlock: 'gem_drift',
    onMoved(b, bc) { b.buff(bc, 1); },
  },
  gilded: {
    id: 'gilded', name: 'Gilded Gem', color: '#ffc94a', text: 'On Reveal: Gain 5 gold.', price: 35,
    onReveal(b) { b.gold(5); },
  },
  surge: {
    id: 'surge', name: 'Surge Gem', color: '#d77dff', text: 'On Reveal: If it is turn 5 or later, +4 Power.', price: 45, unlock: 'gem_surge',
    onReveal(b, bc) { if (b.turn >= 5) b.buff(bc, 4); },
  },
  root: {
    id: 'root', name: 'Root Gem', color: '#8ad16b', text: 'End of turn: +1 Power.', price: 55, unlock: 'gem_root',
    endTurn(b, bc) { b.buff(bc, 1); },
  },
  frost: {
    id: 'frost', name: 'Frost Gem', color: '#d8f6ff', text: 'On Reveal: Freeze the enemy here.', price: 65, unlock: 'gem_frost',
    onReveal(b, bc) { b.freeze(bc.lane); },
  },
  evo: { id: 'evo', name: 'Evo Gem', color: '#ff5fd2', text: 'Fits an Evo base card. Bring the card and its catalyst to a Forge to evolve it.', price: 90, evo: true },
};
export const GEM_LIST = Object.values(GEMS);
