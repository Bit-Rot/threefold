// Tiny synthesized sound effects (no audio files needed).
let ac = null;
let enabled = true;
export function setSound(on) { enabled = on; }
function ctx() {
  if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { ac = null; } }
  if (ac && ac.state === 'suspended') ac.resume();
  return ac;
}
function tone({ f = 440, f2 = null, t = 0.12, type = 'sine', v = 0.15, delay = 0, noise = false }) {
  if (!enabled) return;
  const a = ctx(); if (!a) return;
  const now = a.currentTime + delay;
  const g = a.createGain(); g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(v, now + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, now + t);
  let src;
  if (noise) {
    const buf = a.createBuffer(1, a.sampleRate * t, a.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    src = a.createBufferSource(); src.buffer = buf;
    const flt = a.createBiquadFilter(); flt.type = 'bandpass'; flt.frequency.value = f; src.connect(flt); flt.connect(g);
  } else {
    src = a.createOscillator(); src.type = type; src.frequency.setValueAtTime(f, now);
    if (f2) src.frequency.exponentialRampToValueAtTime(f2, now + t);
    src.connect(g);
  }
  g.connect(a.destination); src.start(now); src.stop(now + t + 0.02);
}
export const sfx = {
  click: () => tone({ f: 660, t: 0.05, type: 'triangle', v: 0.06 }),
  play: () => { tone({ f: 900, t: 0.12, noise: true, v: 0.12 }); tone({ f: 220, f2: 440, t: 0.12, type: 'triangle', v: 0.08 }); },
  strike: () => { tone({ f: 1200, f2: 200, t: 0.18, type: 'sawtooth', v: 0.05 }); tone({ f: 400, t: 0.15, noise: true, v: 0.1, delay: 0.05 }); },
  gain: () => tone({ f: 140, f2: 90, t: 0.18, type: 'square', v: 0.05 }),
  buff: () => tone({ f: 880, f2: 1320, t: 0.1, type: 'sine', v: 0.05 }),
  destroy: () => tone({ f: 300, t: 0.3, noise: true, v: 0.16 }),
  freeze: () => { tone({ f: 1800, f2: 2400, t: 0.25, type: 'sine', v: 0.04 }); tone({ f: 2400, f2: 1600, t: 0.25, type: 'sine', v: 0.03, delay: 0.05 }); },
  coin: () => { tone({ f: 1320, t: 0.06, type: 'square', v: 0.04 }); tone({ f: 1760, t: 0.1, type: 'square', v: 0.04, delay: 0.06 }); },
  turn: () => tone({ f: 330, f2: 495, t: 0.2, type: 'triangle', v: 0.07 }),
  win: () => [523, 659, 784, 1046].forEach((f, i) => tone({ f, t: 0.25, type: 'triangle', v: 0.09, delay: i * 0.11 })),
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone({ f, t: 0.3, type: 'triangle', v: 0.08, delay: i * 0.13 })),
  error: () => tone({ f: 160, t: 0.12, type: 'square', v: 0.05 }),
  evolve: () => [440, 554, 659, 880, 1108].forEach((f, i) => tone({ f, t: 0.3, type: 'sine', v: 0.08, delay: i * 0.08 })),
};
