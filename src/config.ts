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
    grunt: {
      radius: number;
      idleSpeed: number;
      chargeSpeed: number;
      /** distance at which the grunt locks onto and charges the player */
      detectionRadius: number;
      pointValue: number;
    };
    weaver: {
      radius: number;
      speed: number;
      /** wave oscillation frequency in rad/s */
      waveFreq: number;
      /** wave amplitude as a multiplier on speed */
      waveAmp: number;
      pointValue: number;
    };
    blackHole: {
      radius: number;
      speed: number;
      hp: number;
      /** max simultaneously alive */
      maxConcurrent: number;
      /** radius of gravitational influence in world units */
      influenceRadius: number;
      /** peak gravitational acceleration on bullets (px/s²) at distance 0; linear falloff to 0 at influenceRadius */
      bulletGravityStrength: number;
      /** peak gravitational acceleration on player (px/s²) */
      playerGravityStrength: number;
      pointValue: number;
    };
    splitter: {
      radius: number;
      speed: number;
      hp: number;
      pointValue: number;
    };
    shard: {
      radius: number;
      speed: number;
      pointValue: number;
    };
    snake: {
      radius: number;
      segmentRadius: number;
      segmentCount: number;
      /** Gap in pixels between each body segment along the travel trail. */
      segmentGap: number;
      speed: number;
      hp: number;
      maxConcurrent: number;
      pointValue: number;
    };
    pinwheel: {
      /** Collision radius of the central hub. */
      hubRadius: number;
      /** Drift speed toward the player (px/s). */
      speed: number;
      /** Distance of the orbiting drones from the hub centre. */
      orbitRadius: number;
      /** Angular speed of the drone constellation (rad/s). */
      orbitSpeed: number;
      /** Collision radius of each drone (bullets absorbed, player lethal). */
      droneRadius: number;
      hp: number;
      maxConcurrent: number;
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
    /** Full-screen colour flash on kill / player-hit events. */
    screenFlash: boolean;
    /** Animated screen-edge glow during Spawn Director surge bursts (experimental). */
    surgeIndicator: boolean;
    /** Directional camera displacement toward each kill, beat-synced to drum hits (experimental). */
    cameraPunch: boolean;
    /** Base displacement magnitude in pixels for a 50-point kill. Larger kills scale up to 2.5×. */
    cameraPunchMagnitude: number;
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
    sfxEnabled: boolean;
    musicEnabled: boolean;
    musicVolume: number;
    sfxVolume: number;
    musicReactivity: boolean;
  };

  flow: {
    spawnRateMultiplier: number;
    startingLives: number;
    /** Enable Grunt and Weaver enemy types alongside Wanderers (experimental). */
    newEnemyTypes: boolean;
    /** Enable Black Hole enemy — gravity well that curves bullets and pulls the player (experimental). */
    blackHoleEnemy: boolean;
    /** Enable Splitter enemy — splits into two fast Shards on death (experimental). */
    splitterEnemy: boolean;
    /** Enable Snake enemy — segmented body blocks bullets; only the head can be killed (experimental). */
    snakeEnemy: boolean;
    /** Enable Pinwheel enemy — rotating hub shielded by three orbiting drones that absorb bullets (experimental). */
    pinwheelEnemy: boolean;
  };

  spawnDirector: {
    /** Replace flat-rate spawning with an escalating difficulty curve (experimental). */
    enabled: boolean;
    /** Seconds to ramp from min to max difficulty. */
    rampSeconds: number;
    /** Spawn interval (seconds) at difficulty 0 (game start). */
    maxInterval: number;
    /** Spawn interval (seconds) at difficulty 1 (fully ramped). */
    minInterval: number;
    /** Simultaneous enemy cap at difficulty 0. */
    minMaxAlive: number;
    /** Simultaneous enemy cap at difficulty 1. */
    maxMaxAlive: number;
    /** Probability per second that a surge begins (outside of a surge). */
    surgeChancePerSecond: number;
    /** How long a surge lasts (seconds). */
    surgeDuration: number;
    /** Multiplier on spawn interval during a surge (<1 = faster). */
    surgeIntervalScale: number;
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
  buildVersion: '0.15.0',

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
    grunt: {
      radius: 16,
      idleSpeed: 75,
      chargeSpeed: 230,
      detectionRadius: 260,
      pointValue: 50,
    },
    weaver: {
      radius: 11,
      speed: 145,
      waveFreq: 2.5,
      waveAmp: 0.7,
      pointValue: 75,
    },
    blackHole: {
      radius: 22,
      speed: 28,
      hp: 5,
      maxConcurrent: 3,
      influenceRadius: 160,
      bulletGravityStrength: 2500,
      playerGravityStrength: 1500,
      pointValue: 200,
    },
    splitter: {
      radius: 15,
      speed: 65,
      hp: 2,
      pointValue: 100,
    },
    shard: {
      radius: 8,
      speed: 260,
      pointValue: 35,
    },
    snake: {
      radius: 13,
      segmentRadius: 10,
      segmentCount: 5,
      segmentGap: 28,
      speed: 90,
      hp: 2,
      maxConcurrent: 3,
      pointValue: 150,
    },
    pinwheel: {
      hubRadius: 14,
      speed: 38,
      orbitRadius: 46,
      orbitSpeed: 1.7,
      droneRadius: 8,
      hp: 3,
      maxConcurrent: 2,
      pointValue: 175,
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
    screenFlash: false,
    surgeIndicator: false,
    cameraPunch: false,
    cameraPunchMagnitude: 20,
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
    sfxEnabled: true,
    musicEnabled: false,
    musicVolume: 0.5,
    sfxVolume: 0.7,
    musicReactivity: true,
  },

  flow: {
    spawnRateMultiplier: 1.0,
    startingLives: 3,
    newEnemyTypes: false,
    blackHoleEnemy: false,
    splitterEnemy: false,
    snakeEnemy: false,
    pinwheelEnemy: false,
  },

  spawnDirector: {
    enabled: false,
    rampSeconds: 120,
    maxInterval: 1.4,
    minInterval: 0.35,
    minMaxAlive: 16,
    maxMaxAlive: 32,
    surgeChancePerSecond: 0.02,
    surgeDuration: 4.0,
    surgeIntervalScale: 0.3,
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
