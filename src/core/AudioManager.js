export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.ambienceGain = null;
    this.musicOn = true;
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

  toggleMusic() {
    this.musicOn = !this.musicOn;
    if (this.musicGain) {
      this.musicGain.gain.setTargetAtTime(this.musicOn ? 0.42 : 0, this.ctx.currentTime, 0.15);
    }
    return this.musicOn;
  }
}
