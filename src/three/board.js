// three.js battle board: lanes, locations, cards, enemy machines, particles.
import * as THREE from 'three';
import { cardCanvas, enemyCanvas, locationCanvas, glyphCanvas } from '../art/cardRender.js';

const LANE_X = [-3.7, 0, 3.7];
const CARD_W = 1.32, CARD_H = 1.85;
const ENEMY_Z = -4.9;
const texCache = new WeakMap();

function texOf(canvas) {
  let t = texCache.get(canvas);
  if (!t) { t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; texCache.set(canvas, t); }
  return t;
}
function textCanvas(text, { size = 96, color = '#fff', stroke = '#120a1c', w = 256, h = 128, font = '900 {s}px "Arial Black", Impact, sans-serif', bg = null } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const ctx = c.getContext('2d');
  if (bg) { ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(4, 4, w - 8, h - 8, h / 2.4); ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(255,230,160,0.9)'; ctx.stroke(); }
  ctx.font = font.replace('{s}', size); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = size / 7; ctx.strokeStyle = stroke; ctx.strokeText(text, w / 2, h / 2 + size * 0.05);
  ctx.fillStyle = color; ctx.fillText(text, w / 2, h / 2 + size * 0.05);
  return c;
}
function tableTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 1024; const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(512, 560, 50, 512, 512, 760); g.addColorStop(0, '#3a2c46'); g.addColorStop(1, '#0d0a14');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 2600; i++) { ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.03})`; ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 2, 2); }
  ctx.strokeStyle = 'rgba(232,210,154,0.08)'; ctx.lineWidth = 3;
  for (let r = 120; r < 700; r += 90) { ctx.beginPath(); ctx.arc(512, 520, r, 0, Math.PI * 2); ctx.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function laneTexture(home) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 768; const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 768); g.addColorStop(0, home ? '#3b2460' : '#2a2034'); g.addColorStop(0.45, home ? '#24163c' : '#1b1424'); g.addColorStop(1, home ? '#3a2a5a' : '#271f30');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 768);
  ctx.strokeStyle = home ? 'rgba(201,138,255,0.6)' : 'rgba(232,210,154,0.45)'; ctx.lineWidth = 6; ctx.strokeRect(6, 6, 244, 756);
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 2; for (let y = 30; y < 768; y += 40) { ctx.beginPath(); ctx.moveTo(14, y); ctx.lineTo(242, y); ctx.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export class Board {
  constructor(renderer) {
    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x0a0712, 22, 40);
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    this.cards = new Map(); // bid -> mesh
    this.enemy = [];
    this.fx = [];
    this.particles = [];
    this.last = performance.now();
    this.time = 0;
    this.build();
  }

  build() {
    const s = this.scene;
    s.add(new THREE.HemisphereLight(0xbfb8ff, 0x1a1020, 1.1));
    const key = new THREE.DirectionalLight(0xfff0d8, 1.6); key.position.set(3, 12, 6); s.add(key);
    this.lanePts = LANE_X.map((x, i) => { const l = new THREE.PointLight(i === 1 ? 0xb07dff : 0xffb070, 6, 9, 1.6); l.position.set(x, 2.2, 0.8); s.add(l); return l; });
    const red = new THREE.PointLight(0xff4060, 8, 12, 1.6); red.position.set(0, 3, -5); s.add(red);
    // table
    const table = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ map: tableTexture(), roughness: 0.9 }));
    table.rotation.x = -Math.PI / 2; table.position.y = -0.05; s.add(table);
    // lanes
    this.laneMeshes = [];
    this.locMeshes = [];
    this.slotFrames = [[], [], []];
    LANE_X.forEach((x, i) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.12, 11.4), [
        new THREE.MeshStandardMaterial({ color: 0x1a1222 }), new THREE.MeshStandardMaterial({ color: 0x1a1222 }),
        new THREE.MeshStandardMaterial({ map: laneTexture(i === 1), roughness: 0.75 }), new THREE.MeshStandardMaterial({ color: 0x120c18 }),
        new THREE.MeshStandardMaterial({ color: 0x1a1222 }), new THREE.MeshStandardMaterial({ color: 0x1a1222 }),
      ]);
      m.position.set(x, 0, -0.6); m.userData.lane = i; s.add(m); this.laneMeshes.push(m);
      const loc = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.0), new THREE.MeshBasicMaterial({ transparent: true }));
      loc.rotation.x = -Math.PI / 2.6; loc.position.set(x, 0.55, -1.6); loc.userData.lane = i; s.add(loc); this.locMeshes.push(loc);
    });
    // particles: ambient embers
    const g = new THREE.BufferGeometry(); const n = 160; const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 16; pos[i * 3 + 1] = Math.random() * 6; pos[i * 3 + 2] = (Math.random() - 0.5) * 14; }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.embers = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffc07a, size: 0.06, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.add(this.embers);
    this.raycaster = new THREE.Raycaster();
  }

  resize(w, h) {
    this.w = w; this.h = h;
    this.camera.aspect = w / h;
    // fit the board: frame the region x∈[-5.6,5.6], z∈[-6.4, 5.2]
    const aspect = w / h;
    this.camera.fov = aspect < 0.8 ? 52 : 40;
    const dir = new THREE.Vector3(0, 1.0, aspect < 0.8 ? 0.34 : 0.62).normalize();
    const target = new THREE.Vector3(0, 0, aspect < 0.8 ? -0.2 : -0.6);
    const pts = [[-5.5, 0, -6.4], [5.5, 0, -6.4], [-5.5, 0, 5.0], [5.5, 0, 5.0], [0, 2.6, ENEMY_Z]].map((p) => new THREE.Vector3(...p));
    let lo = 4, hi = 60;
    for (let it = 0; it < 30; it++) {
      const mid = (lo + hi) / 2;
      this.camera.position.copy(target).addScaledVector(dir, mid); this.camera.lookAt(target); this.camera.updateProjectionMatrix(); this.camera.updateMatrixWorld();
      const ok = pts.every((p) => { const v = p.clone().project(this.camera); return Math.abs(v.x) < 0.97 && v.y < 0.97 && v.y > -0.99; });
      if (ok) hi = mid; else lo = mid;
    }
    this.camera.position.copy(target).addScaledVector(dir, hi); this.camera.lookAt(target); this.camera.updateProjectionMatrix();
  }

  // project a world point to canvas pixels
  toScreen(v) { const p = v.clone().project(this.camera); return { x: (p.x * 0.5 + 0.5) * this.w, y: (-p.y * 0.5 + 0.5) * this.h, z: p.z }; }
  laneAnchor(lane, side) { return side === 'enemy' ? new THREE.Vector3(LANE_X[lane], 2.6, ENEMY_Z + 0.4) : new THREE.Vector3(LANE_X[lane], 0.3, 1.6); }
  scoreAnchor(lane, side) { return side === 'enemy' ? new THREE.Vector3(LANE_X[lane], 0.5, -2.85) : new THREE.Vector3(LANE_X[lane], 0.5, -0.35); }

  slotPos(b, lane, slot) {
    const cap = b.lanes[lane].cap;
    const cols = 2, rows = Math.ceil(cap / cols);
    const r = Math.floor(slot / cols), c = slot % cols;
    const zStart = 0.55, zStep = rows >= 3 ? 1.62 : 2.0;
    const sc = rows >= 3 ? 0.86 : 1;
    return { x: LANE_X[lane] + (c === 0 ? -0.74 : 0.74) * sc, z: zStart + r * zStep + CARD_H / 2 * sc, s: sc };
  }

  // ---- sync with battle state ----
  setup(b) {
    for (const m of this.cards.values()) this.scene.remove(m);
    this.cards.clear();
    for (const e of this.enemy) for (const o of e.objs) this.scene.remove(o);
    this.enemy = [];
    this.b = b;
    b.lanes.forEach((lane, i) => {
      const lc = locationCanvas(lane.loc);
      const lm = this.locMeshes[i]; lm.material.map = texOf(lc); lm.material.needsUpdate = true;
      this.lanePts[i].color.set(lane.isHome ? 0xb07dff : 0xffb070);
      // slot frames
      for (const f of this.slotFrames[i]) this.scene.remove(f);
      this.slotFrames[i] = [];
      for (let s = 0; s < lane.cap; s++) {
        const p = this.slotPos(b, i, s);
        const f = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W * p.s * 1.04, CARD_H * p.s * 1.04), new THREE.MeshBasicMaterial({ color: lane.isHome ? 0x8a5ad0 : 0xe8d29a, transparent: true, opacity: 0.12 }));
        f.rotation.x = -Math.PI / 2; f.position.set(p.x, 0.07, p.z); this.scene.add(f); this.slotFrames[i].push(f);
      }
      this.buildEnemy(i, lane);
    });
    this.sync();
  }

  buildEnemy(i, lane) {
    const e = { objs: [], kind: lane.enemy.id, lane: i, shown: lane.enemy.display(this.b, lane), walkers: [] };
    const x = LANE_X[i];
    // pedestal
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.5, 0.3, 32), new THREE.MeshStandardMaterial({ color: 0x2a1a2a, roughness: 0.6, metalness: 0.3 }));
    ped.position.set(x, 0.1, ENEMY_Z); this.scene.add(ped); e.objs.push(ped);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.05, 8, 48), new THREE.MeshBasicMaterial({ color: 0xff4060 }));
    ring.rotation.x = Math.PI / 2; ring.position.set(x, 0.27, ENEMY_Z); this.scene.add(ring); e.objs.push(ring); e.ring = ring;
    // portrait billboard in a frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.25, 2.25, 0.12), new THREE.MeshStandardMaterial({ color: 0x8a6a2a, metalness: 0.7, roughness: 0.35 }));
    const portrait = new THREE.Mesh(new THREE.PlaneGeometry(2.05, 2.05), new THREE.MeshBasicMaterial({ map: texOf(enemyCanvas(lane.enemy.id)) }));
    portrait.position.z = 0.07; frame.add(portrait);
    frame.position.set(x, 1.55, ENEMY_Z - 0.2); frame.rotation.x = -0.25; this.scene.add(frame); e.objs.push(frame); e.frame = frame;
    // score badge
    const score = new THREE.Sprite(new THREE.SpriteMaterial({ map: texOf(textCanvas('0', { bg: '#6a1424', size: 84 })), depthTest: false }));
    score.scale.set(1.35, 0.68, 1); score.position.copy(this.scoreAnchor(i, 'enemy')); score.renderOrder = 10; this.scene.add(score); e.objs.push(score); e.score = score;
    // kind-specific
    if (e.kind === 'factory' || e.kind === 'engine') {
      const gear = new THREE.Group();
      const torus = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.12, 8, 24), new THREE.MeshStandardMaterial({ color: 0xb8b8c8, metalness: 0.8, roughness: 0.3 }));
      gear.add(torus);
      for (let k = 0; k < 8; k++) { const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.2), torus.material); const a = (k / 8) * Math.PI * 2; tooth.position.set(Math.cos(a) * 0.58, Math.sin(a) * 0.58, 0); tooth.rotation.z = a; gear.add(tooth); }
      gear.position.set(x + 1.2, 2.7, ENEMY_Z - 0.1); this.scene.add(gear); e.objs.push(gear); e.gear = gear;
    }
    if (e.kind === 'reel') {
      e.reels = [-0.6, 0, 0.6].map((dx) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.55), new THREE.MeshBasicMaterial({ transparent: true })); m.position.set(x + dx, 0.7, -3.25); m.rotation.x = -0.9; this.scene.add(m); e.objs.push(m); return m; });
    }
    if (e.kind === 'metronome' || e.kind === 'baton') {
      e.pips = [];
      const n = this.b.maxTurns;
      for (let k = 0; k < n; k++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 16), new THREE.MeshStandardMaterial({ color: 0x442233, emissive: 0x000000 })); m.position.set(x - 1.2 + (k * 2.4) / (n - 1), 0.15, -3.25); this.scene.add(m); e.objs.push(m); e.pips.push(m); }
    }
    if (e.kind === 'nightfall') {
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 24, 16), new THREE.MeshStandardMaterial({ color: 0xffe9a0, emissive: 0x806020 }));
      orb.position.set(x + 1.15, 2.9, ENEMY_Z); this.scene.add(orb); e.objs.push(orb); e.orb = orb;
    }
    if (e.kind === 'siege' || e.kind === 'engine_ram') {
      const ret = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.85, 32), new THREE.MeshBasicMaterial({ color: 0xff3040, transparent: true, opacity: 0.0, side: THREE.DoubleSide, depthTest: false }));
      ret.rotation.x = -Math.PI / 2; ret.renderOrder = 12; this.scene.add(ret); e.objs.push(ret); e.reticle = ret;
    }
    this.enemy[i] = e;
  }

  makeWalker(x) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x6a9a3d, roughness: 0.6 });
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 10), mat); body.position.y = 0.25; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 8), new THREE.MeshStandardMaterial({ color: 0x8aba5a })); head.position.y = 0.6; g.add(head);
    const eyeM = new THREE.MeshBasicMaterial({ color: 0xffe27a });
    for (const s of [-1, 1]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), eyeM); eye.position.set(s * 0.06, 0.63, 0.13); g.add(eye); }
    const hp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texOf(textCanvas('1', { size: 80, color: '#ffd0d0' })), depthTest: false }));
    hp.scale.set(0.6, 0.3, 1); hp.position.y = 1.0; hp.renderOrder = 11; g.add(hp); g.userData.hp = hp; g.userData.hpVal = null;
    g.position.set(x, 0.1, ENEMY_Z + 0.8); g.scale.setScalar(1.5);
    this.scene.add(g); return g;
  }

  sync() {
    const b = this.b; if (!b) return;
    const live = new Set();
    for (const lane of b.lanes) for (const bc of lane.slots) {
      if (!bc) continue;
      live.add(bc.bid);
      let m = this.cards.get(bc.bid);
      const cv = cardCanvas(bc.def, { power: b.power(bc), plus: bc.inst?.plus, sockets: bc.inst?.sockets || [], bonus: bc.inst?.bonus, cost: bc.def.cost + (bc.inst?.plus ? (bc.def.up?.cost ?? 0) : 0) });
      if (!m) {
        m = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W, CARD_H), new THREE.MeshStandardMaterial({ map: texOf(cv), roughness: 0.5, metalness: 0.05, transparent: true }));
        m.rotation.x = -Math.PI / 2;
        m.position.set(LANE_X[bc.lane], 3.2, 7.5);
        m.scale.setScalar(1.6);
        m.userData = { bid: bc.bid, born: this.time };
        const shadow = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W * 1.1, CARD_H * 1.1), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
        shadow.position.z = -0.02; m.add(shadow);
        this.scene.add(m); this.cards.set(bc.bid, m);
      } else if (m.material.map !== texOf(cv)) { m.material.map = texOf(cv); m.material.needsUpdate = true; }
      const p = this.slotPos(b, bc.lane, bc.slot);
      m.userData.target = new THREE.Vector3(p.x, 0.1, p.z);
      m.userData.scale = p.s;
      m.userData.lane = bc.lane;
      m.userData.movable = b.canMoveCard(bc);
    }
    for (const [bid, m] of this.cards) if (!live.has(bid)) { this.burst(m.position.clone(), 0xff7040, 30); this.scene.remove(m); this.cards.delete(bid); }
    // enemies
    b.lanes.forEach((lane, i) => {
      const e = this.enemy[i]; if (!e) return;
      const v = lane.enemy.view(b, lane);
      const val = lane.enemy.id === 'commission' ? (v.met ? '✔' : '?') : String(lane.enemy.display(b, lane));
      if (e.scoreText !== val) { e.scoreText = val; e.score.material.map = texOf(textCanvas(val, { bg: lane.enemy.id === 'commission' ? (v.met ? '#1f6a3a' : '#4a2a6a') : '#6a1424', size: 84 })); e.score.material.needsUpdate = true; e.pulse = 1; }
      e.frozen = lane.enemy.frozen > 0;
      if (e.reels && v.spin) v.spin.forEach((k, j) => { const key = 'sym' + k; if (e.reels[j].userData.k !== key) { e.reels[j].userData.k = key; e.reels[j].material.map = texOf(glyphCanvas(k === 'skull' ? 'skull' : k === 'cherry' ? 'cherry' : k === 'bell' ? 'bell' : k === 'bar' ? 'bar' : 'seven', 96, '#f4ead4')); e.reels[j].material.needsUpdate = true; e.reels[j].userData.spin = 1; } });
      if (e.pips) e.pips.forEach((pp, k) => { const cur = k === b.turn - 1; const val2 = v.beats ? v.beats[k] : 1; pp.material.emissive.set(cur ? 0xff3050 : val2 ? 0x401018 : 0x000000); pp.scale.y = 1 + (val2 || 0) * 0.6; pp.position.y = 0.1 + (val2 || 0) * 0.03; });
      if (e.gear) e.gearSpeed = 0.3 + (v.rate || 0) * 0.25;
      if (e.orb) { e.orb.material.color.set(v.night ? 0xc8d8ff : 0xffe27a); e.orb.material.emissive.set(v.night ? 0x203060 : 0x806020); }
      if (e.reticle) {
        const t = v.target != null ? this.cards.get(v.target) : null;
        e.reticleTarget = t || null; e.reticle.material.opacity = t ? 0.9 : 0;
      }
      if (v.walkers) {
        while (e.walkers.length < v.walkers.length) e.walkers.push(this.makeWalker(LANE_X[i]));
        while (e.walkers.length > v.walkers.length) { const w = e.walkers.pop(); this.burst(w.position.clone(), 0x8aba5a, 16); this.scene.remove(w); }
        v.walkers.forEach((wv, k) => {
          const w = e.walkers[k];
          const z = ENEMY_Z + 1.4 + wv.step * 0.75;
          const off = (k % 3 - 1) * 0.7;
          w.userData.target = new THREE.Vector3(LANE_X[i] + off, 0.1, z);
          if (w.userData.hpVal !== wv.hp) { w.userData.hpVal = wv.hp; w.userData.hp.material.map = texOf(textCanvas(String(wv.hp), { size: 80, color: '#ffd0d0' })); w.userData.hp.material.needsUpdate = true; }
        });
      }
    });
  }

  // ---- interaction ----
  pick(nx, ny) {
    this.raycaster.setFromCamera(new THREE.Vector2(nx, ny), this.camera);
    const cardHits = this.raycaster.intersectObjects([...this.cards.values()], false);
    if (cardHits.length) return { type: 'card', bid: cardHits[0].object.userData.bid, lane: cardHits[0].object.userData.lane };
    const lh = this.raycaster.intersectObjects([...this.laneMeshes, ...this.locMeshes, ...this.enemy.map((e) => e.frame)], false);
    if (lh.length) {
      const o = lh[0].object; if (o.userData.lane != null) return { type: 'lane', lane: o.userData.lane };
      const idx = this.enemy.findIndex((e) => e.frame === o); if (idx >= 0) return { type: 'enemy', lane: idx };
    }
    // fallback by x
    const p = new THREE.Vector3(); this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p);
    if (p) { const lane = p.x < -1.85 ? 0 : p.x > 1.85 ? 2 : 1; return { type: 'lane', lane, z: p.z }; }
    return null;
  }
  highlightLanes(valid) { this.laneMeshes.forEach((m, i) => { m.userData.hl = valid ? valid[i] : null; }); }

  // ---- fx ----
  burst(pos, color, n = 24, speed = 3) {
    const g = new THREE.BufferGeometry(); const p = new Float32Array(n * 3); const v = [];
    for (let i = 0; i < n; i++) { p.set([pos.x, pos.y + 0.2, pos.z], i * 3); v.push(new THREE.Vector3((Math.random() - 0.5) * speed, Math.random() * speed, (Math.random() - 0.5) * speed)); }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ color, size: 0.14, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    pts.userData = { v, life: 0.9, age: 0 }; this.scene.add(pts); this.particles.push(pts);
  }
  strike(lane, n) {
    const from = new THREE.Vector3(LANE_X[lane], 0.8, 0.4);
    const to = new THREE.Vector3(LANE_X[lane], 1.5, ENEMY_Z + 0.2);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.16 + Math.min(n, 10) * 0.02, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfff0a0 }));
    const glow = new THREE.PointLight(0xffd070, 6, 4); orb.add(glow);
    orb.position.copy(from); this.scene.add(orb);
    this.fx.push({ obj: orb, from, to, t: 0, dur: 0.35, done: () => { this.burst(to, 0xffe27a, 28, 4); const e = this.enemy[lane]; if (e) e.shake = 0.4; } });
  }
  freeze(lane) { const e = this.enemy[lane]; if (e) { this.burst(new THREE.Vector3(LANE_X[lane], 1.4, ENEMY_Z + 0.3), 0x9fe8ff, 40, 3); } }
  egain(lane) { const e = this.enemy[lane]; if (e) { e.pulse = 1; this.burst(new THREE.Vector3(LANE_X[lane], 0.6, -2.4), 0xff4060, 14, 2); } }
  buff(bid, n) { const m = this.cards.get(bid); if (m) this.burst(m.position.clone(), n > 0 ? 0x7dffb0 : 0xff6060, 12, 1.6); }
  playFx(bid) { const m = this.cards.get(bid); if (m) m.userData.born = this.time; }

  // ---- frame ----
  update() {
    const now = performance.now(); const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now; this.time += dt;
    const k = 1 - Math.pow(0.0008, dt);
    for (const m of this.cards.values()) {
      const t = m.userData.target; if (!t) continue;
      const age = this.time - m.userData.born;
      const lift = age < 0.5 ? Math.sin(age / 0.5 * Math.PI) * 0.8 : 0;
      m.position.x += (t.x - m.position.x) * k; m.position.z += (t.z - m.position.z) * k; m.position.y += (t.y + lift - m.position.y) * k;
      const s = m.userData.scale * (m.userData.hover ? 1.08 : 1);
      m.scale.setScalar(m.scale.x + (s - m.scale.x) * k);
      m.rotation.z = Math.sin(this.time * 1.3 + m.userData.bid) * 0.012;
    }
    for (const e of this.enemy) {
      if (!e) continue;
      e.pulse = Math.max(0, (e.pulse || 0) - dt * 2.5);
      const s = 1 + e.pulse * 0.35; e.score.scale.set(1.35 * s, 0.68 * s, 1);
      e.shake = Math.max(0, (e.shake || 0) - dt);
      e.frame.position.x = LANE_X[e.lane] + Math.sin(this.time * 60) * e.shake * 0.12;
      e.frame.position.y = 1.55 + Math.sin(this.time * 1.4 + e.lane) * 0.06;
      e.ring.material.color.set(e.frozen ? 0x9fe8ff : 0xff4060);
      e.ring.scale.setScalar(1 + Math.sin(this.time * 3 + e.lane) * 0.03);
      if (e.gear) e.gear.rotation.z -= dt * (e.gearSpeed || 0.3) * 3;
      if (e.reels) for (const r of e.reels) { r.userData.spin = Math.max(0, (r.userData.spin || 0) - dt * 2); r.rotation.y = r.userData.spin * Math.PI * 4; }
      if (e.reticle) { const t = e.reticleTarget; if (t) { e.reticle.position.set(t.position.x, 0.25, t.position.z); e.reticle.rotation.z += dt * 2; e.reticle.scale.setScalar(1 + Math.sin(this.time * 6) * 0.08); } }
      for (const w of e.walkers) { const t = w.userData.target; if (t) { w.position.lerp(t, k * 0.6); w.position.y = 0.1 + Math.abs(Math.sin(this.time * 8 + t.x)) * 0.08; } }
      if (e.orb) e.orb.position.y = 2.9 + Math.sin(this.time) * 0.1;
    }
    this.laneMeshes.forEach((m, i) => {
      const hl = m.userData.hl; const mat = m.material[2];
      mat.emissive = mat.emissive || new THREE.Color();
      mat.emissive.set(hl === true ? 0x2a4a20 : hl === false ? 0x300a0a : 0x000000);
    });
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i]; f.t += dt / f.dur;
      const t = Math.min(1, f.t);
      f.obj.position.lerpVectors(f.from, f.to, t); f.obj.position.y += Math.sin(t * Math.PI) * 1.5;
      if (f.t >= 1) { this.scene.remove(f.obj); f.done?.(); this.fx.splice(i, 1); }
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]; p.userData.age += dt;
      const arr = p.geometry.attributes.position.array;
      p.userData.v.forEach((v, j) => { v.y -= dt * 5; arr[j * 3] += v.x * dt; arr[j * 3 + 1] += v.y * dt; arr[j * 3 + 2] += v.z * dt; });
      p.geometry.attributes.position.needsUpdate = true;
      p.material.opacity = 1 - p.userData.age / p.userData.life;
      if (p.userData.age > p.userData.life) { this.scene.remove(p); p.geometry.dispose(); this.particles.splice(i, 1); }
    }
    const ep = this.embers.geometry.attributes.position.array;
    for (let i = 0; i < ep.length; i += 3) { ep[i + 1] += dt * 0.25; if (ep[i + 1] > 6) ep[i + 1] = 0; ep[i] += Math.sin(this.time + i) * dt * 0.05; }
    this.embers.geometry.attributes.position.needsUpdate = true;
    this.renderer.render(this.scene, this.camera);
  }
}
