const TIERS = {
  low: {
    baseDpr: 1.0,
    maxScale: 0.8,
    minScale: 0.72,
    shadowMap: 1024,
    shadows: true,
    post: false,
    targetFps: 30
  },
  medium: {
    baseDpr: 1.5,
    maxScale: 1.0,
    minScale: 0.75,
    shadowMap: 1536,
    shadows: true,
    post: true,
    targetFps: 45
  },
  high: {
    baseDpr: 2.0,
    maxScale: 1.0,
    minScale: 0.8,
    shadowMap: 2048,
    shadows: true,
    post: true,
    targetFps: 60
  }
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function tierSettings(name) {
  return TIERS[name] || TIERS.high;
}

export class QualityController {
  constructor(renderer, options = {}) {
    this.renderer = renderer;
    this.tier = TIERS[options.tier] ? options.tier : 'high';
    this.manual = options.manual === true;
    this.onChange = typeof options.onChange === 'function' ? options.onChange : null;
    this.devicePixelRatio = Math.min(window.devicePixelRatio || 1, 3);
    this.scale = 1;
    this.step = 0;
    this.shadowsEnabled = true;
    this.frames = 0;
    this.accum = 0;
    this.lowStreak = 0;
    this.highStreak = 0;
    this.fps = 60;
    this.paused = false;
    this.scaleLocked = false;
    this._savedScale = undefined;
    this.state = { tier: this.tier, scale: 1, step: 0, dpr: 1, shadows: true, fps: 60 };
    this.targetFps = options.targetFps || tierSettings(this.tier).targetFps;
    this.apply();
  }

  settings() {
    return tierSettings(this.tier);
  }

  effectivePixelRatio() {
    const s = this.settings();
    const base = Math.min(s.baseDpr, this.devicePixelRatio);
    return clamp(base * this.scale, 0.5, 3);
  }

  setTier(tier, manual = true) {
    if (!TIERS[tier]) return;
    this.tier = tier;
    this.manual = manual;
    this.step = 0;
    this.scale = 1;
    this.targetFps = this.settings().targetFps;
    this.apply();
  }

  setManual(manual) {
    this.manual = manual === true;
    if (!this.manual) {
      this.step = 0;
      this.scale = 1;
      this.apply();
    }
  }

  /**
   * Lock the render resolution. Used by the first person camera, where a
   * downscaled buffer reads as a half resolution screen.
   */
  setScaleLock(on) {
    const want = !!on;
    if (want === this.scaleLocked) return;
    this.scaleLocked = want;
    if (want) {
      this._savedScale = this.scale;
      this.scale = 1;
    } else if (this._savedScale !== undefined) {
      this.scale = this._savedScale;
      this._savedScale = undefined;
    }
    this.apply();
  }

  apply() {
    const s = this.settings();
    const dpr = this.effectivePixelRatio();
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.shadowsEnabled = s.shadows;
    this.state.tier = this.tier;
    this.state.scale = this.scale;
    this.state.step = this.step;
    this.state.dpr = dpr;
    this.state.shadows = this.shadowsEnabled;
    this.state.fps = this.fps;
    if (this.onChange) this.onChange(this.state);
  }

  stepDown() {
    const s = this.settings();
    this.step += 1;
    if (this.step === 1) this.scale = Math.max(s.minScale, this.scale * 0.82);
    else if (this.step === 2) this.scale = Math.max(s.minScale, this.scale * 0.88);
    else if (this.step === 3) this.scale = s.minScale;
    this.apply();
  }

  stepUp() {
    const s = this.settings();
    if (this.step === 0) return;
    this.step -= 1;
    if (this.step === 0) this.scale = 1;
    else if (this.step === 1) this.scale = Math.min(s.maxScale, this.scale * 1.1);
    else this.scale = Math.min(s.maxScale, this.scale * 1.08);
    this.apply();
  }

  update(dt) {
    if (this.paused) return;
    const d = Math.min(1, Math.max(0.0001, dt));
    this.accum += d;
    this.frames += 1;
    if (this.accum < 1) return;
    this.fps = this.frames / this.accum;
    this.state.fps = this.fps;
    this.accum = 0;
    this.frames = 0;
    if (this.manual || this.scaleLocked) return;
    const target = this.targetFps;
    if (this.fps < target * 0.72) {
      this.lowStreak += 1;
      this.highStreak = 0;
      if (this.lowStreak >= 2) {
        this.lowStreak = 0;
        this.stepDown();
      }
    } else if (this.fps > target * 1.15) {
      this.highStreak += 1;
      this.lowStreak = 0;
      if (this.highStreak >= 8) {
        this.highStreak = 0;
        this.stepUp();
      }
    } else {
      this.lowStreak = 0;
      this.highStreak = 0;
    }
  }
}
