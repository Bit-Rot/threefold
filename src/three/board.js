// three.js battle board: three lanes, each with your side (near) and the opponent's side (far).
import * as THREE from 'three';
import { cardCanvas, enemyCanvas, locationCanvas } from '../art/cardRender.js';

const LANE_X = [-3.7, 0, 3.7];
const CARD_W = 1.32, CARD_H = 1.85;
const PORTRAIT_Z = -6.9;
const texCache = new WeakMap();

function texOf(canvas) {
  let t = texCache.get(canvas);
  if (!t) { t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; texCache.set(canvas, t); }
  return t;
}
function tableTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 1024; const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(512, 512, 50, 512, 512, 760); g.addColorStop(0, '#3a2c46'); g.addColorStop(1, '#0d0a14');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 2600; i++) { ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.03})`; ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 2, 2); }
  ctx.strokeStyle = 'rgba(232,210,154,0.08)'; ctx.lineWidth = 3;
  for (let r = 120; r < 700; r += 90) { ctx.beginPath(); ctx.arc(512, 512, r, 0, Math.PI * 2); ctx.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function laneTexture(home) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 1024; const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 1024);
  g.addColorStop(0, '#3a1420'); g.addColorStop(0.46, '#1b1424'); g.addColorStop(0.54, '#1b1424'); g.addColorStop(1, home ? '#3b2460' : '#2a2034');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 1024);
  ctx.strokeStyle = home ? 'rgba(201,138,255,0.6)' : 'rgba(232,210,154,0.45)'; ctx.lineWidth = 6; ctx.strokeRect(6, 6, 244, 1012);
  ctx.strokeStyle = 'rgba(255,90,110,0.35)'; ctx.strokeRect(12, 12, 232, 470);
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 2; for (let y = 30; y < 1024; y += 40) { ctx.beginPath(); ctx.moveTo(14, y); ctx.lineTo(242, y); ctx.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export class Board {
  constructor(renderer) {
    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x0a0712, 24, 44);
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    this.cards = new Map();
    this.fx = [];
    this.particles = [];
    this.last = performance.now();
    this.time = 0;
    this.build();
  }

  build() {
    const s = this.scene;
    s.add(new THREE.HemisphereLight(0xbfb8ff, 0x1a1020, 1.15));
    const key = new THREE.DirectionalLight(0xfff0d8, 1.5); key.position.set(3, 12, 6); s.add(key);
    this.lanePts = LANE_X.map((x, i) => { const l = new THREE.PointLight(i === 1 ? 0xb07dff : 0xffb070, 5, 9, 1.6); l.position.set(x, 2.2, 2.6); s.add(l); return l; });
    const red = new THREE.PointLight(0xff4060, 7, 12, 1.6); red.position.set(0, 3, -4.5); s.add(red);
    const table = new THREE.Mesh(new THREE.PlaneGeometry(44, 44), new THREE.MeshStandardMaterial({ map: tableTexture(), roughness: 0.9 }));
    table.rotation.x = -Math.PI / 2; table.position.y = -0.05; s.add(table);
    this.laneMeshes = []; this.locMeshes = []; this.slotFrames = [[], [], []]; this.locks = [];
    LANE_X.forEach((x, i) => {
      const side = new THREE.MeshStandardMaterial({ color: 0x1a1222 });
      const m = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.12, 10.8), [side, side, new THREE.MeshStandardMaterial({ map: laneTexture(i === 1), roughness: 0.75 }), side, side, side]);
      m.position.set(x, 0, 0); m.userData.lane = i; s.add(m); this.laneMeshes.push(m);
      const loc = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.0), new THREE.MeshBasicMaterial({ transparent: true }));
      loc.rotation.x = -Math.PI / 2.4; loc.position.set(x, 0.4, 0); loc.userData.lane = i; s.add(loc); this.locMeshes.push(loc);
      this.locks.push([0, 1].map((sd) => {
        const lk = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 4.3), new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0, depthWrite: false }));
        lk.rotation.x = -Math.PI / 2; lk.position.set(x, 0.09, sd === 0 ? 3.1 : -3.1); s.add(lk); return lk;
      }));
    });
    this.portraitFrame = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.5, 0.14), new THREE.MeshStandardMaterial({ color: 0x8a6a2a, metalness: 0.7, roughness: 0.35 }));
    this.portrait = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.3), new THREE.MeshBasicMaterial());
    this.portrait.position.z = 0.08; this.portraitFrame.add(this.portrait);
    this.portraitFrame.position.set(0, 1.6, PORTRAIT_Z); this.portraitFrame.rotation.x = -0.3; s.add(this.portraitFrame);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 0.3, 32), new THREE.MeshStandardMaterial({ color: 0x2a1a2a, roughness: 0.6, metalness: 0.3 }));
    ped.position.set(0, 0.1, PORTRAIT_Z + 0.2); s.add(ped);
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(1.62, 0.05, 8, 48), new THREE.MeshBasicMaterial({ color: 0xff4060 }));
    this.ring.rotation.x = Math.PI / 2; this.ring.position.set(0, 0.27, PORTRAIT_Z + 0.2); s.add(this.ring);
    const g = new THREE.BufferGeometry(); const n = 160; const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 16; pos[i * 3 + 1] = Math.random() * 6; pos[i * 3 + 2] = (Math.random() - 0.5) * 16; }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.embers = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffc07a, size: 0.06, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.add(this.embers);
    this.raycaster = new THREE.Raycaster();
  }

  resize(w, h) {
    this.w = w; this.h = h;
    const aspect = w / h;
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 0.8 ? 50 : 40;
    const dir = new THREE.Vector3(0, 1.0, aspect < 0.8 ? 0.3 : 0.4).normalize();
    const target = new THREE.Vector3(0, 0, aspect < 0.8 ? -0.6 : -0.9);
    const pts = [[-5.5, 0, -5.6], [5.5, 0, -5.6], [-5.5, 0, 5.5], [5.5, 0, 5.5], [0, 3.0, PORTRAIT_Z]].map((p) => new THREE.Vector3(...p));
    let lo = 4, hi = 70;
    for (let it = 0; it < 30; it++) {
      const mid = (lo + hi) / 2;
      this.camera.position.copy(target).addScaledVector(dir, mid); this.camera.lookAt(target); this.camera.updateProjectionMatrix(); this.camera.updateMatrixWorld();
      const ok = pts.every((p) => { const v = p.clone().project(this.camera); return Math.abs(v.x) < 0.98 && v.y < 0.98 && v.y > -0.99; });
      if (ok) hi = mid; else lo = mid;
    }
    this.camera.position.copy(target).addScaledVector(dir, hi); this.camera.lookAt(target); this.camera.updateProjectionMatrix();
  }

  toScreen(v) { const p = v.clone().project(this.camera); return { x: (p.x * 0.5 + 0.5) * this.w, y: (-p.y * 0.5 + 0.5) * this.h }; }
  totalAnchor(lane, side) { return new THREE.Vector3(LANE_X[lane], 0.3, side === 0 ? 0.95 : -0.95); }
  labelAnchor(lane) { return new THREE.Vector3(LANE_X[lane], 0.4, 0); }
  floatAnchor(lane, side) { return new THREE.Vector3(LANE_X[lane], 0.6, side === 0 ? 2.6 : -2.6); }
  portraitAnchor() { return new THREE.Vector3(0, 0.2, PORTRAIT_Z + 1.5); }

  slotPos(b, lane, side, slot) {
    const cap = b.lanes[lane].cap[side];
    const rows = Math.ceil(cap / 2);
    const r = Math.floor(slot / 2), c = slot % 2;
    const sc = rows >= 3 ? 0.8 : 1;
    const zStep = rows >= 3 ? 1.55 : 1.98;
    const z = 1.45 + (CARD_H / 2) * sc + r * zStep;
    return { x: LANE_X[lane] + (c === 0 ? -0.74 : 0.74) * sc, z: side === 0 ? z : -z, s: sc };
  }

  setup(b) {
    for (const m of this.cards.values()) this.scene.remove(m);
    this.cards.clear();
    this.b = b;
    this.portrait.material.map = texOf(enemyCanvas(b.opp?.portrait || 'tide')); this.portrait.material.needsUpdate = true;
    b.lanes.forEach((lane, i) => {
      const lm = this.locMeshes[i]; lm.material.map = texOf(locationCanvas(lane.loc)); lm.material.needsUpdate = true;
      this.lanePts[i].color.set(lane.isHome ? 0xb07dff : 0xffb070);
      for (const f of this.slotFrames[i]) this.scene.remove(f);
      this.slotFrames[i] = [];
      for (const side of [0, 1]) for (let s = 0; s < lane.cap[side]; s++) {
        const p = this.slotPos(b, i, side, s);
        const f = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W * p.s * 1.04, CARD_H * p.s * 1.04), new THREE.MeshBasicMaterial({ color: side ? 0xff6080 : lane.isHome ? 0x8a5ad0 : 0xe8d29a, transparent: true, opacity: 0.1 }));
        f.rotation.x = -Math.PI / 2; f.position.set(p.x, 0.07, p.z); this.scene.add(f); this.slotFrames[i].push(f);
      }
    });
    this.sync();
  }

  sync() {
    const b = this.b; if (!b) return;
    const live = new Set();
    for (const lane of b.lanes) for (const side of [0, 1]) for (const bc of lane.slotsBy[side]) {
      if (!bc) continue;
      live.add(bc.bid);
      let m = this.cards.get(bc.bid);
      const cv = cardCanvas(bc.def, { power: bc.revealed ? b.power(bc) : undefined, plus: bc.inst?.plus, sockets: bc.inst?.sockets, bonus: bc.inst?.bonus });
      if (!m) {
        m = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W, CARD_H), new THREE.MeshStandardMaterial({ map: texOf(cv), roughness: 0.5, transparent: true }));
        m.rotation.x = -Math.PI / 2;
        if (side === 0) m.position.set(LANE_X[bc.lane], 3.2, 8); else m.position.set(0, 2.2, PORTRAIT_Z);
        m.scale.setScalar(side === 0 ? 1.5 : 0.4);
        m.userData = { bid: bc.bid, born: this.time };
        const shadow = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W * 1.1, CARD_H * 1.1), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
        shadow.position.z = -0.02; m.add(shadow);
        this.scene.add(m); this.cards.set(bc.bid, m);
      } else if (m.material.map !== texOf(cv)) { m.material.map = texOf(cv); m.material.needsUpdate = true; }
      const p = this.slotPos(b, bc.lane, side, bc.slot);
      m.userData.target = new THREE.Vector3(p.x, bc.revealed ? 0.1 : 0.45, p.z);
      m.userData.scale = p.s;
      m.userData.lane = bc.lane; m.userData.side = side; m.userData.staged = !bc.revealed;
      m.material.color.set(bc.revealed ? 0xffffff : 0x8a9cd8);
      m.material.opacity = bc.revealed ? 1 : 0.85;
    }
    for (const [bid, m] of this.cards) if (!live.has(bid)) { if (!m.userData.unstaged) this.burst(m.position.clone(), 0xff7040, 30); this.scene.remove(m); this.cards.delete(bid); }
    b.lanes.forEach((lane, i) => { for (const sd of [0, 1]) this.locks[i][sd].material.opacity = lane.lock[sd] === b.turn ? 0.22 : 0; });
  }
  unstage(bid) { const m = this.cards.get(bid); if (m) m.userData.unstaged = true; }

  pick(nx, ny) {
    this.raycaster.setFromCamera(new THREE.Vector2(nx, ny), this.camera);
    const cardHits = this.raycaster.intersectObjects([...this.cards.values()], false);
    if (cardHits.length) { const u = cardHits[0].object.userData; return { type: 'card', bid: u.bid, lane: u.lane, side: u.side }; }
    if (this.raycaster.intersectObject(this.portraitFrame, true).length) return { type: 'opponent' };
    const p = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p)) {
      if (Math.abs(p.x) > 5.6 || Math.abs(p.z) > 5.6) return null;
      const lane = p.x < -1.85 ? 0 : p.x > 1.85 ? 2 : 1;
      return { type: 'lane', lane, side: p.z >= 0 ? 0 : 1 };
    }
    return null;
  }
  highlightLanes(valid) { this.laneMeshes.forEach((m, i) => { m.userData.hl = valid ? valid[i] : null; }); }

  burst(pos, color, n = 24, speed = 3) {
    const g = new THREE.BufferGeometry(); const p = new Float32Array(n * 3); const v = [];
    for (let i = 0; i < n; i++) { p.set([pos.x, pos.y + 0.2, pos.z], i * 3); v.push(new THREE.Vector3((Math.random() - 0.5) * speed, Math.random() * speed, (Math.random() - 0.5) * speed)); }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ color, size: 0.14, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    pts.userData = { v, life: 0.9, age: 0 }; this.scene.add(pts); this.particles.push(pts);
  }
  strike(lane, fromSide, bid, n) {
    const tm = this.cards.get(bid);
    const from = new THREE.Vector3(LANE_X[lane], 0.8, fromSide === 0 ? 2.2 : -2.2);
    const to = tm ? tm.position.clone().setY(0.6) : new THREE.Vector3(LANE_X[lane], 0.6, fromSide === 0 ? -2.6 : 2.6);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.16 + Math.min(n, 10) * 0.02, 12, 8), new THREE.MeshBasicMaterial({ color: fromSide === 0 ? 0xfff0a0 : 0xff8080 }));
    orb.add(new THREE.PointLight(fromSide === 0 ? 0xffd070 : 0xff5050, 6, 4));
    orb.position.copy(from); this.scene.add(orb);
    this.fx.push({ obj: orb, from, to, t: 0, dur: 0.35, done: () => { this.burst(to, fromSide === 0 ? 0xffe27a : 0xff6060, 26, 3.5); if (tm) tm.userData.shake = 0.35; } });
  }
  freeze(lane, side) { this.burst(new THREE.Vector3(LANE_X[lane], 0.6, side === 0 ? 3 : -3), 0x9fe8ff, 40, 3); }
  buff(bid, n) { const m = this.cards.get(bid); if (m) this.burst(m.position.clone(), n > 0 ? 0x7dffb0 : 0xff6060, 12, 1.6); }
  revealFx(bid) { const m = this.cards.get(bid); if (m) { m.userData.born = this.time; this.burst(m.position.clone(), 0xfff0c0, 18, 2.2); } }

  update() {
    const now = performance.now(); const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now; this.time += dt;
    const k = 1 - Math.pow(0.0008, dt);
    for (const m of this.cards.values()) {
      const t = m.userData.target; if (!t) continue;
      const age = this.time - m.userData.born;
      const lift = age < 0.5 ? Math.sin((age / 0.5) * Math.PI) * 0.8 : 0;
      m.userData.shake = Math.max(0, (m.userData.shake || 0) - dt);
      m.position.x += (t.x - m.position.x) * k + Math.sin(this.time * 70) * m.userData.shake * 0.05;
      m.position.z += (t.z - m.position.z) * k;
      m.position.y += (t.y + lift + (m.userData.staged ? Math.sin(this.time * 3 + m.userData.bid) * 0.05 : 0) - m.position.y) * k;
      const s = m.userData.scale;
      m.scale.setScalar(m.scale.x + (s - m.scale.x) * k);
      m.rotation.z = Math.sin(this.time * 1.3 + m.userData.bid) * 0.012;
    }
    this.portraitFrame.position.y = 1.6 + Math.sin(this.time * 1.2) * 0.06;
    this.ring.scale.setScalar(1 + Math.sin(this.time * 3) * 0.03);
    this.laneMeshes.forEach((m) => { const hl = m.userData.hl; const mat = m.material[2]; mat.emissive.set(hl === true ? 0x2a4a20 : hl === false ? 0x300a0a : 0x000000); });
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i]; f.t += dt / f.dur; const t = Math.min(1, f.t);
      f.obj.position.lerpVectors(f.from, f.to, t); f.obj.position.y += Math.sin(t * Math.PI) * 1.4;
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
    for (let i = 0; i < ep.length; i += 3) { ep[i + 1] += dt * 0.25; if (ep[i + 1] > 6) ep[i + 1] = 0; }
    this.embers.geometry.attributes.position.needsUpdate = true;
    this.renderer.render(this.scene, this.camera);
  }
}
