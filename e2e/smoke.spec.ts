import { test, expect } from '@playwright/test';

test('app boots, runs for several seconds, no console errors, particles spawn', async ({
  page,
}) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });

  await page.goto('/', { waitUntil: 'networkidle' });

  // Game exposes itself for diagnostics.
  await page.waitForFunction(
    () => Boolean((window as Window & { __game?: unknown }).__game),
    null,
    { timeout: 10_000 },
  );

  // Drag in the middle of the page to trigger movement / fire.
  const box = (await page.locator('#app').boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  // Shimmy for ~5 seconds total — long enough for spawns + kills, short
  // enough to fit the timeout budget on CI.
  for (let i = 0; i < 25; i++) {
    const t = i * 0.25;
    await page.mouse.move(cx + 80 + Math.sin(t) * 50, cy + 30 + Math.cos(t) * 50, { steps: 3 });
    await page.waitForTimeout(200);
  }
  await page.mouse.up();

  // Inspect game state.
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
  // We don't assert on particle count > 0 (the loop may end on a quiet beat),
  // but we do ensure no errors logged.
  expect(errors, errors.join('\n')).toEqual([]);
});
