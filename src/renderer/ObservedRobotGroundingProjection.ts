export type ObservedRobotGroundingSource =
  | 'foot-contact-anchors'
  | 'foot-geometry'
  | 'collision-guided-render-envelope'
  | 'collision-envelope'
  | 'robot-bounds'
  | 'unavailable';

export type ObservedRobotGroundingContactMode =
  | 'support-plane-static-friction'
  | 'collision-envelope-static-contact'
  | 'unconstrained';

export interface ObservedRobotGroundingProjection {
  status: 'disabled' | 'unavailable' | 'grounded';
  source: ObservedRobotGroundingSource;
  floorY: number;
  supportMinimumY: number | null;
  supportContactCount: number;
  offsetY: number;
  inferred: boolean;
  contactMode: ObservedRobotGroundingContactMode;
  affectedRootAxes: readonly ['y'] | readonly [];
  physicsAffected: false;
}

export interface ObservedRobotSupportPoint {
  x: number;
  y: number;
  z: number;
}

export interface ObservedRobotSupportInclinationProjection {
  status: 'unavailable' | 'aligned' | 'corrected';
  supportContactCount: number;
  supportNormal: ObservedRobotSupportPoint | null;
  correctionQuaternion: { x: number; y: number; z: number; w: number };
  correctionAngleRadians: number;
  correctionClamped: boolean;
  affectedRootAxes: readonly ['roll', 'pitch'] | readonly [];
  constraintModel: 'quasi-static-rigid-contact' | 'unconstrained';
  physicsAffected: false;
}

export interface ObservedRobotSupportAnchorProjection {
  status: 'unavailable' | 'preserved' | 'clamped';
  supportContactCount: number;
  offsetX: number;
  offsetZ: number;
  requestedOffsetMeters: number;
  appliedOffsetMeters: number;
  affectedRootAxes: readonly ['x', 'z'] | readonly [];
  constraintModel: 'support-centroid-static-friction' | 'unconstrained';
  physicsAffected: false;
}

export interface ObservedRobotActiveSupportProjection {
  status: 'unavailable' | 'resolved';
  supportPoints: readonly ObservedRobotSupportPoint[];
  activeIndices: readonly number[];
  activeContactIds: readonly string[];
  sourceContactCount: number;
  activeContactCount: number;
  supportMinimumY: number | null;
  contactBandMeters: number;
  releaseContactBandMeters: number;
}

export interface ObservedRobotTemporalSupportAnchorState {
  anchorX: number;
  anchorZ: number;
  supportSignature: string;
  supportContactCount: number;
  activeContactIds: readonly string[];
}

export interface ObservedRobotTemporalSupportAnchorProjection {
  status: 'unavailable' | 'acquired' | 'preserved' | 'reacquired';
  state: ObservedRobotTemporalSupportAnchorState | null;
  supportContactCount: number;
  offsetX: number;
  offsetZ: number;
  requestedOffsetMeters: number;
  affectedRootAxes: readonly ['x', 'z'] | readonly [];
  constraintModel: 'temporal-support-static-friction' | 'unconstrained';
  physicsAffected: false;
}

export interface ObservedRobotSupportSurface {
  supportMinimumY: number | null;
  supportContactCount: number;
  source: Exclude<ObservedRobotGroundingSource, 'unavailable'>;
}

export interface ObservedRobotFootSupportEligibility {
  eligible: boolean;
  footGeometryMinimumY: number | null;
  bodyEnvelopeMinimumY: number | null;
  separationMeters: number | null;
}

function finiteOrNull(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

const IDENTITY_QUATERNION = { x: 0, y: 0, z: 0, w: 1 } as const;
const SUPPORT_PLANE_EPSILON = 1e-10;
const DEFAULT_MAX_INCLINATION_CORRECTION_RADIANS = Math.PI / 9;
const DEFAULT_MAX_SUPPORT_ANCHOR_CORRECTION_METERS = 0.08;
const DEFAULT_ACTIVE_SUPPORT_CONTACT_BAND_METERS = 0.025;
const DEFAULT_ACTIVE_SUPPORT_RELEASE_HYSTERESIS_METERS = 0.015;
const DEFAULT_TEMPORAL_SUPPORT_REACQUIRE_DISTANCE_METERS = 0.06;

function isFiniteSupportPoint(point: ObservedRobotSupportPoint): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z);
}

function resolveSupportCentroid(
  supportPoints: readonly ObservedRobotSupportPoint[]
): ObservedRobotSupportPoint | null {
  if (supportPoints.length === 0 || supportPoints.some((point) => !isFiniteSupportPoint(point))) {
    return null;
  }

  const centroid = supportPoints.reduce(
    (sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y, z: sum.z + point.z }),
    { x: 0, y: 0, z: 0 }
  );

  return {
    x: centroid.x / supportPoints.length,
    y: centroid.y / supportPoints.length,
    z: centroid.z / supportPoints.length
  };
}

/**
 * Selects only sole anchors that belong to the lowest contact band.
 *
 * The robot model exposes eight semantic FSR frames, but their presence does
 * not mean both feet currently support the body. Feeding a lifted foot into
 * the support plane makes its animated centroid a hidden root controller.
 * This projection keeps the lowest, physically plausible contact subset,
 * preserves its stable identities, and uses a wider release band for the
 * previous support. That hysteresis prevents millimetric telemetry noise from
 * repeatedly releasing and reacquiring the static-friction anchor.
 */
export function resolveObservedRobotActiveSupportProjection(input: {
  supportPoints: readonly ObservedRobotSupportPoint[];
  contactIds?: readonly string[];
  supportGroupIds?: readonly string[];
  previousActiveContactIds?: readonly string[];
  contactBandMeters?: number;
  releaseContactBandMeters?: number;
}): ObservedRobotActiveSupportProjection {
  const contactBandMeters = Number.isFinite(input.contactBandMeters)
    ? Math.max(0, input.contactBandMeters ?? 0)
    : DEFAULT_ACTIVE_SUPPORT_CONTACT_BAND_METERS;
  const releaseContactBandMeters = Number.isFinite(input.releaseContactBandMeters)
    ? Math.max(contactBandMeters, input.releaseContactBandMeters ?? contactBandMeters)
    : contactBandMeters + DEFAULT_ACTIVE_SUPPORT_RELEASE_HYSTERESIS_METERS;
  const hasStableContactIds = input.contactIds?.length === input.supportPoints.length;
  const hasSupportGroups = input.supportGroupIds?.length === input.supportPoints.length;
  const previousActiveContactIdSet = new Set(input.previousActiveContactIds ?? []);
  const finiteEntries = input.supportPoints
    .map((point, index) => ({
      point,
      index,
      contactId: hasStableContactIds ? input.contactIds![index]! : String(index),
      supportGroupId: hasSupportGroups ? input.supportGroupIds![index]! : null
    }))
    .filter(({ point }) => isFiniteSupportPoint(point));
  const supportMinimumY = finiteEntries.reduce(
    (minimum, { point }) => Math.min(minimum, point.y),
    Number.POSITIVE_INFINITY
  );

  if (!Number.isFinite(supportMinimumY)) {
    return {
      status: 'unavailable',
      supportPoints: [],
      activeIndices: [],
      activeContactIds: [],
      sourceContactCount: finiteEntries.length,
      activeContactCount: 0,
      supportMinimumY: null,
      contactBandMeters,
      releaseContactBandMeters
    };
  }

  const activeSupportGroupIds = new Set<string>();
  if (hasSupportGroups) {
    const minimumByGroup = new Map<string, number>();
    for (const { point, supportGroupId } of finiteEntries) {
      if (!supportGroupId) continue;
      minimumByGroup.set(
        supportGroupId,
        Math.min(minimumByGroup.get(supportGroupId) ?? Number.POSITIVE_INFINITY, point.y)
      );
    }
    const contactIdsByGroup = new Map<string, string[]>();
    for (const { contactId, supportGroupId } of finiteEntries) {
      if (!supportGroupId) continue;
      const contactIds = contactIdsByGroup.get(supportGroupId) ?? [];
      contactIds.push(contactId);
      contactIdsByGroup.set(supportGroupId, contactIds);
    }
    for (const [supportGroupId, minimumY] of minimumByGroup) {
      const wasPreviouslyActive = (contactIdsByGroup.get(supportGroupId) ?? []).some((contactId) =>
        previousActiveContactIdSet.has(contactId)
      );
      const activeBandMeters = wasPreviouslyActive
        ? releaseContactBandMeters
        : contactBandMeters;
      if (minimumY <= supportMinimumY + activeBandMeters) {
        activeSupportGroupIds.add(supportGroupId);
      }
    }
  }

  // Once one anchor of a rigid sole reaches the contact band, keep the whole
  // sole as one stable support identity. Selecting its corners independently
  // makes tiny roll/pitch variations repeatedly release static friction.
  const activeEntries = finiteEntries.filter(({ point, supportGroupId }) =>
    hasSupportGroups
      ? Boolean(supportGroupId && activeSupportGroupIds.has(supportGroupId))
      : point.y <= supportMinimumY + contactBandMeters
  );
  const resolved = activeEntries.length >= 3;

  return {
    status: resolved ? 'resolved' : 'unavailable',
    supportPoints: resolved ? activeEntries.map(({ point }) => point) : [],
    activeIndices: resolved ? activeEntries.map(({ index }) => index) : [],
    activeContactIds: resolved ? activeEntries.map(({ contactId }) => contactId) : [],
    sourceContactCount: finiteEntries.length,
    activeContactCount: resolved ? activeEntries.length : 0,
    supportMinimumY,
    contactBandMeters,
    releaseContactBandMeters
  };
}

/**
 * Keeps a stable support footprint across consecutive observed joint frames.
 *
 * Joint telemetry contains no authoritative world-space root translation.
 * Once a valid foot-support subset is acquired, small centroid changes are
 * therefore presentation artefacts caused by the articulated model and are
 * cancelled as static friction. A changed contact subset or a discontinuity
 * beyond the bounded threshold reacquires the anchor instead of inventing a
 * robot trajectory.
 */
export function resolveObservedRobotTemporalSupportAnchorProjection(input: {
  previousState: ObservedRobotTemporalSupportAnchorState | null;
  supportPoints: readonly ObservedRobotSupportPoint[];
  activeIndices: readonly number[];
  activeContactIds?: readonly string[];
  supportEligible?: boolean;
  reacquireDistanceMeters?: number;
}): ObservedRobotTemporalSupportAnchorProjection {
  const unavailable = (): ObservedRobotTemporalSupportAnchorProjection => ({
    status: 'unavailable',
    state: null,
    supportContactCount: 0,
    offsetX: 0,
    offsetZ: 0,
    requestedOffsetMeters: 0,
    affectedRootAxes: [],
    constraintModel: 'unconstrained',
    physicsAffected: false
  });

  if (
    input.supportEligible === false ||
    input.supportPoints.length < 3 ||
    input.supportPoints.length !== input.activeIndices.length
  ) {
    return unavailable();
  }

  const centroid = resolveSupportCentroid(input.supportPoints);
  if (!centroid || input.activeIndices.some((index) => !Number.isInteger(index) || index < 0)) {
    return unavailable();
  }

  const stableContactIds =
    input.activeContactIds?.length === input.supportPoints.length
      ? input.activeContactIds
      : input.activeIndices.map(String);
  const supportSignature = [...stableContactIds].sort().join('|');
  const acquiredState: ObservedRobotTemporalSupportAnchorState = {
    anchorX: centroid.x,
    anchorZ: centroid.z,
    supportSignature,
    supportContactCount: input.supportPoints.length,
    activeContactIds: [...stableContactIds].sort()
  };
  const previousState = input.previousState;

  if (!previousState) {
    return {
      status: 'acquired',
      state: acquiredState,
      supportContactCount: input.supportPoints.length,
      offsetX: 0,
      offsetZ: 0,
      requestedOffsetMeters: 0,
      affectedRootAxes: [],
      constraintModel: 'temporal-support-static-friction',
      physicsAffected: false
    };
  }

  if (
    previousState.supportSignature !== supportSignature ||
    previousState.supportContactCount !== input.supportPoints.length
  ) {
    return {
      status: 'reacquired',
      state: acquiredState,
      supportContactCount: input.supportPoints.length,
      offsetX: 0,
      offsetZ: 0,
      requestedOffsetMeters: 0,
      affectedRootAxes: [],
      constraintModel: 'temporal-support-static-friction',
      physicsAffected: false
    };
  }

  const offsetX = previousState.anchorX - centroid.x;
  const offsetZ = previousState.anchorZ - centroid.z;
  const requestedOffsetMeters = Math.hypot(offsetX, offsetZ);
  const reacquireDistanceMeters = Number.isFinite(input.reacquireDistanceMeters)
    ? Math.max(0, input.reacquireDistanceMeters ?? 0)
    : DEFAULT_TEMPORAL_SUPPORT_REACQUIRE_DISTANCE_METERS;

  if (requestedOffsetMeters > reacquireDistanceMeters) {
    return {
      status: 'reacquired',
      state: acquiredState,
      supportContactCount: input.supportPoints.length,
      offsetX: 0,
      offsetZ: 0,
      requestedOffsetMeters,
      affectedRootAxes: [],
      constraintModel: 'temporal-support-static-friction',
      physicsAffected: false
    };
  }

  return {
    status: 'preserved',
    state: previousState,
    supportContactCount: input.supportPoints.length,
    offsetX,
    offsetZ,
    requestedOffsetMeters,
    affectedRootAxes: ['x', 'z'],
    constraintModel: 'temporal-support-static-friction',
    physicsAffected: false
  };
}

/**
 * Preserves the world-space support footprint while a missing root
 * inclination is completed for presentation.
 *
 * Rotating the observed model around its authored root (usually near the
 * torso) moves the sole anchors laterally. The inverse centroid delta makes
 * the support polygon the effective pivot instead. Y remains owned by the
 * grounding projection, and the bounded X/Z correction is a static-friction
 * constraint only: it does not integrate velocity or alter observed joints.
 */
export function resolveObservedRobotSupportAnchorProjection(input: {
  supportPointsBefore: readonly ObservedRobotSupportPoint[];
  supportPointsAfter: readonly ObservedRobotSupportPoint[];
  supportEligible?: boolean;
  maxCorrectionMeters?: number;
}): ObservedRobotSupportAnchorProjection {
  const unavailable = (supportContactCount = 0): ObservedRobotSupportAnchorProjection => ({
    status: 'unavailable',
    supportContactCount,
    offsetX: 0,
    offsetZ: 0,
    requestedOffsetMeters: 0,
    appliedOffsetMeters: 0,
    affectedRootAxes: [],
    constraintModel: 'unconstrained',
    physicsAffected: false
  });

  if (
    input.supportEligible === false ||
    input.supportPointsBefore.length < 3 ||
    input.supportPointsBefore.length !== input.supportPointsAfter.length
  ) {
    return unavailable(input.supportPointsBefore.length);
  }

  const before = resolveSupportCentroid(input.supportPointsBefore);
  const after = resolveSupportCentroid(input.supportPointsAfter);
  if (!before || !after) return unavailable(input.supportPointsBefore.length);

  const requestedOffsetX = before.x - after.x;
  const requestedOffsetZ = before.z - after.z;
  const requestedOffsetMeters = Math.hypot(requestedOffsetX, requestedOffsetZ);
  const maxCorrectionMeters = Number.isFinite(input.maxCorrectionMeters)
    ? Math.max(0, input.maxCorrectionMeters ?? 0)
    : DEFAULT_MAX_SUPPORT_ANCHOR_CORRECTION_METERS;
  const scale =
    requestedOffsetMeters > maxCorrectionMeters && requestedOffsetMeters > SUPPORT_PLANE_EPSILON
      ? maxCorrectionMeters / requestedOffsetMeters
      : 1;
  const offsetX = requestedOffsetX * scale;
  const offsetZ = requestedOffsetZ * scale;
  const appliedOffsetMeters = requestedOffsetMeters * scale;

  return {
    status: scale < 1 ? 'clamped' : 'preserved',
    supportContactCount: input.supportPointsBefore.length,
    offsetX,
    offsetZ,
    requestedOffsetMeters,
    appliedOffsetMeters,
    affectedRootAxes: ['x', 'z'],
    constraintModel: 'support-centroid-static-friction',
    physicsAffected: false
  };
}

/**
 * Fits y = ax + bz + c through the semantic sole anchors and returns the
 * shortest world-space rotation that aligns that support plane with world up.
 *
 * This is deliberately a quasi-static contact constraint, not a dynamics
 * simulation: observed joints remain authoritative and only the missing root
 * roll/pitch presentation is inferred. The bounded correction cannot inject
 * velocity, oscillation or a competing pose history.
 */
export function resolveObservedRobotSupportInclinationProjection(input: {
  enabled: boolean;
  supportPoints: readonly ObservedRobotSupportPoint[];
  supportEligible?: boolean;
  maxCorrectionRadians?: number;
}): ObservedRobotSupportInclinationProjection {
  const supportPoints = input.supportPoints.filter(isFiniteSupportPoint);
  const unavailable = (): ObservedRobotSupportInclinationProjection => ({
    status: 'unavailable',
    supportContactCount: supportPoints.length,
    supportNormal: null,
    correctionQuaternion: { ...IDENTITY_QUATERNION },
    correctionAngleRadians: 0,
    correctionClamped: false,
    affectedRootAxes: [],
    constraintModel: 'unconstrained',
    physicsAffected: false
  });

  if (!input.enabled || input.supportEligible === false || supportPoints.length < 3) {
    return unavailable();
  }

  const center = supportPoints.reduce(
    (sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y, z: sum.z + point.z }),
    { x: 0, y: 0, z: 0 }
  );
  center.x /= supportPoints.length;
  center.y /= supportPoints.length;
  center.z /= supportPoints.length;

  let xx = 0;
  let xz = 0;
  let zz = 0;
  let xy = 0;
  let zy = 0;

  for (const point of supportPoints) {
    const x = point.x - center.x;
    const y = point.y - center.y;
    const z = point.z - center.z;
    xx += x * x;
    xz += x * z;
    zz += z * z;
    xy += x * y;
    zy += z * y;
  }

  const determinant = xx * zz - xz * xz;

  if (!Number.isFinite(determinant) || Math.abs(determinant) <= SUPPORT_PLANE_EPSILON) {
    return unavailable();
  }

  const slopeX = (xy * zz - zy * xz) / determinant;
  const slopeZ = (zy * xx - xy * xz) / determinant;
  const normalLength = Math.hypot(slopeX, 1, slopeZ);

  if (!Number.isFinite(normalLength) || normalLength <= SUPPORT_PLANE_EPSILON) {
    return unavailable();
  }

  const supportNormal = {
    x: -slopeX / normalLength,
    y: 1 / normalLength,
    z: -slopeZ / normalLength
  };
  const rawAngle = Math.acos(Math.max(-1, Math.min(1, supportNormal.y)));
  const maxCorrectionRadians = Number.isFinite(input.maxCorrectionRadians)
    ? Math.max(0, Math.min(Math.PI / 2, input.maxCorrectionRadians ?? 0))
    : DEFAULT_MAX_INCLINATION_CORRECTION_RADIANS;
  const correctionAngleRadians = Math.min(rawAngle, maxCorrectionRadians);

  if (correctionAngleRadians <= 1e-7) {
    return {
      status: 'aligned',
      supportContactCount: supportPoints.length,
      supportNormal,
      correctionQuaternion: { ...IDENTITY_QUATERNION },
      correctionAngleRadians: 0,
      correctionClamped: false,
      affectedRootAxes: [],
      constraintModel: 'quasi-static-rigid-contact',
      physicsAffected: false
    };
  }

  // cross(supportNormal, worldUp), normalized. The axis is horizontal, so the
  // correction contains roll/pitch only and cannot modify observed yaw.
  const axisX = -supportNormal.z;
  const axisZ = supportNormal.x;
  const axisLength = Math.hypot(axisX, axisZ);

  if (!Number.isFinite(axisLength) || axisLength <= SUPPORT_PLANE_EPSILON) {
    return unavailable();
  }

  const halfAngle = correctionAngleRadians / 2;
  const sinHalfAngle = Math.sin(halfAngle);

  return {
    status: 'corrected',
    supportContactCount: supportPoints.length,
    supportNormal,
    correctionQuaternion: {
      x: (axisX / axisLength) * sinHalfAngle,
      y: 0,
      z: (axisZ / axisLength) * sinHalfAngle,
      w: Math.cos(halfAngle)
    },
    correctionAngleRadians,
    correctionClamped: rawAngle > correctionAngleRadians + 1e-7,
    affectedRootAxes: ['roll', 'pitch'],
    constraintModel: 'quasi-static-rigid-contact',
    physicsAffected: false
  };
}

/**
 * Decides whether sole anchors may complete the missing root inclination.
 *
 * The feet are only a valid support authority while their rendered envelope
 * belongs to the lowest body contact band. When the torso, back, arms or any
 * other collider is lower, the robot is treated as body-supported: its
 * observed orientation is preserved and no "stand it back up" correction is
 * invented locally.
 */
export function resolveObservedRobotFootSupportEligibility(input: {
  footGeometryMinimumY?: number | null;
  bodyEnvelopeMinimumY?: number | null;
  contactBandMeters?: number;
}): ObservedRobotFootSupportEligibility {
  const footGeometryMinimumY = finiteOrNull(input.footGeometryMinimumY);
  const bodyEnvelopeMinimumY = finiteOrNull(input.bodyEnvelopeMinimumY);
  const contactBandMeters = Number.isFinite(input.contactBandMeters)
    ? Math.max(0, input.contactBandMeters ?? 0)
    : 0.025;

  if (footGeometryMinimumY === null || bodyEnvelopeMinimumY === null) {
    return {
      eligible: false,
      footGeometryMinimumY,
      bodyEnvelopeMinimumY,
      separationMeters: null
    };
  }

  const separationMeters = footGeometryMinimumY - bodyEnvelopeMinimumY;

  return {
    eligible: separationMeters <= contactBandMeters,
    footGeometryMinimumY,
    bodyEnvelopeMinimumY,
    separationMeters
  };
}

/**
 * Resolves the surface that must visually meet the support plane.
 *
 * FSR frames describe where support can be observed, but their origins live
 * inside the foot assembly and are not guaranteed to coincide with the
 * rendered sole. Prefer the rendered foot envelope for the vertical contact
 * correction, while retaining the FSR count as evidence for the projection.
 *
 * Whole-body colliders decide which support regime is active, but simplified
 * collision geometry is not a reliable visible contact surface. When both are
 * available, align the rendered envelope to the floor and report explicitly
 * that the contact was collider-guided. This covers back, belly and side
 * contacts without making an approximate collider visibly float or penetrate.
 */
export function resolveObservedRobotSupportSurface(input: {
  contactMinimumY?: number | null;
  supportContactCount?: number;
  footGeometryMinimumY?: number | null;
  collisionEnvelopeMinimumY?: number | null;
  robotBoundsMinimumY?: number | null;
}): ObservedRobotSupportSurface {
  const supportContactCount = Number.isFinite(input.supportContactCount)
    ? Math.max(0, Math.trunc(input.supportContactCount ?? 0))
    : 0;
  const collisionEnvelopeMinimumY = finiteOrNull(input.collisionEnvelopeMinimumY);
  const robotBoundsMinimumY = finiteOrNull(input.robotBoundsMinimumY);

  if (collisionEnvelopeMinimumY !== null && robotBoundsMinimumY !== null) {
    return {
      supportMinimumY: robotBoundsMinimumY,
      supportContactCount,
      source: 'collision-guided-render-envelope'
    };
  }

  if (collisionEnvelopeMinimumY !== null) {
    return {
      supportMinimumY: collisionEnvelopeMinimumY,
      supportContactCount,
      source: 'collision-envelope'
    };
  }

  if (robotBoundsMinimumY !== null) {
    return {
      supportMinimumY: robotBoundsMinimumY,
      supportContactCount,
      source: 'robot-bounds'
    };
  }

  const footGeometryMinimumY = finiteOrNull(input.footGeometryMinimumY);

  if (footGeometryMinimumY !== null) {
    return {
      supportMinimumY: footGeometryMinimumY,
      supportContactCount,
      source: 'foot-geometry'
    };
  }

  const contactMinimumY = finiteOrNull(input.contactMinimumY);

  if (supportContactCount > 0 && contactMinimumY !== null) {
    return {
      supportMinimumY: contactMinimumY,
      supportContactCount,
      source: 'foot-contact-anchors'
    };
  }

  return { supportMinimumY: null, supportContactCount: 0, source: 'robot-bounds' };
}

/**
 * Completes the missing world-height component of an observed robot pose.
 *
 * Joint values remain observed facts. The vertical offset is an explicit,
 * deterministic support-plane inference and never steps a physics simulation.
 * This vertical stage never changes X/Z. The companion support-anchor
 * projection may only apply the inverse centroid delta required to preserve
 * static contact, without becoming the robot pose authority.
 */
export function resolveObservedRobotGroundingProjection(input: {
  enabled: boolean;
  floorY: number;
  supportMinimumY: number | null;
  supportContactCount?: number;
  source: Exclude<ObservedRobotGroundingSource, 'unavailable'>;
}): ObservedRobotGroundingProjection {
  const floorY = Number.isFinite(input.floorY) ? input.floorY : 0;
  const supportContactCount = Number.isFinite(input.supportContactCount)
    ? Math.max(0, Math.trunc(input.supportContactCount ?? 0))
    : 0;

  if (!input.enabled) {
    return {
      status: 'disabled',
      source: 'unavailable',
      floorY,
      supportMinimumY: null,
      supportContactCount: 0,
      offsetY: 0,
      inferred: false,
      contactMode: 'unconstrained',
      affectedRootAxes: [],
      physicsAffected: false
    };
  }

  if (typeof input.supportMinimumY !== 'number' || !Number.isFinite(input.supportMinimumY)) {
    return {
      status: 'unavailable',
      source: 'unavailable',
      floorY,
      supportMinimumY: null,
      supportContactCount: 0,
      offsetY: 0,
      inferred: false,
      contactMode: 'unconstrained',
      affectedRootAxes: [],
      physicsAffected: false
    };
  }

  return {
    status: 'grounded',
    source: input.source,
    floorY,
    supportMinimumY: input.supportMinimumY,
    supportContactCount,
    offsetY: floorY - input.supportMinimumY,
    inferred: true,
    contactMode:
      input.source === 'collision-guided-render-envelope' ||
      input.source === 'collision-envelope' ||
      input.source === 'robot-bounds'
        ? 'collision-envelope-static-contact'
        : 'support-plane-static-friction',
    affectedRootAxes: ['y'],
    physicsAffected: false
  };
}
