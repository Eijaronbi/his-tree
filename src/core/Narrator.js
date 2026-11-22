import { assetUrl } from './Assets.js';

const VOICE_KEY = 'his-tree:narrator:v1';

function hashText(str) {
  const bytes = new TextEncoder().encode(str);
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i += 1) {
    h ^= bytes[i];
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export class Narrator {
  constructor(base = './assets/audio/narration/') {
    this.base = base;
    this.manifest = null;
    this.voice = 'andrew';
    this.enabled = true;
    this.current = null;
    this.loading = null;
    const saved = readSetting(VOICE_KEY);
    if (saved) {
      if (saved.voice) this.voice = saved.voice;
      if (typeof saved.enabled === 'boolean') this.enabled = saved.enabled;
    }
  }

  async load() {
    if (this.manifest) return this.manifest;
    if (this.loading) return this.loading;
    this.loading = fetch(assetUrl(`${this.base}manifest.json`))
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => {
        this.manifest = m;
        if (m && m.voices && !m.voices.some((v) => v.id === this.voice)) this.voice = m.voices[0].id;
        return m;
      })
      .catch(() => null);
    return this.loading;
  }

  get voices() {
    return this.manifest && this.manifest.voices ? this.manifest.voices : [{ id: 'andrew', label: 'Andrew' }];
  }

  setVoice(id) {
    this.voice = id;
    this.persist();
  }

  setEnabled(on) {
    this.enabled = !!on;
    if (!this.enabled) this.stop();
    this.persist();
  }

  persist() {
    writeSetting(VOICE_KEY, { voice: this.voice, enabled: this.enabled });
  }

  stop() {
    if (this.current) {
      this.current.pause();
      this.current.currentTime = 0;
      this.current = null;
    }
  }

  clipFor(text) {
    if (!this.manifest || !this.manifest.clips) return null;
    const key = hashText(String(text).replace(/\s+/g, ' ').trim());
    const entry = this.manifest.clips[key];
    if (!entry) return null;
    return entry[this.voice] || entry[Object.keys(entry)[0]] || null;
  }

  speak(text, { interrupt = true } = {}) {
    if (!this.enabled || !text) return;
    const path = this.clipFor(text);
    if (!path) return;
    if (interrupt) this.stop();
    try {
      const audio = new Audio(assetUrl(path));
      audio.volume = 0.95;
      audio.addEventListener('ended', () => { if (this.current === audio) this.current = null; });
      this.current = audio;
      const p = audio.play();
      if (p && p.catch) p.catch(() => {});
    } catch (err) {
      void err;
    }
  }
}

function readSetting(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    void err;
    return null;
  }
}

function writeSetting(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    void err;
  }
}
