export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.ambienceGain = null;
    this.musicOn = true;
    this.sfxOn = true;
    this.started = false;
    this.timer = null;
  }

  start() {
    if (this.started) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.7;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicOn ? 0.42 : 0;
    this.musicGain.connect(this.master);
    this.ambienceGain = this.ctx.createGain();
    this.ambienceGain.gain.value = 0.22;
    this.ambienceGain.connect(this.master);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxOn ? 0.8 : 0;
    this.sfxGain.connect(this.master);
    this._buildWind();
    this._buildDrums();
    this.started = true;
  }

  _buildWind() {
    const ctx = this.ctx;
    const length = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = last * 0.96 + white * 0.04;
      data[i] = last * 3.2;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 420;
    filter.Q.value = 0.7;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 180;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();
    src.connect(filter);
    filter.connect(this.ambienceGain);
    src.start();
  }

  _buildDrums() {
    const ctx = this.ctx;
    const beat = (time, freq, dur, gain, type = 'sine') => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, time);
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.55), time + dur * 0.7);
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(gain, time + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
      osc.connect(g);
      g.connect(this.musicGain);
      osc.start(time);
      osc.stop(time + dur + 0.05);
    };
    const pattern = [
      [0, 96, 0.42, 0.55], [0.5, 62, 0.28, 0.32], [0.75, 148, 0.2, 0.18],
      [1.0, 88, 0.4, 0.48], [1.5, 62, 0.26, 0.3], [1.75, 152, 0.18, 0.16]
    ];
    const schedule = () => {
      if (!this.ctx) return;
      const t0 = this.ctx.currentTime + 0.08;
      for (const [offset, freq, dur, gain] of pattern) beat(t0 + offset, freq, dur, gain);
      for (const [offset, freq, dur, gain] of pattern) beat(t0 + offset + 0.25, freq * 1.5, dur * 0.6, gain * 0.32, 'triangle');
      this.timer = setTimeout(schedule, 2000);
    };
    schedule();
  }

  toggleSfx() {
    this.sfxOn = !this.sfxOn;
    if (this.sfxGain) {
      this.sfxGain.gain.setTargetAtTime(this.sfxOn ? 0.8 : 0, this.ctx.currentTime, 0.05);
    }
    return this.sfxOn;
  }

  noise(dur, freq, q, gain, type = 'bandpass') {
    if (!this.ctx || !this.sfxOn) return;
    const ctx = this.ctx;
    const length = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    src.start();
  }

  tone(freq, dur, gain, type = 'sine', slide = 1) {
    if (!this.ctx || !this.sfxOn) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), ctx.currentTime + dur);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start();
    osc.stop(ctx.currentTime + dur + 0.02);
  }

  sfx(name) {
    if (!this.ctx || !this.sfxOn) return;
    switch (name) {
      case 'punch': this.noise(0.16, 320, 1.1, 0.7); this.tone(110, 0.12, 0.35, 'sine', 0.6); break;
      case 'kick': this.noise(0.2, 220, 1.0, 0.8); this.tone(90, 0.16, 0.4, 'sine', 0.5); break;
      case 'gun': this.noise(0.42, 1500, 0.4, 0.9, 'lowpass'); this.tone(70, 0.3, 0.5, 'square', 0.35); break;
      case 'knife': this.noise(0.12, 4200, 2.2, 0.35, 'highpass'); break;
      case 'stab': this.noise(0.22, 260, 0.9, 0.85); this.tone(140, 0.14, 0.3, 'triangle', 0.5); break;
      case 'step': this.noise(0.07, 260, 0.8, 0.18, 'lowpass'); break;
      case 'clap': this.noise(0.09, 1500, 0.7, 0.35); break;
      case 'thud': this.noise(0.3, 160, 0.7, 0.6, 'lowpass'); break;
      case 'ui': this.tone(660, 0.06, 0.18, 'triangle', 1.3); break;
      case 'pickup': this.tone(520, 0.1, 0.2, 'sine', 1.6); break;
      default: break;
    }
  }

  toggleMusic() {
    this.musicOn = !this.musicOn;
    if (this.musicGain) {
      this.musicGain.gain.setTargetAtTime(this.musicOn ? 0.42 : 0, this.ctx.currentTime, 0.15);
    }
    return this.musicOn;
  }
}
