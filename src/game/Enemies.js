import * as THREE from "three";
import { CFG } from "./config.js";

const _dir = new THREE.Vector3();
const _to = new THREE.Vector3();

export class Enemies {
  constructor(scene, assets, player) {
    this.scene = scene;
    this.player = player;
    this.list = [];
    this.projectiles = [];
    this._ray = new THREE.Raycaster();

    const spots = [
      { x: -2.35, z: -8.2, poster: assets.posterA },
      { x: 1.55, z: -13.6, poster: assets.posterB },
      { x: 3.15, z: -12.1, poster: assets.posterA },
      { x: -3.3, z: -22, poster: assets.posterB },
      { x: 2.2, z: -30, poster: assets.posterA },
      { x: -1.1, z: -38, poster: assets.posterB },
    ];
    for (const s of spots) this.list.push(createEnemy(scene, s));
  }

  reset() {
    for (const e of this.list) {
      e.hp = CFG.enemyHp;
      e.alive = true;
      e.group.visible = true;
      e.group.rotation.x = 0;
      e.group.position.set(e.spawn.x, 0, e.spawn.z);
      e.flash = 0;
      e.fireCd = 0.6 + Math.random();
      e.group.traverse((o) => {
        if (o.material && o.material.emissiveIntensity != null && o.userData.baseEmissive != null) {
          o.material.emissiveIntensity = o.userData.baseEmissive;
        }
      });
    }
    for (const p of this.projectiles) this.scene.remove(p.mesh);
    this.projectiles.length = 0;
  }

  hitscan(origin, dir, range) {
    this._ray.set(origin, dir);
    this._ray.far = range;
    const meshes = [];
    for (const e of this.list) if (e.alive) meshes.push(e.hit);
    const hits = this._ray.intersectObjects(meshes, false);
    if (!hits.length) return null;
    const obj = hits[0].object;
    const enemy = this.list.find((e) => e.hit === obj);
    return { enemy, point: hits[0].point, distance: hits[0].distance };
  }

  melee(origin, dir, range) {
    let best = null;
    for (const e of this.list) {
      if (!e.alive) continue;
      _to.copy(e.group.position).setY(1.1).sub(origin);
      const dist = _to.length();
      if (dist > range) continue;
      _to.normalize();
      if (_to.dot(dir) < 0.42) continue;
      if (!best || dist < best.dist) best = { enemy: e, dist, point: e.group.position.clone().setY(1.2) };
    }
    return best;
  }

  cone(origin, dir, range, cosAng) {
    const out = [];
    for (const e of this.list) {
      if (!e.alive) continue;
      _to.copy(e.group.position).setY(1.1).sub(origin);
      const dist = _to.length();
      if (dist > range) continue;
      _to.normalize();
      if (_to.dot(dir) < cosAng) continue;
      out.push(e);
    }
    return out;
  }

  hurt(enemy, dmg) {
    if (!enemy.alive) return false;
    enemy.hp -= dmg;
    enemy.flash = 0.12;
    if (enemy.hp <= 0) {
      enemy.alive = false;
      enemy.hp = 0;
      return "kill";
    }
    return "hit";
  }

  update(dt) {
    const playerPos = this.player.position;
    for (const e of this.list) {
      if (!e.alive) {
        e.group.rotation.x = Math.min(1.25, e.group.rotation.x + dt * 2.4);
        e.group.position.y = Math.max(-0.05, e.group.position.y - dt * 0.4);
        continue;
      }

      e.t += dt;
      e.fireCd -= dt;
      const dx = playerPos.x - e.group.position.x;
      const dz = playerPos.z - e.group.position.z;
      const dist = Math.hypot(dx, dz);
      const ang = Math.atan2(dx, dz);
      e.group.rotation.y = ang;

      const legs = Math.sin(e.t * 8) * 0.55;
      e.leftLeg.rotation.x = dist < 22 ? legs : Math.sin(e.t * 2) * 0.1;
      e.rightLeg.rotation.x = dist < 22 ? -legs : -Math.sin(e.t * 2) * 0.1;

      if (dist > 3.2 && dist < 26) {
        const step = CFG.enemySpeed * dt;
        e.group.position.x += (dx / dist) * step;
        e.group.position.z += (dz / dist) * step;
        e.group.position.x = THREE.MathUtils.clamp(e.group.position.x, -6.6, 6.6);
      }

      if (dist < 18 && e.fireCd <= 0 && this.player.alive) {
        e.fireCd = CFG.enemyFireInterval + Math.random() * 0.4;
        this.#shoot(e, playerPos);
      }

      if (e.flash > 0) {
        e.flash -= dt;
        e.body.material.emissive.setHex(0xff3355);
        e.body.material.emissiveIntensity = 1.4;
      } else {
        e.body.material.emissive.setHex(0x05080c);
        e.body.material.emissiveIntensity = 0.2;
      }
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.mesh.position.addScaledVector(p.vel, dt);
      p.life -= dt;
      const d = p.mesh.position.distanceTo(playerPos);
      if (d < 0.55 && this.player.alive) {
        this.player.damage(CFG.enemyDamage);
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
        continue;
      }
      if (p.life <= 0 || Math.abs(p.mesh.position.x) > 12) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }
  }

  #shoot(e, target) {
    _dir.set(target.x - e.group.position.x, 0.2, target.z - e.group.position.z).normalize();
    _dir.x += (Math.random() - 0.5) * 0.08;
    _dir.z += (Math.random() - 0.5) * 0.08;
    _dir.normalize();
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff5533 }),
    );
    mesh.position.copy(e.group.position).add(new THREE.Vector3(0, 1.25, 0)).addScaledVector(_dir, 0.6);
    this.scene.add(mesh);
    this.projectiles.push({ mesh, vel: _dir.clone().multiplyScalar(22), life: 2.2 });
  }
}

function createEnemy(scene, spawn) {
  const g = new THREE.Group();
  g.position.set(spawn.x, 0, spawn.z);

  const coat = new THREE.MeshStandardMaterial({
    color: 0x3a424c,
    roughness: 0.5,
    metalness: 0.22,
    emissive: 0x101820,
    emissiveIntensity: 0.35,
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a3038, roughness: 0.55, metalness: 0.2 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.9, 0.38), coat);
  body.position.y = 1.15;
  body.castShadow = true;
  g.add(body);

  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.28, 0.32), dark);
  hips.position.y = 0.68;
  g.add(hips);

  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.22), dark);
  leftLeg.position.set(-0.16, 0.35, 0);
  g.add(leftLeg);
  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.22), dark);
  rightLeg.position.set(0.16, 0.35, 0);
  g.add(rightLeg);

  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.7, 0.16), coat);
  armL.position.set(-0.42, 1.12, 0.05);
  g.add(armL);
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.7, 0.16), coat);
  armR.position.set(0.42, 1.12, 0.12);
  armR.rotation.x = -0.5;
  g.add(armR);

  const rifle = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.1, 0.85),
    new THREE.MeshStandardMaterial({ color: 0x2a2e33, metalness: 0.7, roughness: 0.35 }),
  );
  rifle.position.set(0.28, 1.18, 0.42);
  g.add(rifle);

  const skull = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.4, 0.32), dark);
  skull.position.y = 1.78;
  g.add(skull);

  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.62, 0.78),
    new THREE.MeshBasicMaterial({ map: spawn.poster, toneMapped: false }),
  );
  face.position.set(0, 1.82, 0.24);
  g.add(face);

  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 1.8, 0.5),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hit.position.y = 0.95;
  g.add(hit);

  scene.add(g);
  g.scale.setScalar(1.18);
  return {
    group: g,
    body,
    hit,
    face,
    leftLeg,
    rightLeg,
    spawn: { x: spawn.x, z: spawn.z },
    hp: CFG.enemyHp,
    alive: true,
    t: Math.random() * 10,
    fireCd: 1,
    flash: 0,
  };
}
