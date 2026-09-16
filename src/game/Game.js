import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { CFG } from "./config.js";
import { Input } from "./Input.js";
import { Player } from "./Player.js";
import { Weapons } from "./Weapons.js";
import { Enemies } from "./Enemies.js";
import { HUD } from "./HUD.js";
import { Sfx } from "./Audio.js";
import { loadAssets } from "./assets.js";
import { buildCity, updateCity } from "./City.js";
import { createEffects } from "./Effects.js";

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.clock = new THREE.Clock();
    this.running = false;
    this.started = false;
    this.time = 0;
    this.lastHp = CFG.playerHp;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.92;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(CFG.fov, window.innerWidth / window.innerHeight, CFG.near, CFG.far);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      CFG.bloom.strength,
      CFG.bloom.radius,
      CFG.bloom.threshold,
    );
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.input = new Input();
    this.hud = new HUD();
    this.sfx = new Sfx();

    window.addEventListener("resize", () => this.#resize());
  }

  async init() {
    this.assets = await loadAssets(this.renderer);
    const city = buildCity(this.scene, this.assets);
    this.colliders = city.colliders;
    this.blinkers = city.blinkers;
    this.effects = createEffects(this.scene, this.camera, this.assets);
    this.player = new Player(this.camera, this.colliders);
    this.weapons = new Weapons(this.camera, this.assets);
    this.enemies = new Enemies(this.scene, this.assets, this.player);
    this.input.attach(this.canvas);
    this.fx = {
      onHit: (r) => this.hud.onHit(r),
      flash: () => this.hud.flash(),
      tracer: (from, to, list) => spawnTracer(this.scene, from, to, list),
    };
  }

  start() {
    this.sfx.resume();
    this.input.enable();
    this.input.requestLock();
    this.hud.resetOverlay();
    this.hud.showPlay();
    if (!this.started) {
      this.started = true;
      this.running = true;
      this.clock.start();
      this.renderer.setAnimationLoop(() => this.#tick());
    } else {
      this.player.reset();
      this.weapons.reset();
      this.enemies.reset();
      this.lastHp = CFG.playerHp;
      this.running = true;
    }
  }

  #tick() {
    const dt = Math.min(0.05, this.clock.getDelta());
    this.time += dt;
    if (this.running) {
      if (this.input.weaponQueued) {
        this.weapons.setSlot(this.input.weaponQueued);
        this.input.weaponQueued = 0;
      }
      if (this.input.reloadPressed) {
        if (this.weapons.beginReload()) this.sfx.reload();
        this.input.reloadPressed = false;
      }
      this.player.update(dt, this.input);
      this.weapons.tryAttack(this.input, this.enemies, this.player, this.sfx, this.fx);
      this.weapons.update(dt, this.scene);
      this.enemies.update(dt);
      if (this.player.hp < this.lastHp) {
        this.hud.hurtPulse();
        this.sfx.hurt();
      }
      this.lastHp = this.player.hp;
      if (!this.player.alive) {
        this.running = false;
        this.sfx.death();
        this.hud.gameOver();
      }
    }
    updateCity(this.blinkers, this.time);
    this.effects.update(dt);
    this.hud.update(dt, this.weapons, this.player);
    this.composer.render();
  }

  #resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.bloom.setSize(w, h);
  }
}

function spawnTracer(scene, from, to, list) {
  const dir = to.clone().sub(from);
  const len = dir.length();
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, len, 4, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffe6a0, transparent: true, opacity: 0.85 }),
  );
  mesh.position.copy(from).add(to).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  scene.add(mesh);
  list.push({ mesh, life: 0.08 });
}
