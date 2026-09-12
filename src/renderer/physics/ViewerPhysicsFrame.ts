import { Matrix4, Quaternion, Vector3 } from 'three';

const Z_UP_TO_Y_UP = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2);

/** Legacy viewer convention, not a universal coordinate-system default. */
export function resolveViewerSceneYaw(value: unknown, profileYaw: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof profileYaw === 'number' && Number.isFinite(profileYaw)) return profileYaw;
  return -Math.PI;
}

export function createViewerPhysicsFrameQuaternion(
  coordinateFrame: unknown, sceneYawRadians: number
): Quaternion {
  if (coordinateFrame !== 'mujoco-z-up' && coordinateFrame !== 'z-up') return new Quaternion();
  return new Quaternion()
    .setFromAxisAngle(new Vector3(0, 1, 0), sceneYawRadians)
    .multiply(Z_UP_TO_Y_UP);
}

/** Preserves the legacy in-place impulse conversion; frame is not mutated. */
export function projectViewerImpulseByFrame(impulse: Vector3, frame: Quaternion): Vector3 {
  return impulse.applyQuaternion(frame.clone().invert());
}

/** Points are copied and include the presentation-root inverse before the frame inverse. */
export function projectViewerPointByFrame(point: Vector3, rootWorld: Matrix4, frame: Quaternion): Vector3 {
  return point.clone().applyMatrix4(rootWorld.clone().invert()).applyQuaternion(frame.clone().invert());
}
