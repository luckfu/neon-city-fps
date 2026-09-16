import * as THREE from "three";

export function createEffects(scene, camera, assets) {
  const rain = createRain(scene);
  const steam = createSteam(scene, assets.smokeTex);
  return {
    update(dt) {
      rain.update(dt, camera);
      steam.update(dt);
    },
  };
}

function createRain(scene) {
  const count = 2400;
  const positions = new Float32Array(count * 6);
  const speeds = new Float32Array(count);
  const origin = new THREE.Vector3();

  for (let i = 0; i < count; i++) spawn(i, true);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.LineBasicMaterial({
    color: 0xa8d8ff,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });
  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;
  scene.add(lines);

  function spawn(i, randomY) {
    const x = origin.x + (Math.random() - 0.5) * 36;
    const y = origin.y + (randomY ? Math.random() * 22 : 16 + Math.random() * 8);
    const z = origin.z + (Math.random() - 0.5) * 42;
    speeds[i] = 14 + Math.random() * 10;
    const len = 0.55 + Math.random() * 0.45;
    const o = i * 6;
    positions[o] = x;
    positions[o + 1] = y;
    positions[o + 2] = z;
    positions[o + 3] = x + 0.08;
    positions[o + 4] = y - len;
    positions[o + 5] = z;
  }

  return {
    update(dt, camera) {
      origin.copy(camera.position);
      for (let i = 0; i < count; i++) {
        const o = i * 6;
        const dy = speeds[i] * dt;
        positions[o + 1] -= dy;
        positions[o + 4] -= dy;
        if (positions[o + 4] < origin.y - 8) spawn(i, false);
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}

function createSteam(scene, map) {
  const emitters = [
    [-6.2, 0.5, 6.5],
    [6.3, 0.5, 5.8],
    [-6.1, 0.5, -14],
    [6.2, 0.5, -25],
    [-6.0, 0.5, 1.5],
    [6.1, 0.5, -2],
  ];
  const puffs = [];
  const mat = new THREE.SpriteMaterial({
    map,
    color: 0xb8c8dc,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  for (const [x, y, z] of emitters) {
    for (let i = 0; i < 7; i++) {
      const s = new THREE.Sprite(mat.clone());
      s.position.set(x, y + Math.random() * 1.4, z);
      const sc = 0.8 + Math.random() * 1.3;
      s.scale.set(sc, sc * 1.4, 1);
      s.userData = {
        ox: x,
        oz: z,
        vy: 0.35 + Math.random() * 0.45,
        t: Math.random() * 4,
        life: 2 + Math.random() * 2,
      };
      scene.add(s);
      puffs.push(s);
    }
  }

  return {
    update(dt) {
      for (const s of puffs) {
        const u = s.userData;
        u.t += dt;
        s.position.y += u.vy * dt;
        s.position.x = u.ox + Math.sin(u.t * 0.8) * 0.25;
        s.position.z = u.oz + Math.cos(u.t * 0.6) * 0.2;
        const k = (u.t % u.life) / u.life;
        s.material.opacity = 0.32 * (1 - k) * (k < 0.15 ? k / 0.15 : 1);
        if (k > 0.98) {
          s.position.y = 0.45;
          u.t = 0;
        }
      }
    },
  };
}
