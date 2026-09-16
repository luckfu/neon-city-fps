import * as THREE from "three";
import { CFG } from "./config.js";

const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _wish = new THREE.Vector3();
const _next = new THREE.Vector3();

export class Player {
  constructor(camera, colliders) {
    this.camera = camera;
    this.colliders = colliders;
    this.yaw = 0;
    this.pitch = -0.04;
    this.position = new THREE.Vector3(0, CFG.eye, 11.5);
    this.hp = CFG.playerHp;
    this.alive = true;
    this.hurtCd = 0;
    this.bob = 0;
    camera.rotation.order = "YXZ";
    this.#applyPose(0);
  }

  reset() {
    this.yaw = 0;
    this.pitch = -0.04;
    this.position.set(0, CFG.eye, 11.5);
    this.hp = CFG.playerHp;
    this.alive = true;
    this.hurtCd = 0;
    this.#applyPose(0);
  }

  damage(n) {
    if (!this.alive || this.hurtCd > 0) return false;
    this.hp = Math.max(0, this.hp - n);
    this.hurtCd = 0.42;
    if (this.hp <= 0) this.alive = false;
    return true;
  }

  update(dt, input) {
    this.hurtCd = Math.max(0, this.hurtCd - dt);
    if (!this.alive) return;

    const look = input.consumeLook();
    this.yaw -= look.x * CFG.lookSens;
    this.pitch -= look.y * CFG.lookSens;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -1.15, 1.15);

    const { f, r } = input.axis();
    _fwd.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    _right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    _wish.set(0, 0, 0).addScaledVector(_fwd, f).addScaledVector(_right, r);
    if (_wish.lengthSq() > 0) _wish.normalize();

    const speed = CFG.moveSpeed * (f && r ? 0.92 : 1);
    _next.copy(this.position).addScaledVector(_wish, speed * dt);

    if (!this.#blocked(_next.x, this.position.z)) this.position.x = _next.x;
    if (!this.#blocked(this.position.x, _next.z)) this.position.z = _next.z;

    const moving = _wish.lengthSq() > 0;
    this.bob += (moving ? dt * 9 : -this.bob * dt * 6);
    this.#applyPose(moving ? Math.sin(this.bob) * 0.035 : 0);
  }

  #applyPose(bobY) {
    this.camera.position.set(this.position.x, this.position.y + bobY, this.position.z);
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  #blocked(x, z) {
    const r = CFG.playerRadius;
    for (const b of this.colliders) {
      if (x + r > b.minX && x - r < b.maxX && z + r > b.minZ && z - r < b.maxZ) return true;
    }
    if (Math.abs(x) > 18 || z > 16 || z < -78) return true;
    return false;
  }
}
