export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.just = new Set();
    this.move = { x: 0, y: 0 };
    this.look = { x: 0, y: 0 };
    this.run = false;
    this.locked = false;
    this.touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (this.touch) document.body.classList.add('touch');
    this._bindKeyboard();
    this._bindMouse();
    this._bindTouch();
  }

  _bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (!this.keys.has(e.code)) this.just.add(e.code);
      this.keys.add(e.code);
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.run = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.run = false;
    });
    window.addEventListener('blur', () => { this.keys.clear(); this.run = false; });
  }

  _bindMouse() {
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.mouseAttack = true;
      if (!this.touch && !this.locked) this.canvas.requestPointerLock();
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.canvas;
    });
    window.addEventListener('mousemove', (e) => {
      if (this.locked) {
        this.look.x -= e.movementX * 0.0026;
        this.look.y -= e.movementY * 0.0022;
      }
    });
  }

  _bindTouch() {
    const stick = document.getElementById('stick');
    const knob = document.getElementById('knob');
    const runBtn = document.getElementById('btnRun');
    if (!stick) return;
    let stickId = null;
    let origin = { x: 0, y: 0 };
    const setKnob = (dx, dy) => {
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    stick.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0];
      stickId = t.identifier;
      const rect = stick.getBoundingClientRect();
      origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      e.preventDefault();
    }, { passive: false });
    const onMove = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier !== stickId) continue;
        let dx = t.clientX - origin.x;
        let dy = t.clientY - origin.y;
        const max = 44;
        const len = Math.hypot(dx, dy);
        if (len > max) { dx = (dx / len) * max; dy = (dy / len) * max; }
        setKnob(dx, dy);
        this.move.x = dx / max;
        this.move.y = dy / max;
      }
      e.preventDefault();
    };
    stick.addEventListener('touchmove', onMove, { passive: false });
    const onEnd = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier !== stickId) continue;
        stickId = null;
        setKnob(0, 0);
        this.move.x = 0;
        this.move.y = 0;
      }
    };
    stick.addEventListener('touchend', onEnd);
    stick.addEventListener('touchcancel', onEnd);
    runBtn.addEventListener('touchstart', (e) => { this.run = true; e.preventDefault(); }, { passive: false });
    runBtn.addEventListener('touchend', (e) => { this.run = false; e.preventDefault(); }, { passive: false });
    const hold = (id, code) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('touchstart', (e) => { this.just.add(code); e.preventDefault(); }, { passive: false });
    };
    hold('btnAttack', 'KeyJ');
    hold('btnKick', 'KeyK');
    hold('btnDodge', 'KeyL');
    hold('btnAsk', 'KeyQ');
    hold('btnKnife', 'Digit1');
    hold('btnGun', 'Digit2');
    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      if (t.clientX < window.innerWidth * 0.35) return;
      this.look.x -= (t.clientX - (this._lx ?? t.clientX)) * 0.006;
      this.look.y -= (t.clientY - (this._ly ?? t.clientY)) * 0.005;
      this._lx = t.clientX;
      this._ly = t.clientY;
      e.preventDefault();
    }, { passive: false });
    this.canvas.addEventListener('touchend', () => { this._lx = undefined; this._ly = undefined; });
  }

  pressed(code) {
    return this.just.has(code);
  }

  endFrame() {
    this.just.clear();
    this.mouseAttack = false;
  }

  axis() {
    let x = this.move.x;
    let y = this.move.y;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y -= 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    return { x, y, len: Math.min(1, len) };
  }

  consumeLook() {
    const l = { x: this.look.x, y: this.look.y };
    this.look.x = 0;
    this.look.y = 0;
    return l;
  }
}
