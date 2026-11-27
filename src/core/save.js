// Persistence. Storage can be unavailable (private mode, sandboxed frames), so everything is wrapped.
import { expandLegacyUnlocks } from '../data/achievements.js';
import { STARTER_DECKS } from '../data/starterDecks.js';

const META_KEY = 'threefold.meta.v1';
const RUN_KEY = 'threefold.run.v1';
const mem = {};
const RETIRED_UNLOCKS = {
  perk_forgecraft: { cost: 40, grants: [] },
  warden_tide: { cost: 40, grants: ['cache_tide', 'relics_tide', 'locs_tide'] },
  warden_pyre: { cost: 60, grants: ['cache_ash', 'relics_ash'] },
  warden_hex: { cost: 80, grants: ['cache_hex', 'relics_hex'] },
  warden_forge: { cost: 100, grants: ['cache_siege'] },
};
const BUNDLE_COSTS = { cache_tide: 35, cache_ash: 35, cache_hex: 35, cache_siege: 30, relics_tide: 25, relics_ash: 25, relics_hex: 15, locs_tide: 15 };

function get(k) { try { return localStorage.getItem(k); } catch { return mem[k] ?? null; } }
function set(k, v) { try { localStorage.setItem(k, v); } catch { mem[k] = v; } }
function del(k) { try { localStorage.removeItem(k); } catch { delete mem[k]; } }

export function defaultMeta() {
  return {
    shards: 0, unlocked: [], maxHeat: 0, starterDeckId: 'bastion', selectedHeat: 0, levelsCleared: 0, pinnedAchievement: null, achievementProgress: {},
    stats: { runs: 0, wins: 0, bestAct: 0, fights: 0, evolutions: 0 },
    seen: {}, recipes: {}, settings: { sound: true, fast: false },
    tutorialDone: false,
  };
}
export function loadMeta() {
  try {
    const m = JSON.parse(get(META_KEY));
    if (m) {
      const defaults = defaultMeta();
      const meta = { ...defaults, ...m, stats: { ...defaults.stats, ...m.stats }, settings: { ...defaults.settings, ...m.settings } };
      const owned = new Set(meta.unlocked);
      const retired = Object.entries(RETIRED_UNLOCKS).filter(([id]) => owned.has(id));
      for (const [id, { cost, grants }] of retired) {
        const remainingCost = grants.reduce((sum, grant) => sum + (owned.has(grant) ? 0 : BUNDLE_COSTS[grant]), 0);
        meta.shards += Math.max(0, cost - remainingCost);
        owned.delete(id);
        for (const grant of grants) owned.add(grant);
      }
      meta.unlocked = expandLegacyUnlocks([...owned]);
      if (!Object.hasOwn(STARTER_DECKS, meta.starterDeckId)) meta.starterDeckId = defaults.starterDeckId;
      if (retired.length || JSON.stringify(meta.unlocked) !== JSON.stringify(m.unlocked ?? [])) saveMeta(meta);
      return meta;
    }
  } catch {}
  return defaultMeta();
}
export function saveMeta(m) { set(META_KEY, JSON.stringify(m)); }
export function loadRun() { try { return JSON.parse(get(RUN_KEY)); } catch { return null; } }
export function saveRun(r) { if (!r) del(RUN_KEY); else set(RUN_KEY, JSON.stringify(r)); }
export function clearRun() { del(RUN_KEY); }
