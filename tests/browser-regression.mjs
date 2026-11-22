import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const chapter = process.argv[2] || 'berlin-1989';
const outputDir = process.argv[3] || `artifacts/regression-${chapter}`;
const baseUrl = process.env.HIS_TREE_URL || 'http://127.0.0.1:8099';
fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding'
  ]
});

const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();
const errors = [];
const failedRequests = [];
page.on('pageerror', (error) => errors.push(String(error)));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});
page.on('requestfailed', (request) => failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));

let report;
try {
  const started = Date.now();
  await page.goto(`${baseUrl}/?chapter=${chapter}&cine=0&q=low`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => {
    const game = window.__game;
    return game?.state?.world && game.state.player && game.state.quest;
  }, null, { timeout: 180000, polling: 500 });
  for (let i = 0; i < 4; i++) {
    const dialogueOpen = await page.evaluate(() => {
      const dialog = document.getElementById('dialog');
      return dialog ? dialog.style.display !== 'none' : false;
    });
    if (!dialogueOpen) break;
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(700);
  }
  await page.waitForTimeout(1800);
  assert.equal(await page.evaluate(() => {
    const dialog = document.getElementById('dialog');
    return dialog ? dialog.style.display !== 'none' : false;
  }), false, 'opening dialogue must be dismissed before gameplay checks');

  const scene = await page.evaluate(() => {
    const game = window.__game;
    const state = game.state;
    const playerTarget = state.player.position.clone();
    playerTarget.y += 1.1;
    const direction = playerTarget.clone().sub(game.camera.position);
    const targetDistance = direction.length();
    const raycaster = new game.THREE.Raycaster(game.camera.position, direction.normalize(), 0, targetDistance);
    const hits = raycaster.intersectObject(state.world.group, true).filter((hit) => {
      let current = hit.object;
      while (current) {
        if (!current.visible) return false;
        current = current.parent;
      }
      return hit.distance < targetDistance - 0.2;
    }).slice(0, 12).map((hit) => ({
      distance: hit.distance,
      point: hit.point.toArray(),
      name: hit.object.name || null,
      type: hit.object.type,
      geometry: hit.object.geometry?.type || null,
      objectPosition: hit.object.position.toArray()
    }));
    const forward = new game.THREE.Vector3();
    game.camera.getWorldDirection(forward);
    const forwardRay = new game.THREE.Raycaster(game.camera.position, forward, 0, 120);
    const forwardHits = forwardRay.intersectObject(state.world.group, true).filter((hit) => {
      let current = hit.object;
      while (current) {
        if (!current.visible) return false;
        current = current.parent;
      }
      return true;
    }).slice(0, 20).map((hit) => ({
      distance: hit.distance,
      point: hit.point.toArray(),
      name: hit.object.name || null,
      type: hit.object.type,
      geometry: hit.object.geometry?.type || null,
      objectPosition: hit.object.position.toArray(),
      objectRotation: [hit.object.rotation.x, hit.object.rotation.y, hit.object.rotation.z],
      objectScale: hit.object.scale.toArray(),
      material: hit.object.material ? {
        type: hit.object.material.type,
        transparent: hit.object.material.transparent,
        opacity: hit.object.material.opacity,
        color: hit.object.material.color?.getHexString()
      } : null
    }));
    return {
      chapter: state.chapter?.id,
      quest: Boolean(state.quest),
      npcs: Object.keys(state.npcs || {}),
      player: state.player.position.toArray(),
      camera: game.camera.position.toArray(),
      hall: state.world.hall || null,
      renderer: {
        calls: game.renderer.info.render.calls,
        triangles: game.renderer.info.render.triangles,
        geometries: game.renderer.info.memory.geometries,
        textures: game.renderer.info.memory.textures
      },
      occlusionHits: hits,
      forwardHits,
      stats: document.getElementById('stats')?.textContent || ''
    };
  });

  const timing = await page.evaluate(async () => {
    const intervals = [];
    let previous = await new Promise(requestAnimationFrame);
    for (let i = 0; i < 10; i++) {
      const now = await new Promise(requestAnimationFrame);
      intervals.push(now - previous);
      previous = now;
    }
    return { intervals, stats: document.getElementById('stats')?.textContent || '' };
  });

  const sorted = timing.intervals.slice().sort((a, b) => a - b);
  const measuredFps = 1000 / (timing.intervals.reduce((sum, value) => sum + value, 0) / timing.intervals.length);
  const displayedFps = Number.parseFloat(timing.stats);
  await page.screenshot({ path: path.join(outputDir, `${chapter}.png`) });
  report = {
    chapter,
    loadToStateMs: Date.now() - started,
    viewport: [1280, 720],
    scene,
    timing: {
      ...timing,
      frameMsMedian: sorted[Math.floor(sorted.length / 2)],
      measuredFps,
      displayedFps
    },
    errors,
    failedRequests
  };
  fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));

  assert.equal(scene.chapter, chapter);
  assert.ok(scene.quest);
  assert.ok(scene.renderer.triangles > 100, `whole-scene triangle count was ${scene.renderer.triangles}`);
  assert.ok(scene.renderer.calls > 1, `whole-scene draw-call count was ${scene.renderer.calls}`);
  assert.ok(Number.isFinite(displayedFps), `missing FPS in "${timing.stats}"`);
  assert.ok(displayedFps <= measuredFps * 1.75 + 0.5, `HUD ${displayedFps} FPS is inconsistent with measured ${measuredFps.toFixed(2)} FPS`);
  if (scene.hall) {
    assert.equal(scene.occlusionHits.length, 0, `camera-to-player ray crosses world geometry: ${JSON.stringify(scene.occlusionHits)}`);
  }
  assert.deepEqual(failedRequests, []);
  assert.deepEqual(errors.filter((error) => !error.includes('Pointer Lock')), []);
  console.log(JSON.stringify(report, null, 2));
  console.log('PASS browser regression checks');
} catch (error) {
  const failure = { error: String(error), report, errors, failedRequests };
  fs.writeFileSync(path.join(outputDir, 'failure.txt'), `${failure.error}\n`);
  console.error(failure.error);
  process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
}
