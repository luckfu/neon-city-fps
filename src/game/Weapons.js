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

    this.root = new THREE.Group();
    camera.add(this.root);

    const fill = new THREE.PointLight(0xffc8a0, 2.4, 3.5, 1.4);
    fill.position.set(0.15, 0.2, 0.4);
    const rim = new THREE.PointLight(0x66e8ff, 1.1, 3.2, 1.6);
    rim.position.set(-0.25, 0.15, 0.1);
    this.muzzleLight = new THREE.PointLight(0xffcc88, 0, 6, 2);
    this.muzzleLight.position.set(0.05, 0.02, -0.55);

    this.katana = makeKatana(assets);
    this.phone = makePhone();
    this.gun = makeGun();
    this.root.add(this.katana, this.phone, this.gun, fill, rim, this.muzzleLight);
    this.root.traverse((o) => o.layers.set(1));
    camera.layers.enable(1);
    this.katana.scale.setScalar(1.05);
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

    const dip = this.reloadT > 0 ? 0.12 : 0;
    this.root.position.set(0, -dip - this.recoil * 0.03, 0);

    if (this.slot === 1) {
      const s = this.swing > 0 ? Math.sin(this.swing * Math.PI) : 0;
      this.katana.position.set(0.46, -0.4 - s * 0.04, -0.5);
      const dir = new THREE.Vector3(0.78, 0.58 - s * 0.15, -0.18).normalize();
      this.katana.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    } else if (this.slot === 2) {
      this.phone.position.set(0.18, -0.16, -0.38);
      this.phone.rotation.set(-0.12, -0.2, 0.08);
    } else {
      this.gun.position.set(0.2, -0.16 - this.recoil * 0.04, -0.36);
      this.gun.rotation.set(0.08 + this.recoil * 0.08, 0.08, 0.02);
      this.gun.scale.setScalar(1.35);
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

function layer1(obj) {
  obj.traverse((o) => o.layers.set(1));
  return obj;
}

function makeKatana(assets) {
  const g = new THREE.Group();

  const leather = new THREE.MeshPhysicalMaterial({
    color: 0x1b1716,
    roughness: 0.42,
    metalness: 0.12,
    clearcoat: 0.55,
    clearcoatRoughness: 0.25,
  });
  const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 0.18, 10), leather);
  forearm.rotation.z = Math.PI / 2.2;
  forearm.rotation.y = 0.4;
  forearm.position.set(-0.1, -0.08, 0.08);
  g.add(forearm);

  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.055, 0.11), leather);
  palm.position.set(0.02, -0.02, 0.02);
  palm.rotation.y = 0.4;
  g.add(palm);
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.022, 0.07), leather);
    f.position.set(0.0 + i * 0.018, -0.01, -0.06);
    f.rotation.x = 0.5;
    f.rotation.y = 0.35;
    g.add(f);
  }

  const wrap = new THREE.MeshStandardMaterial({
    map: assets.wrapTex,
    color: 0x2c241c,
    roughness: 0.62,
  });
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.019, 0.26, 12), wrap);
  handle.position.set(0.02, 0.0, 0.0);
  g.add(handle);

  const tsuba = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.055, 0.012, 24),
    new THREE.MeshStandardMaterial({ color: 0x3a342c, metalness: 0.9, roughness: 0.28 }),
  );
  tsuba.position.set(0.02, 0.14, 0.0);
  g.add(tsuba);

  const bladeMat = new THREE.MeshPhysicalMaterial({
    color: 0xd0d8e4,
    metalness: 1,
    roughness: 0.08,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    envMapIntensity: 2.2,
  });
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.95, 0.032), bladeMat);
  blade.position.set(0.02, 0.62, 0.0);
  g.add(blade);
  const hamon = new THREE.Mesh(
    new THREE.BoxGeometry(0.004, 0.92, 0.018),
    new THREE.MeshBasicMaterial({ color: 0xf6fbff }),
  );
  hamon.position.set(0.026, 0.62, 0.0);
  g.add(hamon);

  return layer1(g);
}

function makePhone() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.2, 0.014),
    new THREE.MeshStandardMaterial({ color: 0x101216, metalness: 0.7, roughness: 0.3 }),
  );
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.086, 0.168),
    new THREE.MeshBasicMaterial({ color: 0x7af4ff, toneMapped: false }),
  );
  screen.position.z = 0.008;
  const hand = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.08, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.48 }),
  );
  hand.position.set(0.03, -0.12, 0.03);
  g.add(body, screen, hand);
  return layer1(g);
}

function makeGun() {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x2c333a, metalness: 0.8, roughness: 0.28 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x141618, metalness: 0.45, roughness: 0.48 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.13, 0.42), metal);
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.5), metal);
  barrel.position.set(0.01, 0.03, -0.38);
  const rail = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.018, 0.28),
    new THREE.MeshBasicMaterial({ color: 0x5cf0ff, toneMapped: false }),
  );
  rail.position.set(0.01, 0.08, -0.12);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.11, 0.2), dark);
  stock.position.set(0, -0.02, 0.28);
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.18, 0.09), dark);
  mag.position.set(0, -0.14, 0.04);
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.13), dark);
  hand.position.set(0.05, -0.12, 0.1);
  g.add(body, barrel, rail, stock, mag, hand);
  return layer1(g);
}
