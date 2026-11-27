// Persistence. Storage can be unavailable (private mode, sandboxed frames), so everything is wrapped.
const META_KEY = 'threefold.meta.v1';
const RUN_KEY = 'threefold.run.v1';
const mem = {};

function get(k) { try { return localStorage.getItem(k); } catch { return mem[k] ?? null; } }
function set(k, v) { try { localStorage.setItem(k, v); } catch { mem[k] = v; } }
function del(k) { try { localStorage.removeItem(k); } catch { delete mem[k]; } }

export function defaultMeta() {
  return {
    shards: 0, unlocked: [], maxHeat: 0,
    stats: { runs: 0, wins: 0, bestAct: 0, fights: 0, evolutions: 0 },
    seen: {}, recipes: {}, settings: { sound: true, fast: false },
    tutorialDone: false,
  };
}
export function loadMeta() {
  try { const m = JSON.parse(get(META_KEY)); if (m) return { ...defaultMeta(), ...m, stats: { ...defaultMeta().stats, ...m.stats }, settings: { ...defaultMeta().settings, ...m.settings } }; } catch {}
  return defaultMeta();
}
export function saveMeta(m) { set(META_KEY, JSON.stringify(m)); }
export function loadRun() { try { return JSON.parse(get(RUN_KEY)); } catch { return null; } }
export function saveRun(r) { if (!r) del(RUN_KEY); else set(RUN_KEY, JSON.stringify(r)); }
export function clearRun() { del(RUN_KEY); }
