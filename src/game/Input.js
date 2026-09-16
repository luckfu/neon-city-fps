export class Input {
  constructor() {
    this.keys = Object.create(null);
    this.lookX = 0;
    this.lookY = 0;
    this.vHeld = false;
    this.pointerLocked = false;
    this.fireHeld = false;
    this.firePressed = false;
    this.weaponQueued = 0;
    this.reloadPressed = false;
    this.enabled = false;

    this._onKeyDown = (e) => this.#key(e, true);
    this._onKeyUp = (e) => this.#key(e, false);
    this._onMouseMove = (e) => this.#move(e);
    this._onDown = (e) => this.#button(e, true);
    this._onUp = (e) => this.#button(e, false);
    this._onLock = () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
    };
    this._onContext = (e) => e.preventDefault();
  }

  attach(canvas) {
    this.canvas = canvas;
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("mousemove", this._onMouseMove);
    window.addEventListener("pointerdown", this._onDown);
    window.addEventListener("pointerup", this._onUp);
    document.addEventListener("pointerlockchange", this._onLock);
    canvas.addEventListener("contextmenu", this._onContext);
  }

  enable() {
    this.enabled = true;
  }

  requestLock() {
    this.canvas?.requestPointerLock?.();
  }

  #key(e, down) {
    if (!this.enabled && down) return;
    if (e.code === "KeyV") this.vHeld = down;
    if (e.repeat) {
      this.keys[e.code] = down;
      return;
    }
    this.keys[e.code] = down;
    if (!down) return;
    if (e.code === "Digit1" || e.code === "Numpad1") this.weaponQueued = 1;
    if (e.code === "Digit2" || e.code === "Numpad2") this.weaponQueued = 2;
    if (e.code === "Digit3" || e.code === "Numpad3") this.weaponQueued = 3;
    if (e.code === "KeyR") this.reloadPressed = true;
  }

  #move(e) {
    if (!this.enabled) return;
    const looking = this.pointerLocked || this.vHeld;
    if (!looking) return;
    this.lookX += e.movementX || 0;
    this.lookY += e.movementY || 0;
  }

  #button(e, down) {
    if (!this.enabled) return;
    if (e.button !== 0) return;
    this.fireHeld = down;
    if (down) this.firePressed = true;
  }

  consumeLook() {
    const x = this.lookX;
    const y = this.lookY;
    this.lookX = 0;
    this.lookY = 0;
    return { x, y };
  }

  consumeFirePress() {
    const v = this.firePressed;
    this.firePressed = false;
    return v;
  }

  axis() {
    const f = (this.keys.KeyW || this.keys.ArrowUp ? 1 : 0) - (this.keys.KeyS || this.keys.ArrowDown ? 1 : 0);
    const r = (this.keys.KeyD || this.keys.ArrowRight ? 1 : 0) - (this.keys.KeyA || this.keys.ArrowLeft ? 1 : 0);
    return { f, r };
  }
}
