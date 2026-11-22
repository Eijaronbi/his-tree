import assert from 'node:assert/strict';
import test from 'node:test';
import { FrameMetrics, formatFps } from '../src/core/FrameMetrics.js';

test('slow frames use real elapsed time instead of clamped simulation time', () => {
  const metrics = new FrameMetrics({ reportIntervalMs: 1000 });
  let report = null;
  for (let i = 0; i < 3; i++) report = metrics.recordFrame(600) || report;
  assert.ok(report);
  assert.ok(Math.abs(report.fps - 1.6666666667) < 1e-9);
  assert.equal(report.frameMsMedian, 600);
  assert.equal(formatFps(report.fps), '1.7');
});

test('reports frame count, mean, median and p95 over the reporting interval', () => {
  const metrics = new FrameMetrics({ reportIntervalMs: 950 });
  let report = null;
  for (const ms of [16, 17, 18, 770, 19, 20, 21, 22, 23, 24]) {
    report = metrics.recordFrame(ms) || report;
  }
  assert.ok(report);
  assert.equal(report.frames, 10);
  assert.equal(report.elapsedMs, 950);
  assert.equal(report.frameMsMedian, 20.5);
  assert.equal(report.frameMsP95, 770);
  assert.equal(report.frameMsMean, 95);
  assert.equal(formatFps(report.fps), '11');
});

test('long frames are not silently discarded', () => {
  const metrics = new FrameMetrics({ reportIntervalMs: 1000 });
  const report = metrics.recordFrame(1566.5);
  assert.equal(report.frames, 1);
  assert.equal(report.elapsedMs, 1566.5);
  assert.equal(report.frameMsMedian, 1566.5);
  assert.equal(report.frameMsP95, 1566.5);
  assert.equal(report.fps, 1000 / 1566.5);
});

test('resets interval counters while retaining a bounded frame-time window', () => {
  const metrics = new FrameMetrics({ reportIntervalMs: 100, windowSize: 3 });
  metrics.recordFrame(10);
  metrics.recordFrame(20);
  metrics.recordFrame(30);
  const first = metrics.recordFrame(40);
  assert.deepEqual(first, {
    frames: 4,
    elapsedMs: 100,
    fps: 40,
    frameMsMean: 30,
    frameMsMedian: 30,
    frameMsP95: 40
  });
  const second = metrics.recordFrame(100);
  assert.equal(second.frames, 1);
  assert.equal(second.elapsedMs, 100);
  assert.equal(second.frameMsMedian, 40);
  assert.equal(second.frameMsP95, 100);
});

test('rejects non-finite and negative samples', () => {
  const metrics = new FrameMetrics();
  assert.equal(metrics.recordFrame(-1), null);
  assert.equal(metrics.recordFrame(Number.NaN), null);
  assert.equal(metrics.recordFrame(Number.POSITIVE_INFINITY), null);
  assert.deepEqual(metrics.recentFrameTimes(), []);
});
