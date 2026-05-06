/**
 * Single source of all tunable values.
 *
 * Everything subjective and feel-critical lives here so it can be:
 *  - greppable (one file)
 *  - typed
 *  - lockable (LOCKED_PARAMS.md)
 *  - bound to the Tweaks Menu (iteration 2 overlays this with localStorage)
 */

export type ControlScheme =
  | 'single-thumb-autoaim'
  | 'virtual-twin-sticks'
  | 'drag-aim'
  | 'gesture-dash';

export interface AppConfig {
  buildVersion: string;

  world: {
    /** Logical play area is square-ish; we letterbox to viewport. */
    width: number;
    height: number;
  };

  player: {
    radius: number;
    accel: number;
    maxSpeed: number;
    drag: number;
    fireRatePerSecond: number;
    bulletSpeed: number;
    bulletRadius: number;
    bulletLifeSeconds: number;
  };

  controls: {
    scheme: ControlScheme;
    /** virtual-stick dead zone in pixels (drag distance below this = no input) */
    deadZonePx: number;
    /** drag distance at which input registers as full-tilt */
    fullTiltPx: number;
    /** auto-aim grab strength: 0 = off, 1 = perfect snap. */
    autoAimStrength: number;
    autoFire: boolean;
  };

  enemies: {
    wanderer: {
      radius: number;
      speed: number;
      turnRate: number;
      pointValue: number;
    };
    spawn: {
      /** seconds between spawns at start; will be modulated by spawn director later */
      intervalSeconds: number;
      /** simultaneous cap during the slice; spawn director will own this in iter ≥3 */
      maxAlive: number;
      /** distance from player below which we won't spawn (avoid cheap shots) */
      minDistanceFromPlayer: number;
    };
  };

  score: {
    multiplier: {
      /** chained kill window in milliseconds */
      windowMs: number;
      /** decay rate when no kills happen */
      decayPerSecond: number;
      /** maximum multiplier */
      max: number;
    };
  };

  juice: {
    /** master scale on particle counts. 1.0 = design baseline. */
    particleDensity: number;
    /** particles emitted on a Wanderer kill, before density scaling */
    particlesPerKill: number;
    /** master cap on simultaneously-alive particles. The pool size. */
    particleCap: number;
    /** particle lifetime range in seconds */
    particleLifeMin: number;
    particleLifeMax: number;
    particleSpeedMin: number;
    particleSpeedMax: number;
    bloomIntensity: number;
    screenShakeIntensity: number;
    gridReactivity: number;
    hitstopMs: number;
    slowMoOnBigKill: boolean;
  };

  grid: {
    /** logical cell counts at 16:9-ish aspect; cell pixel size derived at runtime */
    colsTarget: number;
    rowsTarget: number;
    /** spring-mass parameters */
    spring: number;
    damping: number;
    /** how strongly the player pushes nearby grid points */
    playerInfluence: number;
    /** how strongly explosions push nearby grid points */
    explosionInfluence: number;
    /** influence radius in world units */
    influenceRadius: number;
  };

  audio: {
    musicVolume: number;
    sfxVolume: number;
    musicReactivity: boolean;
  };

  flow: {
    spawnRateMultiplier: number;
    startingLives: number;
  };

  debug: {
    fpsOverlay: boolean;
    drawHitboxes: boolean;
    entityOverlay: boolean;
    particleCountOverlay: boolean;
    /** force a slow path that mimics low-end devices */
    simulateLowEnd: boolean;
  };
}

const _DEFAULTS: AppConfig = {
  buildVersion: '0.1.0',

  world: {
    width: 1600,
    height: 900,
  },

  player: {
    radius: 14,
    accel: 6500,
    maxSpeed: 520,
    drag: 4.5,
    fireRatePerSecond: 8,
    bulletSpeed: 1100,
    bulletRadius: 3,
    bulletLifeSeconds: 1.4,
  },

  controls: {
    scheme: 'single-thumb-autoaim',
    deadZonePx: 12,
    fullTiltPx: 90,
    autoAimStrength: 0.85,
    autoFire: true,
  },

  enemies: {
    wanderer: {
      radius: 14,
      speed: 110,
      turnRate: 1.2,
      pointValue: 25,
    },
    spawn: {
      intervalSeconds: 0.8,
      maxAlive: 24,
      minDistanceFromPlayer: 280,
    },
  },

  score: {
    multiplier: {
      windowMs: 1500,
      decayPerSecond: 1.0,
      max: 25,
    },
  },

  juice: {
    particleDensity: 1.0,
    particlesPerKill: 80,
    particleCap: 4096,
    particleLifeMin: 0.45,
    particleLifeMax: 1.1,
    particleSpeedMin: 60,
    particleSpeedMax: 520,
    bloomIntensity: 1.0,
    screenShakeIntensity: 1.0,
    gridReactivity: 1.0,
    hitstopMs: 0,
    slowMoOnBigKill: false,
  },

  grid: {
    colsTarget: 32,
    rowsTarget: 18,
    spring: 14,
    damping: 4,
    playerInfluence: 26,
    explosionInfluence: 60,
    influenceRadius: 220,
  },

  audio: {
    musicVolume: 0.5,
    sfxVolume: 0.7,
    musicReactivity: true,
  },

  flow: {
    spawnRateMultiplier: 1.0,
    startingLives: 3,
  },

  debug: {
    fpsOverlay: false,
    drawHitboxes: false,
    entityOverlay: false,
    particleCountOverlay: false,
    simulateLowEnd: false,
  },
};

export const DEFAULTS: Readonly<AppConfig> = Object.freeze(_DEFAULTS);

/**
 * Live, mutable config. The Tweaks Menu (iteration 2) will overlay localStorage
 * values on top of DEFAULTS at boot. Until then this is a deep clone.
 */
export const config: AppConfig = structuredClone(_DEFAULTS);
