import { test, expect } from '@playwright/test';

const BENIGN_ERROR_PATTERNS: RegExp[] = [
  // PWA registration may bark on the preview server about scope or missing
  // controllers; not a game bug, not blocking play.
  /service worker/i,
  /sw registration/i,
  /workbox/i,
  // 404s for icons in headless ua
  /icon-/i,
];

function isBenign(text: string): boolean {
  return BENIGN_ERROR_PATTERNS.some((re) => re.test(text));
}

test('app boots, exposes __game, no fatal console errors', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  const allConsole: string[] = [];
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    const line = `${msg.type()}: ${msg.text()}`;
    allConsole.push(line);
    if (msg.type() === 'error' && !isBenign(msg.text())) errors.push(`console.error: ${msg.text()}`);
  });

  // 'load' is enough — networkidle is unreliable when a service worker keeps
  // the connection warm.
  await page.goto('/', { waitUntil: 'load', timeout: 30_000 });

  // Boot may take a few seconds for Pixi WebGL init on a software renderer.
  try {
    await page.waitForFunction(
      () => Boolean((window as Window & { __game?: unknown }).__game),
      null,
      { timeout: 30_000 },
    );
  } catch (err) {
    // Capture diagnostics for the failure artifact.
    await testInfo.attach('console.log', {
      body: allConsole.join('\n'),
      contentType: 'text/plain',
    });
    const html = await page.content().catch(() => '<unavailable>');
    await testInfo.attach('page.html', { body: html, contentType: 'text/html' });
    throw err;
  }

  // Light interaction so kills + particles can fire.
  const box = (await page.locator('#app').boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let i = 0; i < 10; i++) {
    await page.mouse.move(cx + 80 + Math.sin(i) * 40, cy + 30 + Math.cos(i) * 40, { steps: 2 });
    await page.waitForTimeout(150);
  }
  await page.mouse.up();

  const stats = await page.evaluate(() => {
    const w = window as Window & {
      __game?: {
        world: { entityCount(): number; particles: { count: number } };
      };
    };
    if (!w.__game) return null;
    return {
      entities: w.__game.world.entityCount(),
      particles: w.__game.world.particles.count,
    };
  });
  expect(stats).not.toBeNull();
  expect(stats!.entities).toBeGreaterThanOrEqual(1);

  if (errors.length) {
    await testInfo.attach('console.log', {
      body: allConsole.join('\n'),
      contentType: 'text/plain',
    });
  }
  expect(errors, errors.join('\n')).toEqual([]);
});
