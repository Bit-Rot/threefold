// Persistent perks sold in the main-menu shop.
export const PERKS = [
  { id: 'perk_reroll', name: 'Reroll', desc: 'Once per run, reroll a card reward.', cost: 20 },
  { id: 'perk_reroll2', name: 'Reroll II', desc: '+2 more rerolls per run.', cost: 45, requires: 'perk_reroll' },
  { id: 'perk_skip', name: 'Skip', desc: 'You may skip a forced card pick (+10 gold instead).', cost: 35 },
  { id: 'perk_banish', name: 'Banish', desc: 'Twice per run, banish a card from reward pools for the rest of the run.', cost: 30 },
  { id: 'perk_scout', name: 'Scouting', desc: 'Map nodes show the enemy lineup and locations of upcoming fights.', cost: 15 },
];
export const PERK_MAP = Object.fromEntries(PERKS.map((u) => [u.id, u]));

export const HEAT = [
  { lvl: 1, text: 'Opponents start with 1 extra card in hand.' },
  { lvl: 2, text: 'Shops cost 15% more.' },
  { lvl: 4, text: 'Start with a Junk in your deck.' },
  { lvl: 5, text: "Bosses' cards have +1 Power." },
  { lvl: 6, text: 'Card rewards offer one fewer choice.' },
  { lvl: 7, text: 'Start with 1 fewer heart.' },
  { lvl: 8, text: "All opponents' cards have +1 Power." },
];
