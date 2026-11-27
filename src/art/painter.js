// Procedural illustration painter. Every card, enemy and relic illustration is drawn here with Canvas 2D.
// Art space is 256x256; callers translate/scale into their frame.
import { hashStr, makeRng } from '../core/rng.js';

export const PAL = {
  steel: { main: '#8a9bb0', dark: '#3d4b5e', light: '#d7e2ee', accent: '#c23b3b', cloth: '#2f4a7a', skin: '#e8b996' },
  crimson: { main: '#b8333f', dark: '#5a1420', light: '#f08a8a', accent: '#f2c14e', cloth: '#7a1f2b', skin: '#e3ab86' },
  forest: { main: '#3f8a4c', dark: '#1d3d24', light: '#9fdc8a', accent: '#c9a25a', cloth: '#2d5a33', skin: '#d9a77f' },
  ocean: { main: '#2f7fb8', dark: '#123552', light: '#8fd3ff', accent: '#f5d06b', cloth: '#1f5a87', skin: '#c9e2e8' },
  violet: { main: '#7d4fc2', dark: '#2e1952', light: '#c9a5ff', accent: '#ffd36b', cloth: '#4e2d85', skin: '#e2b7a0' },
  ember: { main: '#e2602b', dark: '#5c200b', light: '#ffc07a', accent: '#ffe27a', cloth: '#8e2d12', skin: '#e9b08a' },
  gold: { main: '#d4a53b', dark: '#5e4512', light: '#fff0b0', accent: '#d64545', cloth: '#a5292a', skin: '#efc39f' },
  bone: { main: '#cfc6ad', dark: '#5a5345', light: '#fff9e6', accent: '#7ac9a8', cloth: '#5d5648', skin: '#e6dcc0' },
  frost: { main: '#8fd3e8', dark: '#2b5f78', light: '#effcff', accent: '#5aa0ff', cloth: '#4b8fb0', skin: '#dbeef5' },
  shadow: { main: '#4d4a63', dark: '#16141f', light: '#9c98c2', accent: '#ff4f7a', cloth: '#2a2738', skin: '#bfa9a0' },
  dawn: { main: '#f29b7a', dark: '#6b2f3a', light: '#ffe1c4', accent: '#ffd36b', cloth: '#c2566a', skin: '#f2c6a2' },
  moss: { main: '#7a9a3d', dark: '#2f3d16', light: '#c8e48a', accent: '#e07a3a', cloth: '#4f6a28', skin: '#c9b88a' },
  storm: { main: '#5f78b0', dark: '#1d2645', light: '#c2d4ff', accent: '#ffe95a', cloth: '#34477a', skin: '#d8c3b0' },
  wood: { main: '#9c6a3c', dark: '#3e2611', light: '#e2b682', accent: '#b8b8c8', cloth: '#6b4423', skin: '#e0ae86' },
  rust: { main: '#a5643a', dark: '#3f2414', light: '#e0a27a', accent: '#6fd0c0', cloth: '#5e3a22', skin: '#c08a6a' },
};

const BG = {
  field: { top: '#7cc3ff', bot: '#f6e7b0', ground: '#6fae4e', feat: 'hills' },
  castle: { top: '#5d8ad6', bot: '#f0d6a8', ground: '#7d8a6a', feat: 'castle' },
  forest: { top: '#2f6b4f', bot: '#b8d98a', ground: '#2e5a2a', feat: 'trees' },
  night: { top: '#0d1230', bot: '#3a3a7a', ground: '#1a1d38', feat: 'stars' },
  snow: { top: '#9fc4e8', bot: '#f4fbff', ground: '#e8f2fa', feat: 'mountains' },
  storm: { top: '#20263f', bot: '#6672a0', ground: '#2c3352', feat: 'lightning' },
  fire: { top: '#3a0d0d', bot: '#ff8a3d', ground: '#3d1a10', feat: 'flames' },
  cave: { top: '#1e1a24', bot: '#5a4a62', ground: '#2a2430', feat: 'stalactites' },
  library: { top: '#2a1c14', bot: '#8a5a34', ground: '#3d2a1a', feat: 'shelves' },
  tavern: { top: '#3a2010', bot: '#d08a3a', ground: '#4a2a14', feat: 'beams' },
  market: { top: '#f0a060', bot: '#fff0c0', ground: '#c09a6a', feat: 'stalls' },
  ruins: { top: '#a08a7a', bot: '#f0d8b8', ground: '#8a7a6a', feat: 'pillars' },
  grave: { top: '#1d2a2a', bot: '#5a7a72', ground: '#1f2b28', feat: 'tombs' },
  sea: { top: '#3a8ad0', bot: '#bfe8ff', ground: '#1f5f9a', feat: 'waves' },
  sky: { top: '#5ab0ff', bot: '#fff4e0', ground: '#ffffff', feat: 'clouds' },
  temple: { top: '#d8a85a', bot: '#fff0d0', ground: '#b88a5a', feat: 'pillars' },
  void: { top: '#05030f', bot: '#3b1a6a', ground: '#120a24', feat: 'swirl' },
  workshop: { top: '#2a2a30', bot: '#8a7a6a', ground: '#3a3530', feat: 'gears' },
  garden: { top: '#8ad0a0', bot: '#fff0f4', ground: '#5a9a5a', feat: 'flowers' },
  swamp: { top: '#2f3d2a', bot: '#7a8a5a', ground: '#2a3520', feat: 'reeds' },
};

// ---------- color helpers ----------
function hexToRgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export function shade(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  const f = (c) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt))));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
export function rgba(hex, a) { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; }

function lin(ctx, x0, y0, x1, y1, stops) { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; }
function rad(ctx, x, y, r0, r1, stops) { const g = ctx.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; }
function ell(ctx, x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, Math.PI * 2); }
function poly(ctx, pts) { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); }
function fillStroke(ctx, fill, stroke = 'rgba(10,8,20,0.85)', lw = 3) { ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); } }
const OUT = 'rgba(12,10,24,0.9)';

// shaded blob: body volume with highlight
function vol(ctx, pathFn, base, x, y, r) {
  pathFn(); ctx.fillStyle = rad(ctx, x - r * 0.35, y - r * 0.4, r * 0.1, r * 1.3, [[0, shade(base, 0.35)], [0.55, base], [1, shade(base, -0.45)]]); ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke();
}

// ---------- backgrounds ----------
export function paintBackground(ctx, bgKey, rng) {
  const bg = BG[bgKey] || BG.field;
  ctx.fillStyle = lin(ctx, 0, 0, 0, 256, [[0, bg.top], [1, bg.bot]]); ctx.fillRect(0, 0, 256, 256);
  const f = bg.feat;
  ctx.save();
  if (f === 'stars' || f === 'swirl' || f === 'lightning') {
    for (let i = 0; i < 60; i++) { ctx.fillStyle = `rgba(255,255,255,${0.3 + rng.next() * 0.7})`; const s = rng.next() * 2 + 0.5; ctx.fillRect(rng.next() * 256, rng.next() * 170, s, s); }
    if (f === 'stars') { ctx.fillStyle = rad(ctx, 200, 50, 4, 40, [[0, '#fffbe0'], [0.4, 'rgba(255,240,190,0.6)'], [1, 'rgba(255,240,190,0)']]); ell(ctx, 200, 50, 40, 40); ctx.fill(); ctx.fillStyle = '#fff8d8'; ell(ctx, 200, 50, 16, 16); ctx.fill(); }
    if (f === 'swirl') { for (let i = 0; i < 5; i++) { ctx.strokeStyle = `rgba(190,120,255,${0.15 + i * 0.05})`; ctx.lineWidth = 6 - i; ctx.beginPath(); ctx.arc(128, 110, 30 + i * 22, i, i + 3.6); ctx.stroke(); } }
    if (f === 'lightning') { ctx.strokeStyle = 'rgba(255,240,140,0.9)'; ctx.lineWidth = 3; ctx.beginPath(); let x = 40 + rng.next() * 170, y = 0; ctx.moveTo(x, y); while (y < 150) { x += (rng.next() - 0.5) * 40; y += 20 + rng.next() * 15; ctx.lineTo(x, y); } ctx.stroke(); ctx.fillStyle = 'rgba(30,35,60,0.6)'; for (let i = 0; i < 4; i++) { ell(ctx, rng.next() * 256, 30 + rng.next() * 40, 60, 20); ctx.fill(); } }
  }
  if (f === 'hills' || f === 'castle' || f === 'garden') {
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; for (let i = 0; i < 3; i++) { const x = rng.next() * 256, y = 25 + rng.next() * 50; ell(ctx, x, y, 28, 9); ctx.fill(); ell(ctx, x + 18, y - 5, 18, 9); ctx.fill(); }
    if (f === 'castle') { ctx.fillStyle = 'rgba(70,80,110,0.55)'; const cx = 60 + rng.next() * 140; ctx.fillRect(cx - 40, 110, 80, 60); for (let i = 0; i < 5; i++) ctx.fillRect(cx - 40 + i * 18, 102, 9, 10); ctx.fillRect(cx - 55, 85, 20, 85); ctx.fillRect(cx + 35, 80, 20, 90); poly(ctx, [[cx - 58, 85], [cx - 45, 62], [cx - 32, 85]]); ctx.fill(); poly(ctx, [[cx + 32, 80], [cx + 45, 56], [cx + 58, 80]]); ctx.fill(); }
    ctx.fillStyle = shade(bg.ground, 0.15); ctx.beginPath(); ctx.moveTo(0, 175); ctx.quadraticCurveTo(70, 135, 140, 170); ctx.quadraticCurveTo(200, 195, 256, 160); ctx.lineTo(256, 256); ctx.lineTo(0, 256); ctx.fill();
    if (f === 'garden') for (let i = 0; i < 26; i++) { ctx.fillStyle = ['#ff7aa8', '#ffd36b', '#ffffff', '#c98aff'][i % 4]; ell(ctx, rng.next() * 256, 185 + rng.next() * 70, 4, 4); ctx.fill(); }
  }
  if (f === 'trees' || f === 'reeds') {
    for (let i = 0; i < 9; i++) {
      const x = i * 32 + rng.next() * 16 - 8, h = 90 + rng.next() * 60;
      ctx.fillStyle = `rgba(20,50,30,${0.35 + (i % 3) * 0.15})`;
      if (f === 'trees') { poly(ctx, [[x, 200 - h], [x - 26, 200], [x + 26, 200]]); ctx.fill(); }
      else { ctx.fillRect(x, 200 - h * 0.6, 3, h * 0.6); ell(ctx, x + 1, 200 - h * 0.6, 4, 12); ctx.fill(); }
    }
    for (let i = 0; i < 6; i++) { ctx.fillStyle = 'rgba(255,255,200,0.25)'; poly(ctx, [[40 + i * 40, 0], [60 + i * 40, 0], [20 + i * 40, 256], [0 + i * 40, 256]]); ctx.fill(); }
  }
  if (f === 'mountains') {
    ctx.fillStyle = 'rgba(120,150,190,0.6)'; poly(ctx, [[0, 170], [60, 70], [110, 150], [170, 55], [256, 165], [256, 256], [0, 256]]); ctx.fill();
    ctx.fillStyle = '#ffffff'; poly(ctx, [[60, 70], [48, 92], [72, 92]]); ctx.fill(); poly(ctx, [[170, 55], [155, 82], [186, 82]]); ctx.fill();
    for (let i = 0; i < 30; i++) { ctx.fillStyle = 'rgba(255,255,255,0.8)'; ell(ctx, rng.next() * 256, rng.next() * 256, 1.5, 1.5); ctx.fill(); }
  }
  if (f === 'flames') {
    for (let i = 0; i < 8; i++) { const x = i * 36 + rng.next() * 20, h = 60 + rng.next() * 90; ctx.fillStyle = `rgba(255,${120 + rng.int(0, 80)},40,0.35)`; ctx.beginPath(); ctx.moveTo(x - 22, 256); ctx.quadraticCurveTo(x - 20, 256 - h * 0.6, x, 256 - h); ctx.quadraticCurveTo(x + 20, 256 - h * 0.6, x + 22, 256); ctx.fill(); }
    for (let i = 0; i < 30; i++) { ctx.fillStyle = `rgba(255,220,120,${rng.next()})`; ell(ctx, rng.next() * 256, rng.next() * 200, 1.5, 1.5); ctx.fill(); }
  }
  if (f === 'stalactites') { ctx.fillStyle = 'rgba(10,8,14,0.6)'; for (let i = 0; i < 10; i++) { const x = i * 28 + rng.next() * 10; poly(ctx, [[x - 12, 0], [x + 12, 0], [x, 30 + rng.next() * 50]]); ctx.fill(); } ctx.fillStyle = 'rgba(150,120,255,0.5)'; for (let i = 0; i < 6; i++) { const x = rng.next() * 256, y = 180 + rng.next() * 60; poly(ctx, [[x, y], [x + 6, y - 18], [x + 12, y]]); ctx.fill(); } }
  if (f === 'shelves') { for (let r = 0; r < 4; r++) { ctx.fillStyle = 'rgba(30,18,10,0.7)'; ctx.fillRect(0, 20 + r * 50, 256, 6); for (let i = 0; i < 18; i++) { ctx.fillStyle = ['#8a2a2a', '#2a5a8a', '#6a8a2a', '#c09a3a', '#5a2a6a'][(i + r) % 5]; const h = 30 + rng.next() * 12; ctx.globalAlpha = 0.55; ctx.fillRect(i * 14 + 2, 20 + r * 50 - h, 11, h); ctx.globalAlpha = 1; } } }
  if (f === 'beams') { ctx.fillStyle = 'rgba(40,20,8,0.6)'; ctx.fillRect(0, 30, 256, 12); ctx.fillRect(40, 0, 12, 256); ctx.fillRect(200, 0, 12, 256); ctx.fillStyle = rad(ctx, 128, 60, 5, 120, [[0, 'rgba(255,200,120,0.6)'], [1, 'rgba(255,200,120,0)']]); ctx.fillRect(0, 0, 256, 256); }
  if (f === 'stalls') { for (let i = 0; i < 3; i++) { const x = 10 + i * 85; ctx.fillStyle = ['#d64545', '#3a7ad6', '#e8b03a'][i]; poly(ctx, [[x, 120], [x + 75, 120], [x + 68, 100], [x + 7, 100]]); ctx.fill(); ctx.fillStyle = 'rgba(80,50,30,0.6)'; ctx.fillRect(x + 6, 120, 6, 60); ctx.fillRect(x + 63, 120, 6, 60); } }
  if (f === 'pillars') { ctx.fillStyle = 'rgba(255,255,255,0.35)'; for (let i = 0; i < 5; i++) { const x = 15 + i * 56; ctx.fillRect(x, 40, 22, 160); ctx.fillRect(x - 5, 34, 32, 10); ctx.fillRect(x - 5, 196, 32, 10); } }
  if (f === 'tombs') { ctx.fillStyle = 'rgba(10,20,20,0.7)'; for (let i = 0; i < 6; i++) { const x = rng.next() * 240, y = 150 + rng.next() * 40; ctx.beginPath(); ctx.moveTo(x, y + 40); ctx.lineTo(x, y + 10); ctx.arc(x + 12, y + 10, 12, Math.PI, 0); ctx.lineTo(x + 24, y + 40); ctx.fill(); } ctx.fillStyle = 'rgba(200,255,230,0.15)'; ctx.fillRect(0, 150, 256, 40); ctx.fillStyle = '#e8f8f0'; ell(ctx, 60, 50, 18, 18); ctx.fill(); }
  if (f === 'waves') { for (let r = 0; r < 5; r++) { ctx.strokeStyle = `rgba(255,255,255,${0.2 + r * 0.1})`; ctx.lineWidth = 3; ctx.beginPath(); for (let x = 0; x <= 256; x += 8) ctx.lineTo(x, 150 + r * 22 + Math.sin(x / 18 + r) * 5); ctx.stroke(); } ctx.fillStyle = rad(ctx, 190, 60, 4, 50, [[0, '#fff6d0'], [1, 'rgba(255,246,208,0)']]); ctx.fillRect(0, 0, 256, 256); }
  if (f === 'clouds') { ctx.fillStyle = 'rgba(255,255,255,0.85)'; for (let i = 0; i < 7; i++) { const x = rng.next() * 256, y = 140 + rng.next() * 110; ell(ctx, x, y, 50, 18); ctx.fill(); ell(ctx, x + 25, y - 12, 30, 18); ctx.fill(); } ctx.fillStyle = rad(ctx, 128, 40, 10, 140, [[0, 'rgba(255,250,210,0.8)'], [1, 'rgba(255,250,210,0)']]); ctx.fillRect(0, 0, 256, 256); }
  if (f === 'gears') { ctx.strokeStyle = 'rgba(200,180,150,0.25)'; ctx.lineWidth = 7; for (let i = 0; i < 4; i++) { const x = rng.next() * 256, y = rng.next() * 160, r = 18 + rng.next() * 25; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.lineTo(x + Math.cos(a) * (r + 9), y + Math.sin(a) * (r + 9)); ctx.stroke(); } } }
  ctx.restore();
  // ground shadow and vignette
  ctx.fillStyle = rad(ctx, 128, 236, 10, 120, [[0, 'rgba(0,0,0,0.35)'], [1, 'rgba(0,0,0,0)']]); ell(ctx, 128, 236, 120, 26); ctx.fill();
}
export function vignette(ctx, w = 256, h = 256) {
  ctx.fillStyle = rad(ctx, w / 2, h / 2, w * 0.35, w * 0.78, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.55)']]); ctx.fillRect(0, 0, w, h);
}

// ---------- held items ----------
function item(ctx, kind, p, x, y) {
  ctx.save(); ctx.translate(x, y);
  const metal = (c = p.light) => lin(ctx, -10, 0, 10, 0, [[0, shade(c, -0.3)], [0.5, '#ffffff'], [1, shade(c, -0.2)]]);
  switch (kind) {
    case 'sword': case 'greatsword': {
      const L = kind === 'greatsword' ? 130 : 95; ctx.rotate(-0.35);
      poly(ctx, [[-6, 0], [6, 0], [5, -L], [0, -L - 14], [-5, -L]]); fillStroke(ctx, metal('#c8d4e0'));
      ctx.fillRect(-1, -L + 8, 2, L - 12);
      poly(ctx, [[-22, 0], [22, 0], [22, 8], [-22, 8]]); fillStroke(ctx, p.accent);
      poly(ctx, [[-4, 8], [4, 8], [4, 34], [-4, 34]]); fillStroke(ctx, '#5a3a22');
      ell(ctx, 0, 38, 7, 7); fillStroke(ctx, p.accent); break;
    }
    case 'spear': case 'lance': {
      ctx.rotate(-0.2); poly(ctx, [[-3, 60], [3, 60], [3, -110], [-3, -110]]); fillStroke(ctx, '#7a5230');
      poly(ctx, [[-10, -108], [10, -108], [0, -150]]); fillStroke(ctx, metal('#d0d8e0'));
      if (kind === 'lance') { poly(ctx, [[-14, -30], [14, -30], [8, -10], [-8, -10]]); fillStroke(ctx, p.accent); } break;
    }
    case 'shield': {
      ctx.beginPath(); ctx.moveTo(-42, -50); ctx.lineTo(42, -50); ctx.lineTo(40, 10); ctx.quadraticCurveTo(0, 60, -40, 10); ctx.closePath();
      fillStroke(ctx, lin(ctx, -40, -50, 40, 40, [[0, shade(p.main, 0.3)], [1, shade(p.main, -0.4)]]), OUT, 4);
      ctx.beginPath(); ctx.moveTo(-30, -40); ctx.lineTo(30, -40); ctx.lineTo(28, 6); ctx.quadraticCurveTo(0, 44, -28, 6); ctx.closePath(); fillStroke(ctx, p.cloth, shade(p.accent, 0), 3);
      poly(ctx, [[-5, -34], [5, -34], [5, 22], [-5, 22]]); ctx.fillStyle = p.accent; ctx.fill(); poly(ctx, [[-24, -14], [24, -14], [24, -4], [-24, -4]]); ctx.fill(); break;
    }
    case 'bow': case 'crossbow': {
      if (kind === 'crossbow') { ctx.rotate(-0.1); poly(ctx, [[-6, -10], [60, -14], [60, -6], [-6, -2]]); fillStroke(ctx, '#6b4423'); ctx.beginPath(); ctx.moveTo(50, -50); ctx.quadraticCurveTo(64, -10, 50, 30); ctx.lineWidth = 6; ctx.strokeStyle = '#3e2611'; ctx.stroke(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#eee'; ctx.beginPath(); ctx.moveTo(50, -50); ctx.lineTo(10, -10); ctx.lineTo(50, 30); ctx.stroke(); break; }
      ctx.beginPath(); ctx.moveTo(0, -80); ctx.quadraticCurveTo(50, 0, 0, 80); ctx.lineWidth = 7; ctx.strokeStyle = '#3e2611'; ctx.stroke(); ctx.lineWidth = 4; ctx.strokeStyle = p.accent; ctx.stroke();
      ctx.lineWidth = 1.5; ctx.strokeStyle = '#f0f0f0'; ctx.beginPath(); ctx.moveTo(0, -80); ctx.lineTo(0, 80); ctx.stroke();
      poly(ctx, [[-50, -1], [10, -1], [10, 1], [-50, 1]]); fillStroke(ctx, '#ddd', null); poly(ctx, [[10, -5], [20, 0], [10, 5]]); fillStroke(ctx, '#ccc', null); break;
    }
    case 'lantern': case 'fire': {
      ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(0, -28); ctx.stroke();
      ctx.fillStyle = rad(ctx, 0, 0, 2, 60, [[0, 'rgba(255,240,170,0.9)'], [1, 'rgba(255,200,80,0)']]); ell(ctx, 0, 0, 60, 60); ctx.fill();
      poly(ctx, [[-14, -28], [14, -28], [18, 24], [-18, 24]]); fillStroke(ctx, rad(ctx, 0, 0, 2, 22, [[0, '#fffbe0'], [1, '#ffb347']]));
      ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -28); ctx.lineTo(0, 24); ctx.stroke(); break;
    }
    case 'staff': case 'orb': case 'rose': {
      if (kind !== 'orb') { ctx.rotate(0.12); poly(ctx, [[-3, 80], [3, 80], [3, -70], [-3, -70]]); fillStroke(ctx, '#6b4423'); }
      const oy = kind === 'orb' ? 0 : -80;
      if (kind === 'rose') { for (let i = 0; i < 6; i++) { ell(ctx, Math.cos(i) * 8, oy + Math.sin(i) * 8, 10, 7, i); fillStroke(ctx, '#d6335a', OUT, 2); } break; }
      ctx.fillStyle = rad(ctx, 0, oy, 2, 50, [[0, rgba(p.light, 0.9)], [1, rgba(p.light, 0)]]); ell(ctx, 0, oy, 50, 50); ctx.fill();
      ell(ctx, 0, oy, 17, 17); fillStroke(ctx, rad(ctx, -5, oy - 5, 2, 18, [[0, '#ffffff'], [0.4, p.light], [1, p.main]])); break;
    }
    case 'drum': { ell(ctx, 0, 10, 40, 14); fillStroke(ctx, p.accent); poly(ctx, [[-40, -20], [40, -20], [40, 10], [-40, 10]]); fillStroke(ctx, lin(ctx, -40, 0, 40, 0, [[0, shade(p.main, -0.3)], [0.5, p.main], [1, shade(p.main, -0.4)]])); ell(ctx, 0, -20, 40, 14); fillStroke(ctx, '#f4ead4'); ctx.strokeStyle = p.accent; ctx.lineWidth = 2; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * 12, -6); ctx.lineTo(i * 12 + 6, 10); ctx.stroke(); } ctx.lineWidth = 5; ctx.strokeStyle = '#7a5230'; ctx.beginPath(); ctx.moveTo(-20, -60); ctx.lineTo(-5, -24); ctx.stroke(); break; }
    case 'ladle': case 'shovel': case 'pick': case 'wrench': case 'hammer': case 'torch': case 'whip': {
      ctx.rotate(-0.4); poly(ctx, [[-4, 50], [4, 50], [4, -60], [-4, -60]]); fillStroke(ctx, '#7a5230');
      if (kind === 'ladle') { ell(ctx, 0, -70, 16, 12); fillStroke(ctx, metal()); }
      if (kind === 'shovel') { poly(ctx, [[-16, -60], [16, -60], [12, -100], [0, -110], [-12, -100]]); fillStroke(ctx, metal('#a0a8b0')); }
      if (kind === 'pick') { ctx.beginPath(); ctx.moveTo(-40, -50); ctx.quadraticCurveTo(0, -80, 40, -50); ctx.lineWidth = 9; ctx.strokeStyle = '#8a929c'; ctx.stroke(); }
      if (kind === 'wrench') { ctx.beginPath(); ctx.arc(0, -66, 14, 0.6, Math.PI * 2 - 0.6 + Math.PI); ctx.lineWidth = 8; ctx.strokeStyle = '#a0a8b0'; ctx.stroke(); }
      if (kind === 'hammer') { poly(ctx, [[-24, -78], [24, -78], [24, -52], [-24, -52]]); fillStroke(ctx, metal('#8a929c')); }
      if (kind === 'torch') { ctx.fillStyle = rad(ctx, 0, -76, 2, 50, [[0, 'rgba(255,220,120,0.9)'], [1, 'rgba(255,120,40,0)']]); ell(ctx, 0, -76, 50, 50); ctx.fill(); ctx.beginPath(); ctx.moveTo(-12, -62); ctx.quadraticCurveTo(-14, -90, 0, -106); ctx.quadraticCurveTo(14, -90, 12, -62); fillStroke(ctx, lin(ctx, 0, -106, 0, -62, [[0, '#fff3a0'], [1, '#ff6a2b']]), null); }
      if (kind === 'whip') { ctx.beginPath(); ctx.moveTo(0, -60); ctx.bezierCurveTo(40, -110, 70, -30, 100, -70); ctx.lineWidth = 4; ctx.strokeStyle = '#4a2a14'; ctx.stroke(); }
      break;
    }
    case 'banner': {
      poly(ctx, [[-3, 70], [3, 70], [3, -110], [-3, -110]]); fillStroke(ctx, '#7a5230');
      ctx.beginPath(); ctx.moveTo(3, -105); ctx.lineTo(70, -100); ctx.quadraticCurveTo(60, -70, 70, -40); ctx.lineTo(3, -45); ctx.closePath(); fillStroke(ctx, lin(ctx, 3, -100, 70, -40, [[0, p.cloth], [1, shade(p.cloth, -0.3)]]));
      ell(ctx, 34, -72, 12, 12); fillStroke(ctx, p.accent, OUT, 2); break;
    }
    case 'book': case 'quill': case 'scroll': {
      if (kind === 'quill') { ctx.rotate(-0.5); ctx.beginPath(); ctx.moveTo(0, 30); ctx.quadraticCurveTo(-18, -40, 6, -80); ctx.quadraticCurveTo(14, -30, 0, 30); fillStroke(ctx, '#f4f0e8'); break; }
      poly(ctx, [[-36, -24], [36, -24], [36, 24], [-36, 24]]); fillStroke(ctx, p.cloth); poly(ctx, [[-32, -20], [0, -16], [0, 20], [-32, 18]]); fillStroke(ctx, '#f4ead4', OUT, 2); poly(ctx, [[0, -16], [32, -20], [32, 18], [0, 20]]); fillStroke(ctx, '#efe2c4', OUT, 2);
      ctx.strokeStyle = 'rgba(60,40,20,0.5)'; ctx.lineWidth = 1.5; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-28, -8 + i * 7); ctx.lineTo(-4, -6 + i * 7); ctx.moveTo(4, -6 + i * 7); ctx.lineTo(28, -8 + i * 7); ctx.stroke(); } break;
    }
    case 'potion': case 'cauldron': case 'bomb': {
      if (kind === 'cauldron') { ell(ctx, 0, 10, 46, 34); fillStroke(ctx, '#2a2a30'); ell(ctx, 0, -18, 44, 10); fillStroke(ctx, '#7dff7a'); for (let i = 0; i < 5; i++) { ell(ctx, -30 + i * 15, -30 - (i % 2) * 12, 6, 6); fillStroke(ctx, '#b0ff9a', OUT, 1.5); } break; }
      if (kind === 'bomb') { ell(ctx, 0, 0, 24, 24); fillStroke(ctx, rad(ctx, -8, -8, 2, 26, [[0, '#6a6a7a'], [1, '#14141a']])); ctx.lineWidth = 3; ctx.strokeStyle = '#c0a070'; ctx.beginPath(); ctx.moveTo(10, -20); ctx.quadraticCurveTo(20, -36, 30, -32); ctx.stroke(); ctx.fillStyle = '#ffe27a'; ell(ctx, 31, -33, 5, 5); ctx.fill(); break; }
      ell(ctx, 0, 6, 20, 20); fillStroke(ctx, rad(ctx, -6, 0, 2, 22, [[0, '#ffffff'], [0.3, p.light], [1, p.accent]])); poly(ctx, [[-6, -24], [6, -24], [6, -12], [-6, -12]]); fillStroke(ctx, '#d8eef2'); break;
    }
    case 'daggers': { for (const s of [-1, 1]) { ctx.save(); ctx.rotate(s * 0.5); poly(ctx, [[-4, 0], [4, 0], [0, -60]]); fillStroke(ctx, metal()); poly(ctx, [[-12, 0], [12, 0], [12, 6], [-12, 6]]); fillStroke(ctx, p.accent); poly(ctx, [[-3, 6], [3, 6], [3, 26], [-3, 26]]); fillStroke(ctx, '#3e2611'); ctx.restore(); } break; }
    case 'coins': { for (let i = 0; i < 6; i++) { ell(ctx, -20 + (i % 3) * 20, 10 - Math.floor(i / 3) * 14, 13, 7); fillStroke(ctx, lin(ctx, -10, -5, 10, 5, [[0, '#fff3a0'], [1, '#c8902a']]), OUT, 2); } break; }
    case 'lute': { ell(ctx, 0, 20, 30, 34); fillStroke(ctx, lin(ctx, -30, 0, 30, 0, [[0, '#7a4a20'], [0.5, '#d09050'], [1, '#6a3a18']])); ell(ctx, 0, 14, 8, 8); fillStroke(ctx, '#2a1a0a', null); poly(ctx, [[-5, -14], [5, -14], [4, -90], [-4, -90]]); fillStroke(ctx, '#5a3010'); break; }
    case 'chain': { ctx.lineWidth = 5; ctx.strokeStyle = '#8a929c'; for (let i = 0; i < 6; i++) { ell(ctx, i * 12 - 30, -20 + i * 14, 8, 5, 0.8 * (i % 2 ? 1 : -1)); ctx.stroke(); } break; }
    case 'hourglass': { poly(ctx, [[-24, -36], [24, -36], [0, 0], [24, 36], [-24, 36], [0, 0]]); fillStroke(ctx, rgba('#dff4ff', 0.6)); poly(ctx, [[-14, 30], [14, 30], [0, 12]]); ctx.fillStyle = '#f2c14e'; ctx.fill(); poly(ctx, [[-30, -42], [30, -42], [30, -34], [-30, -34]]); fillStroke(ctx, '#6b4423'); poly(ctx, [[-30, 34], [30, 34], [30, 42], [-30, 42]]); fillStroke(ctx, '#6b4423'); break; }
    case 'fan': { for (let i = 0; i < 7; i++) { ctx.save(); ctx.rotate(-0.9 + i * 0.3); poly(ctx, [[0, 0], [-8, -60], [8, -60]]); fillStroke(ctx, i % 2 ? p.light : p.main, OUT, 2); ctx.restore(); } break; }
    case 'satchel': case 'sack': { ctx.beginPath(); ctx.moveTo(-30, -10); ctx.quadraticCurveTo(-40, 40, 0, 40); ctx.quadraticCurveTo(40, 40, 30, -10); ctx.closePath(); fillStroke(ctx, kind === 'sack' ? '#a08a60' : '#8a5a30'); poly(ctx, [[-30, -10], [30, -10], [26, -22], [-26, -22]]); fillStroke(ctx, shade('#8a5a30', -0.2)); break; }
    case 'beads': { for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; ell(ctx, Math.cos(a) * 26, Math.sin(a) * 18 + 10, 5, 5); fillStroke(ctx, '#c0603a', OUT, 1.5); } break; }
    case 'bell': { ctx.beginPath(); ctx.moveTo(-24, 20); ctx.quadraticCurveTo(-22, -30, 0, -32); ctx.quadraticCurveTo(22, -30, 24, 20); ctx.closePath(); fillStroke(ctx, lin(ctx, -24, 0, 24, 0, [[0, '#a07a20'], [0.5, '#ffe27a'], [1, '#8a6a1a']])); ell(ctx, 0, 24, 6, 6); fillStroke(ctx, '#8a6a1a'); break; }
    default: break;
  }
  ctx.restore();
}

// ---------- hats ----------
function hat(ctx, kind, p, hx, hy, r) {
  const metal = (c) => lin(ctx, hx - r, hy, hx + r, hy, [[0, shade(c, -0.4)], [0.4, shade(c, 0.4)], [1, shade(c, -0.5)]]);
  switch (kind) {
    case 'helm': case 'greathelm': case 'skullhelm': case 'plume': {
      ctx.beginPath(); ctx.arc(hx, hy, r + 3, Math.PI, 0); ctx.lineTo(hx + r + 3, hy + (kind === 'helm' ? 2 : r * 0.9)); ctx.lineTo(hx - r - 3, hy + (kind === 'helm' ? 2 : r * 0.9)); ctx.closePath();
      fillStroke(ctx, metal(kind === 'skullhelm' ? '#cfc6ad' : p.main === '#d4a53b' ? '#d4a53b' : '#a8b4c4'));
      if (kind !== 'helm') { ctx.fillStyle = '#0c0a14'; ctx.fillRect(hx - r * 0.75, hy + 2, r * 1.5, 5); ctx.fillRect(hx - 2, hy + 2, 4, r * 0.6); }
      if (kind === 'skullhelm') { ctx.fillStyle = '#0c0a14'; ell(ctx, hx - 8, hy - 2, 5, 6); ctx.fill(); ell(ctx, hx + 8, hy - 2, 5, 6); ctx.fill(); }
      if (kind === 'plume' || kind === 'greathelm') { ctx.beginPath(); ctx.moveTo(hx, hy - r - 2); ctx.quadraticCurveTo(hx + r * 1.4, hy - r * 1.8, hx + r * 1.6, hy - r * 0.2); ctx.quadraticCurveTo(hx + r * 0.6, hy - r * 1.1, hx, hy - r - 2); fillStroke(ctx, p.accent); }
      break;
    }
    case 'cap': case 'miner': case 'bandana': {
      ctx.beginPath(); ctx.arc(hx, hy - 2, r + 1, Math.PI, 0); ctx.closePath(); fillStroke(ctx, kind === 'miner' ? '#e8b03a' : kind === 'bandana' ? p.accent : p.cloth);
      if (kind === 'miner') { ell(ctx, hx, hy - r * 0.6, 7, 6); fillStroke(ctx, '#fffbe0', OUT, 2); ctx.fillStyle = 'rgba(255,250,200,0.25)'; poly(ctx, [[hx, hy - r * 0.6], [hx - 60, hy - 90], [hx + 60, hy - 90]]); ctx.fill(); }
      if (kind === 'bandana') { poly(ctx, [[hx + r - 2, hy - 4], [hx + r + 16, hy + 6], [hx + r + 10, hy - 10]]); fillStroke(ctx, p.accent); }
      if (kind === 'cap') { poly(ctx, [[hx - r - 2, hy - 2], [hx + r + 12, hy - 2], [hx + r + 12, hy + 3], [hx - r - 2, hy + 3]]); fillStroke(ctx, shade(p.cloth, -0.3)); }
      break;
    }
    case 'chef': { ell(ctx, hx, hy - r - 6, r * 0.9, r * 0.7); fillStroke(ctx, '#ffffff'); poly(ctx, [[hx - r * 0.7, hy - r * 0.9], [hx + r * 0.7, hy - r * 0.9], [hx + r * 0.7, hy - r * 0.3], [hx - r * 0.7, hy - r * 0.3]]); fillStroke(ctx, '#f4f4f4'); break; }
    case 'feather': { ctx.beginPath(); ctx.arc(hx, hy - 2, r + 1, Math.PI, 0); ctx.closePath(); fillStroke(ctx, p.cloth); ctx.beginPath(); ctx.moveTo(hx + 4, hy - r); ctx.quadraticCurveTo(hx + r * 2, hy - r * 2.6, hx + r * 1.2, hy - r * 0.4); fillStroke(ctx, p.accent); break; }
    case 'hood': case 'veil': {
      ctx.beginPath(); ctx.moveTo(hx - r - 10, hy + r * 1.2); ctx.quadraticCurveTo(hx - r - 8, hy - r * 1.5, hx, hy - r - 10); ctx.quadraticCurveTo(hx + r + 8, hy - r * 1.5, hx + r + 10, hy + r * 1.2); ctx.quadraticCurveTo(hx, hy + r * 0.2, hx - r - 10, hy + r * 1.2);
      fillStroke(ctx, kind === 'veil' ? rgba(p.light, 0.75) : lin(ctx, hx, hy - r, hx, hy + r, [[0, p.cloth], [1, shade(p.cloth, -0.5)]])); break;
    }
    case 'tophat': { poly(ctx, [[hx - r - 6, hy - r * 0.6], [hx + r + 6, hy - r * 0.6], [hx + r + 6, hy - r * 0.3], [hx - r - 6, hy - r * 0.3]]); fillStroke(ctx, '#1a1a22'); poly(ctx, [[hx - r * 0.7, hy - r * 0.6], [hx + r * 0.7, hy - r * 0.6], [hx + r * 0.6, hy - r * 2], [hx - r * 0.6, hy - r * 2]]); fillStroke(ctx, '#22222c'); ctx.fillStyle = p.accent; ctx.fillRect(hx - r * 0.68, hy - r * 0.95, r * 1.36, 5); break; }
    case 'witch': case 'wizard': { ell(ctx, hx, hy - r * 0.5, r * 1.6, r * 0.35); fillStroke(ctx, p.cloth); ctx.beginPath(); ctx.moveTo(hx - r * 0.8, hy - r * 0.6); ctx.quadraticCurveTo(hx - r * 0.2, hy - r * 2, hx + r * 0.9, hy - r * 2.6); ctx.quadraticCurveTo(hx + r * 0.3, hy - r * 1.6, hx + r * 0.8, hy - r * 0.6); ctx.closePath(); fillStroke(ctx, lin(ctx, hx, hy - 2 * r, hx, hy, [[0, shade(p.cloth, 0.2)], [1, shade(p.cloth, -0.4)]])); if (kind === 'wizard') { ctx.fillStyle = p.accent; for (let i = 0; i < 4; i++) { ell(ctx, hx - 6 + i * 6, hy - r * (1 + i * 0.3), 2.5, 2.5); ctx.fill(); } } break; }
    case 'scholar': { poly(ctx, [[hx - r - 10, hy - r * 0.6], [hx, hy - r - 12], [hx + r + 10, hy - r * 0.6], [hx, hy - r * 0.2]]); fillStroke(ctx, '#1c1c28'); ctx.strokeStyle = p.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx, hy - r * 0.6); ctx.lineTo(hx + r + 6, hy); ctx.stroke(); break; }
    case 'goggles': { ctx.beginPath(); ctx.arc(hx, hy - 2, r + 1, Math.PI, 0); ctx.closePath(); fillStroke(ctx, '#5a3a22'); for (const s of [-1, 1]) { ell(ctx, hx + s * r * 0.45, hy - r * 0.45, 8, 8); fillStroke(ctx, rad(ctx, hx + s * r * 0.45 - 2, hy - r * 0.45 - 2, 1, 9, [[0, '#e8ffff'], [1, '#3a8ad0']])); } break; }
    case 'turban': { ell(ctx, hx, hy - r * 0.5, r * 1.15, r * 0.75); fillStroke(ctx, lin(ctx, hx - r, hy, hx + r, hy, [[0, '#f4f0e0'], [1, '#c8b890']])); ell(ctx, hx, hy - r * 0.6, 6, 6); fillStroke(ctx, p.accent, OUT, 2); break; }
    case 'mitre': { poly(ctx, [[hx - r * 0.8, hy - r * 0.4], [hx, hy - r * 2.2], [hx + r * 0.8, hy - r * 0.4]]); fillStroke(ctx, p.cloth); ctx.fillStyle = p.accent; ctx.fillRect(hx - 3, hy - r * 1.9, 6, r * 1.4); break; }
    case 'mask': { ctx.fillStyle = '#16141f'; ctx.fillRect(hx - r - 1, hy - 6, r * 2 + 2, 10); ctx.beginPath(); ctx.arc(hx, hy - 2, r + 1, Math.PI, 0); ctx.closePath(); fillStroke(ctx, '#2a2738'); break; }
    case 'horns': { for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(hx + s * r * 0.6, hy - r * 0.6); ctx.quadraticCurveTo(hx + s * r * 1.8, hy - r * 1.2, hx + s * r * 1.3, hy - r * 2.2); ctx.quadraticCurveTo(hx + s * r * 1.2, hy - r * 1.3, hx + s * r * 0.2, hy - r * 0.9); fillStroke(ctx, lin(ctx, hx, hy - 2 * r, hx, hy, [[0, '#fff3d8'], [1, '#8a7050']])); } break; }
    case 'crown': case 'halo': {
      if (kind === 'halo') { ctx.strokeStyle = '#fff0a0'; ctx.lineWidth = 5; ell(ctx, hx, hy - r - 8, r * 0.9, 6); ctx.stroke(); ctx.fillStyle = rad(ctx, hx, hy, r, r * 3, [[0, 'rgba(255,240,160,0.5)'], [1, 'rgba(255,240,160,0)']]); ell(ctx, hx, hy, r * 3, r * 3); ctx.fill(); break; }
      poly(ctx, [[hx - r * 0.9, hy - r * 0.5], [hx - r * 0.9, hy - r * 1.4], [hx - r * 0.45, hy - r * 0.9], [hx, hy - r * 1.6], [hx + r * 0.45, hy - r * 0.9], [hx + r * 0.9, hy - r * 1.4], [hx + r * 0.9, hy - r * 0.5]]);
      fillStroke(ctx, lin(ctx, hx, hy - 1.6 * r, hx, hy - 0.5 * r, [[0, '#fff3a0'], [1, '#c8902a']])); ctx.fillStyle = '#d64545'; ell(ctx, hx, hy - r * 0.85, 4, 4); ctx.fill(); break;
    }
    case 'bald': default: break;
  }
}

// ---------- figures ----------
function humanoid(ctx, a, p, rng) {
  const hx = 128, hy = 92, r = 26;
  // body
  ctx.beginPath(); ctx.moveTo(60, 256); ctx.quadraticCurveTo(62, 150, 98, 128); ctx.lineTo(158, 128); ctx.quadraticCurveTo(194, 150, 196, 256); ctx.closePath();
  const armored = ['helm', 'greathelm', 'skullhelm', 'plume', 'halo'].includes(a.hat);
  fillStroke(ctx, lin(ctx, 60, 130, 196, 256, [[0, shade(armored ? p.main : p.cloth, 0.25)], [0.6, armored ? p.main : p.cloth], [1, shade(armored ? p.main : p.cloth, -0.5)]]), OUT, 4);
  if (armored) { // pauldrons + chest plate
    for (const s of [-1, 1]) { ell(ctx, 128 + s * 46, 140, 26, 18, s * 0.3); fillStroke(ctx, rad(ctx, 128 + s * 40, 132, 2, 30, [[0, shade(p.main, 0.5)], [1, shade(p.main, -0.3)]])); }
    poly(ctx, [[104, 150], [152, 150], [146, 210], [128, 222], [110, 210]]); fillStroke(ctx, lin(ctx, 104, 150, 152, 220, [[0, shade(p.light, 0.2)], [1, shade(p.main, -0.2)]]), OUT, 2.5);
    ctx.fillStyle = p.accent; ell(ctx, 128, 178, 7, 7); ctx.fill();
  } else {
    poly(ctx, [[118, 128], [138, 128], [128, 170]]); fillStroke(ctx, shade(p.cloth, -0.35), OUT, 2);
    ctx.strokeStyle = rgba(p.accent, 0.9); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(84, 200); ctx.quadraticCurveTo(128, 214, 172, 200); ctx.stroke();
  }
  // neck + head
  ctx.fillStyle = shade(p.skin, -0.2); ctx.fillRect(118, 110, 20, 22);
  ell(ctx, hx, hy, r, r * 1.08); fillStroke(ctx, rad(ctx, hx - 8, hy - 10, 3, r * 1.3, [[0, shade(p.skin, 0.25)], [0.7, p.skin], [1, shade(p.skin, -0.3)]]));
  // face
  const masked = ['greathelm', 'skullhelm', 'plume'].includes(a.hat);
  if (!masked) {
    ctx.fillStyle = '#1a1420'; ell(ctx, hx - 9, hy + 2, 3, 4); ctx.fill(); ell(ctx, hx + 9, hy + 2, 3, 4); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ell(ctx, hx - 8, hy + 1, 1, 1); ctx.fill(); ell(ctx, hx + 10, hy + 1, 1, 1); ctx.fill();
    ctx.strokeStyle = 'rgba(40,20,20,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx - 12, hy - 6); ctx.lineTo(hx - 5, hy - 5); ctx.moveTo(hx + 5, hy - 5); ctx.lineTo(hx + 12, hy - 6); ctx.stroke();
    ctx.beginPath(); ctx.arc(hx, hy + 12, 6, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.fillStyle = rgba('#ff7a7a', 0.25); ell(ctx, hx - 15, hy + 9, 5, 3); ctx.fill(); ell(ctx, hx + 15, hy + 9, 5, 3); ctx.fill();
    if (rng.chance(0.35) && !['veil', 'witch'].includes(a.hat)) { ctx.fillStyle = shade(p.dark, -0.2); ctx.beginPath(); ctx.moveTo(hx - 18, hy + 10); ctx.quadraticCurveTo(hx, hy + 44, hx + 18, hy + 10); ctx.quadraticCurveTo(hx, hy + 22, hx - 18, hy + 10); ctx.fill(); }
  }
  if (!['helm', 'greathelm', 'skullhelm', 'plume', 'hood', 'veil', 'mask', 'bald', 'turban'].includes(a.hat)) { // hair
    ctx.fillStyle = shade(p.dark, -0.1); ctx.beginPath(); ctx.arc(hx, hy - 4, r + 2, Math.PI * 0.95, Math.PI * 2.05); ctx.quadraticCurveTo(hx + r, hy - 14, hx, hy - 18); ctx.quadraticCurveTo(hx - r, hy - 14, hx - r - 2, hy); ctx.fill();
  }
  hat(ctx, a.hat, p, hx, hy, r);
  // arm + item
  if (a.item) {
    const big = ['shield', 'drum', 'book', 'cauldron', 'coins', 'lute', 'satchel', 'sack', 'beads'].includes(a.item);
    const ix = big ? 128 : 186, iy = big ? 200 : 170;
    if (!big) { ctx.beginPath(); ctx.moveTo(170, 140); ctx.quadraticCurveTo(196, 160, 186, 176); ctx.lineWidth = 16; ctx.strokeStyle = OUT; ctx.stroke(); ctx.lineWidth = 11; ctx.strokeStyle = armored ? p.main : p.cloth; ctx.stroke(); }
    item(ctx, a.item, p, ix, iy);
    if (!big) { ell(ctx, 186, 176, 9, 9); fillStroke(ctx, p.skin); }
  }
}

function creature(ctx, f, a, p, rng) {
  switch (f) {
    case 'brute': {
      ctx.beginPath(); ctx.moveTo(40, 256); ctx.quadraticCurveTo(30, 140, 128, 120); ctx.quadraticCurveTo(226, 140, 216, 256); ctx.closePath(); vol(ctx, () => {}, p.main, 128, 170, 100); fillStroke(ctx, lin(ctx, 40, 120, 216, 256, [[0, shade(p.main, 0.3)], [1, shade(p.main, -0.5)]]), OUT, 4);
      ell(ctx, 128, 100, 40, 36); fillStroke(ctx, rad(ctx, 116, 86, 4, 50, [[0, shade(p.main, 0.4)], [1, shade(p.main, -0.3)]]));
      ctx.fillStyle = '#ffe27a'; ell(ctx, 112, 96, 6, 4); ctx.fill(); ell(ctx, 144, 96, 6, 4); ctx.fill();
      ctx.fillStyle = '#fff8e0'; poly(ctx, [[104, 118], [112, 104], [116, 118]]); ctx.fill(); poly(ctx, [[140, 118], [144, 104], [152, 118]]); ctx.fill();
      ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(100, 84); ctx.lineTo(120, 90); ctx.moveTo(156, 84); ctx.lineTo(136, 90); ctx.stroke();
      if (a.hat) hat(ctx, a.hat, p, 128, 92, 34);
      for (const s of [-1, 1]) { ell(ctx, 128 + s * 78, 200, 26, 34); fillStroke(ctx, shade(p.main, -0.15)); }
      break;
    }
    case 'golem': case 'robot': case 'skeleton': case 'crystal': {
      const c = f === 'skeleton' ? '#e8e0c8' : f === 'crystal' ? p.light : p.main;
      const block = (x, y, w, h) => { poly(ctx, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]); fillStroke(ctx, lin(ctx, x, y, x + w, y + h, [[0, shade(c, 0.35)], [1, shade(c, -0.5)]]), OUT, 3.5); };
      if (f === 'crystal') { for (const [x, h, w] of [[128, 170, 40], [88, 120, 28], [168, 130, 30], [108, 90, 20], [152, 80, 22]]) { poly(ctx, [[x - w, 240], [x - w * 0.8, 240 - h * 0.8], [x, 240 - h], [x + w * 0.8, 240 - h * 0.8], [x + w, 240]]); fillStroke(ctx, lin(ctx, x - w, 0, x + w, 0, [[0, rgba(p.light, 0.95)], [0.5, rgba('#ffffff', 0.9)], [1, rgba(p.main, 0.95)]])); } ctx.fillStyle = '#16141f'; ell(ctx, 112, 140, 6, 8); ctx.fill(); ell(ctx, 144, 140, 6, 8); ctx.fill(); break; }
      block(64, 130, 128, 110); block(92, 62, 72, 64);
      for (const s of [-1, 1]) block(128 + s * 64 - 22, 140, 44, 90);
      ctx.fillStyle = f === 'robot' ? '#7dffff' : f === 'skeleton' ? '#1a1420' : '#ffcf5a';
      ell(ctx, 112, 92, 7, f === 'skeleton' ? 9 : 5); ctx.fill(); ell(ctx, 144, 92, 7, f === 'skeleton' ? 9 : 5); ctx.fill();
      if (f === 'golem') { ctx.strokeStyle = rgba('#ffcf5a', 0.7); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(100, 160); ctx.lineTo(120, 190); ctx.lineTo(110, 220); ctx.moveTo(150, 150); ctx.lineTo(140, 190); ctx.stroke(); }
      if (f === 'skeleton') { ctx.strokeStyle = '#1a1420'; ctx.lineWidth = 4; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(84, 150 + i * 20); ctx.lineTo(172, 150 + i * 20); ctx.stroke(); } }
      if (f === 'robot') { ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(128, 62); ctx.lineTo(128, 40); ctx.stroke(); ell(ctx, 128, 38, 6, 6); fillStroke(ctx, p.accent); ell(ctx, 128, 180, 18, 18); fillStroke(ctx, rad(ctx, 128, 180, 2, 20, [[0, '#ffffff'], [1, p.accent]])); }
      if (a.hat) hat(ctx, a.hat, p, 128, 66, 34);
      break;
    }
    case 'wisp': case 'ghost': case 'angel': {
      ctx.fillStyle = rad(ctx, 128, 130, 10, 120, [[0, rgba(p.light, 0.8)], [1, rgba(p.main, 0)]]); ell(ctx, 128, 130, 120, 120); ctx.fill();
      if (f === 'wisp') { ctx.beginPath(); ctx.moveTo(128, 50); ctx.quadraticCurveTo(190, 120, 160, 180); ctx.quadraticCurveTo(128, 215, 96, 180); ctx.quadraticCurveTo(66, 120, 128, 50); fillStroke(ctx, rad(ctx, 128, 150, 4, 80, [[0, '#ffffff'], [0.4, p.light], [1, p.main]])); }
      else {
        if (f === 'angel') for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(128 + s * 20, 130); ctx.quadraticCurveTo(128 + s * 120, 60, 128 + s * 110, 180); ctx.quadraticCurveTo(128 + s * 60, 160, 128 + s * 20, 160); fillStroke(ctx, lin(ctx, 128, 60, 128 + s * 110, 180, [[0, '#ffffff'], [1, p.light]])); }
        ctx.beginPath(); ctx.moveTo(78, 240); ctx.quadraticCurveTo(70, 70, 128, 66); ctx.quadraticCurveTo(186, 70, 178, 240); for (let i = 0; i < 5; i++) ctx.quadraticCurveTo(168 - i * 20, 220, 158 - i * 20, 240); ctx.closePath();
        fillStroke(ctx, lin(ctx, 128, 66, 128, 240, [[0, rgba(f === 'angel' ? '#ffffff' : p.light, 0.95)], [1, rgba(p.main, 0.6)]]));
        if (f === 'angel') hat(ctx, 'halo', p, 128, 100, 26);
      }
      ctx.fillStyle = '#16141f'; ell(ctx, 114, 130, 6, 9); ctx.fill(); ell(ctx, 142, 130, 6, 9); ctx.fill();
      ctx.beginPath(); ctx.arc(128, 150, 6, 0, Math.PI); ctx.fill();
      if (a.item) item(ctx, a.item, p, 186, 176);
      break;
    }
    case 'bird': case 'owl': case 'hen': {
      const c = p.main;
      ell(ctx, 128, 160, 62, 70); fillStroke(ctx, rad(ctx, 110, 130, 4, 90, [[0, shade(c, 0.4)], [1, shade(c, -0.4)]]));
      ell(ctx, 128, 176, 38, 46); fillStroke(ctx, shade(p.light, 0.2), null);
      if (f !== 'hen') for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(128 + s * 40, 130); ctx.quadraticCurveTo(128 + s * 130, 70 + (f === 'owl' ? 60 : 0), 128 + s * 110, 200); ctx.quadraticCurveTo(128 + s * 70, 180, 128 + s * 50, 200); fillStroke(ctx, lin(ctx, 128, 100, 128 + s * 110, 200, [[0, shade(c, 0.1)], [1, shade(c, -0.5)]])); }
      ell(ctx, 128, 96, 40, 36); fillStroke(ctx, rad(ctx, 116, 84, 3, 46, [[0, shade(c, 0.45)], [1, shade(c, -0.25)]]));
      if (f === 'owl') { for (const s of [-1, 1]) { ell(ctx, 128 + s * 16, 96, 14, 14); fillStroke(ctx, '#ffe27a', OUT, 2.5); ctx.fillStyle = '#16141f'; ell(ctx, 128 + s * 16, 96, 6, 6); ctx.fill(); poly(ctx, [[128 + s * 20, 66], [128 + s * 36, 48], [128 + s * 34, 74]]); fillStroke(ctx, c); } }
      else { ctx.fillStyle = '#16141f'; ell(ctx, 112, 92, 5, 6); ctx.fill(); ell(ctx, 144, 92, 5, 6); ctx.fill(); }
      poly(ctx, [[118, 106], [138, 106], [128, 124]]); fillStroke(ctx, '#f2b83a', OUT, 2.5);
      if (f === 'hen') { ell(ctx, 128, 58, 10, 14); fillStroke(ctx, '#d64545'); ell(ctx, 116, 62, 8, 11); fillStroke(ctx, '#d64545'); }
      if (p === PAL.ember || p === PAL.gold) { ctx.fillStyle = rgba('#ffe27a', 0.6); for (let i = 0; i < 10; i++) { const x = 40 + rng.next() * 176, y = 40 + rng.next() * 60; poly(ctx, [[x, y], [x + 4, y - 12], [x + 8, y]]); ctx.fill(); } }
      break;
    }
    case 'imp': case 'rat': case 'fox': case 'wolf': case 'lizard': {
      const c = p.main;
      const snout = f === 'wolf' || f === 'fox' ? 26 : f === 'rat' ? 22 : 10;
      ell(ctx, 128, 196, 70, 60); fillStroke(ctx, rad(ctx, 110, 170, 4, 90, [[0, shade(c, 0.35)], [1, shade(c, -0.5)]]));
      if (f === 'fox' || f === 'wolf' || f === 'rat') { ctx.beginPath(); ctx.moveTo(190, 220); ctx.quadraticCurveTo(250, 170, 230, 110); ctx.quadraticCurveTo(210, 170, 170, 200); fillStroke(ctx, f === 'fox' ? lin(ctx, 170, 200, 230, 110, [[0, c], [0.8, c], [1, '#ffffff']]) : shade(c, -0.2)); }
      ell(ctx, 128, 112, 46, 40); fillStroke(ctx, rad(ctx, 112, 96, 4, 56, [[0, shade(c, 0.45)], [1, shade(c, -0.3)]]));
      for (const s of [-1, 1]) {
        if (f === 'imp') { ctx.beginPath(); ctx.moveTo(128 + s * 26, 84); ctx.quadraticCurveTo(128 + s * 50, 56, 128 + s * 40, 36); ctx.quadraticCurveTo(128 + s * 34, 66, 128 + s * 10, 78); fillStroke(ctx, '#f4e8d0'); }
        else if (f === 'lizard') { /* none */ }
        else { poly(ctx, [[128 + s * 14, 80], [128 + s * (f === 'rat' ? 50 : 40), f === 'rat' ? 70 : 34], [128 + s * 44, 92]]); fillStroke(ctx, c); if (f !== 'rat') { poly(ctx, [[128 + s * 22, 80], [128 + s * 37, 48], [128 + s * 38, 86]]); ctx.fillStyle = shade(p.light, 0); ctx.fill(); } else { ell(ctx, 128 + s * 40, 76, 14, 14); fillStroke(ctx, '#e8a0a0'); } }
      }
      ell(ctx, 128, 126 + snout * 0.2, 20 + snout * 0.3, 14 + snout * 0.2); fillStroke(ctx, shade(p.light, 0.3), OUT, 2.5);
      ctx.fillStyle = '#16141f'; ell(ctx, 128, 118 + snout * 0.1, 6, 4); ctx.fill();
      ctx.fillStyle = f === 'wolf' ? '#9fe8ff' : f === 'imp' ? '#ffe27a' : '#16141f'; ell(ctx, 110, 104, 6, f === 'wolf' ? 4 : 6); ctx.fill(); ell(ctx, 146, 104, 6, f === 'wolf' ? 4 : 6); ctx.fill();
      if (f === 'wolf') { ctx.fillStyle = '#fff'; poly(ctx, [[118, 136], [122, 146], [126, 136]]); ctx.fill(); poly(ctx, [[130, 136], [134, 146], [138, 136]]); ctx.fill(); }
      if (f === 'lizard') { ctx.fillStyle = shade(p.accent, 0); for (let i = 0; i < 6; i++) { poly(ctx, [[100 + i * 12, 160 - (i % 2) * 4], [106 + i * 12, 144], [112 + i * 12, 160]]); ctx.fill(); } ctx.fillStyle = rad(ctx, 128, 200, 4, 120, [[0, 'rgba(255,160,60,0.35)'], [1, 'rgba(255,160,60,0)']]); ctx.fillRect(0, 0, 256, 256); }
      break;
    }
    case 'turtle': {
      ell(ctx, 128, 190, 90, 56); fillStroke(ctx, rad(ctx, 108, 160, 6, 110, [[0, shade(p.light, 0.1)], [1, shade(p.main, -0.4)]]), OUT, 4);
      ctx.strokeStyle = rgba(p.dark, 0.8); ctx.lineWidth = 3; for (const [x, y] of [[128, 170], [92, 190], [164, 190], [110, 212], [146, 212]]) { poly(ctx, Array.from({ length: 6 }, (_, i) => [x + Math.cos((i / 6) * Math.PI * 2) * 18, y + Math.sin((i / 6) * Math.PI * 2) * 13])); ctx.stroke(); }
      ell(ctx, 128, 120, 30, 26); fillStroke(ctx, '#8ad0a0'); ctx.fillStyle = '#16141f'; ell(ctx, 116, 116, 4, 5); ctx.fill(); ell(ctx, 140, 116, 4, 5); ctx.fill();
      break;
    }
    case 'serpent': case 'dragon': case 'maw': {
      const c = p.main;
      if (f === 'dragon') for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(128 + s * 30, 150); ctx.lineTo(128 + s * 120, 50); ctx.lineTo(128 + s * 110, 110); ctx.lineTo(128 + s * 125, 120); ctx.lineTo(128 + s * 100, 160); ctx.lineTo(128 + s * 110, 180); ctx.lineTo(128 + s * 50, 190); fillStroke(ctx, lin(ctx, 128, 50, 128 + s * 120, 190, [[0, shade(c, 0.1)], [1, shade(c, -0.6)]])); }
      if (f === 'maw') {
        ell(ctx, 128, 140, 100, 96); fillStroke(ctx, rad(ctx, 128, 140, 10, 100, [[0, '#000000'], [0.6, shade(c, -0.6)], [1, c]]));
        ctx.fillStyle = '#f4ead4'; for (let i = 0; i < 9; i++) { const a2 = (i / 9) * Math.PI * 2; const x = 128 + Math.cos(a2) * 70, y = 140 + Math.sin(a2) * 66; poly(ctx, [[x, y], [128 + Math.cos(a2 - 0.15) * 92, 140 + Math.sin(a2 - 0.15) * 88], [128 + Math.cos(a2 + 0.15) * 92, 140 + Math.sin(a2 + 0.15) * 88]]); ctx.fill(); }
        ctx.fillStyle = '#ff4f7a'; for (let i = 0; i < 4; i++) { ell(ctx, 90 + i * 25, 60 + (i % 2) * 10, 6, 6); ctx.fill(); }
        break;
      }
      ctx.beginPath(); ctx.moveTo(30, 250); ctx.bezierCurveTo(10, 160, 210, 200, 190, 120); ctx.lineWidth = 46; ctx.strokeStyle = OUT; ctx.stroke(); ctx.lineWidth = 40; ctx.strokeStyle = lin(ctx, 30, 250, 190, 120, [[0, shade(c, -0.4)], [1, shade(c, 0.2)]]); ctx.stroke();
      ctx.lineWidth = 14; ctx.strokeStyle = rgba(p.light, 0.6); ctx.stroke();
      ell(ctx, 170, 96, 46, 34, -0.4); fillStroke(ctx, rad(ctx, 160, 84, 4, 56, [[0, shade(c, 0.45)], [1, shade(c, -0.3)]]));
      poly(ctx, [[150, 70], [140, 34], [168, 64]]); fillStroke(ctx, p.accent); poly(ctx, [[180, 66], [190, 28], [196, 70]]); fillStroke(ctx, p.accent);
      ctx.fillStyle = '#ffe27a'; ell(ctx, 168, 88, 7, 5, -0.4); ctx.fill(); ctx.fillStyle = '#16141f'; ell(ctx, 168, 88, 2, 5); ctx.fill();
      ctx.fillStyle = '#fff'; for (let i = 0; i < 4; i++) { poly(ctx, [[150 + i * 12, 116 - i * 5], [154 + i * 12, 128 - i * 5], [158 + i * 12, 114 - i * 5]]); ctx.fill(); }
      if (f === 'dragon') { ctx.fillStyle = rad(ctx, 230, 120, 4, 50, [[0, 'rgba(255,240,150,0.9)'], [1, 'rgba(255,120,40,0)']]); ell(ctx, 226, 124, 50, 30); ctx.fill(); }
      break;
    }
    case 'mermaid': {
      ctx.beginPath(); ctx.moveTo(100, 160); ctx.bezierCurveTo(60, 220, 160, 230, 120, 256); ctx.lineTo(180, 256); ctx.bezierCurveTo(200, 220, 160, 190, 156, 160); ctx.closePath(); fillStroke(ctx, lin(ctx, 100, 160, 180, 256, [[0, p.light], [1, p.main]]));
      humanoid(ctx, { hat: 'bald', item: 'staff' }, { ...p, cloth: p.main }, rng);
      ctx.fillStyle = shade(p.accent, -0.1); for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(100 + i * 7, 60); ctx.quadraticCurveTo(80 + i * 9, 120, 90 + i * 10, 170); ctx.lineWidth = 5; ctx.strokeStyle = shade(p.accent, -0.2); ctx.stroke(); }
      break;
    }
    case 'treant': case 'mushroom': {
      if (f === 'mushroom') {
        poly(ctx, [[110, 240], [146, 240], [140, 140], [116, 140]]); fillStroke(ctx, '#f4ead4');
        ctx.beginPath(); ctx.moveTo(40, 150); ctx.quadraticCurveTo(50, 60, 128, 56); ctx.quadraticCurveTo(206, 60, 216, 150); ctx.closePath(); fillStroke(ctx, rad(ctx, 110, 80, 6, 120, [[0, shade(p.accent, 0.3)], [1, shade(p.accent, -0.4)]]));
        ctx.fillStyle = '#fff8e0'; for (const [x, y, r] of [[90, 110, 12], [140, 84, 10], [176, 120, 9], [120, 126, 7]]) { ell(ctx, x, y, r, r * 0.8); ctx.fill(); }
        ctx.fillStyle = '#16141f'; ell(ctx, 120, 180, 4, 6); ctx.fill(); ell(ctx, 136, 180, 4, 6); ctx.fill();
        break;
      }
      ctx.lineCap = 'round';
      poly(ctx, [[90, 256], [166, 256], [150, 110], [106, 110]]); fillStroke(ctx, lin(ctx, 90, 0, 166, 0, [[0, '#3e2611'], [0.5, '#7a5230'], [1, '#3e2611']]), OUT, 4);
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(128 + s * 18, 140); ctx.quadraticCurveTo(128 + s * 80, 120, 128 + s * 90, 60); ctx.lineWidth = 14; ctx.strokeStyle = '#5a3a1a'; ctx.stroke(); }
      for (const [x, y, r] of [[128, 60, 60], [60, 70, 38], [196, 70, 38], [92, 30, 30], [164, 30, 30]]) { ell(ctx, x, y, r, r * 0.8); fillStroke(ctx, rad(ctx, x - r * 0.3, y - r * 0.3, 3, r * 1.2, [[0, shade(p.light, 0.2)], [1, shade(p.main, -0.3)]]), OUT, 3); }
      ctx.fillStyle = '#ffe27a'; ell(ctx, 116, 160, 6, 4); ctx.fill(); ell(ctx, 140, 160, 6, 4); ctx.fill();
      ctx.strokeStyle = '#16141f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(128, 186, 10, 0.2, Math.PI - 0.2); ctx.stroke(); ctx.lineCap = 'butt';
      break;
    }
    case 'tower': {
      poly(ctx, [[80, 256], [176, 256], [164, 90], [92, 90]]); fillStroke(ctx, lin(ctx, 80, 0, 176, 0, [[0, shade(p.main, -0.4)], [0.4, shade(p.light, 0)], [1, shade(p.main, -0.5)]]), OUT, 4);
      ctx.strokeStyle = rgba(p.dark, 0.6); ctx.lineWidth = 2; for (let y = 110; y < 256; y += 18) { ctx.beginPath(); ctx.moveTo(86, y); ctx.lineTo(170, y); ctx.stroke(); }
      for (let i = 0; i < 4; i++) { poly(ctx, [[84 + i * 24, 90], [100 + i * 24, 90], [100 + i * 24, 70], [84 + i * 24, 70]]); fillStroke(ctx, p.main); }
      poly(ctx, [[118, 140], [138, 140], [138, 172], [118, 172]]); fillStroke(ctx, a.item === 'fire' ? '#ffcf5a' : '#1a1420');
      if (a.item === 'fire') { ctx.fillStyle = rad(ctx, 128, 50, 4, 70, [[0, 'rgba(255,240,150,1)'], [1, 'rgba(255,120,40,0)']]); ell(ctx, 128, 50, 70, 60); ctx.fill(); ctx.beginPath(); ctx.moveTo(108, 70); ctx.quadraticCurveTo(110, 30, 128, 10); ctx.quadraticCurveTo(146, 30, 148, 70); fillStroke(ctx, lin(ctx, 0, 10, 0, 70, [[0, '#fff3a0'], [1, '#ff6a2b']]), null); }
      else { poly(ctx, [[88, 70], [128, 20], [168, 70]]); fillStroke(ctx, p.accent === '#b8b8c8' ? '#8a3030' : p.accent); }
      break;
    }
    case 'catapult': case 'ballista': {
      poly(ctx, [[40, 210], [216, 210], [216, 232], [40, 232]]); fillStroke(ctx, lin(ctx, 0, 210, 0, 232, [[0, p.light], [1, p.dark]]));
      for (const x of [70, 186]) { ell(ctx, x, 236, 22, 22); fillStroke(ctx, '#5a3a1a'); ell(ctx, x, 236, 6, 6); fillStroke(ctx, '#b8b8c8'); }
      if (f === 'catapult') { poly(ctx, [[110, 210], [146, 210], [128, 140]]); fillStroke(ctx, p.main); ctx.save(); ctx.translate(128, 150); ctx.rotate(-0.7); poly(ctx, [[-6, 0], [6, 0], [6, -110], [-6, -110]]); fillStroke(ctx, p.main); ell(ctx, 0, -118, 22, 14); fillStroke(ctx, '#3e2611'); ell(ctx, 0, -126, 16, 16); fillStroke(ctx, rad(ctx, -4, -130, 2, 18, [[0, '#a0a0a8'], [1, '#3a3a40']])); ctx.restore(); }
      else { poly(ctx, [[60, 170], [196, 160], [196, 176], [60, 186]]); fillStroke(ctx, p.main); ctx.beginPath(); ctx.moveTo(150, 110); ctx.quadraticCurveTo(110, 170, 150, 230); ctx.lineWidth = 9; ctx.strokeStyle = '#3e2611'; ctx.stroke(); poly(ctx, [[196, 162], [230, 168], [196, 176]]); fillStroke(ctx, '#d0d8e0'); poly(ctx, [[80, 200], [96, 186], [112, 200]]); fillStroke(ctx, p.dark); }
      break;
    }
    case 'chest': {
      poly(ctx, [[54, 140], [202, 140], [202, 236], [54, 236]]); fillStroke(ctx, lin(ctx, 0, 140, 0, 236, [[0, '#a5643a'], [1, '#4a2810']]), OUT, 4);
      ctx.beginPath(); ctx.moveTo(54, 140); ctx.quadraticCurveTo(128, 50, 202, 140); ctx.closePath(); fillStroke(ctx, lin(ctx, 0, 70, 0, 140, [[0, '#c0784a'], [1, '#6a3a18']]), OUT, 4);
      ctx.fillStyle = '#d4a53b'; ctx.fillRect(54, 136, 148, 10); ctx.fillRect(122, 136, 12, 100);
      ctx.fillStyle = '#ff4f4f'; ell(ctx, 100, 128, 7, 5); ctx.fill(); ell(ctx, 156, 128, 7, 5); ctx.fill();
      ctx.fillStyle = '#fff'; for (let i = 0; i < 9; i++) { poly(ctx, [[64 + i * 15, 146], [71 + i * 15, 162], [78 + i * 15, 146]]); ctx.fill(); }
      ctx.fillStyle = '#d6335a'; ell(ctx, 128, 176, 30, 10); ctx.fill();
      break;
    }
    case 'eye': {
      ctx.fillStyle = rad(ctx, 128, 128, 10, 120, [[0, rgba(p.light, 0.6)], [1, rgba(p.main, 0)]]); ell(ctx, 128, 128, 120, 120); ctx.fill();
      ell(ctx, 128, 128, 80, 50); fillStroke(ctx, '#f4f0ff', OUT, 4); ell(ctx, 128, 128, 34, 34); fillStroke(ctx, rad(ctx, 128, 128, 4, 36, [[0, '#ffffff'], [0.3, p.light], [1, p.main]])); ctx.fillStyle = '#05030f'; ell(ctx, 128, 128, 12, 22); ctx.fill();
      ctx.strokeStyle = rgba(p.light, 0.7); ctx.lineWidth = 3; for (let i = 0; i < 8; i++) { const a2 = (i / 8) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(128 + Math.cos(a2) * 95, 128 + Math.sin(a2) * 70); ctx.lineTo(128 + Math.cos(a2) * 120, 128 + Math.sin(a2) * 95); ctx.stroke(); }
      break;
    }
    case 'unicorn': {
      ell(ctx, 128, 196, 74, 52); fillStroke(ctx, rad(ctx, 110, 180, 6, 90, [[0, '#ffffff'], [1, shade(p.light, -0.2)]]));
      ctx.beginPath(); ctx.moveTo(110, 170); ctx.quadraticCurveTo(100, 100, 130, 80); ctx.lineTo(176, 100); ctx.quadraticCurveTo(170, 130, 150, 120); ctx.quadraticCurveTo(150, 160, 160, 180); ctx.closePath(); fillStroke(ctx, lin(ctx, 110, 80, 170, 180, [[0, '#ffffff'], [1, shade(p.light, -0.15)]]));
      poly(ctx, [[134, 82], [150, 30], [146, 88]]); fillStroke(ctx, lin(ctx, 134, 82, 150, 30, [[0, '#ffe27a'], [1, '#fff8e0']]));
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(126 - i * 4, 86 + i * 10); ctx.quadraticCurveTo(96 - i * 6, 96 + i * 12, 100 - i * 4, 120 + i * 10); ctx.lineWidth = 7; ctx.strokeStyle = ['#ff7aa8', '#ffd36b', '#9fe8ff', '#c98aff', '#7dffb0', '#ff9a6a'][i]; ctx.stroke(); }
      ctx.fillStyle = '#16141f'; ell(ctx, 150, 100, 4, 5); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; for (let i = 0; i < 14; i++) { const x = rng.next() * 256, y = rng.next() * 140; poly(ctx, [[x, y - 5], [x + 1.5, y - 1.5], [x + 5, y], [x + 1.5, y + 1.5], [x, y + 5], [x - 1.5, y + 1.5], [x - 5, y], [x - 1.5, y - 1.5]]); ctx.fill(); }
      break;
    }
    case 'junk': {
      for (let i = 0; i < 8; i++) { const x = 70 + rng.next() * 116, y = 150 + rng.next() * 80; ctx.save(); ctx.translate(x, y); ctx.rotate(rng.next() * 3); poly(ctx, [[-20, -12], [22, -10], [18, 14], [-16, 10]]); fillStroke(ctx, lin(ctx, -20, -12, 20, 14, [[0, shade(p.light, 0)], [1, shade(p.main, -0.4)]]), OUT, 2.5); ctx.restore(); }
      ctx.strokeStyle = '#6a6a72'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(128, 150, 26, 0, 4); ctx.stroke();
      break;
    }
    case 'orb': { ell(ctx, 128, 128, 70, 70); fillStroke(ctx, rad(ctx, 108, 104, 6, 80, [[0, '#ffffff'], [0.4, p.light], [1, p.dark]])); break; }
    default: { ell(ctx, 128, 140, 60, 60); fillStroke(ctx, p.main); }
  }
}

// Main entry: draw an illustration into a 256x256 space.
export function paintArt(ctx, art, seedKey = '') {
  const rng = makeRng(hashStr(seedKey + JSON.stringify(art)));
  const p = PAL[art.pal] || PAL.steel;
  paintBackground(ctx, art.bg, rng);
  // rim light / backlight halo
  ctx.fillStyle = rad(ctx, 128, 120, 20, 140, [[0, rgba(p.light, 0.35)], [1, rgba(p.light, 0)]]); ctx.fillRect(0, 0, 256, 256);
  ctx.save();
  ctx.lineJoin = 'round';
  if (art.f === 'hum') humanoid(ctx, art, p, rng); else if (art.f !== 'none') creature(ctx, art.f, art, p, rng);
  ctx.restore();
  vignette(ctx);
}

// ---------- enemy portraits ----------
const ENEMY_ART = {
  tide: { f: 'serpent', pal: 'ocean', bg: 'sea' },
  metronome: { f: 'brute', hat: 'horns', pal: 'crimson', bg: 'fire', drum: true },
  march: { f: 'imp', pal: 'moss', bg: 'field' },
  factory: { f: 'factory', pal: 'rust', bg: 'workshop' },
  nightfall: { f: 'owl', pal: 'shadow', bg: 'night' },
  hoarder: { f: 'bird', pal: 'shadow', bg: 'market' },
  siege: { f: 'ram', pal: 'wood', bg: 'castle' },
  junkline: { f: 'robot', pal: 'rust', bg: 'workshop' },
  reel: { f: 'slot', pal: 'gold', bg: 'tavern' },
  commission: { f: 'hum', hat: 'tophat', item: 'scroll', pal: 'violet', bg: 'library' },
  leech: { f: 'serpent', pal: 'moss', bg: 'swamp' },
  baton: { f: 'hum', hat: 'tophat', item: 'staff', pal: 'shadow', bg: 'temple' },
  brood: { f: 'spider', pal: 'violet', bg: 'cave' },
  engine: { f: 'factory', pal: 'steel', bg: 'storm', big: true },
  engine_ram: { f: 'ram', pal: 'steel', bg: 'storm' },
};
export function enemyArt(id) { return ENEMY_ART[id] || ENEMY_ART.tide; }

export function paintEnemy(ctx, id) {
  const art = enemyArt(id);
  const rng = makeRng(hashStr('enemy' + id));
  const p = PAL[art.pal];
  paintBackground(ctx, art.bg, rng);
  ctx.fillStyle = rad(ctx, 128, 130, 20, 140, [[0, 'rgba(255,60,60,0.25)'], [1, 'rgba(255,60,60,0)']]); ctx.fillRect(0, 0, 256, 256);
  ctx.save(); ctx.lineJoin = 'round';
  if (art.f === 'factory') {
    poly(ctx, [[40, 250], [216, 250], [216, 130], [170, 160], [170, 130], [124, 160], [124, 130], [40, 170]]); fillStroke(ctx, lin(ctx, 0, 130, 0, 250, [[0, shade(p.main, 0.2)], [1, shade(p.main, -0.5)]]), OUT, 4);
    for (const x of [60, 92]) { poly(ctx, [[x, 170], [x + 22, 170], [x + 18, 60], [x + 4, 60]]); fillStroke(ctx, shade(p.main, -0.2)); }
    for (let i = 0; i < 6; i++) { ctx.fillStyle = `rgba(60,55,60,${0.5 - i * 0.07})`; ell(ctx, 75 + i * 14 + (i % 2) * 8, 50 - i * 9, 14 + i * 3, 10 + i * 2); ctx.fill(); }
    for (let i = 0; i < 4; i++) { poly(ctx, [[60 + i * 38, 200], [84 + i * 38, 200], [84 + i * 38, 222], [60 + i * 38, 222]]); fillStroke(ctx, '#ffcf5a', OUT, 2); }
    ctx.strokeStyle = '#d0d0d8'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(180, 100, 26, 0, Math.PI * 2); ctx.stroke(); for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(180 + Math.cos(a) * 26, 100 + Math.sin(a) * 26); ctx.lineTo(180 + Math.cos(a) * 38, 100 + Math.sin(a) * 38); ctx.stroke(); }
  } else if (art.f === 'ram') {
    poly(ctx, [[30, 200], [226, 200], [226, 230], [30, 230]]); fillStroke(ctx, lin(ctx, 0, 200, 0, 230, [[0, '#9c6a3c'], [1, '#3e2611']]));
    poly(ctx, [[50, 200], [128, 90], [206, 200]]); fillStroke(ctx, lin(ctx, 50, 90, 206, 200, [[0, shade(p.main, 0.2)], [1, shade(p.main, -0.5)]]), OUT, 4);
    poly(ctx, [[60, 150], [236, 150], [236, 178], [60, 178]]); fillStroke(ctx, '#6b4423');
    ell(ctx, 236, 164, 22, 26); fillStroke(ctx, rad(ctx, 230, 156, 2, 28, [[0, '#d0d8e0'], [1, '#4a4a52']]));
    ctx.fillStyle = '#16141f'; poly(ctx, [[244, 152], [250, 146], [252, 158]]); ctx.fill();
    for (const x of [64, 128, 192]) { ell(ctx, x, 234, 20, 20); fillStroke(ctx, '#3e2611'); }
  } else if (art.f === 'slot') {
    poly(ctx, [[48, 60], [208, 60], [208, 236], [48, 236]]); fillStroke(ctx, lin(ctx, 48, 0, 208, 0, [[0, '#8a6a1a'], [0.5, '#ffe27a'], [1, '#8a6a1a']]), OUT, 4);
    poly(ctx, [[64, 100], [192, 100], [192, 170], [64, 170]]); fillStroke(ctx, '#fff8e0', OUT, 3);
    const sy = ['7', '🍒', '🔔'];
    ctx.font = 'bold 40px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i < 3; i++) { ctx.fillStyle = i === 0 ? '#d64545' : '#333'; ctx.fillText(sy[i], 86 + i * 42, 136); }
    ctx.fillStyle = '#d64545'; ell(ctx, 128, 76, 40, 10); ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(208, 140); ctx.lineTo(236, 140); ctx.lineTo(236, 80); ctx.stroke(); ell(ctx, 236, 74, 10, 10); fillStroke(ctx, '#d64545');
    ctx.fillStyle = '#16141f'; ell(ctx, 100, 200, 8, 8); ctx.fill(); ell(ctx, 156, 200, 8, 8); ctx.fill(); ctx.beginPath(); ctx.arc(128, 210, 16, 0, Math.PI); ctx.fill();
  } else if (art.f === 'spider') {
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(128, 150); ctx.quadraticCurveTo(128 + s * (70 + i * 10), 60 + i * 30, 128 + s * (110 + i * 6), 200 + i * 10); ctx.lineWidth = 9; ctx.strokeStyle = OUT; ctx.stroke(); ctx.lineWidth = 5; ctx.strokeStyle = p.main; ctx.stroke(); }
    ell(ctx, 128, 180, 60, 50); fillStroke(ctx, rad(ctx, 110, 160, 4, 70, [[0, shade(p.main, 0.4)], [1, shade(p.dark, -0.4)]]));
    ell(ctx, 128, 120, 36, 30); fillStroke(ctx, shade(p.main, -0.1));
    ctx.fillStyle = '#ff4f7a'; for (const [x, y] of [[114, 112], [142, 112], [120, 124], [136, 124], [106, 124], [150, 124]]) { ell(ctx, x, y, 4, 4); ctx.fill(); }
    ctx.fillStyle = '#ffe27a'; ell(ctx, 128, 186, 14, 20); ctx.fill();
  } else {
    if (art.f === 'hum') humanoid(ctx, art, p, rng); else creature(ctx, art.f, art, p, rng);
    if (art.drum) item(ctx, 'drum', p, 128, 222);
  }
  ctx.restore();
  vignette(ctx);
}

// ---------- glyphs (relics, home upgrades, intents, map nodes) ----------
export function paintGlyph(ctx, key, s, color = '#ffe27a') {
  ctx.save(); ctx.translate(s / 2, s / 2); const k = s / 100; ctx.scale(k, k); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  glyphBody(ctx, key, color);
  ctx.restore();
}
function glyphBody(ctx, key, color = '#ffe27a') {
  ctx.save();
  const F = (fill) => fillStroke(ctx, fill, OUT, 5);
  const g = (c) => lin(ctx, -40, -40, 40, 40, [[0, shade(c, 0.45)], [1, shade(c, -0.35)]]);
  switch (key) {
    case 'coin': ell(ctx, 0, 0, 34, 34); F(g('#ffd34a')); ctx.fillStyle = '#8a6a1a'; ctx.font = 'bold 40px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✦', 0, 2); break;
    case 'bag': ctx.beginPath(); ctx.moveTo(-30, -10); ctx.quadraticCurveTo(-40, 40, 0, 40); ctx.quadraticCurveTo(40, 40, 30, -10); ctx.closePath(); F(g('#a5643a')); poly(ctx, [[-20, -10], [20, -10], [12, -30], [-12, -30]]); F(g('#7a4a20')); break;
    case 'flame': ctx.beginPath(); ctx.moveTo(0, -42); ctx.quadraticCurveTo(36, -6, 26, 22); ctx.quadraticCurveTo(14, 42, 0, 42); ctx.quadraticCurveTo(-26, 42, -28, 18); ctx.quadraticCurveTo(-30, -6, 0, -42); F(lin(ctx, 0, -42, 0, 42, [[0, '#fff3a0'], [1, '#ff4a1a']])); break;
    case 'hourglass': item(ctx, 'hourglass', PAL.gold, 0, 0); break;
    case 'blade': case 'sword': ctx.rotate(0.7); poly(ctx, [[-6, 30], [6, 30], [5, -40], [0, -48], [-5, -40]]); F(g('#d0d8e0')); poly(ctx, [[-18, 30], [18, 30], [18, 38], [-18, 38]]); F(g('#d4a53b')); break;
    case 'horn': ctx.beginPath(); ctx.moveTo(-36, 20); ctx.quadraticCurveTo(-10, 30, 30, -30); ctx.lineTo(40, -18); ctx.quadraticCurveTo(0, 40, -36, 34); ctx.closePath(); F(g('#e8dcc0')); break;
    case 'feather': ctx.rotate(0.6); ctx.beginPath(); ctx.moveTo(0, 44); ctx.quadraticCurveTo(-30, -10, 0, -46); ctx.quadraticCurveTo(30, -10, 0, 44); F(g('#9fe8ff')); break;
    case 'crown': hat(ctx, 'crown', PAL.gold, 0, 30, 36); break;
    case 'anchor': ctx.lineWidth = 10; ctx.strokeStyle = OUT; ctx.beginPath(); ctx.moveTo(0, -36); ctx.lineTo(0, 36); ctx.moveTo(-30, 10); ctx.quadraticCurveTo(0, 50, 30, 10); ctx.stroke(); ctx.lineWidth = 6; ctx.strokeStyle = '#9aa8b8'; ctx.stroke(); ell(ctx, 0, -38, 9, 9); F('#9aa8b8'); break;
    case 'stone': ell(ctx, 0, 6, 36, 28); F(g('#8a8a9a')); break;
    case 'skull': ell(ctx, 0, -6, 30, 28); F(g('#f4ead4')); ctx.fillStyle = OUT; ell(ctx, -11, -6, 7, 8); ctx.fill(); ell(ctx, 11, -6, 7, 8); ctx.fill(); ctx.fillRect(-12, 18, 24, 12); break;
    case 'heart': ctx.beginPath(); ctx.moveTo(0, 34); ctx.bezierCurveTo(-50, 0, -30, -44, 0, -18); ctx.bezierCurveTo(30, -44, 50, 0, 0, 34); F(g('#ff4f6a')); break;
    case 'banner': poly(ctx, [[-24, -40], [24, -40], [24, 30], [0, 16], [-24, 30]]); F(g('#c23b3b')); break;
    case 'scroll': case 'book': case 'map': poly(ctx, [[-34, -26], [34, -26], [34, 26], [-34, 26]]); F(g(key === 'map' ? '#e8d4a0' : key === 'book' ? '#5a2a6a' : '#f4ead4')); if (key === 'map') { ctx.strokeStyle = '#c23b3b'; ctx.lineWidth = 4; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(-24, 14); ctx.quadraticCurveTo(0, -20, 22, 10); ctx.stroke(); ctx.setLineDash([]); } break;
    case 'crystal': poly(ctx, [[0, -44], [26, -10], [14, 40], [-14, 40], [-26, -10]]); F(g('#9fe8ff')); break;
    case 'compass': ell(ctx, 0, 0, 36, 36); F(g('#d4a53b')); poly(ctx, [[0, -28], [8, 0], [0, 28], [-8, 0]]); F('#c23b3b'); break;
    case 'magnet': ctx.lineWidth = 18; ctx.strokeStyle = OUT; ctx.beginPath(); ctx.arc(0, -4, 26, Math.PI, 0); ctx.lineTo(26, 30); ctx.moveTo(-26, -4); ctx.lineTo(-26, 30); ctx.stroke(); ctx.lineWidth = 12; ctx.strokeStyle = '#d64545'; ctx.stroke(); break;
    case 'totem': poly(ctx, [[-20, -44], [20, -44], [20, 44], [-20, 44]]); F(g('#9c6a3c')); ctx.fillStyle = OUT; ell(ctx, -8, -24, 4, 4); ctx.fill(); ell(ctx, 8, -24, 4, 4); ctx.fill(); ctx.fillRect(-10, 0, 20, 5); break;
    case 'doll': ell(ctx, 0, -22, 18, 18); F(g('#e8c8a0')); poly(ctx, [[-20, -4], [20, -4], [26, 40], [-26, 40]]); F(g('#a08a60')); break;
    case 'shell': ctx.beginPath(); ctx.moveTo(-36, 30); ctx.quadraticCurveTo(0, -60, 36, 30); ctx.closePath(); F(g('#ffd0c0')); break;
    case 'arrow': ctx.rotate(0.7); poly(ctx, [[-3, 40], [3, 40], [3, -30], [-3, -30]]); F('#9c6a3c'); poly(ctx, [[-12, -28], [12, -28], [0, -48]]); F('#d0d8e0'); break;
    case 'bell': item(ctx, 'bell', PAL.gold, 0, 0); break;
    case 'urn': ctx.beginPath(); ctx.moveTo(-18, -36); ctx.lineTo(18, -36); ctx.quadraticCurveTo(44, 0, 20, 40); ctx.lineTo(-20, 40); ctx.quadraticCurveTo(-44, 0, -18, -36); F(g('#4fc3a1')); break;
    case 'yoke': ctx.lineWidth = 12; ctx.strokeStyle = OUT; ctx.beginPath(); ctx.moveTo(-40, -10); ctx.quadraticCurveTo(0, -30, 40, -10); ctx.moveTo(-24, -14); ctx.lineTo(-24, 34); ctx.moveTo(24, -14); ctx.lineTo(24, 34); ctx.stroke(); ctx.lineWidth = 7; ctx.strokeStyle = '#9c6a3c'; ctx.stroke(); break;
    case 'key': ell(ctx, 0, -24, 16, 16); F(g('#d4a53b')); poly(ctx, [[-5, -8], [5, -8], [5, 40], [-5, 40]]); F('#d4a53b'); break;
    case 'flower': for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; ell(ctx, Math.cos(a) * 18, Math.sin(a) * 18, 14, 14); F(g('#ff7aa8')); } ell(ctx, 0, 0, 10, 10); F('#ffe27a'); break;
    case 'die': poly(ctx, [[-30, -30], [30, -30], [30, 30], [-30, 30]]); F(g('#f4f0e8')); ctx.fillStyle = OUT; for (const [x, y] of [[-14, -14], [14, 14], [0, 0], [14, -14], [-14, 14]]) { ell(ctx, x, y, 5, 5); ctx.fill(); } break;
    case 'ring': ctx.lineWidth = 14; ctx.strokeStyle = OUT; ell(ctx, 0, 6, 30, 30); ctx.stroke(); ctx.lineWidth = 9; ctx.strokeStyle = '#d4a53b'; ctx.stroke(); poly(ctx, [[0, -40], [12, -24], [-12, -24]]); F('#4fc3a1'); break;
    case 'shield': ctx.beginPath(); ctx.moveTo(-32, -36); ctx.lineTo(32, -36); ctx.lineTo(30, 8); ctx.quadraticCurveTo(0, 46, -30, 8); ctx.closePath(); F(g('#5a7ab8')); break;
    case 'fang': ctx.beginPath(); ctx.moveTo(-20, -36); ctx.quadraticCurveTo(-24, 20, 6, 44); ctx.quadraticCurveTo(14, 0, 20, -36); ctx.closePath(); F(g('#f4ead4')); break;
    case 'cog': case 'gear': ctx.lineWidth = 10; ctx.strokeStyle = OUT; ell(ctx, 0, 0, 24, 24); ctx.stroke(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 24, Math.sin(a) * 24); ctx.lineTo(Math.cos(a) * 38, Math.sin(a) * 38); ctx.stroke(); } ctx.lineWidth = 6; ctx.strokeStyle = '#b8b8c8'; ell(ctx, 0, 0, 24, 24); ctx.stroke(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 24, Math.sin(a) * 24); ctx.lineTo(Math.cos(a) * 38, Math.sin(a) * 38); ctx.stroke(); } break;
    case 'quill': item(ctx, 'quill', PAL.violet, 0, 10); break;
    case 'brick': for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { poly(ctx, [[-36 + c * 24 + (r % 2) * 8, -30 + r * 20], [-14 + c * 24 + (r % 2) * 8, -30 + r * 20], [-14 + c * 24 + (r % 2) * 8, -12 + r * 20], [-36 + c * 24 + (r % 2) * 8, -12 + r * 20]]); F(g('#b8784a')); } break;
    case 'tent': poly(ctx, [[0, -40], [40, 36], [-40, 36]]); F(g('#c23b3b')); poly(ctx, [[0, -4], [12, 36], [-12, 36]]); F('#3e2611'); break;
    case 'chest': poly(ctx, [[-36, -10], [36, -10], [36, 34], [-36, 34]]); F(g('#a5643a')); ctx.beginPath(); ctx.moveTo(-36, -10); ctx.quadraticCurveTo(0, -46, 36, -10); F(g('#c0784a')); ctx.fillStyle = '#ffd34a'; ctx.fillRect(-6, -14, 12, 16); break;
    case 'temple': poly(ctx, [[-40, -14], [0, -42], [40, -14]]); F(g('#e8d4a0')); for (let i = 0; i < 4; i++) { poly(ctx, [[-32 + i * 20, -10], [-24 + i * 20, -10], [-24 + i * 20, 30], [-32 + i * 20, 30]]); F('#f4ead4'); } break;
    case 'wave': ctx.lineWidth = 9; ctx.strokeStyle = OUT; ctx.beginPath(); for (let x = -40; x <= 40; x += 4) ctx.lineTo(x, Math.sin(x / 8) * 12); ctx.stroke(); ctx.lineWidth = 5; ctx.strokeStyle = '#4fa8e0'; ctx.stroke(); break;
    case 'portal': ell(ctx, 0, 0, 28, 40); F(rad(ctx, 0, 0, 2, 40, [[0, '#ffffff'], [0.4, '#c98aff'], [1, '#3b1a6a']])); break;
    case 'tower': poly(ctx, [[-20, 40], [20, 40], [16, -20], [-16, -20]]); F(g('#9aa8b8')); poly(ctx, [[-22, -20], [0, -46], [22, -20]]); F('#c23b3b'); break;
    case 'up': poly(ctx, [[0, -40], [34, 6], [12, 6], [12, 38], [-12, 38], [-12, 6], [-34, 6]]); F(g('#ff6a6a')); break;
    case 'drum': item(ctx, 'drum', PAL.crimson, 0, 16); break;
    case 'rest': ctx.fillStyle = '#9fe8ff'; ctx.font = 'bold 54px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('z', 0, 0); break;
    case 'walker': ell(ctx, 0, -18, 16, 16); F(g('#7a9a3d')); poly(ctx, [[-18, 0], [18, 0], [14, 40], [-14, 40]]); F(g('#4f6a28')); break;
    case 'moon': ctx.beginPath(); ctx.arc(0, 0, 34, 0.6, Math.PI * 2 - 0.6 + Math.PI * 0.2); ctx.quadraticCurveTo(-4, 0, 22, -26); F(g('#f4f0c0')); break;
    case 'sun': for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; poly(ctx, [[Math.cos(a) * 30, Math.sin(a) * 30], [Math.cos(a + 0.2) * 44, Math.sin(a + 0.2) * 44], [Math.cos(a + 0.4) * 30, Math.sin(a + 0.4) * 30]]); F('#ffd34a'); } ell(ctx, 0, 0, 26, 26); F(g('#ffe27a')); break;
    case 'eye': ell(ctx, 0, 0, 40, 24); F('#f4f0ff'); ell(ctx, 0, 0, 14, 14); F('#7d4fc2'); break;
    case 'ram': poly(ctx, [[-40, 10], [30, 10], [44, 0], [30, -10], [-40, -10]]); F(g('#9c6a3c')); break;
    case 'junk': for (let i = 0; i < 4; i++) { ctx.save(); ctx.rotate(i * 1.3); poly(ctx, [[-14, -8], [16, -6], [12, 10], [-10, 8]]); ctx.translate(i * 6, i * 4); F(g('#a5643a')); ctx.restore(); } break;
    case 'reel': poly(ctx, [[-36, -30], [36, -30], [36, 30], [-36, 30]]); F(g('#d4a53b')); ctx.fillStyle = '#fff'; ctx.fillRect(-28, -14, 56, 28); ctx.fillStyle = '#d64545'; ctx.font = 'bold 26px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('777', 0, 2); break;
    case 'cherry': ctx.lineWidth = 4; ctx.strokeStyle = '#3f8a4c'; ctx.beginPath(); ctx.moveTo(-14, 6); ctx.quadraticCurveTo(-4, -30, 10, -38); ctx.moveTo(16, 10); ctx.quadraticCurveTo(14, -20, 10, -38); ctx.stroke(); ell(ctx, -14, 16, 16, 16); F(g('#e0303a')); ell(ctx, 16, 20, 16, 16); F(g('#e0303a')); break;
    case 'bar': poly(ctx, [[-40, -16], [40, -16], [40, 16], [-40, 16]]); F(g('#2a2a30')); ctx.fillStyle = '#ffffff'; ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('BAR', 0, 2); break;
    case 'seven': ctx.font = '900 84px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 8; ctx.strokeStyle = OUT; ctx.strokeText('7', 0, 4); ctx.fillStyle = '#e0303a'; ctx.fillText('7', 0, 4); break;
    case 'drop': ctx.beginPath(); ctx.moveTo(0, -42); ctx.quadraticCurveTo(34, 10, 0, 38); ctx.quadraticCurveTo(-34, 10, 0, -42); F(g('#7a9a3d')); break;
    // map nodes
    case 'battle': ctx.rotate(0.78); poly(ctx, [[-5, 36], [5, 36], [5, -38], [0, -46], [-5, -38]]); F(g('#d0d8e0')); ctx.rotate(-1.56); poly(ctx, [[-5, 36], [5, 36], [5, -38], [0, -46], [-5, -38]]); F(g('#d0d8e0')); break;
    case 'elite': glyphBody(ctx, 'skull'); break;
    case 'boss': hat(ctx, 'horns', PAL.bone, 0, 30, 30); ell(ctx, 0, 6, 26, 26); F(g('#c23b3b')); ctx.fillStyle = '#ffe27a'; ell(ctx, -10, 2, 5, 4); ctx.fill(); ell(ctx, 10, 2, 5, 4); ctx.fill(); break;
    case 'shop': glyphBody(ctx, 'coin'); break;
    case 'forge': poly(ctx, [[-36, 0], [36, 0], [28, 14], [16, 14], [16, 36], [-16, 36], [-16, 14], [-36, 10]]); F(g('#6a6a7a')); ctx.fillStyle = rad(ctx, 0, -18, 2, 26, [[0, '#fff3a0'], [1, 'rgba(255,100,40,0)']]); ell(ctx, 0, -18, 26, 22); ctx.fill(); break;
    case 'purge': glyphBody(ctx, 'flame'); break;
    case 'mirror': ell(ctx, 0, -4, 26, 34); F(lin(ctx, -26, -38, 26, 30, [[0, '#ffffff'], [0.5, '#9fe8ff'], [1, '#2f7fb8']])); poly(ctx, [[-6, 30], [6, 30], [6, 44], [-6, 44]]); F('#d4a53b'); break;
    case 'camp': for (const s of [-1, 1]) { ctx.save(); ctx.rotate(s * 0.5); poly(ctx, [[-5, 10], [5, 10], [5, 40], [-5, 40]]); F('#7a5230'); ctx.restore(); } ctx.translate(0, -10); ctx.scale(0.7, 0.7); glyphBody(ctx, 'flame'); break;
    case 'event': ctx.fillStyle = '#ffe27a'; ctx.strokeStyle = OUT; ctx.lineWidth = 6; ctx.font = 'bold 70px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.strokeText('?', 0, 4); ctx.fillText('?', 0, 4); break;
    case 'treasure': glyphBody(ctx, 'chest'); break;
    case 'home': poly(ctx, [[-34, 0], [0, -34], [34, 0]]); F(g('#c23b3b')); poly(ctx, [[-26, 0], [26, 0], [26, 36], [-26, 36]]); F(g('#e8d4a0')); poly(ctx, [[-7, 14], [7, 14], [7, 36], [-7, 36]]); F('#5a3a1a'); break;
    default: ell(ctx, 0, 0, 30, 30); F(g(color)); break;
  }
  ctx.restore();
}
