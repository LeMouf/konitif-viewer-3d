import type { PhysicsQuaternion } from '@konitif/physics';

export interface RobotSagittalPostureCompensationChannel {
  jointName: string;
  proportionalGain: number;
  velocityGain: number;
  maxOffsetRadians: number;
  minimumTargetRadians?: number;
  maximumTargetRadians?: number;
}

export interface RobotSagittalPostureCompensationOptions {
  referenceBodyName: string;
  referenceTiltRadians?: number;
  deadbandRadians?: number;
  maxTiltRadians?: number;
  maxTiltVelocityRadiansPerSecond?: number;
  channels: readonly RobotSagittalPostureCompensationChannel[];
}

export interface RobotSagittalPostureCompensationResult {
  tiltRadians: number;
  tiltVelocityRadiansPerSecond: number;
  targets: Readonly<Record<string, number>>;
}

export function resolveRobotSagittalTiltRadians(rotation: PhysicsQuaternion): number {
  const magnitude = Math.hypot(rotation.x, rotation.y, rotation.z, rotation.w);

  if (!Number.isFinite(magnitude) || magnitude <= Number.EPSILON) {
    return 0;
  }

  const x = rotation.x / magnitude;
  const y = rotation.y / magnitude;
  const z = rotation.z / magnitude;
  const w = rotation.w / magnitude;
  const upX = 2 * (x * z + w * y);
  const upZ = 1 - 2 * (x * x + y * y);

  return Math.atan2(upX, upZ);
}

export function resolveRobotSagittalPostureCompensation(input: {
  options: RobotSagittalPostureCompensationOptions;
  rotation: PhysicsQuaternion;
  authoredTargets: Readonly<Record<string, number>>;
  previousTiltRadians?: number | null;
  elapsedSeconds: number;
}): RobotSagittalPostureCompensationResult {
  const measuredTilt = resolveRobotSagittalTiltRadians(input.rotation);
  const referenceTilt = finiteOr(input.options.referenceTiltRadians, 0);
  const maxTilt = Math.max(0, finiteOr(input.options.maxTiltRadians, Math.PI / 6));
  const deadband = Math.max(0, finiteOr(input.options.deadbandRadians, 0));
  const tiltRadians = clamp(measuredTilt - referenceTilt, -maxTilt, maxTilt);
  const compensatedTilt = applyDeadband(tiltRadians, deadband);
  const elapsedSeconds = Math.max(0, finiteOr(input.elapsedSeconds, 0));
  const rawVelocity =
    input.previousTiltRadians === null ||
    input.previousTiltRadians === undefined ||
    elapsedSeconds <= Number.EPSILON
      ? 0
      : (tiltRadians - input.previousTiltRadians) / elapsedSeconds;
  const maxVelocity = Math.max(
    0,
    finiteOr(input.options.maxTiltVelocityRadiansPerSecond, Math.PI * 2)
  );
  const tiltVelocityRadiansPerSecond = clamp(rawVelocity, -maxVelocity, maxVelocity);
  const targets: Record<string, number> = {};

  for (const channel of input.options.channels) {
    const authoredTarget = input.authoredTargets[channel.jointName];

    if (typeof authoredTarget !== 'number' || !Number.isFinite(authoredTarget)) {
      continue;
    }

    const maxOffset = Math.max(0, finiteOr(channel.maxOffsetRadians, 0));
    const velocityCorrection = compensatedTilt === 0
      ? 0
      : finiteOr(channel.velocityGain, 0) * tiltVelocityRadiansPerSecond;
    const offset = clamp(
      finiteOr(channel.proportionalGain, 0) * compensatedTilt + velocityCorrection,
      -maxOffset,
      maxOffset
    );
    targets[channel.jointName] = clamp(
      authoredTarget + offset,
      finiteOr(channel.minimumTargetRadians, Number.NEGATIVE_INFINITY),
      finiteOr(channel.maximumTargetRadians, Number.POSITIVE_INFINITY)
    );
  }

  return {
    tiltRadians,
    tiltVelocityRadiansPerSecond,
    targets
  };
}

function applyDeadband(value: number, deadband: number): number {
  if (Math.abs(value) <= deadband) {
    return 0;
  }

  return value - Math.sign(value) * deadband;
}

function finiteOr(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
