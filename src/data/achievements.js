import { CARDS } from './cards.js';
import { GEMS } from './gems.js';
import { RELICS } from './relics.js';
import { LOCATIONS } from './locations.js';

export const cardUnlock = (card) => card.set === 'core' || card.evo ? null : `card_${card.id}`;
export const relicUnlock = (relic) => relic.unlock ? `relic_${relic.id}` : null;
export const locationUnlock = (location) => location.unlock ? `location_${location.id}` : null;

const REQUIREMENTS = {
  moves: (n) => `Move your cards ${n} times.`,
  strikes: (n) => `Land ${n} Strikes.`,
  destroyed: (n) => `Have ${n} of your non-token cards destroyed.`,
  discarded: (n) => `Discard ${n} cards through effects.`,
  lingering: (n) => `Trigger Lingering ${n} times.`,
  gold: (n) => `Earn ${n} gold from fights.`,
  reveals: (n) => `Play ${n} cards with an On Reveal effect.`,
  savedEnergy: (n) => `End ${n} turns with Energy left.`,
  wins: (n) => `Win ${n} fights.`,
  bosses: (n) => `Defeat ${n} bosses.`,
  sweeps: (n) => `Win all three lanes in ${n} fights.`,
  evolved: (n) => `Evolve ${n} ${n === 1 ? 'card' : 'cards'}.`,
};

const byMetric = (items, unlock, kind, metric, milestones) => milestones.map(([id, target]) => ({
  id: unlock(items[id]), name: items[id].name, contentId: id, kind, metric, target,
  requirement: REQUIREMENTS[metric]?.(target) ?? `Play ${target} ${metric.slice('tribe:'.length)} cards.`,
  legacy: items[id].set ?? items[id].unlock,
}));
const cards = (metric, milestones) => byMetric(CARDS, cardUnlock, 'Cards', metric, milestones);
const gems = (metric, milestones) => byMetric(GEMS, (gem) => gem.unlock, 'Gems', metric, milestones);
const relics = (metric, milestones) => byMetric(RELICS, relicUnlock, 'Relics', metric, milestones);
const locations = (metric, milestones) => byMetric(LOCATIONS, locationUnlock, 'Locations', metric, milestones);

export const ACHIEVEMENTS = [
  ...cards('moves', [['blink_fox', 2], ['wind_dancer', 5], ['drift_courier', 9], ['riptide_siren', 14], ['stormrunner', 20], ['tide_turtle', 28], ['gale_rider', 38]]),
  ...cards('destroyed', [['ashling', 2], ['cinder_imp', 4], ['pyre_priest', 7], ['gravedigger', 11], ['phoenix_chick', 16], ['grave_knight', 22], ['soulbinder', 30], ['bone_colossus', 42]]),
  ...cards('discarded', [['rag_picker', 2], ['ember_wisp', 5], ['hex_scribe', 9], ['whisper_rat', 14], ['wailing_shade', 22], ['ghost_lantern', 30], ['bonfire_hag', 40]]),
  ...cards('strikes', [['arbalest', 3], ['saboteur', 7], ['siegecrafter', 13], ['ballista', 22], ['catapult', 34], ['storm_caller', 48]]),
  ...cards('savedEnergy', [['patient_monk', 3], ['oathkeeper', 7], ['time_weaver', 13], ['crystal_golem', 21], ['sleeper_giant', 32]]),
  ...cards('gold', [['golden_hen', 50], ['merchant', 140], ['gold_golem', 300]]),
  ...cards('tribe:Knight', [['knight_captain', 15]]),
  ...cards('tribe:Spirit', [['spirit_caller', 15]]),
  ...cards('tribe:Construct', [['cog_marshal', 15]]),
  ...cards('tribe:Fiend', [['fiend_lord', 15]]),
  ...cards('tribe:Sage', [['sage_elder', 15]]),
  ...cards('tribe:Beast', [['beast_tamer', 12], ['starlit_unicorn', 24]]),
  ...cards('bosses', [['world_serpent', 1], ['leviathan', 2], ['abyss_maw', 3], ['void_oracle', 4], ['sun_titan', 6], ['elder_dragon', 8]]),
  ...gems('reveals', [['echo', 15]]),
  ...gems('wins', [['bulwark', 3], ['frost', 7]]),
  ...gems('moves', [['drift', 6]]),
  ...gems('savedEnergy', [['surge', 8]]),
  ...gems('sweeps', [['root', 2]]),
  ...relics('moves', [['lodestone', 12], ['tidal_compass', 26]]),
  ...relics('destroyed', [['grave_lily', 10], ['pyre_brand', 20], ['phoenix_feather', 35]]),
  ...relics('lingering', [['rag_doll', 8]]),
  ...relics('reveals', [['echo_shell', 30]]),
  ...relics('savedEnergy', [['overflow_urn', 24]]),
  ...relics('bosses', [['deep_pockets', 5]]),
  ...relics('tribe:Knight', [['knight_sigil', 30]]),
  ...relics('tribe:Spirit', [['spirit_bell', 30]]),
  ...relics('tribe:Construct', [['cog_heart', 30]]),
  ...relics('tribe:Fiend', [['fiend_horn', 30]]),
  ...relics('tribe:Sage', [['sage_quill', 30]]),
  ...relics('tribe:Beast', [['beast_fang', 32]]),
  ...locations('moves', [['riverbank', 4]]),
  ...locations('sweeps', [['star_altar', 3]]),
  ...locations('wins', [['junkyard', 5]]),
  ...locations('evolved', [['mirror_pool', 1]]),
];

export const ACHIEVEMENT_MAP = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

export function expandLegacyUnlocks(ids = []) {
  return [...new Set(ids.flatMap((id) => {
    const rewards = ACHIEVEMENTS.filter((a) => a.legacy === id && a.id !== id);
    return rewards.length ? rewards.map((a) => a.id) : [id];
  }))];
}

export function recordProgress(meta, changes) {
  const progress = meta.achievementProgress ??= {};
  for (const [metric, amount] of Object.entries(changes)) progress[metric] = (progress[metric] || 0) + amount;
  const owned = new Set(meta.unlocked);
  const earned = ACHIEVEMENTS.filter((a) => !owned.has(a.id) && (progress[a.metric] || 0) >= a.target);
  meta.unlocked.push(...earned.map((a) => a.id));
  return earned.map((a) => a.id);
}
