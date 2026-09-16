import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import { CFG } from "./config.js";

export function buildCity(scene, assets) {
  const colliders = [];
  const blinkers = [];
  const group = new THREE.Group();
  scene.add(group);

  scene.background = new THREE.Color(CFG.fog);
  scene.fog = new THREE.FogExp2(CFG.fog, 0.018);
  scene.environment = assets.env;
  scene.environmentIntensity = 0.32;

  const hemi = new THREE.HemisphereLight(0x1c3a5c, 0x08060a, 0.38);
  scene.add(hemi);
  const moon = new THREE.DirectionalLight(0x88b4d8, 0.28);
  moon.position.set(18, 34, 8);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  moon.shadow.camera.near = 2;
  moon.shadow.camera.far = 90;
  moon.shadow.camera.left = -30;
  moon.shadow.camera.right = 30;
  moon.shadow.camera.top = 30;
  moon.shadow.camera.bottom = -30;
  moon.shadow.bias = -0.00035;
  scene.add(moon);

  addGround(scene, assets);
  addSidewalks(group, assets, colliders);

  const concrete = new THREE.MeshStandardMaterial({
    map: assets.concreteDiff,
    normalMap: assets.concreteNor,
    roughnessMap: assets.concreteRough,
    roughness: 0.78,
    metalness: 0.06,
    color: 0x3a404c,
    envMapIntensity: 0.22,
  });
  const windowMat = new THREE.MeshStandardMaterial({
    map: assets.windowTex,
    emissiveMap: assets.windowTex,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.55,
    roughness: 0.5,
    metalness: 0.18,
    color: 0x6a7380,
  });

  const buildings = [
    { x: -11.6, z: -12, w: 8.2, d: 16, h: 30, face: 1 },
    { x: -12.4, z: -32, w: 9.4, d: 14, h: 42, face: 1 },
    { x: -11.2, z: -50, w: 8, d: 16, h: 24, face: 1 },
    { x: -13.0, z: -66, w: 10, d: 12, h: 48, face: 1 },
    { x: 11.6, z: -16, w: 8.2, d: 18, h: 34, face: -1 },
    { x: 12.2, z: -36, w: 9, d: 14, h: 46, face: -1 },
    { x: 11.4, z: -52, w: 8, d: 14, h: 28, face: -1 },
    { x: 12.8, z: -68, w: 10, d: 12, h: 52, face: -1 },
  ];

  for (const b of buildings) addBuilding(group, b, concrete, windowMat, colliders);

  // Distant backdrop towers
  for (let i = 0; i < 18; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const z = -78 - (i % 9) * 7;
    const x = side * (22 + (i % 5) * 3);
    const h = 28 + (i % 6) * 10;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(6 + (i % 3), h, 6),
      windowMat,
    );
    mesh.position.set(x, h / 2, z);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    group.add(mesh);
  }

  addBillboard(group, assets.billboards.kiroshi, { x: -7.42, y: 6.6, z: -9.5, w: 6.6, h: 10.2, rotY: Math.PI / 2 });
  addBillboard(group, assets.billboards.future, { x: 7.42, y: 7.1, z: -14.5, w: 6.8, h: 10.6, rotY: -Math.PI / 2 });
  addBillboard(group, assets.billboards.muse, { x: -7.42, y: 8.2, z: -28, w: 5.2, h: 8.0, rotY: Math.PI / 2 });
  addBillboard(group, assets.billboards.chrome, { x: 7.42, y: 7.4, z: -36, w: 5.4, h: 8.4, rotY: -Math.PI / 2 });
  addBillboard(group, assets.billboards.kiroshi, { x: -7.42, y: 6.2, z: -46, w: 5.0, h: 7.6, rotY: Math.PI / 2 });
  addBillboard(group, assets.billboards.future, { x: 7.42, y: 12.2, z: -56, w: 5.6, h: 8.6, rotY: -Math.PI / 2 });
  addBillboard(group, assets.billboards.chrome, { x: -7.42, y: 14, z: -62, w: 5.0, h: 7.6, rotY: Math.PI / 2 });
  addBillboard(group, assets.billboards.muse, { x: 7.42, y: 5.6, z: -6.5, w: 4.4, h: 6.8, rotY: -Math.PI / 2 });

  addVerticalSign(group, assets.signs.pink, { x: -7.35, y: 5.4, z: -3.4, h: 8.2, color: 0xff3d8a, blinkers, lit: true });
  addVerticalSign(group, assets.signs.cyan, { x: -7.35, y: 5.2, z: -19.5, h: 6.8, color: 0x3ee6ff, blinkers, lit: true });
  addVerticalSign(group, assets.signs.orange, { x: 7.35, y: 6.2, z: -5.8, h: 9.0, color: 0xff8a1a, blinkers, lit: true });
  addVerticalSign(group, assets.signs.pink, { x: 7.35, y: 5.6, z: -24, h: 7.0, color: 0xff2ea6, blinkers, lit: false });
  addVerticalSign(group, assets.signs.cyan, { x: -7.35, y: 8.2, z: -40, h: 8, color: 0x5cf0ff, blinkers, lit: false });
  addHorizontalSign(group, assets.signs.night, { x: 0, y: 5.4, z: -72, w: 8, color: 0x5cf0ff, blinkers });

  addTrafficLight(group, { x: 0.8, z: -28 });
  addStreetLamps(group, blinkers);
  addVents(group);
  addCurbGlow(group);

  const fillL = new THREE.PointLight(0xff4da6, 1.35, 18, 1.6);
  fillL.position.set(-4.5, 3.2, -2);
  const fillR = new THREE.PointLight(0x3ec8ff, 1.25, 18, 1.6);
  fillR.position.set(4.5, 3.0, -4);
  group.add(fillL, fillR);

  return { colliders, blinkers };
}

function addGround(scene, assets) {
  const groundGeo = new THREE.PlaneGeometry(48, 110);
  const reflector = new Reflector(groundGeo, {
    textureWidth: 512,
    textureHeight: 512,
    color: 0x4a5660,
    clipBias: 0.003,
  });
  reflector.rotation.x = -Math.PI / 2;
  reflector.position.y = 0;
  reflector.position.z = -28;
  scene.add(reflector);

  const wet = new THREE.Mesh(
    groundGeo,
    new THREE.MeshPhysicalMaterial({
      map: assets.asphaltDiff,
      normalMap: assets.asphaltNor,
      roughnessMap: assets.asphaltRough,
      color: 0x1a1d24,
      metalness: 0.72,
      roughness: 0.12,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.7,
      transparent: true,
      opacity: 0.7,
      reflectivity: 0.9,
    }),
  );
  wet.rotation.x = -Math.PI / 2;
  wet.position.y = 0.02;
  wet.position.z = -28;
  wet.receiveShadow = true;
  scene.add(wet);
}

function addSidewalks(group, assets, colliders) {
  const mat = new THREE.MeshStandardMaterial({
    map: assets.concreteDiff,
    roughness: 0.55,
    metalness: 0.12,
    color: 0x2a3038,
  });
  for (const x of [-9.4, 9.4]) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.16, 100), mat);
    mesh.position.set(x, 0.08, -32);
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  colliders.push(
    { minX: -22, maxX: -7.45, minZ: -82, maxZ: 14 },
    { minX: 7.45, maxX: 22, minZ: -82, maxZ: 14 },
  );
}

function addBuilding(group, b, concrete, windowMat, colliders) {
  const body = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), concrete);
  body.position.set(b.x, b.h / 2, b.z);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const faceX = b.x + (b.face > 0 ? b.w / 2 + 0.03 : -b.w / 2 - 0.03);
  const facade = new THREE.Mesh(
    new THREE.PlaneGeometry(b.d * 0.92, b.h * 0.92),
    windowMat,
  );
  facade.position.set(faceX, b.h / 2, b.z);
  facade.rotation.y = b.face > 0 ? Math.PI / 2 : -Math.PI / 2;
  group.add(facade);

  // Roof bar
  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(b.w * 0.3, 0.35, b.d * 0.12),
    new THREE.MeshStandardMaterial({
      color: Math.random() > 0.5 ? 0xff3d8a : 0x3ee6ff,
      emissive: Math.random() > 0.5 ? 0xff3d8a : 0x3ee6ff,
      emissiveIntensity: 2.2,
    }),
  );
  bar.position.set(b.x, b.h + 0.4, b.z);
  group.add(bar);
}

function addBillboard(group, map, { x, y, z, w, h, rotY }) {
  const mat = new THREE.MeshStandardMaterial({
    map,
    emissiveMap: map,
    emissive: 0xffffff,
    emissiveIntensity: 0.42,
    roughness: 0.35,
    metalness: 0.15,
  });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  board.position.set(x, y, z);
  board.rotation.y = rotY;
  group.add(board);

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.18, h + 0.18, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x111318, metalness: 0.7, roughness: 0.35 }),
  );
  frame.position.copy(board.position);
  frame.rotation.y = rotY;
  const inward = rotY > 0 ? 0.06 : -0.06;
  frame.translateZ(-0.05);
  group.add(frame);
  void inward;
}

function addVerticalSign(group, map, { x, y, z, h, color, blinkers, lit }) {
  const w = 0.85;
  const mat = new THREE.MeshStandardMaterial({
    map,
    emissiveMap: map,
    emissive: 0xffffff,
    emissiveIntensity: 1.6,
    roughness: 0.25,
    metalness: 0.2,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.position.set(x, y, z);
  mesh.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
  group.add(mesh);
  if (lit) {
    const light = new THREE.PointLight(color, 2.1, 14, 1.7);
    light.position.set(x + (x < 0 ? 1.4 : -1.4), y, z);
    group.add(light);
    blinkers.push({ mesh, light, base: 1.6, phase: Math.random() * Math.PI * 2, kind: "neon" });
  } else {
    blinkers.push({ mesh, light: null, base: 1.6, phase: Math.random() * Math.PI * 2, kind: "neon" });
  }
}

function addHorizontalSign(group, map, { x, y, z, w, color, blinkers }) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, 1.4),
    new THREE.MeshStandardMaterial({
      map,
      emissiveMap: map,
      emissive: 0xffffff,
      emissiveIntensity: 1.6,
    }),
  );
  mesh.position.set(x, y, z);
  group.add(mesh);
  const light = new THREE.PointLight(color, 1.6, 16, 1.8);
  light.position.set(x, y, z + 1.5);
  group.add(light);
  blinkers.push({ mesh, light, base: 1.6, phase: 1.2, kind: "neon" });
}

function addTrafficLight(group, { x, z }) {
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.09, 5.2, 8),
    new THREE.MeshStandardMaterial({ color: 0x1a1c20, metalness: 0.6, roughness: 0.4 }),
  );
  pole.position.set(x, 2.6, z);
  pole.castShadow = true;
  group.add(pole);
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.9, 0.22),
    new THREE.MeshStandardMaterial({ color: 0x111214, metalness: 0.5, roughness: 0.4 }),
  );
  box.position.set(x, 5.1, z);
  group.add(box);
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xff2030, emissive: 0xff1020, emissiveIntensity: 3.5 }),
  );
  lamp.position.set(x, 5.28, z - 0.12);
  group.add(lamp);
  const light = new THREE.PointLight(0xff2030, 1.1, 10, 2);
  light.position.set(x, 5.2, z);
  group.add(light);
}

function addStreetLamps(group, blinkers) {
  for (const z of [-22, -54]) {
    for (const x of [-6.6, 6.6]) {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.07, 4.4, 6),
        new THREE.MeshStandardMaterial({ color: 0x17181c, metalness: 0.7, roughness: 0.35 }),
      );
      pole.position.set(x, 2.2, z);
      group.add(pole);
      const light = new THREE.PointLight(x < 0 ? 0xff66cc : 0x66e0ff, 0.9, 10, 2);
      light.position.set(x * 0.82, 4.1, z);
      group.add(light);
      blinkers.push({ mesh: null, light, base: 0.9, phase: z * 0.2, kind: "lamp" });
    }
  }
}

function addVents(group) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x2a2e34, metalness: 0.5, roughness: 0.5 });
  for (const [x, z] of [
    [-6.2, 6.5],
    [6.3, 5.8],
    [-6.1, -14],
    [6.2, -25],
  ]) {
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 0.9), mat);
    v.position.set(x, 0.28, z);
    group.add(v);
  }
}

function addCurbGlow(group) {
  for (const [x, color] of [
    [-7.2, 0xff3d8a],
    [7.2, 0x3ee6ff],
  ]) {
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.04, 90),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.4 }),
    );
    strip.position.set(x, 0.05, -32);
    group.add(strip);
  }
}

export function updateCity(blinkers, t) {
  for (const b of blinkers) {
    const flick = 0.82 + 0.18 * Math.sin(t * 4 + b.phase) + (Math.random() < 0.01 ? -0.35 : 0);
    if (b.mesh?.material) b.mesh.material.emissiveIntensity = b.base * flick;
    if (b.light) b.light.intensity = (b.kind === "lamp" ? 0.85 : 2.0) * flick;
  }
}
