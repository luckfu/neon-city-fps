import * as THREE from "three";
import { CFG } from "./config.js";

const _fwd = new THREE.Vector3();
const _muzzle = new THREE.Vector3();

export class Weapons {
  constructor(camera, assets) {
    this.camera = camera;
    this.slot = 1;
    this.mag = CFG.magSize;
    this.reserve = CFG.reserve;
    this.cooldown = 0;
    this.reloadT = 0;
    this.swing = 0;
    this.recoil = 0;
    this.tracers = [];
    this.muzzleLight = new THREE.PointLight(0xffcc88, 0, 6, 2);
    this.muzzleLight.layers.set(1);

    this.root = new THREE.Group();
    this.root.layers.set(1);
    camera.add(this.root);
    camera.layers.enable(1);

    this.katana = makeKatana(assets);
    this.phone = makePhone();
    this.gun = makeGun();
    this.root.add(this.katana, this.phone, this.gun);
    this.root.add(this.muzzleLight);
    this.#show(1);
  }

  reset() {
    this.slot = 1;
    this.mag = CFG.magSize;
    this.reserve = CFG.reserve;
    this.cooldown = 0;
    this.reloadT = 0;
    this.swing = 0;
    this.recoil = 0;
    this.#show(1);
  }

  setSlot(n) {
    if (n === this.slot) return;
    this.slot = n;
    this.#show(n);
    this.swing = 0;
  }

  #show(n) {
    this.katana.visible = n === 1;
    this.phone.visible = n === 2;
    this.gun.visible = n === 3;
  }

  beginReload() {
    if (this.reloadT > 0) return false;
    if (this.mag >= CFG.magSize || this.reserve <= 0) return false;
    this.reloadT = CFG.reloadTime;
    return true;
  }

  update(dt, scene) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.recoil = Math.max(0, this.recoil - dt * 8);
    this.muzzleLight.intensity = Math.max(0, this.muzzleLight.intensity - dt * 40);

    if (this.reloadT > 0) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) {
        const need = CFG.magSize - this.mag;
        const take = Math.min(need, this.reserve);
        this.mag += take;
        this.reserve -= take;
      }
    }

    if (this.swing > 0) this.swing = Math.max(0, this.swing - dt * 3.6);

    const dip = this.reloadT > 0 ? 0.18 : 0;
    this.root.position.set(0.28, -0.3 - dip - this.recoil * 0.04, -0.48);
    this.root.rotation.set(-this.recoil * 0.08, 0.08, 0.04);

    if (this.slot === 1) {
      const s = Math.sin((1 - this.swing) * Math.PI) * (this.swing > 0 ? 1 : 0);
      this.katana.rotation.set(-0.15 - s * 1.5, 0.55 + s * 0.8, 0.55 - s * 1.4);
      this.katana.position.set(0.08, -0.06, 0.05);
    } else if (this.slot === 2) {
      this.phone.rotation.set(-0.15, 0.15, 0.1);
      this.phone.position.set(0.02, -0.02, 0.12);
    } else {
      this.gun.rotation.set(0.08, 0.12, 0.04);
      this.gun.position.set(0.05, -0.08, 0.02);
    }

    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const tr = this.tracers[i];
      tr.life -= dt;
      tr.mesh.material.opacity = Math.max(0, tr.life * 4);
      if (tr.life <= 0) {
        scene.remove(tr.mesh);
        this.tracers.splice(i, 1);
      }
    }
  }

  tryAttack(input, enemies, player, sfx, fx) {
    const pressed = input.consumeFirePress();
    const held = input.fireHeld;
    if (this.reloadT > 0) return;

    if (this.slot === 1 && pressed && this.cooldown <= 0) {
      this.cooldown = CFG.katanaCooldown;
      this.swing = 1;
      sfx.slash();
      this.camera.getWorldDirection(_fwd);
      const hit = enemies.melee(player.position, _fwd, CFG.katanaRange);
      if (hit) {
        const r = enemies.hurt(hit.enemy, CFG.katanaDamage);
        fx.onHit(r);
        sfx.hit();
      }
      return;
    }

    if (this.slot === 2 && pressed && this.cooldown <= 0) {
      this.cooldown = CFG.phoneCooldown;
      sfx.shutter();
      fx.flash();
      this.camera.getWorldDirection(_fwd);
      const list = enemies.cone(player.position, _fwd, CFG.phoneRange, 0.55);
      for (const e of list) {
        const r = enemies.hurt(e, CFG.phoneDamage);
        fx.onHit(r);
      }
      if (list.length) sfx.hit();
      return;
    }

    if (this.slot === 3 && held && this.cooldown <= 0) {
      if (this.mag <= 0) {
        if (pressed) sfx.empty();
        this.cooldown = 0.12;
        return;
      }
      this.cooldown = 60 / CFG.gunRpm;
      this.mag -= 1;
      this.recoil = 1;
      sfx.gun();
      this.muzzleLight.intensity = 8;
      this.camera.getWorldDirection(_fwd);
      const origin = this.camera.getWorldPosition(_muzzle);
      const hit = enemies.hitscan(origin, _fwd, CFG.gunRange);
      const end = origin.clone().addScaledVector(_fwd, hit ? hit.distance : 42);
      fx.tracer(origin.clone().addScaledVector(_fwd, 0.6), end, this.tracers);
      if (hit) {
        const r = enemies.hurt(hit.enemy, CFG.gunDamage);
        fx.onHit(r);
        sfx.hit();
      }
    }
  }
}

function makeKatana(assets) {
  const g = new THREE.Group();
  g.layers.set(1);

  const handMat = new THREE.MeshPhysicalMaterial({
    color: 0x1a1a1c,
    roughness: 0.45,
    metalness: 0.15,
    clearcoat: 0.4,
  });
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.16), handMat);
  palm.position.set(0, 0, 0.02);
  const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.08), handMat);
  thumb.position.set(-0.06, 0.02, 0.02);
  thumb.rotation.z = 0.6;
  g.add(palm, thumb);
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.028, 0.085), handMat);
    f.position.set(-0.03 + i * 0.022, -0.015, -0.08);
    f.rotation.x = -0.35;
    g.add(f);
  }

  const wrap = new THREE.MeshStandardMaterial({
    map: assets.wrapTex,
    color: 0x2a2420,
    roughness: 0.7,
  });
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.26, 10), wrap);
  handle.rotation.z = Math.PI / 2;
  handle.rotation.y = 0.4;
  handle.position.set(0.02, 0.01, -0.02);
  g.add(handle);

  const tsuba = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.01, 20),
    new THREE.MeshStandardMaterial({ color: 0x3a342e, metalness: 0.85, roughness: 0.3 }),
  );
  tsuba.rotation.z = Math.PI / 2;
  tsuba.rotation.y = 0.4;
  tsuba.position.set(0.14, 0.05, -0.08);
  g.add(tsuba);

  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.012, 0.035, 0.92),
    new THREE.MeshPhysicalMaterial({
      color: 0xc5d0dc,
      metalness: 1,
      roughness: 0.12,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.8,
    }),
  );
  blade.position.set(0.28, 0.12, -0.5);
  blade.rotation.x = -0.15;
  blade.rotation.y = 0.42;
  blade.rotation.z = 0.08;
  g.add(blade);

  const edge = new THREE.Mesh(
    new THREE.BoxGeometry(0.003, 0.018, 0.9),
    new THREE.MeshBasicMaterial({ color: 0xf2f7ff }),
  );
  edge.position.copy(blade.position);
  edge.rotation.copy(blade.rotation);
  edge.position.y -= 0.012;
  g.add(edge);

  g.traverse((o) => o.layers.set(1));
  return g;
}

function makePhone() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.18, 0.012),
    new THREE.MeshStandardMaterial({ color: 0x111216, metalness: 0.6, roughness: 0.35 }),
  );
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.078, 0.15),
    new THREE.MeshStandardMaterial({
      color: 0x66f0ff,
      emissive: 0x33d8ff,
      emissiveIntensity: 2.2,
    }),
  );
  screen.position.z = 0.007;
  const hand = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.07, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.5 }),
  );
  hand.position.set(0.02, -0.1, 0.04);
  g.add(body, screen, hand);
  g.traverse((o) => o.layers.set(1));
  return g;
}

function makeGun() {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x2a3036, metalness: 0.75, roughness: 0.32 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x121416, metalness: 0.4, roughness: 0.5 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.38), metal);
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.42), metal);
  barrel.position.set(0.01, 0.03, -0.32);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.18), dark);
  stock.position.set(0, -0.02, 0.24);
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.08), dark);
  mag.position.set(0, -0.12, 0.02);
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.07, 0.12), dark);
  hand.position.set(0.04, -0.1, 0.08);
  g.add(body, barrel, stock, mag, hand);
  g.traverse((o) => o.layers.set(1));
  return g;
}
