export function formatFps(value) {
  if (!Number.isFinite(value) || value < 0) return '—';
  return value < 10 ? value.toFixed(1) : String(Math.round(value));
}

function percentile(sorted, fraction) {
  if (!sorted.length) return 0;
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
}

export class FrameMetrics {
  constructor({ reportIntervalMs = 1000, windowSize = 120 } = {}) {
    this.reportIntervalMs = reportIntervalMs;
    this.windowSize = windowSize;
    this.frames = 0;
    this.elapsedMs = 0;
    this.samples = [];
    this.latest = null;
  }

  recordFrame(frameMs) {
    if (!Number.isFinite(frameMs) || frameMs < 0) return null;
    this.frames++;
    this.elapsedMs += frameMs;
    this.samples.push(frameMs);
    if (this.samples.length > this.windowSize) this.samples.shift();
    if (this.elapsedMs < this.reportIntervalMs) return null;
    return this.snapshot();
  }

  recentFrameTimes() {
    return this.samples.slice();
  }

  snapshot() {
    const sorted = this.samples.slice().sort((a, b) => a - b);
    const frameMsMean = sorted.length ? sorted.reduce((sum, value) => sum + value, 0) / sorted.length : 0;
    const middle = Math.floor(sorted.length / 2);
    const frameMsMedian = !sorted.length ? 0 : sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
    const fps = this.elapsedMs > 0 ? this.frames * 1000 / this.elapsedMs : 0;
    this.latest = {
      frames: this.frames,
      elapsedMs: this.elapsedMs,
      fps,
      frameMsMean,
      frameMsMedian,
      frameMsP95: percentile(sorted, 0.95)
    };
    this.frames = 0;
    this.elapsedMs = 0;
    return this.latest;
  }
}
