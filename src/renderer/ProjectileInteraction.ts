export interface ViewerProjectileVector3 {
  x: number;
  y: number;
  z: number;
}

export interface ViewerProjectileLaunchSolution {
  origin: ViewerProjectileVector3;
  target: ViewerProjectileVector3;
  velocity: ViewerProjectileVector3;
  gravity: ViewerProjectileVector3;
  durationSeconds: number;
}

export interface ViewerProjectileLaunchInput {
  origin: ViewerProjectileVector3;
  target: ViewerProjectileVector3;
  speedMetersPerSecond: number;
  gravityMetersPerSecondSquared?: number;
  minimumDurationSeconds?: number;
  maximumDurationSeconds?: number;
}

export interface ViewerProjectileLaunchProfile {
  speedMetersPerSecond: number;
  minimumDurationSeconds: number;
  maximumDurationSeconds: number;
}

export interface ViewerProjectileKinematicState {
  position: ViewerProjectileVector3;
  velocity: ViewerProjectileVector3;
}

export interface ViewerProjectileGroundStepOptions {
  gravity: ViewerProjectileVector3;
  floorY: number;
  radius: number;
  restitution: number;
  frictionPerSecond: number;
  settleSpeedMetersPerSecond: number;
}

export interface ViewerProjectileGroundStepResult extends ViewerProjectileKinematicState {
  contactedGround: boolean;
  settled: boolean;
}

const finite = (value: number, fallback: number): number => (Number.isFinite(value) ? value : fallback);
const VIEWER_PROJECTILE_MINIMUM_POWER_SCALE = 0.68;
const VIEWER_PROJECTILE_MAXIMUM_POWER_SCALE = 2.3;
const VIEWER_PROJECTILE_POWER_RANGE_OFFSET_RATIO = 0.2;

export function resolveViewerProjectileLauncherWorldScale(
  worldUnitsPerScreenPixel: number,
  targetScreenPixels = 72,
  authoredSizeMeters = 0.13
): number {
  const worldUnitsPerPixel = Math.max(0, finite(worldUnitsPerScreenPixel, 0));
  const targetPixels = Math.max(1, finite(targetScreenPixels, 72));
  const authoredSize = Math.max(0.001, finite(authoredSizeMeters, 0.13));
  return (worldUnitsPerPixel * targetPixels) / authoredSize;
}

/**
 * Keeps the projectile readable at close range without letting the ballistic
 * compensation turn into an oversized bell when the camera pulls back.
 */
export function resolveViewerProjectileLaunchProfile(distanceMeters: number): ViewerProjectileLaunchProfile {
  const distance = Math.max(0, finite(distanceMeters, 0));
  const normalized = Math.min(1, Math.max(0, (distance - 1.2) / (6 - 1.2)));
  const blend = normalized * normalized * (3 - 2 * normalized);

  return {
    speedMetersPerSecond: 3.4 + (12 - 3.4) * blend,
    minimumDurationSeconds: 0.18 + (0.14 - 0.18) * blend,
    maximumDurationSeconds: 0.62 + (0.42 - 0.62) * blend
  };
}

export function resolveViewerProjectileChargedLaunchProfile(
  distanceMeters: number,
  chargeRatio: number
): ViewerProjectileLaunchProfile {
  const profile = resolveViewerProjectileLaunchProfile(distanceMeters);
  const normalizedCharge = Math.min(1, Math.max(0, finite(chargeRatio, 0)));
  const easedCharge = normalizedCharge * normalizedCharge * (3 - 2 * normalizedCharge);
  const powerRange = VIEWER_PROJECTILE_MAXIMUM_POWER_SCALE - VIEWER_PROJECTILE_MINIMUM_POWER_SCALE;
  const powerScale =
    VIEWER_PROJECTILE_MINIMUM_POWER_SCALE +
    powerRange * (VIEWER_PROJECTILE_POWER_RANGE_OFFSET_RATIO + easedCharge);

  return {
    speedMetersPerSecond: profile.speedMetersPerSecond * powerScale,
    minimumDurationSeconds: profile.minimumDurationSeconds * (1.05 + (0.7 - 1.05) * easedCharge),
    maximumDurationSeconds: profile.maximumDurationSeconds * (1.15 + (0.7 - 1.15) * easedCharge)
  };
}

export function createViewerProjectileLaunchSolution(
  input: ViewerProjectileLaunchInput
): ViewerProjectileLaunchSolution {
  const origin = normalizeVector(input.origin);
  const target = normalizeVector(input.target);
  const delta = subtract(target, origin);
  const distance = Math.hypot(delta.x, delta.y, delta.z);
  const speed = Math.max(0.1, finite(input.speedMetersPerSecond, 2.6));
  const minimumDuration = Math.max(0.08, finite(input.minimumDurationSeconds ?? 0.28, 0.28));
  const maximumDuration = Math.max(minimumDuration, finite(input.maximumDurationSeconds ?? 1.1, 1.1));
  const durationSeconds = Math.min(maximumDuration, Math.max(minimumDuration, distance / speed));
  const gravity = {
    x: 0,
    y: -Math.abs(finite(input.gravityMetersPerSecondSquared ?? 9.81, 9.81)),
    z: 0
  };
  const inverseDuration = 1 / durationSeconds;

  return {
    origin,
    target,
    gravity,
    durationSeconds,
    velocity: {
      x: (delta.x - 0.5 * gravity.x * durationSeconds * durationSeconds) * inverseDuration,
      y: (delta.y - 0.5 * gravity.y * durationSeconds * durationSeconds) * inverseDuration,
      z: (delta.z - 0.5 * gravity.z * durationSeconds * durationSeconds) * inverseDuration
    }
  };
}

export function sampleViewerProjectilePosition(
  launch: ViewerProjectileLaunchSolution,
  elapsedSeconds: number
): ViewerProjectileVector3 {
  const time = Math.min(launch.durationSeconds, Math.max(0, finite(elapsedSeconds, 0)));

  return {
    x: launch.origin.x + launch.velocity.x * time + 0.5 * launch.gravity.x * time * time,
    y: launch.origin.y + launch.velocity.y * time + 0.5 * launch.gravity.y * time * time,
    z: launch.origin.z + launch.velocity.z * time + 0.5 * launch.gravity.z * time * time
  };
}

export function sampleViewerProjectileVelocity(
  launch: ViewerProjectileLaunchSolution,
  elapsedSeconds: number
): ViewerProjectileVector3 {
  const time = Math.min(launch.durationSeconds, Math.max(0, finite(elapsedSeconds, 0)));

  return {
    x: launch.velocity.x + launch.gravity.x * time,
    y: launch.velocity.y + launch.gravity.y * time,
    z: launch.velocity.z + launch.gravity.z * time
  };
}

export function createViewerProjectileTrajectoryPoints(
  launch: ViewerProjectileLaunchSolution,
  segmentCount = 32
): ViewerProjectileVector3[] {
  const segments = Math.max(2, Math.min(128, Math.round(finite(segmentCount, 32))));
  return Array.from({ length: segments + 1 }, (_, index) =>
    sampleViewerProjectilePosition(launch, (launch.durationSeconds * index) / segments)
  );
}

export function resolveViewerProjectileImpulse(
  massKilograms: number,
  velocity: ViewerProjectileVector3
): ViewerProjectileVector3 {
  const mass = Math.max(0, finite(massKilograms, 0));
  const normalizedVelocity = normalizeVector(velocity);
  return {
    x: normalizedVelocity.x * mass,
    y: normalizedVelocity.y * mass,
    z: normalizedVelocity.z * mass
  };
}

/** Damped elastic recoil used by the slingshot pouch after launch. */
export function resolveViewerSlingshotReleasePull(initialPullRatio: number, progress: number): number {
  const initialPull = Math.min(1, Math.max(0, finite(initialPullRatio, 0)));
  const normalizedProgress = Math.min(1, Math.max(0, finite(progress, 0)));
  if (normalizedProgress >= 1) return 0;

  return initialPull * Math.exp(-5.2 * normalizedProgress) * Math.cos(normalizedProgress * Math.PI * 3.5);
}

export function stepViewerProjectileAgainstGround(
  state: ViewerProjectileKinematicState,
  elapsedSeconds: number,
  options: ViewerProjectileGroundStepOptions
): ViewerProjectileGroundStepResult {
  const deltaSeconds = Math.max(0, Math.min(0.05, finite(elapsedSeconds, 0)));
  const gravity = normalizeVector(options.gravity);
  const floorY = finite(options.floorY, 0) + Math.max(0, finite(options.radius, 0));
  const restitution = Math.min(1, Math.max(0, finite(options.restitution, 0.45)));
  const friction = Math.max(0, finite(options.frictionPerSecond, 4));
  const settleSpeed = Math.max(0, finite(options.settleSpeedMetersPerSecond, 0.08));
  const position = normalizeVector(state.position);
  const velocity = normalizeVector(state.velocity);
  const nextPosition = {
    x: position.x + velocity.x * deltaSeconds + 0.5 * gravity.x * deltaSeconds * deltaSeconds,
    y: position.y + velocity.y * deltaSeconds + 0.5 * gravity.y * deltaSeconds * deltaSeconds,
    z: position.z + velocity.z * deltaSeconds + 0.5 * gravity.z * deltaSeconds * deltaSeconds
  };
  const nextVelocity = {
    x: velocity.x + gravity.x * deltaSeconds,
    y: velocity.y + gravity.y * deltaSeconds,
    z: velocity.z + gravity.z * deltaSeconds
  };
  if (nextPosition.y > floorY) {
    return { position: nextPosition, velocity: nextVelocity, contactedGround: false, settled: false };
  }

  nextPosition.y = floorY;
  const horizontalDrag = Math.exp(-friction * deltaSeconds);
  nextVelocity.x *= horizontalDrag;
  nextVelocity.z *= horizontalDrag;
  nextVelocity.y = Math.abs(nextVelocity.y) * restitution;
  const speed = Math.hypot(nextVelocity.x, nextVelocity.y, nextVelocity.z);
  const settled = speed <= settleSpeed;
  if (settled) {
    nextVelocity.x = 0;
    nextVelocity.y = 0;
    nextVelocity.z = 0;
  }
  return { position: nextPosition, velocity: nextVelocity, contactedGround: true, settled };
}

function normalizeVector(value: ViewerProjectileVector3): ViewerProjectileVector3 {
  return {
    x: finite(value.x, 0),
    y: finite(value.y, 0),
    z: finite(value.z, 0)
  };
}

function subtract(left: ViewerProjectileVector3, right: ViewerProjectileVector3): ViewerProjectileVector3 {
  return {
    x: left.x - right.x,
    y: left.y - right.y,
    z: left.z - right.z
  };
}
