// Map events: short choices with run-level consequences. Effects use the run API in engine/run.js.
export const EVENTS = [
  {
    id: 'wandering_smith', title: 'The Wandering Smith', art: { f: 'hum', hat: 'goggles', item: 'hammer', pal: 'steel', bg: 'workshop' },
    text: 'A soot-stained smith sets down her anvil by the road. "Coin for craft, friend?"',
    choices: [
      { label: 'Pay 40 gold: bore a socket into a random card', can: (r) => r.gold >= 40, apply: (api) => { api.gold(-40); return api.addSocketRandom(); } },
      { label: 'Accept a free card upgrade', apply: (api) => api.upgradeRandom(1) },
      { label: 'Leave', apply: () => 'You walk on.' },
    ],
  },
  {
    id: 'cursed_well', title: 'The Wishing Well', art: { f: 'orb', pal: 'ocean', bg: 'night' },
    text: 'Coins glitter at the bottom of a black well. Something below hums when you lean close.',
    choices: [
      { label: 'Toss 25 gold: gain a random relic (50%)', can: (r) => r.gold >= 25, apply: (api) => { api.gold(-25); return api.rng.chance(0.5) ? api.gainRandomRelic() : 'The well swallows your coin. Nothing.'; } },
      { label: 'Reach in: gain 60 gold, lose 1 heart', can: (r) => r.hearts > 1, apply: (api) => { api.gold(60); api.hearts(-1); return 'Cold water, sharp teeth. You got the gold.'; } },
      { label: 'Leave', apply: () => 'You leave the well to its humming.' },
    ],
  },
  {
    id: 'mirror_hall', title: 'Hall of Mirrors', art: { f: 'crystal', pal: 'frost', bg: 'void' },
    text: 'Your reflection grins and offers to trade places with one of your cards.',
    choices: [
      { label: 'Duplicate a random card in your deck', apply: (api) => api.duplicateRandom() },
      { label: 'Transform a random card into a random card of higher rarity', apply: (api) => api.transformRandom(true) },
      { label: 'Smash the mirrors (+15 gold)', apply: (api) => { api.gold(15); return 'Shards everywhere. Some of them are coins.'; } },
    ],
  },
  {
    id: 'tavern_brawl', title: 'Tavern Brawl', art: { f: 'brute', pal: 'ember', bg: 'tavern' },
    text: 'A brawl spills out of the Gilded Goat. The winner, apparently, gets a free round and a new friend.',
    choices: [
      { label: 'Join in: lose 1 heart, gain a random rare card', can: (r) => r.hearts > 1, apply: (api) => { api.hearts(-1); return api.gainRandomCard('rare'); } },
      { label: 'Buy a round: pay 30 gold, upgrade 2 random cards', can: (r) => r.gold >= 30, apply: (api) => { api.gold(-30); return api.upgradeRandom(2); } },
      { label: 'Slip away', apply: () => 'You keep your teeth.' },
    ],
  },
  {
    id: 'hermit', title: 'The Hermit of the Pass', art: { f: 'hum', hat: 'hood', item: 'staff', pal: 'bone', bg: 'snow' },
    text: '"Too heavy," says the hermit, poking your pack. "Leave something behind."',
    choices: [
      { label: 'Remove a random 1-cost card', apply: (api) => api.removeWhere((c) => c.cost === 1) },
      { label: 'Remove your weakest card and gain 20 gold', apply: (api) => { const m = api.removeWeakest(); api.gold(20); return m; } },
      { label: 'Ignore him', apply: () => 'He mutters about youth.' },
    ],
  },
  {
    id: 'gem_vein', title: 'The Silver Vein', art: { f: 'crystal', pal: 'violet', bg: 'cave' },
    text: 'Silver threads through the cave wall. The rock crumbles as you approach.',
    choices: [
      { label: 'Mine carefully: gain 25 gold', apply: (api) => { api.gold(25); return 'You collect 25 gold.'; } },
      { label: 'Mine greedily: gain 65 gold, lose 1 heart', can: (r) => r.hearts > 1, apply: (api) => { api.hearts(-1); api.gold(65); return 'The wall collapses. You escape with 65 gold.'; } },
    ],
  },
  {
    id: 'shrine_fire', title: 'Shrine of the Last Ember', art: { f: 'wisp', pal: 'ember', bg: 'temple' },
    text: 'An ember floats above the altar. It wants to burn something.',
    choices: [
      { label: 'Burn a random card: upgrade 2 others', apply: (api) => { const m = api.removeRandom(); return m + ' ' + api.upgradeRandom(2); } },
      { label: 'Offer gold (50): heal to full', can: (r) => r.gold >= 50, apply: (api) => { api.gold(-50); api.hearts(99); return 'Warmth floods back into you.'; } },
      { label: 'Leave', apply: () => 'The ember dims, disappointed.' },
    ],
  },
  {
    id: 'evo_scholar', title: 'The Evolutionist', art: { f: 'hum', hat: 'scholar', item: 'book', pal: 'moss', bg: 'library' },
    text: '"Everything wants to become something more," the scholar says, opening her notebook.',
    choices: [
      { label: 'Pay 35 gold for 2 card upgrades', can: (r) => r.gold >= 35, apply: (api) => { api.gold(-35); return api.upgradeRandom(2); } },
      { label: 'Ask about recipes (reveals Evo recipes in your deck)', apply: (api) => api.evoHints() },
    ],
  },
  {
    id: 'gambler', title: 'The Gambler', art: { f: 'hum', hat: 'tophat', item: 'coins', pal: 'shadow', bg: 'tavern' },
    text: '"Double or nothing?" He rolls a pair of bone dice between his fingers.',
    choices: [
      { label: 'Bet half your gold', can: (r) => r.gold >= 10, apply: (api) => { const g = Math.floor(api.run.gold / 2); if (api.rng.chance(0.5)) { api.gold(g); return `You win ${g} gold!`; } api.gold(-g); return `You lose ${g} gold.`; } },
      { label: 'Decline', apply: () => 'He shrugs and rolls anyway. Snake eyes.' },
    ],
  },
  {
    id: 'lost_caravan', title: 'Lost Caravan', art: { f: 'chest', pal: 'gold', bg: 'field' },
    text: 'An abandoned caravan, wheels in the mud. The cargo is still strapped down.',
    choices: [
      { label: 'Loot it (+45 gold)', apply: (api) => { api.gold(45); return 'Heavy coin purses.'; } },
      { label: 'Search for something rarer (random card, uncommon+)', apply: (api) => api.gainRandomCard('uncommon') },
    ],
  },
  {
    id: 'architect', title: 'The Architect', art: { f: 'tower', pal: 'wood', bg: 'castle' },
    text: '"Your Home is a shed," the architect sniffs. "I can fix that."',
    choices: [
      { label: 'Pay 50 gold: gain a random Home upgrade', can: (r) => r.gold >= 50, apply: (api) => { api.gold(-50); return api.gainRandomHome(); } },
      { label: 'Decline', apply: () => '"Enjoy your shed."' },
    ],
  },
  {
    id: 'twin_spirits', title: 'Twin Spirits', art: { f: 'ghost', pal: 'frost', bg: 'grave' },
    text: 'Two ghosts argue over who gets to haunt you.',
    choices: [
      { label: 'Let the generous one in (gain a random relic, lose 1 max heart)', can: (r) => r.maxHearts > 1, apply: (api) => { api.run.maxHearts--; api.run.hearts = Math.min(api.run.hearts, api.run.maxHearts); return api.gainRandomRelic(); } },
      { label: 'Let the clever one in (upgrade 3 random cards)', apply: (api) => api.upgradeRandom(3) },
    ],
  },
];
