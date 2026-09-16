export interface ViewerOrientationQuaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export const VIEWER_ORIENTATION_GIZMO_IDENTITY_TRANSFORM =
  'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)';

/**
 * Projects the world frame into camera space, like an aircraft attitude
 * indicator. The camera quaternion is the sole orientation authority: the
 * gizmo must never reconstruct or accumulate an independent orientation.
 */
export function resolveViewerOrientationGizmoTransform(
  cameraQuaternion: ViewerOrientationQuaternion
): string {
  const normalized = normalizeQuaternion(cameraQuaternion);

  if (!normalized) {
    return VIEWER_ORIENTATION_GIZMO_IDENTITY_TRANSFORM;
  }

  // A view compass displays the world as seen by the camera, so its rotation
  // is the inverse of the camera world rotation. For a unit quaternion, the
  // inverse is its conjugate.
  const viewQuaternion = {
    x: -normalized.x,
    y: -normalized.y,
    z: -normalized.z,
    w: normalized.w
  };
  const matrix = bridgeWorldViewMatrixToCss(createRotationMatrix(viewQuaternion));

  return `matrix3d(${matrix.map(formatMatrixValue).join(',')})`;
}

export function createViewerOrientationGizmoMatrix(
  cameraQuaternion: ViewerOrientationQuaternion
): readonly number[] {
  const normalized = normalizeQuaternion(cameraQuaternion);

  if (!normalized) {
    return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  }

  return bridgeWorldViewMatrixToCss(
    createRotationMatrix({
      x: -normalized.x,
      y: -normalized.y,
      z: -normalized.z,
      w: normalized.w
    })
  );
}

function normalizeQuaternion(
  quaternion: ViewerOrientationQuaternion
): ViewerOrientationQuaternion | null {
  const length = Math.hypot(quaternion.x, quaternion.y, quaternion.z, quaternion.w);

  if (!Number.isFinite(length) || length <= 0.000001) {
    return null;
  }

  return {
    x: quaternion.x / length,
    y: quaternion.y / length,
    z: quaternion.z / length,
    w: quaternion.w / length
  };
}

function createRotationMatrix(quaternion: ViewerOrientationQuaternion): number[] {
  const x2 = quaternion.x + quaternion.x;
  const y2 = quaternion.y + quaternion.y;
  const z2 = quaternion.z + quaternion.z;
  const xx = quaternion.x * x2;
  const xy = quaternion.x * y2;
  const xz = quaternion.x * z2;
  const yy = quaternion.y * y2;
  const yz = quaternion.y * z2;
  const zz = quaternion.z * z2;
  const wx = quaternion.w * x2;
  const wy = quaternion.w * y2;
  const wz = quaternion.w * z2;

  return [
    1 - (yy + zz),
    xy + wz,
    xz - wy,
    0,
    xy - wz,
    1 - (xx + zz),
    yz + wx,
    0,
    xz + wy,
    yz - wx,
    1 - (xx + yy),
    0,
    0,
    0,
    0,
    1
  ];
}

function bridgeWorldViewMatrixToCss(matrix: readonly number[]): number[] {
  // Three.js uses +Y upward while CSS 3D uses +Y downward. Conjugating the
  // view rotation by this axis reflection preserves yaw and corrects pitch
  // and roll without introducing a second orientation authority.
  const axisSigns = [1, -1, 1] as const;
  const projected = [...matrix];

  for (let column = 0; column < 3; column += 1) {
    for (let row = 0; row < 3; row += 1) {
      const index = column * 4 + row;
      projected[index] = matrix[index] * axisSigns[row] * axisSigns[column];
    }
  }

  return projected;
}

function formatMatrixValue(value: number): string {
  const rounded = Number(value.toFixed(6));
  return `${Object.is(rounded, -0) ? 0 : rounded}`;
}
