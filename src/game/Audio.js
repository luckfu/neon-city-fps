export class Sfx {
  constructor() {
    this.ctx = null;
    this.rain = null;
  }

  resume() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx();
      this.#rain();
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
  }

  #rain() {
    const ctx = this.ctx;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.18;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1400;
    filter.Q.value = 0.7;
    const gain = ctx.createGain();
    gain.gain.value = 0.07;
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start();
    this.rain = src;
  }

  #blip(freq, dur, type = "square", vol = 0.08, slide = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  slash() {
    this.#blip(220, 0.12, "sawtooth", 0.05, -140);
    this.#blip(880, 0.08, "triangle", 0.03, 400);
  }
  gun() {
    this.#blip(90, 0.07, "square", 0.07, -40);
    this.#noise(0.05, 0.07);
  }
  empty() {
    this.#blip(180, 0.05, "square", 0.03);
  }
  reload() {
    this.#blip(300, 0.08, "square", 0.04);
    this.#blip(180, 0.12, "triangle", 0.04, 80);
  }
  shutter() {
    this.#noise(0.04, 0.1);
    this.#blip(1200, 0.06, "square", 0.04, -600);
  }
  hit() {
    this.#blip(520, 0.07, "square", 0.05);
  }
  hurt() {
    this.#blip(140, 0.16, "sawtooth", 0.06, -80);
  }
  death() {
    this.#blip(90, 0.4, "sawtooth", 0.07, -50);
  }

  #noise(dur, vol) {
    if (!this.ctx) return;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(g).connect(this.ctx.destination);
    src.start();
  }
}
