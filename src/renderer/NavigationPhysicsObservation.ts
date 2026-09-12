import type { BodyTransform } from '@konitif/physics';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { createViewerPhysicsFrameQuaternion } from './physics/ViewerPhysicsFrame.js';

export type Viewer3DNavigationSupportStatus = 'supported' | 'marginal' | 'unavailable';

export interface Viewer3DNavigationPhysicsObservation {
  forwardM: number;
  leftM: number;
  yawRad: number;
  observedAtSeconds: number;
  provenance: 'physics-simulation';
  simulationMode: 'kinematic-root';
  rootBodyName: string;
  support: {
    status: Viewer3DNavigationSupportStatus;
    evidenceKind: 'ground-proximity';
    activeContactIds: readonly string[];
    candidateContactIds: readonly string[];
  };
}

const SUPPORT_BAND_METERS = 0.035;

export function resolveViewer3DNavigationPhysicsObservation(input: {
  bodyTransforms: readonly BodyTransform[];
  simulatedTimeSeconds: number;
  defaultSceneYawRadians?: number;
  rootAlignmentMatrix?: Matrix4;
}): Viewer3DNavigationPhysicsObservation | null {
  const root =
    input.bodyTransforms.find((transform) => transform.metadata?.visualRoot === true) ?? null;
  if (!root || !isFiniteTransform(root)) return null;

  // Invalid defaults use the same explicit convention as an absent default.
  // A finite observed yaw still takes priority in resolveCoordinateRotation.
  const defaultYaw = typeof input.defaultSceneYawRadians === 'number' && Number.isFinite(input.defaultSceneYawRadians)
    ? input.defaultSceneYawRadians
    : -Math.PI;
  const coordinateRotation = resolveCoordinateRotation(root, defaultYaw);
  const rootProjectionMatrix = new Matrix4().makeRotationFromQuaternion(coordinateRotation).multiply(
    new Matrix4().compose(
      new Vector3(root.position.x, root.position.y, root.position.z),
      new Quaternion(root.rotation.x, root.rotation.y, root.rotation.z, root.rotation.w).normalize(),
      new Vector3(1, 1, 1)
    )
  );
  if (input.rootAlignmentMatrix) rootProjectionMatrix.multiply(input.rootAlignmentMatrix);
  const rootPosition = new Vector3();
  const rootRotation = new Quaternion();
  rootProjectionMatrix.decompose(rootPosition, rootRotation, new Vector3());
  const forwardDirection = new Vector3(0, 0, 1).applyQuaternion(rootRotation);
  const supportCandidates = resolveSupportCandidates(input.bodyTransforms, coordinateRotation);
  const minimumHeight = supportCandidates.reduce(
    (minimum, candidate) => Math.min(minimum, candidate.position.y),
    Number.POSITIVE_INFINITY
  );
  const activeContacts = Number.isFinite(minimumHeight)
    ? supportCandidates.filter(
        (candidate) => candidate.position.y <= minimumHeight + SUPPORT_BAND_METERS
      )
    : [];

  return {
    forwardM: rootPosition.z,
    leftM: rootPosition.x,
    yawRad: normalizeRadians(Math.atan2(forwardDirection.x, forwardDirection.z)),
    observedAtSeconds: input.simulatedTimeSeconds,
    provenance: 'physics-simulation',
    simulationMode: 'kinematic-root',
    rootBodyName: root.bodyName,
    support: {
      status:
        activeContacts.length >= 2
          ? 'supported'
          : activeContacts.length === 1
            ? 'marginal'
            : 'unavailable',
      evidenceKind: 'ground-proximity',
      activeContactIds: activeContacts.map((candidate) => candidate.bodyName),
      candidateContactIds: supportCandidates.map((candidate) => candidate.bodyName)
    }
  };
}

function resolveCoordinateRotation(
  transform: BodyTransform,
  defaultSceneYawRadians: number
): Quaternion {
  const coordinateFrame = transform.metadata?.coordinateFrame;
  if (coordinateFrame !== 'mujoco-z-up' && coordinateFrame !== 'z-up') {
    return new Quaternion();
  }
  const configuredYaw = transform.metadata?.sceneYawRadians;
  const sceneYawRadians =
    typeof configuredYaw === 'number' && Number.isFinite(configuredYaw)
      ? configuredYaw
      : defaultSceneYawRadians;
  return createViewerPhysicsFrameQuaternion(coordinateFrame, sceneYawRadians);
}

function resolveSupportCandidates(
  transforms: readonly BodyTransform[],
  coordinateRotation: Quaternion
): Array<{ bodyName: string; position: Vector3 }> {
  const explicitSupport = transforms.filter(
    (transform) => transform.metadata?.support === true && isFiniteTransform(transform)
  );
  const candidates = explicitSupport.length > 0
    ? explicitSupport
    : transforms.filter(
        (transform) => transform.metadata?.contact === true && isFiniteTransform(transform)
      );

  return candidates.map((transform) => ({
    bodyName: transform.bodyName,
    position: new Vector3(
      transform.position.x,
      transform.position.y,
      transform.position.z
    ).applyQuaternion(coordinateRotation)
  }));
}

function isFiniteTransform(transform: BodyTransform): boolean {
  return [
    transform.position.x,
    transform.position.y,
    transform.position.z,
    transform.rotation.x,
    transform.rotation.y,
    transform.rotation.z,
    transform.rotation.w
  ].every((value) => typeof value === 'number' && Number.isFinite(value));
}

function normalizeRadians(value: number): number {
  return Math.atan2(Math.sin(value), Math.cos(value));
}
