import { BOSS_ORDER } from './enemies.js';

export const LEVELS = Array.from({ length: BOSS_ORDER.length * 3 }, (_, index) => ({
  id: index + 1,
  stage: index % BOSS_ORDER.length + 1,
  boss: BOSS_ORDER[index % BOSS_ORDER.length],
  extraPower: Math.floor(index / BOSS_ORDER.length),
}));

export function levelAvailable(meta, level) {
  return Number.isInteger(level) && level >= 1 && level <= LEVELS.length && level <= (meta.levelsCleared ?? 0) + 1;
}
