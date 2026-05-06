import './styles.css';
import { Loop } from './engine/loop';
import { createRenderer } from './render/renderer';
import { World } from './game/world';
import { HUD } from './render/hud';
import { ControlsDispatcher, makeInputState } from './input/controls';
import { SingleThumbAutoAimScheme } from './input/schemes/single-thumb-autoaim';
import { config } from './config';
import { registerServiceWorker } from './pwa/register';

async function main(): Promise<void> {
  const host = document.getElementById('app');
  if (!host) throw new Error('#app missing');

  const renderer = await createRenderer(host);
  const world = new World(renderer);
  const hud = new HUD(host);
  hud.bindCounters(
    () => world.particles.count,
    () => world.entityCount(),
  );

  const controls = new ControlsDispatcher();
  const input = makeInputState();
  controls.attach(host, renderer.viewport, config.controls.scheme, (s) => {
    switch (s) {
      case 'single-thumb-autoaim':
      default:
        return new SingleThumbAutoAimScheme();
    }
  });

  // Re-layout the grid on viewport changes — Pixi resize fires on rAF.
  renderer.app.renderer.on('resize', () => world.onResize());
  window.addEventListener('orientationchange', () => world.onResize());

  let lastFrame: import('./engine/loop').FrameInfo | null = null;
  const loop = new Loop({
    step: (dt) => world.step(dt, controls, input),
    render: (alpha) => {
      world.render(alpha);
      hud.update(world.score, lastFrame);
    },
    onFrame: (info) => {
      lastFrame = info;
    },
  });
  loop.start();

  // Try to lock orientation on user gesture (most browsers require it).
  const tryLock = (): void => {
    const so = (screen as Screen & {
      orientation?: { lock?: (o: string) => Promise<void> };
    }).orientation;
    so?.lock?.('landscape').catch(() => undefined);
  };
  host.addEventListener('pointerdown', tryLock, { once: true, passive: true });

  // Expose for debug & smoke test
  (window as Window & { __game?: unknown }).__game = { world, hud, loop, config };

  await registerServiceWorker();
}

main().catch((err) => {
  console.error(err);
  const host = document.getElementById('app');
  if (host) host.textContent = `boot failed: ${(err as Error).message}`;
});
