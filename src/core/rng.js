// Small seeded RNG (mulberry32) so runs are reproducible and simulations are deterministic.
export function makeRng(seed) {
  let s = (seed >>> 0) || 1;
  const next = () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng = {
    next,
    int: (a, b) => a + Math.floor(next() * (b - a + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },
    sample(arr, n) { return rng.shuffle(arr.slice()).slice(0, n); },
    weighted(items, weightFn) {
      const total = items.reduce((a, it) => a + weightFn(it), 0);
      let r = next() * total;
      for (const it of items) { r -= weightFn(it); if (r <= 0) return it; }
      return items[items.length - 1];
    },
    get state() { return s; },
    set state(v) { s = v; },
  };
  return rng;
}

export function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
