// Renders card faces, portraits and glyphs to canvases (cached) for both the 3D board and the HTML UI.
import { paintArt, paintEnemy, paintGlyph, shade, rgba } from './painter.js';
import { RARITY_COLOR, cardDef } from '../data/cards.js';
import { GEMS } from '../data/gems.js';

export const CW = 300, CH = 420;
const cache = new Map();
const artCache = new Map();

function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

export function artCanvas(art, key = '') {
  const k = key + JSON.stringify(art);
  if (artCache.has(k)) return artCache.get(k);
  const c = mk(256, 256); paintArt(c.getContext('2d'), art, key); artCache.set(k, c); return c;
}
export function enemyCanvas(id) {
  const k = 'enemy:' + id; if (artCache.has(k)) return artCache.get(k);
  const c = mk(256, 256); paintEnemy(c.getContext('2d'), id); artCache.set(k, c); return c;
}
export function glyphCanvas(key, size = 96, ring = null) {
  const k = `g:${key}:${size}:${ring}`; if (artCache.has(k)) return artCache.get(k);
  const c = mk(size, size); const ctx = c.getContext('2d');
  if (ring) {
    const g = ctx.createRadialGradient(size * 0.4, size * 0.35, 2, size / 2, size / 2, size / 2);
    g.addColorStop(0, shade(ring, 0.35)); g.addColorStop(1, shade(ring, -0.55));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,235,170,0.8)'; ctx.stroke();
    ctx.save(); ctx.translate(size * 0.15, size * 0.15); paintGlyph(ctx, key, size * 0.7); ctx.restore();
  } else paintGlyph(ctx, key, size);
  artCache.set(k, c); return c;
}
const urlCache = new Map();
export function toURL(canvas) { if (urlCache.has(canvas)) return urlCache.get(canvas); const u = canvas.toDataURL('image/png'); urlCache.set(canvas, u); return u; }
export const glyphURL = (key, size, ring) => toURL(glyphCanvas(key, size, ring));
export const enemyURL = (id) => toURL(enemyCanvas(id));
export const artURL = (art, key) => toURL(artCanvas(art, key));

function wrap(ctx, text, maxW) {
  const words = text.split(' '); const lines = []; let line = '';
  for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line); return lines;
}
const KW = ['On Reveal:', 'Ongoing:', 'End of turn:', 'When destroyed:', 'Lingering:', 'Move.', 'Strike', 'Freeze', 'Junk', 'Hold'];

function drawText(ctx, text, x, y, w, h) {
  let size = 17;
  let lines;
  for (; size >= 11; size--) {
    ctx.font = `600 ${size}px "Trebuchet MS", "Segoe UI", sans-serif`;
    lines = wrap(ctx, text, w);
    if (lines.length * size * 1.18 <= h) break;
  }
  const lh = size * 1.18;
  let cy = y + (h - lines.length * lh) / 2 + size * 0.85;
  ctx.textAlign = 'left';
  for (const line of lines) {
    // render with keyword highlight
    const tw = ctx.measureText(line).width; let cx = x + (w - tw) / 2;
    const parts = line.split(/(On Reveal:|Ongoing:|End of turn:|When destroyed:|Lingering:|Move\.|Strike \d+|Freeze)/g);
    for (const part of parts) {
      if (!part) continue;
      const kw = KW.some((k) => part.startsWith(k));
      ctx.font = `${kw ? 800 : 600} ${size}px "Trebuchet MS", "Segoe UI", sans-serif`;
      ctx.fillStyle = kw ? '#ffd36b' : '#f2ecdf';
      ctx.fillText(part, cx, cy);
      cx += ctx.measureText(part).width;
    }
    cy += lh;
  }
}

// opts: { power, cost, plus, sockets, bonus, basePower, highlight }
export function cardCanvas(defOrId, opts = {}) {
  const def = typeof defOrId === 'string' ? cardDef(defOrId) : defOrId;
  const plus = opts.plus ? 1 : 0;
  const basePow = def.power + (plus ? (def.up?.power ?? 2) : 0) + (opts.bonus || 0) + (opts.sockets || []).reduce((a, g) => a + (GEMS[g]?.power || 0), 0);
  const power = opts.power ?? basePow;
  const baseCost = def.cost + (plus ? (def.up?.cost ?? 0) : 0) + (opts.sockets || []).reduce((a, g) => a + (GEMS[g]?.cost || 0), 0);
  const cost = opts.cost ?? Math.max(0, baseCost);
  const sockets = opts.sockets || [];
  const key = `${def.id}|${plus}|${power}|${cost}|${sockets.join(',')}|${opts.bonus || 0}|${basePow}`;
  if (cache.has(key)) return cache.get(key);
  const c = mk(CW, CH); const ctx = c.getContext('2d');
  const rc = RARITY_COLOR[def.rarity] || '#999';
  // frame
  rr(ctx, 2, 2, CW - 4, CH - 4, 20);
  const fg = ctx.createLinearGradient(0, 0, CW, CH); fg.addColorStop(0, shade(rc, 0.25)); fg.addColorStop(0.5, shade(rc, -0.35)); fg.addColorStop(1, shade(rc, 0.1));
  ctx.fillStyle = fg; ctx.fill();
  rr(ctx, 9, 9, CW - 18, CH - 18, 15); ctx.fillStyle = '#17131f'; ctx.fill();
  // art
  ctx.save(); rr(ctx, 14, 14, CW - 28, 236, 12); ctx.clip();
  const art = artCanvas(def.art, def.id);
  ctx.drawImage(art, 0, 10, 256, 220, 14, 14, CW - 28, 236);
  ctx.restore();
  rr(ctx, 14, 14, CW - 28, 236, 12); ctx.lineWidth = 3; ctx.strokeStyle = rgba('#000000', 0.6); ctx.stroke();
  // name plate
  const ng = ctx.createLinearGradient(0, 236, 0, 274); ng.addColorStop(0, '#3a2f48'); ng.addColorStop(1, '#1d1726');
  rr(ctx, 18, 238, CW - 36, 36, 8); ctx.fillStyle = ng; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = rgba(rc, 0.9); ctx.stroke();
  let ns = 22; const name = def.name + (plus ? '+' : '');
  do { ctx.font = `700 ${ns}px Georgia, "Times New Roman", serif`; ns--; } while (ctx.measureText(name).width > CW - 60 && ns > 12);
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = plus ? '#9dffb8' : '#fff4dc';
  ctx.fillText(name, CW / 2, 264);
  // text box
  rr(ctx, 18, 280, CW - 36, 104, 8); const tg = ctx.createLinearGradient(0, 280, 0, 384); tg.addColorStop(0, '#2a2236'); tg.addColorStop(1, '#1a1522'); ctx.fillStyle = tg; ctx.fill();
  ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.stroke();
  const text = def.text || (def.token ? '' : 'A steadfast ally.');
  if (text) drawText(ctx, text, 26, 284, CW - 52, 96);
  // footer: tribe + sockets
  ctx.font = '700 14px "Trebuchet MS", sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = rgba(rc, 1);
  ctx.fillText((def.tribe || '').toUpperCase(), 24, 404);
  ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillText(def.rarity === 'evolved' ? 'EVOLVED' : def.rarity?.toUpperCase?.() || '', CW - 24 - sockets.length * 22, 404);
  sockets.forEach((g, i) => {
    const x = CW - 30 - i * 22, y = 399;
    ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2);
    if (g) { const gg = ctx.createRadialGradient(x - 2, y - 3, 1, x, y, 9); gg.addColorStop(0, '#fff'); gg.addColorStop(0.35, GEMS[g]?.color || '#fff'); gg.addColorStop(1, shade(GEMS[g]?.color || '#888', -0.5)); ctx.fillStyle = gg; }
    else ctx.fillStyle = '#0b0910';
    ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#c9a85a'; ctx.stroke();
  });
  // cost gem
  ctx.beginPath(); ctx.arc(40, 40, 28, 0, Math.PI * 2);
  const cg = ctx.createRadialGradient(32, 30, 3, 40, 40, 30); cg.addColorStop(0, '#bfe6ff'); cg.addColorStop(0.45, '#3f8fe0'); cg.addColorStop(1, '#14326a');
  ctx.fillStyle = cg; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#e8d29a'; ctx.stroke();
  numberText(ctx, String(cost), 40, 52, 34, cost < baseCost ? '#9dffb8' : cost > baseCost ? '#ff9a9a' : '#ffffff');
  // power shield
  ctx.beginPath(); const px = CW - 42, py = 14;
  ctx.moveTo(px - 28, py); ctx.lineTo(px + 28, py); ctx.lineTo(px + 28, py + 34); ctx.quadraticCurveTo(px, py + 64, px - 28, py + 34); ctx.closePath();
  const pg = ctx.createLinearGradient(px, py, px, py + 60); pg.addColorStop(0, '#ffb56a'); pg.addColorStop(0.5, '#e2602b'); pg.addColorStop(1, '#6a1e08');
  ctx.fillStyle = pg; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#e8d29a'; ctx.stroke();
  numberText(ctx, String(power), px, py + 40, power >= 10 ? 30 : 34, power > basePow ? '#9dffb8' : power < basePow ? '#ff9a9a' : '#ffffff');
  cache.set(key, c);
  if (cache.size > 900) cache.delete(cache.keys().next().value);
  return c;
}

function numberText(ctx, t, x, y, size, color) {
  ctx.font = `900 ${size}px "Arial Black", Impact, sans-serif`; ctx.textAlign = 'center';
  ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(10,6,20,0.95)'; ctx.strokeText(t, x, y);
  ctx.fillStyle = color; ctx.fillText(t, x, y);
}

export function cardURL(defOrId, opts) { return toURL(cardCanvas(defOrId, opts)); }
export function instURL(inst) { return cardURL(inst.id, { plus: inst.plus, sockets: inst.sockets, bonus: inst.bonus }); }

// Location banner art (used on the board)
export function locationCanvas(loc, w = 512, h = 160) {
  const k = `loc:${loc?.id || 'home'}:${w}`; if (artCache.has(k)) return artCache.get(k);
  const c = mk(w, h); const ctx = c.getContext('2d');
  const art = loc ? artCanvas({ f: 'none', bg: loc.art.bg, pal: loc.art.pal }, 'loc' + loc.id) : null;
  rr(ctx, 2, 2, w - 4, h - 4, 18);
  ctx.save(); ctx.clip();
  if (art) ctx.drawImage(art, 0, 60, 256, 100, 0, 0, w, h);
  else { const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#5a3a8a'); g.addColorStop(1, '#2a1a4a'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }
  const sh = ctx.createLinearGradient(0, 0, 0, h); sh.addColorStop(0, 'rgba(0,0,0,0.05)'); sh.addColorStop(1, 'rgba(0,0,0,0.75)'); ctx.fillStyle = sh; ctx.fillRect(0, 0, w, h);
  ctx.restore();
  rr(ctx, 2, 2, w - 4, h - 4, 18); ctx.lineWidth = 4; ctx.strokeStyle = loc ? '#e8d29a' : '#c98aff'; ctx.stroke();
  artCache.set(k, c); return c;
}
