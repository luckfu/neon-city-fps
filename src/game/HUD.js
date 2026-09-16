import { CFG } from "./config.js";

export class HUD {
  constructor() {
    this.mag = document.getElementById("mag");
    this.reserve = document.getElementById("reserve");
    this.mode = document.getElementById("ammoMode");
    this.pips = document.getElementById("pips");
    this.hpFill = document.getElementById("hpFill");
    this.fpsEl = document.getElementById("fps");
    this.hitMarker = document.getElementById("hitMarker");
    this.hurt = document.getElementById("hurt");
    this.flashEl = document.getElementById("flash");
    this.slots = [...document.querySelectorAll(".slot")];
    this.hud = document.getElementById("hud");
    this.overlay = document.getElementById("overlay");
    this.ovMsg = document.getElementById("ovMsg");
    this.startBtn = document.getElementById("startBtn");
    this.card = document.querySelector(".ov-card");
    this.title = this.card.querySelector("h1");
    this.sub = this.card.querySelector(".ov-sub");

    this.pips.innerHTML = Array.from({ length: 8 }, () => "<span></span>").join("");
    this._fpsAcc = 0;
    this._fpsFrames = 0;
    this._hitT = 0;
    this._hurtT = 0;
    this._flashT = 0;
  }

  showPlay() {
    this.overlay.classList.add("hidden");
    this.hud.hidden = false;
  }

  gameOver() {
    this.card.classList.add("dead");
    this.title.textContent = "FLATLINED";
    this.sub.textContent = "The street keeps the rain. Try again.";
    this.startBtn.textContent = "RESTART";
    this.overlay.classList.remove("hidden");
    this.hud.hidden = true;
  }

  resetOverlay() {
    this.card.classList.remove("dead");
    this.title.textContent = "KIROSHI NIGHT";
    this.sub.textContent = "Rain. Neon. Steel. Hold the street.";
    this.startBtn.textContent = "CLICK TO ENTER";
  }

  onHit(result) {
    this._hitT = result === "kill" ? 0.22 : 0.12;
  }

  hurtPulse() {
    this._hurtT = 0.35;
  }

  flash() {
    this._flashT = 0.16;
  }

  update(dt, weapons, player, fpsSample) {
    this.mag.textContent = String(weapons.mag);
    this.reserve.textContent = String(weapons.reserve);
    this.mode.textContent =
      weapons.slot === 1 ? "MELEE" : weapons.slot === 2 ? "PING" : weapons.reloadT > 0 ? "RELOAD" : "AUTO";

    const filled = Math.round((weapons.mag / CFG.magSize) * 8);
    [...this.pips.children].forEach((el, i) => el.classList.toggle("on", i < filled));

    this.slots.forEach((el) => el.classList.toggle("selected", Number(el.dataset.slot) === weapons.slot));
    this.hpFill.style.width = `${Math.max(0, player.hp)}%`;
    this.hpFill.style.background =
      player.hp < 30 ? "linear-gradient(90deg,#ff2d55,#ff8aa0)" : "linear-gradient(90deg,#1ec8e6,#7dfff4)";

    this._fpsAcc += dt;
    this._fpsFrames++;
    if (this._fpsAcc >= 0.4) {
      this.fpsEl.textContent = String(Math.round(this._fpsFrames / this._fpsAcc));
      this._fpsAcc = 0;
      this._fpsFrames = 0;
    }
    void fpsSample;

    this._hitT = Math.max(0, this._hitT - dt);
    this.hitMarker.classList.toggle("on", this._hitT > 0);
    this._hurtT = Math.max(0, this._hurtT - dt);
    this.hurt.style.opacity = String(this._hurtT > 0 ? Math.min(1, this._hurtT * 3) : 0);
    this._flashT = Math.max(0, this._flashT - dt);
    this.flashEl.style.opacity = String(this._flashT > 0 ? this._flashT / 0.16 : 0);
  }
}
