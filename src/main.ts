import './styles.css';
import { Loop } from './engine/loop';
import { createRenderer } from './render/renderer';
import { World } from './game/world';
import { HUD } from './render/hud';
import { ControlsDispatcher, makeInputState, type ControlSchemeImpl } from './input/controls';
import { SingleThumbAutoAimScheme } from './input/schemes/single-thumb-autoaim';
import { VirtualTwinSticksScheme } from './input/schemes/virtual-twin-sticks';
import { config, type ControlScheme } from './config';
import { registerServiceWorker } from './pwa/register';
import { TweaksMenu } from './tweaks/menu';
import { applyOverlay, loadOverlay } from './tweaks/state';
import { buildRegistry } from './tweaks/registry';
import { FourFingerTap } from './tweaks/gesture';
import { audioBus } from './audio/bus';
import { musicEngine } from './audio/music';
import { GameOverOverlay } from './ui/game-over';
import { MainMenu } from './ui/main-menu';
import { ComboCounter } from './ui/combo-counter';
import { ScorePopup } from './ui/score-popup';
import { events } from './engine/events';

function makeScheme(s: ControlScheme): ControlSchemeImpl {
  switch (s) {
    case 'virtual-twin-sticks':
      return new VirtualTwinSticksScheme();
    case 'single-thumb-autoaim':
    default:
      return new SingleThumbAutoAimScheme();
  }
}

async function main(): Promise<void> {
  const host = document.getElementById('app');
  if (!host) throw new Error('#app missing');

  // Apply persisted tweaks before anything that reads `config`.
  applyOverlay(buildRegistry(), loadOverlay());

  const renderer = await createRenderer(host);
  const world = new World(renderer);
  const hud = new HUD(host);
  hud.bindCounters(
    () => world.particles.count,
    () => world.entityCount(),
  );
  const comboCounter = new ComboCounter(host);
  new ScorePopup(host);

  const controls = new ControlsDispatcher();
  const input = makeInputState();
  controls.attach(host, renderer.viewport, config.controls.scheme, makeScheme);

  // Re-layout the grid on viewport changes — Pixi resize fires on rAF.
  renderer.app.renderer.on('resize', () => world.onResize());
  window.addEventListener('orientationchange', () => world.onResize());

  const startGame = (): void => {
    comboCounter.reset();
    world.reset();
    loop.setPaused(false);
    musicEngine.start();
  };

  const returnToMenu = (): void => {
    comboCounter.reset();
    world.reset();
    loop.setPaused(true);
    musicEngine.stop();
    mainMenu.show();
  };

  const mainMenu = new MainMenu(host, startGame);

  const gameOver = new GameOverOverlay(host, startGame, returnToMenu);

  events.on('gameOver', (e) => {
    // Small delay so the death-cam particles can be appreciated.
    setTimeout(() => gameOver.show(e.score, e.bestScore, e.peakMultiplier), 600);
  });

  let lastFrame: import('./engine/loop').FrameInfo | null = null;
  const loop = new Loop({
    step: (dt) => world.step(dt, controls, input),
    render: (alpha) => {
      world.render(alpha);
      hud.update(world.score, lastFrame, world.lives);
      comboCounter.update(world.score.multiplier);
    },
    onFrame: (info) => {
      lastFrame = info;
      tweaks?.feedFrameInfo(info);
    },
  });
  // Start paused — the main menu unpauses on "play".
  loop.setPaused(true);
  loop.start();

  // Tweaks Menu
  const tweaks = new TweaksMenu(host, {
    onConfigChanged: () => {
      // Hot-swap control scheme if it changed.
      if (config.controls.scheme !== controls.scheme) {
        controls.swap(config.controls.scheme, makeScheme);
      }
    },
    onOpen: () => loop.setPaused(true),
    onClose: () => loop.setPaused(false),
    particleCount: () => world.particles.count,
    entityCount: () => world.entityCount(),
  });

  // Four-finger tap to open the menu.
  const gesture = new FourFingerTap(host, () => tweaks.toggle());
  gesture.attach();

  // Dev-build only floating icon for desktop / quick access in non-touch envs.
  if (import.meta.env.DEV) {
    const btn = document.createElement('div');
    btn.className = 'tweaks-icon';
    btn.textContent = '⚙';
    btn.addEventListener('click', () => tweaks.toggle());
    document.body.appendChild(btn);
  }

  // Keyboard shortcut for desktop dev: backtick / tilde.
  window.addEventListener('keydown', (e) => {
    if (e.key === '`' || e.key === '~') {
      e.preventDefault();
      tweaks.toggle();
    }
  });

  // Try to lock orientation on user gesture (most browsers require it).
  const tryLock = (): void => {
    const so = (screen as Screen & {
      orientation?: { lock?: (o: string) => Promise<void> };
    }).orientation;
    so?.lock?.('landscape').catch(() => undefined);
  };
  host.addEventListener('pointerdown', tryLock, { once: true, passive: true });

  // Audio SFX bus — subscribes to kill/shoot/playerHit events.
  audioBus.init();

  // Music engine — starts on first user interaction (satisfies AudioContext gesture requirement).
  // Respects the audio.musicEnabled toggle; toggling it in the Tweaks Menu takes effect on retry.
  // start() is idempotent: checks config.audio.musicEnabled and the running flag.
  host.addEventListener('pointerdown', () => musicEngine.start(), { passive: true });
  events.on('gameOver', () => musicEngine.stop());

  // Expose for debug & smoke test
  (window as Window & { __game?: unknown }).__game = {
    world,
    hud,
    loop,
    config,
    tweaks,
    audioBus,
    musicEngine,
  };

  await registerServiceWorker();

  // Show the main menu — player must tap "play" to start the loop.
  mainMenu.show();
}

main().catch((err) => {
  console.error(err);
  const host = document.getElementById('app');
  if (host) host.textContent = `boot failed: ${(err as Error).message}`;
});
