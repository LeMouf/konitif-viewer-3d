import { Object3D, OrthographicCamera, PerspectiveCamera, Quaternion, Vector3 } from 'three';
import type {
  RobotViewerQuaternion,
  RobotViewerVector,
  Viewer3DCameraProjection,
  Viewer3DOptions,
  Viewer3DSymmetricCameraView
} from './Viewer3DRenderer.js';

const ROBOT_VIEWER_CONTROLS_SETTLING_FRAMES = 10;
const ROBOT_VIEWER_ORTHOGRAPHIC_GROUND_MARGIN = 0.02;

type CameraLike = PerspectiveCamera | OrthographicCamera;
type ViewerCameraControls = {
  readonly target: Vector3;
  update(): boolean | void;
};

export interface OrthographicGroundCoveragePose {
  position: Vector3;
  target: Vector3;
  lift: number;
}

/**
 * Re-expresses a preset offset authored around the normalized simulated robot
 * in the orientation of another visual incarnation. Positions stay anchored
 * by semantic robot objects; this helper only carries the viewing direction.
 */
export function resolveRelativeRobotCameraOffset(
  offset: Vector3,
  referenceOrientation: Quaternion,
  activeOrientation: Quaternion
): Vector3 {
  const relativeOrientation = activeOrientation
    .clone()
    .multiply(referenceOrientation.clone().invert());

  return offset.clone().applyQuaternion(relativeOrientation);
}

export interface RobotCameraFocusFrame {
  anchor: Vector3;
  orientation: Quaternion;
}

export interface RobotCameraFocusPose {
  position: Vector3;
  target: Vector3;
  up: Vector3;
}

export interface QuaternionCameraOrbitPose {
  position: Vector3;
  up: Vector3;
}

export interface WorldUpCameraPose {
  position: Vector3;
  up: Vector3;
}

/** Shared temporal curve for camera, incarnation placement and opacity. */
export function easeViewerTransition(progress: number): number {
  const t = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  // Quintic smootherstep keeps velocity and acceleration continuous at both
  // ends. This is especially visible when a REAL incarnation fades in while
  // the comparison layout and camera focus move at the same time.
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/**
 * Applies a camera-local arcball step around a stable focus point.
 *
 * Both the camera offset and its tangent up vector are transported by the
 * same quaternions. Unlike a world-up spherical orbit, this representation
 * has no polar singularity and can cross the top or bottom of the sphere
 * without clamping or snapping.
 */
export function resolveQuaternionCameraOrbitPose(
  position: Vector3,
  target: Vector3,
  up: Vector3,
  deltaYawRadians: number,
  deltaPitchRadians: number
): QuaternionCameraOrbitPose | null {
  const offset = position.clone().sub(target);
  if (offset.lengthSq() <= 0.000001) {
    return null;
  }

  const forward = offset.clone().negate().normalize();
  const transportedUp = up.clone().sub(
    forward.clone().multiplyScalar(up.dot(forward))
  );

  if (transportedUp.lengthSq() <= 0.000001) {
    const fallbackUp = Math.abs(forward.y) < 0.95
      ? new Vector3(0, 1, 0)
      : new Vector3(1, 0, 0);
    transportedUp.copy(fallbackUp).sub(
      forward.clone().multiplyScalar(fallbackUp.dot(forward))
    );
  }
  transportedUp.normalize();

  const right = new Vector3().crossVectors(forward, transportedUp).normalize();
  const yawRotation = new Quaternion().setFromAxisAngle(
    transportedUp,
    -deltaYawRadians
  );
  offset.applyQuaternion(yawRotation);
  right.applyQuaternion(yawRotation).normalize();
  transportedUp.applyQuaternion(yawRotation).normalize();

  const pitchRotation = new Quaternion().setFromAxisAngle(
    right,
    deltaPitchRadians
  );
  offset.applyQuaternion(pitchRotation);
  transportedUp.applyQuaternion(pitchRotation).normalize();

  return {
    position: target.clone().add(offset),
    up: transportedUp
  };
}

/** Applies a classic spherical orbit around the immutable world Y axis. */
export function resolveWorldUpCameraOrbitPose(
  position: Vector3,
  target: Vector3,
  deltaYawRadians: number,
  deltaPitchRadians: number,
  minimumPolarAngleRadians = 0.01
): WorldUpCameraPose | null {
  const offset = position.clone().sub(target);
  const radius = offset.length();
  if (radius <= 0.000001) {
    return null;
  }

  const minimumPolarAngle = Math.min(
    Math.PI / 4,
    Math.max(0.001, Number.isFinite(minimumPolarAngleRadians) ? minimumPolarAngleRadians : 0)
  );
  const theta = Math.atan2(offset.x, offset.z) - deltaYawRadians;
  const currentPolarAngle = Math.acos(Math.min(1, Math.max(-1, offset.y / radius)));
  const polarAngle = Math.min(
    Math.PI - minimumPolarAngle,
    Math.max(minimumPolarAngle, currentPolarAngle + deltaPitchRadians)
  );
  const horizontalRadius = Math.sin(polarAngle) * radius;

  return {
    position: target.clone().add(
      new Vector3(
        Math.sin(theta) * horizontalRadius,
        Math.cos(polarAngle) * radius,
        Math.cos(theta) * horizontalRadius
      )
    ),
    up: new Vector3(0, 1, 0)
  };
}

/**
 * Reconciles an unrestricted arcball pose with a world-up orbit frame.
 * The viewing position is preserved unless it sits inside the small polar
 * singularity where OrbitControls cannot derive a stable azimuth.
 */
export function resolveWorldUpCameraPose(
  position: Vector3,
  target: Vector3,
  currentUp: Vector3,
  minimumPolarAngleRadians = Math.PI / 36
): WorldUpCameraPose {
  const worldUp = new Vector3(0, 1, 0);
  const offset = position.clone().sub(target);
  const distance = offset.length();

  if (distance <= 0.000001) {
    return { position: position.clone(), up: worldUp };
  }

  const direction = offset.clone().multiplyScalar(1 / distance);
  const minimumPolarAngle = Math.min(
    Math.PI / 4,
    Math.max(0.001, Number.isFinite(minimumPolarAngleRadians) ? minimumPolarAngleRadians : 0)
  );
  const polarAngle = Math.acos(Math.min(1, Math.max(-1, direction.dot(worldUp))));
  const clampedPolarAngle = Math.min(
    Math.PI - minimumPolarAngle,
    Math.max(minimumPolarAngle, polarAngle)
  );

  if (Math.abs(clampedPolarAngle - polarAngle) <= 0.000001) {
    return { position: position.clone(), up: worldUp };
  }

  const horizontalDirection = direction.clone().setY(0);
  if (horizontalDirection.lengthSq() <= 0.000001) {
    horizontalDirection.copy(currentUp).setY(0);
  }
  if (horizontalDirection.lengthSq() <= 0.000001) {
    horizontalDirection.set(0, 0, 1);
  }
  horizontalDirection.normalize();

  const correctedOffset = horizontalDirection
    .multiplyScalar(Math.sin(clampedPolarAngle) * distance)
    .addScaledVector(worldUp, Math.cos(clampedPolarAngle) * distance);

  return {
    position: target.clone().add(correctedOffset),
    up: worldUp
  };
}

/**
 * Projects one camera pose from a robot incarnation frame into another.
 * Translating and rotating the complete pose preserves the chosen framing,
 * zoom distance and semantic focus instead of snapping to a scene axis.
 */
export function resolveRobotCameraFocusPose(
  position: Vector3,
  target: Vector3,
  up: Vector3,
  from: RobotCameraFocusFrame,
  to: RobotCameraFocusFrame
): RobotCameraFocusPose {
  const relativeOrientation = to.orientation
    .clone()
    .multiply(from.orientation.clone().invert());
  const projectPoint = (point: Vector3): Vector3 =>
    point.clone().sub(from.anchor).applyQuaternion(relativeOrientation).add(to.anchor);

  return {
    position: projectPoint(position),
    target: projectPoint(target),
    up: up.clone().applyQuaternion(relativeOrientation).normalize()
  };
}

/**
 * Keeps the lower orthographic view rays above the support plane.
 *
 * Contrary to a perspective camera, orthographic rays start at different
 * world-space heights. With a shallow ISO framing, the bottom rays can start
 * below the floor and therefore never meet it, exposing a hard horizontal
 * background cut even when the ground mesh itself is very large.
 */
export function resolveOrthographicGroundCoveragePose(
  position: Vector3,
  target: Vector3,
  up: Vector3,
  viewHeight: number,
  floorY = 0,
  margin = ROBOT_VIEWER_ORTHOGRAPHIC_GROUND_MARGIN
): OrthographicGroundCoveragePose {
  const nextPosition = position.clone();
  const nextTarget = target.clone();
  const forward = target.clone().sub(position);

  if (
    !Number.isFinite(viewHeight) ||
    viewHeight <= 0 ||
    forward.lengthSq() <= 0.000001
  ) {
    return { position: nextPosition, target: nextTarget, lift: 0 };
  }

  forward.normalize();
  // A camera that does not look down cannot reveal a horizontal support
  // plane. Do not invent a displacement for that unrelated framing case.
  if (forward.y >= -0.000001) {
    return { position: nextPosition, target: nextTarget, lift: 0 };
  }

  const cameraRight = new Vector3().crossVectors(forward, up);
  if (cameraRight.lengthSq() <= 0.000001) {
    return { position: nextPosition, target: nextTarget, lift: 0 };
  }

  cameraRight.normalize();
  const cameraUp = new Vector3().crossVectors(cameraRight, forward).normalize();
  const lowerRayOriginY = position.y - cameraUp.y * viewHeight * 0.5;
  const lift = Math.max(0, floorY + Math.max(0, margin) - lowerRayOriginY);

  if (lift > 0) {
    // Translate position and target together: the ISO orientation and scale
    // remain unchanged while the robot gains the missing foreground floor.
    nextPosition.y += lift;
    nextTarget.y += lift;
  }

  return { position: nextPosition, target: nextTarget, lift };
}

interface EyeRingPoseLike {
  eyes: Array<{
    id: 'left' | 'right';
    center: Vector3;
  }>;
  orientation: Quaternion;
  radius: number;
}

export interface CameraControllerHost {
  readonly perspectiveCamera: PerspectiveCamera;
  readonly orthographicCamera: OrthographicCamera;
  readonly controls: ViewerCameraControls;
  getOptions(): Required<Omit<Viewer3DOptions, 'temporalSchedulerHost' | 'temporalProjectionExperimentCollector'>>;
  getCamera(): CameraLike;
  setCamera(camera: CameraLike): void;
  setControlsCamera(camera: CameraLike): void;
  setCameraTransitionActive(active: boolean): void;
  isDestroyed(): boolean;
  getViewportAspect(): number;
  getOrthographicViewHeight(): number;
  setOrthographicViewHeight(height: number): void;
  resolveOrthographicViewHeightFromPerspectiveDistance(distance: number): number;
  applyCameraPose(position: Vector3, target: Vector3, up?: Vector3): void;
  applyCameraPlanes(near: number, far: number): void;
  updateCameraProjectionForViewport(): void;
  syncPostProcessingCamera(): void;
  requestRender(): void;
  setControlsSettlingFrames(frames: number): void;
  setControlsActive(active: boolean): void;
  serializeCameraVector(vector: Vector3): RobotViewerVector;
  serializeCameraQuaternion(quaternion: Quaternion): RobotViewerQuaternion;
  resolveEyeRingPose(): EyeRingPoseLike | null;
  resolveRobotObject(candidates: readonly string[]): Object3D | null;
  resolveRobotCameraOffset(offset: Vector3): Vector3;
}

export class CameraController {
  private cameraTransitionFrame = 0;
  private cameraTransitionOnCancel: (() => void) | null = null;

  constructor(private readonly host: CameraControllerHost) {}

  setCameraPose(position: RobotViewerVector, target: RobotViewerVector = this.host.getOptions().cameraTarget, up?: RobotViewerVector): void {
    this.cancelCameraTransition();
    const nextPosition = new Vector3(position.x, position.y, position.z);
    const nextTarget = new Vector3(target.x, target.y, target.z);
    const nextUp = up ? new Vector3(up.x, up.y, up.z) : undefined;
    this.applyCameraPoseImmediate(nextPosition, nextTarget, nextUp);
  }

  orbitCameraBy(deltaYawRadians: number, deltaPitchRadians: number): void {
    const options = this.host.getOptions();
    const camera = this.host.getCamera();
    const target = this.host.controls?.target.clone() ?? new Vector3(options.cameraTarget.x, options.cameraTarget.y, options.cameraTarget.z);
    const pose = resolveQuaternionCameraOrbitPose(
      camera.position,
      target,
      camera.up,
      deltaYawRadians,
      deltaPitchRadians
    );

    if (!pose) {
      return;
    }

    this.cancelCameraTransition();
    this.host.setControlsSettlingFrames(ROBOT_VIEWER_CONTROLS_SETTLING_FRAMES);
    this.applyCameraPoseImmediate(pose.position, target, pose.up);
  }

  worldUpOrbitCameraBy(deltaYawRadians: number, deltaPitchRadians: number): void {
    const options = this.host.getOptions();
    const camera = this.host.getCamera();
    const target = this.host.controls?.target.clone() ??
      new Vector3(options.cameraTarget.x, options.cameraTarget.y, options.cameraTarget.z);
    const pose = resolveWorldUpCameraOrbitPose(
      camera.position,
      target,
      deltaYawRadians,
      deltaPitchRadians
    );

    if (!pose) {
      return;
    }

    this.cancelCameraTransition();
    this.host.setControlsSettlingFrames(ROBOT_VIEWER_CONTROLS_SETTLING_FRAMES);
    this.applyCameraPoseImmediate(pose.position, target, pose.up);
  }

  getCameraPose(): {
    position: RobotViewerVector;
    target: RobotViewerVector;
    up: RobotViewerVector;
    quaternion: RobotViewerQuaternion;
    projection: Viewer3DCameraProjection;
  } {
    const options = this.host.getOptions();
    const camera = this.host.getCamera();
    const target = this.host.controls?.target.clone() ?? new Vector3(options.cameraTarget.x, options.cameraTarget.y, options.cameraTarget.z);

    return {
      position: this.host.serializeCameraVector(camera.position),
      target: this.host.serializeCameraVector(target),
      up: this.host.serializeCameraVector(camera.up),
      quaternion: this.host.serializeCameraQuaternion(camera.quaternion),
      projection: options.cameraProjection
    };
  }

  resolveEyeRingCameraPose(viewId: Viewer3DSymmetricCameraView = 'mixed'): {
    position: RobotViewerVector;
    target: RobotViewerVector;
    projection: Viewer3DCameraProjection;
  } | null {
    const pose = this.host.resolveEyeRingPose();

    if (!pose) {
      return null;
    }

    const leftEye = pose.eyes.find((eye) => eye.id === 'left') ?? pose.eyes[0];
    const rightEye = pose.eyes.find((eye) => eye.id === 'right') ?? pose.eyes[1] ?? leftEye;
    const target =
      viewId === 'left'
        ? leftEye.center.clone()
        : viewId === 'right'
          ? rightEye.center.clone()
          : leftEye.center.clone().add(rightEye.center).multiplyScalar(0.5);
    const forward = new Vector3(0, 1, 0).applyQuaternion(pose.orientation).normalize();
    const vertical = new Vector3(1, 0, 0).applyQuaternion(pose.orientation).normalize();
    const lateral = new Vector3(0, 0, 1).applyQuaternion(pose.orientation).normalize();
    const distance = viewId === 'mixed' ? 0.18 : 0.135;
    const sideOffset = viewId === 'left' ? 0.018 : viewId === 'right' ? -0.018 : 0;
    const position = target
      .clone()
      .addScaledVector(forward, distance)
      .addScaledVector(vertical, pose.radius * 0.35)
      .addScaledVector(lateral, sideOffset);

    return {
      position: this.host.serializeCameraVector(position),
      target: this.host.serializeCameraVector(target),
      projection: 'perspective'
    };
  }

  resolveRobotObjectCameraPose(
    anchorNames: readonly string[] | readonly (readonly string[])[],
    offset: RobotViewerVector,
    options: {
      targetOffset?: RobotViewerVector;
      projection?: Viewer3DCameraProjection;
    } = {}
  ): {
    position: RobotViewerVector;
    target: RobotViewerVector;
    projection: Viewer3DCameraProjection;
  } | null {
    const anchors = Array.isArray(anchorNames[0])
      ? (anchorNames as readonly (readonly string[])[]).map((names) => this.host.resolveRobotObject(names)).filter((anchor): anchor is Object3D => Boolean(anchor))
      : [this.host.resolveRobotObject(anchorNames as readonly string[])].filter((anchor): anchor is Object3D => Boolean(anchor));

    if (anchors.length === 0) {
      return null;
    }

    const target = anchors
      .reduce((sum, anchor) => sum.add(anchor.getWorldPosition(new Vector3())), new Vector3())
      .multiplyScalar(1 / anchors.length);
    const targetOffset = options.targetOffset;

    if (targetOffset) {
      target.add(
        this.host.resolveRobotCameraOffset(
          new Vector3(targetOffset.x, targetOffset.y, targetOffset.z)
        )
      );
    }

    const position = target
      .clone()
      .add(this.host.resolveRobotCameraOffset(new Vector3(offset.x, offset.y, offset.z)));

    return {
      position: this.host.serializeCameraVector(position),
      target: this.host.serializeCameraVector(target),
      projection: options.projection ?? 'perspective'
    };
  }

  transitionCameraPose(
    position: RobotViewerVector,
    target: RobotViewerVector = this.host.getOptions().cameraTarget,
    durationMs = 420,
    up?: RobotViewerVector,
    callbacks: { onComplete?: () => void; onCancel?: () => void } = {}
  ): void {
    this.cancelCameraTransition();
    this.cameraTransitionOnCancel = callbacks.onCancel ?? null;

    const options = this.host.getOptions();
    const fromPosition = this.host.getCamera().position.clone();
    const fromTarget = this.host.controls?.target.clone() ?? new Vector3(options.cameraTarget.x, options.cameraTarget.y, options.cameraTarget.z);
    const toPosition = new Vector3(position.x, position.y, position.z);
    const toTarget = new Vector3(target.x, target.y, target.z);
    const toUp = up ? new Vector3(up.x, up.y, up.z) : undefined;
    const fromUp = this.host.getCamera().up.clone().normalize();
    const upRotation = toUp
      ? new Quaternion().setFromUnitVectors(fromUp, toUp.clone().normalize())
      : null;
    const currentPosition = new Vector3();
    const currentTarget = new Vector3();
    const currentUp = new Vector3();
    const currentUpRotation = new Quaternion();
    const duration = Math.max(0, durationMs);

    if (duration <= 0 || typeof requestAnimationFrame === 'undefined') {
      this.applyCameraPoseImmediate(toPosition, toTarget, toUp);
      this.cameraTransitionOnCancel = null;
      callbacks.onComplete?.();
      return;
    }

    const startedAt = performance.now();
    this.host.setCameraTransitionActive(true);
    const step = (now: number): void => {
      if (this.host.isDestroyed()) {
        this.cameraTransitionFrame = 0;
        this.cameraTransitionOnCancel = null;
        this.host.setCameraTransitionActive(false);
        return;
      }

      const progress = Math.min(1, Math.max(0, (now - startedAt) / duration));
      const eased = easeViewerTransition(progress);
      currentPosition.lerpVectors(fromPosition, toPosition, eased);
      currentTarget.lerpVectors(fromTarget, toTarget, eased);
      const interpolatedUp = upRotation
        ? currentUp
            .copy(fromUp)
            .applyQuaternion(currentUpRotation.identity().slerp(upRotation, eased))
            .normalize()
        : undefined;
      this.applyCameraPoseImmediate(currentPosition, currentTarget, interpolatedUp);

      if (progress < 1) {
        this.cameraTransitionFrame = requestAnimationFrame(step);
        return;
      }

      this.cameraTransitionFrame = 0;
      this.cameraTransitionOnCancel = null;
      this.host.setCameraTransitionActive(false);
      callbacks.onComplete?.();
    };

    this.cameraTransitionFrame = requestAnimationFrame(step);
  }

  transitionRobotCameraFocus(
    from: RobotCameraFocusFrame,
    to: RobotCameraFocusFrame,
    durationMs = 420
  ): void {
    const camera = this.host.getCamera();
    const options = this.host.getOptions();
    const target = this.host.controls?.target.clone() ??
      new Vector3(options.cameraTarget.x, options.cameraTarget.y, options.cameraTarget.z);
    const pose = resolveRobotCameraFocusPose(
      camera.position,
      target,
      camera.up,
      from,
      to
    );

    this.transitionCameraPose(
      this.host.serializeCameraVector(pose.position),
      this.host.serializeCameraVector(pose.target),
      durationMs,
      this.host.serializeCameraVector(pose.up)
    );
  }

  /**
   * Re-aims the camera at another incarnation while keeping its world position
   * and up vector fixed. This avoids composing a camera dolly with the robot
   * comparison layout tween during REAL connection.
   */
  transitionRobotCameraFocusTargetOnly(
    from: RobotCameraFocusFrame,
    to: RobotCameraFocusFrame,
    durationMs = 420,
    delayMs = 0
  ): void {
    const camera = this.host.getCamera();
    const options = this.host.getOptions();
    const target = this.host.controls?.target.clone() ??
      new Vector3(options.cameraTarget.x, options.cameraTarget.y, options.cameraTarget.z);
    const pose = resolveRobotCameraFocusPose(camera.position, target, camera.up, from, to);
    this.transitionCameraTargetFixed(pose.target, durationMs, delayMs);
  }

  private transitionCameraTargetFixed(
    target: Vector3,
    durationMs: number,
    delayMs: number
  ): void {
    this.cancelCameraTransition();
    const camera = this.host.getCamera();
    const fixedPosition = camera.position.clone();
    const fixedUp = camera.up.clone().normalize();
    const fromTarget = this.host.controls?.target.clone() ?? new Vector3();
    const currentTarget = new Vector3();
    const duration = Math.max(0, durationMs);
    const delay = Math.max(0, delayMs);

    if ((duration <= 0 && delay <= 0) || typeof requestAnimationFrame === 'undefined') {
      this.host.controls.target.copy(target);
      this.host.controls.update();
      this.host.applyCameraPose(fixedPosition, target, fixedUp);
      this.host.requestRender();
      return;
    }

    const startedAt = performance.now();
    this.host.setCameraTransitionActive(true);
    const step = (now: number): void => {
      if (this.host.isDestroyed()) {
        this.cameraTransitionFrame = 0;
        this.host.setCameraTransitionActive(false);
        return;
      }
      const elapsed = now - startedAt;
      const progress = Math.min(1, Math.max(0, (elapsed - delay) / Math.max(1, duration)));
      currentTarget.lerpVectors(fromTarget, target, easeViewerTransition(progress));
      this.host.controls.target.copy(currentTarget);
      this.host.applyCameraPose(fixedPosition, currentTarget, fixedUp);
      this.host.requestRender();

      if (elapsed < delay + duration) {
        this.cameraTransitionFrame = requestAnimationFrame(step);
        return;
      }
      this.cameraTransitionFrame = 0;
      this.host.setCameraTransitionActive(false);
      this.host.controls.target.copy(target);
      this.host.controls.update();
      this.host.applyCameraPose(fixedPosition, target, fixedUp);
      this.host.requestRender();
    };
    this.cameraTransitionFrame = requestAnimationFrame(step);
  }

  cancelCameraTransition(): void {
    const onCancel = this.cameraTransitionOnCancel;
    this.cameraTransitionOnCancel = null;
    if (this.cameraTransitionFrame === 0 || typeof cancelAnimationFrame === 'undefined') {
      this.cameraTransitionFrame = 0;
      onCancel?.();
      return;
    }

    cancelAnimationFrame(this.cameraTransitionFrame);
    this.cameraTransitionFrame = 0;
    this.host.setCameraTransitionActive(false);
    onCancel?.();
  }

  applyCameraPoseImmediate(position: Vector3, target: Vector3, up?: Vector3): void {
    const viewHeight = this.host.resolveOrthographicViewHeightFromPerspectiveDistance(position.distanceTo(target));
    this.host.setOrthographicViewHeight(viewHeight);
    const pose = this.resolveProjectionPose(position, target, up, viewHeight);
    this.host.applyCameraPose(pose.position, pose.target, up);
    this.host.updateCameraProjectionForViewport();
    this.host.controls?.target.copy(pose.target);
    this.host.controls?.update();
    this.host.requestRender();
  }

  setCameraProjection(cameraProjection: Viewer3DCameraProjection): void {
    const options = this.host.getOptions();

    if (options.cameraProjection === cameraProjection) {
      return;
    }

    this.cancelCameraTransition();
    const camera = this.host.getCamera();
    const position = camera.position.clone();
    const target = this.host.controls?.target.clone() ?? new Vector3(options.cameraTarget.x, options.cameraTarget.y, options.cameraTarget.z);

    const viewHeight = this.host.resolveOrthographicViewHeightFromPerspectiveDistance(position.distanceTo(target));
    if (cameraProjection === 'iso') this.host.setOrthographicViewHeight(viewHeight);

    const currentUp = camera.up.clone();
    const pose = cameraProjection === 'iso'
      ? resolveOrthographicGroundCoveragePose(position, target, currentUp, viewHeight)
      : { position, target, lift: 0 };
    options.cameraProjection = cameraProjection;
    this.host.applyCameraPose(pose.position, pose.target, currentUp);
    this.host.setCamera(cameraProjection === 'iso' ? this.host.orthographicCamera : this.host.perspectiveCamera);
    this.host.updateCameraProjectionForViewport();
    this.host.syncPostProcessingCamera();

    if (this.host.controls) {
      this.host.controls.target.copy(pose.target);
      this.host.setControlsCamera(this.host.getCamera());
      this.host.controls.update();
    }

    this.host.requestRender();
  }

  handleControlsStart(): void {
    this.cancelCameraTransition();
    this.host.setControlsActive(true);
    this.host.setControlsSettlingFrames(ROBOT_VIEWER_CONTROLS_SETTLING_FRAMES);
    this.host.requestRender();
  }

  handleControlsChange(): void {
    this.host.setControlsSettlingFrames(ROBOT_VIEWER_CONTROLS_SETTLING_FRAMES);
    this.host.requestRender();
  }

  handleControlsEnd(): void {
    this.host.setControlsActive(false);
    this.host.setControlsSettlingFrames(ROBOT_VIEWER_CONTROLS_SETTLING_FRAMES);
    const options = this.host.getOptions();
    if (options.cameraProjection === 'iso') {
      const camera = this.host.getCamera();
      const target = this.host.controls.target.clone();
      const pose = resolveOrthographicGroundCoveragePose(
        camera.position,
        target,
        camera.up,
        this.host.getOrthographicViewHeight()
      );
      if (pose.lift > 0) {
        this.host.applyCameraPose(pose.position, pose.target, camera.up);
        this.host.controls.target.copy(pose.target);
        this.host.controls.update();
      }
    }
    this.host.requestRender();
  }

  private resolveProjectionPose(
    position: Vector3,
    target: Vector3,
    up: Vector3 | undefined,
    viewHeight: number
  ): OrthographicGroundCoveragePose {
    return this.host.getOptions().cameraProjection === 'iso'
      ? resolveOrthographicGroundCoveragePose(
          position,
          target,
          up ?? this.host.getCamera().up,
          viewHeight
        )
      : { position, target, lift: 0 };
  }
}
