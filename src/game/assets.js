import * as THREE from "three";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

export async function loadFonts() {
  const specs = [
    ["NotoSansJP", "/fonts/NotoSansJP-Black.woff2"],
    ["Orbitron", "/fonts/Orbitron-700.woff2"],
    ["ShareTechMono", "/fonts/ShareTechMono.woff2"],
  ];
  await Promise.all(
    specs.map(async ([name, url]) => {
      try {
        const face = new FontFace(name, `url(${url})`);
        await face.load();
        document.fonts.add(face);
      } catch {
        /* fallback stack still works */
      }
    }),
  );
}

function colorMap(tex) {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function linearMap(tex) {
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 8;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export async function loadAssets(renderer) {
  await loadFonts();
  const tex = new THREE.TextureLoader();
  const rgbe = new RGBELoader();

  const [
    posterA,
    posterB,
    asphaltDiff,
    asphaltNor,
    asphaltRough,
    concreteDiff,
    concreteNor,
    concreteRough,
    hdr,
  ] = await Promise.all([
    tex.loadAsync("/assets/enemy-poster-a.png"),
    tex.loadAsync("/assets/enemy-poster-b.png"),
    tex.loadAsync("/assets/textures/asphalt_diff.jpg"),
    tex.loadAsync("/assets/textures/asphalt_nor.jpg"),
    tex.loadAsync("/assets/textures/asphalt_rough.jpg"),
    tex.loadAsync("/assets/textures/concrete_diff.jpg"),
    tex.loadAsync("/assets/textures/concrete_nor.jpg"),
    tex.loadAsync("/assets/textures/concrete_rough.jpg"),
    rgbe.loadAsync("/assets/hdri/shanghai_bund_1k.hdr"),
  ]);

  posterA.colorSpace = THREE.SRGBColorSpace;
  posterB.colorSpace = THREE.SRGBColorSpace;
  posterA.anisotropy = posterB.anisotropy = 8;
  colorMap(asphaltDiff);
  linearMap(asphaltNor);
  linearMap(asphaltRough);
  colorMap(concreteDiff);
  linearMap(concreteNor);
  linearMap(concreteRough);

  asphaltDiff.repeat.set(18, 42);
  asphaltNor.repeat.set(18, 42);
  asphaltRough.repeat.set(18, 42);
  concreteDiff.repeat.set(2, 4);
  concreteNor.repeat.set(2, 4);
  concreteRough.repeat.set(2, 4);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(hdr).texture;
  hdr.dispose();
  pmrem.dispose();

  const billboards = {
    kiroshi: compositeBillboard(posterA, {
      title: "KIROSHI",
      kana: "キロシ",
      accent: "#ff7a18",
    }),
    future: compositeBillboard(posterB, {
      title: "FUTURE",
      kana: "未来はここにある",
      accent: "#3ee6ff",
    }),
    muse: compositeBillboard(posterA, {
      title: "MUSE",
      kana: "覚醒",
      accent: "#ff2ea6",
    }),
    chrome: compositeBillboard(posterB, {
      title: "CHROME",
      kana: "接続",
      accent: "#ffb020",
    }),
  };

  return {
    posterA,
    posterB,
    asphaltDiff,
    asphaltNor,
    asphaltRough,
    concreteDiff,
    concreteNor,
    concreteRough,
    env,
    billboards,
    windowTex: makeWindowTexture(),
    smokeTex: makeSmokeTexture(),
    wrapTex: makeWrapTexture(),
    signs: {
      pink: makeSignTexture("キロシ", "#ff3d8a", true),
      cyan: makeSignTexture("未来", "#3ee6ff", true),
      orange: makeSignTexture("来来", "#ff8a1a", true),
      night: makeSignTexture("NIGHT\nCITY", "#5cf0ff", false),
      sake: makeSignTexture("夜", "#ff2ea6", true),
    },
  };
}

export function compositeBillboard(poster, { title, kana, accent }) {
  const w = 768;
  const h = 1152;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#07070c";
  ctx.fillRect(0, 0, w, h);

  const img = poster.image;
  const iw = img.width;
  const ih = img.height;
  const scale = Math.max(w / iw, (h * 0.86) / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, (w - dw) / 2, (h * 0.86 - dh) / 2, dw, dh);

  const g = ctx.createLinearGradient(0, h * 0.55, 0, h);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.82)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = accent;
  ctx.lineWidth = 18;
  ctx.strokeRect(10, 10, w - 20, h - 20);

  ctx.fillStyle = accent;
  ctx.font = "700 72px Orbitron, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(title, w / 2, h - 118);
  ctx.fillStyle = "#e8fbff";
  ctx.font = "900 42px NotoSansJP, sans-serif";
  ctx.fillText(kana, w / 2, h - 58);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export function makeWindowTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 1024;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#0a0c12";
  ctx.fillRect(0, 0, 512, 1024);
  const cols = 8;
  const rows = 18;
  const bw = 512 / cols;
  const bh = 1024 / rows;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (Math.random() < 0.22) continue;
      const warm = Math.random() < 0.28;
      const a = 0.35 + Math.random() * 0.65;
      ctx.fillStyle = warm
        ? `rgba(255, 170, 90, ${a})`
        : `rgba(80, 210, 255, ${a})`;
      const pad = 6 + Math.random() * 4;
      ctx.fillRect(x * bw + pad, y * bh + pad, bw - pad * 2, bh - pad * 2);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

export function makeSmokeTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(128, 140, 10, 128, 128, 120);
  g.addColorStop(0, "rgba(210,230,255,0.55)");
  g.addColorStop(0.4, "rgba(160,190,220,0.22)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeWrapTexture() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#1a1512";
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = "#3a322c";
  ctx.lineWidth = 6;
  for (let i = -128; i < 256; i += 16) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 128, 128);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(i, 128);
    ctx.lineTo(i + 128, 0);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, 4);
  return t;
}

export function makeSignTexture(text, color, vertical) {
  const c = document.createElement("canvas");
  c.width = vertical ? 256 : 512;
  c.height = vertical ? 1024 : 256;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#050508";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = color;
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, c.width - 16, c.height - 16);
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const chars = [...text.replace(/\n/g, "")];
  if (vertical && chars.length > 1) {
    ctx.font = `900 ${Math.min(120, (c.height - 80) / chars.length)}px NotoSansJP, Orbitron, sans-serif`;
    const step = (c.height - 80) / chars.length;
    chars.forEach((ch, i) => {
      ctx.shadowColor = color;
      ctx.shadowBlur = 24;
      ctx.fillText(ch, c.width / 2, 50 + step * i + step / 2);
    });
  } else {
    ctx.font = `700 72px Orbitron, NotoSansJP, sans-serif`;
    ctx.shadowColor = color;
    ctx.shadowBlur = 22;
    ctx.fillText(text.replace("\n", " "), c.width / 2, c.height / 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
