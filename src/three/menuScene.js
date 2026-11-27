// Ambient 3D backdrop for menus: drifting cards, a glowing sigil and embers.
import * as THREE from 'three';
import { cardCanvas } from '../art/cardRender.js';
import { CARD_LIST } from '../data/cards.js';

export class MenuScene {
  constructor(renderer) {
    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b0814);
    this.scene.fog = new THREE.Fog(0x0b0814, 8, 26);
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    this.camera.position.set(0, 0, 10);
    this.last = performance.now();
    this.t = 0;
    this.scene.add(new THREE.HemisphereLight(0xc8b8ff, 0x200a20, 1.3));
    const pl = new THREE.PointLight(0xffa060, 30, 30); pl.position.set(0, 0, 4); this.scene.add(pl);
    this.cards = [];
    const picks = CARD_LIST.filter((c) => ['rare', 'legendary', 'evolved', 'uncommon'].includes(c.rarity));
    for (let i = 0; i < 22; i++) {
      const def = picks[(i * 7) % picks.length];
      const tex = new THREE.CanvasTexture(cardCanvas(def)); tex.colorSpace = THREE.SRGBColorSpace;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.1), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.5 }));
      this.reset(m, true); this.scene.add(m); this.cards.push(m);
    }
    // sigil
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xe8b04a, transparent: true, opacity: 0.35 });
    this.sigil = new THREE.Group();
    for (let r = 0; r < 3; r++) { const t = new THREE.Mesh(new THREE.TorusGeometry(2.2 + r * 0.7, 0.025, 6, 96), ringMat); this.sigil.add(t); }
    for (let k = 0; k < 3; k++) { const tri = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.25, 3), ringMat); tri.rotation.z = (k * Math.PI) / 3; this.sigil.add(tri); }
    this.sigil.position.z = -3; this.scene.add(this.sigil);
    const g = new THREE.BufferGeometry(); const n = 300; const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) pos.set([(Math.random() - 0.5) * 24, (Math.random() - 0.5) * 16, (Math.random() - 0.5) * 10 - 2], i * 3);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dust = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffc890, size: 0.05, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.scene.add(this.dust);
  }
  reset(m, initial) {
    m.position.set((Math.random() - 0.5) * 18, initial ? (Math.random() - 0.5) * 14 : -9, -2 - Math.random() * 8);
    m.userData.v = 0.25 + Math.random() * 0.4; m.userData.rs = (Math.random() - 0.5) * 0.6;
    m.rotation.set(Math.random() * 0.6, Math.random() * Math.PI, Math.random() * 0.6);
  }
  resize(w, h) { this.camera.aspect = w / h; this.camera.fov = w / h < 0.8 ? 70 : 50; this.camera.updateProjectionMatrix(); }
  update() {
    const now = performance.now(); const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now; this.t += dt;
    for (const m of this.cards) { m.position.y += m.userData.v * dt; m.rotation.y += m.userData.rs * dt; m.rotation.x += m.userData.rs * dt * 0.3; if (m.position.y > 9) this.reset(m, false); }
    this.sigil.rotation.z += dt * 0.05; this.sigil.children.forEach((c, i) => (c.rotation.z += dt * (i % 2 ? 0.1 : -0.07)));
    const p = this.dust.geometry.attributes.position.array; for (let i = 1; i < p.length; i += 3) { p[i] += dt * 0.15; if (p[i] > 8) p[i] = -8; }
    this.dust.geometry.attributes.position.needsUpdate = true;
    this.camera.position.x = Math.sin(this.t * 0.1) * 0.6; this.camera.lookAt(0, 0, -3);
    this.renderer.render(this.scene, this.camera);
  }
}
