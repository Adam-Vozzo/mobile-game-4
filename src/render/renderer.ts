import {
  Application,
  Container,
  ParticleContainer,
  Graphics,
  BLEND_MODES,
  Texture,
  RenderTexture,
  type IRenderer,
} from 'pixi.js';
import type { Viewport } from '../types';

export interface RenderLayers {
  /** background reactive grid */
  grid: Container;
  /** ship/bullet/enemy line art (additive) */
  vector: Container;
  /** GPU-friendly particle container — thousands of sprites */
  particles: ParticleContainer;
  /** top-most layer for full-screen overlays (flash, etc.) */
  overlay: Container;
}

export interface RendererBundle {
  app: Application<HTMLCanvasElement>;
  layers: RenderLayers;
  viewport: Viewport;
  /** soft circular sprite texture used for all particles */
  particleTexture: Texture;
}

const PARTICLE_TEXTURE_SIZE = 64;

function buildParticleTexture(renderer: IRenderer): Texture {
  // Soft radial-gradient circle drawn into a small RT once at boot. All
  // particles share this; tinted per-instance via Sprite.tint.
  const g = new Graphics();
  const r = PARTICLE_TEXTURE_SIZE / 2;
  // Stack of decreasing-alpha disks approximates a radial falloff cheaply.
  const steps = 8;
  for (let i = 0; i < steps; i++) {
    const t = 1 - i / steps; // 1..1/steps
    const radius = r * (i + 1) / steps;
    const alpha = 0.18 * t;
    g.beginFill(0xffffff, alpha);
    g.drawCircle(r, r, radius);
    g.endFill();
  }
  // Sharp core.
  g.beginFill(0xffffff, 1);
  g.drawCircle(r, r, r * 0.18);
  g.endFill();

  const rt = RenderTexture.create({
    width: PARTICLE_TEXTURE_SIZE,
    height: PARTICLE_TEXTURE_SIZE,
    resolution: 1,
  });
  renderer.render(g, { renderTexture: rt });
  g.destroy();
  return rt;
}

export async function createRenderer(host: HTMLElement): Promise<RendererBundle> {
  const app = new Application<HTMLCanvasElement>({
    background: 0x000000,
    antialias: true,
    powerPreference: 'high-performance',
    // PixiJS auto-density at min(devicePixelRatio, cap). We cap at 2 to keep
    // mid-range mobile from cooking on retina-density rasters.
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
    resizeTo: host,
  });

  host.appendChild(app.view);

  const grid = new Container();
  grid.sortableChildren = false;

  const vector = new Container();
  vector.sortableChildren = false;

  // Particle counts will easily reach thousands. ParticleContainer is the
  // batched fast-path. We limit per-particle properties to what we actually
  // change to keep its uploads minimal.
  const particles = new ParticleContainer(8192, {
    scale: true,
    position: true,
    rotation: false,
    uvs: false,
    tint: true,
    alpha: true,
  });
  particles.blendMode = BLEND_MODES.ADD;

  const overlay = new Container();
  overlay.sortableChildren = false;

  app.stage.addChild(grid);
  app.stage.addChild(vector);
  app.stage.addChild(particles);
  app.stage.addChild(overlay);

  const particleTexture = buildParticleTexture(app.renderer);

  const viewport: Viewport = {
    width: app.renderer.width / app.renderer.resolution,
    height: app.renderer.height / app.renderer.resolution,
    dpr: app.renderer.resolution,
    halfW: 0,
    halfH: 0,
  };
  viewport.halfW = viewport.width / 2;
  viewport.halfH = viewport.height / 2;

  // Keep the viewport accurate on resize.
  const onResize = (): void => {
    viewport.width = app.renderer.width / app.renderer.resolution;
    viewport.height = app.renderer.height / app.renderer.resolution;
    viewport.halfW = viewport.width / 2;
    viewport.halfH = viewport.height / 2;
  };
  app.renderer.on('resize', onResize);
  window.addEventListener('resize', onResize);
  // Pixi's resizeTo runs on rAF; this callback is mostly belt-and-braces.

  return { app, layers: { grid, vector, particles, overlay }, viewport, particleTexture };
}

/** Camera transform for screen shake. Stage-level. */
export function setCameraOffset(app: Application, x: number, y: number): void {
  app.stage.position.set(x, y);
}
