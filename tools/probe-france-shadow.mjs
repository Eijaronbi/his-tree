import fs from 'node:fs';
import { chromium } from 'playwright';

const output = 'artifacts/france-shadow-ab';
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
try {
  await page.goto('http://127.0.0.1:8099/?chapter=france-1917&auto=1&cine=0&q=low', { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.__game?.state?.world && window.__game.state.player, null, { timeout: 180000 });
  await page.waitForTimeout(1200);
  const found = await page.evaluate(() => {
    const matches = [];
    window.__game.state.world.group.traverse((object) => {
      const parameters = object.geometry?.parameters;
      if (object.isMesh && object.material?.transparent && parameters?.width === 10 && parameters?.height === 34) {
        matches.push(object);
      }
    });
    window.__probeShadows = matches;
    return matches.length;
  });
  await page.screenshot({ path: `${output}/before.png` });
  await page.evaluate(() => {
    for (const object of window.__probeShadows || []) object.visible = false;
  });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.screenshot({ path: `${output}/without-large-shadow.png` });
  fs.writeFileSync(`${output}/report.json`, JSON.stringify({ largeTransparentPlanes: found }, null, 2));
  console.log(JSON.stringify({ largeTransparentPlanes: found, screenshots: [`${output}/before.png`, `${output}/without-large-shadow.png`] }));
} finally {
  await browser.close();
}
