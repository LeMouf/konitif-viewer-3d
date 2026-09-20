import {
  createViewerPhysicsFrameQuaternion, resolveViewerSceneYaw,
  projectViewerImpulseByFrame, projectViewerPointByFrame
} from './physics/ViewerPhysicsFrame.js';
import { resolveViewerJointMapping, selectDirectViewerJointMappings } from './physics/ViewerJointResolution.js';
import {
  createPhysicsJointTargetValue,
  createVisualJointValueFromPhysics,
  createVisualJointValueFromSource
} from './physics/ViewerPhysicsJointMapping.js';
import {
  resolvePhysicsSourceString,
  resolvePhysicsSourceStringListMap,
  resolvePhysicsSourceStringSet,
  resolvePhysicsJointMappings,
  resolvePhysicsVisualAlignmentProfile,
  type ViewerPhysicsAlignment,
  type ViewerPhysicsJointBinding
} from './physics/ViewerPhysicsMetadata.js';
import type { ViewerJointHandleDefinition, ViewerSupportDefinition, ViewerDiagnosticContactDefinition, ViewerBalanceFootprintDefinition, ViewerHandTipDefinition, ViewerLedRingCalibration, ViewerLedReferenceFrame, ViewerLedPlacementDefinition } from '../index.js';
import {
  createClockGraph, createInvalidationController, createTemporalTransport,
  type InvalidationController, type TemporalScheduler, type TemporalSchedulerHost
} from '@konitif/temporal';
import { createViewerTemporalScheduler } from './ViewerTemporalScheduler.js';
import type {
  BodyTransform, JointTarget, PhysicsBodyImpulse, PhysicsEngineType, PhysicsColliderProxy,
  PhysicsRootPose, PhysicsRuntimeConfig, PhysicsServiceSnapshot,
  PhysicsServicePort, PhysicsSubjectSource
} from '@konitif/physics';
import { copyViewerMetadata, type ViewerMetadata } from './ViewerMetadata.js';
import type { ViewerHistoryPort, ViewerHistoryObservation } from './ViewerHistoryPort.js';
import type { ViewerHistorySample, ViewerHistoryTransform, ViewerHistoryVector3 } from './ViewerHistoryData.js';

export type ViewerRuntimeHistoryPort = ViewerHistoryPort<
  Omit<ViewerHistorySample<ViewerMetadata>, 'id' | 'recordedAt'> & { recordedAt?: number },
  ViewerHistoryObservation<ViewerHistorySample<ViewerMetadata>>
>;
import {
  resolveInteractionInputActions, resolveInteractionInputBindings,
  type InteractionInputBinding, type InteractionInputBindingOverride, type InteractionInputSignal
} from '@konitif/tools/input';
import {
  AxesHelper,
  Box3,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Float32BufferAttribute,
  FogExp2,
  GridHelper,
  Group,
  HalfFloatType,
  HemisphereLight,
  Line,
  LineBasicMaterial,
  Matrix4,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshDepthMaterial,
  NoToneMapping,
  Object3D,
  OrthographicCamera,
  Plane,
  PlaneGeometry,
  PerspectiveCamera,
  VSMShadowMap,
  Quaternion,
  Raycaster,
  Scene,
  CircleGeometry,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  WebGLRenderer,
  type Material,
  type WebGLRendererParameters
} from 'three';
import { ArcballControls } from 'three/examples/jsm/controls/ArcballControls.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { FXAAPass } from 'three/examples/jsm/postprocessing/FXAAPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { HorizontalTiltShiftShader } from 'three/examples/jsm/shaders/HorizontalTiltShiftShader.js';
import { VerticalTiltShiftShader } from 'three/examples/jsm/shaders/VerticalTiltShiftShader.js';
import {
  getRobotMotionAnimationDuration,
  interpolateRobotMotionTrackValueAtTime,
  toRobotMotionJointValue,
  resolveRobotMotionPlaybackDuration,
  type RobotMotionAnimation,
  type RobotMotionTrack
} from './robotViewerMotion.js';
import {
  createViewerProjectileLaunchSolution,
  VIEWER3D_PROJECTILE_PARTICLE_LIMIT,
  createViewerProjectileTrajectoryPoints,
  resolveViewerProjectileChargedLaunchProfile,
  resolveViewerProjectileImpulse,
  resolveViewerProjectileLauncherWorldScale,
  resolveViewerSlingshotReleasePull,
  stepViewerProjectileAgainstGround,
  type ViewerProjectileLaunchSolution
} from './ProjectileInteraction.js';
import {
  createInteractionKeyboardSignal,
  DEFAULT_VIEWER_INPUT_BINDINGS,
  VIEWER_PROJECTILE_CHARGE_ACTION_ID,
  VIEWER_PROJECTILE_LAUNCH_ACTION_ID
} from './ViewerInputBindings.js';
import {
  ViewerProjectileParticleRenderer,
  type ViewerProjectileVisualPhase
} from './ViewerProjectileParticleRenderer.js';
import {
  ROBOT_COMPARISON_VISIBILITY_LAYOUT_SHARE,
  resolveRobotComparisonVisibilityTransitionPhases
} from './RobotComparisonVisibilityTransition.js';
import {
  resolveViewer3DNavigationPhysicsObservation,
  type Viewer3DNavigationPhysicsObservation
} from './NavigationPhysicsObservation.js';
import {
  CameraController,
  easeViewerTransition,
  resolveRelativeRobotCameraOffset,
  resolveWorldUpCameraPose,
  type RobotCameraFocusFrame
} from './CameraController.js';
import { SelectionController } from './SelectionController.js';
import { AnimationLoop } from './AnimationLoop.js';
import { resolveViewerIncarnationHealth, type ViewerIncarnationHealth } from './ViewerIncarnationHealth.js';
import {
  PerformanceMonitor,
  type Viewer3DPerformanceSummary,
  type Viewer3DProfilerSample
} from './PerformanceMonitor.js';
import {
  ViewerTemporalProjectionBuffer,
  type ViewerTemporalProjectionMode,
  type ViewerTemporalProjectionStatus
} from './TemporalProjectionModel.js';
import {
  ObservedRobotPresentationBuffer,
  type ObservedRobotPresentationStatus
} from './ObservedRobotPresentationBuffer.js';
import {
  resolveViewerFrameSignalIntervalMs,
  VIEWER_FRAME_SIGNAL_CATALOG,
  type ViewerFrameSignalId
} from './ViewerFrameSignals.js';
import {
  DEFAULT_DISPLAY_FRAME_RATE_HZ,
  normalizeConfiguredDisplayFrameRate,
  observeDisplayFrameRateCeiling,
  resolveDisplayFrameRateTarget
} from './displayFrameRate.js';
import { ViewerTemporalProjectionExperimentAdapter } from './ViewerTemporalProjectionExperimentAdapter.js';
import type { ViewerExperimentCollector } from './ViewerExperimentCollector.js';
import type { ViewerExperimentPort, ViewerExperimentStart } from './ViewerExperimentPort.js';
import {
  createRobotPoseTransition,
  resolveRobotPoseEntryTransitionEndTime,
  resolveRobotPoseExitTransitionStartTime,
  sampleRobotPoseTransition,
  type RobotPoseTransition
} from './RobotPoseTransition.js';
import {
  resolveRobotSagittalPostureCompensation,
  type RobotSagittalPostureCompensationOptions
} from './RobotPostureCompensation.js';
import { resolveViewerResizePresentation } from './ViewerResizePresentation.js';
import {
  resolveViewerPlaybackProjectionTime,
  shouldAdvanceViewerPlaybackPhysics,
  shouldStartViewerPlaybackCompletionTransition,
  type ViewerPlaybackCompletionBehavior
} from './ViewerPlaybackCompletionPolicy.js';
import {
  resolveObservedRobotActiveSupportProjection,
  resolveObservedRobotGroundingProjection,
  resolveObservedRobotFootSupportEligibility,
  resolveObservedRobotSupportAnchorProjection,
  resolveObservedRobotSupportInclinationProjection,
  resolveObservedRobotSupportSurface,
  resolveObservedRobotTemporalSupportAnchorProjection,
  type ObservedRobotGroundingProjection,
  type ObservedRobotSupportInclinationProjection,
  type ObservedRobotTemporalSupportAnchorState
} from './ObservedRobotGroundingProjection.js';
import {
  DEFAULT_VIEWER_VISUAL_GROUND_CONFIG,
  VisualGroundLayer,
  type ViewerVisualGroundComponentId,
  type ViewerVisualGroundOptions,
  type ViewerVisualGroundPalette,
  type ViewerVisualGroundPaletteOptions
} from './VisualGroundLayer.js';

const activeViewers = new Set<Viewer3D>();
const PHYSICS_RESET_BASELINE_CAPTURE_FRAMES = 90;

const VIEWER_FOCUS_TILT_CLOSE_SPAN = 1.2;
const VIEWER_FOCUS_TILT_FAR_SPAN = 4.5;
const VIEWER_FOCUS_TILT_CLOSE_STRENGTH = 0.35;
const VIEWER_FOCUS_TILT_FAR_STRENGTH = 1.45;
const ROBOT_VIEWER_CAMERA_NEAR_MIN = 0.02;
const ROBOT_VIEWER_CAMERA_NEAR_MAX = 0.05;
const ROBOT_VIEWER_CAMERA_FAR_MIN = 256;
const ROBOT_VIEWER_CAMERA_MIN_DISTANCE = 0.12;
const ROBOT_VIEWER_CAMERA_MAX_DISTANCE = 24;
const ROBOT_VIEWER_CAMERA_MIN_ZOOM = 0.12;
const ROBOT_VIEWER_CAMERA_MAX_ZOOM = 14;
const ROBOT_VIEWER_HANDLE_FADE_OUT_SPAN_PX = 105;
const ROBOT_VIEWER_HANDLE_FADE_IN_SPAN_PX = 190;
const ROBOT_VIEWER_HANDLE_MIN_INTERACTION_OPACITY = 0.08;
// The authored temporal buffer is sampled at 30 Hz. Refreshing its planar
// reflection or rebasing the worker physics more frequently cannot reveal a
// newer authoritative sample; it only duplicates a full scene render / worker
// synchronization while the primary Viewer remains free to render at 120 Hz.
const ROBOT_VIEWER_REFLECTION_ACTIVE_MINIMUM_INTERVAL_MS = 1000 / 30;
const ROBOT_VIEWER_SCRUB_PHYSICS_SYNC_MINIMUM_INTERVAL_MS = 1000 / 30;
const ROBOT_VIEWER_PROJECTILE_MASS_KG = 0.18;
const ROBOT_VIEWER_PROJECTILE_RADIUS_M = 0.03;
const ROBOT_VIEWER_PROJECTILE_SETTLE_MS = 3_000;
export { VIEWER3D_PROJECTILE_PARTICLE_LIMIT } from './ProjectileInteraction.js';
const ROBOT_VIEWER_PROJECTILE_MAX_LIFETIME_MS = 12_000;
const ROBOT_VIEWER_PROJECTILE_SETTLED_HOLD_MS = 1_300;
const ROBOT_VIEWER_PROJECTILE_FADE_MS = 900;
const ROBOT_VIEWER_PROJECTILE_GROUND_RESTITUTION = 0.44;
const ROBOT_VIEWER_PROJECTILE_ROBOT_RESTITUTION = 0.38;
const ROBOT_VIEWER_PROJECTILE_GROUND_FRICTION_PER_SECOND = 4.8;
const ROBOT_VIEWER_PROJECTILE_SETTLE_SPEED_MPS = 0.11;
const ROBOT_VIEWER_PROJECTILE_ROBOT_CONTACT_COOLDOWN_MS = 120;
const ROBOT_VIEWER_PROJECTILE_LAUNCH_FLOOR_CLEARANCE_M = 0.002;
const ROBOT_VIEWER_PROJECTILE_CHARGE_MAX_MS = 900;
const ROBOT_VIEWER_PROJECTILE_LAUNCHER_SCREEN_SIZE_PX = 144;
const ROBOT_VIEWER_PROJECTILE_LAUNCHER_AUTHORED_SIZE_M = 0.13;
const ROBOT_VIEWER_PROJECTILE_LAUNCHER_BOTTOM_MARGIN_PX = 8;
const ROBOT_VIEWER_PROJECTILE_IMPACT_ARROW_SCREEN_SIZE_PX = 18;
const ROBOT_VIEWER_PROJECTILE_TRAJECTORY_RENDER_ORDER = 1_106;
const ROBOT_VIEWER_PROJECTILE_TRAJECTORY_LAUNCH_OVERLAY_RENDER_ORDER = 1_107;
const ROBOT_VIEWER_PROJECTILE_TRAJECTORY_LAUNCH_OVERLAY_LENGTH_M = 0.09;
const ROBOT_VIEWER_PROJECTILE_IDLE_TRANSITION_MS = 360;
const ROBOT_VIEWER_SLINGSHOT_RELEASE_MS = 420;
const ROBOT_VIEWER_SLINGSHOT_MAX_PULL_M = 0.195;
const ROBOT_VIEWER_SLINGSHOT_LAUNCH_ORIGIN_Y_M = 0.04;
const ROBOT_VIEWER_SLINGSHOT_LAUNCH_ORIGIN_Z_M = 0.006;
const ROBOT_VIEWER_SLINGSHOT_BELOW_LAUNCH_EXTENT_M = 0.12;
const ROBOT_VIEWER_SLINGSHOT_POUCH_HALF_WIDTH_M = 0.011;
const ROBOT_VIEWER_SLINGSHOT_POUCH_HEIGHT_M = 0.007;
const ROBOT_VIEWER_SLINGSHOT_POUCH_DEPTH_M = 0.0045;
const ROBOT_VIEWER_SLINGSHOT_BALL_RADIUS_M = 0.012;
const ROBOT_VIEWER_PROJECTILE_MAX_SCREEN_RADIUS_PX =
  (ROBOT_VIEWER_PROJECTILE_LAUNCHER_SCREEN_SIZE_PX * ROBOT_VIEWER_SLINGSHOT_BALL_RADIUS_M) /
  ROBOT_VIEWER_PROJECTILE_LAUNCHER_AUTHORED_SIZE_M;

interface Viewer3DProjectileParticle {
  id: number;
  slot: number;
  position: Vector3;
  velocity: Vector3;
  rotationX: number;
  rotationY: number;
  phase: ViewerProjectileVisualPhase;
  phaseStartedAt: number;
  bornAt: number;
  lastUpdatedAt: number;
  lastRobotContactAt: number;
  launchSpeedMetersPerSecond: number;
  chargeRatio: number;
  target: Viewer3DPoseControlTarget;
}

interface Viewer3DProjectileAimTransition {
  from: Vector3;
  target: Vector3;
  startedAt: number;
}

interface Viewer3DSlingshotReleaseState {
  startedAt: number;
  initialPullRatio: number;
}

export function resolveViewerFocusTiltBlurStrength(framingSpan: number): number {
  const safeSpan = Number.isFinite(framingSpan) ? Math.max(0, framingSpan) : VIEWER_FOCUS_TILT_CLOSE_SPAN;
  const blend = MathUtils.smoothstep(safeSpan, VIEWER_FOCUS_TILT_CLOSE_SPAN, VIEWER_FOCUS_TILT_FAR_SPAN);

  return MathUtils.lerp(VIEWER_FOCUS_TILT_CLOSE_STRENGTH, VIEWER_FOCUS_TILT_FAR_STRENGTH, blend);
}

export function resolveViewerPoseHandleDistanceOpacity(subjectScreenSpanPixels: number): number {
  if (!Number.isFinite(subjectScreenSpanPixels)) return 1;
  return MathUtils.smoothstep(
    Math.max(0, subjectScreenSpanPixels),
    ROBOT_VIEWER_HANDLE_FADE_OUT_SPAN_PX,
    ROBOT_VIEWER_HANDLE_FADE_IN_SPAN_PX
  );
}

export function resolveViewerCameraClippingPlanes(input: {
  requestedNear: number;
  requestedFar: number;
  groundSize: number;
  maximumCameraDistance?: number;
}): { near: number; far: number } {
  const requestedNear = Number.isFinite(input.requestedNear)
    ? input.requestedNear
    : ROBOT_VIEWER_CAMERA_NEAR_MIN;
  const requestedFar = Number.isFinite(input.requestedFar) ? input.requestedFar : 0;
  const groundSize = Number.isFinite(input.groundSize)
    ? Math.max(0, input.groundSize)
    : DEFAULT_VIEWER_VISUAL_GROUND_CONFIG.size;
  const maximumCameraDistance = Number.isFinite(input.maximumCameraDistance)
    ? Math.max(0, input.maximumCameraDistance ?? 0)
    : ROBOT_VIEWER_CAMERA_MAX_DISTANCE;
  const near = MathUtils.clamp(requestedNear, ROBOT_VIEWER_CAMERA_NEAR_MIN, ROBOT_VIEWER_CAMERA_NEAR_MAX);
  const far = Math.max(
    requestedFar,
    ROBOT_VIEWER_CAMERA_FAR_MIN,
    groundSize * 1.6,
    maximumCameraDistance * 6,
    near + 1
  );
  return { near, far };
}

export interface ViewerNavigationPresentationFrame {
  position: Vector3;
  quaternion: Quaternion;
}

/** Maps the local MoveTo frame (+Z forward, +X left) onto one robot incarnation. */
export function resolveViewerNavigationPresentationFrame(input: {
  activePosition: Vector3;
  activeOrientation: Quaternion;
  referenceOrientation: Quaternion;
}): ViewerNavigationPresentationFrame {
  const relativeOrientation = input.activeOrientation
    .clone()
    .multiply(input.referenceOrientation.clone().invert());
  const planarForward = new Vector3(0, 0, 1).applyQuaternion(relativeOrientation).setY(0);
  if (planarForward.lengthSq() <= 0.000001) {
    planarForward.set(0, 0, 1);
  }
  planarForward.normalize();
  const yawRadians = Math.atan2(planarForward.x, planarForward.z);

  return {
    position: new Vector3(input.activePosition.x, 0, input.activePosition.z),
    quaternion: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yawRadians)
  };
}

export function projectViewerNavigationWorldPointToLocal(
  point: Vector3,
  frame: ViewerNavigationPresentationFrame
): Vector3 {
  return point.clone().sub(frame.position).applyQuaternion(frame.quaternion.clone().invert());
}
const PHYSICS_RESET_KINEMATIC_HOLD_FRAMES = 12;
const ROBOT_VIEWER_DEFAULT_PHYSICS_STEP_RATE_HZ =
  VIEWER_FRAME_SIGNAL_CATALOG['physics-step'].targetRateHz ?? 30;
const ROBOT_VIEWER_GRID_DIVISIONS = 16;
const ROBOT_VIEWER_SUPPORT_FLOOR_Y = 0;
const ROBOT_VIEWER_OBSERVED_GHOST_RENDER_ORDER = 4;
const ROBOT_VIEWER_GRID_RENDER_ORDER = 5;
const ROBOT_VIEWER_CONTROLS_SETTLING_FRAMES = 10;
const ROBOT_VIEWER_RESIZE_SETTLE_MS = 96;
const ROBOT_VIEWER_MIN_VISIBLE_SIZE_PX = 2;
const ROBOT_VIEWER_TRANSIENT_INVISIBLE_RESIZE_RETRY_LIMIT = 12;
const ROBOT_VIEWER_PROFILER_HISTORY_MS = 60_000;
const ROBOT_VIEWER_PLAYBACK_START_BLEND_SECONDS = 0.25;
const ROBOT_VIEWER_PLAYBACK_COMPLETION_BLEND_MS = 500;
const ROBOT_VIEWER_BALANCE_CENTER_OF_MASS_FADE_MS = 280;
const ROBOT_VIEWER_INITIAL_ROOT_PRESENTATION_SETTLE_MS = 260;
const ROBOT_VIEWER_POSE_HANDLE_TARGET_FADE_MS = 280;
const ROBOT_VIEWER_PROFILER_GRAPH_WIDTH = 228;
const ROBOT_VIEWER_PROFILER_GRAPH_HEIGHT = 64;
const ROBOT_VIEWER_PROFILER_MS_GRAPH_MAX = 80;
const ROBOT_VIEWER_PROFILER_TIMER_INTERVAL_MS = 100;
const ROBOT_VIEWER_TRAJECTORY_MIN_SAMPLES = 12;
const ROBOT_VIEWER_TRAJECTORY_MAX_SAMPLES = 140;
const ROBOT_VIEWER_TRAJECTORY_SAMPLE_RATE = 24;
const ROBOT_VIEWER_POSE_HANDLE_SCALE = 1.28;
const ROBOT_VIEWER_HANDLE_SCREEN_RATIO = 0.062;
const ROBOT_VIEWER_HANDLE_SCREEN_MIN_PX = 34;
const ROBOT_VIEWER_HANDLE_SCREEN_MAX_PX = 94;
const ROBOT_VIEWER_PHYSICS_Z_UP_TO_Y_UP_QUATERNION = new Quaternion().setFromAxisAngle(
  new Vector3(1, 0, 0),
  -Math.PI / 2
);
const ROBOT_VIEWER_PHYSICS_SEMANTIC_SCENE_YAW_QUATERNION = new Quaternion().setFromAxisAngle(
  new Vector3(0, 1, 0),
  -Math.PI
);
const _ROBOT_VIEWER_MUJOCO_TO_VIEWER_QUATERNION =
  ROBOT_VIEWER_PHYSICS_SEMANTIC_SCENE_YAW_QUATERNION.clone().multiply(
    ROBOT_VIEWER_PHYSICS_Z_UP_TO_Y_UP_QUATERNION
  );
const ROBOT_VIEWER_EMPTY_LED_RING_CALIBRATION: Viewer3DLedRingCalibration = {
  layout: 'circle', forwardOffset: 0, verticalOffset: 0, lateralOffset: 0, separation: 0,
  radius: 0, stripLength: 0, ledCount: 1, ledSize: 0,
  rotationX: 0, rotationY: 0, rotationZ: 0,
  isVisible: false, mireVisible: false, variantCount: 1, variantStep: 0
};
const ROBOT_VIEWER_HMR_DISPOSE_EVENT = 'workbench:robot-viewer-hmr-dispose';
const ROBOT_VIEWER_JOINT_HOVER_EVENT = 'workbench:robot-viewer-joint-hover-change';
const ROBOT_VIEWER_LIVE_POSE_TARGET_EVENT = 'workbench:robot-viewer-live-pose-target';
const isFirefox =
  typeof navigator !== 'undefined' &&
  /firefox/i.test(typeof navigator.userAgent === 'string' ? navigator.userAgent : '');

type ViewerHotModule = {
  dispose(callback: () => void): void;
};

const viewerHotModule = (import.meta as ImportMeta & { hot?: ViewerHotModule }).hot;
if (viewerHotModule) {
  viewerHotModule.dispose(() => {
    for (const viewer of [...activeViewers]) {
      viewer.destroy({ reason: 'hmr' });
    }

    activeViewers.clear();
  });
}

export type RobotViewerVector = {
  x: number;
  y: number;
  z: number;
};

export type RobotViewerQuaternion = {
  x: number;
  y: number;
  z: number;
  w: number;
};

export interface Viewer3DPhysicsObservation {
  /** Root of the displayed projection, expressed in the physics ground frame. */
  rootTransform?: BodyTransform;
  projectionStage?: 'simulated' | 'authored';
  jointAngles?: Readonly<Record<string, number>>;
  sampleId: string;
  observedAtMs: number;
  simulatedTimeSeconds: number;
  centerOfMass: BodyTransform['position'] | null;
  bodyTransforms: readonly BodyTransform[];
  navigation: Viewer3DNavigationPhysicsObservation | null;
}

export interface Viewer3DRobotComparisonAppearance {
  mode: 'overlay' | 'offset' | 'observed-only';
  centeredSeparation: boolean;
  offsetMeters: number;
  observed: {
    opacity: number;
    tint: string;
  };
  simulated: {
    opacity: number;
    tint: string;
  };
}

interface Viewer3DMaterialBaseline {
  color: Color | null;
  depthTest: boolean;
  depthWrite: boolean;
  opacity: number;
  transparent: boolean;
}

export interface Viewer3DPoseHandleDefinition {
  readonly id: string;
  readonly label: string;
  readonly names: readonly string[];
  readonly color: string;
}

export interface Viewer3DOptions<Artifact = unknown, Snapshot = unknown> {
  /** Visibility host only: frame scheduling remains owned by the viewer's AnimationLoop. */
  temporalSchedulerHost?: TemporalSchedulerHost;
  supportDefinition?: ViewerSupportDefinition;
  diagnosticContactDefinitions?: readonly ViewerDiagnosticContactDefinition[];
  balanceFootprintDefinitions?: readonly ViewerBalanceFootprintDefinition[];
  /** Ordered model anchors; absent/unresolved names use the geometric center. */
  cameraFocusAnchorNames?: readonly string[];
  projectileTargetAnchorNames?: readonly string[];
  /** Pure presentation policy; undefined selects the neutral renderer color. */
  resolveJointColor?: (jointId: string) => string | undefined;
  /** Pure model policy; absent means no implicit joint trajectory selection. */
  shouldRenderJointTrajectory?: (jointId: string, jointType?: string) => boolean;
  handTipDefinitions?: readonly ViewerHandTipDefinition[];
  ledRingDefaults?: Readonly<Record<string, Readonly<Viewer3DLedRingCalibration>>>;
  headLedFrame?: ViewerLedReferenceFrame | null;
  bodyLedPlacements?: Readonly<Record<string, readonly ViewerLedPlacementDefinition[]>>;
  jointHandleDefinitions?: readonly ViewerJointHandleDefinition[];
  /** Product-supplied visual anchors. No implicit model-specific handles. */
  poseHandleDefinitions?: readonly Viewer3DPoseHandleDefinition[];
  transparent?: boolean;
  showRobot?: boolean;
  showObservedRobotGhost?: boolean;
  groundObservedRobotGhost?: boolean;
  showAxes?: boolean;
  showGrid?: boolean;
  showVisualGround?: boolean;
  visualGround?: ViewerVisualGroundOptions;
  visualGroundPalette?: ViewerVisualGroundPaletteOptions;
  showStats?: boolean;
  showGlobalRafProbe?: boolean;
  showTrajectories?: boolean;
  showHandTrajectoriesOnly?: boolean;
  showContactPoints?: boolean;
  showPhysicsDebug?: boolean;
  showPhysicsColliders?: boolean;
  showPhysicsCenterOfMass?: boolean;
  showPhysicsGravity?: boolean;
  showEyeRingDebug?: boolean;
  showEyeRingMire?: boolean;
  eyeRingCalibration?: Partial<Viewer3DEyeRingCalibration>;
  showBalanceDebug?: boolean;
  showPoseHandles?: boolean;
  poseHandleOcclusion?: boolean;
  interactionMode?: Viewer3DInteractionMode;
  inputBindings?: readonly InteractionInputBinding[];
  inputBindingOverrides?: readonly InteractionInputBindingOverride[];
  cameraProjection?: Viewer3DCameraProjection;
  cameraControlMode?: Viewer3DCameraControlMode;
  antialias?: boolean;
  antialiasMode?: 'none' | 'msaa' | 'fxaa' | 'smaa';
  maxPixelRatio?: number;
  minPixelRatio?: number;
  adaptivePixelRatio?: boolean;
  targetFrameRate?: number;
  autonomousPlayback?: boolean;
  continuousPlaybackRender?: boolean;
  stopPlaybackAtRangeEnd?: boolean;
  transitionToAnimationStart?: boolean;
  controlsEnabled?: boolean;
  suspendWhenViewportHidden?: boolean;
  physicsEngine?: PhysicsEngineType;
  physicsEnabled?: boolean;
  physicsMotorsCoupled?: boolean;
  physicsStepRateHz?: number;
  physicsPostureCompensation?: RobotSagittalPostureCompensationOptions | null;
  physicsService: PhysicsServicePort;
  /** Injected services are caller-owned by default. Use 'viewer' to transfer disposal responsibility.
   * This does not coordinate shared simulation writes.
   */
  physicsServiceOwnership?: 'caller' | 'viewer';
  runtimeHistory?: ViewerRuntimeHistoryPort | null;
  runtimeHistorySampleIntervalMs?: number;
  /** Dedicated collector configured for the temporal projection protocol. Omit for legacy collection. */
  temporalProjectionExperimentCollector: ViewerExperimentCollector<Artifact, Snapshot>;
  temporalProjectionMode?: ViewerTemporalProjectionMode;
  temporalProjectionBufferDelayMs?: number;
  temporalProjectionMaxSampleGapMs?: number;
  physicsObservationEnabled?: boolean;
  onTemporalProjectionStatus?: (status: ViewerTemporalProjectionStatus) => void;
  onPhysicsObservation?: (observation: Viewer3DPhysicsObservation) => void;
  onComparisonPhysicsObservation?: (
    profileId: string,
    observation: Viewer3DPhysicsObservation
  ) => void;
  onCameraInteractionStart?: () => void;
  cameraPosition?: RobotViewerVector;
  cameraTarget?: RobotViewerVector;
  onNavigationDestination?: (destination: RobotViewerVector) => void;
  onNavigationSimulationObservation?: (observation: Viewer3DNavigationSimulationObservation) => void;
  onProjectileInteraction?: (observation: Viewer3DProjectileInteractionObservation) => void;
}

const VIEWER3D_DEFAULT_CAMERA_POSITION: RobotViewerVector = { x: 1.4, y: 0.9, z: 1.4 };
const VIEWER3D_DEFAULT_CAMERA_TARGET: RobotViewerVector = { x: 0, y: 0.32, z: 0 };

export interface Viewer3DNavigationMoveToParameters {
  forwardDistanceM: number;
  leftDistanceM: number;
  leftAngularDistanceRad: number;
}

export interface Viewer3DNavigationSimulationObservation extends Viewer3DNavigationMoveToParameters {
  provenance: 'kinematic-preview';
  progress: number;
  completed: boolean;
}

export type Viewer3DInteractionMode = 'projectile' | 'camera' | 'joint' | 'pose' | 'navigate';
export type Viewer3DCameraProjection = 'perspective' | 'iso';
export type Viewer3DCameraControlMode = 'orbit' | 'arcball';
export type Viewer3DSymmetricCameraView = 'mixed' | 'left' | 'right';
export type Viewer3DPhysicalEntryMode = 'grounded-reset' | 'stabilized-continuation';

export interface Viewer3DProjectileInteractionObservation {
  status: 'idle' | 'charging' | 'launched' | 'impact' | 'ground-contact' | 'settled' | 'removed' | 'rejected';
  target: Viewer3DPoseControlTarget;
  massKilograms: number;
  speedMetersPerSecond: number;
  activeCount: number;
  limit: number;
  launchedCount: number;
  chargeRatio: number;
  reason?:
    | 'real-capability-unavailable'
    | 'physics-unavailable'
    | 'target-unavailable'
    | 'projectile-limit-reached';
}

export type Viewer3DLedRingZoneId = 'eyes' | 'headTop' | 'ears' | 'hands' | 'feet' | 'torso';

export type Viewer3DLedRingCalibration = ViewerLedRingCalibration;

export interface Viewer3DEyeRingCalibration extends Viewer3DLedRingCalibration {
  zones?: Partial<Record<Viewer3DLedRingZoneId, Partial<Viewer3DLedRingCalibration>>>;
}

export interface Viewer3DPlaybackState {
  sourceId?: string | null;
  /** Stable identity of the authored subject projected by this occurrence. */
  subjectId?: string | null;
  /** Complete projected duration, including non-motion content such as audio. */
  durationSeconds?: number | null;
  currentTime: number;
  resolveAuthoritativeCurrentTime?: (() => number) | null;
  resolveTemporalProjectionSample?: ((currentTimeSeconds: number) => ViewerHistorySample<ViewerMetadata> | null) | null;
  /** `manual` delegates time advancement to the deterministic buffer producer. */
  clockMode?: 'realtime' | 'manual';
  /** Independent playback reset, or continuation from a preceding stabilized clip. */
  physicalEntryMode?: Viewer3DPhysicalEntryMode;
  isPlaying?: boolean;
  playbackRate?: number;
  loopPlayback?: boolean;
  workRange?: {
    start: number;
    end: number;
  };
  mutedTrackTargets?: readonly string[];
  completionBehavior?: ViewerPlaybackCompletionBehavior;
  completionReached?: boolean;
  completionTransitionDurationMs?: number;
  startTransitionMinimumDurationSeconds?: number;
  entryPose?: Readonly<Record<string, number>> | 'robot-default' | null;
  endTransitionMinimumDurationSeconds?: number;
  exitPose?: Readonly<Record<string, number>> | 'robot-default' | null;
  completionTargetPose?: Readonly<Record<string, number>> | null;
}

export interface Viewer3DPoseEditDetail {
  dirty: boolean;
  jointIds: string[];
  jointValues: Record<string, number>;
  action: 'change' | 'apply' | 'revert' | 'reset';
}

export type Viewer3DPoseControlTarget = 'simulated' | 'observed';

export interface Viewer3DObservedRobotVisibilityOptions {
  transitionCameraFocus?: boolean;
  transitionPresentation?: boolean;
  nextPoseControlTarget?: Viewer3DPoseControlTarget;
  durationMs?: number;
}

export interface Viewer3DJointHoverDetail {
  jointIds: string[];
  activeJointIds?: string[];
  phase?: 'hover' | 'select' | 'drag' | 'clear';
}

export interface Viewer3DLivePoseTargetDetail {
  phase: 'start' | 'change' | 'end';
  targets: Array<{ jointId: string; positionRad: number }>;
}

interface Viewer3DResolvedPlaybackState {
  animation: RobotMotionAnimation | null;
  sourceId: string | null;
  subjectId: string | null;
  duration: number;
  currentTime: number;
  resolveAuthoritativeCurrentTime: (() => number) | null;
  resolveTemporalProjectionSample: ((currentTimeSeconds: number) => ViewerHistorySample<ViewerMetadata> | null) | null;
  clockMode: 'realtime' | 'manual';
  physicalEntryMode: Viewer3DPhysicalEntryMode;
  isPlaying: boolean;
  playbackRate: number;
  loopPlayback: boolean;
  workRange: {
    start: number;
    end: number;
  } | null;
  mutedTrackTargets: readonly string[];
  mutedTrackTargetSet: ReadonlySet<string>;
  completionBehavior: ViewerPlaybackCompletionBehavior;
  completionReached: boolean;
  completionTransitionDurationMs: number;
  startTransitionMinimumDurationSeconds: number;
  entryPose: Readonly<Record<string, number>> | 'robot-default' | null;
  endTransitionMinimumDurationSeconds: number;
  exitPose: Readonly<Record<string, number>> | 'robot-default' | null;
  completionTargetPose: Readonly<Record<string, number>> | null;
  syncedAt: number;
}

interface Viewer3DPlaybackCompletionTransitionState {
  animation: RobotMotionAnimation;
  transition: RobotPoseTransition;
}

interface Viewer3DPlaybackTransitionState {
  animation: RobotMotionAnimation;
  startTime: number;
  endTime: number;
  mutedTrackSignature: string;
  tracks: Viewer3DPlaybackTransitionTrack[];
}

interface Viewer3DPlaybackTransitionTrack {
  target: string;
  startValue: number;
  targetValue: number;
  endTime: number;
}

interface Viewer3DScrubPreviewState {
  animation: RobotMotionAnimation | null;
  duration: number;
  currentTime: number;
  targetTime: number;
  mutedTrackTargets: readonly string[];
  mutedTrackTargetSet: ReadonlySet<string>;
  mutedTrackSignature: string;
  active: boolean;
  needsPoseApplication: boolean;
  needsPhysicsSync: boolean;
}

interface RobotJointLike {
  mimicJoint?: string | null;
  mimicJoints?: readonly RobotJointLike[];
  isURDFJoint?: boolean;
  jointType?: string;
  angle?: number;
  jointValue?: number | number[];
  limit?: {
    lower?: number;
    upper?: number;
  };
  setJointValue: (value: number) => boolean | void;
  getWorldPosition?: (target: Vector3) => Vector3;
  localToWorld?: (target: Vector3) => Vector3;
  updateMatrixWorld?: (force?: boolean) => void;
  traverse?: (callback: (object: Object3D) => void) => void;
  matrixWorld?: Object3D['matrixWorld'];
}

interface Viewer3DTrajectoryPreviewTarget {
  id: string;
  sourceJoint: string;
  label: string;
}

interface Viewer3DContactPoint {
  id: string;
  point: Vector3;
  side: 'left' | 'right' | 'fallback';
}

interface Viewer3DEyeRingPose {
  eyes: Viewer3DEyePose[];
  orientation: Quaternion;
  radius: number;
}

interface Viewer3DEyePose {
  id: 'left' | 'right';
  center: Vector3;
  orientation: Quaternion;
}

interface Viewer3DLedRingPose {
  id: string;
  zoneId: Viewer3DLedRingZoneId;
  center: Vector3;
  orientation: Quaternion;
  radius: number;
  calibration: Viewer3DLedRingCalibration;
}

interface Viewer3DPoseHandle {
  id: string;
  label: string;
  point: Vector3;
  color: string;
  valueRatio?: number | null;
  axes?: Viewer3DJointHandleAxis[];
}

interface Viewer3DJointHandleAxis {
  jointId: string;
  label: string;
  color: string;
  valueRatio: number | null;
  dragDirection: 'horizontal' | 'vertical';
  dragScale: number;
  valueRange?: {
    min: number;
    max: number;
  };
}

interface Viewer3DPoseHandleDragState {
  pointerId: number;
  handleId: string;
  mode: Viewer3DInteractionMode;
  startClientX: number;
  startClientY: number;
  startJointValue: number | null;
  startJointValues: Record<string, number>;
  jointAxes: Viewer3DJointHandleAxis[];
  activeJointId: string | null;
  activeJointIds: string[];
  dragPlane: Plane | null;
  dragOffset: Vector3;
}

interface Viewer3DPoseHandleTargetTransitionState {
  startedAt: number;
  durationMs: number;
  swapped: boolean;
  comparisonAppearing: boolean | null;
}

interface Viewer3DRobotComparisonVisibilityTransitionState {
  observedRobot: Object3D;
  startedAt: number;
  durationMs: number;
  appearing: boolean;
  simulatedX: number;
  observedX: number;
  simulatedVisible: boolean;
  observedVisible: boolean;
  simulatedOpacity: number;
  observedOpacity: number;
  finalSimulatedX: number;
  finalSimulatedVisible: boolean;
  finalObservedVisible: boolean;
}

interface Viewer3DPoseHandleAxisLayout {
  radius: number;
  width: number;
}

interface Viewer3DPoseHandleAxisSelection {
  axes: Viewer3DJointHandleAxis[];
  primaryAxis: Viewer3DJointHandleAxis | null;
  mode: 'track' | 'center';
}

type Viewer3DBodyFamily = 'head' | 'torso' | 'left-arm' | 'right-arm' | 'left-leg' | 'right-leg';

interface Viewer3DDestroyOptions {
  reason?: 'dispose' | 'hmr';
}

interface Viewer3DViewportAuthority {
  left: number;
  top: number;
  width: number;
  height: number;
  visible: boolean;
}

type ViewerPerformanceProbeGlobal = {
  consume: () => {
    formatTop: () => string;
  };
};

const EMPTY_MUTED_TRACK_TARGET_SET: ReadonlySet<string> = new Set<string>();
type ViewerArcballControls = ArcballControls & { readonly target: Vector3 };
type ViewerCameraControls = OrbitControls | ViewerArcballControls;

export class Viewer3D<Artifact = unknown, Snapshot = unknown> implements ViewerExperimentPort<Artifact, Snapshot> {
  private displayedRecordedPhysicsObservation: Viewer3DPhysicsObservation | null = null;
  readonly container: HTMLDivElement;
  readonly renderer: WebGLRenderer;
  readonly scene: Scene;
  readonly perspectiveCamera: PerspectiveCamera;
  readonly orthographicCamera: OrthographicCamera;
  camera: PerspectiveCamera | OrthographicCamera;
  controls: ViewerCameraControls;
  readonly resizeObserver: ResizeObserver;
  private composer: EffectComposer | null = null;
  private renderPass: RenderPass | null = null;
  private horizontalTiltShiftPass: ShaderPass | null = null;
  private verticalTiltShiftPass: ShaderPass | null = null;
  private postProcessingAntialiasPass: FXAAPass | SMAAPass | null = null;
  private robot: Object3D | null = null;
  private readonly simulatedRobotPresentationRoot = new Group();
  private readonly observedRobotPresentationRoot = new Group();
  private observedRobotGhost: Object3D | null = null;
  private observedRobotGhostMirrorsSimulatedRobot = false;
  private comparisonProfileId: string | null = null;
  private comparisonViewerSample: ViewerHistorySample<ViewerMetadata>['viewer'] | null = null;
  private readonly comparisonColliderGroup = new Group();
  private readonly comparisonColliders = new Map<string, Group>();
  private comparisonCenterOfMassMarker: Mesh | null = null;
  private poseControlTarget: Viewer3DPoseControlTarget = 'simulated';
  private observedPoseLiveControlEnabled = false;
  private readonly robotMaterialBaselines = new Map<Material, Viewer3DMaterialBaseline>();
  private readonly observedRobotGhostMaterialBaselines = new Map<Material, Viewer3DMaterialBaseline>();
  private readonly observedRobotGhostRenderOrderBaselines = new Map<Mesh, number>();
  private readonly observedRobotGhostShadowMaterials = new Map<Mesh, MeshDepthMaterial>();
  private observedRobotGhostShadowOpacity = 0;
  private robotComparisonVisibilityTransition: Viewer3DRobotComparisonVisibilityTransitionState | null = null;
  private cameraTransitionActive = false;
  private readonly observedRobotGhostBasePosition = new Vector3();
  private readonly observedRobotGhostBaseQuaternion = new Quaternion();
  private readonly observedRobotGhostBaseScale = new Vector3(1, 1, 1);
  private observedRobotTemporalSupportAnchorState: ObservedRobotTemporalSupportAnchorState | null = null;
  private observedRobotGrounding: ObservedRobotGroundingProjection = resolveObservedRobotGroundingProjection({
    enabled: false,
    floorY: ROBOT_VIEWER_SUPPORT_FLOOR_Y,
    supportMinimumY: null,
    source: 'robot-bounds'
  });
  private observedRobotSupportInclination: ObservedRobotSupportInclinationProjection =
    resolveObservedRobotSupportInclinationProjection({ enabled: false, supportPoints: [] });
  private robotComparisonAppearance: Viewer3DRobotComparisonAppearance = {
    mode: 'offset',
    centeredSeparation: true,
    offsetMeters: 0.5,
    observed: { opacity: 1, tint: '#22d3ee' },
    simulated: { opacity: 1, tint: '#ffffff' }
  };
  private axesHelper: AxesHelper | null = null;
  private gridHelper: GridHelper | null = null;
  private visualGroundLayer: VisualGroundLayer | null = null;
  private keyLight: DirectionalLight | null = null;
  private trajectoryGroup: Group | null = null;
  private contactPointGroup: Group | null = null;
  private physicsDebugGroup: Group | null = null;
  private physicsDebugGroundMesh: Mesh | null = null;
  private physicsDebugGravityArrow: Group | null = null;
  private eyeRingDebugGroup: Group | null = null;
  private balanceDebugGroup: Group | null = null;
  private balanceDebugCenterOfMassQualified = false;
  private balanceDebugCenterOfMassFadeStartedAt: number | null = null;
  private simulatedRobotInitializationOffsetStartedAt: number | null = null;
  private simulatedRobotInitializationOffsetFromY = 0;
  private poseHandleGroup: Group | null = null;
  private navigationPreviewGroup: Group | null = null;
  private navigationMarker: Mesh | null = null;
  private navigationPath: Line | null = null;
  private navigationMarkerAnimationStartedAt: number | null = null;
  private navigationSimulationCursor: Mesh | null = null;
  private navigationSimulationPoints: Vector3[] = [];
  private navigationSimulationStartedAt: number | null = null;
  private navigationSimulationDurationMs = 0;
  private navigationSimulationTargetYawRad = 0;
  private navigationSimulationResolve: ((status: 'completed' | 'cancelled') => void) | null = null;
  private navigationSimulationPhysicsBaseline: {
    coordinateFrameInverse: Matrix4;
    rootAlignmentInverse: Matrix4;
    startPathPoint: Vector3;
    startViewerPosition: Vector3;
    startViewerRotation: Quaternion;
    startViewerScale: Vector3;
  } | null = null;
  private projectileInteractionGroup: Group | null = null;
  private projectileLauncherGroup: Group | null = null;
  private projectileSlingshotLeftElastic: Mesh | null = null;
  private projectileSlingshotRightElastic: Mesh | null = null;
  private projectileSlingshotPouch: Mesh | null = null;
  private projectileSlingshotLoadedBall: Mesh | null = null;
  private projectileSlingshotPullRatio = 0;
  private projectileSlingshotReleaseState: Viewer3DSlingshotReleaseState | null = null;
  private projectileTrajectoryLine: Line | null = null;
  private projectileTrajectoryLaunchOverlay: Line | null = null;
  private projectileImpactArrow: Mesh | null = null;
  private projectileParticleRenderer: ViewerProjectileParticleRenderer | null = null;
  private projectileAimLaunch: ViewerProjectileLaunchSolution | null = null;
  private readonly projectileAimTarget = new Vector3();
  private projectileAimSpeedMetersPerSecond = 3.4;
  private projectileChargeStartedAt: number | null = null;
  private projectileLastChargeRatio = 0;
  private projectileAimTransition: Viewer3DProjectileAimTransition | null = null;
  private readonly projectileParticles: Viewer3DProjectileParticle[] = [];
  private nextProjectileParticleId = 1;
  private projectilePhysicsSettlingUntil = 0;
  private readonly projectileRaycaster = new Raycaster();
  private readonly projectilePointer = new Vector2();
  private projectilePointerInside = false;
  private trajectoryAnimation: RobotMotionAnimation | null = null;
  private trajectorySignature = '';
  private trajectoryAnchors = new Map<string, Vector3 | null>();
  private themeObserver: MutationObserver | null = null;
  private animationLoop!: AnimationLoop;
  private defaultPose: Record<string, number> | null = null;
  private defaultRobotTransform: { position: Vector3; quaternion: Quaternion; scale: Vector3 } | null = null;
  private physicsResetPose: Record<string, number> | null = null;
  private physicsResetRobotTransform: { position: Vector3; quaternion: Quaternion; scale: Vector3 } | null =
    null;
  private physicsResetBaselineCaptureFrames = 0;
  private physicsResetBaselineCaptureFrameCount = PHYSICS_RESET_BASELINE_CAPTURE_FRAMES;
  private physicsPostureCompensationTransitionFrameActive = false;
  private lastAnimatedJointTargets = new Set<string>();
  private nextAnimatedJointTargets = new Set<string>();
  private readonly transientDesiredProjectionValues = new Map<string, Readonly<Record<string, number>>>();
  private readonly transientDesiredProjectionBaseline = new Map<string, number>();
  private playbackState: Viewer3DResolvedPlaybackState | null = null;
  private playbackTransitionState: Viewer3DPlaybackTransitionState | null = null;
  private playbackCompletionTransitionState: Viewer3DPlaybackCompletionTransitionState | null = null;
  private boundaryPosePreviewTransitionState: RobotPoseTransition | null = null;
  private deferredBoundaryPreviewRuntimeHistoryProjection: {
    sample: ViewerHistorySample<ViewerMetadata>;
    applyCamera: boolean | undefined;
  } | null = null;
  private scrubPreviewState: Viewer3DScrubPreviewState | null = null;
  private lastScrubPhysicsSyncAt = Number.NEGATIVE_INFINITY;
  private playbackSyncSignature = '';
  private physicsKinematicHoldFrames = 0;
  private physicsKinematicHoldRootPose: PhysicsRootPose | null = null;
  private physicsProjectionMinimumStateRevision: number | null = null;
  private statsCadenceElement: HTMLDivElement | null = null;
  private statsCadenceTextElement: HTMLDivElement | null = null;
  private statsGraphCanvas: HTMLCanvasElement | null = null;
  private readonly performanceMonitor = new PerformanceMonitor();
  private readonly temporalProjection: ViewerTemporalProjectionBuffer;
  private readonly observedRobotPresentation = new ObservedRobotPresentationBuffer();
  private readonly temporalProjectionExperiment: ViewerTemporalProjectionExperimentAdapter<Artifact, Snapshot>;
  private viewportObserver: IntersectionObserver | null = null;
  private resizeFrame = 0;
  private resizeSettleTimer: ReturnType<typeof setTimeout> | null = null;
  private transientInvisibleResizePasses = 0;
  private currentPixelRatio = 1;
  private averageFrameMs = 1000 / 60;
  private averageRafFrameMs = 1000 / 60;
  private averageGlobalRafFrameMs = 1000 / 60;
  private readonly configuredTargetFrameRate: number | null;
  private observedFrameRateCeiling = DEFAULT_DISPLAY_FRAME_RATE_HZ;
  private lastRafAt = 0;
  private lastGlobalRafAt = 0;
  private lastCadenceReportAt = 0;
  private rafFramesSinceReport = 0;
  private globalRafFramesSinceReport = 0;
  private renderFramesSinceReport = 0;
  private playbackFramesSinceReport = 0;
  private scrubFramesSinceReport = 0;
  private lastFrameAt = 0;
  private lastPixelRatioTuneAt = 0;
  private averageLoopMs = 0;
  private averagePoseMs = 0;
  private averageControlsMs = 0;
  private averageRenderMs = 0;
  private lastRenderCalls = 0;
  private lastRenderTriangles = 0;
  private longTaskObserver: PerformanceObserver | null = null;
  private longTaskCountSinceReport = 0;
  private longTaskDurationSinceReport = 0;
  private globalRafProbeFrame = 0;
  private profilerTimerProbe: number | null = null;
  private lastProfilerTimerProbeAt = 0;
  private averageProfilerTimerDelayMs = 0;
  private viewportVisible = true;
  private rendererClientWidth = 0;
  private rendererClientHeight = 0;
  private rendererPixelRatio = 0;
  private orthographicViewHeight = 1;
  private controlsActive = false;
  private controlsSettlingFrames = 0;
  private visualGroundReflectionInteractionActive = false;
  private destroyed = false;
  private readonly selectionController = new SelectionController();
  private lastDispatchedJointHoverSignature = '';
  private poseHandleDragState: Viewer3DPoseHandleDragState | null = null;
  private poseHandleTargetTransitionState: Viewer3DPoseHandleTargetTransitionState | null = null;
  private poseHandleDragStarted = false;
  private poseHandleControlsWereEnabled = false;
  private suppressPoseHandleClickUntil = 0;
  private poseEditBaseline: Record<string, number> | null = null;
  private dirtyPose = false;
  private readonly dirtyPoseJointIds = new Set<string>();
  private readonly physicsDebugMarkers = new Map<string, Group>();
  private readonly physicsDebugLinks = new Map<string, Line>();
  private readonly physicsDebugColliders = new Map<string, Group>();
  private physicsCenterOfMassMarker: Mesh | null = null;
  private readonly temporalInvalidation: InvalidationController;
  private readonly temporalScheduler: TemporalScheduler;
  private readonly physicsService: PhysicsServicePort;
  private cameraController!: CameraController;
  private readonly poseHandleRaycaster = new Raycaster();
  private readonly poseHandlePointer = new Vector2();
  private readonly navigationRaycaster = new Raycaster();
  private readonly navigationPointer = new Vector2();
  private readonly navigationGroundPlane = new Plane(new Vector3(0, 1, 0), 0);
  private readonly visualGroundFocusProjection = new Vector3();
  private readonly poseHandleLocalAnchorOffsets = new Map<string, Vector3>();
  private readonly options: Required<Omit<Viewer3DOptions<Artifact, Snapshot>, 'temporalSchedulerHost' | 'temporalProjectionExperimentCollector'>>;
  private resolvedInputBindings: readonly InteractionInputBinding[] = [];
  private readonly cameraPoseLocked: boolean;
  private lastPhysicsStepAt = 0;
  private readonly physicsAuthoredJointTargets = new Map<string, number>();
  private physicsPostureCompensationTiltRadians: number | null = null;
  private physicsAuxiliaryJointNames = new Set<string>();
  private physicsVisualRootBodyName: string | null = null;
  private physicsVisualRootToRobotMatrix: Matrix4 | null = null;
  private physicsJointMappings = new Map<string, ViewerPhysicsJointBinding>();
  private physicsVisualBodyObjectNames = new Map<string, readonly string[]>();
  private physicsVisualAlignmentProfile: ViewerPhysicsAlignment | null = null;
  private lastRuntimeHistorySampleAt = 0;
  private unsubscribeRuntimeHistory = () => {};
  private lastRuntimeHistoryReplaySignature = '';
  private runtimeHistoryReplayActive = false;
  private runtimeHistoryProjectionRequiresPhysicsRebase = false;
  private runtimeHistoryProjectedPhysicsRootPose: PhysicsRootPose | null = null;
  private isApplyingRuntimeHistorySample = false;
  private isApplyingPhysicsPose = false;
  private temporalProjectionDiscontinuitySequence = 0;
  private lastTemporalProjectionSampleId = '';
  private lastTemporalProjectionStatusSignature = '';
  private projectedPhysicsBodyTransforms: readonly BodyTransform[] = [];
  private projectedPhysicsCenterOfMass: BodyTransform['position'] | null = null;

  private get hoveredPoseHandleId(): string | null {
    return this.selectionController.hoveredPoseHandleId;
  }

  private set hoveredPoseHandleId(handleId: string | null) {
    this.selectionController.hoveredPoseHandleId = handleId;
  }

  private get hoveredPoseHandleAxisId(): string | null {
    return this.selectionController.hoveredPoseHandleAxisId;
  }

  private set hoveredPoseHandleAxisId(axisId: string | null) {
    this.selectionController.hoveredPoseHandleAxisId = axisId;
  }

  private get hoveredPoseHandleAxisIds(): string[] {
    return this.selectionController.hoveredPoseHandleAxisIds;
  }

  private set hoveredPoseHandleAxisIds(axisIds: string[]) {
    this.selectionController.hoveredPoseHandleAxisIds = axisIds;
  }

  private get externalHoveredJointTargets(): string[] {
    return this.selectionController.externalHoveredJointTargets;
  }

  private set externalHoveredJointTargets(jointTargets: string[]) {
    this.selectionController.externalHoveredJointTargets = jointTargets;
  }

  private get selectedPoseHandleId(): string | null {
    return this.selectionController.selectedPoseHandleId;
  }

  private set selectedPoseHandleId(handleId: string | null) {
    this.selectionController.selectedPoseHandleId = handleId;
  }

  private get selectedPoseHandleAxisId(): string | null {
    return this.selectionController.selectedPoseHandleAxisId;
  }

  private set selectedPoseHandleAxisId(axisId: string | null) {
    this.selectionController.selectedPoseHandleAxisId = axisId;
  }

  private get selectedPoseHandleAxisIds(): string[] {
    return this.selectionController.selectedPoseHandleAxisIds;
  }

  private set selectedPoseHandleAxisIds(axisIds: string[]) {
    this.selectionController.selectedPoseHandleAxisIds = axisIds;
  }

  private get needsRender(): boolean {
    return this.animationLoop.needsRender;
  }

  private set needsRender(needsRender: boolean) {
    this.animationLoop.needsRender = needsRender;
  }

  private get wasContinuousLoopActive(): boolean {
    return this.animationLoop.wasContinuousLoopActive;
  }

  private set wasContinuousLoopActive(wasContinuousLoopActive: boolean) {
    this.animationLoop.wasContinuousLoopActive = wasContinuousLoopActive;
  }

  constructor(container: HTMLDivElement, options: Viewer3DOptions<Artifact, Snapshot>) {
    if (!options?.physicsService) {
      throw new Error('Viewer3D requires an explicit physicsService provider, including for disabled physics.');
    }
    if (!options.temporalProjectionExperimentCollector) {
      throw new Error('Viewer3D requires an explicit temporalProjectionExperimentCollector provider.');
    }
    this.temporalProjectionExperiment = new ViewerTemporalProjectionExperimentAdapter(
      options.temporalProjectionExperimentCollector
    );
    this.container = container;
    this.cameraPoseLocked = !!options.cameraPosition || !!options.cameraTarget;
    this.temporalInvalidation = createInvalidationController();
    this.temporalProjection = new ViewerTemporalProjectionBuffer({
      bufferDelayMs: options.temporalProjectionBufferDelayMs,
      maxSampleGapMs: options.temporalProjectionMaxSampleGapMs
    });
    this.temporalProjection.setMode(options.temporalProjectionMode ?? 'interpolated');
    this.temporalScheduler = createViewerTemporalScheduler({
      transport: createTemporalTransport({ clockGraph: createClockGraph() }),
      invalidation: this.temporalInvalidation,
      mode: 'static'
    }, options.temporalSchedulerHost);
    this.animationLoop = new AnimationLoop({
      isDestroyed: () => this.destroyed,
      invalidate: () => this.temporalInvalidation.invalidate('state'),
      frame: () => this.loop()
    });
    this.configuredTargetFrameRate = normalizeConfiguredDisplayFrameRate(options.targetFrameRate);
    this.options = {
      supportDefinition: structuredClone(options.supportDefinition ?? { contacts: [], geometryGroups: [] }),
      diagnosticContactDefinitions: structuredClone(options.diagnosticContactDefinitions ?? []),
      balanceFootprintDefinitions: structuredClone(options.balanceFootprintDefinitions ?? []),
      cameraFocusAnchorNames: [...(options.cameraFocusAnchorNames ?? [])],
      projectileTargetAnchorNames: [...(options.projectileTargetAnchorNames ?? [])],
      resolveJointColor: options.resolveJointColor ?? (() => undefined),
      shouldRenderJointTrajectory: options.shouldRenderJointTrajectory ?? (() => false),
      handTipDefinitions: structuredClone(options.handTipDefinitions ?? []),
      ledRingDefaults: structuredClone(options.ledRingDefaults ?? {}),
      headLedFrame: structuredClone(options.headLedFrame ?? null),
      bodyLedPlacements: structuredClone(options.bodyLedPlacements ?? {}),
      jointHandleDefinitions: structuredClone(options.jointHandleDefinitions ?? []),
      poseHandleDefinitions: (options.poseHandleDefinitions ?? []).map((definition) => ({
        ...definition, names: [...definition.names]
      })),
      transparent: options.transparent ?? false,
      showRobot: options.showRobot ?? true,
      showObservedRobotGhost: options.showObservedRobotGhost ?? false,
      groundObservedRobotGhost: options.groundObservedRobotGhost ?? true,
      showAxes: options.showAxes ?? false,
      showGrid: options.showVisualGround === true ? false : (options.showGrid ?? false),
      showVisualGround: options.showVisualGround ?? (options.showGrid === true ? false : true),
      visualGround: options.visualGround ?? {},
      visualGroundPalette: options.visualGroundPalette ?? {},
      showStats: options.showStats ?? false,
      showGlobalRafProbe: options.showGlobalRafProbe ?? false,
      showTrajectories: options.showTrajectories ?? false,
      showHandTrajectoriesOnly: options.showHandTrajectoriesOnly ?? false,
      showContactPoints: options.showContactPoints ?? false,
      showPhysicsDebug: options.showPhysicsDebug ?? false,
      showPhysicsColliders: options.showPhysicsColliders ?? false,
      showPhysicsCenterOfMass: options.showPhysicsCenterOfMass ?? false,
      showPhysicsGravity: options.showPhysicsGravity ?? false,
      showEyeRingDebug: options.showEyeRingDebug ?? false,
      showEyeRingMire: options.showEyeRingMire ?? false,
      eyeRingCalibration: options.eyeRingCalibration ?? {},
      showBalanceDebug: options.showBalanceDebug ?? false,
      showPoseHandles: options.showPoseHandles ?? false,
      poseHandleOcclusion: options.poseHandleOcclusion ?? true,
      interactionMode: options.interactionMode ?? 'camera',
      inputBindings: options.inputBindings ?? DEFAULT_VIEWER_INPUT_BINDINGS,
      inputBindingOverrides: options.inputBindingOverrides ?? [],
      cameraProjection: options.cameraProjection ?? 'perspective',
      cameraControlMode: options.cameraControlMode ?? 'orbit',
      antialias: options.antialias ?? true,
      antialiasMode: options.antialiasMode ?? (options.antialias === false ? 'none' : 'msaa'),
      maxPixelRatio: options.maxPixelRatio ?? 2,
      minPixelRatio: options.minPixelRatio ?? 1,
      adaptivePixelRatio: options.adaptivePixelRatio ?? false,
      targetFrameRate: this.configuredTargetFrameRate ?? DEFAULT_DISPLAY_FRAME_RATE_HZ,
      autonomousPlayback: options.autonomousPlayback ?? false,
      continuousPlaybackRender: options.continuousPlaybackRender ?? false,
      stopPlaybackAtRangeEnd: options.stopPlaybackAtRangeEnd ?? true,
      transitionToAnimationStart: options.transitionToAnimationStart ?? false,
      controlsEnabled: options.controlsEnabled ?? true,
      suspendWhenViewportHidden: options.suspendWhenViewportHidden ?? true,
      physicsEngine: options.physicsEngine ?? 'none',
      physicsEnabled: options.physicsEnabled ?? false,
      physicsMotorsCoupled: options.physicsMotorsCoupled ?? true,
      physicsStepRateHz: normalizeFrameRate(
        options.physicsStepRateHz,
        ROBOT_VIEWER_DEFAULT_PHYSICS_STEP_RATE_HZ
      ),
      physicsPostureCompensation: options.physicsPostureCompensation ?? null,
      physicsServiceOwnership: options.physicsServiceOwnership ?? 'caller',
      physicsService: options.physicsService,
      runtimeHistory: options.runtimeHistory ?? null,
      runtimeHistorySampleIntervalMs: options.runtimeHistorySampleIntervalMs ?? 1000 / 30,
      temporalProjectionMode: options.temporalProjectionMode ?? 'interpolated',
      temporalProjectionBufferDelayMs: options.temporalProjectionBufferDelayMs ?? 1000 / 30,
      temporalProjectionMaxSampleGapMs: options.temporalProjectionMaxSampleGapMs ?? 120,
      physicsObservationEnabled:
        options.physicsObservationEnabled ??
        (typeof options.onPhysicsObservation === 'function' ||
          typeof options.onComparisonPhysicsObservation === 'function'),
      onTemporalProjectionStatus: options.onTemporalProjectionStatus ?? (() => {}),
      onPhysicsObservation: options.onPhysicsObservation ?? (() => {}),
      onComparisonPhysicsObservation: options.onComparisonPhysicsObservation ?? (() => {}),
      onCameraInteractionStart: options.onCameraInteractionStart ?? (() => {}),
      cameraPosition: options.cameraPosition ?? VIEWER3D_DEFAULT_CAMERA_POSITION,
      cameraTarget: options.cameraTarget ?? VIEWER3D_DEFAULT_CAMERA_TARGET,
      onNavigationDestination: options.onNavigationDestination ?? (() => {}),
      onNavigationSimulationObservation: options.onNavigationSimulationObservation ?? (() => {}),
      onProjectileInteraction: options.onProjectileInteraction ?? (() => {})
    };
    this.resolvedInputBindings = resolveInteractionInputBindings(
      this.options.inputBindings,
      this.options.inputBindingOverrides
    );
    this.physicsService = this.options.physicsService;
    this.scene = new Scene();
    this.scene.background = this.options.transparent
      ? null
      : this.resolveThemeColor('--color-background-canvas', '#111722');

    const initialPosition = new Vector3(
      this.options.cameraPosition.x,
      this.options.cameraPosition.y,
      this.options.cameraPosition.z
    );
    const initialTarget = new Vector3(
      this.options.cameraTarget.x,
      this.options.cameraTarget.y,
      this.options.cameraTarget.z
    );
    this.perspectiveCamera = new PerspectiveCamera(
      55,
      this.getViewportAspect(),
      ROBOT_VIEWER_CAMERA_NEAR_MIN,
      ROBOT_VIEWER_CAMERA_FAR_MIN
    );
    this.orthographicCamera = new OrthographicCamera(
      -0.5,
      0.5,
      0.5,
      -0.5,
      ROBOT_VIEWER_CAMERA_NEAR_MIN,
      ROBOT_VIEWER_CAMERA_FAR_MIN
    );
    this.orthographicViewHeight = this.resolveOrthographicViewHeightFromPerspectiveDistance(
      initialPosition.distanceTo(initialTarget)
    );
    this.camera = this.options.cameraProjection === 'iso' ? this.orthographicCamera : this.perspectiveCamera;
    this.applyCameraPose(initialPosition, initialTarget);
    this.updateCameraProjectionForViewport();

    this.renderer = this.createRenderer();
    this.renderer.setClearColor(0x000000, this.options.transparent ? 0 : 1);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.minWidth = '0';
    this.renderer.domElement.style.minHeight = '0';
    this.renderer.domElement.dataset.workbenchRobotViewerCanvas = 'true';
    this.applyRendererSize();
    this.setupPostProcessing();

    this.controls = this.createCameraControls(this.options.cameraControlMode);
    const getControls = () => this.controls;
    this.cameraController = new CameraController({
      perspectiveCamera: this.perspectiveCamera,
      orthographicCamera: this.orthographicCamera,
      get controls() {
        return getControls();
      },
      getOptions: () => this.options,
      getCamera: () => this.camera,
      setCamera: (camera) => {
        this.camera = camera;
      },
      setControlsCamera: (camera) => this.setControlsCamera(camera),
      setCameraTransitionActive: (active) => {
        if (this.cameraTransitionActive === active) return;
        this.cameraTransitionActive = active;
        if (!active) this.visualGroundLayer?.requestReflectionRefresh();
      },
      isDestroyed: () => this.destroyed,
      getViewportAspect: () => this.getViewportAspect(),
      getOrthographicViewHeight: () => this.orthographicViewHeight,
      setOrthographicViewHeight: (height) => {
        this.orthographicViewHeight = height;
      },
      resolveOrthographicViewHeightFromPerspectiveDistance: (distance) =>
        this.resolveOrthographicViewHeightFromPerspectiveDistance(distance),
      applyCameraPose: (position, target, up) => this.applyCameraPose(position, target, up),
      applyCameraPlanes: (near, far) => this.applyCameraPlanes(near, far),
      updateCameraProjectionForViewport: () => this.updateCameraProjectionForViewport(),
      syncPostProcessingCamera: () => this.syncPostProcessingCamera(),
      requestRender: () => this.requestRender(),
      setControlsSettlingFrames: (frames) => {
        this.controlsSettlingFrames = frames;
      },
      setControlsActive: (active) => {
        this.controlsActive = active;
      },
      serializeCameraVector: (vector) => this.serializeCameraVector(vector),
      serializeCameraQuaternion: (quaternion) => this.serializeCameraQuaternion(quaternion),
      resolveEyeRingPose: () => this.resolvePoseControlEyeRingPose(),
      resolveRobotObject: (candidates) => this.resolvePoseControlObject(candidates),
      resolveRobotCameraOffset: (offset) => this.resolvePoseControlCameraOffset(offset)
    });
    this.renderer.domElement.addEventListener('pointermove', this.handlePoseHandlePointerMove, true);
    this.renderer.domElement.addEventListener('pointerdown', this.handlePoseHandlePointerDown, true);
    this.renderer.domElement.addEventListener('pointerup', this.handlePoseHandlePointerUp, true);
    this.renderer.domElement.addEventListener('pointercancel', this.handlePoseHandlePointerUp, true);
    this.renderer.domElement.addEventListener('pointerleave', this.handlePoseHandlePointerLeave, true);
    this.renderer.domElement.addEventListener('click', this.handlePoseHandleClick, true);
    this.renderer.domElement.addEventListener('pointermove', this.handleProjectilePointerMove, true);
    this.container.addEventListener('pointerenter', this.handleProjectilePointerEnter, true);
    this.container.addEventListener('pointerleave', this.handleProjectilePointerLeave, true);
    window.addEventListener('keydown', this.handleInteractionKeyDown, true);
    window.addEventListener('keyup', this.handleInteractionKeyUp, true);
    window.addEventListener('blur', this.handleProjectileWindowBlur);
    this.renderer.domElement.addEventListener('dblclick', this.handleNavigationDoubleClick, true);

    this.setupScene();
    this.applyCameraPlanes(this.camera.near, this.camera.far);

    this.container.appendChild(this.renderer.domElement);
    this.setupStats();
    this.resizeObserver = new ResizeObserver(this.handleResize);
    this.resizeObserver.observe(this.container);
    this.observeViewportVisibility();
    this.observeThemeChanges();
    this.applyTheme();
    activeViewers.add(this);
    this.subscribeRuntimeHistory();
    this.temporalScheduler.start();
    if (this.options.physicsEngine !== 'none' || this.options.physicsEnabled) {
      void this.setPhysicsEngine(this.options.physicsEngine, this.options.physicsEnabled).catch((error) => {
        if (this.destroyed) return;
        console.warn(
          '[robot-viewer] Physics initialization failed:',
          error instanceof Error ? error.message : String(error)
        );
      });
    }
    this.scheduleLoop();
  }

  setStatsVisible(showStats: boolean): void {
    if (this.options.showStats === showStats) {
      return;
    }

    this.options.showStats = showStats;

    if (showStats) {
      this.setupStats();
      this.resetStatsCadence(performance.now());
    } else {
      this.teardownStats();
    }
  }

  setGlobalRafProbeVisible(showGlobalRafProbe: boolean): void {
    if (this.options.showGlobalRafProbe === showGlobalRafProbe) {
      return;
    }

    this.options.showGlobalRafProbe = showGlobalRafProbe;
    this.lastGlobalRafAt = 0;
    this.globalRafFramesSinceReport = 0;

    if (showGlobalRafProbe) {
      this.startGlobalRafProbe();
      return;
    }

    if (this.globalRafProbeFrame !== 0) {
      cancelAnimationFrame(this.globalRafProbeFrame);
      this.globalRafProbeFrame = 0;
    }
  }

  setGridVisible(showGrid: boolean): void {
    if (this.options.showGrid === showGrid) {
      return;
    }

    this.options.showGrid = showGrid;

    if (showGrid) {
      if (this.options.showVisualGround) {
        this.setVisualGroundVisible(false);
      }
      this.ensureGridHelper();
      this.applyTheme();
      return;
    }

    if (this.gridHelper) {
      this.scene.remove(this.gridHelper);
      this.disposeObject3D(this.gridHelper);
      this.gridHelper = null;
    }

    this.requestRender();
  }

  setVisualGroundVisible(showVisualGround: boolean): void {
    if (this.options.showVisualGround === showVisualGround) {
      this.updateVisualGroundEnvironment();
      return;
    }

    this.options.showVisualGround = showVisualGround;

    if (showVisualGround) {
      if (this.options.showGrid) {
        this.setGridVisible(false);
      }
      this.ensureVisualGroundLayer();
      this.visualGroundLayer?.setVisible(true);
    } else {
      this.visualGroundLayer?.setVisible(false);
    }

    this.updateVisualGroundEnvironment();
    this.applyTheme();
  }

  configureVisualGround(
    config: ViewerVisualGroundOptions,
    palette: ViewerVisualGroundPaletteOptions = {}
  ): void {
    this.options.visualGround = {
      ...this.options.visualGround,
      ...config,
      components: {
        ...this.options.visualGround.components,
        ...config.components
      }
    };
    this.options.visualGroundPalette = {
      ...this.options.visualGroundPalette,
      ...palette
    };
    this.ensureVisualGroundLayer();
    this.visualGroundLayer?.configure(config);
    this.applyCameraPlanes(this.camera.near, this.camera.far);
    this.updateVisualGroundEnvironment();
    this.applyTheme();
  }

  setVisualGroundComponentVisible(componentId: ViewerVisualGroundComponentId, visible: boolean): void {
    this.options.visualGround = {
      ...this.options.visualGround,
      components: {
        ...this.options.visualGround.components,
        [componentId]: visible
      }
    };
    this.ensureVisualGroundLayer();
    this.visualGroundLayer?.setComponentVisible(componentId, visible);
    this.updateVisualGroundEnvironment();
    this.requestRender();
  }

  setAxesVisible(showAxes: boolean): void {
    if (this.options.showAxes === showAxes) {
      return;
    }

    this.options.showAxes = showAxes;

    if (showAxes) {
      this.ensureAxesHelper();
      this.requestRender();
      return;
    }

    if (this.axesHelper) {
      this.scene.remove(this.axesHelper);
      this.disposeObject3D(this.axesHelper);
      this.axesHelper = null;
    }

    this.requestRender();
  }

  setOrientationGizmoVisible(_showOrientationGizmo: boolean): void {
    this.requestRender();
  }

  setRobotVisible(showRobot: boolean): void {
    if (this.options.showRobot === showRobot) {
      return;
    }

    this.options.showRobot = showRobot;

    if (this.robot) {
      this.robot.visible = showRobot;
    }

    this.requestRender();
  }

  /**
   * Installs a second visual incarnation reserved for observed robot telemetry.
   * It never participates in physics, authoring, selection, or command routing.
   */
  setObservedRobotGhost(robot: Object3D | null): void {
    this.clearObservedRobotGhost();

    if (!robot) {
      this.requestRender();
      return;
    }

    this.observedRobotGhost = robot;
    this.configureObservedRobotGhostMaterials(robot);
    this.observedRobotGhostBasePosition.copy(robot.position);
    this.observedRobotGhostBaseQuaternion.copy(robot.quaternion);
    this.observedRobotGhostBaseScale.copy(robot.scale);
    robot.name = robot.name ? `${robot.name}:observed-ghost` : 'observed-robot-ghost';
    robot.visible = this.options.showObservedRobotGhost;
    if (!this.observedRobotPresentationRoot.parent) {
      this.observedRobotPresentationRoot.name = 'observed-robot-comparison-presentation';
      this.scene.add(this.observedRobotPresentationRoot);
    }
    this.observedRobotPresentationRoot.position.set(0, 0, 0);
    this.observedRobotPresentationRoot.add(robot);
    this.updateVisualGroundShadowCasters();
    this.applyRobotComparisonAppearance();
    if (this.poseControlTarget === 'observed') this.refreshPoseHandleProjection();
    this.requestRender();
  }

  /**
   * Makes the secondary incarnation a read-only profile comparison projection.
   * Canonical joint values are copied from the simulated robot at render time;
   * the secondary robot never becomes an authoring or physics authority.
   */
  setObservedRobotGhostMirrorsSimulatedRobot(enabled: boolean): void {
    this.observedRobotGhostMirrorsSimulatedRobot = enabled;
    if (enabled) this.syncObservedRobotGhostFromSimulatedRobot();
    this.requestRender();
  }

  setObservedRobotGhostIndependentSimulation(profileId: string | null): void {
    this.comparisonProfileId = profileId;
    this.observedRobotGhostMirrorsSimulatedRobot = false;
    this.comparisonViewerSample = null;
    if (profileId) this.setObservedPoseLiveControlEnabled(false);
    this.observedRobotPresentation.reset('discontinuity');
    this.comparisonColliderGroup.removeFromParent();
    this.disposeObject3D(this.comparisonColliderGroup);
    this.comparisonColliderGroup.clear();
    this.comparisonColliders.clear();
    this.comparisonCenterOfMassMarker = null;
    this.requestRender();
  }

  private projectComparisonSimulation(): void {
    if (!this.comparisonProfileId || !this.observedRobotGhost) return;
    const sample = this.comparisonViewerSample;
    const transforms = (sample?.physics?.bodyTransforms ?? []).map((body) =>
      this.deserializeRuntimeHistoryTransform(body, false)
    );
    const root = transforms.find((body) => body.metadata?.visualRoot === true);
    const robot = this.observedRobotGhost;
    robot.visible = this.options.showObservedRobotGhost;
    this.comparisonColliderGroup.visible = Boolean(
      root && (this.options.showPhysicsColliders || this.options.showPhysicsCenterOfMass) && robot.visible
    );
    if (!root || !sample) {
      // Asset visibility is independent from runtime physics availability. A
      // comparison peer must remain inspectable while its first frame arrives.
      robot.position.copy(this.observedRobotGhostBasePosition);
      robot.quaternion.copy(this.observedRobotGhostBaseQuaternion);
      robot.scale.copy(this.observedRobotGhostBaseScale);
      if (this.robotComparisonAppearance.mode === 'offset') {
        robot.position.x +=
          this.robotComparisonAppearance.offsetMeters /
          (this.robotComparisonAppearance.centeredSeparation ? 2 : 1);
      }
      this.groundSimulatedRobotOnSupportFloor(robot);
      return;
    }
    const joints = (robot as { joints?: Record<string, RobotJointLike> }).joints ?? {};
    for (const [name, value] of Object.entries(sample.joints ?? {})) {
      if (Number.isFinite(value)) joints[name]?.setJointValue(value);
    }
    this.reconcileRecordedMimicJoints(robot, sample.joints ?? {});
    this.createPhysicsBodyViewerWorldMatrix(root).decompose(robot.position, robot.quaternion, robot.scale);
    const separation =
      this.robotComparisonAppearance.mode === 'offset'
        ? this.robotComparisonAppearance.offsetMeters /
          (this.robotComparisonAppearance.centeredSeparation ? 2 : 1)
        : 0;
    robot.position.x += separation;
    robot.updateMatrixWorld(true);
    if (this.comparisonColliderGroup.parent !== this.observedRobotPresentationRoot) {
      this.observedRobotPresentationRoot.add(this.comparisonColliderGroup);
    }
    this.comparisonColliderGroup.position.set(separation, 0, 0);
    const active = new Set<string>();
    for (const body of transforms) {
      const proxies = this.resolvePhysicsDebugColliderProxies(body);
      if (!proxies.length) continue;
      active.add(body.bodyName);
      let group = this.comparisonColliders.get(body.bodyName);
      const signature = JSON.stringify(proxies);
      if (!group || group.userData.signature !== signature) {
        if (group) {
          group.removeFromParent();
          this.disposeObject3D(group);
        }
        group = new Group();
        group.userData.signature = signature;
        group.name = `comparison-collider-${body.bodyName}`;
        for (const proxy of proxies)
          group.add(
            this.createPhysicsDebugColliderObject(proxy, this.resolvePhysicsDebugColliderColor(body))
          );
        this.comparisonColliders.set(body.bodyName, group);
        this.comparisonColliderGroup.add(group);
      }
      this.createPhysicsBodyViewerWorldMatrix(body).decompose(group.position, group.quaternion, group.scale);
      group.visible = this.options.showPhysicsColliders;
    }
    for (const [name, group] of this.comparisonColliders) {
      if (active.has(name)) continue;
      group.removeFromParent();
      this.disposeObject3D(group);
      this.comparisonColliders.delete(name);
    }
    if (this.options.showPhysicsCenterOfMass && sample.physics?.centerOfMass) {
      if (!this.comparisonCenterOfMassMarker) {
        this.comparisonCenterOfMassMarker = new Mesh(
          new SphereGeometry(0.018, 12, 8),
          new MeshBasicMaterial({ color: '#fbbf24', depthTest: false })
        );
        this.comparisonCenterOfMassMarker.name = 'comparison-center-of-mass';
        this.comparisonColliderGroup.add(this.comparisonCenterOfMassMarker);
      }
      this.comparisonCenterOfMassMarker.position.copy(
        this.resolvePhysicsVectorViewerPosition(sample.physics.centerOfMass, transforms)
      );
      this.comparisonCenterOfMassMarker.visible = true;
    } else if (this.comparisonCenterOfMassMarker) this.comparisonCenterOfMassMarker.visible = false;
    this.comparisonColliderGroup.updateMatrixWorld(true);
  }

  setObservedRobotGhostVisible(visible: boolean, options: Viewer3DObservedRobotVisibilityOptions = {}): void {
    const nextPoseControlTarget = options.nextPoseControlTarget ?? this.poseControlTarget;
    const visibilityChanged = this.options.showObservedRobotGhost !== visible;
    const focusTargetChanged = this.poseControlTarget !== nextPoseControlTarget;
    if (!visibilityChanged && !focusTargetChanged) return;

    const transitionPresentation =
      visibilityChanged &&
      options.transitionPresentation === true &&
      this.observedRobotGhost !== null &&
      typeof requestAnimationFrame !== 'undefined';
    const presentationStart = transitionPresentation
      ? {
          simulatedX: this.simulatedRobotPresentationRoot.position.x,
          observedX: this.observedRobotGhost!.position.x + this.observedRobotPresentationRoot.position.x,
          simulatedVisible: this.simulatedRobotPresentationRoot.visible,
          observedVisible: this.observedRobotGhost!.visible,
          simulatedOpacity: this.simulatedRobotPresentationRoot.visible
            ? this.readComparisonOpacityFactor(
                this.robotMaterialBaselines,
                this.robotComparisonAppearance.simulated.opacity
              )
            : 0,
          observedOpacity: this.observedRobotGhost!.visible
            ? this.readComparisonOpacityFactor(
                this.observedRobotGhostMaterialBaselines,
                this.robotComparisonAppearance.observed.opacity
              )
            : 0
        }
      : null;
    this.cancelRobotComparisonVisibilityTransition();

    // Capture the active semantic frame before the comparison layout mutates.
    // In centered offset mode both incarnations move when REAL appears or
    // disappears, so resolving this frame after layout would erase the camera
    // delta and leave the viewport focused on an obsolete world position.
    const previousFocusFrame = options.transitionCameraFocus
      ? this.resolveRobotCameraFocusFrame(this.poseControlTarget)
      : null;
    const durationMs = options.durationMs ?? 520;

    if (visibilityChanged) {
      this.options.showObservedRobotGhost = visible;
      this.observedRobotPresentationRoot.position.x = 0;
      // Visibility is part of the comparison projection. Recompute the complete
      // layout so hiding the observed incarnation releases its half of a
      // centered separation and puts the simulated robot back at the origin.
      this.applyRobotComparisonAppearance();
      if (!transitionPresentation) {
        if (!visible) this.observedRobotPresentation.reset('discontinuity');
        if (this.observedRobotGhost) this.observedRobotGhost.visible = visible;
      }
    }

    if (focusTargetChanged) {
      this.setPoseControlTarget(nextPoseControlTarget, {
        durationMs: presentationStart ? durationMs : undefined,
        comparisonVisibilityAppearing: presentationStart ? visible : undefined
      });
    }

    const nextFocusFrame = options.transitionCameraFocus
      ? this.resolveRobotCameraFocusFrame(nextPoseControlTarget)
      : null;
    if (previousFocusFrame && nextFocusFrame) {
      const stagedPresentation = presentationStart !== null;
      const appearing = visible;
      const targetDelayMs =
        stagedPresentation && !appearing ? durationMs * (1 - ROBOT_COMPARISON_VISIBILITY_LAYOUT_SHARE) : 0;
      const targetDurationMs = stagedPresentation
        ? durationMs * ROBOT_COMPARISON_VISIBILITY_LAYOUT_SHARE
        : durationMs;
      this.cameraController.transitionRobotCameraFocusTargetOnly(
        previousFocusFrame,
        nextFocusFrame,
        targetDurationMs,
        targetDelayMs
      );
    }
    if (presentationStart && this.observedRobotGhost) {
      this.startRobotComparisonVisibilityTransition({
        ...presentationStart,
        finalSimulatedX: this.simulatedRobotPresentationRoot.position.x,
        finalSimulatedVisible: this.simulatedRobotPresentationRoot.visible,
        finalObservedVisible: visible,
        durationMs
      });
    }
    this.requestRender();
  }

  projectObservedRobotGhostJointValues(values: Readonly<Record<string, number | null>>): boolean {
    const changed = this.applyObservedRobotGhostJointValues(values);
    if (changed) this.requestRender();
    return changed;
  }

  /**
   * Admits one immutable observed pose into the visual-only smoothing buffer.
   * The upstream frame remains the sole telemetry authority; reconstructed
   * values are applied only to the observed ghost incarnation.
   */
  ingestObservedRobotGhostJointObservation(input: {
    frameId: string;
    connectionId: string;
    observedAtSeconds: number | null;
    jointValues: Readonly<Record<string, number>>;
    receivedAtMs?: number;
  }): boolean {
    const receivedAtMs = input.receivedAtMs ?? performance.now();
    const accepted = this.observedRobotPresentation.ingest({
      sampleId: input.frameId,
      connectionId: input.connectionId,
      sourceObservedAtSeconds: input.observedAtSeconds,
      receivedAtMs,
      jointValues: input.jointValues
    });
    if (!accepted) return false;

    const frame = this.observedRobotPresentation.project(receivedAtMs);
    if (frame) this.applyObservedRobotGhostJointValues(frame.jointValues);
    this.requestRender();
    return true;
  }

  resetObservedRobotGhostJointObservation(): void {
    this.observedRobotPresentation.reset('discontinuity');
  }

  getObservedRobotPresentationStatus(): ObservedRobotPresentationStatus {
    return this.observedRobotPresentation.getStatus();
  }

  private applyObservedRobotGhostJointValues(values: Readonly<Record<string, number | null>>): boolean {
    if (!this.observedRobotGhost) return false;

    const joints = (this.observedRobotGhost as { joints?: Record<string, RobotJointLike> }).joints ?? {};
    let changed = false;

    for (const [target, value] of Object.entries(values)) {
      const joint = joints[target];
      if (!joint || typeof value !== 'number' || !Number.isFinite(value)) continue;
      const currentValue = this.readJointValue(joint);
      if (typeof currentValue === 'number' && Math.abs(currentValue - value) < 0.000001) continue;
      changed = joint.setJointValue(value) !== false || changed;
    }

    if (changed) {
      this.applyObservedRobotGhostGrounding();
      if (this.poseControlTarget === 'observed') {
        this.refreshPoseHandleProjection();
        this.updateViewerDebugLayers({ poseHandles: false });
      }
    }

    return changed;
  }

  private updateObservedRobotGhostPresentation(renderedAtMs: number): {
    changed: boolean;
    active: boolean;
  } {
    if (this.comparisonProfileId || !this.options.showObservedRobotGhost || !this.observedRobotGhost) {
      return { changed: false, active: false };
    }
    const frame = this.observedRobotPresentation.project(renderedAtMs);
    if (!frame) return { changed: false, active: false };
    return {
      changed: this.applyObservedRobotGhostJointValues(frame.jointValues),
      active: frame.active
    };
  }

  getObservedRobotGroundingProjection(): ObservedRobotGroundingProjection {
    return { ...this.observedRobotGrounding };
  }

  getObservedRobotSupportInclinationProjection(): ObservedRobotSupportInclinationProjection {
    return {
      ...this.observedRobotSupportInclination,
      supportNormal: this.observedRobotSupportInclination.supportNormal
        ? { ...this.observedRobotSupportInclination.supportNormal }
        : null,
      correctionQuaternion: { ...this.observedRobotSupportInclination.correctionQuaternion }
    };
  }

  /**
   * Changes only the comparison projection. Simulation state and observed
   * telemetry remain untouched and continue to be owned by their sources.
   */
  setRobotComparisonAppearance(appearance: Viewer3DRobotComparisonAppearance): void {
    this.cancelRobotComparisonVisibilityTransition();
    this.observedRobotPresentationRoot.position.x = 0;
    const nextAppearance: Viewer3DRobotComparisonAppearance = {
      mode: appearance.mode === 'offset' || appearance.mode === 'observed-only' ? appearance.mode : 'overlay',
      centeredSeparation: appearance.centeredSeparation === true,
      offsetMeters: Math.min(1.2, Math.max(0.05, appearance.offsetMeters)),
      observed: {
        opacity: Math.min(1, Math.max(0.05, appearance.observed.opacity)),
        tint: appearance.observed.tint
      },
      simulated: {
        opacity: Math.min(1, Math.max(0.05, appearance.simulated.opacity)),
        tint: appearance.simulated.tint
      }
    };
    const spatialLayoutChanged =
      this.robotComparisonAppearance.mode !== nextAppearance.mode ||
      this.robotComparisonAppearance.centeredSeparation !== nextAppearance.centeredSeparation ||
      Math.abs(this.robotComparisonAppearance.offsetMeters - nextAppearance.offsetMeters) > 0.000001;

    this.robotComparisonAppearance = nextAppearance;
    // Opacity and tint are pure material projections: resetting the support
    // anchor for them would let the feet reacquire a slightly different world
    // point and appear to slide. Only an actual comparison-space move may
    // invalidate that anchor.
    if (spatialLayoutChanged) {
      this.observedRobotTemporalSupportAnchorState = null;
    }
    this.applyRobotComparisonAppearance();
    this.requestRender();
  }

  async setPhysicsEngine(
    physicsEngine: PhysicsEngineType,
    physicsEnabled = physicsEngine !== 'none'
  ): Promise<void> {
    if (this.destroyed) return;
    this.options.physicsEngine = physicsEngine;
    this.options.physicsEnabled = physicsEnabled && physicsEngine !== 'none';
    this.physicsService.setEnabled(this.options.physicsEnabled);
    await this.physicsService.setEngine(physicsEngine);
    if (this.destroyed) return;
    // A replacement backend owns a distinct observation sequence. Do not
    // carry a revision barrier from the previous engine into the new one.
    this.physicsProjectionMinimumStateRevision = null;
    this.lastPhysicsStepAt = 0;
    this.resetTemporalProjection();
    if (!this.syncPhysicsKinematicPoseFromRobotPose({ holdFrames: 3 })) {
      this.syncPhysicsJointTargetsFromRobotPose();
    }
    this.syncPhysicsDebugTransforms();
    this.requestRender();
  }

  setPhysicsEnabled(physicsEnabled: boolean): void {
    if (this.destroyed) return;
    this.options.physicsEnabled = physicsEnabled && this.options.physicsEngine !== 'none';
    this.physicsService.setEnabled(this.options.physicsEnabled);
    this.lastPhysicsStepAt = 0;
    this.resetPhysicsPostureCompensation();
    this.resetTemporalProjection();

    if (this.options.physicsEnabled) {
      this.physicsVisualRootToRobotMatrix = null;
      if (!this.syncPhysicsKinematicPoseFromRobotPose({ holdFrames: PHYSICS_RESET_KINEMATIC_HOLD_FRAMES })) {
        this.syncPhysicsJointTargetsFromRobotPose();
      }
      this.schedulePhysicsResetBaselineCapture();
    } else {
      this.physicsProjectionMinimumStateRevision = null;
      this.physicsKinematicHoldFrames = 0;
      this.physicsKinematicHoldRootPose = null;
      this.physicsAuthoredJointTargets.clear();
    }

    this.syncPhysicsDebugTransforms();
    this.requestRender();
  }

  setPhysicsObservationEnabled(enabled: boolean): void {
    this.options.physicsObservationEnabled = enabled;
  }

  setPhysicsMotorsCoupled(physicsMotorsCoupled: boolean): void {
    if (this.destroyed) return;
    if (this.options.physicsMotorsCoupled === physicsMotorsCoupled) {
      return;
    }

    this.options.physicsMotorsCoupled = physicsMotorsCoupled;
    this.physicsVisualRootToRobotMatrix = null;
    this.resetPhysicsPostureCompensation();

    if (!physicsMotorsCoupled) {
      this.robot?.updateMatrixWorld(true);
      this.physicsService.releaseJointTargets(this.createPhysicsJointTargetsFromRobotPose());
      this.physicsAuthoredJointTargets.clear();
    } else {
      if (!this.syncPhysicsKinematicPoseFromRobotPose({ holdFrames: 3 })) {
        this.syncPhysicsJointTargetsFromRobotPose();
      }
    }

    this.requestRender();
  }

  setTransitionToAnimationStart(enabled: boolean): void {
    this.options.transitionToAnimationStart = enabled;

    if (!enabled) {
      this.playbackTransitionState = null;
    }
  }

  async loadPhysicsSubject(source: PhysicsSubjectSource): Promise<void> {
    if (this.destroyed) return;
    const visualAlignment = resolvePhysicsVisualAlignmentProfile(source.metadata?.visualAlignment);
    const visualBodyObjectNames = resolvePhysicsSourceStringListMap(
      visualAlignment?.bodyVisualObjectNames ?? source.metadata?.bodyVisualObjectNames
    );

    this.physicsVisualAlignmentProfile = visualAlignment;
    this.physicsJointMappings = resolvePhysicsJointMappings(
      visualAlignment?.jointMappings ?? source.metadata?.jointMappings
    );
    this.physicsAuxiliaryJointNames = resolvePhysicsSourceStringSet(
      source.metadata?.auxiliaryJointNames
    );
    this.physicsVisualRootBodyName =
      resolvePhysicsSourceString(visualAlignment?.visualRootBodyName) ??
      resolvePhysicsSourceString(source.metadata?.visualRootBodyName);
    this.physicsVisualBodyObjectNames = visualBodyObjectNames;
    this.physicsVisualRootToRobotMatrix = null;
    this.physicsResetPose = null;
    this.physicsResetRobotTransform = null;
    this.physicsResetBaselineCaptureFrames = 0;
    this.physicsAuthoredJointTargets.clear();
    this.resetPhysicsPostureCompensation();
    await this.physicsService.loadSubject(source);
    if (this.destroyed) return;
    this.resetTemporalProjection();
    const synchronizedKinematicPose = this.syncPhysicsKinematicPoseFromRobotPose({ holdFrames: 3 });
    if (!synchronizedKinematicPose) {
      this.syncPhysicsJointTargetsFromRobotPose();
    }
    // The projectile interaction must never inherit the asynchronous startup
    // boundary. Wait until the worker has accepted the initial pose, then
    // retire the defensive hold frames before the first external impulse.
    await this.physicsService.synchronize();
    if (this.destroyed) return;
    if (synchronizedKinematicPose) {
      this.physicsKinematicHoldFrames = 0;
      this.physicsKinematicHoldRootPose = null;
    }
    this.schedulePhysicsResetBaselineCapture();
    this.syncPhysicsDebugTransforms();
    this.requestRender();
  }

  async resetPhysicsSimulation(): Promise<void> {
    if (this.destroyed) return;
    this.playbackState = null;
    this.playbackTransitionState = null;
    this.playbackCompletionTransitionState = null;
    this.boundaryPosePreviewTransitionState = null;
    this.scrubPreviewState = null;
    this.playbackSyncSignature = '';
    this.physicsVisualRootToRobotMatrix = null;
    this.physicsAuthoredJointTargets.clear();
    this.resetPhysicsPostureCompensation();
    this.comparisonViewerSample = null;
    this.projectComparisonSimulation();
    this.restorePhysicsResetRobotState();
    await this.physicsService.resetSimulation();
    if (this.destroyed) return;
    this.lastPhysicsStepAt = 0;
    this.resetTemporalProjection();
    this.physicsVisualRootToRobotMatrix = null;

    if (this.options.physicsMotorsCoupled) {
      if (!this.syncPhysicsKinematicPoseFromRobotPose({ holdFrames: PHYSICS_RESET_KINEMATIC_HOLD_FRAMES })) {
        this.syncPhysicsJointTargetsFromRobotPose();
      }
    } else {
      this.physicsService.releaseJointTargets(this.createPhysicsJointTargetsFromRobotPose());
    }

    this.schedulePhysicsResetBaselineCapture();
    this.syncPhysicsDebugTransforms();
    this.requestRender();
  }

  getPhysicsSnapshot(): PhysicsServiceSnapshot {
    return this.physicsService.snapshot();
  }

  /** Project an already assembled URDF root; presentation offsets are excluded. */
  readDisplayedRobotRootTransform(
    target: 'simulated' | 'observed',
    frame: { bodyName: string; coordinateFrame: 'mujoco-z-up'; sceneYawRadians: number }
  ): BodyTransform | null {
    const robot = target === 'observed' ? this.observedRobotGhost : this.robot;
    if (!robot) return null;
    // A hidden ghost still supplies its grounded projection to external viewers.
    if (target === 'observed') this.applyObservedRobotGhostGrounding();
    robot.updateMatrix();
    const reference = { bodyName: frame.bodyName, position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      metadata: { visualRoot: true, coordinateFrame: frame.coordinateFrame, sceneYawRadians: frame.sceneYawRadians } } as BodyTransform;
    const canonical = this.createPhysicsCoordinateFrameMatrix(reference).invert().multiply(robot.matrix);
    const position = new Vector3(), rotation = new Quaternion(), scale = new Vector3();
    canonical.decompose(position, rotation, scale);
    return { ...reference, position: { x: position.x, y: position.y, z: position.z },
      rotation: { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w } };
  }

  readDisplayedRobotObservation(timeSeconds?: number): Viewer3DPhysicsObservation | null {
    if (!this.robot) return null;
    const physical = this.readPhysicsObservation();
    const jointAngles = this.captureRuntimeHistoryVisualJointStates();
    const bodies = this.projectedPhysicsBodyTransforms.length ? this.projectedPhysicsBodyTransforms : physical?.bodyTransforms.length ? physical.bodyTransforms : this.physicsService.getBodyTransforms();
    const root = bodies.find(body => body.metadata?.visualRoot === true) ?? bodies.find(body => body.bodyName === this.physicsVisualRootBodyName);
    let rootTransform: BodyTransform | undefined;
    const alignment = root ? this.physicsVisualRootToRobotMatrix ?? this.resolvePhysicsVisualRootToRobotMatrix(this.createPhysicsBodyViewerWorldMatrix(root), bodies) : null;
    if (root && alignment) {
      this.robot.updateMatrix();
      const robotMatrix = this.robot.matrix.clone();
      if (this.robot.parent && this.robot.parent !== this.simulatedRobotPresentationRoot) {
        this.robot.parent.updateMatrixWorld(true);
        robotMatrix.premultiply(this.robot.parent.matrixWorld);
      }
      const canonicalMatrix = this.createPhysicsCoordinateFrameMatrix(root).invert()
        .multiply(robotMatrix).multiply(alignment.clone().invert());
      const position = new Vector3(), rotation = new Quaternion(), scale = new Vector3();
      canonicalMatrix.decompose(position, rotation, scale);
      rootTransform = { ...structuredClone(root), position: { x: position.x, y: position.y, z: position.z }, rotation: { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w } };
    }
    const time = Number.isFinite(timeSeconds) ? timeSeconds! : physical?.simulatedTimeSeconds ?? 0;
    return {
      sampleId: `displayed:${time}:${JSON.stringify(jointAngles)}:${JSON.stringify(rootTransform)}`,
      observedAtMs: performance.now(), simulatedTimeSeconds: time,
      jointAngles, rootTransform, bodyTransforms: structuredClone(bodies), centerOfMass: this.projectedPhysicsCenterOfMass ?? physical?.centerOfMass ?? this.physicsService.getCenterOfMass(), navigation: null,
      projectionStage: this.displayedRecordedPhysicsObservation ? 'simulated' : 'authored'
    };
  }

  readPhysicsObservation(): Viewer3DPhysicsObservation | null {
    if (this.displayedRecordedPhysicsObservation) return structuredClone(this.displayedRecordedPhysicsObservation);
    if (this.playbackState?.animation && this.robot) {
      const jointAngles = this.captureRuntimeHistoryVisualJointStates();
      const time = this.playbackState.currentTime;
      return {
        sampleId: `displayed:${this.playbackState.sourceId ?? 'animation'}:${time}:${JSON.stringify(jointAngles)}`,
        observedAtMs: performance.now(), simulatedTimeSeconds: time,
        projectionStage: 'authored', jointAngles, bodyTransforms: [], centerOfMass: null, navigation: null
      };
    }
    const snapshot = this.physicsService.snapshot();
    const bodies = this.physicsService.getBodyTransforms();
    if (!snapshot.loadedSourceId || !bodies.length) return null;
    const metadata = snapshot.backendStatus?.metadata;
    const time = typeof metadata?.simulatedTime === 'number' ? metadata.simulatedTime : 0;
    return {
      sampleId: `${snapshot.engine}:${snapshot.loadedSourceId}:${metadata?.stepCount ?? 0}:${metadata?.stateRevision ?? 0}`,
      observedAtMs: performance.now(), simulatedTimeSeconds: time,
      jointAngles: this.capturePhysicsVisualJointAngles(),
      bodyTransforms: structuredClone(bodies), centerOfMass: this.physicsService.getCenterOfMass(), navigation: null
    };
  }

  readNavigationPhysicsObservation(): Viewer3DNavigationPhysicsObservation | null {
    const snapshot = this.physicsService.snapshot();
    if (
      !snapshot.enabled ||
      snapshot.engine === 'none' ||
      !snapshot.initialized ||
      !this.physicsVisualRootToRobotMatrix
    )
      return null;
    const metadata = snapshot.backendStatus?.metadata;
    const simulatedTimeSeconds =
      typeof metadata?.simulatedTime === 'number' && Number.isFinite(metadata.simulatedTime)
        ? metadata.simulatedTime
        : 0;
    return resolveViewer3DNavigationPhysicsObservation({
      bodyTransforms: this.physicsService.getBodyTransforms(),
      simulatedTimeSeconds,
      defaultSceneYawRadians: this.resolvePhysicsSceneYawRadians(undefined),
      rootAlignmentMatrix: this.physicsVisualRootToRobotMatrix
    });
  }

  getPerformanceSummary(): Viewer3DPerformanceSummary {
    return this.performanceMonitor.getSummary();
  }

  setTemporalProjectionMode(mode: ViewerTemporalProjectionMode): void {
    if (this.temporalProjection.getMode() === mode) {
      return;
    }

    this.options.temporalProjectionMode = mode;
    this.temporalProjection.setMode(mode);
    if (this.temporalProjectionExperiment.isRecording()) {
      this.temporalProjectionExperiment.recordConditionChange(mode, performance.now());
    }
    this.resetTemporalProjection();
    this.requestRender();
  }

  getTemporalProjectionStatus(): ViewerTemporalProjectionStatus {
    return this.temporalProjection.getStatus();
  }

  getIncarnationHealth(): ViewerIncarnationHealth {
    let contextLost = true;

    try {
      contextLost = this.renderer.getContext().isContextLost();
    } catch {
      // A renderer whose context cannot be inspected is no longer a usable
      // projection incarnation, even if its object reference still exists.
    }

    return resolveViewerIncarnationHealth({
      destroyed: this.destroyed,
      canvasAttached:
        this.renderer.domElement.parentElement === this.container && this.renderer.domElement.isConnected,
      contextLost
    });
  }

  startTemporalProjectionExperiment(
    input: ViewerExperimentStart
  ): Snapshot {
    this.temporalProjectionExperiment.start({
      ...input,
      mode: this.temporalProjection.getMode(),
      projectionConfig: this.temporalProjection.getConfig()
    });
    this.resetStatsCadence(input.startedAtMs);

    if (!this.options.showStats) {
      this.observeMainThreadLongTasks();
    }

    return this.temporalProjectionExperiment.snapshot();
  }

  markTemporalProjectionExperimentPhase(
    phaseId: string,
    observedAtMs: number,
    provenance: ViewerMetadata = {}
  ): boolean {
    return this.temporalProjectionExperiment.markPhase(phaseId, observedAtMs, provenance);
  }

  stopTemporalProjectionExperiment(endedAtMs: number): Artifact {
    this.updateStatsCadence(endedAtMs, true);
    const artifact = this.temporalProjectionExperiment.stop(endedAtMs);

    if (!this.options.showStats) {
      this.longTaskObserver?.disconnect();
      this.longTaskObserver = null;
    }

    return artifact;
  }

  getTemporalProjectionExperimentSnapshot(): Snapshot {
    return this.temporalProjectionExperiment.snapshot();
  }

  releasePhysicsJointTargets(targets?: Record<string, JointTarget>): void {
    if (this.destroyed) return;
    this.physicsService.releaseJointTargets(targets);
    this.physicsAuthoredJointTargets.clear();
    this.resetPhysicsPostureCompensation();
  }

  clearPhysicsJointTargets(): void {
    if (this.destroyed) return;
    this.physicsService.clearJointTargets();
    this.physicsAuthoredJointTargets.clear();
    this.resetPhysicsPostureCompensation();
  }

  setPhysicsRuntimeConfig(config: PhysicsRuntimeConfig): void {
    if (this.destroyed) return;
    this.physicsService.setRuntimeConfig(config);
  }

  setPhysicsResetBaselineCaptureFrames(frameCount: number): void {
    this.physicsResetBaselineCaptureFrameCount = Math.max(0, Math.min(240, Math.round(frameCount)));
  }

  inspectRuntimeHistorySnapshot(snapshot: ViewerHistoryObservation<ViewerHistorySample<ViewerMetadata>>): void {
    if (snapshot.replayState === 'live') {
      // Recording publishes a live snapshot for every captured sample. Treat
      // those notifications as observations, not replay-mode transitions:
      // resetting the posture controller on every sample erases its temporal
      // state and can feed a persistent oscillation into the physics motors.
      return;
    }

    if (!this.runtimeHistoryReplayActive) {
      this.resetPhysicsPostureCompensation();
    }
    // Inspecting history remains read-only. Only an explicit live command
    // such as Play or an admitted projectile impact may branch simulation.
    this.runtimeHistoryProjectionRequiresPhysicsRebase = false;
    this.runtimeHistoryProjectedPhysicsRootPose = null;
    this.runtimeHistoryReplayActive = true;
    const sample = snapshot.selectedSample;

    if (!sample) {
      return;
    }

    const replayTime = snapshot.replayTimeSeconds ?? sample.timeSeconds;
    const signature = `${snapshot.replayState}:${sample.id}:${replayTime.toFixed(4)}`;

    if (signature === this.lastRuntimeHistoryReplaySignature) {
      return;
    }

    this.lastRuntimeHistoryReplaySignature = signature;
    this.applyRuntimeHistorySample(sample);
  }

  projectRuntimeHistorySample(
    sample: ViewerHistorySample<ViewerMetadata>,
    options: { applyCamera?: boolean; deferDuringBoundaryPosePreview?: boolean } = {}
  ): void {
    if (options.deferDuringBoundaryPosePreview && this.boundaryPosePreviewTransitionState) {
      this.deferredBoundaryPreviewRuntimeHistoryProjection = {
        sample,
        applyCamera: options.applyCamera
      };
      return;
    }

    this.deferredBoundaryPreviewRuntimeHistoryProjection = null;
    if (!this.runtimeHistoryReplayActive) {
      this.resetPhysicsPostureCompensation();
    }
    this.runtimeHistoryReplayActive = true;
    this.runtimeHistoryProjectionRequiresPhysicsRebase = true;
    this.runtimeHistoryProjectedPhysicsRootPose = this.resolveRuntimeHistoryPhysicsRootPose(sample);
    this.lastRuntimeHistoryReplaySignature = `projection:${sample.id}:${sample.timeSeconds.toFixed(4)}`;
    this.applyRuntimeHistorySample(sample, { applyCamera: options.applyCamera });
  }

  captureRuntimeHistoryProjectionSample(options: { timeSeconds?: number } = {}): void {
    // A producer needs an exact boundary authority independently from the
    // regular realtime sampling cadence.
    this.recordRuntimeHistorySample(typeof performance === 'undefined' ? Date.now() : performance.now(), {
      force: true,
      timeSeconds: options.timeSeconds
    });
  }

  /**
   * Advances the isolated producer by an explicit simulation slice. This is a
   * bake operation: no RAF, audio clock or visible playback transport can own
   * the temporal cursor while it runs.
   */
  async bakeRuntimeHistoryProjectionFrame(input: {
    currentTimeSeconds: number;
    deltaSeconds: number;
    recordTimeSeconds: number;
    record?: boolean;
    kinematicBoundary?: 'entry' | 'exit' | null;
  }): Promise<boolean> {
    const playback = this.playbackState;

    if (this.destroyed || !playback || playback.clockMode !== 'manual' || !this.isPhysicsActive()) {
      return false;
    }

    const currentTimeSeconds = Math.max(0, Math.min(playback.duration, input.currentTimeSeconds));
    const deltaSeconds = Number.isFinite(input.deltaSeconds) ? Math.max(0, input.deltaSeconds) : 0;
    playback.currentTime = currentTimeSeconds;
    playback.syncedAt = typeof performance === 'undefined' ? Date.now() : performance.now();
    this.physicsPostureCompensationTransitionFrameActive = false;
    this.applyRobotPose(
      playback.animation,
      currentTimeSeconds,
      playback.mutedTrackTargetSet,
      playback.duration
    );

    if (deltaSeconds > 0) {
      this.applyPhysicsPostureCompensation(deltaSeconds);
      let remainingSeconds = deltaSeconds;
      const maximumStepSeconds = 1 / ROBOT_VIEWER_DEFAULT_PHYSICS_STEP_RATE_HZ;

      while (remainingSeconds > Number.EPSILON) {
        const stepSeconds = Math.min(remainingSeconds, maximumStepSeconds);
        await this.physicsService.stepAndWait(stepSeconds);
        remainingSeconds -= stepSeconds;

        if (this.destroyed || this.playbackState !== playback || playback.clockMode !== 'manual') {
          return false;
        }
      }
    } else {
      await this.physicsService.synchronize();
    }

    if (this.destroyed || this.playbackState !== playback || playback.clockMode !== 'manual') {
      return false;
    }

    if (input.kinematicBoundary) {
      // Commit an authored composition boundary once. Reapplying this reset
      // throughout the start blend would clear contact dynamics and restart
      // posture compensation on every frame, making planted feet slide or
      // lift. After the boundary, the solver alone owns support and friction.
      this.syncPhysicsKinematicPoseFromAuthoredTargets({
        holdFrames: 0,
        resetRoot: input.kinematicBoundary === 'entry',
        clearDynamics: true,
        resetCadence: false
      });
      await this.physicsService.synchronize();
    }

    if (this.destroyed || this.playbackState !== playback || playback.clockMode !== 'manual') {
      return false;
    }

    const bodyTransforms = this.physicsService.getBodyTransforms();
    const centerOfMass = this.physicsService.getCenterOfMass();
    this.projectedPhysicsBodyTransforms = bodyTransforms;
    this.projectedPhysicsCenterOfMass = centerOfMass;
    this.physicsProjectionMinimumStateRevision = null;
    const rootPoseChanged = this.syncRobotRootFromPhysicsBody(bodyTransforms);
    const jointPoseChanged = this.syncRobotPoseFromPhysicsJointStates();

    if (rootPoseChanged || jointPoseChanged) {
      this.robot?.updateMatrixWorld(true);
      this.updateViewerDebugLayers();
    }

    if (this.shouldShowAnyPhysicsDebugLayer()) {
      this.syncPhysicsDebugTransforms(bodyTransforms, centerOfMass);
    }

    this.updatePhysicsResetBaselineCapture();
    this.updateTrajectoryCurrentMarkers();
    if (input.record !== false) {
      this.captureRuntimeHistoryProjectionSample({ timeSeconds: input.recordTimeSeconds });
    }
    return true;
  }

  resumeRuntimeHistoryLiveProjection(): void {
    this.displayedRecordedPhysicsObservation = null;
    if (!this.runtimeHistoryReplayActive) {
      return;
    }

    const shouldRebasePhysics = this.runtimeHistoryProjectionRequiresPhysicsRebase;
    const projectedRootPose = this.runtimeHistoryProjectedPhysicsRootPose;
    this.runtimeHistoryReplayActive = false;
    this.runtimeHistoryProjectionRequiresPhysicsRebase = false;
    this.runtimeHistoryProjectedPhysicsRootPose = null;
    this.lastRuntimeHistoryReplaySignature = '';
    this.resetPhysicsPostureCompensation();

    if (shouldRebasePhysics) {
      // Scrub is a reader over recorded simulation. Play is the explicit
      // command that promotes that projection into a new live branch: align
      // the physics backend to the displayed pose and erase stale momentum
      // before simulation advances again.
      this.syncPhysicsKinematicPoseFromRobotPose({
        holdFrames: PHYSICS_RESET_KINEMATIC_HOLD_FRAMES,
        resetRoot: projectedRootPose === null,
        rootPose: projectedRootPose,
        clearDynamics: true,
        resetCadence: true
      });
    }
  }

  resumeRuntimeHistoryBufferedProjection(): void {
    if (!this.runtimeHistoryReplayActive) {
      return;
    }

    // Buffered playback remains a reader of the recorded simulation. Leaving
    // an inspected/scrubbed sample must not promote it into a new live physics
    // branch or re-inject its already simulated pose into the backend.
    this.runtimeHistoryReplayActive = false;
    this.runtimeHistoryProjectionRequiresPhysicsRebase = false;
    this.runtimeHistoryProjectedPhysicsRootPose = null;
    this.lastRuntimeHistoryReplaySignature = '';
    this.resetPhysicsPostureCompensation();
  }

  setTrajectoriesVisible(showTrajectories: boolean): void {
    if (this.options.showTrajectories === showTrajectories) {
      return;
    }

    this.options.showTrajectories = showTrajectories;

    if (showTrajectories) {
      this.rebuildTrajectoryPreview();
    } else {
      this.updateTrajectoryGroupVisibility();
    }

    this.requestRender();
  }

  setHandTrajectoriesOnly(showHandTrajectoriesOnly: boolean): void {
    if (this.options.showHandTrajectoriesOnly === showHandTrajectoriesOnly) {
      return;
    }

    this.options.showHandTrajectoriesOnly = showHandTrajectoriesOnly;
    this.trajectorySignature = '';
    this.trajectoryAnchors.clear();

    if (showHandTrajectoriesOnly && !this.options.showTrajectories) {
      this.options.showTrajectories = true;
    }

    if (this.options.showTrajectories) {
      this.rebuildTrajectoryPreview();
    }

    this.requestRender();
  }

  setInteractionMode(interactionMode: Viewer3DInteractionMode): void {
    if (this.options.interactionMode === interactionMode) {
      return;
    }

    const leavingNavigation = this.options.interactionMode === 'navigate' && interactionMode !== 'navigate';
    if (leavingNavigation) {
      this.cancelNavigationSimulation();
    }
    if (this.options.interactionMode === 'projectile' && interactionMode !== 'projectile') {
      this.cancelProjectileInteraction();
    }
    this.finishPoseHandleDrag();
    this.cancelPoseHandleTargetTransition();
    this.options.interactionMode = interactionMode;
    if (this.navigationPreviewGroup) {
      this.navigationPreviewGroup.visible =
        interactionMode === 'navigate' && this.navigationPreviewGroup.children.length > 0;
    }
    if (interactionMode === 'projectile') {
      this.ensureProjectileInteractionGroup();
      this.refreshProjectileAim();
      if (!this.projectilePointerInside) this.beginProjectileIdleTransition();
    } else if (this.projectileInteractionGroup) {
      this.projectileInteractionGroup.visible = false;
    }
    this.controls.enabled = this.shouldEnableCameraControls();
    this.setCameraControlsMotionEnabled(this.shouldEnableCameraControls());
    this.clearPoseHandleFocus();
    this.updatePoseHandles();
    this.renderer.domElement.style.cursor =
      interactionMode === 'navigate' || interactionMode === 'projectile' ? 'crosshair' : '';
    this.requestRender();
  }

  setNavigationPreview(
    input: {
      destination: RobotViewerVector;
      points: readonly RobotViewerVector[];
      moveTo: Viewer3DNavigationMoveToParameters;
    } | null
  ): void {
    const group = this.ensureNavigationPreviewGroup();
    this.clearNavigationPreviewObjects();
    if (!input) {
      group.visible = false;
      this.navigationMarkerAnimationStartedAt = null;
      this.requestRender();
      return;
    }

    const marker = new Mesh(
      new CircleGeometry(0.075, 48),
      new MeshBasicMaterial({
        color: '#22d3ee',
        transparent: true,
        opacity: 0.88,
        depthTest: true,
        depthWrite: false
      })
    );
    marker.name = 'viewer-navigation-destination-marker';
    marker.rotation.x = -Math.PI / 2;
    marker.position.set(input.destination.x, 0.003, input.destination.z);
    marker.scale.setScalar(0.05);
    marker.renderOrder = 4;
    group.add(marker);
    this.navigationMarker = marker;

    const origin = new Vector3(0, 0.008, 0);
    const forwardCorner = new Vector3(0, 0.008, input.moveTo.forwardDistanceM);
    const destinationPoint = new Vector3(input.moveTo.leftDistanceM, 0.008, input.moveTo.forwardDistanceM);
    this.addNavigationGizmoSegment(group, origin, forwardCorner, '#f59e0b');
    this.addNavigationGizmoSegment(group, forwardCorner, destinationPoint, '#38bdf8');
    this.addNavigationGizmoLabel(
      group,
      `F ${formatNavigationDistance(input.moveTo.forwardDistanceM)}`,
      origin.clone().lerp(forwardCorner, 0.5),
      '#f59e0b'
    );
    this.addNavigationGizmoLabel(
      group,
      `L ${formatNavigationDistance(input.moveTo.leftDistanceM)}`,
      forwardCorner.clone().lerp(destinationPoint, 0.5),
      '#38bdf8'
    );
    this.addNavigationOrientationGizmo(group, destinationPoint, input.moveTo.leftAngularDistanceRad);

    const points = input.points.map((point) => new Vector3(point.x, 0.005, point.z));
    if (points.length >= 2) {
      const path = new Line(
        new BufferGeometry().setFromPoints(points),
        new LineBasicMaterial({
          color: '#22d3ee',
          transparent: true,
          opacity: 0.72,
          depthTest: true,
          depthWrite: false
        })
      );
      path.name = 'viewer-navigation-local-preview-path';
      path.renderOrder = 3;
      group.add(path);
      this.navigationPath = path;
    }
    group.visible = this.options.interactionMode === 'navigate';
    this.navigationMarkerAnimationStartedAt = performance.now();
    this.requestRender();
  }

  playNavigationSimulation(
    points: readonly RobotViewerVector[],
    leftAngularDistanceRad = 0
  ): Promise<'completed' | 'cancelled' | 'unavailable'> {
    this.cancelNavigationSimulation();
    if (
      this.options.interactionMode !== 'navigate' ||
      points.length < 2 ||
      points.some((point) => !isFiniteVector(point))
    ) {
      return Promise.resolve('unavailable');
    }
    const group = this.ensureNavigationPreviewGroup();
    const simulationPoints = points.map((point) => new Vector3(point.x, 0.012, point.z));
    const distance = simulationPoints
      .slice(1)
      .reduce((total, point, index) => total + point.distanceTo(simulationPoints[index] ?? point), 0);
    const cursor = new Mesh(
      new CircleGeometry(0.045, 32),
      new MeshBasicMaterial({
        color: '#67e8f9',
        transparent: true,
        opacity: 0.96,
        depthTest: true,
        depthWrite: false
      })
    );
    cursor.name = 'viewer-navigation-local-simulation-cursor';
    cursor.rotation.x = -Math.PI / 2;
    cursor.position.copy(simulationPoints[0]!);
    cursor.renderOrder = 5;
    group.add(cursor);
    group.visible = true;
    this.navigationSimulationCursor = cursor;
    this.navigationSimulationPoints = simulationPoints;
    this.navigationSimulationDurationMs = MathUtils.clamp((distance / 0.35) * 1_000, 700, 5_000);
    this.navigationSimulationTargetYawRad = normalizeNavigationRadians(leftAngularDistanceRad);
    this.navigationSimulationPhysicsBaseline = this.captureNavigationSimulationPhysicsBaseline(
      simulationPoints[0]!
    );
    this.navigationSimulationStartedAt = performance.now();
    this.options.onNavigationSimulationObservation({
      forwardDistanceM: simulationPoints[0]?.z ?? 0,
      leftDistanceM: simulationPoints[0]?.x ?? 0,
      leftAngularDistanceRad: 0,
      provenance: 'kinematic-preview',
      progress: 0,
      completed: false
    });
    this.requestRender();
    return new Promise((resolve) => {
      this.navigationSimulationResolve = resolve;
    });
  }

  cancelNavigationSimulation(): void {
    const wasRunning = this.navigationSimulationStartedAt !== null;
    this.navigationSimulationStartedAt = null;
    this.navigationSimulationDurationMs = 0;
    this.navigationSimulationTargetYawRad = 0;
    this.navigationSimulationPoints = [];
    this.navigationSimulationPhysicsBaseline = null;
    if (this.navigationSimulationCursor) {
      this.navigationSimulationCursor.removeFromParent();
      this.disposeObject3D(this.navigationSimulationCursor);
      this.navigationSimulationCursor = null;
    }
    const resolve = this.navigationSimulationResolve;
    this.navigationSimulationResolve = null;
    if (wasRunning) resolve?.('cancelled');
    this.requestRender();
  }

  setExternalHoveredJointTargets(jointTargets: readonly string[]): void {
    if (!this.selectionController.setExternalHoveredJointTargets(jointTargets)) {
      return;
    }

    if (this.poseHandleDragState) {
      return;
    }

    this.updatePoseHandleAppearance();
    this.requestRender();
  }

  setPoseHandlesVisible(showPoseHandles: boolean): void {
    if (this.options.showPoseHandles === showPoseHandles) {
      return;
    }

    this.options.showPoseHandles = showPoseHandles;
    this.cancelPoseHandleTargetTransition();

    if (this.shouldShowInteractionHandles() && showPoseHandles) {
      this.updatePoseHandles();
    } else {
      this.updatePoseHandleVisibility();
    }

    this.requestRender();
  }

  setPoseHandleOcclusionEnabled(enabled: boolean): void {
    if (this.options.poseHandleOcclusion === enabled) return;
    this.options.poseHandleOcclusion = enabled;
    this.updatePoseHandleScreenScale();
    this.requestRender();
  }

  /**
   * Chooses the incarnation used to place pose controls. The observed target
   * remains telemetry-only; selecting it never mutates its joint values.
   */
  setPoseControlTarget(
    target: Viewer3DPoseControlTarget,
    options: {
      transitionCameraFocus?: boolean;
      durationMs?: number;
      comparisonVisibilityAppearing?: boolean;
    } = {}
  ): void {
    if (this.poseControlTarget === target) return;
    this.cancelPoseHandleTargetTransition();
    const previousFocusFrame = options.transitionCameraFocus
      ? this.resolveRobotCameraFocusFrame(this.poseControlTarget)
      : null;
    const transitionPoseHandles =
      this.poseHandleGroup?.visible === true &&
      this.poseHandleGroup.children.length > 0 &&
      this.shouldShowInteractionHandles() &&
      this.options.showPoseHandles;
    this.finishPoseHandleDrag();
    this.poseControlTarget = target;
    this.selectionController.clearFocus();
    this.poseHandleLocalAnchorOffsets.clear();
    if (transitionPoseHandles) {
      this.startPoseHandleTargetTransition(options.durationMs, options.comparisonVisibilityAppearing);
    } else {
      this.updatePoseHandles();
    }
    if (this.options.showContactPoints) this.updateContactPoints();
    if (this.options.showEyeRingDebug || this.options.showEyeRingMire) this.updateEyeRingDebug();
    if (this.options.showBalanceDebug) this.updateBalanceDebug();
    this.applyNavigationPreviewPresentationTransform();
    if (this.options.interactionMode === 'projectile') this.refreshProjectileAim();
    this.updatePhysicsDebugVisibility();
    const nextFocusFrame = options.transitionCameraFocus ? this.resolveRobotCameraFocusFrame(target) : null;
    if (previousFocusFrame && nextFocusFrame) {
      this.cameraController.transitionRobotCameraFocus(
        previousFocusFrame,
        nextFocusFrame,
        options.durationMs ?? 520
      );
    }
    this.requestRender();
  }

  /** Emits desired targets from observed-anchored handles without mutating telemetry. */
  setObservedPoseLiveControlEnabled(enabled: boolean): void {
    if (this.observedPoseLiveControlEnabled === enabled) return;
    this.finishPoseHandleDrag();
    this.observedPoseLiveControlEnabled = enabled;
    this.updatePoseHandleAppearance();
    this.requestRender();
  }

  setContactPointsVisible(showContactPoints: boolean): void {
    if (this.options.showContactPoints === showContactPoints) {
      return;
    }

    this.options.showContactPoints = showContactPoints;

    if (showContactPoints) {
      this.updateContactPoints();
    } else {
      this.updateContactPointVisibility();
    }

    this.requestRender();
  }

  setPhysicsDebugVisible(showPhysicsDebug: boolean): void {
    if (this.options.showPhysicsDebug === showPhysicsDebug) {
      return;
    }

    this.options.showPhysicsDebug = showPhysicsDebug;

    if (showPhysicsDebug || this.shouldShowAnyPhysicsDebugLayer()) {
      this.syncPhysicsDebugTransforms();
    } else {
      this.updatePhysicsDebugVisibility();
    }

    this.requestRender();
  }

  setPhysicsCollidersVisible(showPhysicsColliders: boolean): void {
    if (this.options.showPhysicsColliders === showPhysicsColliders) {
      return;
    }

    this.options.showPhysicsColliders = showPhysicsColliders;

    if (showPhysicsColliders || this.shouldShowAnyPhysicsDebugLayer()) {
      this.syncPhysicsDebugTransforms();
    } else {
      this.updatePhysicsDebugVisibility();
    }

    this.requestRender();
  }

  setPhysicsCenterOfMassVisible(showPhysicsCenterOfMass: boolean): void {
    if (this.options.showPhysicsCenterOfMass === showPhysicsCenterOfMass) {
      return;
    }

    this.options.showPhysicsCenterOfMass = showPhysicsCenterOfMass;

    if (showPhysicsCenterOfMass || this.shouldShowAnyPhysicsDebugLayer()) {
      this.syncPhysicsDebugTransforms();
    } else {
      this.updatePhysicsDebugVisibility();
    }

    this.requestRender();
  }

  setPhysicsGravityVisible(showPhysicsGravity: boolean): void {
    if (this.options.showPhysicsGravity === showPhysicsGravity) {
      return;
    }

    this.options.showPhysicsGravity = showPhysicsGravity;

    if (showPhysicsGravity || this.shouldShowAnyPhysicsDebugLayer()) {
      this.syncPhysicsDebugTransforms();
    } else {
      this.updatePhysicsDebugVisibility();
    }

    this.requestRender();
  }

  setEyeRingDebugVisible(showEyeRingDebug: boolean): void {
    if (this.options.showEyeRingDebug === showEyeRingDebug) {
      return;
    }

    this.options.showEyeRingDebug = showEyeRingDebug;

    if (showEyeRingDebug || this.options.showEyeRingMire) {
      this.updateEyeRingDebug();
    } else {
      this.updateEyeRingDebugVisibility();
    }

    this.requestRender();
  }

  setEyeRingMireVisible(showEyeRingMire: boolean): void {
    if (this.options.showEyeRingMire === showEyeRingMire) {
      return;
    }

    this.options.showEyeRingMire = showEyeRingMire;

    if (showEyeRingMire || this.options.showEyeRingDebug) {
      this.updateEyeRingDebug();
    } else {
      this.updateEyeRingDebugVisibility();
    }

    this.requestRender();
  }

  setEyeRingCalibration(eyeRingCalibration: Partial<Viewer3DEyeRingCalibration>): void {
    this.options.eyeRingCalibration = eyeRingCalibration;

    if (this.options.showEyeRingDebug || this.options.showEyeRingMire) {
      this.updateEyeRingDebug();
    }

    this.requestRender();
  }

  setBalanceDebugVisible(showBalanceDebug: boolean): void {
    if (this.options.showBalanceDebug === showBalanceDebug) {
      return;
    }

    this.options.showBalanceDebug = showBalanceDebug;

    if (showBalanceDebug) {
      this.updateBalanceDebug();
    } else {
      this.clearBalanceDebug();
    }

    this.requestRender();
  }

  setTrajectoryPreview(animation: RobotMotionAnimation | null): void {
    if (this.trajectoryAnimation === animation) {
      this.updateTrajectoryGroupVisibility();
      return;
    }

    this.trajectoryAnimation = animation;
    this.trajectorySignature = '';

    if (this.options.showTrajectories) {
      this.rebuildTrajectoryPreview();
    } else {
      this.clearTrajectoryPreview();
    }
  }

  setRobot(robot: Object3D): void {
    if (this.destroyed) return;
    if (this.robot) {
      this.robot.removeFromParent();
      this.disposeObject3D(this.robot);
    }

    this.robot = robot;
    this.robotMaterialBaselines.clear();
    this.captureMaterialBaselines(robot, this.robotMaterialBaselines);
    this.resetTemporalProjection();
    this.physicsVisualRootToRobotMatrix = null;
    this.physicsProjectionMinimumStateRevision = null;
    this.physicsResetPose = null;
    this.physicsResetRobotTransform = null;
    this.physicsResetBaselineCaptureFrames = 0;
    this.physicsAuthoredJointTargets.clear();
    this.resetPhysicsPostureCompensation();
    this.resetPoseEditState();
    this.lastAnimatedJointTargets.clear();
    this.nextAnimatedJointTargets.clear();
    this.transientDesiredProjectionValues.clear();
    this.transientDesiredProjectionBaseline.clear();
    this.playbackCompletionTransitionState = null;
    this.boundaryPosePreviewTransitionState = null;
    this.trajectoryAnchors.clear();
    this.poseHandleLocalAnchorOffsets.clear();
    this.trajectorySignature = '';
    if (!this.simulatedRobotPresentationRoot.parent) {
      this.simulatedRobotPresentationRoot.name = 'simulated-robot-comparison-presentation';
      this.scene.add(this.simulatedRobotPresentationRoot);
    }
    this.simulatedRobotPresentationRoot.position.x = 0;
    this.simulatedRobotPresentationRoot.position.y = 0;
    this.simulatedRobotInitializationOffsetStartedAt = null;
    this.simulatedRobotInitializationOffsetFromY = 0;
    this.simulatedRobotPresentationRoot.visible = this.robotComparisonAppearance.mode !== 'observed-only';
    this.simulatedRobotPresentationRoot.add(robot);
    this.groundSimulatedRobotOnSupportFloor(robot);
    // The grounded transform is the authored visual baseline. Capturing it
    // earlier would preserve an asset-space hover and calibrate physics to it.
    this.defaultRobotTransform = this.captureRobotTransform(robot);
    this.defaultPose = this.captureJointPose();
    robot.visible = this.options.showRobot;
    this.updateVisualGroundShadowCasters();
    this.syncRobotPoseAfterRobotLoad();
    if (this.cameraPoseLocked) {
      this.setCameraPose(this.options.cameraPosition, this.options.cameraTarget);
      this.controls.update();
    } else {
      this.frameRobotToView();
    }
    this.applyRobotComparisonAppearance();

    if (this.options.showTrajectories && this.trajectoryAnimation) {
      this.rebuildTrajectoryPreview();
    }

    if (this.shouldShowInteractionHandles() && this.options.showPoseHandles) {
      this.updatePoseHandles();
    }

    this.updateViewerDebugLayers();
    if (this.options.interactionMode === 'projectile') this.refreshProjectileAim();

    this.requestRender();
  }

  getRobot(): Object3D | null {
    return this.robot;
  }

  private syncRobotPoseAfterRobotLoad(): void {
    let poseChanged = false;
    let physicsPoseReset = false;

    if (this.scrubPreviewState?.active) {
      poseChanged = this.applyRobotPose(
        this.scrubPreviewState.animation,
        this.scrubPreviewState.currentTime,
        this.scrubPreviewState.mutedTrackTargetSet,
        this.scrubPreviewState.duration
      );
      physicsPoseReset = this.alignUnbufferedPlaybackPoseToSupportFloor();
    } else if (this.playbackState) {
      poseChanged = this.applyRobotPose(
        this.playbackState.animation,
        this.playbackState.currentTime,
        this.playbackState.mutedTrackTargetSet,
        this.playbackState.duration
      );
      physicsPoseReset = this.alignUnbufferedPlaybackPoseToSupportFloor();
    } else if (this.options.physicsMotorsCoupled) {
      physicsPoseReset = this.syncPhysicsKinematicPoseFromRobotPose({
        holdFrames: 3,
        resetRoot: true,
        clearDynamics: true
      });
      if (!physicsPoseReset) {
        this.syncPhysicsJointTargetsFromRobotPose();
      }
    } else {
      this.physicsService.releaseJointTargets(this.createPhysicsJointTargetsFromRobotPose());
    }

    // A kinematic reset is asynchronous for worker backends. Do not project
    // the previous body's transform back onto the newly grounded robot during
    // the same turn; the fresh body observation will arrive on a later frame.
    if (this.isPhysicsActive() && !physicsPoseReset) {
      const bodyTransforms = this.physicsService.getBodyTransforms();
      poseChanged = this.syncRobotRootFromPhysicsBody(bodyTransforms) || poseChanged;
      poseChanged = this.syncRobotPoseFromPhysicsJointStates() || poseChanged;
    }

    if (poseChanged) {
      this.robot?.updateMatrixWorld(true);
    }
  }

  markProfilerSignal(label: string): void {
    if (!this.options.showStats) {
      return;
    }

    const normalizedLabel = label.trim().slice(0, 12);

    if (!normalizedLabel) {
      return;
    }

    this.performanceMonitor.markSignal(normalizedLabel);
  }

  applyPoseEdit(): void {
    if (this.destroyed) return;
    if (!this.dirtyPose) {
      return;
    }

    const appliedJointIds = [...this.dirtyPoseJointIds];
    const appliedJointValues = this.captureJointPoseForTargets(appliedJointIds);
    this.poseEditBaseline = this.captureJointPose();
    this.dirtyPose = false;
    this.dirtyPoseJointIds.clear();
    this.dispatchPoseEditChange('apply', appliedJointIds, appliedJointValues);
    this.requestRender();
  }

  revertPoseEdit(): void {
    if (this.destroyed) return;
    if (!this.dirtyPose || !this.poseEditBaseline) {
      return;
    }

    const revertedJointIds = [...this.dirtyPoseJointIds];
    const revertedJointValues = this.captureJointPoseForTargets(revertedJointIds);
    this.restoreJointPose(this.poseEditBaseline);
    this.robot?.updateMatrixWorld(true);
    this.updateViewerDebugLayers();
    this.updatePoseHandles();
    this.dirtyPose = false;
    this.dirtyPoseJointIds.clear();
    this.dispatchPoseEditChange('revert', revertedJointIds, revertedJointValues);
    this.requestRender();
  }

  applyAnimationFrame(
    animation: RobotMotionAnimation | null,
    time: number,
    mutedTrackTargets: readonly string[] = []
  ): void {
    this.scrubPreviewState = null;
    this.playbackState = null;
    this.playbackCompletionTransitionState = null;
    this.boundaryPosePreviewTransitionState = null;
    this.playbackSyncSignature = '';
    this.setTrajectoryPreview(animation);
    this.applyRobotPose(animation, time, mutedTrackTargets);
    this.updateTrajectoryCurrentMarkers();
    this.requestRender();
  }

  /**
   * Projects temporary desired joint values directly on the visible robot.
   * This is a read-only authoring projection: it does not mutate the authored
   * animation, advance physics, or promote the displayed frame into runtime.
   */
  projectDesiredJointValues(values: Readonly<Record<string, number | null>>): boolean {
    if (!this.robot) {
      return false;
    }

    const joints = this.getRobotJoints();
    let poseChanged = false;

    for (const [target, value] of Object.entries(values)) {
      const joint = joints[target];

      if (!joint || typeof value !== 'number' || !Number.isFinite(value)) {
        continue;
      }

      poseChanged = this.applyDesiredProjectionJointValue(joint, value) || poseChanged;
    }

    if (poseChanged) {
      this.robot.updateMatrixWorld(true);
      this.updateViewerDebugLayers();
      this.updatePoseHandles();
      this.updateTrajectoryCurrentMarkers();
      this.requestRender();
    }

    return poseChanged;
  }

  /**
   * Projects an owner-scoped desired pose without authoring, physics or runtime effects.
   * The baseline is retained so removing one projection restores the visual pose that
   * existed before that owner became active.
   */
  setTransientDesiredJointProjection(
    ownerId: string,
    values: Readonly<Record<string, number | null>>
  ): boolean {
    const normalizedOwnerId = ownerId.trim();
    if (!normalizedOwnerId || !this.robot) return false;
    const joints = this.getRobotJoints();
    const accepted: Record<string, number> = {};
    for (const [target, value] of Object.entries(values)) {
      const joint = joints[target];
      if (!joint || typeof value !== 'number' || !Number.isFinite(value)) continue;
      if (!this.transientDesiredProjectionBaseline.has(target)) {
        const baseline = this.readJointValue(joint);
        if (typeof baseline === 'number' && Number.isFinite(baseline)) {
          this.transientDesiredProjectionBaseline.set(target, baseline);
        }
      }
      accepted[target] = value;
    }
    this.transientDesiredProjectionValues.set(normalizedOwnerId, accepted);
    return this.projectDesiredJointValues(accepted);
  }

  clearTransientDesiredJointProjection(ownerId: string): boolean {
    const normalizedOwnerId = ownerId.trim();
    const removed = this.transientDesiredProjectionValues.get(normalizedOwnerId);
    if (!removed || !this.robot) return false;
    this.transientDesiredProjectionValues.delete(normalizedOwnerId);
    const remainingLayers = [...this.transientDesiredProjectionValues.values()];
    const restore: Record<string, number> = {};
    for (const target of Object.keys(removed)) {
      let replacement: number | undefined;
      for (let index = remainingLayers.length - 1; index >= 0; index -= 1) {
        const candidate = remainingLayers[index]?.[target];
        if (typeof candidate === 'number') {
          replacement = candidate;
          break;
        }
      }
      replacement ??= this.transientDesiredProjectionBaseline.get(target);
      if (typeof replacement === 'number') restore[target] = replacement;
      if (!remainingLayers.some((layer) => typeof layer[target] === 'number')) {
        this.transientDesiredProjectionBaseline.delete(target);
      }
    }
    return this.projectDesiredJointValues(restore);
  }

  syncScrubPreview(
    animation: RobotMotionAnimation | null,
    time: number,
    mutedTrackTargets: readonly string[] = [],
    active = true
  ): void {
    this.playbackState = null;
    this.playbackCompletionTransitionState = null;
    this.boundaryPosePreviewTransitionState = null;
    this.playbackSyncSignature = '';

    if (!active) {
      this.scrubPreviewState = null;
      this.lastScrubPhysicsSyncAt = Number.NEGATIVE_INFINITY;
      this.startProfilerTimerProbe();
      this.setTrajectoryPreview(animation);
      this.applyRobotPose(animation, time, mutedTrackTargets);
      this.syncPhysicsKinematicPoseFromRobotPose({ holdFrames: 3 });
      this.updateTrajectoryCurrentMarkers();
      this.requestRender();
      return;
    }

    this.stopProfilerTimerProbe();

    const currentState = this.scrubPreviewState;
    const mutedTrackTargetSet = this.createMutedTrackTargetSet(mutedTrackTargets);
    const mutedTrackSignature = this.createMutedTrackTargetSignature(mutedTrackTargetSet);
    const duration =
      currentState?.animation === animation
        ? currentState.duration
        : animation
          ? getRobotMotionAnimationDuration(animation)
          : 0;
    const clampedTime = Math.max(0, Math.min(time, duration));

    if (
      currentState &&
      currentState.animation === animation &&
      currentState.mutedTrackSignature === mutedTrackSignature
    ) {
      currentState.targetTime = clampedTime;
      currentState.active = true;
      currentState.needsPoseApplication = true;
      currentState.needsPhysicsSync = true;
      this.requestRender();
      return;
    }

    this.scrubPreviewState = {
      animation,
      duration,
      currentTime: clampedTime,
      targetTime: clampedTime,
      mutedTrackTargets,
      mutedTrackTargetSet,
      mutedTrackSignature,
      active: true,
      needsPoseApplication: true,
      needsPhysicsSync: true
    };
    this.lastScrubPhysicsSyncAt = Number.NEGATIVE_INFINITY;
    this.setTrajectoryPreview(animation);
    this.requestRender();
  }

  syncAnimationPlayback(animation: RobotMotionAnimation | null, playback: Viewer3DPlaybackState): void {
    if (this.runtimeHistoryReplayActive) {
      return;
    }

    this.scrubPreviewState = null;
    this.setTrajectoryPreview(animation);
    const isPlaying = playback.isPlaying ?? false;
    const clockMode = playback.clockMode ?? 'realtime';
    const physicalEntryMode: Viewer3DPhysicalEntryMode =
      playback.physicalEntryMode === 'stabilized-continuation' ? 'stabilized-continuation' : 'grounded-reset';

    if (isPlaying) {
      this.boundaryPosePreviewTransitionState = null;
    }
    const playbackRate = playback.playbackRate ?? 1;
    const loopPlayback = playback.loopPlayback ?? false;
    const workRange = playback.workRange
      ? {
          start: playback.workRange.start,
          end: playback.workRange.end
        }
      : null;
    const mutedTrackTargets = playback.mutedTrackTargets ?? [];
    const completionBehavior = playback.completionBehavior ?? 'hold';
    const completionReached = playback.completionReached ?? false;
    const completionTransitionDurationMs = Math.max(
      1,
      playback.completionTransitionDurationMs ?? ROBOT_VIEWER_PLAYBACK_COMPLETION_BLEND_MS
    );
    const startTransitionMinimumDurationSeconds = Math.max(
      0,
      playback.startTransitionMinimumDurationSeconds ?? 0
    );
    const entryPose = playback.entryPose ?? null;
    const endTransitionMinimumDurationSeconds = Math.max(
      0,
      playback.endTransitionMinimumDurationSeconds ?? 0
    );
    const exitPose = playback.exitPose ?? null;
    const completionTargetPose = playback.completionTargetPose ?? null;
    const syncSignature = this.getPlaybackSyncSignature({
      sourceId: playback.sourceId ?? null,
      subjectId: playback.subjectId ?? null,
      durationSeconds: playback.durationSeconds ?? null,
      clockMode,
      physicalEntryMode,
      isPlaying,
      playbackRate,
      loopPlayback,
      workRange,
      mutedTrackTargets,
      completionBehavior,
      completionReached,
      completionTransitionDurationMs,
      startTransitionMinimumDurationSeconds,
      entryPose,
      endTransitionMinimumDurationSeconds,
      exitPose,
      completionTargetPose
    });

    if (
      this.options.autonomousPlayback &&
      isPlaying &&
      this.playbackState?.isPlaying &&
      this.playbackState.animation === animation &&
      this.playbackSyncSignature === syncSignature
    ) {
      return;
    }

    const nextPlaybackState: Viewer3DResolvedPlaybackState = {
      animation,
      sourceId: playback.sourceId ?? null,
      subjectId: playback.subjectId ?? null,
      duration: animation ? resolveRobotMotionPlaybackDuration(animation, playback.durationSeconds) : 0,
      currentTime: Math.max(0, playback.currentTime),
      resolveAuthoritativeCurrentTime: playback.resolveAuthoritativeCurrentTime ?? null,
      resolveTemporalProjectionSample: playback.resolveTemporalProjectionSample ?? null,
      clockMode,
      physicalEntryMode,
      isPlaying,
      playbackRate,
      loopPlayback,
      workRange,
      mutedTrackTargets,
      mutedTrackTargetSet: this.createMutedTrackTargetSet(mutedTrackTargets),
      completionBehavior,
      completionReached,
      completionTransitionDurationMs,
      startTransitionMinimumDurationSeconds,
      entryPose,
      endTransitionMinimumDurationSeconds,
      exitPose,
      completionTargetPose,
      syncedAt: typeof performance === 'undefined' ? Date.now() : performance.now()
    };

    this.playbackState = nextPlaybackState;
    this.playbackSyncSignature = syncSignature;

    if (nextPlaybackState.isPlaying) {
      this.playbackCompletionTransitionState = null;
      const temporalProjectionSample =
        nextPlaybackState.resolveTemporalProjectionSample?.(nextPlaybackState.currentTime) ?? null;
      if (temporalProjectionSample) {
        this.applyRuntimeHistorySample(temporalProjectionSample, {
          preservePlaybackState: true,
          applyCamera: false
        });
      } else {
        // Materialize t0 before the first RAF. For the isolated producer this
        // captures the configured entry pose as the initial condition of the
        // simulation instead of beginning at an already advanced first key.
        this.applyRobotPose(
          animation,
          nextPlaybackState.currentTime,
          nextPlaybackState.mutedTrackTargetSet,
          nextPlaybackState.duration
        );
        // An unbuffered playback pose is an initial condition even when the
        // composition does not declare a dedicated entry pose. Ground the
        // rendered incarnation immediately and align the physics qpos before
        // the first dynamic step, otherwise gravity starts from the previous
        // root height and the robot visibly drops (or falls) at Play.
        if (nextPlaybackState.physicalEntryMode === 'grounded-reset') {
          this.alignUnbufferedPlaybackPoseToSupportFloor();
        }
      }
      this.updateTrajectoryCurrentMarkers();
      if (nextPlaybackState.clockMode === 'realtime') {
        this.scheduleLoop();
      }
    } else {
      const continuingCompletionTransition =
        shouldStartViewerPlaybackCompletionTransition({
          isPlaying,
          completionReached,
          completionBehavior
        }) && this.playbackCompletionTransitionState?.animation === animation;

      if (continuingCompletionTransition) {
        this.scheduleLoop();
        return;
      }

      this.playbackCompletionTransitionState = null;
      const temporalProjectionSample =
        nextPlaybackState.resolveTemporalProjectionSample?.(nextPlaybackState.currentTime) ?? null;
      if (temporalProjectionSample) {
        this.applyRuntimeHistorySample(temporalProjectionSample, {
          preservePlaybackState: true,
          applyCamera: false
        });
      } else {
        this.applyRobotPose(
          animation,
          nextPlaybackState.currentTime,
          nextPlaybackState.mutedTrackTargetSet,
          nextPlaybackState.duration
        );
        if (nextPlaybackState.physicalEntryMode === 'grounded-reset') {
          this.alignUnbufferedPlaybackPoseToSupportFloor();
        }
      }
      this.updateTrajectoryCurrentMarkers();
      if (
        shouldStartViewerPlaybackCompletionTransition({
          isPlaying,
          completionReached,
          completionBehavior
        }) &&
        animation &&
        this.startPlaybackCompletionTransition(
          animation,
          completionTransitionDurationMs,
          undefined,
          completionTargetPose
        )
      ) {
        this.scheduleLoop();
      } else {
        this.requestRender();
      }
    }
  }

  previewBoundaryPose(pose: Readonly<Record<string, number>> | 'robot-default', durationMs = 500): boolean {
    if (this.runtimeHistoryReplayActive || !this.robot) {
      return false;
    }

    const targetPose = pose === 'robot-default' ? this.defaultPose : pose;

    if (!targetPose) {
      return false;
    }

    const transition = createRobotPoseTransition({
      startedAtMs: typeof performance === 'undefined' ? Date.now() : performance.now(),
      durationMs,
      targets: Object.keys(targetPose),
      sourcePose: this.captureJointPose(),
      targetPose
    });

    this.playbackTransitionState = null;
    this.playbackCompletionTransitionState = null;
    this.deferredBoundaryPreviewRuntimeHistoryProjection = null;

    if (!transition) {
      this.boundaryPosePreviewTransitionState = null;
      this.groundSimulatedRobotOnSupportFloor(this.robot);
      this.syncPhysicsKinematicPoseFromRobotPose({ holdFrames: 0, clearDynamics: true, resetCadence: false });
      this.updateViewerDebugLayers();
      this.requestRender();
      return true;
    }

    this.boundaryPosePreviewTransitionState = transition;
    this.scheduleLoop();
    return true;
  }

  private getPlaybackSyncSignature(playback: {
    sourceId: string | null;
    subjectId: string | null;
    durationSeconds: number | null;
    clockMode: 'realtime' | 'manual';
    physicalEntryMode: Viewer3DPhysicalEntryMode;
    isPlaying: boolean;
    playbackRate: number;
    loopPlayback: boolean;
    workRange: { start: number; end: number } | null;
    mutedTrackTargets: readonly string[];
    completionBehavior: 'hold' | 'return-to-default';
    completionReached: boolean;
    completionTransitionDurationMs: number;
    startTransitionMinimumDurationSeconds: number;
    entryPose: Readonly<Record<string, number>> | 'robot-default' | null;
    endTransitionMinimumDurationSeconds: number;
    exitPose: Readonly<Record<string, number>> | 'robot-default' | null;
    completionTargetPose: Readonly<Record<string, number>> | null;
  }): string {
    const mutedTrackTargets = [...playback.mutedTrackTargets].sort().join('\u0000');
    const workRangeStart = playback.workRange ? Number(playback.workRange.start.toFixed(3)) : null;
    const workRangeEnd = playback.workRange ? Number(playback.workRange.end.toFixed(3)) : null;

    return JSON.stringify({
      sourceId: playback.sourceId,
      subjectId: playback.subjectId,
      durationSeconds: playback.durationSeconds,
      clockMode: playback.clockMode,
      physicalEntryMode: playback.physicalEntryMode,
      isPlaying: playback.isPlaying,
      playbackRate: playback.playbackRate,
      loopPlayback: playback.loopPlayback,
      workRangeStart,
      workRangeEnd,
      mutedTrackTargets,
      completionBehavior: playback.completionBehavior,
      completionReached: playback.completionReached,
      completionTransitionDurationMs: playback.completionTransitionDurationMs,
      startTransitionMinimumDurationSeconds: playback.startTransitionMinimumDurationSeconds,
      entryPose: this.createPoseSignature(playback.entryPose),
      endTransitionMinimumDurationSeconds: playback.endTransitionMinimumDurationSeconds,
      exitPose: this.createPoseSignature(playback.exitPose),
      completionTargetPose: this.createPoseSignature(playback.completionTargetPose)
    });
  }

  private createPoseSignature(
    pose: Readonly<Record<string, number>> | 'robot-default' | null
  ): string | null {
    if (!pose) {
      return null;
    }

    if (pose === 'robot-default') {
      return pose;
    }

    return Object.entries(pose)
      .filter((entry): entry is [string, number] => Number.isFinite(entry[1]))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([target, value]) => `${target}:${value.toFixed(6)}`)
      .join('|');
  }

  private createMutedTrackTargetSet(mutedTrackTargets: readonly string[]): ReadonlySet<string> {
    return mutedTrackTargets.length > 0 ? new Set(mutedTrackTargets) : EMPTY_MUTED_TRACK_TARGET_SET;
  }

  private createMutedTrackTargetSignature(mutedTrackTargets: ReadonlySet<string>): string {
    return mutedTrackTargets.size > 0 ? [...mutedTrackTargets].sort().join('\u0000') : '';
  }

  private resolveMutedTrackTargetSet(
    mutedTrackTargets: readonly string[] | ReadonlySet<string>
  ): ReadonlySet<string> {
    if (mutedTrackTargets instanceof Set) {
      return mutedTrackTargets;
    }

    return this.createMutedTrackTargetSet(mutedTrackTargets as readonly string[]);
  }

  private applyRobotPose(
    animation: RobotMotionAnimation | null,
    time: number,
    mutedTrackTargets: readonly string[] | ReadonlySet<string> = [],
    durationOverride: number | null = null
  ): boolean {
    this.displayedRecordedPhysicsObservation = null;
    if (!this.robot) {
      return false;
    }

    if (!animation || !animation.motion.hasMotion) {
      this.playbackTransitionState = null;
      const poseChanged = this.restoreLastAnimatedPose();

      if (poseChanged) {
        this.updateViewerDebugLayers();
        if (!this.dirtyPose) {
          this.poseEditBaseline = this.captureJointPose();
        }
      }

      return poseChanged;
    }

    const duration = durationOverride ?? getRobotMotionAnimationDuration(animation);
    const clampedTime = Math.max(0, Math.min(time, duration));
    const joints = this.getRobotJoints();
    const mutedTargets = this.resolveMutedTrackTargetSet(mutedTrackTargets);
    const nextAnimatedJointTargets = this.nextAnimatedJointTargets;
    const transitionStartTime = this.resolveAnimationTransitionStartTime();
    let poseChanged = false;

    this.ensureAnimationStartTransition(animation, transitionStartTime, clampedTime, mutedTargets);
    nextAnimatedJointTargets.clear();

    for (const track of animation.motion.tracks) {
      if (!track.target || mutedTargets.has(track.target) || !joints[track.target]) {
        continue;
      }

      const value = this.interpolateTrack(track, clampedTime);

      if (value === null || Number.isNaN(value)) {
        continue;
      }

      poseChanged = this.applyAuthoredJointValue(joints[track.target], value, track.target) || poseChanged;
      nextAnimatedJointTargets.add(track.target);
    }

    poseChanged =
      this.updatePlaybackStartTransition(animation, clampedTime, nextAnimatedJointTargets) || poseChanged;
    poseChanged =
      this.updatePlaybackEndTransition(animation, clampedTime, nextAnimatedJointTargets, duration) ||
      poseChanged;
    poseChanged = this.restoreInactiveAnimatedJoints(joints, nextAnimatedJointTargets) || poseChanged;
    const previousAnimatedJointTargets = this.lastAnimatedJointTargets;
    this.lastAnimatedJointTargets = nextAnimatedJointTargets;
    this.nextAnimatedJointTargets = previousAnimatedJointTargets;
    this.nextAnimatedJointTargets.clear();

    if (poseChanged) {
      this.updateViewerDebugLayers();
      if (!this.dirtyPose) {
        this.poseEditBaseline = this.captureJointPose();
      }
    }

    return poseChanged;
  }

  private updateScrubPreviewPose(): boolean {
    const preview = this.scrubPreviewState;

    if (!preview?.active || !this.hasPendingScrubPreviewWork()) {
      return false;
    }

    const applicationRequired = preview.needsPoseApplication;
    let poseChanged = false;
    if (applicationRequired) {
      // Scrub is a direct read-head projection. Interpolating toward the
      // mouse position produced extra pose/render frames and made the Viewer
      // lag behind the Timeline. Apply the authoritative sample once.
      preview.currentTime = preview.targetTime;
      preview.needsPoseApplication = false;
      poseChanged = this.applyRobotPose(
        preview.animation,
        preview.currentTime,
        preview.mutedTrackTargetSet,
        preview.duration
      );
    }

    // Scrub is temporal navigation, not a physical command. Keep the physics
    // representation aligned kinematically and discard dynamics so rapid
    // seeking cannot accumulate velocity, impulse or balance oscillation.
    const now = performance.now();
    if (applicationRequired || poseChanged) {
      preview.needsPhysicsSync = true;
    }
    if (
      preview.needsPhysicsSync &&
      now - this.lastScrubPhysicsSyncAt >= ROBOT_VIEWER_SCRUB_PHYSICS_SYNC_MINIMUM_INTERVAL_MS
    ) {
      this.syncPhysicsKinematicPoseFromRobotPose({
        holdFrames: 0,
        clearDynamics: true,
        resetCadence: false
      });
      this.lastScrubPhysicsSyncAt = now;
      preview.needsPhysicsSync = false;
    }

    if (applicationRequired || poseChanged) {
      this.updateTrajectoryCurrentMarkers();
    }
    return poseChanged;
  }

  private hasPendingScrubPreviewWork(): boolean {
    const preview = this.scrubPreviewState;

    return preview?.active === true && (preview.needsPoseApplication || preview.needsPhysicsSync);
  }

  private resolveAnimationTransitionStartTime(): number {
    return 0;
  }

  private ensureAnimationStartTransition(
    animation: RobotMotionAnimation,
    startTime: number,
    currentTime: number,
    mutedTrackTargetSet: ReadonlySet<string>
  ): void {
    if (!this.options.transitionToAnimationStart || !animation.motion.hasMotion) {
      this.playbackTransitionState = null;
      return;
    }

    const mutedTrackSignature = this.createMutedTrackTargetSignature(mutedTrackTargetSet);

    if (
      this.playbackTransitionState?.animation === animation &&
      this.playbackTransitionState.startTime === startTime &&
      this.playbackTransitionState.mutedTrackSignature === mutedTrackSignature
    ) {
      return;
    }

    this.playbackTransitionState = this.createAnimationStartTransition(
      animation,
      startTime,
      currentTime,
      mutedTrackTargetSet,
      mutedTrackSignature
    );
  }

  private createAnimationStartTransition(
    animation: RobotMotionAnimation,
    startTime: number,
    currentTime: number,
    mutedTrackTargetSet: ReadonlySet<string>,
    mutedTrackSignature: string
  ): Viewer3DPlaybackTransitionState | null {
    if (!this.robot || !animation.motion.hasMotion) {
      return null;
    }

    const joints = this.getRobotJoints();
    const tracks: Viewer3DPlaybackTransitionTrack[] = [];

    for (const track of animation.motion.tracks) {
      if (!track.target || mutedTrackTargetSet.has(track.target)) {
        continue;
      }

      const joint = joints[track.target];
      const firstKey = this.resolveTrackFirstKeyAtOrAfter(track, startTime);

      if (!joint || !firstKey) {
        continue;
      }

      const minimumDurationSeconds = this.playbackState?.startTransitionMinimumDurationSeconds ?? 0;
      const boundaryEndTime = resolveRobotPoseEntryTransitionEndTime({
        startTimeSeconds: startTime,
        firstKeyTimeSeconds: firstKey.time,
        minimumDurationSeconds
      });
      const endTime =
        firstKey.time <= startTime
          ? this.resolveImmediateAnimationStartTransitionEndTime(
              startTime,
              currentTime,
              minimumDurationSeconds
            )
          : boundaryEndTime;

      if (endTime === null) {
        continue;
      }

      const targetValue =
        endTime > firstKey.time ? (this.interpolateTrack(track, endTime) ?? firstKey.value) : firstKey.value;
      const entryPose = this.playbackState?.entryPose;
      const configuredStartValue =
        entryPose === 'robot-default' ? this.defaultPose?.[track.target] : entryPose?.[track.target];
      const startValue =
        typeof configuredStartValue === 'number' && Number.isFinite(configuredStartValue)
          ? configuredStartValue
          : this.readJointValue(joint);

      if (typeof startValue !== 'number' || !Number.isFinite(startValue)) {
        continue;
      }

      if (Math.abs(startValue - targetValue) <= 0.0005) {
        continue;
      }

      tracks.push({
        target: track.target,
        startValue,
        targetValue,
        endTime
      });
    }

    const entryPose = this.playbackState?.entryPose;
    const entryPoseEndTime = this.resolveImmediateAnimationStartTransitionEndTime(
      startTime,
      currentTime,
      this.playbackState?.startTransitionMinimumDurationSeconds ?? 0
    );
    const existingTargets = new Set(tracks.map((track) => track.target));

    if (entryPose && entryPose !== 'robot-default' && entryPoseEndTime !== null) {
      for (const [target, startValue] of Object.entries(entryPose)) {
        const joint = joints[target];

        if (
          existingTargets.has(target) ||
          mutedTrackTargetSet.has(target) ||
          !joint ||
          !Number.isFinite(startValue)
        ) {
          continue;
        }

        const currentValue = this.readJointValue(joint);
        const targetValue = this.defaultPose?.[target] ?? currentValue;

        if (typeof targetValue !== 'number' || !Number.isFinite(targetValue)) {
          continue;
        }

        tracks.push({
          target,
          startValue,
          targetValue,
          endTime: entryPoseEndTime
        });
      }
    }

    if (tracks.length === 0) {
      return null;
    }

    return {
      animation,
      startTime,
      endTime: Math.max(...tracks.map((track) => track.endTime)),
      mutedTrackSignature,
      tracks
    };
  }

  private resolveImmediateAnimationStartTransitionEndTime(
    startTime: number,
    currentTime: number,
    minimumDurationSeconds = 0
  ): number | null {
    const durationSeconds = Math.max(ROBOT_VIEWER_PLAYBACK_START_BLEND_SECONDS, minimumDurationSeconds);

    if (!this.playbackState?.isPlaying || currentTime > startTime + durationSeconds) {
      return null;
    }

    return startTime + durationSeconds;
  }

  private updatePlaybackStartTransition(
    animation: RobotMotionAnimation,
    time: number,
    activeTargets: Set<string>
  ): boolean {
    const transition = this.playbackTransitionState;

    if (!transition) {
      return false;
    }

    // The authored blend already owns the complete joint target for this
    // frame. A second balance correction would turn its stabilized boundary
    // pose into a competing ankle/hip command.
    this.physicsPostureCompensationTransitionFrameActive = true;

    if (animation !== transition.animation) {
      this.playbackTransitionState = null;
      return false;
    }

    if (time >= transition.endTime) {
      this.playbackTransitionState = null;
      return false;
    }

    let poseChanged = false;

    const joints = this.getRobotJoints();

    for (const transitionTrack of transition.tracks) {
      if (time >= transitionTrack.endTime) {
        continue;
      }

      const joint = joints[transitionTrack.target];

      if (!joint) {
        continue;
      }

      activeTargets.add(transitionTrack.target);
      const span = Math.max(0.0001, transitionTrack.endTime - transition.startTime);
      const progress = MathUtils.clamp((time - transition.startTime) / span, 0, 1);
      const easedProgress = progress * progress * (3 - 2 * progress);
      const value =
        transitionTrack.startValue +
        (transitionTrack.targetValue - transitionTrack.startValue) * easedProgress;

      poseChanged = this.applyAuthoredJointValue(joint, value, transitionTrack.target) || poseChanged;
    }

    if (poseChanged) {
      this.robot?.updateMatrixWorld(true);
      this.updateViewerDebugLayers();
    }

    return poseChanged;
  }

  private resolveTrackFirstKeyAtOrAfter(
    track: RobotMotionTrack,
    startTime: number
  ): { time: number; value: number } | null {
    let firstKey: { time: number; value: number } | null = null;

    for (const key of track.keys) {
      if (
        typeof key.time !== 'number' ||
        typeof key.value !== 'number' ||
        !Number.isFinite(key.time) ||
        !Number.isFinite(key.value) ||
        key.time < startTime
      ) {
        continue;
      }

      if (!firstKey || key.time < firstKey.time) {
        firstKey = {
          time: key.time,
          value: toRobotMotionJointValue(track, key.value)
        };
      }
    }

    return firstKey;
  }

  private updatePlaybackEndTransition(
    animation: RobotMotionAnimation,
    time: number,
    activeTargets: Set<string>,
    duration: number
  ): boolean {
    const playback = this.playbackState;
    const configuredExitPose = playback?.exitPose;

    if (!configuredExitPose || duration <= 0 || !this.robot) {
      return false;
    }

    const targetPose = configuredExitPose === 'robot-default' ? this.defaultPose : configuredExitPose;
    if (!targetPose) {
      return false;
    }

    const minimumDurationSeconds = playback?.endTransitionMinimumDurationSeconds ?? 0;
    const joints = this.getRobotJoints();
    let poseChanged = false;

    for (const track of animation.motion.tracks) {
      if (!track.target || playback?.mutedTrackTargetSet.has(track.target)) {
        continue;
      }

      const joint = joints[track.target];
      const targetValue = targetPose[track.target];
      const lastKey = this.resolveTrackLastKeyAtOrBefore(track, duration);

      if (!joint || !lastKey || typeof targetValue !== 'number' || !Number.isFinite(targetValue)) {
        continue;
      }

      const startTime = resolveRobotPoseExitTransitionStartTime({
        endTimeSeconds: duration,
        lastKeyTimeSeconds: lastKey.time,
        minimumDurationSeconds
      });
      if (time < startTime) {
        continue;
      }

      this.physicsPostureCompensationTransitionFrameActive = true;

      const sourceValue = this.interpolateTrack(track, startTime) ?? lastKey.value;
      const span = Math.max(0.0001, duration - startTime);
      const progress = MathUtils.clamp((time - startTime) / span, 0, 1);
      const easedProgress = progress * progress * (3 - 2 * progress);
      const value = sourceValue + (targetValue - sourceValue) * easedProgress;

      activeTargets.add(track.target);
      poseChanged = this.applyAuthoredJointValue(joint, value, track.target) || poseChanged;
    }

    if (poseChanged) {
      this.robot.updateMatrixWorld(true);
      this.updateViewerDebugLayers();
    }

    return poseChanged;
  }

  private resolveTrackLastKeyAtOrBefore(
    track: RobotMotionTrack,
    endTime: number
  ): { time: number; value: number } | null {
    let lastKey: { time: number; value: number } | null = null;

    for (const key of track.keys) {
      if (
        typeof key.time !== 'number' ||
        typeof key.value !== 'number' ||
        !Number.isFinite(key.time) ||
        !Number.isFinite(key.value) ||
        key.time > endTime
      ) {
        continue;
      }

      if (!lastKey || key.time > lastKey.time) {
        lastKey = { time: key.time, value: toRobotMotionJointValue(track, key.value) };
      }
    }

    return lastKey;
  }

  private updatePlaybackPose(): boolean {
    const playback = this.playbackState;

    if (!playback?.isPlaying || playback.clockMode === 'manual') {
      return false;
    }

    const now = typeof performance === 'undefined' ? Date.now() : performance.now();
    const elapsedSeconds = Math.max(0, (now - playback.syncedAt) / 1000);
    const duration = playback.duration;
    const rangeStart = Math.max(0, playback.workRange?.start ?? 0);
    const rawRangeEnd = playback.workRange?.end ?? duration;
    const rangeEnd = rawRangeEnd > rangeStart ? rawRangeEnd : duration;
    const rangeSpan = Math.max(0, rangeEnd - rangeStart);
    let nextTime = resolveViewerPlaybackProjectionTime({
      synchronizedTimeSeconds: playback.currentTime,
      elapsedSeconds,
      playbackRate: playback.playbackRate,
      authoritativeTimeSeconds: playback.resolveAuthoritativeCurrentTime?.()
    });
    let completedPlayback = false;

    if (duration > 0 && nextTime >= rangeEnd) {
      if (playback.loopPlayback && rangeSpan > 0) {
        nextTime = rangeStart + ((nextTime - rangeStart) % rangeSpan);
      } else {
        nextTime = rangeEnd;
        completedPlayback = true;
        this.playbackState = {
          ...playback,
          currentTime: nextTime,
          isPlaying: false,
          syncedAt: now
        };
      }
    }

    if (!completedPlayback && this.playbackState === playback) {
      // Runtime-history samples must carry the rendered frame time, not only
      // the last external synchronization anchor. Otherwise a later scrub can
      // retrieve the right pose under a stale timestamp.
      playback.currentTime = nextTime;
      playback.syncedAt = now;
    }

    const temporalProjectionSample = playback.resolveTemporalProjectionSample?.(nextTime) ?? null;
    const poseChanged = temporalProjectionSample
      ? this.applyRuntimeHistorySample(temporalProjectionSample, {
          preservePlaybackState: true,
          applyCamera: false
        })
      : this.applyRobotPose(playback.animation, nextTime, playback.mutedTrackTargetSet, playback.duration);
    this.updateTrajectoryCurrentMarkers();

    if (
      playback.animation &&
      shouldStartViewerPlaybackCompletionTransition({
        isPlaying: false,
        completionReached: completedPlayback,
        completionBehavior: playback.completionBehavior
      })
    ) {
      this.startPlaybackCompletionTransition(
        playback.animation,
        playback.completionTransitionDurationMs,
        now,
        playback.completionTargetPose
      );
    }

    return poseChanged;
  }

  private startPlaybackCompletionTransition(
    animation: RobotMotionAnimation,
    durationMs: number,
    startedAtMs = typeof performance === 'undefined' ? Date.now() : performance.now(),
    configuredTargetPose: Readonly<Record<string, number>> | null = null
  ): boolean {
    const targetPose = configuredTargetPose ?? this.defaultPose;

    if (!targetPose || this.lastAnimatedJointTargets.size === 0) {
      return false;
    }

    const transitionTargets = configuredTargetPose
      ? new Set([...this.lastAnimatedJointTargets, ...Object.keys(configuredTargetPose)])
      : this.lastAnimatedJointTargets;
    const transition = createRobotPoseTransition({
      startedAtMs,
      durationMs,
      targets: transitionTargets,
      sourcePose: this.captureJointPose(),
      targetPose
    });

    if (!transition) {
      this.lastAnimatedJointTargets.clear();
      this.nextAnimatedJointTargets.clear();
      return false;
    }

    this.playbackTransitionState = null;
    this.playbackCompletionTransitionState = {
      animation,
      transition
    };
    return true;
  }

  private updatePlaybackCompletionTransition(now: number): boolean {
    const activeTransition = this.playbackCompletionTransitionState;

    if (!activeTransition) {
      return false;
    }

    this.physicsPostureCompensationTransitionFrameActive = true;

    const sample = sampleRobotPoseTransition(activeTransition.transition, now);
    const joints = this.getRobotJoints();
    let poseChanged = false;

    for (const [target, value] of Object.entries(sample.jointValues)) {
      const joint = joints[target];

      if (!joint) {
        continue;
      }

      poseChanged = this.applyAuthoredJointValue(joint, value, target) || poseChanged;
    }

    if (poseChanged) {
      this.robot?.updateMatrixWorld(true);
      this.updateViewerDebugLayers();
    }

    if (sample.completed) {
      this.playbackCompletionTransitionState = null;
      this.lastAnimatedJointTargets.clear();
      this.nextAnimatedJointTargets.clear();
    }

    return poseChanged;
  }

  private updateBoundaryPosePreviewTransition(now: number): boolean {
    const transition = this.boundaryPosePreviewTransitionState;

    if (!transition) {
      return false;
    }

    this.physicsPostureCompensationTransitionFrameActive = true;

    const sample = sampleRobotPoseTransition(transition, now);
    const joints = this.getRobotJoints();
    let poseChanged = false;

    for (const [target, value] of Object.entries(sample.jointValues)) {
      const joint = joints[target];

      if (!joint) {
        continue;
      }

      poseChanged = this.applyDesiredProjectionJointValue(joint, value) || poseChanged;
    }

    if (poseChanged) {
      // A catalogue pose owns joint angles, not the previous incarnation's root height.
      // Ground only this authored preview; recorded physical samples retain their root.
      if (this.robot) this.groundSimulatedRobotOnSupportFloor(this.robot);
      this.robot?.updateMatrixWorld(true);
      this.updateViewerDebugLayers();
      this.syncPhysicsKinematicPoseFromRobotPose({
        holdFrames: 0,
        clearDynamics: true,
        resetCadence: false
      });
    }

    if (sample.completed) {
      this.boundaryPosePreviewTransitionState = null;
      const deferredProjection = this.deferredBoundaryPreviewRuntimeHistoryProjection;
      this.deferredBoundaryPreviewRuntimeHistoryProjection = null;

      if (deferredProjection) {
        this.projectRuntimeHistorySample(deferredProjection.sample, {
          applyCamera: deferredProjection.applyCamera
        });
        return true;
      }
    }

    return poseChanged;
  }

  frameRobotToView(): void {
    if (!this.robot) {
      return;
    }

    this.robot.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(this.robot);
    const simulatedPresentationOffsetX = this.simulatedRobotPresentationRoot.position.x;

    // Build diagnostics in the simulated robot's authority frame. Their group
    // receives the presentation offset once, so bounds and joint fallbacks
    // must not carry that same offset a second time.
    bounds.min.x -= simulatedPresentationOffsetX;
    bounds.max.x -= simulatedPresentationOffsetX;

    if (!Number.isFinite(bounds.min.x)) {
      return;
    }

    const size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());
    const maxSize = Math.max(size.x, size.y, size.z, 0.001);
    const fitHeightDistance = maxSize / (2 * Math.tan(MathUtils.degToRad(this.perspectiveCamera.fov * 0.5)));
    const fitWidthDistance = fitHeightDistance / Math.max(this.getViewportAspect(), 0.1);
    const distance = Math.max(fitHeightDistance, fitWidthDistance) * 1.35;

    const direction = new Vector3(1, 0.72, 1).normalize();
    const position = center.clone().add(direction.multiplyScalar(distance));
    this.controls.target.copy(center);
    this.orthographicViewHeight = Math.max(0.001, maxSize * 1.45);
    this.applyCameraPlanes(Math.max(0.01, distance / 100), Math.max(10, distance * 12));
    this.applyCameraPose(position, center);
    this.updateCameraProjectionForViewport();
    this.controls.update();
    this.requestRender();
  }

  destroy(options: Viewer3DDestroyOptions = {}): void {
    if (this.destroyed) {
      return;
    }

    if (options.reason === 'hmr' && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(ROBOT_VIEWER_HMR_DISPOSE_EVENT, {
          detail: {
            container: this.container
          }
        })
      );
    }

    this.destroyed = true;
    this.comparisonColliderGroup.removeFromParent();
    this.disposeObject3D(this.comparisonColliderGroup);
    this.comparisonColliders.clear();
    activeViewers.delete(this);
    this.unsubscribeRuntimeHistory();
    this.unsubscribeRuntimeHistory = () => {};
    this.temporalScheduler.stop();
    if (this.options.physicsServiceOwnership === 'viewer') {
      this.physicsService.dispose();
    }
    this.animationLoop.cancel();
    this.cancelResizeWork();
    this.cancelCameraTransition();
    this.resizeObserver.disconnect();
    this.viewportObserver?.disconnect();
    this.viewportObserver = null;
    this.longTaskObserver?.disconnect();
    this.longTaskObserver = null;
    this.teardownStats();
    this.themeObserver?.disconnect();
    this.themeObserver = null;
    this.disposeCameraControls();
    this.renderer.domElement.removeEventListener('pointermove', this.handlePoseHandlePointerMove, true);
    this.renderer.domElement.removeEventListener('pointerdown', this.handlePoseHandlePointerDown, true);
    this.renderer.domElement.removeEventListener('pointerup', this.handlePoseHandlePointerUp, true);
    this.renderer.domElement.removeEventListener('pointercancel', this.handlePoseHandlePointerUp, true);
    this.renderer.domElement.removeEventListener('pointerleave', this.handlePoseHandlePointerLeave, true);
    this.renderer.domElement.removeEventListener('click', this.handlePoseHandleClick, true);
    this.renderer.domElement.removeEventListener('pointermove', this.handleProjectilePointerMove, true);
    this.container.removeEventListener('pointerenter', this.handleProjectilePointerEnter, true);
    this.container.removeEventListener('pointerleave', this.handleProjectilePointerLeave, true);
    window.removeEventListener('keydown', this.handleInteractionKeyDown, true);
    window.removeEventListener('keyup', this.handleInteractionKeyUp, true);
    window.removeEventListener('blur', this.handleProjectileWindowBlur);
    this.renderer.domElement.removeEventListener('dblclick', this.handleNavigationDoubleClick, true);
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }

    this.composer?.dispose();
    this.composer = null;
    this.renderPass = null;
    this.horizontalTiltShiftPass?.dispose();
    this.horizontalTiltShiftPass = null;
    this.verticalTiltShiftPass?.dispose();
    this.verticalTiltShiftPass = null;
    this.postProcessingAntialiasPass?.dispose();
    this.postProcessingAntialiasPass = null;
    this.renderer.dispose();
    this.clearTrajectoryPreview();
    this.clearContactPoints();
    this.clearPhysicsDebug();
    this.clearEyeRingDebug();
    this.clearBalanceDebug();
    this.clearPoseHandles();
    this.clearNavigationPreviewObjects();
    this.clearProjectileInteraction();
    if (this.navigationPreviewGroup) {
      this.scene.remove(this.navigationPreviewGroup);
      this.navigationPreviewGroup = null;
    }
    this.clearObservedRobotGhost();

    if (this.visualGroundLayer) {
      this.scene.remove(this.visualGroundLayer.group);
      this.visualGroundLayer.dispose();
      this.visualGroundLayer = null;
    }

    // Firefox and HMR have both been less happy with explicit WEBGL_lose_context
    // in our remount flows. Plain disposal is enough there and avoids a dead
    // black canvas until the next full page refresh.
    if (!isFirefox && options.reason !== 'hmr') {
      this.renderer.forceContextLoss();
    }

    if (this.robot) {
      this.disposeObject3D(this.robot);
      this.robot = null;
      this.lastAnimatedJointTargets.clear();
      this.nextAnimatedJointTargets.clear();
    }
  }

  private setupScene(): void {
    const ambientLight = new HemisphereLight('#ffffff', '#2f3744', 1.8);
    ambientLight.position.set(0, 1, 0);
    this.scene.add(ambientLight);

    this.keyLight = new DirectionalLight('#ffffff', 1.3);
    this.keyLight.position.set(4, 10, 3);
    this.scene.add(this.keyLight);

    const fillLight = new DirectionalLight('#9eb6ff', 0.45);
    fillLight.position.set(-3, 4, -2);
    this.scene.add(fillLight);

    this.ensureAxesHelper();
    this.ensureGridHelper();
    this.ensureVisualGroundLayer();
    this.updateVisualGroundEnvironment();
    this.applyTheme();
  }

  private ensureAxesHelper(): void {
    if (!this.options.showAxes || this.axesHelper) {
      return;
    }

    this.axesHelper = new AxesHelper(0.42);
    this.axesHelper.position.y = 0.004;
    this.scene.add(this.axesHelper);
  }

  private ensureGridHelper(): void {
    if (!this.options.showGrid || this.gridHelper) {
      return;
    }

    this.gridHelper = new GridHelper(1.6, ROBOT_VIEWER_GRID_DIVISIONS, '#445066', '#2b3444');
    this.gridHelper.position.y = -0.002;
    // Translucent comparison incarnations write their silhouettes first.
    // Drawing the floor after them lets the regular depth test keep grid lines
    // behind each robot instead of blending them through their shells.
    this.gridHelper.renderOrder = ROBOT_VIEWER_GRID_RENDER_ORDER;
    this.scene.add(this.gridHelper);
  }

  private ensureVisualGroundLayer(): void {
    if (!this.options.showVisualGround || this.visualGroundLayer) {
      return;
    }

    this.visualGroundLayer = new VisualGroundLayer(
      this.options.visualGround,
      this.options.visualGroundPalette
    );
    this.visualGroundLayer.group.position.y = ROBOT_VIEWER_SUPPORT_FLOOR_Y;
    this.scene.add(this.visualGroundLayer.group);
  }

  private updateVisualGroundEnvironment(): void {
    const config = this.visualGroundLayer?.getConfig();
    const receivesShadows = this.options.showVisualGround && (config?.components.receiveShadows ?? true);

    this.renderer.shadowMap.enabled = receivesShadows;
    // PCF comparison samplers use LINEAR filtering in Three.js. ANGLE warns
    // that this combination is implementation-defined for instanced draws.
    // VSM keeps the directional ground shadow soft while sampling a regular
    // moments texture, so indexed and non-indexed instancing remain portable.
    this.renderer.shadowMap.type = VSMShadowMap;
    if (this.keyLight) {
      // The visual floor benefits from a slightly stronger key contribution:
      // lit surfaces stay readable while the occluded footprint gains enough
      // contrast to anchor the robot without becoming a black contact patch.
      this.keyLight.intensity = receivesShadows ? 1.55 : 1.3;
      this.keyLight.castShadow = receivesShadows;
      // The visual ground is a presentation layer: use a tighter, denser
      // shadow projection so the robot silhouette remains smooth without
      // making the complete scene the visual subject.
      this.keyLight.shadow.mapSize.set(2048, 2048);
      this.keyLight.shadow.camera.left = -3;
      this.keyLight.shadow.camera.right = 3;
      this.keyLight.shadow.camera.top = 3;
      this.keyLight.shadow.camera.bottom = -3;
      this.keyLight.shadow.camera.near = 0.1;
      this.keyLight.shadow.camera.far = 30;
      this.keyLight.shadow.bias = -0.00015;
      this.keyLight.shadow.normalBias = 0.008;
      this.keyLight.shadow.radius = 1.5;
    }
    this.updateVisualGroundShadowCasters();
    this.updateVisualGroundFocusTiltPasses();

    const fogEnabled = this.options.showVisualGround && (config?.components.fogFade ?? true);
    if (!fogEnabled || this.options.transparent) {
      this.scene.fog = null;
      return;
    }

    const themeBackgroundColor = this.resolveThemeColor('--color-background-canvas', '#111722');
    const fogColor = this.resolveVisualGroundSkyColor(themeBackgroundColor);
    const fogDensity = config?.fogDensity ?? DEFAULT_VIEWER_VISUAL_GROUND_CONFIG.fogDensity;
    if (this.scene.fog instanceof FogExp2) {
      // Preserve the same fog authority while Viewer settings react. Replacing
      // the object on every layer update invalidated material state and could
      // expose a transient, differently graded frame around focus changes.
      this.scene.fog.color.copy(fogColor);
      this.scene.fog.density = fogDensity;
    } else {
      this.scene.fog = new FogExp2(fogColor, fogDensity);
    }
  }

  private updateVisualGroundShadowCasters(): void {
    const receivesShadows =
      this.options.showVisualGround &&
      (this.visualGroundLayer?.getConfig().components.receiveShadows ?? true);
    this.robot?.traverse((object) => {
      if (object instanceof Mesh) {
        object.castShadow = receivesShadows;
      }
    });
    this.observedRobotGhost?.traverse((object) => {
      if (object instanceof Mesh && !(object as Mesh & { isURDFCollider?: boolean }).isURDFCollider) {
        object.castShadow = receivesShadows && this.observedRobotGhostShadowOpacity > 0.000001;
      }
    });
  }

  private setupStats(): void {
    if (!this.options.showStats || this.statsCadenceElement) {
      return;
    }

    const cadenceElement = document.createElement('div');
    cadenceElement.style.position = 'absolute';
    cadenceElement.style.left = '0.5rem';
    cadenceElement.style.bottom = '0.5rem';
    cadenceElement.style.zIndex = '3';
    cadenceElement.style.pointerEvents = 'none';
    cadenceElement.style.padding = '0.18rem 0.32rem';
    cadenceElement.style.border = '1px solid rgba(56, 189, 248, 0.42)';
    cadenceElement.style.borderRadius = '0.25rem';
    cadenceElement.style.background = 'rgba(2, 12, 24, 0.78)';
    cadenceElement.style.color = '#67e8f9';
    cadenceElement.style.font = '600 9px Helvetica, Arial, sans-serif';
    cadenceElement.style.letterSpacing = '0';
    cadenceElement.style.width = `${ROBOT_VIEWER_PROFILER_GRAPH_WIDTH}px`;

    const textElement = document.createElement('div');
    textElement.style.lineHeight = '1.28';
    textElement.style.whiteSpace = 'pre';
    textElement.textContent = 'DISPLAY --Hz | RAF -- | RND -- | PR 1.00';
    cadenceElement.appendChild(textElement);

    const graphCanvas = document.createElement('canvas');
    graphCanvas.style.display = 'block';
    graphCanvas.style.width = `${ROBOT_VIEWER_PROFILER_GRAPH_WIDTH}px`;
    graphCanvas.style.height = `${ROBOT_VIEWER_PROFILER_GRAPH_HEIGHT}px`;
    graphCanvas.style.marginTop = '0.24rem';
    graphCanvas.style.borderTop = '1px solid rgba(56, 189, 248, 0.2)';
    cadenceElement.appendChild(graphCanvas);

    this.container.appendChild(cadenceElement);
    this.statsCadenceElement = cadenceElement;
    this.statsCadenceTextElement = textElement;
    this.statsGraphCanvas = graphCanvas;
    this.startProfilerTimerProbe();
    this.observeMainThreadLongTasks();
    if (this.options.showGlobalRafProbe) {
      this.startGlobalRafProbe();
    }
  }

  private teardownStats(): void {
    this.stopProfilerTimerProbe();
    this.longTaskObserver?.disconnect();
    this.longTaskObserver = null;

    if (this.globalRafProbeFrame !== 0) {
      cancelAnimationFrame(this.globalRafProbeFrame);
      this.globalRafProbeFrame = 0;
    }

    if (this.statsCadenceElement?.parentElement === this.container) {
      this.container.removeChild(this.statsCadenceElement);
    }

    this.statsCadenceElement = null;
    this.statsCadenceTextElement = null;
    this.statsGraphCanvas = null;
    this.performanceMonitor.samples.length = 0;
    this.resetStatsCadence(performance.now());
  }

  private observeThemeChanges(): void {
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') {
      return;
    }

    this.themeObserver?.disconnect();
    this.themeObserver = new MutationObserver(() => {
      this.applyTheme();
      this.requestRender();
    });
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style']
    });
    this.themeObserver.observe(document.head, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  private readThemeColor(variable: string, fallback: string): string {
    const source = this.container ?? document.documentElement;
    const value = getComputedStyle(source).getPropertyValue(variable).trim();
    return value || fallback;
  }

  private applyTheme(): void {
    const themeBackgroundColor = this.resolveThemeColor('--color-background-canvas', '#111722');
    const backgroundColor = this.options.showVisualGround
      ? this.resolveVisualGroundSkyColor(themeBackgroundColor)
      : themeBackgroundColor;
    this.scene.background = this.options.transparent ? null : backgroundColor;

    if (this.visualGroundLayer) {
      this.visualGroundLayer.applyPalette({
        ...this.resolveVisualGroundPalette(backgroundColor),
        ...this.options.visualGroundPalette
      });
    }
    if (this.scene.fog instanceof FogExp2) {
      this.scene.fog.color.copy(backgroundColor);
    }

    if (!this.gridHelper) {
      this.requestRender();
      return;
    }

    const gridPalette = this.resolveGridPalette(backgroundColor);
    this.applyGridVertexColors(gridPalette.major, gridPalette.minor);

    const materials = Array.isArray(this.gridHelper.material)
      ? this.gridHelper.material
      : [this.gridHelper.material];

    for (const material of materials) {
      const lineMaterial = material as typeof material & { color?: Color };

      lineMaterial.color?.setRGB(1, 1, 1);
      lineMaterial.transparent = true;
      lineMaterial.opacity = gridPalette.opacity;
      lineMaterial.depthTest = true;
      lineMaterial.depthWrite = false;
    }

    this.requestRender();
  }

  private resolveVisualGroundPalette(backgroundColor: Color): ViewerVisualGroundPalette {
    const backgroundLuminance = this.getColorLuminance(backgroundColor);

    if (backgroundLuminance < 0.35) {
      return {
        base: new Color('#172c40'),
        alternate: new Color('#203a50'),
        joint: new Color('#102235'),
        majorJoint: new Color('#afc7d5'),
        reflection: new Color('#b6d1e2')
      };
    }

    return {
      base: new Color('#6f9bb4'),
      alternate: new Color('#80a9bf'),
      joint: new Color('#426d87'),
      majorJoint: new Color('#f3f9fc'),
      reflection: new Color('#ffffff')
    };
  }

  private resolveVisualGroundSkyColor(themeBackgroundColor: Color): Color {
    return this.getColorLuminance(themeBackgroundColor) < 0.35 ? new Color('#17344a') : new Color('#91b4c8');
  }

  private resolveGridPalette(backgroundColor: Color): { major: Color; minor: Color; opacity: number } {
    const backgroundLuminance = this.getColorLuminance(backgroundColor);
    const majorBase = this.resolveThemeColor(
      '--color-border-strong',
      backgroundLuminance < 0.35 ? '#445066' : '#aeb9c8'
    );
    const minorBase = this.resolveThemeColor(
      '--color-border-subtle',
      backgroundLuminance < 0.35 ? '#2b3444' : '#d3dbe7'
    );

    if (backgroundLuminance < 0.35) {
      return {
        major: majorBase.lerp(new Color('#5f83b5'), 0.72),
        minor: minorBase.lerp(new Color('#2d4c72'), 0.68),
        opacity: 0.92
      };
    }

    return {
      major: majorBase.lerp(backgroundColor, 0.32),
      minor: minorBase.lerp(backgroundColor, 0.5),
      opacity: 0.7
    };
  }

  private applyGridVertexColors(majorColor: Color, minorColor: Color): void {
    if (!this.gridHelper) {
      return;
    }

    const colorAttribute = this.gridHelper.geometry.getAttribute('color');
    const center = ROBOT_VIEWER_GRID_DIVISIONS / 2;

    for (let lineIndex = 0; lineIndex <= ROBOT_VIEWER_GRID_DIVISIONS; lineIndex += 1) {
      const color = lineIndex === center ? majorColor : minorColor;
      const vertexStart = lineIndex * 4;

      for (let vertexOffset = 0; vertexOffset < 4; vertexOffset += 1) {
        colorAttribute.setXYZ(vertexStart + vertexOffset, color.r, color.g, color.b);
      }
    }

    colorAttribute.needsUpdate = true;
  }

  private resolveThemeColor(variable: string, fallback: string): Color {
    try {
      return new Color(this.toThreeColorValue(this.readThemeColor(variable, fallback), fallback));
    } catch {
      return new Color(fallback);
    }
  }

  private toThreeColorValue(value: string, fallback: string): string {
    const trimmed = value.trim();
    const rgbaMatch = trimmed.match(/^rgba\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*[^)]+\)$/i);

    return rgbaMatch
      ? `rgb(${rgbaMatch[1]?.trim()}, ${rgbaMatch[2]?.trim()}, ${rgbaMatch[3]?.trim()})`
      : trimmed || fallback;
  }

  private getColorLuminance(color: Color): number {
    return 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
  }

  private createRenderer(): WebGLRenderer {
    const rendererProfiles: WebGLRendererParameters[] = [
      {
        antialias: this.options.antialiasMode === 'msaa',
        alpha: this.options.transparent,
        depth: true,
        stencil: false,
        powerPreference: 'high-performance'
      },
      {
        antialias: false,
        alpha: this.options.transparent,
        depth: true,
        stencil: false,
        powerPreference: 'high-performance'
      },
      {
        antialias: false,
        alpha: true,
        depth: true,
        stencil: false,
        powerPreference: 'default'
      }
    ];
    let lastError: unknown = null;

    for (const profile of rendererProfiles) {
      try {
        const renderer = new WebGLRenderer(profile);
        // This is the canonical direct-render color profile. OutputPass then
        // reproduces the same transform when post-processing is enabled.
        renderer.outputColorSpace = SRGBColorSpace;
        renderer.toneMapping = NoToneMapping;
        return renderer;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Unable to create WebGL renderer.');
  }

  private getViewportAspect(): number {
    const viewport = this.readViewportAuthority();
    const width = viewport.visible ? viewport.width : this.rendererClientWidth || viewport.width;
    const height = viewport.visible ? viewport.height : this.rendererClientHeight || viewport.height;

    return Math.max(width, 1) / Math.max(height, 1);
  }

  private resolveOrthographicViewHeightFromPerspectiveDistance(distance: number): number {
    const safeDistance = Number.isFinite(distance) ? Math.max(0.001, distance) : 1;
    return Math.max(0.001, 2 * safeDistance * Math.tan(MathUtils.degToRad(this.perspectiveCamera.fov * 0.5)));
  }

  private updateCameraProjectionForViewport(): void {
    const aspect = this.getViewportAspect();
    const halfHeight = Math.max(0.001, this.orthographicViewHeight) * 0.5;
    const halfWidth = halfHeight * aspect;

    this.perspectiveCamera.aspect = aspect;
    this.perspectiveCamera.updateProjectionMatrix();

    this.orthographicCamera.left = -halfWidth;
    this.orthographicCamera.right = halfWidth;
    this.orthographicCamera.top = halfHeight;
    this.orthographicCamera.bottom = -halfHeight;
    this.orthographicCamera.updateProjectionMatrix();
  }

  private createCameraControls(
    mode: Viewer3DCameraControlMode,
    target = new Vector3(
      this.options.cameraTarget.x,
      this.options.cameraTarget.y,
      this.options.cameraTarget.z
    )
  ): ViewerCameraControls {
    const controls =
      mode === 'arcball'
        ? (new ArcballControls(this.camera, this.renderer.domElement) as ViewerArcballControls)
        : new OrbitControls(this.camera, this.renderer.domElement);

    controls.target.copy(target);
    controls.minDistance = ROBOT_VIEWER_CAMERA_MIN_DISTANCE;
    controls.maxDistance = ROBOT_VIEWER_CAMERA_MAX_DISTANCE;
    controls.minZoom = ROBOT_VIEWER_CAMERA_MIN_ZOOM;
    controls.maxZoom = ROBOT_VIEWER_CAMERA_MAX_ZOOM;
    controls.enabled = this.shouldEnableCameraControls();

    if (controls instanceof ArcballControls) {
      // Arcball initializes against its default origin target. Re-seed its
      // complete quaternion state after the viewer focus has been copied.
      controls.setCamera(this.camera);
      controls.enableAnimations = controls.enabled;
      controls.dampingFactor = 18;
      controls.enableFocus = false;
      controls.enableGrid = false;
      controls.cursorZoom = false;
    } else {
      controls.enableDamping = controls.enabled;
      controls.dampingFactor = 0.08;
    }

    controls.update();
    controls.addEventListener('start', this.handleControlsStart);
    controls.addEventListener('change', this.handleControlsChange);
    controls.addEventListener('end', this.handleControlsEnd);
    return controls;
  }

  private setControlsCamera(camera: PerspectiveCamera | OrthographicCamera): void {
    if (this.controls instanceof ArcballControls) {
      this.controls.setCamera(camera);
      return;
    }

    this.controls.object = camera;
  }

  private setCameraControlsMotionEnabled(enabled: boolean): void {
    if (this.controls instanceof ArcballControls) {
      this.controls.enableAnimations = enabled;
      return;
    }

    this.controls.enableDamping = enabled;
  }

  private disposeCameraControls(): void {
    this.controls.removeEventListener('start', this.handleControlsStart);
    this.controls.removeEventListener('change', this.handleControlsChange);
    this.controls.removeEventListener('end', this.handleControlsEnd);
    this.controls.dispose();
  }

  private applyCameraPose(position: Vector3, target: Vector3, up?: Vector3): void {
    if (up && up.lengthSq() > 0.000001) {
      const nextUp = up.clone().normalize();
      this.perspectiveCamera.up.copy(nextUp);
      this.orthographicCamera.up.copy(nextUp);
    }

    this.perspectiveCamera.position.copy(position);
    this.perspectiveCamera.lookAt(target);
    this.perspectiveCamera.updateProjectionMatrix();
    this.perspectiveCamera.updateMatrixWorld(true);

    this.orthographicCamera.position.copy(position);
    this.orthographicCamera.lookAt(target);
    this.orthographicCamera.updateProjectionMatrix();
    this.orthographicCamera.updateMatrixWorld(true);
  }

  private applyCameraPlanes(near: number, far: number): void {
    const planes = resolveViewerCameraClippingPlanes({
      requestedNear: near,
      requestedFar: far,
      groundSize:
        this.visualGroundLayer?.getConfig().size ??
        this.options.visualGround.size ??
        DEFAULT_VIEWER_VISUAL_GROUND_CONFIG.size,
      maximumCameraDistance: this.controls?.maxDistance ?? ROBOT_VIEWER_CAMERA_MAX_DISTANCE
    });
    this.perspectiveCamera.near = planes.near;
    this.perspectiveCamera.far = planes.far;
    this.perspectiveCamera.updateProjectionMatrix();
    this.orthographicCamera.near = planes.near;
    this.orthographicCamera.far = planes.far;
    this.orthographicCamera.updateProjectionMatrix();
  }

  private syncPostProcessingCamera(): void {
    if (this.renderPass) {
      this.renderPass.camera = this.camera;
    }
  }

  private getMaximumPixelRatio(): number {
    const devicePixelRatio = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
    return Math.max(0.5, Math.min(devicePixelRatio, this.options.maxPixelRatio));
  }

  private getMinimumPixelRatio(): number {
    return Math.max(0.5, Math.min(this.options.minPixelRatio, this.getMaximumPixelRatio()));
  }

  // Viewport authority: renderer, camera, picking, handles, and overlays must observe this measurement.
  private readViewportAuthority(): Viewer3DViewportAuthority {
    const rect = this.container.getBoundingClientRect();
    const rectWidth = Number.isFinite(rect.width) ? Math.round(rect.width) : 0;
    const rectHeight = Number.isFinite(rect.height) ? Math.round(rect.height) : 0;
    const clientWidth = Math.max(0, Math.round(this.container.clientWidth));
    const clientHeight = Math.max(0, Math.round(this.container.clientHeight));
    const measuredWidth = rectWidth > 0 ? rectWidth : clientWidth;
    const measuredHeight = rectHeight > 0 ? rectHeight : clientHeight;

    return {
      left: rect.left,
      top: rect.top,
      width: Math.max(1, measuredWidth),
      height: Math.max(1, measuredHeight),
      visible:
        measuredWidth >= ROBOT_VIEWER_MIN_VISIBLE_SIZE_PX &&
        measuredHeight >= ROBOT_VIEWER_MIN_VISIBLE_SIZE_PX
    };
  }

  private applyRendererSize(): boolean {
    const pixelRatio = this.options.adaptivePixelRatio
      ? Math.max(this.getMinimumPixelRatio(), Math.min(this.currentPixelRatio, this.getMaximumPixelRatio()))
      : this.getMaximumPixelRatio();
    const viewport = this.readViewportAuthority();

    if (!viewport.visible) {
      if (this.transientInvisibleResizePasses < ROBOT_VIEWER_TRANSIENT_INVISIBLE_RESIZE_RETRY_LIMIT) {
        this.transientInvisibleResizePasses += 1;
        this.scheduleSettledResize();
      }

      return false;
    }

    this.transientInvisibleResizePasses = 0;

    const { width, height } = viewport;
    const sizeChanged =
      width !== this.rendererClientWidth ||
      height !== this.rendererClientHeight ||
      Math.abs(pixelRatio - this.rendererPixelRatio) >= 0.001;

    if (!sizeChanged) {
      return false;
    }

    this.currentPixelRatio = pixelRatio;
    this.rendererClientWidth = width;
    this.rendererClientHeight = height;
    this.rendererPixelRatio = pixelRatio;
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    this.composer?.setPixelRatio(pixelRatio);
    this.composer?.setSize(width, height);
    this.updateVisualGroundFocusTiltPasses();
    return true;
  }

  private setupPostProcessing(): void {
    if (this.options.antialiasMode !== 'fxaa' && this.options.antialiasMode !== 'smaa') {
      return;
    }

    const renderTarget = new WebGLRenderTarget(1, 1, {
      depthBuffer: true,
      // Preserve the direct renderer's linear gradient range through the
      // post-processing chain. An unsigned-byte intermediate quantized the
      // blue sky/fog gradient and made the resting Viewer look flatter than
      // the focused direct-rendered frame.
      type: HalfFloatType,
      // Resolve robot geometry edges before the later SMAA pass. This keeps
      // thin silhouettes stable when the camera moves away from the subject.
      samples: this.options.antialiasMode === 'smaa' ? 4 : 0,
      stencilBuffer: false
    });
    const composer = new EffectComposer(this.renderer, renderTarget);
    const renderPass = new RenderPass(this.scene, this.camera);
    const horizontalTiltShiftPass = new ShaderPass(HorizontalTiltShiftShader);
    const verticalTiltShiftPass = new ShaderPass(VerticalTiltShiftShader);
    const antialiasPass = this.options.antialiasMode === 'smaa' ? new SMAAPass() : new FXAAPass();
    const outputPass = new OutputPass();

    composer.addPass(renderPass);
    composer.addPass(horizontalTiltShiftPass);
    composer.addPass(verticalTiltShiftPass);
    composer.addPass(antialiasPass);
    composer.addPass(outputPass);
    composer.setPixelRatio(this.currentPixelRatio);
    composer.setSize(this.rendererClientWidth || 1, this.rendererClientHeight || 1);
    this.renderPass = renderPass;
    this.horizontalTiltShiftPass = horizontalTiltShiftPass;
    this.verticalTiltShiftPass = verticalTiltShiftPass;
    this.postProcessingAntialiasPass = antialiasPass;
    this.composer = composer;
    this.updateVisualGroundFocusTiltPasses();
  }

  private updateVisualGroundFocusTiltPasses(): void {
    const horizontalPass = this.horizontalTiltShiftPass;
    const verticalPass = this.verticalTiltShiftPass;
    if (!horizontalPass || !verticalPass) {
      return;
    }

    const enabled =
      this.options.showVisualGround &&
      (this.visualGroundLayer?.getConfig().components.focusTilt ??
        this.options.visualGround.components?.focusTilt ??
        true);
    horizontalPass.enabled = enabled;
    verticalPass.enabled = enabled;

    const renderWidth = Math.max(1, this.rendererClientWidth * this.rendererPixelRatio);
    const renderHeight = Math.max(1, this.rendererClientHeight * this.rendererPixelRatio);
    this.updateVisualGroundFocusTiltStrength(renderWidth, renderHeight);
  }

  private updateVisualGroundFocusTiltStrength(
    renderWidth = Math.max(1, this.rendererClientWidth * this.rendererPixelRatio),
    renderHeight = Math.max(1, this.rendererClientHeight * this.rendererPixelRatio)
  ): void {
    const horizontalPass = this.horizontalTiltShiftPass;
    const verticalPass = this.verticalTiltShiftPass;
    if (!horizontalPass || !verticalPass) {
      return;
    }

    const focusTarget =
      this.controls?.target ??
      new Vector3(this.options.cameraTarget.x, this.options.cameraTarget.y, this.options.cameraTarget.z);
    const framingSpan =
      this.options.cameraProjection === 'iso'
        ? this.orthographicViewHeight
        : this.camera.position.distanceTo(focusTarget);
    const blurStrength = resolveViewerFocusTiltBlurStrength(framingSpan);

    horizontalPass.uniforms.h.value = blurStrength / Math.max(1, renderWidth);
    verticalPass.uniforms.v.value = blurStrength / Math.max(1, renderHeight);
  }

  private updateVisualGroundFocusTarget(): void {
    const horizontalPass = this.horizontalTiltShiftPass;
    const verticalPass = this.verticalTiltShiftPass;
    if (!horizontalPass?.enabled || !verticalPass?.enabled) {
      return;
    }

    const projectedTarget = this.visualGroundFocusProjection.copy(this.controls.target).project(this.camera);
    const focusLine = MathUtils.clamp(projectedTarget.y * 0.5 + 0.5, 0.28, 0.72);
    horizontalPass.uniforms.r.value = focusLine;
    verticalPass.uniforms.r.value = focusLine;
    // Keep close views crisp around the head and feet. Wider shots retain the
    // environmental tilt effect instead of using a fixed Gaussian radius.
    this.updateVisualGroundFocusTiltStrength();
  }

  private tunePixelRatio(frameTimeMs: number): void {
    if (!this.options.adaptivePixelRatio || this.destroyed) {
      return;
    }

    const now = performance.now();

    if (this.lastPixelRatioTuneAt !== 0 && now - this.lastPixelRatioTuneAt < 220) {
      return;
    }

    this.lastPixelRatioTuneAt = now;
    const targetFrameMs = 1000 / this.getEffectiveTargetFrameRate();
    const minPixelRatio = this.getMinimumPixelRatio();
    const maxPixelRatio = this.getMaximumPixelRatio();
    let nextPixelRatio = this.currentPixelRatio;

    if (frameTimeMs > targetFrameMs * 1.1 && this.currentPixelRatio > minPixelRatio) {
      nextPixelRatio = Math.max(minPixelRatio, this.currentPixelRatio - 0.18);
    } else if (frameTimeMs < targetFrameMs * 0.66 && this.currentPixelRatio < maxPixelRatio) {
      nextPixelRatio = Math.min(maxPixelRatio, this.currentPixelRatio + 0.04);
    }

    if (Math.abs(nextPixelRatio - this.currentPixelRatio) < 0.01) {
      return;
    }

    this.currentPixelRatio = nextPixelRatio;
    this.applyRendererSize();
    this.requestRender();
  }

  private observeViewportVisibility(): void {
    if (!this.options.suspendWhenViewportHidden) {
      this.viewportVisible = true;
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      this.viewportVisible = true;
      return;
    }

    this.viewportObserver = new IntersectionObserver(
      ([entry]) => {
        this.viewportVisible = entry?.isIntersecting ?? true;
        if (this.viewportVisible) {
          this.lastFrameAt = 0;
          this.requestRender();
        }
      },
      { threshold: 0.01 }
    );
    this.viewportObserver.observe(this.container);
  }

  private handleResize = (): void => {
    if (this.destroyed) {
      return;
    }

    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';

    this.cancelResizeSettleTimer();
    this.scheduleResize();

    if (this.hasContinuousRenderWork()) {
      return;
    }

    // Keep a final settled resize pass in case the browser coalesces the last
    // ResizeObserver notification while a panel split handle is still moving.
    this.scheduleSettledResize();
  };

  private scheduleResize(): void {
    if (this.destroyed || this.resizeFrame !== 0) {
      return;
    }

    if (typeof requestAnimationFrame === 'undefined') {
      this.flushResize();
      return;
    }

    this.resizeFrame = requestAnimationFrame(this.flushResize);
  }

  private scheduleSettledResize(): void {
    if (this.destroyed) {
      return;
    }

    this.cancelResizeSettleTimer();
    this.resizeSettleTimer = setTimeout(() => {
      this.resizeSettleTimer = null;
      this.scheduleResize();
    }, ROBOT_VIEWER_RESIZE_SETTLE_MS);
  }

  private cancelResizeSettleTimer(): void {
    if (!this.resizeSettleTimer) {
      return;
    }

    clearTimeout(this.resizeSettleTimer);
    this.resizeSettleTimer = null;
  }

  private cancelResizeWork(): void {
    this.cancelResizeSettleTimer();

    if (this.resizeFrame === 0 || typeof cancelAnimationFrame === 'undefined') {
      this.resizeFrame = 0;
      return;
    }

    cancelAnimationFrame(this.resizeFrame);
    this.resizeFrame = 0;
  }

  private flushResize = (): void => {
    this.resizeFrame = 0;

    if (this.destroyed) {
      return;
    }

    this.updateCameraProjectionForViewport();
    const sizeChanged = this.applyRendererSize();
    const resizePresentation = resolveViewerResizePresentation({
      sizeChanged,
      viewportVisible: this.viewportVisible,
      hasContinuousWork: this.hasContinuousRenderWork()
    });

    if (!resizePresentation.renderImmediately) {
      return;
    }

    // setSize() clears the WebGL drawing buffer. Paint the current scene in
    // the same RAF without stepping playback or physics, including while an
    // IntersectionObserver is transiently stale during a split resize.
    this.renderResizeFrame();

    if (resizePresentation.requestNextFrame) {
      this.requestRender();
    }
  };

  private loop = (): void => {
    if (!this.animationLoop.beginFrame()) {
      return;
    }

    const loopStartedAt = performance.now();
    const rafNow = loopStartedAt;
    this.temporalScheduler.frame(rafNow / 1000);
    const physicsActive = this.isPhysicsActive() && this.playbackState?.clockMode !== 'manual';
    const observedRobotPresentationActive =
      this.options.showObservedRobotGhost && this.observedRobotPresentation.isActive(rafNow);
    const continuousLoopBeforeWork =
      this.viewportVisible &&
      (((this.playbackState?.isPlaying ?? false) && this.playbackState?.clockMode !== 'manual') ||
        this.playbackCompletionTransitionState !== null ||
        this.boundaryPosePreviewTransitionState !== null ||
        this.hasPendingScrubPreviewWork() ||
        this.navigationMarkerAnimationStartedAt !== null ||
        this.navigationSimulationStartedAt !== null ||
        this.balanceDebugCenterOfMassFadeStartedAt !== null ||
        this.simulatedRobotInitializationOffsetStartedAt !== null ||
        this.poseHandleTargetTransitionState !== null ||
        this.robotComparisonVisibilityTransition !== null ||
        this.projectileChargeStartedAt !== null ||
        this.projectileAimTransition !== null ||
        this.projectileSlingshotReleaseState !== null ||
        this.controlsActive ||
        this.controlsSettlingFrames > 0 ||
        observedRobotPresentationActive ||
        physicsActive);
    let shouldContinueLoop = false;

    if (continuousLoopBeforeWork && !this.wasContinuousLoopActive) {
      this.resetStatsCadence(rafNow);
    }

    this.updateRafCadence(rafNow);
    let physicsChanged = false;

    if (continuousLoopBeforeWork) {
      this.scheduleLoop();
    }

    if (this.viewportVisible) {
      this.physicsPostureCompensationTransitionFrameActive = false;
      const poseStartedAt = performance.now();
      const scrubPoseChanged = this.updateScrubPreviewPose();
      const playbackPoseChanged = this.updatePlaybackPose();
      const completionPoseChanged = this.updatePlaybackCompletionTransition(rafNow);
      const boundaryPoseChanged = this.updateBoundaryPosePreviewTransition(rafNow);
      const navigationMarkerChanged = this.updateNavigationMarkerEasing(rafNow);
      const navigationSimulationChanged = this.updateNavigationSimulation(rafNow);
      const projectileAimTransitionChanged = this.updateProjectileAimTransition(rafNow);
      const projectileChargeChanged = this.updateProjectileCharge(rafNow);
      const projectileSlingshotReleaseChanged = this.updateProjectileSlingshotRelease(rafNow);
      const projectileInteractionChanged = this.updateProjectileInteraction(rafNow);
      const observedRobotPresentation = this.updateObservedRobotGhostPresentation(rafNow);
      // Keep comparison layout and observed grounding in one render authority.
      // Running these in separate RAF callbacks made the presentation root lag
      // one telemetry pose behind and visibly alternate between two positions.
      const robotComparisonVisibilityChanged = this.updateRobotComparisonVisibilityTransition(rafNow);
      const poseChanged =
        scrubPoseChanged || playbackPoseChanged || completionPoseChanged || boundaryPoseChanged;
      this.averagePoseMs = this.updateProfilerAverage(this.averagePoseMs, performance.now() - poseStartedAt);
      physicsChanged = this.stepPhysics(rafNow);
      const balanceDebugCenterOfMassFadeChanged = this.updateBalanceDebugCenterOfMassFade(rafNow);
      const simulatedRobotInitializationPresentationChanged =
        this.updateSimulatedRobotInitializationPresentation(rafNow);
      const poseHandleTargetTransitionChanged = this.updatePoseHandleTargetTransition(rafNow);
      const playbackActive =
        (this.playbackState?.isPlaying ?? false) && this.playbackState?.clockMode !== 'manual';
      const completionTransitionActive = this.playbackCompletionTransitionState !== null;
      const boundaryPoseTransitionActive = this.boundaryPosePreviewTransitionState !== null;
      const scrubPreviewWorkPending = this.hasPendingScrubPreviewWork();
      if (
        playbackActive ||
        completionTransitionActive ||
        boundaryPoseTransitionActive ||
        scrubPoseChanged ||
        scrubPreviewWorkPending
      ) {
        this.markFrameSignal('animation-pose');
      }

      if (playbackActive) {
        this.playbackFramesSinceReport += 1;
      }

      if (scrubPoseChanged || scrubPreviewWorkPending) {
        this.scrubFramesSinceReport += 1;
      }

      const controlsStartedAt = performance.now();
      const shouldUpdateControls =
        this.controls.enabled && (this.controlsActive || this.controlsSettlingFrames > 0);
      if (shouldUpdateControls) {
        this.controls.update();
      }
      if (shouldUpdateControls) {
        this.markFrameSignal('controls');
      }
      this.averageControlsMs = this.updateProfilerAverage(
        this.averageControlsMs,
        performance.now() - controlsStartedAt
      );

      const shouldRender =
        poseChanged ||
        completionTransitionActive ||
        boundaryPoseTransitionActive ||
        navigationMarkerChanged ||
        navigationSimulationChanged ||
        projectileAimTransitionChanged ||
        projectileChargeChanged ||
        projectileSlingshotReleaseChanged ||
        projectileInteractionChanged ||
        balanceDebugCenterOfMassFadeChanged ||
        simulatedRobotInitializationPresentationChanged ||
        poseHandleTargetTransitionChanged ||
        robotComparisonVisibilityChanged ||
        observedRobotPresentation.changed ||
        physicsChanged ||
        (this.options.continuousPlaybackRender && playbackActive) ||
        this.needsRender ||
        this.controlsActive ||
        this.controlsSettlingFrames > 0;

      if (shouldRender) {
        this.markFrameSignal('render');
        const now = performance.now();

        if (this.lastFrameAt > 0) {
          const frameMs = now - this.lastFrameAt;
          this.averageFrameMs = this.averageFrameMs * 0.9 + frameMs * 0.1;
          this.tunePixelRatio(this.averageFrameMs);
        }

        this.lastFrameAt = now;
        const renderStartedAt = performance.now();
        this.render();
        this.averageRenderMs = this.updateProfilerAverage(
          this.averageRenderMs,
          performance.now() - renderStartedAt
        );
        this.lastRenderCalls = this.renderer.info.render.calls;
        this.lastRenderTriangles = this.renderer.info.render.triangles;
        this.renderFramesSinceReport += 1;
        this.needsRender = false;

        if (!this.controlsActive && this.controlsSettlingFrames > 0) {
          this.controlsSettlingFrames -= 1;
          if (this.controlsSettlingFrames === 0 && this.visualGroundLayer) {
            // The throttled mirror may have reused its previous texture on the
            // last settling frame. Keep one final frame so the resting image
            // always owns an exact reflection of the final camera pose.
            this.visualGroundLayer.requestReflectionRefresh();
            this.needsRender = true;
          }
        }
      } else {
        this.lastFrameAt = 0;
      }

      if (continuousLoopBeforeWork || shouldRender || physicsChanged) {
        this.recordRuntimeHistorySample(rafNow);
      }

      this.updateStatsCadence(rafNow);
      shouldContinueLoop =
        playbackActive ||
        completionTransitionActive ||
        boundaryPoseTransitionActive ||
        this.navigationMarkerAnimationStartedAt !== null ||
        this.navigationSimulationStartedAt !== null ||
        this.balanceDebugCenterOfMassFadeStartedAt !== null ||
        this.simulatedRobotInitializationOffsetStartedAt !== null ||
        this.poseHandleTargetTransitionState !== null ||
        this.robotComparisonVisibilityTransition !== null ||
        this.projectileChargeStartedAt !== null ||
        this.projectileAimTransition !== null ||
        this.projectileSlingshotReleaseState !== null ||
        scrubPreviewWorkPending ||
        this.controlsActive ||
        this.controlsSettlingFrames > 0 ||
        observedRobotPresentation.active ||
        this.projectileParticles.length > 0 ||
        physicsActive ||
        this.needsRender;
    }

    this.averageLoopMs = this.updateProfilerAverage(this.averageLoopMs, performance.now() - loopStartedAt);
    this.wasContinuousLoopActive = shouldContinueLoop;

    if (shouldContinueLoop && this.animationLoop.isIdle()) {
      this.scheduleLoop();
    }
  };

  private render(): void {
    this.projectComparisonSimulation();
    if (this.observedRobotGhostMirrorsSimulatedRobot) {
      this.syncObservedRobotGhostFromSimulatedRobot();
    }
    this.updatePoseHandleScreenScale();
    this.updateProjectileCameraProjection();
    const ground = this.visualGroundLayer;
    if (ground) {
      const sceneMotionActive =
        ((this.playbackState?.isPlaying ?? false) && this.playbackState?.clockMode !== 'manual') ||
        this.playbackCompletionTransitionState !== null ||
        this.boundaryPosePreviewTransitionState !== null ||
        this.hasPendingScrubPreviewWork() ||
        this.simulatedRobotInitializationOffsetStartedAt !== null ||
        this.robotComparisonVisibilityTransition !== null ||
        this.projectileParticles.length > 0;
      const cameraInteractionActive = this.controlsActive || this.controlsSettlingFrames > 0;
      const reflectionInteractionActive =
        sceneMotionActive || cameraInteractionActive || this.cameraTransitionActive;
      if (!reflectionInteractionActive && this.visualGroundReflectionInteractionActive) {
        ground.requestReflectionRefresh();
      }
      // Direct manipulation remains exact. Programmatic camera and incarnation
      // tweens keep the primary scene at display cadence while bounding the
      // second planar-reflection pass to 30 Hz; their final frame always forces
      // one exact refresh.
      ground.setReflectionMinimumRefreshInterval(
        (sceneMotionActive || this.cameraTransitionActive) && !cameraInteractionActive
          ? ROBOT_VIEWER_REFLECTION_ACTIVE_MINIMUM_INTERVAL_MS
          : 0
      );
      this.visualGroundReflectionInteractionActive = reflectionInteractionActive;
    }

    // A Viewer must keep one color and post-processing pipeline regardless of
    // focus, playback or camera interaction. Bypassing the composer while the
    // controls were active made the fog, tilt blur and output color transform
    // jump when focus changed.
    if (this.composer) {
      this.updateVisualGroundFocusTarget();
      this.composer.render();
      return;
    }

    this.renderer.render(this.scene, this.camera);
  }

  private renderResizeFrame(): void {
    this.visualGroundLayer?.requestReflectionRefresh();
    const renderStartedAt = performance.now();
    this.render();
    this.averageRenderMs = this.updateProfilerAverage(
      this.averageRenderMs,
      performance.now() - renderStartedAt
    );
    this.lastRenderCalls = this.renderer.info.render.calls;
    this.lastRenderTriangles = this.renderer.info.render.triangles;
    this.renderFramesSinceReport += 1;
    this.needsRender = false;
    this.lastFrameAt = 0;
  }

  private hasContinuousRenderWork(): boolean {
    return (
      ((this.playbackState?.isPlaying ?? false) && this.playbackState?.clockMode !== 'manual') ||
      this.playbackCompletionTransitionState !== null ||
      this.boundaryPosePreviewTransitionState !== null ||
      this.hasPendingScrubPreviewWork() ||
      this.controlsActive ||
      this.controlsSettlingFrames > 0 ||
      (this.options.showObservedRobotGhost && this.observedRobotPresentation.isActive(performance.now())) ||
      (this.isPhysicsActive() && this.playbackState?.clockMode !== 'manual')
    );
  }

  private isPhysicsActive(): boolean {
    const snapshot = this.physicsService.snapshot();

    return snapshot.enabled && snapshot.engine !== 'none';
  }

  private applyPhysicsPostureCompensation(elapsedSeconds: number): void {
    if (this.destroyed) return;
    const options = this.options.physicsPostureCompensation;

    if (!options || !this.options.physicsMotorsCoupled || this.physicsAuthoredJointTargets.size === 0) {
      this.resetPhysicsPostureCompensation();
      return;
    }

    if (this.physicsPostureCompensationTransitionFrameActive) {
      // A compensation written on the preceding stable frame may still be the
      // active motor target. Restore the authored transition targets instead
      // of merely resetting the controller's derivative memory.
      for (const channel of options.channels) {
        const authoredTarget = this.physicsAuthoredJointTargets.get(channel.jointName);

        if (typeof authoredTarget === 'number' && Number.isFinite(authoredTarget)) {
          this.physicsService.setJointTarget(channel.jointName, {
            mode: 'position',
            value: authoredTarget
          });
        }
      }
      this.resetPhysicsPostureCompensation();
      return;
    }

    const referenceBody = this.physicsService
      .getBodyTransforms()
      .find((transform) => transform.bodyName === options.referenceBodyName);

    if (!referenceBody) {
      this.resetPhysicsPostureCompensation();
      return;
    }

    const result = resolveRobotSagittalPostureCompensation({
      options,
      rotation: referenceBody.rotation,
      authoredTargets: Object.fromEntries(this.physicsAuthoredJointTargets),
      previousTiltRadians: this.physicsPostureCompensationTiltRadians,
      elapsedSeconds
    });
    this.physicsPostureCompensationTiltRadians = result.tiltRadians;

    for (const [jointName, value] of Object.entries(result.targets)) {
      this.physicsService.setJointTarget(jointName, {
        mode: 'position',
        value
      });
    }
  }

  private resetPhysicsPostureCompensation(): void {
    this.physicsPostureCompensationTiltRadians = null;
  }

  private stepPhysics(now: number): boolean {
    if (this.destroyed) return false;
    if (this.runtimeHistoryReplayActive) {
      this.lastPhysicsStepAt = 0;
      this.resetPhysicsPostureCompensation();
      return false;
    }

    if (!this.isPhysicsActive()) {
      this.lastPhysicsStepAt = 0;
      this.resetPhysicsPostureCompensation();
      return false;
    }

    const projectilePhysicsActive = now < this.projectilePhysicsSettlingUntil;

    if (this.playbackState?.clockMode === 'manual' && !projectilePhysicsActive) {
      this.lastPhysicsStepAt = 0;
      return false;
    }

    if (this.scrubPreviewState?.active && !projectilePhysicsActive) {
      this.lastPhysicsStepAt = now;
      this.resetPhysicsPostureCompensation();
      return false;
    }

    if (
      !projectilePhysicsActive &&
      !shouldAdvanceViewerPlaybackPhysics({
        hasPlaybackState: this.playbackState !== null,
        isPlaying: this.playbackState?.isPlaying ?? false,
        bufferedProjectionActive: this.playbackState?.resolveTemporalProjectionSample !== null,
        completionTransitionActive: this.playbackCompletionTransitionState !== null,
        boundaryTransitionActive: this.boundaryPosePreviewTransitionState !== null
      })
    ) {
      this.lastPhysicsStepAt = 0;
      this.resetPhysicsPostureCompensation();
      return false;
    }

    const experimentRecording = this.temporalProjectionExperiment.isRecording();
    const physicsStepIntervalMs = resolveViewerFrameSignalIntervalMs(
      'physics-step',
      this.options.physicsStepRateHz
    );
    const elapsedSincePhysicsStepMs = this.lastPhysicsStepAt > 0 ? now - this.lastPhysicsStepAt : 0;
    let dispatchedPhysicsStep: { dt: number; durationMs: number } | null = null;
    let appliedKinematicBoundary = false;

    if (this.lastPhysicsStepAt === 0) {
      this.lastPhysicsStepAt = now;
    } else if (elapsedSincePhysicsStepMs >= physicsStepIntervalMs) {
      this.lastPhysicsStepAt = now;

      if (this.physicsKinematicHoldFrames > 0) {
        this.physicsKinematicHoldFrames -= 1;
        appliedKinematicBoundary = this.syncPhysicsKinematicPoseFromRobotPose({
          resetRoot: this.physicsKinematicHoldRootPose === null,
          rootPose: this.physicsKinematicHoldRootPose,
          resetCadence: false
        });
        if (this.physicsKinematicHoldFrames === 0) {
          this.physicsKinematicHoldRootPose = null;
        }
      } else {
        const dt = Math.min(elapsedSincePhysicsStepMs / 1000, 1 / 15);
        const physicsStepStartedAt = experimentRecording ? performance.now() : 0;
        this.applyPhysicsPostureCompensation(dt);
        this.physicsService.step(dt);
        this.markFrameSignal('physics-step');
        dispatchedPhysicsStep = {
          dt,
          durationMs: experimentRecording ? performance.now() - physicsStepStartedAt : 0
        };
      }
    }

    if (appliedKinematicBoundary || this.physicsKinematicHoldFrames > 0) {
      return false;
    }

    const bodyTransforms = this.physicsService.getBodyTransforms();
    const centerOfMass = this.physicsService.getCenterOfMass();
    const physicsSnapshot = this.physicsService.snapshot();
    const metadata = physicsSnapshot.backendStatus?.metadata;
    const stepCount = typeof metadata?.stepCount === 'number' ? metadata.stepCount : 0;
    const stateRevision = typeof metadata?.stateRevision === 'number' ? metadata.stateRevision : 0;
    const simulatedTime = typeof metadata?.simulatedTime === 'number' ? metadata.simulatedTime : 0;
    // A kinematic reset may publish a new grounded state without advancing
    // simulated time. Include the observation revision so that state is
    // projected immediately instead of waiting for the first dynamic step.
    const sampleId = `${physicsSnapshot.engine}:${physicsSnapshot.loadedSourceId ?? 'scene'}:${stepCount}:${stateRevision}`;

    if (experimentRecording && dispatchedPhysicsStep) {
      this.temporalProjectionExperiment.recordPhysicsStep({
        observedAtMs: now,
        deltaSeconds: dispatchedPhysicsStep.dt,
        stepDurationMs: dispatchedPhysicsStep.durationMs,
        stepCount,
        simulatedTimeMs: simulatedTime * 1000
      });
    }

    const receivedPhysicsSample = sampleId !== this.lastTemporalProjectionSampleId;

    if (receivedPhysicsSample) {
      this.displayedRecordedPhysicsObservation = null;
      this.markFrameSignal('physics-observation');
      this.lastTemporalProjectionSampleId = sampleId;
      this.temporalProjection.ingest({
        sampleId,
        physicsTimestampMs: simulatedTime * 1000,
        observedAtMs: now,
        discontinuityToken: this.resolveTemporalProjectionDiscontinuityToken(physicsSnapshot),
        bodyTransforms,
        jointAngles: this.capturePhysicsVisualJointAngles(),
        centerOfMass
      });
      if (this.options.physicsObservationEnabled) {
        this.options.onPhysicsObservation({
          jointAngles: this.capturePhysicsVisualJointAngles(),
          sampleId,
          observedAtMs: now,
          simulatedTimeSeconds: simulatedTime,
          centerOfMass: centerOfMass ? { ...centerOfMass } : null,
          bodyTransforms,
          navigation: this.physicsVisualRootToRobotMatrix
            ? resolveViewer3DNavigationPhysicsObservation({
                bodyTransforms,
                simulatedTimeSeconds: simulatedTime,
                defaultSceneYawRadians: this.resolvePhysicsSceneYawRadians(undefined),
                rootAlignmentMatrix: this.physicsVisualRootToRobotMatrix
              })
            : null
        });
      }
    }

    const temporalFrame = this.temporalProjection.project(now);
    if (experimentRecording && temporalFrame) {
      this.temporalProjectionExperiment.recordProjection(temporalFrame);
    }
    const shouldProjectVisualPose = receivedPhysicsSample || temporalFrame?.state === 'reconstructed';
    if (shouldProjectVisualPose) {
      this.markFrameSignal('temporal-projection');
    }
    const visualBodyTransforms = temporalFrame?.bodyTransforms ?? bodyTransforms;
    const visualCenterOfMass = temporalFrame?.centerOfMass ?? centerOfMass;
    this.projectedPhysicsBodyTransforms = visualBodyTransforms;
    this.projectedPhysicsCenterOfMass = visualCenterOfMass;
    const rootPoseChanged = shouldProjectVisualPose
      ? this.syncRobotRootFromPhysicsBody(visualBodyTransforms)
      : false;
    const jointPoseChanged = shouldProjectVisualPose
      ? temporalFrame
        ? this.syncRobotPoseFromProjectedJointAngles(temporalFrame.jointAngles)
        : this.syncRobotPoseFromPhysicsJointStates()
      : false;
    const visualPoseChanged = rootPoseChanged || jointPoseChanged;

    this.publishTemporalProjectionStatus();

    if (visualPoseChanged) {
      this.robot?.updateMatrixWorld(true);
      this.updateViewerDebugLayers();
    }

    if (receivedPhysicsSample) {
      this.updatePhysicsResetBaselineCapture();
    }

    const physicsDebugChanged = shouldProjectVisualPose && this.shouldShowAnyPhysicsDebugLayer();

    if (physicsDebugChanged) {
      this.syncPhysicsDebugTransforms(visualBodyTransforms, visualCenterOfMass);
    }

    return visualPoseChanged || physicsDebugChanged;
  }

  private capturePhysicsVisualJointAngles(): Record<string, number> {
    const values: Record<string, number> = {};

    for (const { mapping } of this.getDirectPhysicsJointMappings()) {
      if (!mapping.physicsJointName || !mapping.visualJointName) {
        continue;
      }

      const jointState = this.physicsService.getJointState(mapping.physicsJointName);
      if (typeof jointState.value !== 'number' || !Number.isFinite(jointState.value)) {
        continue;
      }

      values[mapping.visualJointName] = createVisualJointValueFromPhysics(mapping, jointState.value);
    }

    return values;
  }

  private syncRobotPoseFromProjectedJointAngles(jointAngles: Readonly<Record<string, number>>): boolean {
    if (!this.robot) {
      return false;
    }

    const joints = this.getRobotJoints();
    let didUpdate = false;
    this.isApplyingPhysicsPose = true;

    try {
      for (const [jointName, value] of Object.entries(jointAngles)) {
        const joint = joints[jointName];
        if (!joint || !Number.isFinite(value)) {
          continue;
        }

        didUpdate = this.setJointValue(joint, value) || didUpdate;
      }

      for (const mapping of this.physicsJointMappings.values()) {
        if (mapping.mode !== 'mimic' || !mapping.visualJointName || !mapping.sourceJointName) {
          continue;
        }

        const joint = joints[mapping.visualJointName];
        const sourceValue = jointAngles[mapping.sourceJointName];
        if (!joint || !Number.isFinite(sourceValue)) {
          continue;
        }

        didUpdate =
          this.setJointValue(joint, createVisualJointValueFromSource(mapping, sourceValue)) || didUpdate;
      }
    } finally {
      this.isApplyingPhysicsPose = false;
    }

    return didUpdate;
  }

  private resetTemporalProjection(): void {
    this.temporalProjectionDiscontinuitySequence += 1;
    this.lastTemporalProjectionSampleId = '';
    this.lastTemporalProjectionStatusSignature = '';
    this.projectedPhysicsBodyTransforms = [];
    this.projectedPhysicsCenterOfMass = null;
    this.clearBalanceDebug();
    this.temporalProjection.reset('discontinuity');
    if (this.temporalProjectionExperiment.isRecording()) {
      this.temporalProjectionExperiment.recordReset('discontinuity', performance.now());
    }
    this.publishTemporalProjectionStatus();
  }

  private resolveTemporalProjectionDiscontinuityToken(snapshot: PhysicsServiceSnapshot): string {
    return `${snapshot.engine}:${snapshot.loadedSourceId ?? 'scene'}:${this.temporalProjectionDiscontinuitySequence}`;
  }

  private publishTemporalProjectionStatus(): void {
    const status = this.temporalProjection.getStatus();
    const signature = `${status.mode}:${status.state}:${status.fallbackReason}:${status.bufferSize}`;

    if (signature === this.lastTemporalProjectionStatusSignature) {
      return;
    }

    this.lastTemporalProjectionStatusSignature = signature;
    this.options.onTemporalProjectionStatus(status);
  }

  private recordRuntimeHistorySample(
    now: number,
    options: { force?: boolean; timeSeconds?: number } = {}
  ): void {
    const recorder = this.options.runtimeHistory;

    if (!recorder) {
      return;
    }

    if (!recorder.isRecording()) {
      this.lastRuntimeHistorySampleAt = 0;
      return;
    }

    // A projected history sample is a read result. Recording it again would
    // create a feedback edge from the reader into its own temporal buffer.
    if (this.runtimeHistoryReplayActive) {
      return;
    }

    if (recorder.snapshot().replayState !== 'live') {
      return;
    }

    const sampleInterval = Math.max(0, this.options.runtimeHistorySampleIntervalMs);

    if (
      !options.force &&
      sampleInterval > 0 &&
      this.lastRuntimeHistorySampleAt > 0 &&
      now - this.lastRuntimeHistorySampleAt < sampleInterval
    ) {
      return;
    }

    this.lastRuntimeHistorySampleAt = now;

    const physicsSnapshot = this.physicsService.snapshot();
    const rawBodyTransforms = physicsSnapshot.enabled ? this.physicsService.getBodyTransforms() : [];
    const rawCenterOfMass = physicsSnapshot.enabled ? this.physicsService.getCenterOfMass() : null;
    // Runtime history represents the frame that was actually projected to the
    // Viewer. Persisting raw backend transforms here bypassed the producer's
    // temporal reconstruction and reintroduced contact jitter during replay.
    const bodyTransforms =
      physicsSnapshot.enabled && this.projectedPhysicsBodyTransforms.length > 0
        ? this.projectedPhysicsBodyTransforms
        : rawBodyTransforms;
    const centerOfMass = physicsSnapshot.enabled
      ? (this.projectedPhysicsCenterOfMass ?? rawCenterOfMass)
      : null;
    const visualJointStates = this.captureRuntimeHistoryVisualJointStates();
    const jointStates: Record<string, number> = {};

    if (physicsSnapshot.enabled) {
      for (const mapping of this.physicsJointMappings.values()) {
        if (!mapping.physicsJointName) {
          continue;
        }

        const jointState = this.physicsService.getJointState(mapping.physicsJointName);

        if (jointState) {
          jointStates[mapping.physicsJointName] = jointState.value;
        }
      }
    }

    const supportCenter = physicsSnapshot.enabled ? this.resolveBalanceDebugCenterOfMass() : null;
    const observedContacts = physicsSnapshot.enabled ? this.resolveBalanceDebugObservedContacts() : null;
    const supportPolygon = observedContacts === null ? [] : this.resolveBalanceDebugSupportPolygon(observedContacts);
    const supportObservation = supportCenter && observedContacts !== null
      ? { source: 'solver-ground-contacts', outside: supportPolygon.length < 3 || !this.isBalanceDebugPointInsidePolygon(supportCenter, supportPolygon),
          x: supportCenter.x, y: supportCenter.y, z: supportCenter.z }
      : null;
    recorder.recordSample({
      timeSeconds: options.timeSeconds ?? now / 1000,
      metadata: {
        projectionStage: physicsSnapshot.enabled && bodyTransforms.length > 0 ? 'simulated' : 'authored',
        ...(supportObservation ? { supportObservation } : {}),
        ...(this.playbackState?.subjectId ? { subjectId: this.playbackState.subjectId } : {})
      },
      viewer: {
        camera: this.getCameraPose(),
        joints: visualJointStates,
        playback: this.playbackState
          ? {
              sourceId: this.playbackState.sourceId ?? undefined,
              currentTime: this.playbackState.currentTime,
              isPlaying: this.playbackState.isPlaying,
              playbackRate: this.playbackState.playbackRate,
              duration: this.playbackState.duration
            }
          : undefined,
        physics: {
          engine: physicsSnapshot.engine,
          enabled: physicsSnapshot.enabled,
          motorsCoupled: this.options.physicsMotorsCoupled,
          bodyCount: bodyTransforms.length,
          jointCount: Object.keys(jointStates).length,
          centerOfMass: centerOfMass ? this.serializeRuntimeHistoryVector(centerOfMass) : null,
          bodyTransforms: bodyTransforms.map((transform) => this.serializeRuntimeHistoryTransform(transform)),
          jointStates
        }
      }
    });
    this.markFrameSignal('runtime-history');
  }

  private serializeRuntimeHistoryTransform(transform: BodyTransform): ViewerHistoryTransform<ViewerMetadata> {
    return {
      id: transform.bodyName,
      position: this.serializeRuntimeHistoryVector(transform.position),
      rotation: {
        x: transform.rotation.x,
        y: transform.rotation.y,
        z: transform.rotation.z,
        w: transform.rotation.w
      },
      scale: transform.scale ? this.serializeRuntimeHistoryVector(transform.scale) : undefined,
      sourceId: transform.sourceBodyName,
      metadata: transform.metadata ? copyViewerMetadata(transform.metadata) : undefined
    };
  }

  private subscribeRuntimeHistory(): void {
    const recorder = this.options.runtimeHistory;

    if (!recorder) {
      return;
    }

    this.unsubscribeRuntimeHistory = recorder.subscribe((snapshot) => {
      if (this.destroyed) {
        return;
      }

      this.inspectRuntimeHistorySnapshot(snapshot);
    });
  }

  private applyRuntimeHistorySample(
    sample: ViewerHistorySample<ViewerMetadata>,
    options: { preservePlaybackState?: boolean; applyCamera?: boolean } = {}
  ): boolean {
    const viewer = sample.viewer;
    if (this.comparisonProfileId) {
      const comparison = sample.metadata?.robotProfileComparison;
      this.comparisonViewerSample =
        comparison &&
        typeof comparison === 'object' &&
        !Array.isArray(comparison) &&
        comparison.profileId === this.comparisonProfileId &&
        comparison.viewer &&
        typeof comparison.viewer === 'object'
          ? (comparison.viewer as unknown as ViewerHistorySample<ViewerMetadata>['viewer'])
          : null;
      this.projectComparisonSimulation();
      const comparisonViewer = this.comparisonViewerSample;
      const comparisonBodyTransforms = (comparisonViewer?.physics?.bodyTransforms ?? []).map((transform) =>
        this.deserializeRuntimeHistoryTransform(transform, false)
      );
      if (
        comparisonViewer?.physics?.enabled &&
        comparisonBodyTransforms.length > 0 &&
        this.options.physicsObservationEnabled
      ) {
        this.options.onComparisonPhysicsObservation(this.comparisonProfileId, {
          projectionStage: 'simulated',
          sampleId: `recorded-comparison:${sample.id}:${sample.timeSeconds}`,
          observedAtMs: performance.now(),
          simulatedTimeSeconds: sample.timeSeconds,
          jointAngles: { ...(comparisonViewer.joints ?? {}) },
          bodyTransforms: structuredClone(comparisonBodyTransforms),
          centerOfMass: comparisonViewer.physics.centerOfMass
            ? { ...comparisonViewer.physics.centerOfMass }
            : null,
          navigation: null
        });
      }
    }

    if (!viewer) {
      return false;
    }

    this.isApplyingRuntimeHistorySample = true;
    let poseChanged = false;

    try {
      this.scrubPreviewState = null;
      if (!options.preservePlaybackState) {
        this.playbackState = null;
        this.playbackCompletionTransitionState = null;
        this.boundaryPosePreviewTransitionState = null;
        this.playbackSyncSignature = '';
      }

      if (options.applyCamera !== false && viewer.camera) {
        this.applyCameraPoseImmediate(
          new Vector3(viewer.camera.position.x, viewer.camera.position.y, viewer.camera.position.z),
          new Vector3(viewer.camera.target.x, viewer.camera.target.y, viewer.camera.target.z)
        );
      }

      const bodyTransforms = (viewer.physics?.bodyTransforms ?? []).map((transform) =>
        this.deserializeRuntimeHistoryTransform(transform)
      );
      const centerOfMass = viewer.physics?.centerOfMass
        ? new Vector3(
            viewer.physics.centerOfMass.x,
            viewer.physics.centerOfMass.y,
            viewer.physics.centerOfMass.z
          )
        : null;
      // Runtime-history replay is the visual authority while inspecting the
      // buffer. Debug overlays must read the same recorded frame as the robot,
      // never the last live/bake observation left in these projection fields.
      this.projectedPhysicsBodyTransforms = bodyTransforms;
      this.projectedPhysicsCenterOfMass = centerOfMass;
      if (viewer.physics?.enabled && bodyTransforms.length > 0) {
        this.displayedRecordedPhysicsObservation = {
          projectionStage: 'simulated',
          sampleId: `recorded:${sample.id}:${sample.timeSeconds}`,
          observedAtMs: performance.now(), simulatedTimeSeconds: sample.timeSeconds,
          jointAngles: { ...(viewer.joints ?? {}) },
          bodyTransforms: structuredClone(bodyTransforms),
          centerOfMass: viewer.physics.centerOfMass ? { ...viewer.physics.centerOfMass } : null,
          navigation: null
        };
        if (this.options.physicsObservationEnabled) this.options.onPhysicsObservation(structuredClone(this.displayedRecordedPhysicsObservation));
      } else {
        this.displayedRecordedPhysicsObservation = null;
      }
      const hasVisualJointStates = viewer.joints && Object.keys(viewer.joints).length > 0;
      const visualJointPoseChanged = this.applyRuntimeHistoryVisualJointStates(viewer.joints ?? null);
      poseChanged = visualJointPoseChanged;

      if (bodyTransforms.length > 0) {
        const rootPoseChanged = this.syncRobotRootFromPhysicsBody(bodyTransforms);
        const jointPoseChanged =
          visualJointPoseChanged ||
          (!hasVisualJointStates && this.applyRuntimeHistoryJointStates(viewer.physics?.jointStates ?? null));
        poseChanged = rootPoseChanged || jointPoseChanged || poseChanged;
      } else {
        const jointPoseChanged =
          visualJointPoseChanged ||
          (!hasVisualJointStates && this.applyRuntimeHistoryJointStates(viewer.physics?.jointStates ?? null));
        poseChanged = jointPoseChanged || poseChanged;
      }

      if (poseChanged) {
        this.robot?.updateMatrixWorld(true);
      }

      if (poseChanged || bodyTransforms.length > 0 || centerOfMass) {
        this.updateViewerDebugLayers();
      }

      if (bodyTransforms.length > 0 || centerOfMass) {
        this.syncPhysicsDebugTransforms(bodyTransforms, centerOfMass, { force: true });
      }
    } finally {
      this.isApplyingRuntimeHistorySample = false;
    }

    this.requestRender();
    return poseChanged;
  }

  private captureRuntimeHistoryVisualJointStates(): Record<string, number> {
    const joints = this.getRobotJoints();
    const jointStates: Record<string, number> = {};

    for (const [jointName, joint] of Object.entries(joints)) {
      const value = this.readJointValue(joint);

      if (typeof value === 'number' && Number.isFinite(value)) {
        jointStates[jointName] = value;
      }
    }

    return jointStates;
  }

  private applyRuntimeHistoryVisualJointStates(
    jointStates: Record<string, number> | null | undefined
  ): boolean {
    if (!jointStates || !this.robot) {
      return false;
    }

    const joints = this.getRobotJoints();
    let didUpdate = false;

    for (const [jointName, value] of Object.entries(jointStates)) {
      const joint = joints[jointName];

      if (!joint || typeof value !== 'number' || !Number.isFinite(value)) {
        continue;
      }

      didUpdate = this.setJointValue(joint, value, jointName) || didUpdate;
    }

    return this.reconcileRecordedMimicJoints(this.robot, jointStates) || didUpdate;
  }

  private reconcileRecordedMimicJoints(robot: Object3D, values: Readonly<Record<string, number>>): boolean {
    const joints = (robot as { joints?: Record<string, RobotJointLike> }).joints ?? {};
    const aliases = robot.userData.robotModelJointNames as Record<string, string> | undefined;
    let changed = false;
    for (const [name, joint] of Object.entries(joints)) {
      // Mimic channels are derived, never a second authority over a hand.
      // Replay can contain old dependent values alongside an updated master.
      if (joint.mimicJoint || !joint.mimicJoints?.length) continue;
      const canonical = Object.entries(aliases ?? {}).find(
        ([alias, native]) => native === name && alias !== name && Number.isFinite(values[alias])
      )?.[0];
      if (canonical) continue; // The canonical adapter performs the conversion once.
      const value = values[name];
      if (!Number.isFinite(value)) continue;
      // Do not use setJointValue's equal-value fast path: a dependent may have
      // changed even when the master itself already holds the recorded value.
      changed = joint.setJointValue(value) !== false || changed;
    }
    return changed;
  }

  private applyRuntimeHistoryJointStates(jointStates: Record<string, number> | null | undefined): boolean {
    if (!jointStates || !this.robot) {
      return false;
    }

    let didUpdate = false;
    const joints = this.getRobotJoints();

    for (const { joint, mapping } of this.getDirectPhysicsJointMappings()) {
      if (!mapping.physicsJointName) {
        continue;
      }

      const physicsValue = jointStates[mapping.physicsJointName];

      if (typeof physicsValue !== 'number' || !Number.isFinite(physicsValue)) {
        continue;
      }

      didUpdate =
        this.setJointValue(joint, createVisualJointValueFromPhysics(mapping, physicsValue)) || didUpdate;
    }

    for (const mapping of this.physicsJointMappings.values()) {
      if (mapping.mode !== 'mimic' || !mapping.visualJointName || !mapping.sourceJointName) {
        continue;
      }

      const joint = joints[mapping.visualJointName];
      const sourceJoint = joints[mapping.sourceJointName];
      const sourceValue = sourceJoint ? this.readJointValue(sourceJoint) : null;

      if (!joint || typeof sourceValue !== 'number') {
        continue;
      }

      didUpdate =
        this.setJointValue(joint, createVisualJointValueFromSource(mapping, sourceValue)) || didUpdate;
    }

    return didUpdate;
  }

  private resolveRuntimeHistoryPhysicsRootPose(sample: ViewerHistorySample<ViewerMetadata>): PhysicsRootPose | null {
    const transforms = sample.viewer?.physics?.bodyTransforms ?? [];
    const rootTransform =
      transforms.find((transform) => transform.metadata?.visualRoot === true) ??
      transforms.find((transform) => transform.id === this.physicsVisualRootBodyName);

    if (!rootTransform?.rotation) {
      return null;
    }

    const components = [
      rootTransform.position.x,
      rootTransform.position.y,
      rootTransform.position.z,
      rootTransform.rotation.x,
      rootTransform.rotation.y,
      rootTransform.rotation.z,
      rootTransform.rotation.w
    ];

    if (!components.every(Number.isFinite)) {
      return null;
    }

    return {
      position: { ...rootTransform.position },
      rotation: { ...rootTransform.rotation }
    };
  }

  private deserializeRuntimeHistoryTransform(
    transform: ViewerHistoryTransform<ViewerMetadata>,
    allowLiveFallback = true
  ): BodyTransform {
    const currentTransform = allowLiveFallback
      ? this.physicsService
          .getBodyTransforms()
          .find((bodyTransform) => bodyTransform.bodyName === transform.id)
      : undefined;

    return {
      bodyName: transform.id,
      position: {
        x: transform.position.x,
        y: transform.position.y,
        z: transform.position.z
      },
      rotation: {
        x: transform.rotation?.x ?? 0,
        y: transform.rotation?.y ?? 0,
        z: transform.rotation?.z ?? 0,
        w: transform.rotation?.w ?? 1
      },
      scale: transform.scale
        ? {
            x: transform.scale.x,
            y: transform.scale.y,
            z: transform.scale.z
          }
        : currentTransform?.scale,
      sourceBodyName: transform.sourceId ?? currentTransform?.sourceBodyName,
      metadata: transform.metadata
        ? copyViewerMetadata(transform.metadata)
        : currentTransform?.metadata
          ? copyViewerMetadata(currentTransform.metadata)
          : undefined
    };
  }

  private requestRender(): void {
    this.animationLoop.requestRender();
  }

  private scheduleLoop(): void {
    this.animationLoop.scheduleLoop();
  }

  private updateRafCadence(now: number): void {
    if (this.lastRafAt > 0) {
      const frameMs = now - this.lastRafAt;

      if (frameMs >= 4 && frameMs <= 80) {
        this.averageRafFrameMs = this.averageRafFrameMs * 0.94 + frameMs * 0.06;
        this.observedFrameRateCeiling = observeDisplayFrameRateCeiling(
          this.observedFrameRateCeiling,
          this.averageRafFrameMs
        );
      }
    }

    this.lastRafAt = now;
    this.rafFramesSinceReport += 1;
  }

  private startGlobalRafProbe(): void {
    if (
      !this.options.showStats ||
      !this.options.showGlobalRafProbe ||
      this.globalRafProbeFrame !== 0 ||
      typeof requestAnimationFrame === 'undefined'
    ) {
      return;
    }

    this.globalRafProbeFrame = requestAnimationFrame(this.runGlobalRafProbe);
  }

  private runGlobalRafProbe = (now: number): void => {
    this.globalRafProbeFrame = 0;

    if (this.destroyed) {
      return;
    }

    if (this.lastGlobalRafAt > 0) {
      const frameMs = now - this.lastGlobalRafAt;

      if (frameMs >= 4 && frameMs <= 80) {
        this.averageGlobalRafFrameMs = this.averageGlobalRafFrameMs * 0.94 + frameMs * 0.06;
      }
    }

    this.lastGlobalRafAt = now;
    this.globalRafFramesSinceReport += 1;
    this.startGlobalRafProbe();
  };

  private resetStatsCadence(now: number): void {
    this.lastRafAt = 0;
    this.lastCadenceReportAt = now;
    this.rafFramesSinceReport = 0;
    this.globalRafFramesSinceReport = 0;
    this.renderFramesSinceReport = 0;
    this.playbackFramesSinceReport = 0;
    this.scrubFramesSinceReport = 0;
    this.longTaskCountSinceReport = 0;
    this.longTaskDurationSinceReport = 0;
    this.performanceMonitor.clearSignals();
  }

  private getEffectiveTargetFrameRate(): number {
    return this.getTargetFrameRate();
  }

  private getTargetFrameRate(): number {
    return resolveDisplayFrameRateTarget(this.configuredTargetFrameRate, this.observedFrameRateCeiling);
  }

  private updateStatsCadence(now: number, force = false): void {
    const experimentRecording = this.temporalProjectionExperiment.isRecording();
    const statsVisible = !!this.statsCadenceElement && !!this.statsCadenceTextElement;

    if (!statsVisible && !experimentRecording) {
      return;
    }

    if (this.lastCadenceReportAt === 0) {
      this.lastCadenceReportAt = now;
      return;
    }

    const elapsedMs = now - this.lastCadenceReportAt;
    const liveScrubActive = this.scrubPreviewState?.active ?? false;
    const statsIntervalMs = liveScrubActive ? 1000 : 500;

    if (elapsedMs <= 0 || (!force && elapsedMs < statsIntervalMs)) {
      return;
    }

    const elapsedSeconds = elapsedMs / 1000;
    const rafFrameRate = this.rafFramesSinceReport / elapsedSeconds;
    const globalRafFrameRate = this.options.showGlobalRafProbe
      ? this.globalRafFramesSinceReport / elapsedSeconds
      : 0;
    const renderFrameRate = this.renderFramesSinceReport / elapsedSeconds;
    const hotPhase = this.getProfilerHotPhase();
    const schedulerWaitMs = Math.max(0, this.averageRafFrameMs - this.averageLoopMs);
    const targetFrameRate = this.getTargetFrameRate();
    const livePlaybackActive = this.playbackState?.isPlaying ?? false;
    const mode = livePlaybackActive
      ? 'play'
      : liveScrubActive || this.scrubFramesSinceReport > 0
        ? 'scrub'
        : this.playbackFramesSinceReport > 0
          ? 'settle'
          : 'idle';
    const documentState = this.getProfilerDocumentState();
    const callbackSummary = this.consumeToolPerformanceProbeSummary();
    const longTaskSummary =
      this.longTaskCountSinceReport > 0
        ? `${this.longTaskCountSinceReport}/${this.longTaskDurationSinceReport.toFixed(0)}ms`
        : '0';
    const globalRafSummary = this.options.showGlobalRafProbe
      ? ` | GRAF ${Math.round(globalRafFrameRate)} ${this.averageGlobalRafFrameMs.toFixed(1)}ms`
      : '';
    const sample: Viewer3DProfilerSample = {
      time: now,
      rafFrameRate,
      globalRafFrameRate,
      renderFrameRate,
      drawMs: this.averageRenderMs,
      loopMs: this.averageLoopMs,
      schedulerWaitMs,
      longTaskMs: this.longTaskDurationSinceReport
    };

    this.recordProfilerSample(sample);
    this.temporalProjectionExperiment.recordPerformance(sample);

    if (this.statsCadenceTextElement) {
      const displayFrameRateLabel =
        this.configuredTargetFrameRate === null
          ? `DISPLAY ~${Math.round(targetFrameRate)}Hz est.`
          : `DISPLAY ${Math.round(targetFrameRate)}Hz cfg.`;
      this.statsCadenceTextElement.textContent = [
        `${displayFrameRateLabel} | RAF ${Math.round(rafFrameRate)} ${this.averageRafFrameMs.toFixed(1)}ms${globalRafSummary} | RND ${Math.round(renderFrameRate)} | PR ${this.currentPixelRatio.toFixed(2)}`,
        `HOT ${hotPhase} | P ${this.averagePoseMs.toFixed(2)} C ${this.averageControlsMs.toFixed(2)} D ${this.averageRenderMs.toFixed(2)} L ${this.averageLoopMs.toFixed(2)}ms`,
        `M ${mode} | DOC ${documentState} | WAIT ${schedulerWaitMs.toFixed(2)}ms | TMR ${this.averageProfilerTimerDelayMs.toFixed(2)}ms | LT ${longTaskSummary}`,
        this.formatPlaybackProfilerState(),
        `GL ${this.lastRenderCalls}c ${this.formatCompactCount(this.lastRenderTriangles)}t | SIG ${this.formatProfilerSignals(elapsedSeconds)}`,
        `CB ${callbackSummary}`
      ].join('\n');
    }

    if (statsVisible && !liveScrubActive) {
      this.drawStatsHistoryGraph();
    }
    this.rafFramesSinceReport = 0;
    this.globalRafFramesSinceReport = 0;
    this.renderFramesSinceReport = 0;
    this.playbackFramesSinceReport = 0;
    this.scrubFramesSinceReport = 0;
    this.longTaskCountSinceReport = 0;
    this.longTaskDurationSinceReport = 0;
    this.performanceMonitor.clearSignals();
    this.lastCadenceReportAt = now;
  }

  private recordProfilerSample(sample: Viewer3DProfilerSample): void {
    this.performanceMonitor.recordSample(sample);
  }

  private getProfilerDocumentState(): string {
    const visible = typeof document === 'undefined' || document.visibilityState === 'visible' ? 'v' : 'h';
    const focused = typeof document === 'undefined' || document.hasFocus() ? 'f' : 'blur';
    const viewport = this.viewportVisible ? 'vp' : 'out';

    return `${visible}/${focused}/${viewport}`;
  }

  private formatPlaybackProfilerState(): string {
    const scrub = this.scrubPreviewState;

    if (scrub?.active) {
      return [
        'V scrub',
        `t ${scrub.currentTime.toFixed(2)}>${scrub.targetTime.toFixed(2)}`,
        `d ${scrub.duration.toFixed(2)}`,
        `sf ${this.scrubFramesSinceReport}`
      ].join(' | ');
    }

    const playback = this.playbackState;

    if (!playback) {
      return 'V -';
    }

    const now = typeof performance === 'undefined' ? Date.now() : performance.now();
    const duration = playback.duration;
    const rangeStart = Math.max(0, playback.workRange?.start ?? 0);
    const rawRangeEnd = playback.workRange?.end ?? duration;
    const rangeEnd = rawRangeEnd > rangeStart ? rawRangeEnd : duration;
    const elapsedSeconds = Math.max(0, (now - playback.syncedAt) / 1000);
    const liveTime = playback.isPlaying
      ? Math.min(rangeEnd, playback.currentTime + elapsedSeconds * playback.playbackRate)
      : playback.currentTime;
    const remainingTime = Math.max(0, rangeEnd - liveTime);
    const playbackMode = playback.isPlaying ? 'play' : 'stop';
    const loopMode = playback.loopPlayback ? 'loop' : 'once';

    return [
      `V ${playbackMode}/${loopMode}`,
      `t ${liveTime.toFixed(2)}/${duration.toFixed(2)}`,
      `r ${rangeStart.toFixed(2)}-${rangeEnd.toFixed(2)}`,
      `rem ${remainingTime.toFixed(2)}`
    ].join(' | ');
  }

  private formatProfilerSignals(elapsedSeconds: number): string {
    return this.performanceMonitor.formatSignals(elapsedSeconds);
  }

  private markFrameSignal(signalId: ViewerFrameSignalId): void {
    if (!this.options.showStats && !this.temporalProjectionExperiment.isRecording()) {
      return;
    }

    this.performanceMonitor.markSignal(VIEWER_FRAME_SIGNAL_CATALOG[signalId].profilerLabel);
  }

  private consumeToolPerformanceProbeSummary(): string {
    const globalWithProbe = globalThis as typeof globalThis & {
      __konitifToolPerformanceProbe?: ViewerPerformanceProbeGlobal;
    };

    return globalWithProbe.__konitifToolPerformanceProbe?.consume().formatTop() ?? '-';
  }

  private startProfilerTimerProbe(): void {
    if (!this.options.showStats || this.profilerTimerProbe !== null || typeof window === 'undefined') {
      return;
    }

    this.lastProfilerTimerProbeAt = performance.now();
    this.profilerTimerProbe = window.setInterval(() => {
      const now = performance.now();
      const delayMs = Math.max(
        0,
        now - this.lastProfilerTimerProbeAt - ROBOT_VIEWER_PROFILER_TIMER_INTERVAL_MS
      );
      this.lastProfilerTimerProbeAt = now;
      this.averageProfilerTimerDelayMs = this.updateProfilerAverage(
        this.averageProfilerTimerDelayMs,
        delayMs
      );
    }, ROBOT_VIEWER_PROFILER_TIMER_INTERVAL_MS);
  }

  private stopProfilerTimerProbe(): void {
    if (this.profilerTimerProbe === null || typeof window === 'undefined') {
      return;
    }

    window.clearInterval(this.profilerTimerProbe);
    this.profilerTimerProbe = null;
  }

  private drawStatsHistoryGraph(): void {
    const canvas = this.statsGraphCanvas;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    const pixelRatio = Math.max(
      1,
      Math.min(typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1, 2)
    );
    const width = ROBOT_VIEWER_PROFILER_GRAPH_WIDTH;
    const height = ROBOT_VIEWER_PROFILER_GRAPH_HEIGHT;
    const deviceWidth = Math.round(width * pixelRatio);
    const deviceHeight = Math.round(height * pixelRatio);

    if (canvas.width !== deviceWidth || canvas.height !== deviceHeight) {
      canvas.width = deviceWidth;
      canvas.height = deviceHeight;
    }

    context.save();
    context.scale(pixelRatio, pixelRatio);
    context.clearRect(0, 0, width, height);
    context.fillStyle = 'rgba(8, 24, 44, 0.62)';
    context.fillRect(0, 0, width, height);

    this.drawStatsGraphGrid(context, width, height);

    const latestSample = this.performanceMonitor.samples[this.performanceMonitor.samples.length - 1];

    if (!latestSample) {
      context.restore();
      return;
    }

    const fpsMax = this.getProfilerFpsCeiling();
    const msMax = this.getProfilerMsCeiling();

    if (this.options.showGlobalRafProbe) {
      this.drawStatsGraphSeries(
        context,
        (sample) => sample.globalRafFrameRate,
        fpsMax,
        3,
        4,
        width - 6,
        25,
        '#38bdf8'
      );
    }
    this.drawStatsGraphSeries(
      context,
      (sample) => sample.rafFrameRate,
      fpsMax,
      3,
      4,
      width - 6,
      25,
      '#67e8f9'
    );
    this.drawStatsGraphSeries(
      context,
      (sample) => sample.renderFrameRate,
      fpsMax,
      3,
      4,
      width - 6,
      25,
      '#22c55e'
    );
    this.drawStatsGraphSeries(
      context,
      (sample) => sample.schedulerWaitMs,
      msMax,
      3,
      36,
      width - 6,
      23,
      '#fb7185'
    );
    this.drawStatsGraphSeries(context, (sample) => sample.loopMs, msMax, 3, 36, width - 6, 23, '#f59e0b');
    this.drawStatsGraphSeries(context, (sample) => sample.drawMs, msMax, 3, 36, width - 6, 23, '#a78bfa');

    context.fillStyle = 'rgba(226, 246, 255, 0.78)';
    context.font = '600 8px Helvetica, Arial, sans-serif';
    context.fillText(
      `${this.options.showGlobalRafProbe ? '60s GRAF/RAF/RND' : '60s RAF/RND'} max ${Math.round(fpsMax)}`,
      5,
      9
    );
    context.fillText(`WAIT/LOOP/DRAW p95 ${msMax.toFixed(1)}ms`, 5, 40);
    context.restore();
  }

  private drawStatsGraphGrid(context: CanvasRenderingContext2D, width: number, height: number): void {
    context.strokeStyle = 'rgba(103, 232, 249, 0.14)';
    context.lineWidth = 1;

    for (const y of [16, 31, 48, height - 1]) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }

    for (const x of [0, width * 0.25, width * 0.5, width * 0.75, width - 1]) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }
  }

  private drawStatsGraphSeries(
    context: CanvasRenderingContext2D,
    readValue: (sample: Viewer3DProfilerSample) => number,
    valueMax: number,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string
  ): void {
    const latestSample = this.performanceMonitor.samples[this.performanceMonitor.samples.length - 1];

    if (!latestSample || this.performanceMonitor.samples.length < 2) {
      return;
    }

    context.strokeStyle = color;
    context.lineWidth = 1.3;
    context.beginPath();

    let started = false;

    for (const sample of this.performanceMonitor.samples) {
      const age = latestSample.time - sample.time;
      const pointX = x + width - Math.min(1, age / ROBOT_VIEWER_PROFILER_HISTORY_MS) * width;
      const normalizedValue = Math.max(0, Math.min(1, readValue(sample) / valueMax));
      const pointY = y + height - normalizedValue * height;

      if (!started) {
        context.moveTo(pointX, pointY);
        started = true;
      } else {
        context.lineTo(pointX, pointY);
      }
    }

    context.stroke();
  }

  private getProfilerFpsCeiling(): number {
    const observedMax = this.performanceMonitor.samples.reduce(
      (max, sample) => Math.max(max, sample.rafFrameRate, sample.renderFrameRate),
      this.getTargetFrameRate()
    );

    return Math.max(60, Math.ceil(observedMax / 30) * 30);
  }

  private getProfilerMsCeiling(): number {
    const targetFrameMs = 1000 / this.getTargetFrameRate();
    const latestSample = this.performanceMonitor.samples[this.performanceMonitor.samples.length - 1];
    const values = this.performanceMonitor.samples
      .flatMap((sample) => [sample.schedulerWaitMs, sample.loopMs, sample.drawMs, sample.longTaskMs])
      .filter((value) => Number.isFinite(value) && value >= 0)
      .sort((left, right) => left - right);
    const percentileIndex = Math.max(0, Math.min(values.length - 1, Math.floor(values.length * 0.95)));
    const percentileValue = values[percentileIndex] ?? targetFrameMs;
    const latestValue = latestSample
      ? Math.max(
          latestSample.schedulerWaitMs,
          latestSample.loopMs,
          latestSample.drawMs,
          latestSample.longTaskMs
        )
      : targetFrameMs;
    const observedMax = Math.min(
      ROBOT_VIEWER_PROFILER_MS_GRAPH_MAX,
      Math.max(targetFrameMs, percentileValue, latestValue)
    );

    return Math.max(targetFrameMs, Math.ceil(observedMax * 1.2));
  }

  private observeMainThreadLongTasks(): void {
    if (this.longTaskObserver || typeof PerformanceObserver === 'undefined') {
      return;
    }

    const supportedEntryTypes = (
      PerformanceObserver as typeof PerformanceObserver & { supportedEntryTypes?: readonly string[] }
    ).supportedEntryTypes;

    if (supportedEntryTypes && !supportedEntryTypes.includes('longtask')) {
      return;
    }

    try {
      this.longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.longTaskCountSinceReport += 1;
          this.longTaskDurationSinceReport += entry.duration;
        }
      });
      this.longTaskObserver.observe({ type: 'longtask', buffered: false });
    } catch {
      this.longTaskObserver = null;
    }
  }

  private updateProfilerAverage(currentAverage: number, sampleMs: number): number {
    return this.performanceMonitor.updateAverage(currentAverage, sampleMs);
  }

  private getProfilerHotPhase(): string {
    const phases = [
      { label: 'pose', value: this.averagePoseMs },
      { label: 'ctl', value: this.averageControlsMs },
      { label: 'draw', value: this.averageRenderMs }
    ];
    const hotPhase = phases.reduce((best, phase) => (phase.value > best.value ? phase : best), phases[0]);

    return `${hotPhase.label} ${hotPhase.value.toFixed(2)}ms`;
  }

  private formatCompactCount(value: number): string {
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}m`;
    }

    if (value >= 10_000) {
      return `${Math.round(value / 1000)}k`;
    }

    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }

    return String(value);
  }

  private disposeObject3D(object: Object3D): void {
    object.traverse((child) => {
      const mesh = child as Mesh;
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }

      const material = mesh.material;
      if (Array.isArray(material)) {
        material.forEach((entry) => this.disposeMaterial(entry));
      } else {
        this.disposeMaterial(material);
      }
    });
  }

  private configureObservedRobotGhostMaterials(robot: Object3D): void {
    this.observedRobotGhostMaterialBaselines.clear();
    this.observedRobotGhostRenderOrderBaselines.clear();
    this.observedRobotGhostShadowMaterials.clear();
    robot.traverse((child) => {
      const mesh = child as Mesh;
      const sourceMaterials = Array.isArray(mesh.material)
        ? mesh.material
        : mesh.material
          ? [mesh.material]
          : [];
      if (sourceMaterials.length === 0) return;

      const ghostMaterials = sourceMaterials.map((source) => {
        const material = source.clone();
        this.captureMaterialBaseline(material, this.observedRobotGhostMaterialBaselines);
        return material;
      });
      mesh.material = Array.isArray(mesh.material) ? ghostMaterials : ghostMaterials[0]!;
      this.observedRobotGhostRenderOrderBaselines.set(mesh, mesh.renderOrder);
      const shadowMaterial = new MeshDepthMaterial({
        alphaHash: true,
        opacity: this.options.showObservedRobotGhost ? this.robotComparisonAppearance.observed.opacity : 0
      });
      mesh.customDepthMaterial = shadowMaterial;
      this.observedRobotGhostShadowMaterials.set(mesh, shadowMaterial);
    });
    this.observedRobotGhostShadowOpacity = this.options.showObservedRobotGhost
      ? this.robotComparisonAppearance.observed.opacity
      : 0;
  }

  private applyObservedRobotGhostRenderOrder(translucent: boolean): void {
    for (const [mesh, baselineRenderOrder] of this.observedRobotGhostRenderOrderBaselines) {
      // Opaque incarnations must participate in the scene's ordinary depth
      // ordering. A dedicated order is useful only while the observed robot is
      // deliberately translucent, when all of its parts form one comparison
      // overlay rendered after the opaque robot shell.
      mesh.renderOrder = translucent
        ? Math.max(baselineRenderOrder, ROBOT_VIEWER_OBSERVED_GHOST_RENDER_ORDER)
        : baselineRenderOrder;
    }
  }

  private applyObservedRobotGhostShadowOpacity(opacity: number): void {
    const nextOpacity = MathUtils.clamp(opacity, 0, 1);
    this.observedRobotGhostShadowOpacity = nextOpacity;
    for (const [mesh, material] of this.observedRobotGhostShadowMaterials) {
      material.opacity = nextOpacity;
      mesh.castShadow =
        nextOpacity > 0.000001 &&
        this.options.showVisualGround &&
        (this.visualGroundLayer?.getConfig().components.receiveShadows ?? true);
    }
  }

  private clearObservedRobotGhost(): void {
    this.cancelRobotComparisonVisibilityTransition();
    this.observedRobotPresentation.reset('discontinuity');
    this.simulatedRobotPresentationRoot.position.x = 0;
    this.simulatedRobotPresentationRoot.updateMatrixWorld(true);
    this.applyPhysicsDebugPresentationTransform();
    this.observedRobotPresentationRoot.position.set(0, 0, 0);
    this.observedRobotTemporalSupportAnchorState = null;
    for (const material of this.observedRobotGhostShadowMaterials.values()) {
      material.dispose();
    }
    this.observedRobotGhostShadowMaterials.clear();
    this.observedRobotGhostShadowOpacity = 0;
    if (!this.observedRobotGhost) {
      this.applyBalanceDebugPresentationOffset();
      return;
    }
    this.observedRobotGhost.parent?.remove(this.observedRobotGhost);
    this.observedRobotGhost.traverse((child) => {
      const mesh = child as Mesh;
      const material = mesh.material;
      if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
      else material?.dispose();
    });
    this.observedRobotGhost = null;
    this.observedRobotGhostBaseQuaternion.identity();
    this.observedRobotGhostBaseScale.set(1, 1, 1);
    this.observedRobotGhostMaterialBaselines.clear();
    this.observedRobotGhostRenderOrderBaselines.clear();
    this.observedRobotGrounding = resolveObservedRobotGroundingProjection({
      enabled: false,
      floorY: ROBOT_VIEWER_SUPPORT_FLOOR_Y,
      supportMinimumY: null,
      source: 'robot-bounds'
    });
    this.observedRobotSupportInclination = resolveObservedRobotSupportInclinationProjection({
      enabled: false,
      supportPoints: []
    });
    this.applyBalanceDebugPresentationOffset();
  }

  private applyRobotComparisonAppearance(): void {
    this.applyMaterialAppearance(this.robotMaterialBaselines, this.robotComparisonAppearance.simulated);
    this.applyMaterialAppearance(
      this.observedRobotGhostMaterialBaselines,
      this.robotComparisonAppearance.observed
    );
    this.applyObservedRobotGhostRenderOrder(this.robotComparisonAppearance.observed.opacity < 0.999);

    const observedRobotVisible = this.options.showObservedRobotGhost && this.observedRobotGhost !== null;
    this.applyObservedRobotGhostShadowOpacity(
      observedRobotVisible ? this.robotComparisonAppearance.observed.opacity : 0
    );

    this.simulatedRobotPresentationRoot.position.x = 0;
    this.simulatedRobotPresentationRoot.visible =
      !observedRobotVisible || this.robotComparisonAppearance.mode !== 'observed-only';

    if (this.observedRobotGhost) {
      this.observedRobotGhost.position.copy(this.observedRobotGhostBasePosition);
      this.observedRobotGhost.quaternion.copy(this.observedRobotGhostBaseQuaternion);
      this.observedRobotGhost.scale.copy(this.observedRobotGhostBaseScale);
      if (observedRobotVisible && this.robotComparisonAppearance.mode === 'offset') {
        if (this.robotComparisonAppearance.centeredSeparation) {
          const halfSeparation = this.robotComparisonAppearance.offsetMeters / 2;
          this.simulatedRobotPresentationRoot.position.x = -halfSeparation;
          this.observedRobotGhost.position.x += halfSeparation;
        } else {
          this.observedRobotGhost.position.x += this.robotComparisonAppearance.offsetMeters;
        }
      }
      if (observedRobotVisible) this.applyObservedRobotGhostGrounding();
    }

    this.simulatedRobotPresentationRoot.updateMatrixWorld(true);
    this.applyPhysicsDebugPresentationTransform();
    this.applyNavigationPreviewPresentationTransform();
    this.applyBalanceDebugPresentationOffset();
    this.updateBalanceDebugVisibility();
    this.refreshPoseHandleProjection();
    if (this.poseControlTarget === 'observed') {
      this.updateViewerDebugLayers({ poseHandles: false });
    }
  }

  private applyObservedRobotGhostGrounding(): void {
    if (this.comparisonProfileId) {
      this.projectComparisonSimulation();
      return;
    }
    const robot = this.observedRobotGhost;

    if (!robot) {
      this.observedRobotGrounding = resolveObservedRobotGroundingProjection({
        enabled: false,
        floorY: ROBOT_VIEWER_SUPPORT_FLOOR_Y,
        supportMinimumY: null,
        source: 'robot-bounds'
      });
      return;
    }

    // Recompute from the immutable model-space baseline on every observed
    // frame. This prevents inferred offsets from accumulating over time while
    // retaining the configured comparison separation.
    robot.position.copy(this.observedRobotGhostBasePosition);
    if (this.robotComparisonAppearance.mode === 'offset') {
      robot.position.x += this.robotComparisonAppearance.centeredSeparation
        ? this.robotComparisonAppearance.offsetMeters / 2
        : this.robotComparisonAppearance.offsetMeters;
    }
    robot.quaternion.copy(this.observedRobotGhostBaseQuaternion);
    robot.updateMatrixWorld(true);

    const supportContacts = this.resolveObservedRobotSupportContacts(robot);
    const supportPoints = supportContacts.supportPoints;
    const activeSupport = resolveObservedRobotActiveSupportProjection({
      supportPoints,
      contactIds: supportContacts.contactIds,
      supportGroupIds: supportContacts.supportGroupIds,
      previousActiveContactIds: this.observedRobotTemporalSupportAnchorState?.activeContactIds
    });
    const footGeometryBounds = this.resolveRobotFootSupportBounds(robot);
    const bodyEnvelopeBounds = this.resolveObservedRobotBodyEnvelopeBounds(robot);
    const footSupportEligibility = resolveObservedRobotFootSupportEligibility({
      footGeometryMinimumY: this.resolveFiniteBoundsMinimumY(footGeometryBounds),
      bodyEnvelopeMinimumY: this.resolveFiniteBoundsMinimumY(bodyEnvelopeBounds)
    });
    this.observedRobotSupportInclination = resolveObservedRobotSupportInclinationProjection({
      enabled: this.options.groundObservedRobotGhost,
      supportEligible: footSupportEligibility.eligible,
      supportPoints: activeSupport.supportPoints
    });

    if (this.observedRobotSupportInclination.status === 'corrected') {
      const correction = this.observedRobotSupportInclination.correctionQuaternion;
      robot.quaternion.premultiply(new Quaternion(correction.x, correction.y, correction.z, correction.w));
      robot.updateMatrixWorld(true);

      // The authored robot root sits around the torso. Preserve the support
      // centroid so completing roll/pitch behaves as a rotation around the
      // contact polygon rather than making the feet slide across the floor.
      const correctedSupportPoints = this.selectObservedRobotSupportPoints(
        this.resolveObservedRobotSupportContacts(robot),
        activeSupport.activeContactIds
      );
      const supportAnchor = resolveObservedRobotSupportAnchorProjection({
        supportEligible: footSupportEligibility.eligible,
        supportPointsBefore: activeSupport.supportPoints,
        supportPointsAfter: correctedSupportPoints
      });
      robot.position.x += supportAnchor.offsetX;
      robot.position.z += supportAnchor.offsetZ;
      robot.updateMatrixWorld(true);
    }

    const temporallyAnchoredSupportPoints = this.selectObservedRobotSupportPoints(
      this.resolveObservedRobotSupportContacts(robot),
      activeSupport.activeContactIds
    );
    const temporalSupportAnchor = resolveObservedRobotTemporalSupportAnchorProjection({
      previousState: this.observedRobotTemporalSupportAnchorState,
      supportEligible:
        this.options.groundObservedRobotGhost &&
        footSupportEligibility.eligible &&
        activeSupport.status === 'resolved',
      supportPoints: temporallyAnchoredSupportPoints,
      activeIndices: activeSupport.activeIndices,
      activeContactIds: activeSupport.activeContactIds
    });
    this.observedRobotTemporalSupportAnchorState = temporalSupportAnchor.state;
    robot.position.x += temporalSupportAnchor.offsetX;
    robot.position.z += temporalSupportAnchor.offsetZ;
    robot.updateMatrixWorld(true);

    const observedSupport = this.resolveObservedRobotSupport(robot, activeSupport.activeContactCount);

    this.observedRobotGrounding = resolveObservedRobotGroundingProjection({
      enabled: this.options.groundObservedRobotGhost,
      floorY: ROBOT_VIEWER_SUPPORT_FLOOR_Y,
      supportMinimumY: observedSupport.supportMinimumY,
      supportContactCount: observedSupport.supportContactCount,
      source: observedSupport.source
    });
    robot.position.y += this.observedRobotGrounding.offsetY;
    robot.updateMatrixWorld(true);
    this.applyNavigationPreviewPresentationTransform();
  }

  private resolveObservedRobotSupportContacts(robot: Object3D): {
    supportPoints: Vector3[];
    contactIds: string[];
    supportGroupIds: string[];
  } {
    const supportPoints: Vector3[] = [];
    const contactIds: string[] = [];
    const supportGroupIds: string[] = [];

    for (const contact of this.options.supportDefinition?.contacts ?? []) {
      const contactFrame = this.resolveObjectFromRobot(robot, contact.names);

      if (!contactFrame) continue;

      const contactPoint = contactFrame.getWorldPosition(new Vector3());
      if (
        Number.isFinite(contactPoint.x) &&
        Number.isFinite(contactPoint.y) &&
        Number.isFinite(contactPoint.z)
      ) {
        supportPoints.push(contactPoint);
        contactIds.push(contact.id);
        supportGroupIds.push(contact.groupId);
      }
    }

    return { supportPoints, contactIds, supportGroupIds };
  }

  private resolveObservedRobotSupportContactPoints(robot: Object3D): Vector3[] {
    return this.resolveObservedRobotSupportContacts(robot).supportPoints;
  }

  private selectObservedRobotSupportPoints(
    contacts: {
      supportPoints: readonly Vector3[];
      contactIds: readonly string[];
    },
    activeContactIds: readonly string[]
  ): Vector3[] {
    const activeContactIdSet = new Set(activeContactIds);
    return contacts.supportPoints.filter((_, index) =>
      activeContactIdSet.has(contacts.contactIds[index] ?? '')
    );
  }

  private resolveObservedRobotSupport(
    robot: Object3D,
    knownSupportContactCount?: number
  ): {
    supportMinimumY: number | null;
    supportContactCount: number;
    source:
      | 'foot-contact-anchors'
      | 'foot-geometry'
      | 'collision-guided-render-envelope'
      | 'collision-envelope'
      | 'robot-bounds';
  } {
    let contactMinimumY = Number.POSITIVE_INFINITY;
    let supportContactCount = knownSupportContactCount ?? 0;

    // FSR frames are semantic contact evidence. Their origins sit inside the
    // foot assembly, though, and are not necessarily on the visible sole.
    const supportPoints = this.resolveObservedRobotSupportContactPoints(robot);
    for (const contactPoint of supportPoints) {
      contactMinimumY = Math.min(contactMinimumY, contactPoint.y);
    }
    if (knownSupportContactCount === undefined) supportContactCount = supportPoints.length;

    const footGeometryMinimumY = this.resolveFiniteBoundsMinimumY(this.resolveRobotFootSupportBounds(robot));
    const collisionEnvelopeMinimumY = this.resolveFiniteBoundsMinimumY(
      this.resolveObservedRobotCollisionBounds(robot)
    );
    const robotBoundsMinimumY = this.resolveFiniteBoundsMinimumY(
      this.resolveObservedRobotRenderedBounds(robot)
    );

    return resolveObservedRobotSupportSurface({
      contactMinimumY: Number.isFinite(contactMinimumY) ? contactMinimumY : null,
      supportContactCount,
      footGeometryMinimumY,
      collisionEnvelopeMinimumY,
      robotBoundsMinimumY
    });
  }

  private resolveFiniteBoundsMinimumY(bounds: Box3 | null): number | null {
    return bounds && !bounds.isEmpty() && Number.isFinite(bounds.min.y) ? bounds.min.y : null;
  }

  private resolveObservedRobotBodyEnvelopeBounds(robot: Object3D): Box3 | null {
    return this.resolveObservedRobotCollisionBounds(robot) ?? this.resolveObservedRobotRenderedBounds(robot);
  }

  private resolveObservedRobotCollisionBounds(robot: Object3D): Box3 | null {
    return this.resolveObservedRobotMeshBounds(robot, (mesh) =>
      Boolean((mesh as Mesh & { isURDFCollider?: boolean }).isURDFCollider)
    );
  }

  private resolveObservedRobotRenderedBounds(robot: Object3D): Box3 | null {
    return this.resolveObservedRobotMeshBounds(
      robot,
      (mesh) => !(mesh as Mesh & { isURDFCollider?: boolean }).isURDFCollider
    );
  }

  private resolveObservedRobotMeshBounds(robot: Object3D, accepts: (mesh: Mesh) => boolean): Box3 | null {
    const bounds = new Box3();
    const meshBounds = new Box3();

    robot.updateMatrixWorld(true);
    robot.traverse((node) => {
      if (!(node instanceof Mesh) || !node.geometry || !accepts(node)) return;
      if (!node.geometry.boundingBox) node.geometry.computeBoundingBox();
      if (!node.geometry.boundingBox) return;
      meshBounds.copy(node.geometry.boundingBox).applyMatrix4(node.matrixWorld);
      bounds.union(meshBounds);
    });

    return bounds.isEmpty() ? null : bounds;
  }

  private resolveRobotFootSupportBounds(robot: Object3D): Box3 | null {
    const bounds = new Box3();
    const footBounds = (this.options.supportDefinition?.geometryGroups ?? [])
      .map((names) => this.resolveRobotSupportGeometryBounds(robot, names))
      .filter((candidateBounds): candidateBounds is Box3 => candidateBounds !== null);

    for (const candidateBounds of footBounds) bounds.union(candidateBounds);
    return bounds.isEmpty() ? null : bounds;
  }

  private groundSimulatedRobotOnSupportFloor(robot: Object3D): void {
    robot.updateMatrixWorld(true);
    const { bounds } = this.resolveRobotSupportBounds(robot);

    if (bounds.isEmpty() || !Number.isFinite(bounds.min.y)) {
      return;
    }

    const offsetY = ROBOT_VIEWER_SUPPORT_FLOOR_Y - bounds.min.y;
    // Reject malformed asset bounds rather than teleporting an entire scene.
    if (!Number.isFinite(offsetY) || Math.abs(offsetY) > 1) {
      return;
    }

    robot.position.y += offsetY;
    robot.updateMatrixWorld(true);
  }

  private resolveRobotSupportBounds(robot: Object3D): {
    bounds: Box3;
    source: 'foot-geometry' | 'robot-bounds';
  } {
    const bounds = this.resolveRobotFootSupportBounds(robot) ?? new Box3();

    if (!bounds.isEmpty()) {
      return { bounds, source: 'foot-geometry' };
    }

    bounds.setFromObject(robot, true);
    return { bounds, source: 'robot-bounds' };
  }

  private resolveRobotSupportGeometryBounds(robot: Object3D, candidates: readonly string[]): Box3 | null {
    // FSR frames are useful semantic anchors but are intentionally empty in
    // an articulated model. Resolve the first candidate that owns rendered geometry
    // instead of accepting an empty frame and falling back to whole-body
    // bounds, which left the soles visibly above the support floor.
    for (const candidate of candidates) {
      const supportObject = this.resolveObjectFromRobot(robot, [candidate]);

      if (!supportObject) {
        continue;
      }

      const candidateBounds = new Box3().setFromObject(supportObject, true);

      if (!candidateBounds.isEmpty() && Number.isFinite(candidateBounds.min.y)) {
        return candidateBounds;
      }
    }

    return null;
  }

  private captureMaterialBaselines(root: Object3D, target: Map<Material, Viewer3DMaterialBaseline>): void {
    root.traverse((child) => {
      const mesh = child as Mesh;
      const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
      materials.forEach((material) => this.captureMaterialBaseline(material, target));
    });
  }

  private captureMaterialBaseline(material: Material, target: Map<Material, Viewer3DMaterialBaseline>): void {
    const color = (material as Material & { color?: Color }).color;
    target.set(material, {
      color: color?.clone() ?? null,
      depthTest: material.depthTest,
      depthWrite: material.depthWrite,
      opacity: material.opacity,
      transparent: material.transparent
    });
  }

  private readComparisonOpacityFactor(
    baselines: Map<Material, Viewer3DMaterialBaseline>,
    configuredOpacity: number
  ): number {
    for (const [material, baseline] of baselines) {
      const configuredMaterialOpacity = baseline.opacity * configuredOpacity;
      if (configuredMaterialOpacity <= 0.000001) continue;
      return Math.min(1, Math.max(0, material.opacity / configuredMaterialOpacity));
    }
    return 1;
  }

  private applyComparisonOpacityFactor(
    baselines: Map<Material, Viewer3DMaterialBaseline>,
    configuredOpacity: number,
    factor: number
  ): void {
    const opacityFactor = Math.min(1, Math.max(0, factor));
    for (const [material, baseline] of baselines) {
      const nextOpacity = baseline.opacity * configuredOpacity * opacityFactor;
      const nextTransparent = baseline.transparent || nextOpacity < 0.999;
      material.opacity = nextOpacity;
      if (material.transparent !== nextTransparent) {
        material.transparent = nextTransparent;
        material.needsUpdate = true;
      }
      if (nextOpacity < 0.999) {
        material.depthTest = true;
        // A fully transparent incarnation must not leave an invisible depth
        // shell over the other robot during the staged appearance.
        material.depthWrite = nextOpacity > 0.000001;
      } else {
        material.depthTest = baseline.depthTest;
        material.depthWrite = baseline.depthWrite;
      }
    }
  }

  private startRobotComparisonVisibilityTransition(transition: {
    simulatedX: number;
    observedX: number;
    simulatedVisible: boolean;
    observedVisible: boolean;
    simulatedOpacity: number;
    observedOpacity: number;
    finalSimulatedX: number;
    finalSimulatedVisible: boolean;
    finalObservedVisible: boolean;
    durationMs: number;
  }): void {
    const observedRobot = this.observedRobotGhost;
    if (!observedRobot) return;

    const startedAt = performance.now();
    const durationMs = Math.max(1, transition.durationMs);
    const finalObservedOpacity = transition.finalObservedVisible ? 1 : 0;
    const appearing = finalObservedOpacity > transition.observedOpacity;
    const poseHandleTransition = this.poseHandleTargetTransitionState;
    if (poseHandleTransition && poseHandleTransition.comparisonAppearing !== null) {
      poseHandleTransition.startedAt = startedAt;
      poseHandleTransition.durationMs = durationMs;
    }

    this.simulatedRobotPresentationRoot.visible =
      transition.simulatedVisible || transition.finalSimulatedVisible;
    observedRobot.visible = transition.observedVisible || transition.finalObservedVisible;
    this.robotComparisonVisibilityTransition = {
      ...transition,
      observedRobot,
      startedAt,
      durationMs,
      appearing
    };
    this.updateRobotComparisonVisibilityTransition(startedAt);
    this.requestRender();
  }

  private updateRobotComparisonVisibilityTransition(now: number): boolean {
    const transition = this.robotComparisonVisibilityTransition;
    if (!transition) return false;
    if (this.destroyed || this.observedRobotGhost !== transition.observedRobot) {
      this.robotComparisonVisibilityTransition = null;
      return false;
    }

    const progress = Math.min(1, Math.max(0, (now - transition.startedAt) / transition.durationMs));
    const phases = resolveRobotComparisonVisibilityTransitionPhases(progress, transition.appearing);
    const layoutEased = easeViewerTransition(phases.layoutProgress);
    const opacityEased = easeViewerTransition(phases.opacityProgress);
    const finalSimulatedOpacity = transition.finalSimulatedVisible ? 1 : 0;
    const finalObservedOpacity = transition.finalObservedVisible ? 1 : 0;
    this.simulatedRobotPresentationRoot.position.x = MathUtils.lerp(
      transition.simulatedX,
      transition.finalSimulatedX,
      layoutEased
    );
    const observedPresentationX = MathUtils.lerp(
      transition.observedX,
      transition.observedRobot.position.x,
      layoutEased
    );
    // Grounding and this projection now run in the same Viewer frame. The root
    // compensates the latest local telemetry transform, never the previous one.
    this.observedRobotPresentationRoot.position.x =
      observedPresentationX - transition.observedRobot.position.x;
    this.applyComparisonOpacityFactor(
      this.robotMaterialBaselines,
      this.robotComparisonAppearance.simulated.opacity,
      MathUtils.lerp(transition.simulatedOpacity, finalSimulatedOpacity, opacityEased)
    );
    const observedOpacity = MathUtils.lerp(transition.observedOpacity, finalObservedOpacity, opacityEased);
    this.applyComparisonOpacityFactor(
      this.observedRobotGhostMaterialBaselines,
      this.robotComparisonAppearance.observed.opacity,
      observedOpacity
    );
    this.applyObservedRobotGhostShadowOpacity(
      this.robotComparisonAppearance.observed.opacity * observedOpacity
    );
    this.applyObservedRobotGhostRenderOrder(observedOpacity < 0.999);
    this.simulatedRobotPresentationRoot.updateMatrixWorld(true);
    this.observedRobotPresentationRoot.updateMatrixWorld(true);
    this.applyPhysicsDebugPresentationTransform();
    this.applyNavigationPreviewPresentationTransform();
    this.refreshPoseHandleProjection();
    if (this.options.showContactPoints) this.updateContactPoints();
    if (this.options.showBalanceDebug) this.updateBalanceDebug();
    this.applyBalanceDebugPresentationOffset();

    if (progress < 1) return true;

    this.robotComparisonVisibilityTransition = null;
    this.simulatedRobotPresentationRoot.position.x = transition.finalSimulatedX;
    this.observedRobotPresentationRoot.position.x = 0;
    this.simulatedRobotPresentationRoot.visible = transition.finalSimulatedVisible;
    transition.observedRobot.visible = transition.finalObservedVisible;
    if (!transition.finalObservedVisible) {
      this.observedRobotPresentation.reset('discontinuity');
    }
    this.applyMaterialAppearance(this.robotMaterialBaselines, this.robotComparisonAppearance.simulated);
    this.applyMaterialAppearance(
      this.observedRobotGhostMaterialBaselines,
      this.robotComparisonAppearance.observed
    );
    this.applyObservedRobotGhostRenderOrder(this.robotComparisonAppearance.observed.opacity < 0.999);
    this.applyObservedRobotGhostShadowOpacity(
      transition.finalObservedVisible ? this.robotComparisonAppearance.observed.opacity : 0
    );
    this.applyPhysicsDebugPresentationTransform();
    this.applyNavigationPreviewPresentationTransform();
    this.refreshPoseHandleProjection();
    this.visualGroundLayer?.requestReflectionRefresh();
    return true;
  }

  private cancelRobotComparisonVisibilityTransition(): void {
    const transition = this.robotComparisonVisibilityTransition;
    this.robotComparisonVisibilityTransition = null;
    if (!transition || this.observedRobotGhost !== transition.observedRobot) return;

    // Cancellation must still settle the semantic visibility authority. This
    // prevents an unrelated presentation update from leaving the fading clone
    // mounted forever after REAL has already transitioned to OFF.
    transition.observedRobot.visible = this.options.showObservedRobotGhost;
    this.applyObservedRobotGhostShadowOpacity(
      this.options.showObservedRobotGhost ? this.robotComparisonAppearance.observed.opacity : 0
    );
    if (!this.options.showObservedRobotGhost) {
      this.observedRobotPresentation.reset('discontinuity');
    }
  }

  private applyMaterialAppearance(
    baselines: Map<Material, Viewer3DMaterialBaseline>,
    appearance: Viewer3DRobotComparisonAppearance['observed']
  ): void {
    const tint = new Color(appearance.tint);
    const neutralTint = tint.getHex() === 0xffffff;
    const comparisonTransparencyActive = appearance.opacity < 0.999;

    for (const [material, baseline] of baselines) {
      const color = (material as Material & { color?: Color }).color;
      if (color && baseline.color) {
        color.copy(baseline.color);
        if (!neutralTint) color.lerp(tint, 0.42);
      }

      material.opacity = baseline.opacity * appearance.opacity;
      material.transparent = baseline.transparent || material.opacity < 0.999;
      if (comparisonTransparencyActive) {
        // A translucent comparison robot still owns a coherent visible shell,
        // whether it is the observed ghost or the virtual incarnation.
        // Keeping depth writes enabled prevents rear/internal faces from being
        // blended over front faces and gives later helpers (notably the floor
        // grid) a surface against which they can depth-test.
        material.depthTest = true;
        material.depthWrite = true;
      } else {
        // At full opacity the robot is an ordinary scene surface. Restore the
        // source depth contract instead of retaining the overlay policy from a
        // previous translucent comparison mode.
        material.depthTest = baseline.depthTest;
        material.depthWrite = baseline.depthWrite;
      }
      material.needsUpdate = true;
    }
  }

  private disposeMaterial(
    material: { dispose?: () => void; map?: { dispose?: () => void } } | null | undefined
  ): void {
    material?.map?.dispose?.();
    material?.dispose?.();
  }

  private resolveRobotObject(candidates: readonly string[]): Object3D | null {
    const robot = this.robot as
      | (Object3D & {
          frames?: Record<string, Object3D>;
          joints?: Record<string, RobotJointLike>;
        })
      | null;

    if (!robot) {
      return null;
    }

    for (const candidate of candidates) {
      const frame = robot.frames?.[candidate];

      if (frame) {
        return frame;
      }

      const joint = robot.joints?.[candidate] as (Object3D & RobotJointLike) | undefined;

      if (joint) {
        return joint;
      }

      const object = robot.getObjectByName(candidate);

      if (object) {
        return object;
      }
    }

    return null;
  }

  private resolveObjectFromRobot(root: Object3D, candidates: readonly string[]): Object3D | null {
    const robot = root as Object3D & {
      frames?: Record<string, Object3D>;
      joints?: Record<string, RobotJointLike>;
    };

    for (const candidate of candidates) {
      const frame = robot.frames?.[candidate];
      if (frame) return frame;

      const joint = robot.joints?.[candidate] as (Object3D & RobotJointLike) | undefined;
      if (joint) return joint;

      const object = robot.getObjectByName(candidate);
      if (object) return object;
    }

    return null;
  }

  private getPoseControlRobot(): Object3D | null {
    return this.poseControlTarget === 'observed' ? this.observedRobotGhost : this.robot;
  }

  private resolvePoseControlObject(candidates: readonly string[]): Object3D | null {
    const root = this.getPoseControlRobot();
    return root ? this.resolveObjectFromRobot(root, candidates) : null;
  }

  private resolveRobotCameraFocusFrame(target: Viewer3DPoseControlTarget): RobotCameraFocusFrame | null {
    const root = target === 'observed' ? this.observedRobotGhost : this.robot;
    if (!root) return null;

    root.updateWorldMatrix(true, false);
    const semanticAnchor = this.resolveObjectFromRobot(root, this.options.cameraFocusAnchorNames ?? []);
    const anchor = semanticAnchor
      ? semanticAnchor.getWorldPosition(new Vector3())
      : new Box3().setFromObject(root).getCenter(new Vector3());

    if (![anchor.x, anchor.y, anchor.z].every(Number.isFinite)) return null;

    return {
      anchor,
      orientation: root.getWorldQuaternion(new Quaternion())
    };
  }

  /**
   * Camera presets are authored in the normalized simulated-robot frame. Map
   * their world-space offset into the selected incarnation without applying
   * the model normalization twice. This keeps the existing visual directions
   * for SIM while allowing REAL yaw/orientation to drive the same preset.
   */
  private resolvePoseControlCameraOffset(offset: Vector3): Vector3 {
    const activeRobot = this.getPoseControlRobot();
    const referenceOrientation = this.defaultRobotTransform?.quaternion;

    if (!referenceOrientation || !activeRobot) {
      return offset;
    }

    activeRobot.updateWorldMatrix(true, false);
    const activeOrientation = activeRobot.getWorldQuaternion(new Quaternion());
    return resolveRelativeRobotCameraOffset(offset, referenceOrientation, activeOrientation);
  }

  private getPoseControlJoints(): Record<string, RobotJointLike> {
    return ((this.getPoseControlRobot() as { joints?: Record<string, RobotJointLike> } | null)?.joints ??
      {}) as Record<string, RobotJointLike>;
  }

  private getRobotJoints(): Record<string, RobotJointLike> {
    return ((this.robot as { joints?: Record<string, RobotJointLike> | undefined })?.joints ?? {}) as Record<
      string,
      RobotJointLike
    >;
  }

  private syncObservedRobotGhostFromSimulatedRobot(): boolean {
    if (!this.robot || !this.observedRobotGhost) return false;
    const sourceJoints = this.getRobotJoints();
    const targetJoints =
      (this.observedRobotGhost as { joints?: Record<string, RobotJointLike> }).joints ?? {};
    let changed = false;

    for (const [jointName, targetJoint] of Object.entries(targetJoints)) {
      const sourceJoint = sourceJoints[jointName];
      if (!sourceJoint) continue;
      const value = this.readJointValue(sourceJoint);
      if (typeof value !== 'number' || !Number.isFinite(value)) continue;
      const targetValue = this.readJointValue(targetJoint);
      if (typeof targetValue === 'number' && Math.abs(targetValue - value) < 0.000001) continue;
      changed = targetJoint.setJointValue(value) !== false || changed;
    }

    if (changed) this.applyObservedRobotGhostGrounding();
    return changed;
  }

  private setJointValue(joint: RobotJointLike, value: number, jointName?: string): boolean {
    const currentValue = this.readJointValue(joint);

    if (typeof currentValue === 'number' && Math.abs(currentValue - value) < 0.000001) {
      return false;
    }

    const didUpdate = joint.setJointValue(value) !== false;

    if (didUpdate) {
      this.syncPhysicsJointTarget(jointName, value);
    }

    return didUpdate;
  }

  private applyAuthoredJointValue(joint: RobotJointLike, value: number, jointName: string): boolean {
    if (this.scrubPreviewState?.active) {
      return this.setJointValue(joint, value, jointName);
    }

    if (this.shouldSyncPhysicsJointTargets() && this.syncPhysicsJointTarget(jointName, value)) {
      return false;
    }

    return this.setJointValue(joint, value, jointName);
  }

  /**
   * Applies a transient desired pose to the visual incarnation only.
   *
   * Timeline authoring is a reader/manipulator of the authored projection, not
   * a physics command. Routing this value through setJointValue() or
   * applyAuthoredJointValue() would update the coupled physics target and defer
   * the visible result until the simulator publishes another observation.
   */
  private applyDesiredProjectionJointValue(joint: RobotJointLike, value: number): boolean {
    const currentValue = this.readJointValue(joint);

    if (typeof currentValue === 'number' && Math.abs(currentValue - value) < 0.000001) {
      return false;
    }

    return joint.setJointValue(value) !== false;
  }

  private syncPhysicsJointTarget(jointName: string | undefined, value: number): boolean {
    if (this.destroyed) return false;
    if (!this.shouldSyncPhysicsJointTargets()) {
      return false;
    }

    if (!jointName) {
      return false;
    }

    const mapping = this.resolvePhysicsJointMapping(jointName);

    if (!mapping) {
      return false;
    }

    if (mapping.mode !== 'direct' || !mapping.physicsJointName) {
      return false;
    }

    const physicsTargetValue = createPhysicsJointTargetValue(mapping, value);
    this.physicsAuthoredJointTargets.set(mapping.physicsJointName, physicsTargetValue);
    this.physicsService.setJointTarget(mapping.physicsJointName, {
      mode: 'position',
      value: physicsTargetValue
    });
    return true;
  }

  private syncPhysicsJointTargetsFromRobotPose(): void {
    if (this.destroyed) return;
    if (!this.shouldSyncPhysicsJointTargets()) {
      if (!this.options.physicsMotorsCoupled) {
        this.physicsService.clearJointTargets();
      }

      return;
    }

    this.physicsAuthoredJointTargets.clear();

    for (const { joint, mapping } of this.getDirectPhysicsJointMappings()) {
      const value = this.readJointValue(joint);

      if (typeof value !== 'number' || !mapping.physicsJointName) {
        continue;
      }

      const physicsTargetValue = createPhysicsJointTargetValue(mapping, value);
      this.physicsAuthoredJointTargets.set(mapping.physicsJointName, physicsTargetValue);
      this.physicsService.setJointTarget(mapping.physicsJointName, {
        mode: 'position',
        value: physicsTargetValue
      });
    }
  }

  private createPhysicsJointTargetsFromRobotPose(): Record<string, JointTarget> {
    const targets: Record<string, JointTarget> = {};
    for (const { joint, mapping } of this.getDirectPhysicsJointMappings()) {
      const value = this.readJointValue(joint);

      if (typeof value !== 'number' || !mapping.physicsJointName) {
        continue;
      }

      targets[mapping.physicsJointName] = {
        mode: 'position',
        value: createPhysicsJointTargetValue(mapping, value)
      };
    }

    return targets;
  }

  private createPhysicsJointTargetsFromAuthoredTargets(): Record<string, JointTarget> {
    return Object.fromEntries(
      Array.from(this.physicsAuthoredJointTargets, ([jointName, value]) => [
        jointName,
        { mode: 'position' as const, value }
      ])
    );
  }

  private syncPhysicsKinematicPoseFromRobotPose(
    options: {
      holdFrames?: number;
      resetRoot?: boolean;
      rootPose?: PhysicsRootPose | null;
      clearDynamics?: boolean;
      resetCadence?: boolean;
    } = {}
  ): boolean {
    if (!this.shouldSyncPhysicsKinematicPose()) {
      return false;
    }

    return this.syncPhysicsKinematicPoseTargets(this.createPhysicsJointTargetsFromRobotPose(), options);
  }

  private syncPhysicsKinematicPoseFromAuthoredTargets(
    options: {
      holdFrames?: number;
      resetRoot?: boolean;
      rootPose?: PhysicsRootPose | null;
      clearDynamics?: boolean;
      resetCadence?: boolean;
    } = {}
  ): boolean {
    if (!this.shouldSyncPhysicsKinematicPose() || this.physicsAuthoredJointTargets.size === 0) {
      return false;
    }

    return this.syncPhysicsKinematicPoseTargets(this.createPhysicsJointTargetsFromAuthoredTargets(), options);
  }

  /**
   * Materializes an unbuffered timeline pose as a grounded initial condition.
   *
   * Buffered temporal samples already own their recorded root/physics state
   * and must never pass through this path. For live authored playback, the
   * visual support and the physics support are aligned atomically so the first
   * simulation step cannot inherit a stale, airborne root transform.
   */
  private alignUnbufferedPlaybackPoseToSupportFloor(): boolean {
    const robot = this.robot;

    if (!robot) {
      return false;
    }

    this.groundSimulatedRobotOnSupportFloor(robot);

    if (!this.isPhysicsActive()) {
      return false;
    }

    const syncOptions = {
      // Keep the dynamic solver behind the kinematic boundary until the
      // worker has published the grounded pose. Without this hold, an async
      // worker can advance gravity from its previous root height between the
      // authored first frame and the accepted support-floor observation.
      holdFrames: PHYSICS_RESET_KINEMATIC_HOLD_FRAMES,
      resetRoot: true,
      clearDynamics: true,
      resetCadence: true
    } as const;

    return (
      this.syncPhysicsKinematicPoseFromAuthoredTargets(syncOptions) ||
      this.syncPhysicsKinematicPoseFromRobotPose(syncOptions)
    );
  }

  private syncPhysicsKinematicPoseTargets(
    targets: Record<string, JointTarget>,
    options: {
      holdFrames?: number;
      resetRoot?: boolean;
      rootPose?: PhysicsRootPose | null;
      clearDynamics?: boolean;
      resetCadence?: boolean;
    }
  ): boolean {
    if (this.destroyed) return false;
    if (options.resetCadence !== false) {
      this.lastPhysicsStepAt = 0;
      const currentStateRevision = this.resolvePhysicsStateRevision();

      if (currentStateRevision !== null) {
        this.physicsProjectionMinimumStateRevision = Math.max(
          this.physicsProjectionMinimumStateRevision ?? 0,
          currentStateRevision + 1
        );
      }
    }
    this.rememberPhysicsAuthoredJointTargets(targets);
    this.resetPhysicsPostureCompensation();
    this.physicsService.syncKinematicPose(targets, {
      resetRoot: options.resetRoot ?? true,
      rootPose: options.rootPose ?? undefined,
      clearDynamics: options.clearDynamics ?? true,
      retainTargets: true
    });

    if (options.holdFrames !== undefined) {
      this.physicsKinematicHoldFrames = Math.max(this.physicsKinematicHoldFrames, options.holdFrames);
      this.physicsKinematicHoldRootPose = options.rootPose
        ? {
            position: { ...options.rootPose.position },
            rotation: { ...options.rootPose.rotation }
          }
        : null;
    }
    return true;
  }

  private rememberPhysicsAuthoredJointTargets(targets: Readonly<Record<string, JointTarget>>): void {
    this.physicsAuthoredJointTargets.clear();

    for (const [jointName, target] of Object.entries(targets)) {
      if (typeof target.value === 'number' && Number.isFinite(target.value)) {
        this.physicsAuthoredJointTargets.set(jointName, target.value);
      }
    }
  }

  private schedulePhysicsResetBaselineCapture(): void {
    if (!this.options.physicsMotorsCoupled || !this.robot || !this.isPhysicsActive()) {
      this.physicsResetBaselineCaptureFrames = 0;
      return;
    }

    this.physicsResetBaselineCaptureFrames = this.physicsResetBaselineCaptureFrameCount;
  }

  private updatePhysicsResetBaselineCapture(): void {
    if (this.physicsResetBaselineCaptureFrames <= 0) {
      return;
    }

    if (
      !this.robot ||
      !this.options.physicsMotorsCoupled ||
      this.scrubPreviewState?.active ||
      this.playbackState ||
      this.runtimeHistoryReplayActive
    ) {
      return;
    }

    this.physicsResetBaselineCaptureFrames -= 1;

    if (this.physicsResetBaselineCaptureFrames > 0) {
      return;
    }

    this.capturePhysicsResetBaseline();
  }

  private capturePhysicsResetBaseline(): void {
    const robot = this.robot;

    if (!robot) {
      return;
    }

    robot.updateMatrixWorld(true);

    if (!this.canCapturePhysicsResetBaseline(robot)) {
      this.physicsResetPose = null;
      this.physicsResetRobotTransform = null;
      return;
    }

    this.physicsResetPose = this.captureJointPose();
    this.physicsResetRobotTransform = this.captureRobotTransform(robot);
  }

  private canCapturePhysicsResetBaseline(robot: Object3D): boolean {
    const defaultTransform = this.defaultRobotTransform;

    if (!defaultTransform) {
      return true;
    }

    const positionDelta = robot.position.distanceTo(defaultTransform.position);
    const rotationDelta = robot.quaternion.angleTo(defaultTransform.quaternion);

    return positionDelta <= 0.08 && rotationDelta <= 0.35;
  }

  private shouldSyncPhysicsKinematicPose(): boolean {
    if (this.isApplyingRuntimeHistorySample || this.isApplyingPhysicsPose) {
      return false;
    }

    if (!this.options.physicsMotorsCoupled || !this.robot) {
      return false;
    }

    const snapshot = this.physicsService.snapshot();

    return snapshot.enabled && snapshot.engine !== 'none';
  }

  private syncRobotPoseFromPhysicsJointStates(): boolean {
    if (!this.robot) {
      return false;
    }

    const joints = this.getRobotJoints();
    let didUpdate = false;

    this.isApplyingPhysicsPose = true;

    try {
      for (const { joint, mapping } of this.getDirectPhysicsJointMappings()) {
        if (!mapping.physicsJointName) {
          continue;
        }

        const jointState = this.physicsService.getJointState(mapping.physicsJointName);

        if (typeof jointState.value !== 'number' || !Number.isFinite(jointState.value)) {
          continue;
        }

        didUpdate =
          this.setJointValue(joint, createVisualJointValueFromPhysics(mapping, jointState.value)) ||
          didUpdate;
      }

      for (const mapping of this.physicsJointMappings.values()) {
        if (mapping.mode !== 'mimic' || !mapping.visualJointName || !mapping.sourceJointName) {
          continue;
        }

        const joint = joints[mapping.visualJointName];
        const sourceJoint = joints[mapping.sourceJointName];
        const sourceValue = sourceJoint ? this.readJointValue(sourceJoint) : null;

        if (!joint || typeof sourceValue !== 'number') {
          continue;
        }

        didUpdate =
          this.setJointValue(joint, createVisualJointValueFromSource(mapping, sourceValue)) || didUpdate;
      }
    } finally {
      this.isApplyingPhysicsPose = false;
    }

    return didUpdate;
  }

  private syncRobotRootFromPhysicsBody(bodyTransforms: readonly BodyTransform[]): boolean {
    if (!this.robot || !this.physicsVisualRootBodyName) {
      return false;
    }

    if (!this.acceptFreshPhysicsRootProjection()) {
      return false;
    }

    const rootTransform =
      bodyTransforms.find((bodyTransform) => bodyTransform.metadata?.visualRoot === true) ??
      bodyTransforms.find((bodyTransform) => bodyTransform.bodyName === this.physicsVisualRootBodyName);

    if (!rootTransform) {
      return false;
    }

    const physicsRootWorldMatrix = this.createPhysicsBodyViewerWorldMatrix(rootTransform);
    const isInitialAuthorityProjection = this.physicsVisualRootToRobotMatrix === null;
    const previousPresentedY = this.robot.position.y + this.simulatedRobotPresentationRoot.position.y;

    if (!this.physicsVisualRootToRobotMatrix) {
      this.physicsVisualRootToRobotMatrix = this.resolvePhysicsVisualRootToRobotMatrix(
        physicsRootWorldMatrix,
        bodyTransforms
      );
    }

    const nextRobotWorldMatrix = physicsRootWorldMatrix.clone().multiply(this.physicsVisualRootToRobotMatrix);
    const parent = this.robot.parent;
    const nextRobotLocalMatrix = nextRobotWorldMatrix.clone();

    if (parent && parent !== this.simulatedRobotPresentationRoot) {
      parent.updateMatrixWorld(true);
      nextRobotLocalMatrix.premultiply(parent.matrixWorld.clone().invert());
    }

    this.robot.matrix.copy(nextRobotLocalMatrix);
    this.robot.matrix.decompose(this.robot.position, this.robot.quaternion, this.robot.scale);

    if (isInitialAuthorityProjection && !this.isApplyingRuntimeHistorySample) {
      this.beginSimulatedRobotInitializationPresentation(previousPresentedY);
    }

    this.robot.updateMatrixWorld(true);
    return true;
  }

  private beginSimulatedRobotInitializationPresentation(previousPresentedY: number): void {
    const robot = this.robot;

    if (!robot) {
      return;
    }

    const offsetY = previousPresentedY - robot.position.y;

    if (!Number.isFinite(offsetY) || Math.abs(offsetY) < 0.0005) {
      this.simulatedRobotPresentationRoot.position.y = 0;
      this.simulatedRobotInitializationOffsetFromY = 0;
      this.simulatedRobotInitializationOffsetStartedAt = null;
      this.applyPhysicsDebugPresentationTransform();
      return;
    }

    this.simulatedRobotPresentationRoot.position.y = offsetY;
    this.simulatedRobotInitializationOffsetFromY = offsetY;
    this.simulatedRobotInitializationOffsetStartedAt = performance.now();
    this.simulatedRobotPresentationRoot.updateMatrixWorld(true);
    this.applyPhysicsDebugPresentationTransform();
  }

  private updateSimulatedRobotInitializationPresentation(now: number): boolean {
    const startedAt = this.simulatedRobotInitializationOffsetStartedAt;

    if (startedAt === null) {
      return false;
    }

    const progress = MathUtils.clamp(
      (now - startedAt) / ROBOT_VIEWER_INITIAL_ROOT_PRESENTATION_SETTLE_MS,
      0,
      1
    );
    const eased = 1 - Math.pow(1 - progress, 3);

    this.simulatedRobotPresentationRoot.position.y = MathUtils.lerp(
      this.simulatedRobotInitializationOffsetFromY,
      0,
      eased
    );
    this.simulatedRobotPresentationRoot.updateMatrixWorld(true);
    this.applyPhysicsDebugPresentationTransform();

    if (progress >= 1) {
      this.simulatedRobotPresentationRoot.position.y = 0;
      this.simulatedRobotInitializationOffsetFromY = 0;
      this.simulatedRobotInitializationOffsetStartedAt = null;
    }

    return true;
  }

  private resolvePhysicsStateRevision(): number | null {
    const stateRevision = this.physicsService.snapshot().backendStatus?.metadata?.stateRevision;

    return typeof stateRevision === 'number' && Number.isFinite(stateRevision) ? stateRevision : null;
  }

  private acceptFreshPhysicsRootProjection(): boolean {
    if (this.isApplyingRuntimeHistorySample || this.physicsProjectionMinimumStateRevision === null) {
      return true;
    }

    const stateRevision = this.resolvePhysicsStateRevision();

    if (stateRevision === null || stateRevision < this.physicsProjectionMinimumStateRevision) {
      return false;
    }

    this.physicsProjectionMinimumStateRevision = null;
    return true;
  }

  private resolvePhysicsVisualRootToRobotMatrix(
    physicsRootWorldMatrix: Matrix4,
    bodyTransforms: readonly BodyTransform[]
  ): Matrix4 {
    if (!this.robot) {
      return new Matrix4().identity();
    }

    this.robot.updateMatrixWorld(true);
    const robotPresentationWorldInverse = this.robot.matrixWorld.clone().invert();
    const robotAuthorityMatrix =
      this.robot.parent === this.simulatedRobotPresentationRoot
        ? this.robot.matrix.clone()
        : this.robot.matrixWorld.clone();
    const physicsRootWorldInverse = physicsRootWorldMatrix.clone().invert();
    const candidates = [...bodyTransforms]
      .filter((bodyTransform) => this.physicsVisualBodyObjectNames.has(bodyTransform.bodyName))
      .sort(
        (left, right) =>
          this.getPhysicsRootCalibrationScore(right) - this.getPhysicsRootCalibrationScore(left)
      );

    for (const bodyTransform of candidates) {
      const visualObject = this.resolveRobotObject(
        this.physicsVisualBodyObjectNames.get(bodyTransform.bodyName) ?? []
      );

      if (!visualObject) {
        continue;
      }

      visualObject.updateMatrixWorld(true);
      const physicsBodyWorldMatrix = this.createPhysicsBodyViewerWorldMatrix(bodyTransform);
      const physicsBodyLocalToRoot = physicsRootWorldInverse.clone().multiply(physicsBodyWorldMatrix);
      const visualBodyLocalToRobot = robotPresentationWorldInverse.clone().multiply(visualObject.matrixWorld);

      if (Math.abs(visualBodyLocalToRobot.determinant()) < 0.000001) {
        continue;
      }

      return physicsBodyLocalToRoot.multiply(visualBodyLocalToRobot.clone().invert());
    }

    return physicsRootWorldMatrix.clone().invert().multiply(robotAuthorityMatrix);
  }

  private getPhysicsRootCalibrationScore(bodyTransform: BodyTransform): number {
    if (bodyTransform.metadata?.visualRoot === true) {
      return 100;
    }

    if (bodyTransform.metadata?.support === true) {
      return 80;
    }

    if (bodyTransform.metadata?.contact === true) {
      return 70;
    }

    if (bodyTransform.metadata?.role === 'auxiliary') {
      return 20;
    }

    return 40;
  }

  private createPhysicsBodyViewerWorldMatrix(bodyTransform: BodyTransform): Matrix4 {
    const bodyMatrix = new Matrix4().compose(
      new Vector3(bodyTransform.position.x, bodyTransform.position.y, bodyTransform.position.z),
      new Quaternion(
        bodyTransform.rotation.x,
        bodyTransform.rotation.y,
        bodyTransform.rotation.z,
        bodyTransform.rotation.w
      ),
      new Vector3(1, 1, 1)
    );

    return this.createPhysicsCoordinateFrameMatrix(bodyTransform).multiply(bodyMatrix);
  }

  private createPhysicsCoordinateFrameMatrix(bodyTransform: BodyTransform): Matrix4 {
    return new Matrix4().makeRotationFromQuaternion(
      this.createPhysicsCoordinateFrameQuaternion(bodyTransform)
    );
  }

  private createPhysicsCoordinateFrameQuaternion(bodyTransform: BodyTransform): Quaternion {
    const coordinateFrame = bodyTransform.metadata?.coordinateFrame;
    const yaw = coordinateFrame === 'mujoco-z-up' || coordinateFrame === 'z-up'
      ? this.resolvePhysicsSceneYawRadians(bodyTransform.metadata?.sceneYawRadians)
      : 0;
    return createViewerPhysicsFrameQuaternion(coordinateFrame, yaw);
  }

  private resolvePhysicsSceneYawRadians(value: unknown): number {
    return resolveViewerSceneYaw(value, this.physicsVisualAlignmentProfile?.sceneYawRadians);
  }

  private shouldSyncPhysicsJointTargets(): boolean {
    if (this.isApplyingRuntimeHistorySample || this.isApplyingPhysicsPose) {
      return false;
    }

    if (!this.options.physicsMotorsCoupled || !this.robot) {
      return false;
    }

    const snapshot = this.physicsService.snapshot();

    return snapshot.enabled && snapshot.engine !== 'none';
  }

  private resolvePhysicsJointMapping(jointName: string): ViewerPhysicsJointBinding | null {
    return resolveViewerJointMapping(jointName, this.physicsJointMappings, this.physicsAuxiliaryJointNames);
  }

  private getDirectPhysicsJointMappings(): Array<{ joint: RobotJointLike; mapping: ViewerPhysicsJointBinding }> {
    return selectDirectViewerJointMappings(
      this.getRobotJoints(), this.physicsJointMappings, this.physicsAuxiliaryJointNames
    );
  }



  private readJointValue(joint: RobotJointLike): number | null {
    if (typeof joint.jointValue === 'number') {
      return joint.jointValue;
    }

    if (Array.isArray(joint.jointValue) && typeof joint.jointValue[0] === 'number') {
      return joint.jointValue[0];
    }

    return typeof joint.angle === 'number' ? joint.angle : null;
  }

  private resolveJointValueRatio(joint: RobotJointLike): number | null {
    const value = this.readJointValue(joint);
    const lower = joint.limit?.lower;
    const upper = joint.limit?.upper;

    if (
      typeof value !== 'number' ||
      typeof lower !== 'number' ||
      typeof upper !== 'number' ||
      !Number.isFinite(value) ||
      !Number.isFinite(lower) ||
      !Number.isFinite(upper) ||
      upper <= lower
    ) {
      return null;
    }

    return MathUtils.clamp((value - lower) / (upper - lower), 0, 1);
  }

  private captureJointPose(): Record<string, number> {
    const joints = this.getRobotJoints();
    const pose: Record<string, number> = {};

    for (const [name, joint] of Object.entries(joints)) {
      const value = this.readJointValue(joint);

      if (typeof value === 'number') {
        pose[name] = value;
      }
    }

    return pose;
  }

  private captureJointPoseForTargets(jointIds: readonly string[]): Record<string, number> {
    const joints = this.getRobotJoints();
    const pose: Record<string, number> = {};

    for (const jointId of jointIds) {
      const joint = joints[jointId];

      if (!joint) {
        continue;
      }

      const value = this.readJointValue(joint);

      if (typeof value === 'number') {
        pose[jointId] = value;
      }
    }

    return pose;
  }

  private resetPoseEditState(): void {
    this.poseEditBaseline = this.captureJointPose();
    this.dirtyPose = false;
    this.dirtyPoseJointIds.clear();
    this.dispatchPoseEditChange('reset');
  }

  private ensurePoseEditBaseline(): void {
    if (!this.poseEditBaseline) {
      this.poseEditBaseline = this.captureJointPose();
    }
  }

  private markPoseEditDirty(jointIds: readonly string[]): void {
    this.ensurePoseEditBaseline();

    for (const jointId of jointIds) {
      this.dirtyPoseJointIds.add(jointId);
    }

    this.dirtyPose = true;
    this.dispatchPoseEditChange('change');
  }

  private dispatchPoseEditChange(
    action: Viewer3DPoseEditDetail['action'],
    jointIds: string[] = [...this.dirtyPoseJointIds],
    jointValues: Record<string, number> = this.captureJointPoseForTargets(jointIds)
  ): void {
    if (typeof CustomEvent === 'undefined') {
      return;
    }

    this.container.dispatchEvent(
      new CustomEvent<Viewer3DPoseEditDetail>('workbench:robot-viewer-pose-edit-change', {
        bubbles: true,
        detail: {
          dirty: this.dirtyPose,
          jointIds,
          jointValues,
          action
        }
      })
    );
  }

  private dispatchJointHoverChange(
    jointIds: readonly string[],
    options: { activeJointIds?: readonly string[]; phase?: Viewer3DJointHoverDetail['phase'] } = {}
  ): void {
    const normalizedJointIds = Array.from(
      new Set(
        jointIds.filter((jointId): jointId is string => typeof jointId === 'string' && jointId.length > 0)
      )
    );
    const normalizedActiveJointIds = Array.from(
      new Set(
        (options.activeJointIds ?? []).filter(
          (jointId): jointId is string => typeof jointId === 'string' && jointId.length > 0
        )
      )
    );
    const signature = `${options.phase ?? 'hover'}:${normalizedJointIds.join('|')}:${normalizedActiveJointIds.join('|')}`;

    if (this.lastDispatchedJointHoverSignature === signature) {
      return;
    }

    this.lastDispatchedJointHoverSignature = signature;

    if (typeof CustomEvent === 'undefined') {
      return;
    }

    this.container.dispatchEvent(
      new CustomEvent<Viewer3DJointHoverDetail>(ROBOT_VIEWER_JOINT_HOVER_EVENT, {
        bubbles: true,
        detail: {
          jointIds: normalizedJointIds,
          ...(normalizedActiveJointIds.length > 0 ? { activeJointIds: normalizedActiveJointIds } : {}),
          ...(options.phase ? { phase: options.phase } : {})
        }
      })
    );
  }

  private restoreLastAnimatedPose(): boolean {
    if (!this.defaultPose || this.lastAnimatedJointTargets.size === 0) {
      this.lastAnimatedJointTargets.clear();
      this.nextAnimatedJointTargets.clear();
      return false;
    }

    const joints = this.getRobotJoints();
    let poseChanged = false;

    for (const name of this.lastAnimatedJointTargets) {
      const value = this.defaultPose[name];

      if (typeof value === 'number' && joints[name]) {
        poseChanged = this.applyAuthoredJointValue(joints[name], value, name) || poseChanged;
      }
    }

    this.lastAnimatedJointTargets.clear();
    this.nextAnimatedJointTargets.clear();
    return poseChanged;
  }

  private restoreInactiveAnimatedJoints(
    joints: Record<string, RobotJointLike>,
    nextAnimatedJointTargets: Set<string>
  ): boolean {
    if (!this.defaultPose) {
      return false;
    }

    let poseChanged = false;

    for (const name of this.lastAnimatedJointTargets) {
      if (nextAnimatedJointTargets.has(name)) {
        continue;
      }

      const value = this.defaultPose[name];

      if (typeof value === 'number' && joints[name]) {
        poseChanged = this.applyAuthoredJointValue(joints[name], value, name) || poseChanged;
      }
    }

    return poseChanged;
  }

  private updateViewerDebugLayers(options: { poseHandles?: boolean } = {}): void {
    if (this.options.showContactPoints) {
      this.updateContactPoints();
    }

    if (this.options.showEyeRingDebug || this.options.showEyeRingMire) {
      this.updateEyeRingDebug();
    }

    if (this.options.showBalanceDebug) {
      this.updateBalanceDebug();
    }

    if (
      options.poseHandles !== false &&
      this.shouldShowInteractionHandles() &&
      this.options.showPoseHandles
    ) {
      this.updatePoseHandles();
    }
  }

  private shouldEnableCameraControls(): boolean {
    return this.options.controlsEnabled;
  }

  private shouldShowInteractionHandles(): boolean {
    return this.options.interactionMode === 'joint' || this.options.interactionMode === 'pose';
  }

  private ensureNavigationPreviewGroup(): Group {
    if (this.navigationPreviewGroup) return this.navigationPreviewGroup;
    this.navigationPreviewGroup = new Group();
    this.navigationPreviewGroup.name = 'ViewerNavigationPreview';
    this.navigationPreviewGroup.visible = false;
    this.scene.add(this.navigationPreviewGroup);
    this.applyNavigationPreviewPresentationTransform();
    return this.navigationPreviewGroup;
  }

  private resolveNavigationPreviewPresentationFrame(): ViewerNavigationPresentationFrame | null {
    const activeRobot = this.getPoseControlRobot();
    const referenceOrientation = this.defaultRobotTransform?.quaternion;
    if (!activeRobot || !referenceOrientation) {
      return null;
    }

    activeRobot.updateWorldMatrix(true, false);
    return resolveViewerNavigationPresentationFrame({
      activePosition: activeRobot.getWorldPosition(new Vector3()),
      activeOrientation: activeRobot.getWorldQuaternion(new Quaternion()),
      referenceOrientation
    });
  }

  private applyNavigationPreviewPresentationTransform(): void {
    if (!this.navigationPreviewGroup) {
      return;
    }

    const frame = this.resolveNavigationPreviewPresentationFrame();
    if (!frame) {
      this.navigationPreviewGroup.position.set(0, 0, 0);
      this.navigationPreviewGroup.quaternion.identity();
      return;
    }

    this.navigationPreviewGroup.position.copy(frame.position);
    this.navigationPreviewGroup.quaternion.copy(frame.quaternion);
    this.navigationPreviewGroup.updateMatrixWorld(true);
  }

  private clearNavigationPreviewObjects(): void {
    if (!this.navigationPreviewGroup) return;
    this.cancelNavigationSimulation();
    for (const child of [...this.navigationPreviewGroup.children]) {
      this.navigationPreviewGroup.remove(child);
      this.disposeObject3D(child);
    }
    this.navigationMarker = null;
    this.navigationPath = null;
  }

  private addNavigationGizmoSegment(group: Group, start: Vector3, end: Vector3, color: string): void {
    const line = new Line(
      new BufferGeometry().setFromPoints([start, end]),
      new LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.92,
        depthTest: true,
        depthWrite: false
      })
    );
    line.name = 'viewer-navigation-move-to-component';
    line.renderOrder = 5;
    group.add(line);
  }

  private addNavigationOrientationGizmo(group: Group, destination: Vector3, yawRad: number): void {
    const direction = new Vector3(Math.sin(yawRad), 0, Math.cos(yawRad));
    const shaftEnd = destination.clone().addScaledVector(direction, 0.2);
    this.addNavigationGizmoSegment(group, destination, shaftEnd, '#a78bfa');
    const arrowHead = new Mesh(
      new ConeGeometry(0.025, 0.065, 16),
      new MeshBasicMaterial({
        color: '#a78bfa',
        transparent: true,
        opacity: 0.94,
        depthTest: true,
        depthWrite: false
      })
    );
    arrowHead.name = 'viewer-navigation-move-to-orientation';
    arrowHead.position.copy(shaftEnd).addScaledVector(direction, -0.018);
    arrowHead.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), direction);
    arrowHead.renderOrder = 6;
    group.add(arrowHead);
    this.addNavigationGizmoLabel(
      group,
      `θ ${formatNavigationAngle(yawRad)}`,
      destination.clone().addScaledVector(direction, 0.115),
      '#a78bfa'
    );
  }

  private addNavigationGizmoLabel(group: Group, label: string, position: Vector3, color: string): void {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'rgba(4, 14, 24, 0.86)';
    context.beginPath();
    context.roundRect(3, 4, 250, 56, 16);
    context.fill();
    context.strokeStyle = color;
    context.lineWidth = 3;
    context.stroke();
    context.fillStyle = color;
    context.font = '600 28px ui-monospace, monospace';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(label, 128, 33);
    const texture = new CanvasTexture(canvas);
    texture.needsUpdate = true;
    const sprite = new Sprite(
      new SpriteMaterial({
        map: texture,
        color: '#ffffff',
        transparent: true,
        depthTest: false,
        depthWrite: false,
        sizeAttenuation: true
      })
    );
    sprite.name = 'viewer-navigation-move-to-value';
    sprite.position.copy(position);
    sprite.position.y = 0.055;
    sprite.scale.set(0.28, 0.07, 1);
    sprite.renderOrder = 1002;
    group.add(sprite);
  }

  private handleNavigationDoubleClick = (event: MouseEvent): void => {
    if (this.options.interactionMode !== 'navigate') return;
    const viewport = this.readViewportAuthority();
    if (!viewport.visible) return;
    this.navigationPointer.set(
      ((event.clientX - viewport.left) / viewport.width) * 2 - 1,
      -(((event.clientY - viewport.top) / viewport.height) * 2 - 1)
    );
    this.navigationRaycaster.setFromCamera(this.navigationPointer, this.camera);
    const destination = this.navigationRaycaster.ray.intersectPlane(
      this.navigationGroundPlane,
      new Vector3()
    );
    if (!destination || !Number.isFinite(destination.x) || !Number.isFinite(destination.z)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const frame = this.resolveNavigationPreviewPresentationFrame();
    const localDestination = frame
      ? projectViewerNavigationWorldPointToLocal(destination, frame)
      : destination;
    this.options.onNavigationDestination({ x: localDestination.x, y: 0, z: localDestination.z });
  };

  private updateNavigationMarkerEasing(now: number): boolean {
    if (!this.navigationMarker || this.navigationMarkerAnimationStartedAt === null) return false;
    const progress = MathUtils.clamp((now - this.navigationMarkerAnimationStartedAt) / 240, 0, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    this.navigationMarker.scale.setScalar(0.05 + eased * 0.95);
    if (progress >= 1) this.navigationMarkerAnimationStartedAt = null;
    return true;
  }

  private updateNavigationSimulation(now: number): boolean {
    if (
      !this.navigationSimulationCursor ||
      this.navigationSimulationStartedAt === null ||
      this.navigationSimulationPoints.length < 2
    )
      return false;
    const progress = MathUtils.clamp(
      (now - this.navigationSimulationStartedAt) / this.navigationSimulationDurationMs,
      0,
      1
    );
    this.navigationSimulationCursor.position.copy(
      sampleNavigationPath(this.navigationSimulationPoints, progress)
    );
    const yaw = this.navigationSimulationTargetYawRad * progress;
    this.projectNavigationSimulationToPhysicsRoot(this.navigationSimulationCursor.position, yaw);
    this.options.onNavigationSimulationObservation({
      forwardDistanceM: this.navigationSimulationCursor.position.z,
      leftDistanceM: this.navigationSimulationCursor.position.x,
      leftAngularDistanceRad: yaw,
      provenance: 'kinematic-preview',
      progress,
      completed: progress >= 1
    });
    const pulse = 1 + Math.sin(progress * Math.PI * 10) * 0.12;
    this.navigationSimulationCursor.scale.setScalar(pulse);
    if (progress >= 1) {
      this.navigationSimulationStartedAt = null;
      this.navigationSimulationPhysicsBaseline = null;
      const resolve = this.navigationSimulationResolve;
      this.navigationSimulationResolve = null;
      resolve?.('completed');
    }
    return true;
  }

  private captureNavigationSimulationPhysicsBaseline(startPathPoint: Vector3): {
    coordinateFrameInverse: Matrix4;
    rootAlignmentInverse: Matrix4;
    startPathPoint: Vector3;
    startViewerPosition: Vector3;
    startViewerRotation: Quaternion;
    startViewerScale: Vector3;
  } | null {
    if (!this.shouldSyncPhysicsKinematicPose() || !this.physicsVisualRootToRobotMatrix) return null;
    const bodyTransforms = this.physicsService.getBodyTransforms();
    const root =
      bodyTransforms.find((transform) => transform.metadata?.visualRoot === true) ??
      bodyTransforms.find((transform) => transform.bodyName === this.physicsVisualRootBodyName);
    if (!root) return null;

    const coordinateFrame = this.createPhysicsCoordinateFrameMatrix(root);
    const rootViewerMatrix = coordinateFrame
      .clone()
      .multiply(
        new Matrix4().compose(
          new Vector3(root.position.x, root.position.y, root.position.z),
          new Quaternion(root.rotation.x, root.rotation.y, root.rotation.z, root.rotation.w).normalize(),
          new Vector3(1, 1, 1)
        )
      )
      .multiply(this.physicsVisualRootToRobotMatrix);
    const startViewerPosition = new Vector3();
    const startViewerRotation = new Quaternion();
    const startViewerScale = new Vector3();
    rootViewerMatrix.decompose(startViewerPosition, startViewerRotation, startViewerScale);
    return {
      coordinateFrameInverse: coordinateFrame.invert(),
      rootAlignmentInverse: this.physicsVisualRootToRobotMatrix.clone().invert(),
      startPathPoint: startPathPoint.clone(),
      startViewerPosition,
      startViewerRotation,
      startViewerScale
    };
  }

  private projectNavigationSimulationToPhysicsRoot(point: Vector3, yawRad: number): void {
    const baseline = this.navigationSimulationPhysicsBaseline;
    if (!baseline) return;
    const targetViewerPosition = baseline.startViewerPosition
      .clone()
      .add(
        new Vector3(
          point.x - baseline.startPathPoint.x,
          0,
          point.z - baseline.startPathPoint.z
        ).applyQuaternion(this.navigationPreviewGroup?.quaternion ?? new Quaternion())
      );
    const targetViewerRotation = new Quaternion()
      .setFromAxisAngle(new Vector3(0, 1, 0), yawRad)
      .multiply(baseline.startViewerRotation);
    const targetPhysicsMatrix = baseline.coordinateFrameInverse
      .clone()
      .multiply(new Matrix4().compose(targetViewerPosition, targetViewerRotation, baseline.startViewerScale))
      .multiply(baseline.rootAlignmentInverse);
    const targetPhysicsPosition = new Vector3();
    const targetPhysicsRotation = new Quaternion();
    targetPhysicsMatrix.decompose(targetPhysicsPosition, targetPhysicsRotation, new Vector3());
    this.syncPhysicsKinematicPoseFromRobotPose({
      resetRoot: false,
      rootPose: {
        position: {
          x: targetPhysicsPosition.x,
          y: targetPhysicsPosition.y,
          z: targetPhysicsPosition.z
        },
        rotation: {
          x: targetPhysicsRotation.x,
          y: targetPhysicsRotation.y,
          z: targetPhysicsRotation.z,
          w: targetPhysicsRotation.w
        }
      },
      clearDynamics: true,
      resetCadence: false
    });
  }

  private ensurePoseHandleGroup(): Group {
    if (this.poseHandleGroup) {
      return this.poseHandleGroup;
    }

    this.poseHandleGroup = new Group();
    this.poseHandleGroup.name = 'PoseInteractionHandles';
    this.poseHandleGroup.visible = false;
    this.scene.add(this.poseHandleGroup);
    return this.poseHandleGroup;
  }

  private startPoseHandleTargetTransition(
    requestedDurationMs?: number,
    comparisonVisibilityAppearing?: boolean
  ): void {
    const synchronizedWithComparison = typeof comparisonVisibilityAppearing === 'boolean';
    const durationMs = synchronizedWithComparison
      ? Math.max(1, requestedDurationMs ?? ROBOT_VIEWER_POSE_HANDLE_TARGET_FADE_MS)
      : Number.isFinite(requestedDurationMs)
        ? MathUtils.clamp(Number(requestedDurationMs) * 0.54, 180, ROBOT_VIEWER_POSE_HANDLE_TARGET_FADE_MS)
        : ROBOT_VIEWER_POSE_HANDLE_TARGET_FADE_MS;
    this.poseHandleTargetTransitionState = {
      startedAt: performance.now(),
      durationMs,
      swapped: false,
      comparisonAppearing: synchronizedWithComparison ? comparisonVisibilityAppearing : null
    };
    this.applyPoseHandleTargetTransitionOpacity(1);
    this.scheduleLoop();
  }

  private cancelPoseHandleTargetTransition(): void {
    if (!this.poseHandleTargetTransitionState) return;
    this.poseHandleTargetTransitionState = null;
    this.applyPoseHandleTargetTransitionOpacity(1);
  }

  private updatePoseHandleTargetTransition(now: number): boolean {
    const transition = this.poseHandleTargetTransitionState;
    if (!transition) return false;

    const progress = MathUtils.clamp((now - transition.startedAt) / Math.max(1, transition.durationMs), 0, 1);
    if (transition.comparisonAppearing !== null) {
      const phases = resolveRobotComparisonVisibilityTransitionPhases(
        progress,
        transition.comparisonAppearing
      );
      const outgoingProgress = transition.comparisonAppearing
        ? phases.layoutProgress
        : phases.opacityProgress;
      const incomingProgress = transition.comparisonAppearing
        ? phases.opacityProgress
        : phases.layoutProgress;

      if (!transition.swapped && outgoingProgress >= 1) {
        transition.swapped = true;
        this.updatePoseHandles();
        this.applyPoseHandleTargetTransitionOpacity(0);
      }

      const opacity = transition.swapped
        ? easeViewerTransition(incomingProgress)
        : 1 - easeViewerTransition(outgoingProgress);
      this.applyPoseHandleTargetTransitionOpacity(opacity);

      if (progress >= 1) {
        this.poseHandleTargetTransitionState = null;
        this.applyPoseHandleTargetTransitionOpacity(1);
      }

      return true;
    }

    const swapProgress = 0.5;

    if (!transition.swapped && progress >= swapProgress) {
      transition.swapped = true;
      this.updatePoseHandles();
      this.applyPoseHandleTargetTransitionOpacity(0);
    }

    const opacity = transition.swapped
      ? MathUtils.smoothstep(progress, swapProgress, 1)
      : 1 - MathUtils.smoothstep(progress, 0, swapProgress);
    this.applyPoseHandleTargetTransitionOpacity(opacity);

    if (progress >= 1) {
      this.poseHandleTargetTransitionState = null;
      this.applyPoseHandleTargetTransitionOpacity(1);
    }

    return true;
  }

  private applyPoseHandleTargetTransitionOpacity(opacity: number): void {
    if (!this.poseHandleGroup) return;
    this.poseHandleGroup.userData.targetTransitionOpacity = MathUtils.clamp(opacity, 0, 1);
    this.updatePoseHandleScreenScale();
  }

  private updatePoseHandleVisibility(): void {
    if (!this.poseHandleGroup) {
      return;
    }

    this.poseHandleGroup.visible =
      this.shouldShowInteractionHandles() &&
      this.options.showPoseHandles &&
      this.poseHandleGroup.children.length > 0;
  }

  private clearPoseHandles(): void {
    if (!this.poseHandleGroup) {
      return;
    }

    for (const child of [...this.poseHandleGroup.children]) {
      this.poseHandleGroup.remove(child);
      this.disposeObject3D(child);
    }

    this.poseHandleGroup.visible = false;
  }

  private updatePoseHandles(): void {
    if (!this.shouldShowInteractionHandles() || !this.options.showPoseHandles || !this.robot) {
      this.updatePoseHandleVisibility();
      return;
    }

    const poseControlRobot = this.getPoseControlRobot();
    if (!poseControlRobot) {
      this.clearPoseHandles();
      return;
    }

    poseControlRobot.updateMatrixWorld(true);
    const handles =
      this.options.interactionMode === 'joint'
        ? this.resolveJointInteractionHandles()
        : this.resolvePoseInteractionHandles();

    if (handles.length === 0) {
      this.clearPoseHandles();
      return;
    }

    const group = this.ensurePoseHandleGroup();
    this.clearPoseHandles();

    for (const handle of handles) {
      group.add(this.createPoseHandleMarker(handle));
    }

    this.updatePoseHandleVisibility();
    this.updatePoseHandleAppearance();
  }

  private refreshPoseHandleProjection(): void {
    if (!this.poseHandleGroup?.visible || !this.shouldShowInteractionHandles()) return;
    if (this.poseHandleTargetTransitionState?.swapped === false) return;
    const root = this.getPoseControlRobot();
    if (!root) return;
    root.updateMatrixWorld(true);
    const handles =
      this.options.interactionMode === 'joint'
        ? this.resolveJointInteractionHandles()
        : this.resolvePoseInteractionHandles();
    const markers = new Map(
      this.poseHandleGroup.children.map((child) => [String(child.userData.handleId ?? ''), child as Sprite])
    );
    if (handles.length !== markers.size || handles.some((handle) => !markers.has(handle.id))) {
      this.updatePoseHandles();
      return;
    }
    for (const handle of handles) {
      const marker = markers.get(handle.id);
      if (!marker) continue;
      marker.position.copy(handle.point);
      marker.userData.anchorPosition = handle.point.clone();
      marker.userData.handleDefinition = handle;
      marker.userData.jointAxes = handle.axes ?? [];
    }
    // Observed telemetry changes both the anchored pose and the circular
    // gauge values. Re-evaluate the texture signature here; resizing alone
    // would leave the last rendered joint ratio frozen until another hover.
    this.updatePoseHandleAppearance();
  }

  private resolvePoseInteractionHandles(): Viewer3DPoseHandle[] {
    const handleDefinitions = this.options.poseHandleDefinitions ?? [];
    return handleDefinitions
      .map((definition) => {
        const object = this.resolvePoseControlObject(definition.names);

        if (!object) {
          return null;
        }

        return {
          id: definition.id,
          label: definition.label,
          point: object.getWorldPosition(new Vector3()),
          color: definition.color
        };
      })
      .filter((handle): handle is Viewer3DPoseHandle => Boolean(handle));
  }

  private resolveJointInteractionHandles(): Viewer3DPoseHandle[] {
    const groups = this.options.jointHandleDefinitions ?? [];
    const joints = this.getPoseControlJoints();

    return groups
      .map((group): Viewer3DPoseHandle | null => {
        const axes: Array<Viewer3DJointHandleAxis & { point: Vector3 }> = group.joints
          .map((axis) => {
            const joint = joints[axis.id];
            const object = this.resolvePoseControlObject([axis.id]);

            if (!joint || !object) {
              return null;
            }

            return {
              jointId: axis.id,
              label: axis.id,
              color: this.resolveJointColor(axis.id),
              valueRatio: this.resolveJointValueRatio(joint),
              dragDirection: axis.dragDirection,
              dragScale: axis.dragScale ?? (axis.dragDirection === 'vertical' ? 0.0035 : 0.008),
              ...(axis.valueRange ? { valueRange: axis.valueRange } : {}),
              point: object.getWorldPosition(new Vector3())
            };
          })
          .filter((axis): axis is Viewer3DJointHandleAxis & { point: Vector3 } => Boolean(axis));

        if (axes.length === 0) {
          return null;
        }

        const anchor = group.anchorNames ? this.resolvePoseControlObject(group.anchorNames) : null;
        const point = anchor
          ? anchor.getWorldPosition(new Vector3())
          : axes.reduce((sum, axis) => sum.add(axis.point), new Vector3()).multiplyScalar(1 / axes.length);
        const localOffset =
          anchor && group.anchorLocalTargetNames && typeof group.anchorLocalTargetRatio === 'number'
            ? this.resolvePoseHandleLocalAnchorOffset(
                group.id,
                anchor,
                group.anchorLocalTargetNames,
                group.anchorLocalTargetRatio
              )
            : null;
        if (anchor && localOffset) {
          point.copy(anchor.localToWorld(localOffset.clone()));
        }
        if (group.anchorOffset) {
          point.add(new Vector3(group.anchorOffset.x, group.anchorOffset.y, group.anchorOffset.z));
        }
        const primaryAxis = axes[0];

        return {
          id: group.id,
          label: group.label,
          point,
          color: primaryAxis.color,
          valueRatio: primaryAxis.valueRatio ?? null,
          axes: axes.map(({ point: _point, ...axis }) => axis)
        };
      })
      .filter((handle): handle is Viewer3DPoseHandle => Boolean(handle));
  }

  private resolvePoseHandleLocalAnchorOffset(
    groupId: string,
    anchor: Object3D,
    targetNames: readonly string[],
    ratio: number
  ): Vector3 | null {
    const target = this.resolvePoseControlObject(targetNames);
    if (!target) {
      return null;
    }

    const clampedRatio = MathUtils.clamp(ratio, 0, 1);
    const cacheKey = `${groupId}:${anchor.uuid}:${target.uuid}:${clampedRatio}`;
    const cachedOffset = this.poseHandleLocalAnchorOffsets.get(cacheKey);
    if (cachedOffset) {
      return cachedOffset.clone();
    }

    anchor.updateWorldMatrix(true, false);
    target.updateWorldMatrix(true, false);
    const anchorWorld = anchor.getWorldPosition(new Vector3());
    const targetWorld = target.getWorldPosition(new Vector3());
    const localAnchor = anchor.worldToLocal(anchorWorld.clone());
    const localTarget = anchor.worldToLocal(targetWorld.clone());
    const offset = localTarget.sub(localAnchor).multiplyScalar(clampedRatio);
    this.poseHandleLocalAnchorOffsets.set(cacheKey, offset.clone());
    return offset;
  }

  private createPoseHandleMarker(handle: Viewer3DPoseHandle): Sprite {
    const marker = new Sprite(
      new SpriteMaterial({
        map: this.createPoseHandleTexture(handle, { unfolded: this.options.interactionMode !== 'joint' }),
        color: '#ffffff',
        transparent: true,
        opacity: 0.82,
        depthTest: false,
        depthWrite: false,
        sizeAttenuation: true
      })
    );
    marker.name = `pose-handle-${handle.id}`;
    marker.position.copy(handle.point);
    marker.renderOrder = 1001;
    marker.userData.handleId = handle.id;
    marker.userData.handleLabel = handle.label;
    marker.userData.handleDefinition = handle;
    marker.userData.anchorPosition = handle.point.clone();
    marker.userData.baseColor = handle.color;
    marker.userData.jointAxes = handle.axes ?? [];
    marker.userData.highlightAxisId = null;
    marker.userData.unfolded = this.options.interactionMode !== 'joint';
    marker.userData.valueSignature =
      this.options.interactionMode !== 'joint' ? this.createPoseHandleValueSignature(handle) : '';
    marker.userData.presentationOpacity = 0.78;
    marker.userData.distanceOpacity = 1;
    marker.userData.screenTargetPixels = 0;
    marker.userData.visualScale = 1;
    return marker;
  }

  private createPoseHandleValueSignature(handle: Viewer3DPoseHandle): string {
    return (handle.axes ?? [])
      .map((axis) =>
        typeof axis.valueRatio === 'number' && Number.isFinite(axis.valueRatio)
          ? `${axis.jointId}:${axis.valueRatio.toFixed(5)}`
          : `${axis.jointId}:unknown`
      )
      .join('|');
  }

  private resolvePoseHandleAxisLayouts(axisCount: number, size = 128): Viewer3DPoseHandleAxisLayout[] {
    const ringRadius = axisCount > 1 ? size * 0.4 : size * 0.38;
    const ringWidth = Math.max(5, size * 0.062);

    return Array.from({ length: Math.max(1, axisCount) }, (_entry, index) => ({
      radius: ringRadius - index * (ringWidth * 1.34),
      width: ringWidth
    }));
  }

  private resolvePoseHandleCenterRadius(axisCount: number, size = 128): number {
    if (axisCount <= 1) {
      return size * 0.27;
    }

    if (axisCount === 2) {
      return size * 0.21;
    }

    return size * 0.165;
  }

  private createPoseHandleTexture(
    handle: Viewer3DPoseHandle,
    options: {
      highlightAxisId?: string | null;
      highlightAxisIds?: readonly string[] | null;
      unfolded?: boolean;
    } = {}
  ): CanvasTexture {
    const canvas = document.createElement('canvas');
    const size = 128;
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');

    if (!context) {
      return new CanvasTexture(canvas);
    }

    const center = size / 2;
    const axes =
      handle.axes && handle.axes.length > 0
        ? handle.axes
        : [
            {
              jointId: handle.id,
              label: handle.label,
              color: handle.color,
              valueRatio: handle.valueRatio ?? null,
              dragDirection: 'horizontal' as const,
              dragScale: 0.008
            }
          ];
    const axisLayouts = this.resolvePoseHandleAxisLayouts(axes.length, size);
    const outerLayout = axisLayouts[0] ?? { radius: size * 0.38, width: size * 0.12 };
    const highlightedAxisIds = new Set(
      options.highlightAxisIds ?? (options.highlightAxisId ? [options.highlightAxisId] : [])
    );
    const unfolded = options.unfolded !== false;
    const color = new Color(handle.color);
    const fill = `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`;

    context.clearRect(0, 0, size, size);
    context.globalCompositeOperation = 'source-over';
    context.lineCap = 'round';
    context.lineJoin = 'round';

    if (!unfolded) {
      const compactRadius = size * 0.105;
      context.fillStyle = 'rgba(4, 14, 24, 0.5)';
      context.beginPath();
      context.arc(center, center, compactRadius * 1.62, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = fill;
      context.globalAlpha = 0.88;
      context.beginPath();
      context.arc(center, center, compactRadius, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 1;
      context.strokeStyle = 'rgba(255, 255, 255, 0.42)';
      context.lineWidth = 1.6;
      context.beginPath();
      context.arc(center, center, compactRadius * 1.22, 0, Math.PI * 2);
      context.stroke();

      const texture = new CanvasTexture(canvas);
      texture.needsUpdate = true;
      return texture;
    }

    context.fillStyle = 'rgba(4, 14, 24, 0.13)';
    context.beginPath();
    context.arc(center, center, outerLayout.radius + outerLayout.width * 0.84, 0, Math.PI * 2);
    context.fill();

    axes.forEach((axis, index) => {
      const axisLayout = axisLayouts[index] ?? outerLayout;
      const isHighlighted = highlightedAxisIds.has(axis.jointId);
      const axisColor = new Color(axis.color);
      const axisFill = `rgb(${Math.round(axisColor.r * 255)}, ${Math.round(axisColor.g * 255)}, ${Math.round(axisColor.b * 255)})`;
      const valueRatio =
        typeof axis.valueRatio === 'number' && Number.isFinite(axis.valueRatio)
          ? MathUtils.clamp(axis.valueRatio, 0, 1)
          : null;
      const startAngle = axis.dragDirection === 'vertical' ? -Math.PI * 0.5 : -Math.PI;

      context.strokeStyle = isHighlighted ? 'rgba(255, 255, 255, 0.42)' : 'rgba(205, 229, 255, 0.18)';
      context.lineWidth = isHighlighted ? axisLayout.width * 1.26 : axisLayout.width;
      context.beginPath();
      context.arc(center, center, axisLayout.radius, 0, Math.PI * 2);
      context.stroke();

      if (valueRatio !== null) {
        context.strokeStyle = axisFill;
        context.globalAlpha = isHighlighted ? 1 : 0.92;
        context.lineWidth = axisLayout.width * (isHighlighted ? 1.18 : 1.05);
        context.beginPath();
        context.arc(center, center, axisLayout.radius, startAngle, startAngle + Math.PI * valueRatio);
        context.stroke();
        context.globalAlpha = 1;
      }

      if (isHighlighted) {
        context.strokeStyle = 'rgba(255, 255, 255, 0.78)';
        context.lineWidth = Math.max(1.5, axisLayout.width * 0.22);
        context.beginPath();
        context.arc(center, center, axisLayout.radius, 0, Math.PI * 2);
        context.stroke();
      }
    });

    context.fillStyle = fill;
    context.globalAlpha = 0.74;
    context.beginPath();
    context.arc(center, center, this.resolvePoseHandleCenterRadius(axes.length, size), 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;

    context.strokeStyle = 'rgba(255, 255, 255, 0.46)';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(center, center, outerLayout.radius + outerLayout.width * 0.5, 0, Math.PI * 2);
    context.stroke();

    const horizontalAxis = axes.find((axis) => axis.dragDirection === 'horizontal');
    const verticalAxis = axes.find((axis) => axis.dragDirection === 'vertical');
    const drawDirectionArrow = (
      direction: 'up' | 'right' | 'down' | 'left',
      axis: Viewer3DJointHandleAxis | undefined
    ): void => {
      if (!axis) {
        return;
      }

      const axisColor = new Color(axis.color);
      const axisFill = `rgb(${Math.round(axisColor.r * 255)}, ${Math.round(axisColor.g * 255)}, ${Math.round(axisColor.b * 255)})`;
      const arrowOffset = outerLayout.radius + outerLayout.width * 1.92;
      const arrowSize = 11;
      const x =
        direction === 'left' ? center - arrowOffset : direction === 'right' ? center + arrowOffset : center;
      const y =
        direction === 'up' ? center - arrowOffset : direction === 'down' ? center + arrowOffset : center;

      context.fillStyle = axisFill;
      context.globalAlpha = highlightedAxisIds.has(axis.jointId) ? 0.95 : 0.72;
      context.beginPath();

      if (direction === 'up') {
        context.moveTo(x, y - arrowSize);
        context.lineTo(x - arrowSize, y + arrowSize);
        context.lineTo(x + arrowSize, y + arrowSize);
      } else if (direction === 'down') {
        context.moveTo(x, y + arrowSize);
        context.lineTo(x - arrowSize, y - arrowSize);
        context.lineTo(x + arrowSize, y - arrowSize);
      } else if (direction === 'left') {
        context.moveTo(x - arrowSize, y);
        context.lineTo(x + arrowSize, y - arrowSize);
        context.lineTo(x + arrowSize, y + arrowSize);
      } else {
        context.moveTo(x + arrowSize, y);
        context.lineTo(x - arrowSize, y - arrowSize);
        context.lineTo(x - arrowSize, y + arrowSize);
      }

      context.closePath();
      context.fill();
      context.globalAlpha = 1;
    };

    drawDirectionArrow('up', verticalAxis);
    drawDirectionArrow('down', verticalAxis);
    drawDirectionArrow('left', horizontalAxis);
    drawDirectionArrow('right', horizontalAxis);

    const texture = new CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private updatePoseHandleAppearance(): void {
    if (!this.poseHandleGroup) {
      return;
    }

    for (const child of this.poseHandleGroup.children) {
      const marker = child as Sprite;
      const material = marker.material as SpriteMaterial | undefined;
      const handleId = String(marker.userData.handleId ?? '');
      const hovered = handleId === this.hoveredPoseHandleId;
      const dragging = handleId === this.poseHandleDragState?.handleId;
      const externalAxisIds = this.resolveHandleJointAxes(marker, handleId)
        .filter((axis) => this.externalHoveredJointTargets.includes(axis.jointId))
        .map((axis) => axis.jointId);
      const externallyHovered = externalAxisIds.length > 0;
      const highlightedAxisIds = dragging
        ? (this.poseHandleDragState?.activeJointIds ??
          (this.poseHandleDragState?.activeJointId ? [this.poseHandleDragState.activeJointId] : []))
        : hovered
          ? this.hoveredPoseHandleAxisIds
          : externallyHovered
            ? externalAxisIds
            : [];
      const highlightedAxisSignature = highlightedAxisIds.join('|');
      const isJointHandle = this.options.interactionMode === 'joint';
      const unfolded = !isJointHandle || hovered || dragging || externallyHovered;
      const handleDefinition = marker.userData.handleDefinition as Viewer3DPoseHandle | undefined;
      const valueSignature =
        unfolded && handleDefinition ? this.createPoseHandleValueSignature(handleDefinition) : '';
      const scale = isJointHandle
        ? 1
        : dragging
          ? ROBOT_VIEWER_POSE_HANDLE_SCALE * 1.28
          : hovered
            ? ROBOT_VIEWER_POSE_HANDLE_SCALE
            : 1;

      marker.userData.visualScale = scale;
      material?.color.set(dragging ? '#22d3ee' : '#ffffff');
      if (material) {
        marker.userData.presentationOpacity = dragging ? 1 : hovered || externallyHovered ? 0.92 : 0.78;

        if (
          marker.userData.highlightAxisId !== highlightedAxisSignature ||
          marker.userData.unfolded !== unfolded ||
          marker.userData.valueSignature !== valueSignature
        ) {
          marker.userData.highlightAxisId = highlightedAxisSignature;
          marker.userData.unfolded = unfolded;
          marker.userData.valueSignature = valueSignature;

          if (handleDefinition) {
            material.map?.dispose();
            material.map = this.createPoseHandleTexture(handleDefinition, {
              highlightAxisIds: highlightedAxisIds,
              unfolded
            });
            material.needsUpdate = true;
          }
        }
      }
    }

    this.updatePoseHandleScreenScale();
  }

  private updatePoseHandleScreenScale(): void {
    if (!this.poseHandleGroup?.visible || this.poseHandleGroup.children.length === 0) {
      return;
    }

    const viewport = this.readViewportAuthority();
    const viewportWidth = this.rendererClientWidth || viewport.width;
    const viewportHeight = this.rendererClientHeight || viewport.height;

    if (viewportWidth <= 0 || viewportHeight <= 0) {
      return;
    }

    const targetPixels = MathUtils.clamp(
      Math.min(viewportWidth, viewportHeight) * ROBOT_VIEWER_HANDLE_SCREEN_RATIO,
      ROBOT_VIEWER_HANDLE_SCREEN_MIN_PX,
      ROBOT_VIEWER_HANDLE_SCREEN_MAX_PX
    );
    const subjectScreenSpanPixels = this.resolvePoseHandleSubjectScreenSpanPixels(
      viewportWidth,
      viewportHeight
    );
    const distanceOpacity =
      subjectScreenSpanPixels === null ? 1 : resolveViewerPoseHandleDistanceOpacity(subjectScreenSpanPixels);
    const poseControlRobot = this.options.poseHandleOcclusion ? this.getPoseControlRobot() : null;
    poseControlRobot?.updateMatrixWorld(true);

    for (const child of this.poseHandleGroup.children) {
      const marker = child as Sprite;
      const material = marker.material as SpriteMaterial | undefined;
      const anchorPosition =
        marker.userData.anchorPosition instanceof Vector3
          ? (marker.userData.anchorPosition as Vector3)
          : marker.position;
      const worldUnitsPerPixel = this.resolveWorldUnitsPerScreenPixel(anchorPosition, viewportHeight);
      const visualScale = Number.isFinite(Number(marker.userData.visualScale))
        ? Number(marker.userData.visualScale)
        : 1;
      const presentationOpacity = Number.isFinite(Number(marker.userData.presentationOpacity))
        ? Number(marker.userData.presentationOpacity)
        : 0.78;
      const targetTransitionOpacity = Number.isFinite(
        Number(this.poseHandleGroup.userData.targetTransitionOpacity)
      )
        ? Number(this.poseHandleGroup.userData.targetTransitionOpacity)
        : 1;
      const anatomicallyOccluded =
        poseControlRobot !== null &&
        String(marker.userData.handleId ?? '') !== this.poseHandleDragState?.handleId &&
        this.isPoseHandleAnatomicallyOccluded(marker, anchorPosition, poseControlRobot);
      marker.scale.setScalar(targetPixels * worldUnitsPerPixel * visualScale);
      marker.position.copy(anchorPosition);
      marker.visible = distanceOpacity > 0 && targetTransitionOpacity > 0 && !anatomicallyOccluded;
      marker.userData.distanceOpacity = distanceOpacity;
      marker.userData.screenTargetPixels = targetPixels;
      if (material) {
        material.opacity = presentationOpacity * distanceOpacity * targetTransitionOpacity;
      }
    }
  }

  private isPoseHandleAnatomicallyOccluded(
    marker: Sprite,
    anchorPosition: Vector3,
    robot: Object3D
  ): boolean {
    const projectedAnchor = anchorPosition.clone().project(this.camera);
    if (!Number.isFinite(projectedAnchor.x) || !Number.isFinite(projectedAnchor.y)) return false;

    this.poseHandleRaycaster.setFromCamera(
      this.poseHandlePointer.set(projectedAnchor.x, projectedAnchor.y),
      this.camera
    );
    const anchorDistance = this.poseHandleRaycaster.ray.origin.distanceTo(anchorPosition);
    const firstIntersection = this.poseHandleRaycaster
      .intersectObject(robot, true)
      .find((intersection) => intersection.distance < anchorDistance - 0.018);
    if (!firstIntersection) return false;

    const occludingFamily = this.resolvePoseHandleBodyFamilyFromObject(firstIntersection.object, robot);
    if (!occludingFamily) return true;

    return !this.resolvePoseHandleVisibleBodyFamilies(marker).has(occludingFamily);
  }

  private resolvePoseHandleVisibleBodyFamilies(marker: Sprite): Set<Viewer3DBodyFamily> {
    const handleId = String(marker.userData.handleId ?? '');
    const definition = marker.userData.handleDefinition as Viewer3DPoseHandle | undefined;
    const family = this.resolvePoseHandleBodyFamily(
      [handleId, ...(definition?.axes ?? []).map((axis) => axis.jointId)].join(' ')
    );
    const visibleFamilies = new Set<Viewer3DBodyFamily>();
    if (family) visibleFamilies.add(family);

    // These articulations sit at a semantic boundary. Their neighbouring
    // shell belongs to the same manipulation assembly and must not hide them.
    if (family === 'head' || handleId.includes('shoulder') || handleId.includes('hip')) {
      visibleFamilies.add('torso');
    }
    if (handleId.includes('pelvis')) {
      visibleFamilies.add('torso');
      visibleFamilies.add('left-leg');
      visibleFamilies.add('right-leg');
    }

    return visibleFamilies;
  }

  private resolvePoseHandleBodyFamilyFromObject(
    object: Object3D,
    robot: Object3D
  ): Viewer3DBodyFamily | null {
    let current: Object3D | null = object;
    while (current) {
      const family = this.resolvePoseHandleBodyFamily(current.name);
      if (family) return family;
      if (current === robot) break;
      current = current.parent;
    }
    return null;
  }

  private resolvePoseHandleBodyFamily(value: string): Viewer3DBodyFamily | null {
    const normalized = value.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!normalized) return null;
    if (normalized.includes('hipyawpitch')) return 'torso';
    if (/(lshoulder|lupperarm|lelbow|lforearm|lwrist|lhand|leftarm|lefthand)/.test(normalized)) {
      return 'left-arm';
    }
    if (/(rshoulder|rupperarm|relbow|rforearm|rwrist|rhand|rightarm|righthand)/.test(normalized)) {
      return 'right-arm';
    }
    if (/(lhip|lthigh|lknee|ltibia|lankle|lfoot|leftleg|leftfoot)/.test(normalized)) {
      return 'left-leg';
    }
    if (/(rhip|rthigh|rknee|rtibia|rankle|rfoot|rightleg|rightfoot)/.test(normalized)) {
      return 'right-leg';
    }
    if (/(head|neck|face|eye|ear)/.test(normalized)) return 'head';
    if (/(torso|chest|pelvis|body|hipyawpitch)/.test(normalized)) return 'torso';
    return null;
  }

  private resolvePoseHandleSubjectScreenSpanPixels(
    viewportWidth: number,
    viewportHeight: number
  ): number | null {
    if (!this.poseHandleGroup || this.poseHandleGroup.children.length < 2) return null;
    const projected = this.poseHandleGroup.children
      .map((child) => child.getWorldPosition(new Vector3()).project(this.camera))
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
    if (projected.length < 2) return null;
    const xValues = projected.map((point) => point.x);
    const yValues = projected.map((point) => point.y);
    return Math.max(
      (Math.max(...xValues) - Math.min(...xValues)) * viewportWidth * 0.5,
      (Math.max(...yValues) - Math.min(...yValues)) * viewportHeight * 0.5
    );
  }

  private resolveWorldUnitsPerScreenPixel(point: Vector3, viewportHeight: number): number {
    if (this.camera instanceof OrthographicCamera) {
      return this.orthographicViewHeight / Math.max(0.001, this.camera.zoom) / Math.max(1, viewportHeight);
    }

    const distance = this.camera.position.distanceTo(point);
    const visibleHeight = 2 * Math.tan(MathUtils.degToRad(this.camera.fov * 0.5)) * Math.max(0.001, distance);
    return visibleHeight / Math.max(1, viewportHeight);
  }

  private resolvePoseHandleScreenMetrics(
    marker: Sprite,
    viewport: Viewer3DViewportAuthority
  ): { centerX: number; centerY: number; sizePixels: number } | null {
    const center = marker.getWorldPosition(new Vector3());
    const worldScale = marker.getWorldScale(new Vector3());
    const centerProjection = center.clone().project(this.camera);

    if (!Number.isFinite(centerProjection.x) || !Number.isFinite(centerProjection.y)) {
      return null;
    }

    const cameraRight = new Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0).normalize();
    const cameraUp = new Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1).normalize();
    const halfWidth = Math.max(0.000001, worldScale.x * 0.5);
    const halfHeight = Math.max(0.000001, worldScale.y * 0.5);
    const rightProjection = center.clone().addScaledVector(cameraRight, halfWidth).project(this.camera);
    const upProjection = center.clone().addScaledVector(cameraUp, halfHeight).project(this.camera);

    if (!Number.isFinite(rightProjection.x) || !Number.isFinite(upProjection.y)) {
      return null;
    }

    const widthPixels = Math.abs(rightProjection.x - centerProjection.x) * viewport.width;
    const heightPixels = Math.abs(upProjection.y - centerProjection.y) * viewport.height;

    return {
      centerX: viewport.left + (centerProjection.x * 0.5 + 0.5) * viewport.width,
      centerY: viewport.top + (-centerProjection.y * 0.5 + 0.5) * viewport.height,
      sizePixels: Math.max(1, widthPixels, heightPixels)
    };
  }

  private resolvePoseHandleFromPointer(event: PointerEvent): Sprite | null {
    if (
      this.controlsActive ||
      !this.poseHandleGroup?.visible ||
      this.options.interactionMode === 'camera' ||
      this.poseHandleTargetTransitionState !== null
    ) {
      return null;
    }

    const viewport = this.readViewportAuthority();

    if (!viewport.visible) {
      return null;
    }

    this.poseHandlePointer.set(
      ((event.clientX - viewport.left) / viewport.width) * 2 - 1,
      -(((event.clientY - viewport.top) / viewport.height) * 2 - 1)
    );
    this.poseHandleRaycaster.setFromCamera(this.poseHandlePointer, this.camera);
    const hit = this.poseHandleRaycaster
      .intersectObjects(this.poseHandleGroup.children, false)
      .find(
        (candidate) =>
          Number(candidate.object.userData.distanceOpacity ?? 1) >=
          ROBOT_VIEWER_HANDLE_MIN_INTERACTION_OPACITY
      );
    return (hit?.object as Sprite | undefined) ?? null;
  }

  private resolvePoseHandleAxisSelectionFromPointer(
    event: PointerEvent,
    marker: Sprite
  ): Viewer3DPoseHandleAxisSelection {
    const handleId = String(marker.userData.handleId ?? '');
    const axes = this.resolveHandleJointAxes(marker, handleId);

    if (axes.length <= 1) {
      return {
        axes,
        primaryAxis: axes[0] ?? null,
        mode: 'track'
      };
    }

    const viewport = this.readViewportAuthority();

    if (!viewport.visible) {
      return {
        axes: axes.slice(0, 1),
        primaryAxis: axes[0] ?? null,
        mode: 'track'
      };
    }

    const screenMetrics = this.resolvePoseHandleScreenMetrics(marker, viewport);
    const centerX = screenMetrics?.centerX ?? viewport.left + viewport.width * 0.5;
    const centerY = screenMetrics?.centerY ?? viewport.top + viewport.height * 0.5;
    const distancePixels = Math.hypot(event.clientX - centerX, event.clientY - centerY);
    const targetPixels = Number.isFinite(Number(marker.userData.screenTargetPixels))
      ? Number(marker.userData.screenTargetPixels)
      : MathUtils.clamp(
          Math.min(viewport.width, viewport.height) * ROBOT_VIEWER_HANDLE_SCREEN_RATIO,
          ROBOT_VIEWER_HANDLE_SCREEN_MIN_PX,
          ROBOT_VIEWER_HANDLE_SCREEN_MAX_PX
        );
    const visualScale = Number.isFinite(Number(marker.userData.visualScale))
      ? Number(marker.userData.visualScale)
      : 1;
    const effectiveSize = screenMetrics?.sizePixels ?? Math.max(1, targetPixels * visualScale);
    const layouts = this.resolvePoseHandleAxisLayouts(axes.length);
    const innermostLayout = layouts[layouts.length - 1] ?? layouts[0];
    const centerRadius = innermostLayout
      ? Math.max(0, ((innermostLayout.radius - innermostLayout.width * 0.78) / 128) * effectiveSize)
      : effectiveSize * 0.18;

    if (axes.length === 2 && distancePixels <= centerRadius) {
      return {
        axes,
        primaryAxis: axes[0] ?? null,
        mode: 'center'
      };
    }

    let selectedIndex = 0;
    let selectedDistance = Number.POSITIVE_INFINITY;

    layouts.forEach((layout, index) => {
      const trackRadius = (layout.radius / 128) * effectiveSize;
      const distance = Math.abs(distancePixels - trackRadius);

      if (distance < selectedDistance) {
        selectedDistance = distance;
        selectedIndex = index;
      }
    });

    return {
      axes: axes[selectedIndex] ? [axes[selectedIndex]] : axes.slice(0, 1),
      primaryAxis: axes[selectedIndex] ?? axes[0] ?? null,
      mode: 'track'
    };
  }

  private resolvePoseHandleAxisFromPointer(
    event: PointerEvent,
    marker: Sprite
  ): Viewer3DJointHandleAxis | null {
    return this.resolvePoseHandleAxisSelectionFromPointer(event, marker).primaryAxis;
  }

  private handlePoseHandlePointerMove = (event: PointerEvent): void => {
    if (this.poseHandleDragState) {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.dispatchJointHoverChange(this.poseHandleDragState.activeJointIds, {
        activeJointIds: this.poseHandleDragState.activeJointIds,
        phase: 'drag'
      });
      this.dragPoseHandle(event);
      return;
    }

    const hit = this.resolvePoseHandleFromPointer(event);
    const nextHandleId = hit ? String(hit.userData.handleId ?? '') : null;
    const nextAxisSelection =
      hit && nextHandleId ? this.resolvePoseHandleAxisSelectionFromPointer(event, hit) : null;
    const nextAxisIds = nextAxisSelection ? nextAxisSelection.axes.map((axis) => axis.jointId) : [];

    if (!this.selectionController.setHover(nextHandleId, nextAxisIds)) {
      return;
    }

    this.dispatchJointHoverChange(nextAxisIds, { phase: nextAxisIds.length > 0 ? 'hover' : 'clear' });
    this.renderer.domElement.style.cursor = nextHandleId
      ? this.poseControlTarget === 'observed'
        ? this.observedPoseLiveControlEnabled
          ? 'grab'
          : 'not-allowed'
        : 'grab'
      : this.options.interactionMode === 'camera'
        ? ''
        : 'default';
    this.updatePoseHandleAppearance();
    this.requestRender();
  };

  private handlePoseHandlePointerDown = (event: PointerEvent): void => {
    const hit = this.resolvePoseHandleFromPointer(event);

    if (!hit) {
      if (this.clearPoseHandleFocus()) {
        this.updatePoseHandleAppearance();
        this.requestRender();
      }
      return;
    }

    if (this.poseControlTarget === 'observed' && !this.observedPoseLiveControlEnabled) {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.renderer.domElement.style.cursor = 'not-allowed';
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    const selectedPoseHandleId = String(hit.userData.handleId ?? '');
    const selectedAxes = this.resolvePoseHandleAxisSelectionFromPointer(event, hit).axes;
    const selectedAxisIds = selectedAxes.map((axis) => axis.jointId);
    this.selectionController.select(selectedPoseHandleId, selectedAxisIds);
    this.dispatchJointHoverChange(this.selectedPoseHandleAxisIds, {
      activeJointIds: this.selectedPoseHandleAxisIds,
      phase: 'select'
    });
    this.poseHandleDragState = this.createPoseHandleDragState(event, hit, selectedAxes);
    if (this.poseControlTarget === 'observed' && this.observedPoseLiveControlEnabled) {
      this.dispatchLivePoseTarget('start', []);
    }
    this.poseHandleDragStarted = false;
    this.poseHandleControlsWereEnabled = this.controls.enabled;
    this.controls.enabled = false;
    this.setCameraControlsMotionEnabled(false);
    this.controlsActive = false;
    this.controlsSettlingFrames = 0;
    this.renderer.domElement.setPointerCapture?.(event.pointerId);
    this.renderer.domElement.style.cursor = 'grabbing';
    this.updatePoseHandleAppearance();
    this.requestRender();
  };

  private clearPoseHandleFocus(): boolean {
    const hadFocus = this.selectionController.clearFocus();
    this.dispatchJointHoverChange([], { phase: 'clear' });
    return hadFocus;
  }

  private handlePoseHandlePointerUp = (event: PointerEvent): void => {
    if (!this.poseHandleDragState || this.poseHandleDragState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    this.finishPoseHandleDrag(event.pointerId);
  };

  private handlePoseHandlePointerLeave = (): void => {
    if (this.poseHandleDragState) {
      return;
    }

    if (!this.hoveredPoseHandleId) {
      return;
    }

    this.selectionController.clearHover();
    this.dispatchJointHoverChange([], { phase: 'clear' });
    this.renderer.domElement.style.cursor = this.options.interactionMode === 'camera' ? '' : 'default';
    this.updatePoseHandleAppearance();
    this.requestRender();
  };

  private handlePoseHandleClick = (event: MouseEvent): void => {
    if (performance.now() > this.suppressPoseHandleClickUntil) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
  };

  private createPoseHandleDragState(
    event: PointerEvent,
    hit: Sprite,
    selectedAxes: Viewer3DJointHandleAxis[] = []
  ): Viewer3DPoseHandleDragState {
    const handleId = String(hit.userData.handleId ?? '');
    const dragPlane = this.createPoseHandleDragPlane(hit.position);
    const worldPoint = dragPlane ? this.resolvePointerWorldPointOnPlane(event, dragPlane) : null;
    const dragOffset = worldPoint ? hit.position.clone().sub(worldPoint) : new Vector3();
    const jointAxes =
      this.options.interactionMode === 'joint' ? this.resolveHandleJointAxes(hit, handleId) : [];
    const pointerAxes = this.options.interactionMode === 'joint' ? selectedAxes : [];
    const pointerAxis = pointerAxes[0] ?? null;
    const joints = this.getPoseControlJoints();
    const startJointValues = Object.fromEntries(
      jointAxes
        .map(
          (axis) =>
            [axis.jointId, joints[axis.jointId] ? this.readJointValue(joints[axis.jointId]) : null] as const
        )
        .filter((entry): entry is readonly [string, number] => typeof entry[1] === 'number')
    );
    const fallbackJoint = this.options.interactionMode === 'joint' ? joints[handleId] : null;
    const fallbackStartValue = fallbackJoint ? this.readJointValue(fallbackJoint) : null;
    const startJointValue =
      jointAxes.length > 0
        ? (startJointValues[pointerAxis?.jointId ?? jointAxes[0]?.jointId ?? ''] ?? null)
        : fallbackStartValue;

    return {
      pointerId: event.pointerId,
      handleId,
      mode: this.options.interactionMode,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startJointValue,
      startJointValues,
      jointAxes,
      activeJointId: pointerAxis?.jointId ?? null,
      activeJointIds: pointerAxes.map((axis) => axis.jointId),
      dragPlane,
      dragOffset
    };
  }

  private resolveHandleJointAxes(hit: Sprite, handleId: string): Viewer3DJointHandleAxis[] {
    const axes = hit.userData.jointAxes;

    if (Array.isArray(axes) && axes.length > 0) {
      return axes.filter((axis): axis is Viewer3DJointHandleAxis => {
        const candidate = axis as Partial<Viewer3DJointHandleAxis>;
        return typeof candidate.jointId === 'string' && typeof candidate.dragDirection === 'string';
      });
    }

    const joint = this.getRobotJoints()[handleId];

    if (!joint) {
      return [];
    }

    return [
      {
        jointId: handleId,
        label: handleId,
        color: this.resolveJointColor(handleId),
        valueRatio: this.resolveJointValueRatio(joint),
        dragDirection: 'horizontal',
        dragScale: 0.008
      }
    ];
  }

  private createPoseHandleDragPlane(anchor: Vector3): Plane {
    const cameraDirection = new Vector3();
    this.camera.getWorldDirection(cameraDirection);
    return new Plane().setFromNormalAndCoplanarPoint(cameraDirection, anchor);
  }

  private resolvePointerWorldPointOnPlane(event: PointerEvent, plane: Plane): Vector3 | null {
    const viewport = this.readViewportAuthority();

    if (!viewport.visible) {
      return null;
    }

    this.poseHandlePointer.set(
      ((event.clientX - viewport.left) / viewport.width) * 2 - 1,
      -(((event.clientY - viewport.top) / viewport.height) * 2 - 1)
    );
    this.poseHandleRaycaster.setFromCamera(this.poseHandlePointer, this.camera);
    return this.poseHandleRaycaster.ray.intersectPlane(plane, new Vector3());
  }

  private dragPoseHandle(event: PointerEvent): void {
    const dragState = this.poseHandleDragState;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.poseHandleDragStarted = true;

    if (dragState.mode === 'joint') {
      this.dragJointHandle(event, dragState);
      return;
    }

    this.dragPosePreviewHandle(event, dragState);
  }

  private dragJointHandle(event: PointerEvent, dragState: Viewer3DPoseHandleDragState): void {
    const horizontalDelta = event.clientX - dragState.startClientX;
    const verticalDelta = event.clientY - dragState.startClientY;
    const axes = this.resolveActiveJointDragAxes(dragState, horizontalDelta, verticalDelta);

    if (axes.length === 0) {
      return;
    }

    let didUpdate = false;
    const liveTargets: Viewer3DLivePoseTargetDetail['targets'] = [];

    for (const axis of axes) {
      const joint = this.getPoseControlJoints()[axis.jointId];
      const startJointValue = dragState.startJointValues[axis.jointId] ?? dragState.startJointValue;

      if (!joint || typeof startJointValue !== 'number') {
        continue;
      }

      const directionalDelta = axis.dragDirection === 'vertical' ? verticalDelta : horizontalDelta;
      const rawNextValue = startJointValue + directionalDelta * axis.dragScale;
      const nextValue = axis.valueRange
        ? MathUtils.clamp(rawNextValue, axis.valueRange.min, axis.valueRange.max)
        : rawNextValue;

      if (this.poseControlTarget === 'observed' && this.observedPoseLiveControlEnabled) {
        liveTargets.push({ jointId: axis.jointId, positionRad: nextValue });
      } else {
        didUpdate = this.setJointValue(joint, nextValue, axis.jointId) || didUpdate;
      }
    }

    if (liveTargets.length > 0) {
      this.dispatchLivePoseTarget('change', liveTargets);
      didUpdate = true;
    }

    if (!didUpdate) {
      return;
    }

    if (this.poseControlTarget !== 'observed') {
      this.markPoseEditDirty(axes.map((axis) => axis.jointId));
      this.robot?.updateMatrixWorld(true);
    }
    this.updateViewerDebugLayers({ poseHandles: false });
    this.updatePoseHandles();
    this.requestRender();
  }

  private resolveActiveJointDragAxes(
    dragState: Viewer3DPoseHandleDragState,
    horizontalDelta: number,
    verticalDelta: number
  ): Viewer3DJointHandleAxis[] {
    const axes = dragState.jointAxes;

    if (axes.length === 0) {
      return [];
    }

    if (dragState.activeJointIds.length > 0) {
      return axes.filter((axis) => dragState.activeJointIds.includes(axis.jointId));
    }

    if (dragState.activeJointId) {
      return axes.filter((axis) => axis.jointId === dragState.activeJointId);
    }

    const preferredDirection =
      Math.abs(verticalDelta) > Math.abs(horizontalDelta) ? 'vertical' : 'horizontal';
    const axis = axes.find((candidate) => candidate.dragDirection === preferredDirection) ?? axes[0] ?? null;
    dragState.activeJointId = axis?.jointId ?? null;
    dragState.activeJointIds = axis ? [axis.jointId] : [];
    return axis ? [axis] : [];
  }

  private dragPosePreviewHandle(event: PointerEvent, dragState: Viewer3DPoseHandleDragState): void {
    if (!dragState.dragPlane || !this.poseHandleGroup) {
      return;
    }

    const worldPoint = this.resolvePointerWorldPointOnPlane(event, dragState.dragPlane);

    if (!worldPoint) {
      return;
    }

    const marker = this.poseHandleGroup.children.find(
      (child) => String((child as Mesh).userData.handleId ?? '') === dragState.handleId
    );

    if (!marker) {
      return;
    }

    marker.position.copy(worldPoint.add(dragState.dragOffset));
    marker.userData.anchorPosition = marker.position.clone();
    this.updatePoseHandleAppearance();
    this.requestRender();
  }

  private finishPoseHandleDrag(pointerId: number | null = null): void {
    const dragState = this.poseHandleDragState;

    if (!dragState) {
      return;
    }

    const pointerCaptureId = typeof pointerId === 'number' ? pointerId : dragState.pointerId;

    if (typeof pointerCaptureId === 'number') {
      this.renderer.domElement.releasePointerCapture?.(pointerCaptureId);
    }

    const mode = this.options.interactionMode;
    const liveObservedDrag = this.poseControlTarget === 'observed' && this.observedPoseLiveControlEnabled;
    const shouldSuppressClick = this.poseHandleDragStarted;
    const shouldRestoreControls = this.poseHandleControlsWereEnabled && this.shouldEnableCameraControls();
    this.poseHandleDragState = null;
    this.poseHandleDragStarted = false;
    this.poseHandleControlsWereEnabled = false;
    this.controls.enabled = shouldRestoreControls;
    this.setCameraControlsMotionEnabled(shouldRestoreControls);
    this.controlsActive = false;
    this.controlsSettlingFrames = 0;
    if (liveObservedDrag) this.dispatchLivePoseTarget('end', []);
    this.controls.update();
    this.renderer.domElement.style.cursor = this.hoveredPoseHandleId
      ? 'grab'
      : mode === 'camera'
        ? ''
        : 'default';

    if (mode === 'pose' || mode === 'joint') {
      this.updatePoseHandles();
    }

    if (shouldSuppressClick) {
      this.suppressPoseHandleClickUntil = performance.now() + 180;
    }

    this.updatePoseHandleAppearance();
    this.requestRender();
  }

  private dispatchLivePoseTarget(
    phase: Viewer3DLivePoseTargetDetail['phase'],
    targets: Viewer3DLivePoseTargetDetail['targets']
  ): void {
    if (typeof CustomEvent === 'undefined') return;
    this.container.dispatchEvent(
      new CustomEvent<Viewer3DLivePoseTargetDetail>(ROBOT_VIEWER_LIVE_POSE_TARGET_EVENT, {
        bubbles: true,
        detail: {
          phase,
          targets: targets.map((target) => ({ ...target }))
        }
      })
    );
  }

  private ensureProjectileInteractionGroup(): Group {
    if (this.projectileInteractionGroup) return this.projectileInteractionGroup;

    const group = new Group();
    group.name = 'ViewerProjectileInteraction';
    group.visible = this.options.interactionMode === 'projectile';

    const launcher = new Group();
    launcher.name = 'viewer-projectile-launcher';
    const woodMaterial = new MeshBasicMaterial({
      color: '#a16207',
      transparent: true,
      opacity: 0.96,
      depthTest: false,
      depthWrite: false
    });
    const elasticMaterial = new MeshBasicMaterial({
      color: '#f472b6',
      transparent: true,
      opacity: 0.94,
      depthTest: false,
      depthWrite: false
    });
    const pouchMaterial = new MeshBasicMaterial({
      color: '#7c2d12',
      transparent: true,
      opacity: 0.98,
      depthTest: false,
      depthWrite: false
    });
    const ballMaterial = new MeshBasicMaterial({
      color: '#ef4444',
      transparent: true,
      opacity: 1,
      depthTest: false,
      depthWrite: false
    });
    const woodSegmentGeometry = new CylinderGeometry(0.008, 0.01, 1, 16);
    const handle = new Mesh(woodSegmentGeometry, woodMaterial);
    handle.name = 'viewer-slingshot-handle';
    this.syncProjectileSlingshotSegment(handle, new Vector3(0, -0.07, 0.035), new Vector3(0, -0.006, 0.035));
    launcher.add(handle);
    const forkOrigin = new Vector3(0, -0.004, 0.035);
    const leftForkTip = new Vector3(-0.038, 0.046, 0.035);
    const rightForkTip = new Vector3(0.038, 0.046, 0.035);
    const leftFork = new Mesh(woodSegmentGeometry, woodMaterial.clone());
    leftFork.name = 'viewer-slingshot-left-fork';
    this.syncProjectileSlingshotSegment(leftFork, forkOrigin, leftForkTip);
    launcher.add(leftFork);
    const rightFork = new Mesh(woodSegmentGeometry, woodMaterial.clone());
    rightFork.name = 'viewer-slingshot-right-fork';
    this.syncProjectileSlingshotSegment(rightFork, forkOrigin, rightForkTip);
    launcher.add(rightFork);
    for (const [name, position] of [
      ['left', leftForkTip],
      ['right', rightForkTip]
    ] as const) {
      const cap = new Mesh(new SphereGeometry(0.01, 16, 10), woodMaterial.clone());
      cap.name = `viewer-slingshot-${name}-fork-cap`;
      cap.position.copy(position);
      cap.renderOrder = 1101;
      launcher.add(cap);
    }
    const elasticGeometry = new CylinderGeometry(0.0026, 0.0026, 1, 10);
    const leftElastic = new Mesh(elasticGeometry, elasticMaterial);
    leftElastic.name = 'viewer-slingshot-left-elastic';
    leftElastic.renderOrder = 1102;
    launcher.add(leftElastic);
    this.projectileSlingshotLeftElastic = leftElastic;
    const rightElastic = new Mesh(elasticGeometry, elasticMaterial.clone());
    rightElastic.name = 'viewer-slingshot-right-elastic';
    rightElastic.renderOrder = 1102;
    launcher.add(rightElastic);
    this.projectileSlingshotRightElastic = rightElastic;
    const pouch = new Mesh(new SphereGeometry(1, 18, 12), pouchMaterial);
    pouch.name = 'viewer-slingshot-pouch';
    pouch.renderOrder = 1103;
    launcher.add(pouch);
    this.projectileSlingshotPouch = pouch;
    const loadedBall = new Mesh(new SphereGeometry(1, 18, 12), ballMaterial);
    loadedBall.name = 'viewer-slingshot-loaded-ball';
    loadedBall.renderOrder = 1104;
    launcher.add(loadedBall);
    this.projectileSlingshotLoadedBall = loadedBall;
    launcher.traverse((object) => {
      if (object === launcher) return;
      object.renderOrder = Math.max(object.renderOrder, 1100);
    });
    // A Group renderOrder becomes the primary sort key for all its children.
    // Keep the parent neutral so sibling trajectory overlays can render after
    // the individual wood, elastic, pouch, and ball meshes.
    launcher.renderOrder = 0;
    this.projectileLauncherGroup = launcher;
    group.add(launcher);
    this.syncProjectileSlingshotPresentation(0);

    const line = new Line(
      new BufferGeometry(),
      new LineBasicMaterial({
        color: '#67e8f9',
        transparent: true,
        opacity: 0.82,
        depthTest: true,
        depthWrite: false
      })
    );
    line.name = 'viewer-projectile-trajectory-gizmo';
    // The slingshot is a depth-neutral viewport prop. Draw the trajectory
    // after its wood and elastic so the launch line visibly exits the pouch,
    // while the material depth test still respects robot and scene geometry.
    line.renderOrder = ROBOT_VIEWER_PROJECTILE_TRAJECTORY_RENDER_ORDER;
    group.add(line);
    this.projectileTrajectoryLine = line;

    const launchOverlay = new Line(
      new BufferGeometry(),
      new LineBasicMaterial({
        color: '#67e8f9',
        transparent: true,
        opacity: 0.82,
        depthTest: false,
        depthWrite: false
      })
    );
    launchOverlay.name = 'viewer-projectile-trajectory-launch-overlay';
    // Only the short section crossing the depth-neutral slingshot ignores
    // scene depth. The remainder keeps normal occlusion against the robot.
    launchOverlay.renderOrder = ROBOT_VIEWER_PROJECTILE_TRAJECTORY_LAUNCH_OVERLAY_RENDER_ORDER;
    group.add(launchOverlay);
    this.projectileTrajectoryLaunchOverlay = launchOverlay;

    const impactArrow = new Mesh(
      new ConeGeometry(0.34, 1, 16),
      new MeshBasicMaterial({
        color: '#67e8f9',
        transparent: true,
        opacity: 0.9,
        depthTest: true,
        depthWrite: false
      })
    );
    impactArrow.name = 'viewer-projectile-impact-arrow';
    impactArrow.renderOrder = 1092;
    group.add(impactArrow);
    this.projectileImpactArrow = impactArrow;

    const particleRenderer = new ViewerProjectileParticleRenderer(
      VIEWER3D_PROJECTILE_PARTICLE_LIMIT,
      ROBOT_VIEWER_PROJECTILE_RADIUS_M,
      ROBOT_VIEWER_PROJECTILE_FADE_MS / 1_000
    );
    group.add(particleRenderer.mesh);
    this.projectileParticleRenderer = particleRenderer;

    this.scene.add(group);
    this.projectileInteractionGroup = group;
    return group;
  }

  private refreshProjectileAim(target = this.resolveDefaultProjectileTarget()): void {
    if (this.options.interactionMode !== 'projectile') return;
    const group = this.ensureProjectileInteractionGroup();
    group.visible = true;

    if (!target) {
      this.projectileAimLaunch = null;
      if (this.projectileTrajectoryLine) this.projectileTrajectoryLine.visible = false;
      if (this.projectileTrajectoryLaunchOverlay) this.projectileTrajectoryLaunchOverlay.visible = false;
      if (this.projectileImpactArrow) this.projectileImpactArrow.visible = false;
      return;
    }

    this.projectileAimTarget.copy(target.point);
    const origin = this.resolveProjectileLauncherOrigin(this.projectileAimTarget);
    this.projectileAimLaunch = this.createProjectileLaunchSolution(
      origin,
      this.projectileAimTarget,
      this.resolveProjectileChargeRatio()
    );
    this.updateProjectileAimPresentation();
  }

  private updateProjectileAimPresentation(): void {
    const launch = this.projectileAimLaunch;
    const launcher = this.projectileLauncherGroup;
    const line = this.projectileTrajectoryLine;
    const launchOverlay = this.projectileTrajectoryLaunchOverlay;
    const impactArrow = this.projectileImpactArrow;
    if (!launch || !launcher || !line || !launchOverlay || !impactArrow) return;

    const launchOrigin = new Vector3(launch.origin.x, launch.origin.y, launch.origin.z);
    launcher.position.copy(launchOrigin);
    const viewport = this.readViewportAuthority();
    const viewportHeight = this.rendererClientHeight || viewport.height;
    launcher.scale.setScalar(
      resolveViewerProjectileLauncherWorldScale(
        this.resolveWorldUnitsPerScreenPixel(launchOrigin, viewportHeight),
        ROBOT_VIEWER_PROJECTILE_LAUNCHER_SCREEN_SIZE_PX,
        ROBOT_VIEWER_PROJECTILE_LAUNCHER_AUTHORED_SIZE_M
      )
    );
    const initialDirection = new Vector3(launch.velocity.x, launch.velocity.y, launch.velocity.z).normalize();
    this.orientProjectileSlingshotPerpendicularToTangent(launcher, initialDirection);
    const localLaunchOriginOffset = new Vector3(
      0,
      ROBOT_VIEWER_SLINGSHOT_LAUNCH_ORIGIN_Y_M,
      ROBOT_VIEWER_SLINGSHOT_LAUNCH_ORIGIN_Z_M
    )
      .multiplyScalar(launcher.scale.x)
      .applyQuaternion(launcher.quaternion);
    launcher.position.copy(launchOrigin).sub(localLaunchOriginOffset);
    this.syncProjectileSlingshotPresentation(this.projectileSlingshotPullRatio);
    const points = createViewerProjectileTrajectoryPoints(launch, 40).map(
      (point) => new Vector3(point.x, point.y, point.z)
    );

    const launchOverlayLength = ROBOT_VIEWER_PROJECTILE_TRAJECTORY_LAUNCH_OVERLAY_LENGTH_M * launcher.scale.x;
    const pulledPouchOrigin = launcher.localToWorld(
      this.resolveProjectileSlingshotPouchPosition(this.projectileSlingshotPullRatio)
    );
    const launchOverlayPoints: Vector3[] = [pulledPouchOrigin];
    if (pulledPouchOrigin.distanceToSquared(points[0]) > 0.00000001) {
      launchOverlayPoints.push(points[0].clone());
    }
    let coveredLength = 0;
    let tailStart = points[0].clone();
    let tailStartIndex = 1;
    for (let index = 1; index < points.length; index += 1) {
      const from = points[index - 1];
      const to = points[index];
      const segmentLength = from.distanceTo(to);
      if (coveredLength + segmentLength >= launchOverlayLength) {
        const segmentRatio = MathUtils.clamp((launchOverlayLength - coveredLength) / segmentLength, 0, 1);
        tailStart = from.clone().lerp(to, segmentRatio);
        launchOverlayPoints.push(tailStart.clone());
        tailStartIndex = index;
        break;
      }
      launchOverlayPoints.push(to.clone());
      coveredLength += segmentLength;
      tailStart = to.clone();
      tailStartIndex = index + 1;
    }
    const trajectoryTailPoints = [tailStart, ...points.slice(tailStartIndex)];
    line.geometry.dispose();
    line.geometry = new BufferGeometry().setFromPoints(trajectoryTailPoints);
    line.visible = true;
    launchOverlay.geometry.dispose();
    launchOverlay.geometry = new BufferGeometry().setFromPoints(launchOverlayPoints);
    launchOverlay.visible = true;

    const impactDirection = new Vector3(
      launch.velocity.x + launch.gravity.x * launch.durationSeconds,
      launch.velocity.y + launch.gravity.y * launch.durationSeconds,
      launch.velocity.z + launch.gravity.z * launch.durationSeconds
    ).normalize();
    const impactArrowHeight =
      this.resolveWorldUnitsPerScreenPixel(this.projectileAimTarget, viewportHeight) *
      ROBOT_VIEWER_PROJECTILE_IMPACT_ARROW_SCREEN_SIZE_PX;
    impactArrow.scale.setScalar(impactArrowHeight);
    impactArrow.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), impactDirection);
    impactArrow.position
      .copy(this.projectileAimTarget)
      .addScaledVector(impactDirection, -impactArrowHeight * 0.5);
    impactArrow.visible = true;

    const realTarget = this.poseControlTarget === 'observed';
    const color = realTarget ? '#f59e0b' : '#67e8f9';
    (line.material as LineBasicMaterial).color.set(color);
    (launchOverlay.material as LineBasicMaterial).color.set(color);
    (impactArrow.material as MeshBasicMaterial).color.set(color);
  }

  private syncProjectileSlingshotSegment(mesh: Mesh, from: Vector3, to: Vector3): void {
    const direction = to.clone().sub(from);
    const length = Math.max(0.0001, direction.length());
    mesh.position.copy(from).add(to).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), direction.multiplyScalar(1 / length));
    mesh.scale.set(1, length, 1);
  }

  private orientProjectileSlingshotPerpendicularToTangent(launcher: Group, tangent: Vector3): void {
    const forward = tangent.clone().normalize();
    const cameraScreenUp = this.camera.up.clone().applyQuaternion(this.camera.quaternion).normalize();
    const vertical = cameraScreenUp.addScaledVector(forward, -cameraScreenUp.dot(forward));

    if (vertical.lengthSq() < 0.000001) {
      vertical
        .copy(new Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion))
        .addScaledVector(forward, -vertical.dot(forward));
    }

    vertical.normalize();
    const horizontal = vertical.clone().cross(forward).normalize();
    vertical.copy(forward).cross(horizontal).normalize();
    launcher.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(horizontal, vertical, forward));
  }

  private syncProjectileSlingshotPresentation(pullRatio: number): void {
    const launcher = this.projectileLauncherGroup;
    const leftElastic = this.projectileSlingshotLeftElastic;
    const rightElastic = this.projectileSlingshotRightElastic;
    const pouch = this.projectileSlingshotPouch;
    const loadedBall = this.projectileSlingshotLoadedBall;
    if (!launcher || !leftElastic || !rightElastic || !pouch || !loadedBall) return;

    const pouchPosition = this.resolveProjectileSlingshotPouchPosition(pullRatio);

    pouch.position.copy(pouchPosition).add(new Vector3(0, 0, -ROBOT_VIEWER_SLINGSHOT_POUCH_DEPTH_M));
    pouch.scale.set(
      ROBOT_VIEWER_SLINGSHOT_POUCH_HALF_WIDTH_M,
      ROBOT_VIEWER_SLINGSHOT_POUCH_HEIGHT_M,
      ROBOT_VIEWER_SLINGSHOT_POUCH_DEPTH_M
    );
    loadedBall.position.copy(pouchPosition);
    loadedBall.scale.setScalar(ROBOT_VIEWER_SLINGSHOT_BALL_RADIUS_M);
    loadedBall.visible =
      this.projectileChargeStartedAt !== null && this.projectileSlingshotReleaseState === null;

    this.syncProjectileSlingshotSegment(
      leftElastic,
      new Vector3(-0.038, 0.046, 0.035),
      new Vector3(-ROBOT_VIEWER_SLINGSHOT_POUCH_HALF_WIDTH_M, pouchPosition.y, pouchPosition.z)
    );
    this.syncProjectileSlingshotSegment(
      rightElastic,
      new Vector3(0.038, 0.046, 0.035),
      new Vector3(ROBOT_VIEWER_SLINGSHOT_POUCH_HALF_WIDTH_M, pouchPosition.y, pouchPosition.z)
    );
  }

  private resolveProjectileSlingshotPouchPosition(pullRatio: number): Vector3 {
    const normalizedPull = MathUtils.clamp(pullRatio, -0.24, 1);
    return new Vector3(
      0,
      ROBOT_VIEWER_SLINGSHOT_LAUNCH_ORIGIN_Y_M,
      ROBOT_VIEWER_SLINGSHOT_LAUNCH_ORIGIN_Z_M - ROBOT_VIEWER_SLINGSHOT_MAX_PULL_M * normalizedPull
    );
  }

  private beginProjectileSlingshotRelease(now: number, chargeRatio: number): void {
    this.projectileSlingshotPullRatio = MathUtils.clamp(
      Math.max(this.projectileSlingshotPullRatio, chargeRatio),
      0,
      1
    );
    this.projectileSlingshotReleaseState = {
      startedAt: now,
      initialPullRatio: this.projectileSlingshotPullRatio
    };
    this.syncProjectileSlingshotPresentation(this.projectileSlingshotPullRatio);
    this.scheduleLoop();
  }

  private updateProjectileSlingshotRelease(now: number): boolean {
    const release = this.projectileSlingshotReleaseState;
    if (!release || this.options.interactionMode !== 'projectile') return false;
    const progress = MathUtils.clamp((now - release.startedAt) / ROBOT_VIEWER_SLINGSHOT_RELEASE_MS, 0, 1);
    this.projectileSlingshotPullRatio = resolveViewerSlingshotReleasePull(release.initialPullRatio, progress);
    if (progress >= 1) {
      this.projectileSlingshotReleaseState = null;
      this.projectileSlingshotPullRatio = 0;
    }
    this.updateProjectileAimPresentation();
    return true;
  }

  private updateProjectileCameraProjection(): void {
    if (this.options.interactionMode !== 'projectile' || !this.projectileAimLaunch) {
      return;
    }
    const nextOrigin = this.resolveProjectileLauncherOrigin(this.projectileAimTarget);
    const currentOrigin = this.projectileAimLaunch.origin;
    if (
      nextOrigin.distanceToSquared(new Vector3(currentOrigin.x, currentOrigin.y, currentOrigin.z)) < 0.000001
    ) {
      return;
    }
    this.projectileAimLaunch = this.createProjectileLaunchSolution(
      nextOrigin,
      this.projectileAimTarget,
      this.resolveProjectileChargeRatio()
    );
    this.updateProjectileAimPresentation();
  }

  private resolveProjectileIdleTarget(): Vector3 {
    const referenceTarget = this.resolveDefaultProjectileTarget()?.point;
    this.projectileRaycaster.setFromCamera(new Vector2(0, -0.68), this.camera);
    const distance = referenceTarget ? this.projectileRaycaster.ray.origin.distanceTo(referenceTarget) : 1;
    return this.projectileRaycaster.ray.origin
      .clone()
      .addScaledVector(this.projectileRaycaster.ray.direction, Math.max(0.5, distance));
  }

  private beginProjectileIdleTransition(): void {
    if (this.options.interactionMode !== 'projectile') return;
    const idleTarget = this.resolveProjectileIdleTarget();
    this.projectileChargeStartedAt = null;
    this.projectileLastChargeRatio = 0;
    this.projectileSlingshotReleaseState = null;
    this.projectileSlingshotPullRatio = 0;
    this.syncProjectileSlingshotPresentation(0);
    this.reportProjectileInteraction('idle', undefined, this.poseControlTarget, undefined, 0);

    if (!this.projectileAimLaunch) {
      this.projectileAimTarget.copy(idleTarget);
      this.refreshProjectileAim({ point: idleTarget, bodyName: null });
      return;
    }
    if (this.projectileAimTarget.distanceToSquared(idleTarget) < 0.000001) {
      this.projectileAimTransition = null;
      return;
    }
    this.projectileAimTransition = {
      from: this.projectileAimTarget.clone(),
      target: idleTarget,
      startedAt: performance.now()
    };
    this.scheduleLoop();
  }

  private updateProjectileAimTransition(now: number): boolean {
    const transition = this.projectileAimTransition;
    if (!transition || this.options.interactionMode !== 'projectile') return false;
    const progress = MathUtils.clamp(
      (now - transition.startedAt) / ROBOT_VIEWER_PROJECTILE_IDLE_TRANSITION_MS,
      0,
      1
    );
    const eased = 1 - Math.pow(1 - progress, 3);
    this.projectileAimTarget.lerpVectors(transition.from, transition.target, eased);
    const origin = this.resolveProjectileLauncherOrigin(this.projectileAimTarget);
    this.projectileAimLaunch = this.createProjectileLaunchSolution(origin, this.projectileAimTarget, 0);
    this.updateProjectileAimPresentation();
    if (progress >= 1) this.projectileAimTransition = null;
    return true;
  }

  private createProjectileLaunchSolution(
    origin: Vector3,
    target: Vector3,
    chargeRatio: number
  ): ViewerProjectileLaunchSolution {
    const profile = resolveViewerProjectileChargedLaunchProfile(origin.distanceTo(target), chargeRatio);
    const launch = createViewerProjectileLaunchSolution({
      origin: { x: origin.x, y: origin.y, z: origin.z },
      target: { x: target.x, y: target.y, z: target.z },
      ...profile
    });
    this.projectileAimSpeedMetersPerSecond = Math.hypot(
      launch.velocity.x,
      launch.velocity.y,
      launch.velocity.z
    );
    return launch;
  }

  private resolveProjectileChargeRatio(now = performance.now()): number {
    if (this.projectileChargeStartedAt === null) return this.projectileLastChargeRatio;
    return MathUtils.clamp(
      (now - this.projectileChargeStartedAt) / ROBOT_VIEWER_PROJECTILE_CHARGE_MAX_MS,
      0,
      1
    );
  }

  private updateProjectileCharge(now: number): boolean {
    if (this.projectileChargeStartedAt === null || this.options.interactionMode !== 'projectile') {
      return false;
    }
    const origin = this.resolveProjectileLauncherOrigin(this.projectileAimTarget);
    const chargeRatio = this.resolveProjectileChargeRatio(now);
    this.projectileSlingshotPullRatio = chargeRatio;
    this.projectileAimLaunch = this.createProjectileLaunchSolution(
      origin,
      this.projectileAimTarget,
      chargeRatio
    );
    this.updateProjectileAimPresentation();
    return true;
  }

  private resolveProjectileLauncherOrigin(target: Vector3): Vector3 {
    const viewport = this.readViewportAuthority();
    const viewportHeight = Math.max(1, this.rendererClientHeight || viewport.height);
    const launcherBottomExtentPixels =
      (ROBOT_VIEWER_PROJECTILE_LAUNCHER_SCREEN_SIZE_PX * ROBOT_VIEWER_SLINGSHOT_BELOW_LAUNCH_EXTENT_M) /
      ROBOT_VIEWER_PROJECTILE_LAUNCHER_AUTHORED_SIZE_M;
    const safeBottomNdcY =
      -1 +
      ((launcherBottomExtentPixels + ROBOT_VIEWER_PROJECTILE_LAUNCHER_BOTTOM_MARGIN_PX) * 2) / viewportHeight;
    const launcherNdcY = Math.max(-0.82, safeBottomNdcY);
    this.projectileRaycaster.setFromCamera(new Vector2(0, launcherNdcY), this.camera);
    const distance = MathUtils.clamp(
      this.projectileRaycaster.ray.origin.distanceTo(target) * 0.2,
      0.22,
      ROBOT_VIEWER_CAMERA_MAX_DISTANCE * 0.22
    );
    const origin = this.projectileRaycaster.ray.origin
      .clone()
      .addScaledVector(this.projectileRaycaster.ray.direction, distance);
    origin.y = Math.max(
      origin.y,
      ROBOT_VIEWER_SUPPORT_FLOOR_Y +
        ROBOT_VIEWER_PROJECTILE_RADIUS_M +
        ROBOT_VIEWER_PROJECTILE_LAUNCH_FLOOR_CLEARANCE_M
    );
    return origin;
  }

  private resolveDefaultProjectileTarget(): { point: Vector3; bodyName: string | null } | null {
    const robot = this.getPoseControlRobot();
    if (!robot) return null;
    robot.updateWorldMatrix(true, true);
    const targetAnchor = this.resolveObjectFromRobot(robot, this.options.projectileTargetAnchorNames ?? []);
    const point = targetAnchor
      ? targetAnchor.getWorldPosition(new Vector3())
      : new Box3().setFromObject(robot).getCenter(new Vector3());
    return { point, bodyName: this.physicsVisualRootBodyName };
  }

  private resolveProjectileTargetFromPointer(
    event: PointerEvent | MouseEvent
  ): { point: Vector3; bodyName: string | null } | null {
    const viewport = this.readViewportAuthority();
    const robot = this.getPoseControlRobot();
    if (!viewport.visible || !robot) return null;
    this.projectilePointer.set(
      ((event.clientX - viewport.left) / viewport.width) * 2 - 1,
      -(((event.clientY - viewport.top) / viewport.height) * 2 - 1)
    );
    this.projectileRaycaster.setFromCamera(this.projectilePointer, this.camera);
    const robotHit = this.projectileRaycaster.intersectObject(robot, true)[0];
    if (robotHit) {
      return {
        point: robotHit.point.clone(),
        bodyName: this.resolveProjectilePhysicsBodyName(robotHit.object, robot)
      };
    }

    const defaultTarget = this.resolveDefaultProjectileTarget();
    if (!defaultTarget) return null;
    // Free aim remains a camera-space pick, never a lateral projection from
    // the launcher. A downward cursor ray lands on the support floor so misses
    // can bounce naturally; above the horizon it keeps the active robot's
    // focus depth, which still places the target exactly under the cursor.
    const floorPoint = this.projectileRaycaster.ray.intersectPlane(
      new Plane(new Vector3(0, 1, 0), -ROBOT_VIEWER_SUPPORT_FLOOR_Y),
      new Vector3()
    );
    const maximumFloorPickDistance = MathUtils.clamp(
      this.projectileRaycaster.ray.origin.distanceTo(defaultTarget.point) * 3,
      3,
      12
    );
    if (
      floorPoint &&
      floorPoint.distanceTo(this.projectileRaycaster.ray.origin) <= maximumFloorPickDistance
    ) {
      return { point: floorPoint, bodyName: null };
    }

    const focusDepthPlane = new Plane().setFromNormalAndCoplanarPoint(
      this.camera.getWorldDirection(new Vector3()),
      defaultTarget.point
    );
    const point = this.projectileRaycaster.ray.intersectPlane(focusDepthPlane, new Vector3());
    return point ? { point, bodyName: null } : null;
  }

  private resolveProjectilePhysicsBodyName(
    hitObject: Object3D,
    robot = this.getPoseControlRobot()
  ): string | null {
    const objectNames = new Set<string>();
    let cursor: Object3D | null = hitObject;
    while (cursor && cursor !== robot?.parent) {
      if (cursor.name) objectNames.add(cursor.name);
      if (cursor === robot) break;
      cursor = cursor.parent;
    }

    for (const [bodyName, names] of this.physicsVisualBodyObjectNames) {
      if (names.some((name) => objectNames.has(name))) return bodyName;
    }
    return this.physicsVisualRootBodyName;
  }

  private handleProjectilePointerMove = (event: PointerEvent): void => {
    this.projectilePointerInside = true;
    if (this.options.interactionMode !== 'projectile') return;
    const target = this.resolveProjectileTargetFromPointer(event);
    if (!target) return;
    this.projectileAimTransition = null;
    this.refreshProjectileAim(target);
    this.renderer.domElement.style.cursor = 'crosshair';
    this.requestRender();
  };

  private handleProjectilePointerEnter = (): void => {
    this.projectilePointerInside = true;
  };

  private handleProjectilePointerLeave = (): void => {
    this.projectilePointerInside = false;
    this.beginProjectileIdleTransition();
  };

  private handleProjectileWindowBlur = (): void => {
    this.projectilePointerInside = false;
    this.beginProjectileIdleTransition();
  };

  setInputBindingOverrides(overrides: readonly InteractionInputBindingOverride[]): void {
    this.options.inputBindingOverrides = overrides;
    this.resolvedInputBindings = resolveInteractionInputBindings(this.options.inputBindings, overrides);
  }

  dispatchInteractionInput(signal: InteractionInputSignal): boolean {
    if (this.destroyed) return false;
    const invocations = resolveInteractionInputActions(this.resolvedInputBindings, signal);
    let handled = false;
    for (const invocation of invocations) {
      if (this.executeInteractionAction(invocation.actionId)) handled = true;
    }
    return handled;
  }

  private handleInteractionKeyDown = (event: KeyboardEvent): void => {
    if (!this.projectilePointerInside || isEditableKeyboardTarget(event.target)) return;
    const handled = this.dispatchInteractionInput(createInteractionKeyboardSignal(event, 'press'));
    if (!handled) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  private handleInteractionKeyUp = (event: KeyboardEvent): void => {
    if (
      this.projectileChargeStartedAt === null &&
      (!this.projectilePointerInside || isEditableKeyboardTarget(event.target))
    ) {
      return;
    }
    const handled = this.dispatchInteractionInput(createInteractionKeyboardSignal(event, 'release'));
    if (!handled) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  private executeInteractionAction(actionId: string): boolean {
    if (actionId !== VIEWER_PROJECTILE_CHARGE_ACTION_ID && actionId !== VIEWER_PROJECTILE_LAUNCH_ACTION_ID) {
      return false;
    }
    if (this.options.interactionMode !== 'projectile') return false;
    if (!this.projectileAimLaunch) {
      this.projectileChargeStartedAt = null;
      this.reportProjectileInteraction('rejected', 'target-unavailable');
      return true;
    }
    if (this.poseControlTarget === 'observed') {
      this.projectileChargeStartedAt = null;
      this.reportProjectileInteraction('rejected', 'real-capability-unavailable');
      return true;
    }
    if (!this.isProjectilePhysicsReady()) {
      this.projectileChargeStartedAt = null;
      this.reportProjectileInteraction('rejected', 'physics-unavailable');
      return true;
    }

    if (actionId === VIEWER_PROJECTILE_CHARGE_ACTION_ID) {
      if (this.projectileChargeStartedAt !== null) return true;
      if (this.projectileParticles.length >= VIEWER3D_PROJECTILE_PARTICLE_LIMIT) {
        this.reportProjectileInteraction('rejected', 'projectile-limit-reached');
        return true;
      }
      this.projectileSlingshotReleaseState = null;
      this.projectileSlingshotPullRatio = 0;
      this.projectileChargeStartedAt = performance.now();
      this.projectileLastChargeRatio = 0;
      this.syncProjectileSlingshotPresentation(0);
      this.reportProjectileInteraction('charging', undefined, this.poseControlTarget, undefined, 0);
      this.scheduleLoop();
      return true;
    }

    if (this.projectileChargeStartedAt === null) return true;

    if (this.projectileParticles.length >= VIEWER3D_PROJECTILE_PARTICLE_LIMIT) {
      this.projectileChargeStartedAt = null;
      this.reportProjectileInteraction('rejected', 'projectile-limit-reached');
      return true;
    }
    const chargeRatio = this.resolveProjectileChargeRatio();
    this.projectileSlingshotPullRatio = chargeRatio;
    this.updateProjectileAimPresentation();
    // The drawn-back pouch is an anticipation pose. Free flight starts when
    // the elastic crosses its resting plane; spawning from the fully pulled
    // pouch can place the sphere below the floor and turn the shot into an
    // immediate ground rebound before it ever reaches the robot.
    const origin = new Vector3(
      this.projectileAimLaunch.origin.x,
      this.projectileAimLaunch.origin.y,
      this.projectileAimLaunch.origin.z
    );
    const launch = this.createProjectileLaunchSolution(origin, this.projectileAimTarget, chargeRatio);
    this.projectileChargeStartedAt = null;
    this.projectileLastChargeRatio = chargeRatio;
    this.projectileAimLaunch = launch;
    this.launchProjectile(launch, chargeRatio);
    return true;
  }

  private launchProjectile(launch: ViewerProjectileLaunchSolution, chargeRatio: number): void {
    if (this.destroyed) return;
    const group = this.ensureProjectileInteractionGroup();
    group.visible = true;
    const renderer = this.projectileParticleRenderer;
    const slot = renderer?.allocate();
    if (!renderer || slot === null || slot === undefined) {
      this.reportProjectileInteraction('rejected', 'projectile-limit-reached');
      return;
    }
    const now = performance.now();
    this.beginProjectileSlingshotRelease(now, chargeRatio);
    const position = new Vector3(launch.origin.x, launch.origin.y, launch.origin.z);
    renderer.setPhase(slot, 'flight', now / 1_000);
    renderer.updateTransform(slot, position, 0, 0, this.resolveProjectileVisualScale(position));
    this.projectileParticles.push({
      id: this.nextProjectileParticleId++,
      slot,
      position,
      velocity: new Vector3(launch.velocity.x, launch.velocity.y, launch.velocity.z),
      rotationX: 0,
      rotationY: 0,
      phase: 'flight',
      phaseStartedAt: now,
      bornAt: now,
      lastUpdatedAt: now,
      lastRobotContactAt: Number.NEGATIVE_INFINITY,
      launchSpeedMetersPerSecond: Math.hypot(launch.velocity.x, launch.velocity.y, launch.velocity.z),
      chargeRatio,
      target: this.poseControlTarget
    });
    this.reportProjectileInteraction(
      'launched',
      undefined,
      this.poseControlTarget,
      this.projectileAimSpeedMetersPerSecond,
      chargeRatio
    );
    this.requestRender();
  }

  private setProjectileParticlePhase(
    particle: Viewer3DProjectileParticle,
    phase: ViewerProjectileVisualPhase,
    now: number
  ): void {
    if (particle.phase === phase) return;
    particle.phase = phase;
    particle.phaseStartedAt = now;
    this.projectileParticleRenderer?.setPhase(particle.slot, phase, now / 1_000);
  }

  private updateProjectileInteraction(now: number): boolean {
    if (this.destroyed) return false;
    if (this.projectileParticles.length === 0) return false;
    this.projectileParticleRenderer?.setTime(now / 1_000);
    const simulatedRobot = this.robot;
    simulatedRobot?.updateWorldMatrix(true, true);
    const simulatedRobotBounds = simulatedRobot
      ? new Box3().setFromObject(simulatedRobot).expandByScalar(ROBOT_VIEWER_PROJECTILE_RADIUS_M)
      : null;
    const removed: Viewer3DProjectileParticle[] = [];

    for (const particle of this.projectileParticles) {
      if (particle.phase === 'fading') {
        if (now - particle.phaseStartedAt >= ROBOT_VIEWER_PROJECTILE_FADE_MS) {
          removed.push(particle);
        }
        continue;
      }

      if (
        particle.phase === 'settled' &&
        now - particle.phaseStartedAt >= ROBOT_VIEWER_PROJECTILE_SETTLED_HOLD_MS
      ) {
        this.setProjectileParticlePhase(particle, 'fading', now);
        continue;
      }
      if (now - particle.bornAt >= ROBOT_VIEWER_PROJECTILE_MAX_LIFETIME_MS) {
        this.setProjectileParticlePhase(particle, 'fading', now);
        continue;
      }
      if (particle.phase === 'settled') continue;

      const deltaSeconds = Math.max(0, (now - particle.lastUpdatedAt) / 1_000);
      particle.lastUpdatedAt = now;
      const step = stepViewerProjectileAgainstGround(
        {
          position: particle.position,
          velocity: particle.velocity
        },
        deltaSeconds,
        {
          gravity: { x: 0, y: -9.81, z: 0 },
          floorY: ROBOT_VIEWER_SUPPORT_FLOOR_Y,
          radius: ROBOT_VIEWER_PROJECTILE_RADIUS_M,
          restitution: ROBOT_VIEWER_PROJECTILE_GROUND_RESTITUTION,
          frictionPerSecond: ROBOT_VIEWER_PROJECTILE_GROUND_FRICTION_PER_SECOND,
          settleSpeedMetersPerSecond: ROBOT_VIEWER_PROJECTILE_SETTLE_SPEED_MPS
        }
      );
      const nextPosition = new Vector3(step.position.x, step.position.y, step.position.z);
      const nextVelocity = new Vector3(step.velocity.x, step.velocity.y, step.velocity.z);
      const robotContact =
        simulatedRobot &&
        now - particle.lastRobotContactAt >= ROBOT_VIEWER_PROJECTILE_ROBOT_CONTACT_COOLDOWN_MS
          ? this.resolveProjectileRobotCollision(
              particle,
              nextPosition,
              nextVelocity,
              simulatedRobot,
              simulatedRobotBounds,
              now
            )
          : false;
      if (!robotContact) {
        particle.position.copy(nextPosition);
        particle.velocity.copy(nextVelocity);
        if (step.settled) {
          this.setProjectileParticlePhase(particle, 'settled', now);
          this.reportProjectileInteraction(
            'settled',
            undefined,
            particle.target,
            particle.launchSpeedMetersPerSecond,
            particle.chargeRatio
          );
        } else if (step.contactedGround && particle.phase !== 'ground-contact') {
          this.setProjectileParticlePhase(particle, 'ground-contact', now);
          this.reportProjectileInteraction(
            'ground-contact',
            undefined,
            particle.target,
            particle.launchSpeedMetersPerSecond,
            particle.chargeRatio
          );
        }
      }
      particle.rotationX += deltaSeconds * 7;
      particle.rotationY += deltaSeconds * 5;
      this.projectileParticleRenderer?.updateTransform(
        particle.slot,
        particle.position,
        particle.rotationX,
        particle.rotationY,
        this.resolveProjectileVisualScale(particle.position)
      );
    }

    for (const particle of removed) {
      this.projectileParticleRenderer?.release(particle.slot);
      const index = this.projectileParticles.indexOf(particle);
      if (index >= 0) this.projectileParticles.splice(index, 1);
      this.reportProjectileInteraction(
        'removed',
        undefined,
        particle.target,
        particle.launchSpeedMetersPerSecond,
        particle.chargeRatio
      );
    }
    return true;
  }

  private resolveProjectileVisualScale(position: Vector3): number {
    const viewport = this.readViewportAuthority();
    const viewportHeight = this.rendererClientHeight || viewport.height;
    const maximumWorldRadius =
      this.resolveWorldUnitsPerScreenPixel(position, viewportHeight) *
      ROBOT_VIEWER_PROJECTILE_MAX_SCREEN_RADIUS_PX;
    return MathUtils.clamp(maximumWorldRadius / ROBOT_VIEWER_PROJECTILE_RADIUS_M, 0.01, 1);
  }

  private resolveProjectileRobotCollision(
    particle: Viewer3DProjectileParticle,
    nextPosition: Vector3,
    nextVelocity: Vector3,
    robot: Object3D,
    robotBounds: Box3 | null,
    now: number
  ): boolean {
    if (this.destroyed) return false;
    const segment = nextPosition.clone().sub(particle.position);
    const distance = segment.length();
    if (distance <= 0.000001) return false;
    const direction = segment.multiplyScalar(1 / distance);
    const physicsColliderHit = this.resolveProjectilePhysicsColliderHit(
      particle.position,
      direction,
      distance
    );
    this.projectileRaycaster.set(particle.position, direction);
    this.projectileRaycaster.near = 0;
    this.projectileRaycaster.far = distance + ROBOT_VIEWER_PROJECTILE_RADIUS_M;
    if (!physicsColliderHit && robotBounds) {
      const boundsHit = this.projectileRaycaster.ray.intersectBox(robotBounds, new Vector3());
      if (
        !boundsHit ||
        boundsHit.distanceTo(particle.position) > distance + ROBOT_VIEWER_PROJECTILE_RADIUS_M
      ) {
        this.projectileRaycaster.far = Number.POSITIVE_INFINITY;
        return false;
      }
    }
    const visualHit = physicsColliderHit
      ? null
      : (this.projectileRaycaster.intersectObject(robot, true)[0] ?? null);
    this.projectileRaycaster.far = Number.POSITIVE_INFINITY;
    if (!physicsColliderHit && !visualHit) return false;

    const hitPoint = physicsColliderHit?.point ?? visualHit!.point;
    const normal =
      physicsColliderHit?.normal ??
      visualHit?.face?.normal.clone().transformDirection(visualHit.object.matrixWorld).normalize() ??
      nextVelocity.clone().normalize().multiplyScalar(-1);
    particle.position.copy(hitPoint).addScaledVector(normal, ROBOT_VIEWER_PROJECTILE_RADIUS_M);
    particle.velocity
      .copy(nextVelocity)
      .reflect(normal)
      .multiplyScalar(ROBOT_VIEWER_PROJECTILE_ROBOT_RESTITUTION);
    particle.lastRobotContactAt = now;
    this.setProjectileParticlePhase(particle, 'robot-contact', now);

    const bodyName =
      physicsColliderHit?.bodyName ??
      (visualHit ? this.resolveProjectilePhysicsBodyName(visualHit.object, robot) : null);
    if (bodyName) {
      // A projectile impact is an explicit live command. Remaining in history
      // replay would make stepPhysics return after the single acknowledged
      // impact step, freezing momentum until the next ball arrives.
      this.resumeRuntimeHistoryLiveProjection();
      const viewerImpulse = resolveViewerProjectileImpulse(ROBOT_VIEWER_PROJECTILE_MASS_KG, {
        x: nextVelocity.x,
        y: nextVelocity.y,
        z: nextVelocity.z
      });
      const physicsImpulse = this.projectViewerImpulseToPhysics(
        new Vector3(viewerImpulse.x, viewerImpulse.y, viewerImpulse.z),
        bodyName
      );
      const physicsPoint = this.projectViewerPointToPhysics(hitPoint, bodyName);
      // An intentional impact supersedes any startup pose hold. Establish the
      // current SIM alignment before momentum changes the root, then arm the
      // dynamic window for the acknowledged impact step below.
      this.ensureProjectilePhysicsVisualAlignment();
      this.physicsKinematicHoldFrames = 0;
      this.physicsKinematicHoldRootPose = null;
      this.projectilePhysicsSettlingUntil = now + ROBOT_VIEWER_PROJECTILE_SETTLE_MS;
      // Do not rely on the coalesced display-loop step to realize an impact.
      // The impulse and this acknowledged step are posted in order to the
      // worker, so the next observation is guaranteed to include the hit.
      this.lastPhysicsStepAt = now;
      if (
        this.physicsService.applyBodyImpulse({
          bodyName,
          impulse: { x: physicsImpulse.x, y: physicsImpulse.y, z: physicsImpulse.z },
          point: { x: physicsPoint.x, y: physicsPoint.y, z: physicsPoint.z }
        } satisfies PhysicsBodyImpulse)
      ) {
        const impactStepSeconds =
          resolveViewerFrameSignalIntervalMs('physics-step', this.options.physicsStepRateHz) / 1_000;
        void this.physicsService
          .stepAndWait(impactStepSeconds)
          .then(() => {
            if (this.destroyed) return;
            // Impact feedback is an acknowledged physics observation, not a
            // predicted visual effect. Project it immediately and restart
            // interpolation from this new dynamic boundary.
            this.resetTemporalProjection();
            this.projectProjectilePhysicsObservation();
            this.scheduleLoop();
            this.requestRender();
          })
          .catch(() => {
            if (this.destroyed) return;
            this.projectilePhysicsSettlingUntil = 0;
            this.reportProjectileInteraction(
              'rejected',
              'physics-unavailable',
              particle.target,
              particle.launchSpeedMetersPerSecond,
              particle.chargeRatio
            );
          });
        this.reportProjectileInteraction(
          'impact',
          undefined,
          particle.target,
          particle.launchSpeedMetersPerSecond,
          particle.chargeRatio
        );
      } else {
        this.projectilePhysicsSettlingUntil = 0;
        this.reportProjectileInteraction(
          'rejected',
          'physics-unavailable',
          particle.target,
          particle.launchSpeedMetersPerSecond,
          particle.chargeRatio
        );
      }
    }
    return true;
  }

  private ensureProjectilePhysicsVisualAlignment(): void {
    if (this.physicsVisualRootToRobotMatrix || !this.robot || !this.physicsVisualRootBodyName) {
      return;
    }
    const bodyTransforms = this.physicsService.getBodyTransforms();
    const rootTransform =
      bodyTransforms.find((transform) => transform.metadata?.visualRoot === true) ??
      bodyTransforms.find((transform) => transform.bodyName === this.physicsVisualRootBodyName);
    if (!rootTransform) return;

    this.physicsVisualRootToRobotMatrix = this.resolvePhysicsVisualRootToRobotMatrix(
      this.createPhysicsBodyViewerWorldMatrix(rootTransform),
      bodyTransforms
    );
  }

  private projectProjectilePhysicsObservation(): void {
    const bodyTransforms = this.physicsService.getBodyTransforms();
    if (bodyTransforms.length === 0) return;
    const centerOfMass = this.physicsService.getCenterOfMass();
    this.projectedPhysicsBodyTransforms = bodyTransforms;
    this.projectedPhysicsCenterOfMass = centerOfMass;
    const rootPoseChanged = this.syncRobotRootFromPhysicsBody(bodyTransforms);
    const jointPoseChanged = this.syncRobotPoseFromPhysicsJointStates();

    if (rootPoseChanged || jointPoseChanged) {
      this.robot?.updateMatrixWorld(true);
      this.updateViewerDebugLayers();
    }
    if (this.shouldShowAnyPhysicsDebugLayer()) {
      this.syncPhysicsDebugTransforms(bodyTransforms, centerOfMass);
    }
  }

  private resolveProjectilePhysicsColliderHit(
    origin: Vector3,
    direction: Vector3,
    distance: number
  ): { point: Vector3; normal: Vector3; bodyName: string } | null {
    const bodyTransforms = this.physicsService.getBodyTransforms();
    if (bodyTransforms.length === 0) return null;

    const debugGroup = this.ensurePhysicsDebugGroup();
    this.applyPhysicsDebugPresentationTransform();
    let closest: { point: Vector3; normal: Vector3; bodyName: string; distance: number } | null = null;
    this.projectileRaycaster.set(origin, direction);
    this.projectileRaycaster.near = 0;
    this.projectileRaycaster.far = distance + ROBOT_VIEWER_PROJECTILE_RADIUS_M;

    for (const bodyTransform of bodyTransforms) {
      if (
        bodyTransform.bodyName === 'world' ||
        (this.physicsVisualBodyObjectNames.size > 0 &&
          !this.physicsVisualBodyObjectNames.has(bodyTransform.bodyName) &&
          bodyTransform.bodyName !== this.physicsVisualRootBodyName)
      ) {
        continue;
      }
      if (this.resolvePhysicsDebugColliderProxies(bodyTransform).length === 0) continue;

      const colliderGroup = this.syncPhysicsDebugColliders(bodyTransform, debugGroup);
      if (!colliderGroup) continue;
      colliderGroup.visible = this.options.showPhysicsColliders;
      colliderGroup.updateWorldMatrix(true, true);
      const hit = this.projectileRaycaster.intersectObject(colliderGroup, true)[0];
      if (!hit || (closest && hit.distance >= closest.distance)) continue;

      const normal = hit.face?.normal.clone().transformDirection(hit.object.matrixWorld).normalize();
      closest = {
        point: hit.point.clone(),
        normal: normal ?? direction.clone().multiplyScalar(-1),
        bodyName: bodyTransform.bodyName,
        distance: hit.distance
      };
    }

    this.projectileRaycaster.far = Number.POSITIVE_INFINITY;
    return closest;
  }

  private projectViewerImpulseToPhysics(impulse: Vector3, bodyName: string): Vector3 {
    const transform = this.physicsService
      .getBodyTransforms()
      .find((candidate) => candidate.bodyName === bodyName);
    if (!transform) return impulse;
    return projectViewerImpulseByFrame(impulse, this.createPhysicsCoordinateFrameQuaternion(transform));
  }

  private projectViewerPointToPhysics(point: Vector3, bodyName: string): Vector3 {
    const transform = this.physicsService
      .getBodyTransforms()
      .find((candidate) => candidate.bodyName === bodyName);
    if (!transform) return point.clone();

    this.simulatedRobotPresentationRoot.updateWorldMatrix(true, false);
    return projectViewerPointByFrame(
      point, this.simulatedRobotPresentationRoot.matrixWorld,
      this.createPhysicsCoordinateFrameQuaternion(transform)
    );
  }

  private isProjectilePhysicsReady(): boolean {
    const snapshot = this.physicsService.snapshot();
    const backendStatus = snapshot.backendStatus;

    return (
      snapshot.enabled &&
      snapshot.engine !== 'none' &&
      snapshot.initialized &&
      snapshot.loadedSourceId !== null &&
      backendStatus?.initialized !== false &&
      (backendStatus?.loadedSourceId === undefined ||
        backendStatus.loadedSourceId === snapshot.loadedSourceId) &&
      this.physicsService.getBodyTransforms().length > 0
    );
  }

  private reportProjectileInteraction(
    status: Viewer3DProjectileInteractionObservation['status'],
    reason?: Viewer3DProjectileInteractionObservation['reason'],
    target: Viewer3DPoseControlTarget = this.poseControlTarget,
    speedMetersPerSecond = this.projectileAimSpeedMetersPerSecond,
    chargeRatio = this.projectileLastChargeRatio
  ): void {
    this.options.onProjectileInteraction({
      status,
      target,
      massKilograms: ROBOT_VIEWER_PROJECTILE_MASS_KG,
      speedMetersPerSecond,
      activeCount: this.projectileParticles.length,
      limit: VIEWER3D_PROJECTILE_PARTICLE_LIMIT,
      launchedCount: this.nextProjectileParticleId - 1,
      chargeRatio: MathUtils.clamp(chargeRatio, 0, 1),
      ...(reason ? { reason } : {})
    });
  }

  private cancelProjectileInteraction(): void {
    this.projectileAimLaunch = null;
    this.projectileAimTransition = null;
    this.projectileChargeStartedAt = null;
    this.projectileLastChargeRatio = 0;
    this.projectileSlingshotPullRatio = 0;
    this.projectileSlingshotReleaseState = null;
    this.projectilePointerInside = false;
    const particles = this.projectileParticles.splice(0);
    for (const particle of particles) {
      this.projectileParticleRenderer?.release(particle.slot);
    }
    if (particles.length > 0) {
      this.reportProjectileInteraction('removed', undefined, particles[0].target);
    }
    if (this.projectileInteractionGroup) this.projectileInteractionGroup.visible = false;
  }

  private clearProjectileInteraction(): void {
    this.cancelProjectileInteraction();
    if (this.projectileInteractionGroup) {
      this.scene.remove(this.projectileInteractionGroup);
      this.disposeObject3D(this.projectileInteractionGroup);
    }
    this.projectileInteractionGroup = null;
    this.projectileLauncherGroup = null;
    this.projectileSlingshotLeftElastic = null;
    this.projectileSlingshotRightElastic = null;
    this.projectileSlingshotPouch = null;
    this.projectileSlingshotLoadedBall = null;
    this.projectileTrajectoryLine = null;
    this.projectileTrajectoryLaunchOverlay = null;
    this.projectileImpactArrow = null;
    this.projectileParticleRenderer = null;
  }

  private ensureContactPointGroup(): Group {
    if (this.contactPointGroup) {
      return this.contactPointGroup;
    }

    this.contactPointGroup = new Group();
    this.contactPointGroup.name = 'ContactPointPreview';
    this.contactPointGroup.visible = false;
    this.scene.add(this.contactPointGroup);
    return this.contactPointGroup;
  }

  private updateContactPointVisibility(): void {
    if (!this.contactPointGroup) {
      return;
    }

    const subjectVisible =
      this.poseControlTarget === 'observed'
        ? this.options.showObservedRobotGhost && this.observedRobotGhost !== null
        : this.options.showRobot && this.robotComparisonAppearance.mode !== 'observed-only';

    this.contactPointGroup.visible =
      subjectVisible && this.options.showContactPoints && this.contactPointGroup.children.length > 0;
  }

  private clearContactPoints(): void {
    if (!this.contactPointGroup) {
      return;
    }

    for (const child of [...this.contactPointGroup.children]) {
      this.contactPointGroup.remove(child);
      this.disposeObject3D(child);
    }

    this.contactPointGroup.visible = false;
  }

  private updateContactPoints(): void {
    const robot = this.getPoseControlRobot();
    if (!this.options.showContactPoints || !robot) {
      this.updateContactPointVisibility();
      return;
    }

    robot.updateMatrixWorld(true);
    const points = this.resolveContactPoints(robot);

    if (points.length === 0) {
      this.clearContactPoints();
      return;
    }

    const group = this.ensureContactPointGroup();
    this.clearContactPoints();

    for (const contact of points) {
      group.add(this.createContactPointMarker(contact));
    }

    this.updateContactPointVisibility();
  }

  private resolveContactPoints(robot: Object3D): Viewer3DContactPoint[] {
    if (this.poseControlTarget === 'observed' && this.comparisonProfileId) {
      const offset =
        this.robotComparisonAppearance.mode === 'offset'
          ? this.robotComparisonAppearance.offsetMeters /
            (this.robotComparisonAppearance.centeredSeparation ? 2 : 1)
          : 0;
      return this.resolveBalanceDebugSupportPolygon(this.resolveBalanceDebugPhysicsSupportPoints()).map(
        (point, index) => ({
          id: `comparison-support-${index}`,
          side: 'fallback',
          point: new Vector3(point.x + offset, 0.018, point.z)
        })
      );
    }
    const contactFrames = this.options.diagnosticContactDefinitions ?? [];
    const points = contactFrames
      .map((contact) => {
        const object = this.resolveObjectFromRobot(robot, contact.names);

        if (!object) {
          return null;
        }

        const worldPoint = object.getWorldPosition(new Vector3());
        return {
          id: contact.id,
          point: new Vector3(worldPoint.x, 0.018, worldPoint.z),
          side: contact.side
        };
      })
      .filter((point): point is Viewer3DContactPoint => Boolean(point));

    if (points.length > 0) {
      return points;
    }

    const bounds = new Box3().setFromObject(robot);

    if (!Number.isFinite(bounds.min.x)) {
      return [];
    }

    const fallbackPoints =
      this.poseControlTarget === 'observed'
        ? this.createBalanceDebugBoundsSupportPoints(bounds)
        : this.resolveBalanceDebugSupportPoints(bounds);

    return this.resolveBalanceDebugSupportPolygon(fallbackPoints).map((point, index) => ({
      id: `fallback-contact-${index}`,
      point: new Vector3(point.x, 0.018, point.z),
      side: 'fallback'
    }));
  }

  private createContactPointMarker(contact: Viewer3DContactPoint): Mesh {
    const color = contact.side === 'left' ? '#fb923c' : contact.side === 'right' ? '#5eead4' : '#67e8f9';
    const marker = new Mesh(
      new SphereGeometry(0.018, 16, 10),
      new MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.88,
        depthTest: false,
        depthWrite: false
      })
    );
    marker.name = `contact-${contact.id}`;
    marker.position.copy(contact.point);
    marker.renderOrder = 998;
    return marker;
  }

  private ensurePhysicsDebugGroup(): Group {
    if (this.physicsDebugGroup) {
      return this.physicsDebugGroup;
    }

    this.physicsDebugGroup = new Group();
    this.physicsDebugGroup.name = 'PhysicsTransformDebugPreview';
    this.physicsDebugGroup.visible = false;
    this.scene.add(this.physicsDebugGroup);
    this.applyPhysicsDebugPresentationTransform();
    return this.physicsDebugGroup;
  }

  /** Physics diagnostics are authored in the SIM authority frame. */
  private applyPhysicsDebugPresentationTransform(): void {
    if (!this.physicsDebugGroup) {
      return;
    }

    this.physicsDebugGroup.position.copy(this.simulatedRobotPresentationRoot.position);
    this.physicsDebugGroup.quaternion.copy(this.simulatedRobotPresentationRoot.quaternion);
    this.physicsDebugGroup.scale.copy(this.simulatedRobotPresentationRoot.scale);
    this.physicsDebugGroup.updateMatrixWorld(true);
  }

  private updatePhysicsDebugVisibility(): void {
    if (!this.physicsDebugGroup) {
      return;
    }

    this.physicsDebugGroup.visible =
      (this.poseControlTarget === 'simulated' || this.comparisonProfileId !== null) &&
      this.shouldShowAnyPhysicsDebugLayer() &&
      this.isPhysicsActive() &&
      this.physicsDebugGroup.children.length > 0;
  }

  private shouldShowAnyPhysicsDebugLayer(): boolean {
    return (
      this.options.showPhysicsDebug ||
      this.options.showPhysicsColliders ||
      this.options.showPhysicsCenterOfMass ||
      this.options.showPhysicsGravity
    );
  }

  private clearPhysicsDebug(): void {
    if (!this.physicsDebugGroup) {
      return;
    }

    for (const child of [...this.physicsDebugGroup.children]) {
      this.physicsDebugGroup.remove(child);
      this.disposeObject3D(child);
    }

    this.physicsDebugMarkers.clear();
    this.physicsDebugLinks.clear();
    this.physicsDebugColliders.clear();
    this.physicsCenterOfMassMarker = null;
    this.physicsDebugGroundMesh = null;
    this.physicsDebugGravityArrow = null;
    this.physicsDebugGroup.visible = false;
  }

  private syncPhysicsDebugTransforms(
    bodyTransforms: readonly BodyTransform[] = this.projectedPhysicsBodyTransforms.length > 0
      ? this.projectedPhysicsBodyTransforms
      : this.physicsService.getBodyTransforms(),
    centerOfMass = this.projectedPhysicsBodyTransforms.length > 0
      ? this.projectedPhysicsCenterOfMass
      : this.physicsService.getCenterOfMass(),
    options: { force?: boolean } = {}
  ): void {
    const shouldShowMarkers = this.options.showPhysicsDebug && (options.force || this.isPhysicsActive());
    const shouldShowColliders =
      this.options.showPhysicsColliders && (options.force || this.isPhysicsActive());
    const shouldMaintainProjectileColliders =
      this.options.interactionMode === 'projectile' &&
      (this.projectileChargeStartedAt !== null || this.projectileParticles.length > 0) &&
      (options.force || this.isPhysicsActive());
    const shouldMaintainColliders = shouldShowColliders || shouldMaintainProjectileColliders;
    const shouldShowCenterOfMass =
      this.options.showPhysicsCenterOfMass && (options.force || this.isPhysicsActive());
    const shouldShowGravity = this.options.showPhysicsGravity && (options.force || this.isPhysicsActive());
    const shouldShowPhysicsDebug = shouldShowMarkers || shouldMaintainColliders || shouldShowCenterOfMass;

    if (
      (!shouldShowPhysicsDebug && !shouldShowGravity) ||
      (bodyTransforms.length === 0 && !centerOfMass && !shouldShowGravity)
    ) {
      this.updatePhysicsDebugVisibility();
      return;
    }

    const group = this.ensurePhysicsDebugGroup();
    this.syncPhysicsDebugCoordinateFrame(group, bodyTransforms);
    this.syncPhysicsDebugEnvironment(group);
    const activeBodyNames = new Set<string>();
    const activeLinkKeys = new Set<string>();
    const activeColliderKeys = new Set<string>();

    if (shouldShowMarkers || shouldMaintainColliders) {
      for (const bodyTransform of bodyTransforms) {
        if (!this.shouldDisplayPhysicsDebugBody(bodyTransform)) {
          continue;
        }

        if (shouldShowMarkers) {
          const marker = this.ensurePhysicsDebugMarker(bodyTransform);
          const markerPose = this.resolvePhysicsDebugMarkerPose(bodyTransform);

          activeBodyNames.add(bodyTransform.bodyName);
          this.syncPhysicsDebugMarkerStyle(marker, bodyTransform);
          marker.position.copy(markerPose.position);
          marker.quaternion.copy(markerPose.quaternion);
          marker.visible = true;

          if (marker.parent !== group) {
            group.add(marker);
          }
        }

        if (!shouldMaintainColliders) {
          continue;
        }

        const colliderGroup = this.syncPhysicsDebugColliders(bodyTransform, group);

        if (colliderGroup) {
          colliderGroup.visible = shouldShowColliders;
          activeColliderKeys.add(bodyTransform.bodyName);
        }
      }
    }

    if (shouldShowMarkers) {
      for (const bodyTransform of bodyTransforms) {
        if (!this.shouldDisplayPhysicsDebugBody(bodyTransform)) {
          continue;
        }

        if (!this.shouldDisplayPhysicsDebugLink(bodyTransform)) {
          continue;
        }

        const parentBodyName = this.resolvePhysicsDebugParentBodyName(bodyTransform);

        if (!parentBodyName || !activeBodyNames.has(parentBodyName)) {
          continue;
        }

        const parentMarker = this.physicsDebugMarkers.get(parentBodyName);
        const childMarker = this.physicsDebugMarkers.get(bodyTransform.bodyName);

        if (!parentMarker || !childMarker) {
          continue;
        }

        const linkKey = `${parentBodyName}->${bodyTransform.bodyName}`;
        const link = this.ensurePhysicsDebugLink(linkKey);

        activeLinkKeys.add(linkKey);
        link.geometry.setFromPoints([parentMarker.position, childMarker.position]);
        link.visible = true;

        if (link.parent !== group) {
          group.add(link);
        }
      }
    }

    for (const [bodyName, marker] of this.physicsDebugMarkers) {
      if (activeBodyNames.has(bodyName)) {
        continue;
      }

      this.physicsDebugMarkers.delete(bodyName);
      group.remove(marker);
      this.disposeObject3D(marker);
    }

    for (const [linkKey, link] of this.physicsDebugLinks) {
      if (activeLinkKeys.has(linkKey)) {
        continue;
      }

      this.physicsDebugLinks.delete(linkKey);
      group.remove(link);
      this.disposeObject3D(link);
    }

    for (const [bodyName, collider] of this.physicsDebugColliders) {
      if (activeColliderKeys.has(bodyName)) {
        continue;
      }

      this.physicsDebugColliders.delete(bodyName);
      group.remove(collider);
      this.disposeObject3D(collider);
    }

    this.syncPhysicsCenterOfMassMarker(shouldShowCenterOfMass ? centerOfMass : null, group, bodyTransforms);
    this.updatePhysicsDebugVisibility();
  }

  private syncPhysicsDebugEnvironment(group: Group): void {
    const ground = this.ensurePhysicsDebugGroundMesh();
    ground.visible =
      this.options.showPhysicsDebug ||
      this.options.showPhysicsColliders ||
      this.options.showPhysicsCenterOfMass;

    if (ground.parent !== group) {
      group.add(ground);
    }

    const gravityArrow = this.ensurePhysicsDebugGravityArrow();
    gravityArrow.visible = this.options.showPhysicsGravity;

    if (gravityArrow.parent !== group) {
      group.add(gravityArrow);
    }
  }

  private ensurePhysicsDebugGroundMesh(): Mesh {
    if (this.physicsDebugGroundMesh) {
      return this.physicsDebugGroundMesh;
    }

    this.physicsDebugGroundMesh = new Mesh(
      new PlaneGeometry(4.4, 4.4),
      new MeshBasicMaterial({
        color: '#0f2740',
        transparent: true,
        opacity: 0.24,
        depthTest: true,
        depthWrite: false
      })
    );
    this.physicsDebugGroundMesh.name = 'physics-debug-ground-plane';
    this.physicsDebugGroundMesh.rotation.x = -Math.PI / 2;
    this.physicsDebugGroundMesh.renderOrder = 998;
    return this.physicsDebugGroundMesh;
  }

  private ensurePhysicsDebugGravityArrow(): Group {
    if (this.physicsDebugGravityArrow) {
      return this.physicsDebugGravityArrow;
    }

    const arrow = new Group();
    arrow.name = 'physics-debug-gravity-arrow';
    arrow.position.set(-0.36, -0.36, 0.62);
    arrow.renderOrder = 1004;

    const material = new LineBasicMaterial({
      color: '#f97316',
      transparent: true,
      opacity: 0.84,
      depthTest: false,
      depthWrite: false
    });
    const shaft = new Line(
      new BufferGeometry().setFromPoints([new Vector3(0, 0, 0), new Vector3(0, -0.42, 0)]),
      material
    );
    shaft.name = 'physics-debug-gravity-arrow-shaft';
    shaft.renderOrder = 1004;
    arrow.add(shaft);

    const head = new Mesh(
      new ConeGeometry(0.024, 0.07, 18),
      new MeshBasicMaterial({
        color: '#f97316',
        transparent: true,
        opacity: 0.9,
        depthTest: false,
        depthWrite: false
      })
    );
    head.name = 'physics-debug-gravity-arrow-head';
    head.position.set(0, -0.45, 0);
    head.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(0, -1, 0));
    head.renderOrder = 1005;
    arrow.add(head);

    this.physicsDebugGravityArrow = arrow;
    return this.physicsDebugGravityArrow;
  }

  private resolvePhysicsDebugMarkerPosition(bodyTransform: BodyTransform): Vector3 {
    return this.resolvePhysicsDebugMarkerPose(bodyTransform).position;
  }

  private resolvePhysicsDebugMarkerQuaternion(bodyTransform: BodyTransform): Quaternion {
    return this.resolvePhysicsDebugMarkerPose(bodyTransform).quaternion;
  }

  private resolvePhysicsDebugBodyPose(bodyTransform: BodyTransform): {
    position: Vector3;
    quaternion: Quaternion;
  } {
    const position = new Vector3();
    const quaternion = new Quaternion();

    this.createPhysicsBodyViewerWorldMatrix(bodyTransform).decompose(position, quaternion, new Vector3());

    return { position, quaternion };
  }

  private resolvePhysicsDebugMarkerPose(bodyTransform: BodyTransform): {
    position: Vector3;
    quaternion: Quaternion;
  } {
    const bodyPose = this.resolvePhysicsDebugBodyPose(bodyTransform);
    const centerOfMass = this.resolvePhysicsDebugBodyCenterOfMass(bodyTransform);

    if (!centerOfMass) {
      return bodyPose;
    }

    const position = new Vector3();
    const quaternion = bodyPose.quaternion.clone();
    const centerOfMassTransform: BodyTransform = {
      ...bodyTransform,
      position: centerOfMass
    };

    this.createPhysicsBodyViewerWorldMatrix(centerOfMassTransform).decompose(
      position,
      new Quaternion(),
      new Vector3()
    );

    return { position, quaternion };
  }

  private resolvePhysicsDebugBodyCenterOfMass(
    bodyTransform: BodyTransform
  ): BodyTransform['position'] | null {
    const centerOfMass = bodyTransform.metadata?.centerOfMass;

    if (!centerOfMass || typeof centerOfMass !== 'object' || Array.isArray(centerOfMass)) {
      return null;
    }

    const x = centerOfMass.x;
    const y = centerOfMass.y;
    const z = centerOfMass.z;

    if (
      typeof x !== 'number' ||
      typeof y !== 'number' ||
      typeof z !== 'number' ||
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      !Number.isFinite(z)
    ) {
      return null;
    }

    return { x, y, z };
  }

  private shouldDisplayPhysicsDebugBody(bodyTransform: BodyTransform): boolean {
    if (bodyTransform.metadata?.debugVisible === false) {
      return false;
    }

    if (!this.robot) {
      return true;
    }

    return this.hasPhysicsDebugVisualAnchor(bodyTransform.bodyName);
  }

  private shouldDisplayPhysicsDebugLink(bodyTransform: BodyTransform): boolean {
    return (
      bodyTransform.metadata?.support !== true &&
      bodyTransform.metadata?.contact !== true &&
      bodyTransform.metadata?.role !== 'auxiliary'
    );
  }

  private syncPhysicsDebugMarkerStyle(marker: Group, bodyTransform: BodyTransform): void {
    const anchor = marker.children.find(
      (child) => child.name === `physics-body-anchor-${bodyTransform.bodyName}`
    ) as Mesh | undefined;
    const material = anchor?.material as MeshBasicMaterial | undefined;

    if (!anchor || !material) {
      return;
    }

    material.color.set(this.resolvePhysicsDebugMarkerColor(bodyTransform));
    material.opacity = bodyTransform.metadata?.visualRoot === true ? 0.88 : 0.72;
    anchor.scale.setScalar(this.resolvePhysicsDebugMarkerScale(bodyTransform));
  }

  private resolvePhysicsDebugMarkerScale(bodyTransform: BodyTransform): number {
    return this.resolvePhysicsDebugMarkerRadius(bodyTransform) / 0.018;
  }

  private resolvePhysicsDebugMarkerRadius(bodyTransform: BodyTransform): number {
    const mass = this.resolvePhysicsDebugBodyMass(bodyTransform);

    if (bodyTransform.metadata?.visualRoot === true) {
      return 0.036;
    }

    if (bodyTransform.metadata?.support === true || bodyTransform.metadata?.contact === true) {
      return 0.022;
    }

    if (mass === null) {
      return 0.018;
    }

    return MathUtils.clamp(0.012 + Math.sqrt(mass) * 0.012, 0.012, 0.052);
  }

  private resolvePhysicsDebugBodyMass(bodyTransform: BodyTransform): number | null {
    const mass = bodyTransform.metadata?.mass;

    return typeof mass === 'number' && Number.isFinite(mass) && mass > 0 ? mass : null;
  }

  private resolvePhysicsDebugMarkerColor(bodyTransform: BodyTransform): string {
    if (bodyTransform.metadata?.visualRoot === true) {
      return '#facc15';
    }

    if (bodyTransform.metadata?.support === true) {
      return '#34d399';
    }

    if (bodyTransform.metadata?.contact === true) {
      return '#fb923c';
    }

    if (bodyTransform.metadata?.role === 'auxiliary') {
      return '#64748b';
    }

    return '#22d3ee';
  }

  private syncPhysicsDebugColliders(bodyTransform: BodyTransform, group: Group): Group | null {
    const colliders = this.resolvePhysicsDebugColliderProxies(bodyTransform);

    if (colliders.length === 0) {
      return null;
    }

    const colliderGroup = this.ensurePhysicsDebugColliderGroup(bodyTransform, colliders);

    const colliderPose = this.resolvePhysicsDebugBodyPose(bodyTransform);

    colliderGroup.position.copy(colliderPose.position);
    colliderGroup.quaternion.copy(colliderPose.quaternion);
    colliderGroup.visible = true;

    if (colliderGroup.parent !== group) {
      group.add(colliderGroup);
    }

    return colliderGroup;
  }

  private ensurePhysicsDebugColliderGroup(
    bodyTransform: BodyTransform,
    colliders: readonly PhysicsColliderProxy[]
  ): Group {
    const signature = JSON.stringify(colliders);
    const existingCollider = this.physicsDebugColliders.get(bodyTransform.bodyName);

    if (existingCollider && existingCollider.userData.signature === signature) {
      return existingCollider;
    }

    if (existingCollider) {
      existingCollider.parent?.remove(existingCollider);
      this.disposeObject3D(existingCollider);
    }

    const colliderGroup = new Group();
    const color = this.resolvePhysicsDebugColliderColor(bodyTransform);

    colliderGroup.name = `physics-collider-${bodyTransform.bodyName}`;
    colliderGroup.renderOrder = 999;
    colliderGroup.userData.signature = signature;

    for (const [index, collider] of colliders.entries()) {
      const colliderObject = this.createPhysicsDebugColliderObject(collider, color);

      colliderObject.name = `physics-collider-${bodyTransform.bodyName}-${collider.label ?? index}`;
      colliderGroup.add(colliderObject);
    }

    this.physicsDebugColliders.set(bodyTransform.bodyName, colliderGroup);
    return colliderGroup;
  }

  private createPhysicsDebugColliderObject(collider: PhysicsColliderProxy, color: string): Object3D {
    if (collider.shape === 'capsule') {
      return this.createPhysicsDebugCapsuleCollider(collider, color);
    }

    const size = Array.isArray(collider.size) ? collider.size : [];
    const material = this.createPhysicsDebugColliderMaterial(color);
    const mesh =
      collider.shape === 'box'
        ? new Mesh(
            new BoxGeometry(
              (size[0] ?? 0.02) * 2,
              (size[1] ?? size[0] ?? 0.02) * 2,
              (size[2] ?? size[0] ?? 0.02) * 2
            ),
            material
          )
        : new Mesh(new SphereGeometry(1, 18, 10), material);

    if (collider.shape === 'sphere') {
      const radius = size[0] ?? 0.02;
      mesh.scale.set(radius, radius, radius);
    }

    if (collider.shape === 'ellipsoid') {
      mesh.scale.set(size[0] ?? 0.02, size[1] ?? size[0] ?? 0.02, size[2] ?? size[0] ?? 0.02);
    }

    this.applyPhysicsDebugColliderLocalTransform(mesh, collider);
    mesh.renderOrder = 999;
    return mesh;
  }

  private createPhysicsDebugCapsuleCollider(collider: PhysicsColliderProxy, color: string): Object3D {
    const radius = Array.isArray(collider.size) ? (collider.size[0] ?? 0.02) : 0.02;
    const fromTo = Array.isArray(collider.fromTo) ? collider.fromTo : [];
    const start = new Vector3(fromTo[0] ?? 0, fromTo[1] ?? 0, fromTo[2] ?? 0);
    const end = new Vector3(fromTo[3] ?? 0, fromTo[4] ?? 0, fromTo[5] ?? 0);
    const direction = end.clone().sub(start);
    const length = direction.length();
    const capsule = new Group();
    const material = this.createPhysicsDebugColliderMaterial(color);

    capsule.position.copy(start.clone().add(end).multiplyScalar(0.5));

    if (length > 0.000001) {
      capsule.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), direction.clone().normalize());
      const cylinder = new Mesh(new CylinderGeometry(radius, radius, length, 16, 1, true), material.clone());
      cylinder.name = 'physics-collider-capsule-shaft';
      cylinder.renderOrder = 999;
      capsule.add(cylinder);

      const startCap = new Mesh(new SphereGeometry(radius, 16, 8), material.clone());
      const endCap = new Mesh(new SphereGeometry(radius, 16, 8), material.clone());
      startCap.name = 'physics-collider-capsule-start';
      endCap.name = 'physics-collider-capsule-end';
      startCap.position.y = -length * 0.5;
      endCap.position.y = length * 0.5;
      startCap.renderOrder = 999;
      endCap.renderOrder = 999;
      capsule.add(startCap, endCap);
    } else {
      const sphere = new Mesh(new SphereGeometry(radius, 16, 8), material);
      sphere.name = 'physics-collider-capsule-point';
      sphere.renderOrder = 999;
      capsule.add(sphere);
    }

    this.applyPhysicsDebugColliderLocalTransform(capsule, collider);
    return capsule;
  }

  private createPhysicsDebugColliderMaterial(color: string): MeshBasicMaterial {
    return new MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.18,
      depthTest: true,
      depthWrite: false,
      wireframe: false
    });
  }

  private applyPhysicsDebugColliderLocalTransform(object: Object3D, collider: PhysicsColliderProxy): void {
    const position = collider.position;
    const rotation = collider.rotation;

    if (position) {
      object.position.add(new Vector3(position.x, position.y, position.z));
    }

    if (rotation) {
      object.quaternion.multiply(new Quaternion(rotation.x, rotation.y, rotation.z, rotation.w));
    }
  }

  private resolvePhysicsDebugColliderColor(bodyTransform: BodyTransform): string {
    if (bodyTransform.metadata?.visualRoot === true) {
      return '#facc15';
    }

    if (bodyTransform.metadata?.support === true) {
      return '#34d399';
    }

    if (bodyTransform.metadata?.contact === true) {
      return '#fb923c';
    }

    return '#22d3ee';
  }

  private resolvePhysicsDebugColliderProxies(bodyTransform: BodyTransform): PhysicsColliderProxy[] {
    const colliderProxies: unknown = bodyTransform.metadata?.colliderProxies;

    if (!Array.isArray(colliderProxies)) {
      return [];
    }

    return colliderProxies.filter((collider): collider is PhysicsColliderProxy => {
      return (
        collider !== null &&
        typeof collider === 'object' &&
        !Array.isArray(collider) &&
        typeof collider.shape === 'string' &&
        ['sphere', 'box', 'capsule', 'ellipsoid'].includes(collider.shape)
      );
    });
  }

  private resolvePhysicsDebugVisualJointPosition(bodyName: string): Vector3 | null {
    const robot = this.robot;
    const object = this.resolvePhysicsDebugVisualObject(bodyName);

    if (!robot || !object || typeof object.getWorldPosition !== 'function') {
      return null;
    }

    robot.updateMatrixWorld(true);
    return object.getWorldPosition(new Vector3());
  }

  private hasPhysicsDebugVisualAnchor(bodyName: string): boolean {
    return Boolean(this.resolvePhysicsDebugVisualObject(bodyName));
  }

  private resolvePhysicsDebugVisualObject(bodyName: string): Object3D | null {
    if (!this.robot || bodyName === 'world') {
      return null;
    }

    const objectNames = this.physicsVisualBodyObjectNames.get(bodyName) ?? [bodyName];

    return this.resolveRobotObject(objectNames) ?? this.resolveRobotObject([bodyName]);
  }

  private syncPhysicsDebugCoordinateFrame(group: Group, bodyTransforms: readonly BodyTransform[]): void {
    this.applyPhysicsDebugPresentationTransform();
    const coordinateFrameTransform = bodyTransforms.find(
      (bodyTransform) =>
        typeof bodyTransform.metadata?.coordinateFrame === 'string' &&
        bodyTransform.metadata.coordinateFrame.length > 0
    );

    if (coordinateFrameTransform) {
      group.userData.coordinateFrame = coordinateFrameTransform.metadata?.coordinateFrame;
      group.userData.sceneYawRadians = this.resolvePhysicsSceneYawRadians(
        coordinateFrameTransform.metadata?.sceneYawRadians
      );
      return;
    }

    group.userData.coordinateFrame = null;
    group.userData.sceneYawRadians = null;
  }

  private resolvePhysicsDebugParentBodyName(bodyTransform: BodyTransform): string | null {
    const parentBodyName = bodyTransform.metadata?.parentBodyName;

    return typeof parentBodyName === 'string' && parentBodyName.length > 0 ? parentBodyName : null;
  }

  private syncPhysicsCenterOfMassMarker(
    centerOfMass: BodyTransform['position'] | null,
    group: Group,
    bodyTransforms: readonly BodyTransform[]
  ): void {
    if (!centerOfMass) {
      if (this.physicsCenterOfMassMarker) {
        group.remove(this.physicsCenterOfMassMarker);
        this.disposeObject3D(this.physicsCenterOfMassMarker);
        this.physicsCenterOfMassMarker = null;
      }

      return;
    }

    const marker = this.ensurePhysicsCenterOfMassMarker();

    marker.position.copy(this.resolvePhysicsVectorViewerPosition(centerOfMass, bodyTransforms));
    marker.visible = true;

    if (marker.parent !== group) {
      group.add(marker);
    }
  }

  private ensurePhysicsCenterOfMassMarker(): Mesh {
    if (this.physicsCenterOfMassMarker) {
      return this.physicsCenterOfMassMarker;
    }

    this.physicsCenterOfMassMarker = new Mesh(
      new SphereGeometry(0.028, 18, 10),
      new MeshBasicMaterial({
        color: '#facc15',
        transparent: true,
        opacity: 0.86,
        depthTest: false,
        depthWrite: false
      })
    );
    this.physicsCenterOfMassMarker.name = 'physics-center-of-mass';
    this.physicsCenterOfMassMarker.renderOrder = 1003;
    return this.physicsCenterOfMassMarker;
  }

  private ensurePhysicsDebugMarker(bodyTransform: BodyTransform): Group {
    const existingMarker = this.physicsDebugMarkers.get(bodyTransform.bodyName);

    if (existingMarker) {
      return existingMarker;
    }

    const marker = new Group();
    marker.name = `physics-body-${bodyTransform.bodyName}`;
    marker.renderOrder = 1001;

    const sphere = new Mesh(
      new SphereGeometry(0.018, 14, 8),
      new MeshBasicMaterial({
        color: '#22d3ee',
        transparent: true,
        opacity: 0.72,
        depthTest: false,
        depthWrite: false
      })
    );

    sphere.name = `physics-body-anchor-${bodyTransform.bodyName}`;
    sphere.renderOrder = 1002;
    marker.add(sphere);
    marker.add(this.createPhysicsDebugAxis(new Vector3(0.055, 0, 0), '#f87171'));
    marker.add(this.createPhysicsDebugAxis(new Vector3(0, 0.055, 0), '#4ade80'));
    marker.add(this.createPhysicsDebugAxis(new Vector3(0, 0, 0.055), '#60a5fa'));
    this.physicsDebugMarkers.set(bodyTransform.bodyName, marker);
    return marker;
  }

  private ensurePhysicsDebugLink(linkKey: string): Line {
    const existingLink = this.physicsDebugLinks.get(linkKey);

    if (existingLink) {
      return existingLink;
    }

    const link = new Line(
      new BufferGeometry().setFromPoints([new Vector3(0, 0, 0), new Vector3(0, 0, 0)]),
      new LineBasicMaterial({
        color: '#38bdf8',
        transparent: true,
        opacity: 0.42,
        depthTest: false,
        depthWrite: false
      })
    );

    link.name = `physics-debug-link-${linkKey}`;
    link.renderOrder = 1000;
    this.physicsDebugLinks.set(linkKey, link);
    return link;
  }

  private createPhysicsDebugAxis(end: Vector3, color: string): Line {
    const geometry = new BufferGeometry().setFromPoints([new Vector3(0, 0, 0), end]);
    const material = new LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.82,
      depthTest: false,
      depthWrite: false
    });
    const line = new Line(geometry, material);

    line.name = 'physics-debug-axis';
    line.renderOrder = 1001;
    return line;
  }

  private ensureEyeRingDebugGroup(): Group {
    if (this.eyeRingDebugGroup) {
      return this.eyeRingDebugGroup;
    }

    this.eyeRingDebugGroup = new Group();
    this.eyeRingDebugGroup.name = 'EyeRingDebugPreview';
    this.eyeRingDebugGroup.visible = false;
    this.scene.add(this.eyeRingDebugGroup);
    return this.eyeRingDebugGroup;
  }

  private updateEyeRingDebugVisibility(): void {
    if (!this.eyeRingDebugGroup) {
      return;
    }

    const subjectVisible =
      this.poseControlTarget === 'observed'
        ? this.options.showObservedRobotGhost && this.observedRobotGhost !== null
        : this.options.showRobot && this.robotComparisonAppearance.mode !== 'observed-only';

    this.eyeRingDebugGroup.visible =
      subjectVisible &&
      (this.options.showEyeRingDebug || this.options.showEyeRingMire) &&
      this.eyeRingDebugGroup.children.length > 0;
  }

  private clearEyeRingDebug(): void {
    if (!this.eyeRingDebugGroup) {
      return;
    }

    for (const child of [...this.eyeRingDebugGroup.children]) {
      this.eyeRingDebugGroup.remove(child);
      this.disposeObject3D(child);
    }

    this.eyeRingDebugGroup.visible = false;
  }

  private updateEyeRingDebug(): void {
    const robot = this.getPoseControlRobot();
    if ((!this.options.showEyeRingDebug && !this.options.showEyeRingMire) || !robot) {
      this.updateEyeRingDebugVisibility();
      return;
    }

    robot.updateMatrixWorld(true);
    const calibration = this.resolveEyeRingCalibration();
    const ledRingPoses = this.resolveLedRingPoses(calibration);

    if (ledRingPoses.length === 0) {
      this.clearEyeRingDebug();
      return;
    }

    const group = this.ensureEyeRingDebugGroup();
    this.clearEyeRingDebug();

    if (this.options.showEyeRingDebug) {
      for (const ring of ledRingPoses) {
        const ledCount = Math.max(
          ring.calibration.layout === 'strip' ? 1 : 3,
          Math.min(64, Math.round(ring.calibration.ledCount))
        );

        if (ring.calibration.mireVisible) {
          for (const [index, dimension] of this.resolveEyeRingDebugDimensions(ring.calibration).entries()) {
            group.add(
              this.createLedLayoutGuide(
                ring,
                dimension,
                index === 0 ? '#22c55e' : '#67e8f9',
                index === 0 ? 0.84 : 0.42
              )
            );
          }
        }

        for (let index = 0; index < ledCount; index += 1) {
          group.add(
            this.createEyeRingLedMarker(ring, index, ledCount, ring.calibration.ledSize)
          );
        }
      }
    }

    if (this.options.showEyeRingMire) {
      for (const ring of ledRingPoses) {
        if (ring.calibration.mireVisible) {
          group.add(this.createLedLayoutGuide(
            ring,
            (ring.calibration.layout === 'strip' ? ring.calibration.stripLength : ring.radius) * 1.14,
            '#67e8f9',
            0.52
          ));
          group.add(...this.createEyeRingMireLines(ring));
        }
      }
    }

    this.updateEyeRingDebugVisibility();
  }

  private resolveEyeRingCalibration(): Viewer3DEyeRingCalibration {
    const defaults = this.options.ledRingDefaults?.eyes ?? ROBOT_VIEWER_EMPTY_LED_RING_CALIBRATION;
    const calibration = this.options.eyeRingCalibration ?? {};
    return {
      ...resolveViewerLedRingCalibration(calibration, defaults),
      zones: this.resolveLedRingCalibrationZones(calibration.zones)
    };
  }

  private resolveLedRingCalibrationZones(
    zones: Partial<Record<Viewer3DLedRingZoneId, Partial<Viewer3DLedRingCalibration>>> | undefined
  ): Partial<Record<Viewer3DLedRingZoneId, Partial<Viewer3DLedRingCalibration>>> {
    if (!zones || typeof zones !== 'object') {
      return {};
    }

    const nextZones: Partial<Record<Viewer3DLedRingZoneId, Partial<Viewer3DLedRingCalibration>>> = {};

    for (const zoneId of Object.keys(this.options.ledRingDefaults ?? {}) as Viewer3DLedRingZoneId[]) {
      const zone = zones[zoneId];

      if (!zone || typeof zone !== 'object') {
        continue;
      }

      nextZones[zoneId] = {
        layout: zone.layout === 'strip' || zone.layout === 'circle' ? zone.layout : undefined,
        forwardOffset: this.resolveFiniteCalibrationNumber(zone.forwardOffset, Number.NaN),
        verticalOffset: this.resolveFiniteCalibrationNumber(zone.verticalOffset, Number.NaN),
        lateralOffset: this.resolveFiniteCalibrationNumber(zone.lateralOffset, Number.NaN),
        separation: this.resolveFiniteCalibrationNumber(zone.separation, Number.NaN),
        radius: this.resolveFiniteCalibrationNumber(zone.radius, Number.NaN),
        stripLength: this.resolveFiniteCalibrationNumber(zone.stripLength, Number.NaN),
        ledCount: this.resolveFiniteCalibrationNumber(zone.ledCount, Number.NaN),
        ledSize: this.resolveFiniteCalibrationNumber(zone.ledSize, Number.NaN),
        rotationX: this.resolveFiniteCalibrationNumber(zone.rotationX, Number.NaN),
        rotationY: this.resolveFiniteCalibrationNumber(zone.rotationY, Number.NaN),
        rotationZ: this.resolveFiniteCalibrationNumber(zone.rotationZ, Number.NaN),
        isVisible: typeof zone.isVisible === 'boolean' ? zone.isVisible : undefined,
        mireVisible: typeof zone.mireVisible === 'boolean' ? zone.mireVisible : undefined,
        variantCount: this.resolveFiniteCalibrationNumber(zone.variantCount, Number.NaN),
        variantStep: this.resolveFiniteCalibrationNumber(zone.variantStep, Number.NaN)
      };
    }

    return nextZones;
  }

  private resolveFiniteCalibrationNumber(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  }

  private resolveLedRingZoneCalibration(
    calibration: Viewer3DEyeRingCalibration,
    zoneId: Viewer3DLedRingZoneId
  ): Viewer3DLedRingCalibration {
    const base = zoneId === 'eyes' ? calibration : (this.options.ledRingDefaults?.[zoneId] ?? ROBOT_VIEWER_EMPTY_LED_RING_CALIBRATION);
    return resolveViewerLedRingCalibration(calibration.zones?.[zoneId], base);
  }

  private resolveEyeRingDebugDimensions(calibration: Viewer3DLedRingCalibration): number[] {
    const variantCount = Math.max(1, Math.min(7, Math.round(calibration.variantCount)));
    const variantStep = Math.max(0, calibration.variantStep);
    const dimension = calibration.layout === 'strip' ? calibration.stripLength : calibration.radius;
    const dimensions = [Math.max(0.001, dimension)];

    for (let index = 1; index < variantCount; index += 1) {
      const variantIndex = Math.ceil(index / 2);
      const direction = index % 2 === 1 ? 1 : -1;
      dimensions.push(Math.max(0.001, dimension + direction * variantIndex * variantStep));
    }

    return dimensions;
  }

  private resolveEyeRingPose(
    calibration = this.resolveLedRingZoneCalibration(this.resolveEyeRingCalibration(), 'eyes'),
    resolveObject: (candidates: readonly string[]) => Object3D | null = (candidates) =>
      this.resolveRobotObject(candidates)
  ): Viewer3DEyeRingPose | null {
    const frame = this.options.headLedFrame;
    if (!frame) return null;
    const headObject = resolveObject(frame.anchorNames);

    if (!headObject) {
      return null;
    }

    const orientation = headObject.getWorldQuaternion(new Quaternion());
    const localVertical = new Vector3(frame.vertical.x, frame.vertical.y, frame.vertical.z).applyQuaternion(orientation).normalize();
    const localForward = new Vector3(frame.forward.x, frame.forward.y, frame.forward.z).applyQuaternion(orientation).normalize();
    const localLateral = new Vector3(frame.lateral.x, frame.lateral.y, frame.lateral.z).applyQuaternion(orientation).normalize();
    const gaze = resolveObject(frame.centerNames);
    const gazeCenter = gaze
      ? gaze.getWorldPosition(new Vector3())
      : headObject.localToWorld(new Vector3(frame.fallbackCenter.x, frame.fallbackCenter.y, frame.fallbackCenter.z));
    const center = gazeCenter
      .clone()
      .addScaledVector(localForward, calibration.forwardOffset)
      .addScaledVector(localVertical, calibration.verticalOffset)
      .addScaledVector(localLateral, calibration.lateralOffset);
    const eyeSeparation = calibration.separation;
    const radius = calibration.radius;
    const rotationX = MathUtils.degToRad(calibration.rotationX);
    const rotationY = MathUtils.degToRad(calibration.rotationY);
    const rotationZ = MathUtils.degToRad(calibration.rotationZ);
    const createEyeOrientation = (mirrorDirection: 1 | -1): Quaternion => {
      const localTilt = new Quaternion()
        .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), rotationX))
        .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), rotationY * mirrorDirection))
        .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), rotationZ));

      return orientation.clone().multiply(localTilt);
    };
    const leftOrientation = createEyeOrientation(1);
    const rightOrientation = createEyeOrientation(-1);

    return {
      eyes: [
        {
          id: 'left',
          center: center.clone().addScaledVector(localLateral, eyeSeparation * 0.5),
          orientation: leftOrientation
        },
        {
          id: 'right',
          center: center.clone().addScaledVector(localLateral, -eyeSeparation * 0.5),
          orientation: rightOrientation
        }
      ],
      orientation,
      radius
    };
  }

  private resolvePoseControlEyeRingPose(): Viewer3DEyeRingPose | null {
    return this.resolveEyeRingPose(
      this.resolveLedRingZoneCalibration(this.resolveEyeRingCalibration(), 'eyes'),
      (candidates) => this.resolvePoseControlObject(candidates)
    );
  }

  private resolveLedRingPoses(calibration: Viewer3DEyeRingCalibration): Viewer3DLedRingPose[] {
    const poses: Viewer3DLedRingPose[] = [];
    const eyeCalibration = this.resolveLedRingZoneCalibration(calibration, 'eyes');
    const eyePose = this.resolveEyeRingPose(eyeCalibration, (candidates) =>
      this.resolvePoseControlObject(candidates)
    );

    if (eyePose && eyeCalibration.isVisible) {
      for (const eye of eyePose.eyes) {
        poses.push({
          id: `eyes-${eye.id}`,
          zoneId: 'eyes',
          center: eye.center,
          orientation: eye.orientation,
          radius: eyePose.radius,
          calibration: eyeCalibration
        });
      }
    }

    poses.push(...this.resolveHeadLedRingPoses(calibration));
    poses.push(...this.resolveTorsoLedRingPoses(calibration));
    poses.push(...this.resolveHandLedRingPoses(calibration));
    poses.push(...this.resolveFootLedRingPoses(calibration));

    return poses;
  }

  private resolveHeadLedRingPoses(calibration: Viewer3DEyeRingCalibration): Viewer3DLedRingPose[] {
    const hasConfiguredHeadTop = (this.options.bodyLedPlacements?.headTop?.length ?? 0) > 0;
    const hasConfiguredEars = (this.options.bodyLedPlacements?.ears?.length ?? 0) > 0;
    const headTopCalibration = this.resolveLedRingZoneCalibration(calibration, 'headTop');
    const earCalibration = this.resolveLedRingZoneCalibration(calibration, 'ears');
    const configuredHeadTopPoses = hasConfiguredHeadTop
      ? this.resolveConfiguredLedRingPoses(calibration, 'headTop')
      : [];
    const configuredEarPoses = hasConfiguredEars
      ? this.resolveConfiguredLedRingPoses(calibration, 'ears')
      : [];
    const configuredHeadTopResolved = configuredHeadTopPoses.length > 0 || !headTopCalibration.isVisible;
    const configuredEarsResolved = configuredEarPoses.length > 0 || !earCalibration.isVisible;
    const configuredPoses = [...configuredHeadTopPoses, ...configuredEarPoses];
    if (configuredHeadTopResolved && configuredEarsResolved) return configuredPoses;
    const frame = this.options.headLedFrame;
    if (!frame) return configuredPoses;
    const headObject = this.resolvePoseControlObject(frame.anchorNames);

    if (!headObject) {
      return configuredPoses;
    }

    const orientation = headObject.getWorldQuaternion(new Quaternion());
    const localVertical = new Vector3(frame.vertical.x, frame.vertical.y, frame.vertical.z).applyQuaternion(orientation).normalize();
    const localForward = new Vector3(frame.forward.x, frame.forward.y, frame.forward.z).applyQuaternion(orientation).normalize();
    const localLateral = new Vector3(frame.lateral.x, frame.lateral.y, frame.lateral.z).applyQuaternion(orientation).normalize();
    const gaze = this.resolvePoseControlObject(frame.centerNames);
    const headCenter = gaze
      ? gaze.getWorldPosition(new Vector3())
      : headObject.localToWorld(new Vector3(frame.fallbackCenter.x, frame.fallbackCenter.y, frame.fallbackCenter.z));
    const poses: Viewer3DLedRingPose[] = [...configuredPoses];
    if (!configuredHeadTopResolved && headTopCalibration.isVisible) {
      const headTopCenter = headCenter
        .clone()
        .addScaledVector(localForward, headTopCalibration.forwardOffset)
        .addScaledVector(localVertical, headTopCalibration.verticalOffset);

      poses.push({
        id: 'head-top',
        zoneId: 'headTop',
        center: headTopCenter,
        orientation: this.createLedRingOrientationFromNormal(
          localVertical,
          headTopCalibration,
          1,
          localForward
        ),
        radius: headTopCalibration.radius,
        calibration: headTopCalibration
      });
    }

    if (configuredEarsResolved || !earCalibration.isVisible) {
      return poses;
    }

    const earSeparation = Math.max(0.02, earCalibration.separation);

    for (const side of [-1, 1] as const) {
      const center = headCenter
        .clone()
        .addScaledVector(localForward, earCalibration.forwardOffset)
        .addScaledVector(localVertical, earCalibration.verticalOffset)
        .addScaledVector(localLateral, side * earSeparation * 0.5);

      poses.push({
        id: side > 0 ? 'ear-left' : 'ear-right',
        zoneId: 'ears',
        center,
        orientation: this.createLedRingOrientationFromNormal(
          localLateral.clone().multiplyScalar(side),
          earCalibration,
          side,
          localVertical
        ),
        radius: earCalibration.radius,
        calibration: earCalibration
      });
    }

    return poses;
  }

  private resolveTorsoLedRingPoses(calibration: Viewer3DEyeRingCalibration): Viewer3DLedRingPose[] {
    return this.resolveConfiguredLedRingPoses(calibration, 'torso');
  }

  private resolveHandLedRingPoses(calibration: Viewer3DEyeRingCalibration): Viewer3DLedRingPose[] {
    return this.resolveConfiguredLedRingPoses(calibration, 'hands');
  }

  private resolveFootLedRingPoses(calibration: Viewer3DEyeRingCalibration): Viewer3DLedRingPose[] {
    return this.resolveConfiguredLedRingPoses(calibration, 'feet');
  }

  private resolveConfiguredLedRingPoses(
    calibration: Viewer3DEyeRingCalibration,
    zoneId: Viewer3DLedRingZoneId
  ): Viewer3DLedRingPose[] {
    const zoneCalibration = this.resolveLedRingZoneCalibration(calibration, zoneId);
    if (!zoneCalibration.isVisible) return [];
    const poses: Viewer3DLedRingPose[] = [];
    for (const definition of this.options.bodyLedPlacements?.[zoneId] ?? []) {
      const anchor = this.resolvePoseControlObject(definition.anchorNames);
      if (!anchor) continue;
      const orientation = anchor.getWorldQuaternion(new Quaternion());
      const direction = (axis: { x: number; y: number; z: number }) =>
        new Vector3(axis.x, axis.y, axis.z).applyQuaternion(orientation).normalize();
      const center = anchor.getWorldPosition(new Vector3());
      if (definition.handTip) {
        center.lerp(this.getPoseControlHandTipPoint(definition.handTip.sourceJoint), definition.handTip.ratio);
      }
      center
        .addScaledVector(direction(definition.forward), zoneCalibration.forwardOffset)
        .addScaledVector(direction(definition.vertical), zoneCalibration.verticalOffset)
        .addScaledVector(
          definition.lateral
            ? direction(definition.lateral)
            : new Vector3()
                .crossVectors(direction(definition.vertical), direction(definition.forward))
                .normalize(),
          zoneCalibration.lateralOffset
        );
      poses.push({
        id: definition.id, zoneId, center,
        orientation: this.createLedRingOrientationFromNormal(
          direction(definition.normal),
          zoneCalibration,
          definition.mirrorDirection,
          direction(definition.layoutDirection ?? definition.vertical)
        ),
        radius: zoneCalibration.radius, calibration: zoneCalibration
      });
    }
    return poses;
  }

  private createLedRingOrientationFromNormal(
    normal: Vector3,
    calibration: Viewer3DLedRingCalibration,
    mirrorDirection: 1 | -1 = 1,
    layoutDirection?: Vector3
  ): Quaternion {
    const localY = normal.clone().normalize();
    const authoredX = (layoutDirection ?? new Vector3(1, 0, 0)).clone();
    const localX = authoredX.addScaledVector(localY, -authoredX.dot(localY));
    if (localX.lengthSq() < 1e-8) {
      localX.copy(Math.abs(localY.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0));
      localX.addScaledVector(localY, -localX.dot(localY));
    }
    localX.normalize();
    const localZ = new Vector3().crossVectors(localX, localY).normalize();
    const orientation = new Quaternion().setFromRotationMatrix(
      new Matrix4().makeBasis(localX, localY, localZ)
    );
    const rotationX = MathUtils.degToRad(calibration.rotationX);
    const rotationY = MathUtils.degToRad(calibration.rotationY) * mirrorDirection;
    const rotationZ = MathUtils.degToRad(calibration.rotationZ);
    const localRotation = new Quaternion()
      .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), rotationX))
      .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), rotationY))
      .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), rotationZ));

    return orientation.multiply(localRotation);
  }

  private createLedLayoutGuide(
    ring: Viewer3DLedRingPose,
    dimension: number,
    color: string,
    opacity: number
  ): Line {
    if (ring.calibration.layout === 'strip') {
      const halfLength = Math.max(0.001, dimension) * 0.5;
      return this.createEyeRingLine(
        [
          new Vector3(-halfLength, 0, 0).applyQuaternion(ring.orientation).add(ring.center),
          new Vector3(halfLength, 0, 0).applyQuaternion(ring.orientation).add(ring.center)
        ],
        color,
        opacity
      );
    }

    return this.createEyeRingCircle(ring, dimension, color, opacity);
  }

  private createEyeRingCircle(
    eye: Viewer3DLedRingPose,
    radius: number,
    color: string,
    opacity: number
  ): Line {
    const points: Vector3[] = [];

    for (let index = 0; index <= 48; index += 1) {
      const angle = (index / 48) * Math.PI * 2;
      points.push(
        new Vector3(Math.sin(angle) * radius, 0, Math.cos(angle) * radius)
          .applyQuaternion(eye.orientation)
          .add(eye.center)
      );
    }

    const line = new Line(
      new BufferGeometry().setFromPoints(points),
      new LineBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthTest: false,
        depthWrite: false
      })
    );
    line.renderOrder = 999;
    return line;
  }

  private createEyeRingLedMarker(
    eye: Viewer3DLedRingPose,
    index: number,
    count: number,
    ledSize: number
  ): Mesh {
    const color = index % 2 === 0 ? '#22c55e' : '#86efac';
    const markerSize = Math.max(0.001, Math.min(0.02, ledSize));
    const marker = new Mesh(
      new SphereGeometry(markerSize, 12, 8),
      new MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.92,
        depthTest: false,
        depthWrite: false
      })
    );
    const localPosition = eye.calibration.layout === 'strip'
      ? new Vector3(
          count <= 1 ? 0 : -eye.calibration.stripLength * 0.5 + (index / (count - 1)) * eye.calibration.stripLength,
          0,
          0
        )
      : new Vector3(
          Math.sin((index / count) * Math.PI * 2) * eye.radius,
          0,
          Math.cos((index / count) * Math.PI * 2) * eye.radius
        );
    marker.position.copy(
      localPosition
        .applyQuaternion(eye.orientation)
        .add(eye.center)
    );
    marker.renderOrder = 1000;
    return marker;
  }

  private createEyeRingMireLines(eye: Viewer3DLedRingPose): [Line, Line, Line] {
    const axisVertical = new Vector3(1, 0, 0).applyQuaternion(eye.orientation).normalize();
    const forward = new Vector3(0, 1, 0).applyQuaternion(eye.orientation).normalize();
    const axisHorizontal = new Vector3(0, 0, 1).applyQuaternion(eye.orientation).normalize();
    const radius = eye.radius * 1.55;
    const color = '#67e8f9';

    return [
      this.createEyeRingLine(
        [
          eye.center.clone().addScaledVector(axisHorizontal, -radius),
          eye.center.clone().addScaledVector(axisHorizontal, radius)
        ],
        color,
        0.68
      ),
      this.createEyeRingLine(
        [
          eye.center.clone().addScaledVector(axisVertical, -radius),
          eye.center.clone().addScaledVector(axisVertical, radius)
        ],
        color,
        0.68
      ),
      this.createEyeRingLine(
        [eye.center, eye.center.clone().addScaledVector(forward, 0.045)],
        '#22c55e',
        0.58
      )
    ];
  }

  private createEyeRingLine(points: Vector3[], color: string, opacity: number): Line {
    const line = new Line(
      new BufferGeometry().setFromPoints(points),
      new LineBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthTest: false,
        depthWrite: false
      })
    );
    line.renderOrder = 999;
    return line;
  }

  private ensureBalanceDebugGroup(): Group {
    if (this.balanceDebugGroup) {
      return this.balanceDebugGroup;
    }

    this.balanceDebugGroup = new Group();
    this.balanceDebugGroup.name = 'BalanceDebugPreview';
    this.balanceDebugGroup.visible = false;
    this.scene.add(this.balanceDebugGroup);
    this.applyBalanceDebugPresentationOffset();
    return this.balanceDebugGroup;
  }

  /** Physics coordinates are SIM-local; observed support points are world-space. */
  private applyBalanceDebugPresentationOffset(): void {
    if (!this.balanceDebugGroup) {
      return;
    }

    this.balanceDebugGroup.position.x =
      this.poseControlTarget === 'simulated'
        ? this.simulatedRobotPresentationRoot.position.x
        : this.comparisonProfileId && this.robotComparisonAppearance.mode === 'offset'
          ? this.robotComparisonAppearance.offsetMeters /
            (this.robotComparisonAppearance.centeredSeparation ? 2 : 1)
          : 0;
    this.balanceDebugGroup.updateMatrixWorld(true);
  }

  private updateBalanceDebugVisibility(): void {
    if (!this.balanceDebugGroup) {
      return;
    }

    const subjectVisible =
      this.poseControlTarget === 'observed'
        ? this.options.showObservedRobotGhost && this.observedRobotGhost !== null
        : this.options.showRobot && this.robotComparisonAppearance.mode !== 'observed-only';

    this.balanceDebugGroup.visible =
      subjectVisible && this.options.showBalanceDebug && this.balanceDebugGroup.children.length > 0;
  }

  private clearBalanceDebug(options: { preserveCenterOfMassQualification?: boolean } = {}): void {
    if (!options.preserveCenterOfMassQualification) {
      this.balanceDebugCenterOfMassQualified = false;
      this.balanceDebugCenterOfMassFadeStartedAt = null;
    }

    if (!this.balanceDebugGroup) {
      return;
    }

    for (const child of [...this.balanceDebugGroup.children]) {
      this.balanceDebugGroup.remove(child);
      this.disposeObject3D(child);
    }

    this.balanceDebugGroup.visible = false;
  }

  private updateBalanceDebug(): void {
    const robot = this.getPoseControlRobot();
    if (!this.options.showBalanceDebug || !robot) {
      this.updateBalanceDebugVisibility();
      return;
    }

    robot.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(robot);

    if (!Number.isFinite(bounds.min.x)) {
      this.clearBalanceDebug();
      return;
    }

    if (this.poseControlTarget === 'observed' && !this.comparisonProfileId) {
      this.updateObservedBalanceDebug(robot, bounds);
      return;
    }

    const center = this.resolveBalanceDebugCenterOfMass();

    if (!center) {
      this.clearBalanceDebug();
      return;
    }

    if (!this.balanceDebugCenterOfMassQualified) {
      this.balanceDebugCenterOfMassQualified = true;
      this.balanceDebugCenterOfMassFadeStartedAt = performance.now();
    }

    const observedContacts = this.resolveBalanceDebugObservedContacts();
    const supportPoints = observedContacts ?? [];
    const supportPolygon = this.resolveBalanceDebugSupportPolygon(supportPoints);
    const centerProjection = new Vector3(center.x, 0, center.z);
    const risk = observedContacts === null
      ? { color: '#94a3b8', fillOpacity: 0 }
      : this.evaluateBalanceDebugRisk(centerProjection, supportPolygon);
    const group = this.ensureBalanceDebugGroup();

    this.clearBalanceDebug({ preserveCenterOfMassQualification: true });
    group.userData.projectionSubject = 'simulated';
    group.userData.supportAuthority = observedContacts === null ? 'unavailable' : 'solver-ground-contacts';
    group.userData.centerOfMassStatus = 'simulated-physics';

    // Geometric footprint stays a separate neutral outline, never a support fill.
    const footprint = this.resolveBalanceDebugSupportPolygon(this.resolveBalanceDebugPhysicsSupportPoints());
    if (footprint.length >= 3) {
      const outline = this.createBalanceDebugLine([...footprint, footprint[0]], '#94a3b8', 0.25);
      outline.name = 'balance-geometric-footprint-estimate';
      group.add(outline);
    }

    if (supportPolygon.length >= 3) {
      group.add(this.createBalanceDebugSupportFill(supportPolygon, risk.color, risk.fillOpacity));
      group.add(this.createBalanceDebugSupportOutline(supportPolygon, risk.color));
    } else if (supportPolygon.length >= 2) {
      group.add(this.createBalanceDebugLine([...supportPolygon, supportPolygon[0]], risk.color, 0.72));
    }

    // Mark only measured contact positions, including single-point support.
    for (const point of supportPoints) {
      group.add(this.createBalanceDebugMarker(point, '#67e8f9', 0.008));
    }

    const centerOfMassGroup = new Group();
    centerOfMassGroup.name = 'balance-center-of-mass-presentation';
    centerOfMassGroup.add(this.createBalanceDebugCenterProjectionMarker(centerProjection, risk.color));
    centerOfMassGroup.add(
      this.createBalanceDebugLine(
        [new Vector3(center.x, Math.max(center.y, 0.02), center.z), centerProjection],
        risk.color,
        0.58
      )
    );
    group.add(centerOfMassGroup);
    this.applyBalanceDebugPresentationOffset();
    this.updateBalanceDebugCenterOfMassFade(performance.now());
    this.updateBalanceDebugVisibility();
  }

  /**
   * REAL currently exposes articulated joint telemetry but no admitted COM.
   * Project its semantic foot contacts without copying the SIM-only COM and
   * balance-risk result onto an incarnation that did not produce them.
   */
  private updateObservedBalanceDebug(robot: Object3D, bounds: Box3): void {
    const contacts = this.resolveObservedRobotSupportContacts(robot);
    const activeContactIds = this.observedRobotTemporalSupportAnchorState?.activeContactIds ?? [];
    const activeSupportPoints = this.selectObservedRobotSupportPoints(contacts, activeContactIds);
    const sourcePoints = activeSupportPoints.length >= 3 ? activeSupportPoints : contacts.supportPoints;
    const supportPoints =
      sourcePoints.length >= 3
        ? sourcePoints.map((point) => new Vector3(point.x, 0, point.z))
        : this.createBalanceDebugBoundsSupportPoints(bounds);
    const supportPolygon = this.resolveBalanceDebugSupportPolygon(supportPoints);
    const group = this.ensureBalanceDebugGroup();

    this.clearBalanceDebug();
    group.userData.projectionSubject = 'observed';
    group.userData.supportAuthority = 'observed-articulated-contact-projection';
    group.userData.centerOfMassStatus = 'unavailable';

    if (supportPolygon.length >= 3) {
      group.add(this.createBalanceDebugSupportFill(supportPolygon, '#67e8f9', 0.1));
      group.add(this.createBalanceDebugSupportOutline(supportPolygon, '#67e8f9'));
    } else if (supportPolygon.length >= 2) {
      group.add(this.createBalanceDebugLine([...supportPolygon, supportPolygon[0]], '#67e8f9', 0.62));
    }

    for (const point of supportPoints) {
      group.add(this.createBalanceDebugMarker(point, '#67e8f9', 0.018));
    }

    this.applyBalanceDebugPresentationOffset();
    this.updateBalanceDebugVisibility();
  }

  private updateBalanceDebugCenterOfMassFade(now: number): boolean {
    const startedAt = this.balanceDebugCenterOfMassFadeStartedAt;
    const presentation = this.balanceDebugGroup?.getObjectByName('balance-center-of-mass-presentation');

    if (startedAt === null || !presentation) {
      return false;
    }

    const progress = MathUtils.clamp((now - startedAt) / ROBOT_VIEWER_BALANCE_CENTER_OF_MASS_FADE_MS, 0, 1);
    const opacity = 1 - Math.pow(1 - progress, 3);

    presentation.traverse((object) => {
      const material = (object as Object3D & { material?: Material | Material[] }).material;
      const materials = Array.isArray(material) ? material : material ? [material] : [];

      for (const entry of materials) {
        const storedOpacity = entry.userData.balanceCenterOfMassBaseOpacity;
        const baseOpacity =
          typeof storedOpacity === 'number' && Number.isFinite(storedOpacity) ? storedOpacity : entry.opacity;

        entry.userData.balanceCenterOfMassBaseOpacity = baseOpacity;
        entry.opacity = baseOpacity * opacity;
      }
    });

    if (progress >= 1) {
      this.balanceDebugCenterOfMassFadeStartedAt = null;
    }

    return true;
  }

  private resolveBalanceDebugSupportPoints(bounds: Box3): Vector3[] {
    const physicsSupportPoints = this.resolveBalanceDebugPhysicsSupportPoints();
    if (this.poseControlTarget === 'observed' && this.comparisonProfileId) return physicsSupportPoints;

    if (physicsSupportPoints.length >= 3) {
      return physicsSupportPoints;
    }

    const explicitContactPoints = this.resolveBalanceDebugContactPoints();

    if (explicitContactPoints.length >= 3) {
      return explicitContactPoints;
    }

    const footprintPoints = (this.options.balanceFootprintDefinitions ?? []).flatMap((definition) => {
      const center = this.resolveBalanceDebugJointPosition(definition.jointNames);
      return center ? this.createBalanceDebugFootprintPoints(center, definition) : [];
    });

    if (footprintPoints.length > 0) {
      return footprintPoints;
    }

    return this.createBalanceDebugBoundsSupportPoints(bounds);
  }

  private createBalanceDebugBoundsSupportPoints(bounds: Box3): Vector3[] {
    const center = bounds.getCenter(new Vector3());
    const width = Math.max(0.12, Math.min(bounds.max.x - bounds.min.x, 0.32));
    const depth = Math.max(0.12, Math.min(bounds.max.z - bounds.min.z, 0.24));

    return [
      new Vector3(center.x - width * 0.5, 0, center.z - depth * 0.5),
      new Vector3(center.x + width * 0.5, 0, center.z - depth * 0.5),
      new Vector3(center.x + width * 0.5, 0, center.z + depth * 0.5),
      new Vector3(center.x - width * 0.5, 0, center.z + depth * 0.5)
    ];
  }

  private resolveBalanceDebugObservedContacts(): Vector3[] | null {
    if (!this.isPhysicsActive()) return null;
    const bodies = this.poseControlTarget === 'observed' && this.comparisonProfileId !== null
      ? (this.comparisonViewerSample?.physics?.bodyTransforms ?? []).map(body =>
          this.deserializeRuntimeHistoryTransform(body, false))
      : this.projectedPhysicsBodyTransforms;
    const observation = bodies.find(body => body.metadata?.visualRoot === true)?.metadata?.groundContacts;
    if (!observation || typeof observation !== 'object' || Array.isArray(observation) ||
      observation.status !== 'observed' || !Array.isArray(observation.points)) return null;
    const points: Vector3[] = [];
    for (const point of observation.points) {
      if (!point || typeof point !== 'object' || Array.isArray(point) ||
        typeof point.x !== 'number' || typeof point.y !== 'number' || typeof point.z !== 'number' ||
        ![point.x, point.y, point.z].every(Number.isFinite)) return null;
      const projected = this.resolvePhysicsVectorViewerPosition({ x: point.x, y: point.y, z: point.z }, bodies);
      points.push(new Vector3(projected.x, 0, projected.z));
    }
    return points;
  }

  private resolveBalanceDebugPhysicsSupportPoints(): Vector3[] {
    if (!this.isPhysicsActive()) {
      return [];
    }

    const comparisonActive = this.poseControlTarget === 'observed' && this.comparisonProfileId !== null;
    const bodyTransforms = comparisonActive
      ? (this.comparisonViewerSample?.physics?.bodyTransforms ?? []).map((body) =>
          this.deserializeRuntimeHistoryTransform(body, false)
        )
      : this.projectedPhysicsBodyTransforms.length > 0
        ? this.projectedPhysicsBodyTransforms
        : this.physicsService.getBodyTransforms();
    const candidates: Vector3[] = [];

    for (const bodyTransform of bodyTransforms) {
      const colliders = this.resolvePhysicsDebugColliderProxies(bodyTransform);

      if (colliders.length === 0) {
        if (bodyTransform.metadata?.support !== true && bodyTransform.metadata?.contact !== true) {
          continue;
        }

        const position = new Vector3();

        this.createPhysicsBodyViewerWorldMatrix(bodyTransform).decompose(
          position,
          new Quaternion(),
          new Vector3()
        );
        candidates.push(position);
        continue;
      }

      const bodyMatrix = this.createPhysicsBodyViewerWorldMatrix(bodyTransform);

      for (const collider of colliders) {
        for (const point of this.resolveBalanceDebugColliderSamplePoints(collider)) {
          candidates.push(point.applyMatrix4(bodyMatrix));
        }
      }
    }

    if (candidates.length === 0) {
      return [];
    }

    const minY = candidates.reduce((value, point) => Math.min(value, point.y), Number.POSITIVE_INFINITY);
    const groundY = Math.min(0, minY);
    const contactThreshold = groundY + 0.035;

    return candidates
      .filter((point) => point.y <= contactThreshold)
      .map((point) => new Vector3(point.x, 0, point.z));
  }

  private resolveBalanceDebugColliderSamplePoints(collider: PhysicsColliderProxy): Vector3[] {
    const localMatrix = this.createBalanceDebugColliderLocalMatrix(collider);
    const size = Array.isArray(collider.size) ? collider.size : [];
    let points: Vector3[] = [];

    if (collider.shape === 'box') {
      const x = size[0] ?? 0.02;
      const y = size[1] ?? x;
      const z = size[2] ?? x;

      points = [
        new Vector3(-x, -y, -z),
        new Vector3(x, -y, -z),
        new Vector3(x, -y, z),
        new Vector3(-x, -y, z),
        new Vector3(-x, y, -z),
        new Vector3(x, y, -z),
        new Vector3(x, y, z),
        new Vector3(-x, y, z)
      ];
    } else if (collider.shape === 'capsule') {
      const radius = size[0] ?? 0.02;
      const fromTo = Array.isArray(collider.fromTo) ? collider.fromTo : [];
      const start = new Vector3(fromTo[0] ?? 0, fromTo[1] ?? 0, fromTo[2] ?? 0);
      const end = new Vector3(fromTo[3] ?? 0, fromTo[4] ?? 0, fromTo[5] ?? 0);

      points = [start, end].flatMap((point) => [
        point.clone().add(new Vector3(radius, 0, 0)),
        point.clone().add(new Vector3(-radius, 0, 0)),
        point.clone().add(new Vector3(0, radius, 0)),
        point.clone().add(new Vector3(0, -radius, 0)),
        point.clone().add(new Vector3(0, 0, radius)),
        point.clone().add(new Vector3(0, 0, -radius))
      ]);
    } else {
      const x = size[0] ?? 0.02;
      const y = size[1] ?? x;
      const z = size[2] ?? x;

      points = [
        new Vector3(x, 0, 0),
        new Vector3(-x, 0, 0),
        new Vector3(0, y, 0),
        new Vector3(0, -y, 0),
        new Vector3(0, 0, z),
        new Vector3(0, 0, -z)
      ];
    }

    return points.map((point) => point.applyMatrix4(localMatrix));
  }

  private createBalanceDebugColliderLocalMatrix(collider: PhysicsColliderProxy): Matrix4 {
    const position = collider.position
      ? new Vector3(collider.position.x, collider.position.y, collider.position.z)
      : new Vector3();
    const rotation = collider.rotation
      ? new Quaternion(collider.rotation.x, collider.rotation.y, collider.rotation.z, collider.rotation.w)
      : new Quaternion();

    return new Matrix4().compose(position, rotation, new Vector3(1, 1, 1));
  }

  private resolveBalanceDebugContactPoints(): Vector3[] {
    return (this.options.diagnosticContactDefinitions ?? [])
      .map((definition) => definition.names)
      .map((names) => this.resolveRobotObject(names)?.getWorldPosition(new Vector3()) ?? null)
      .filter((point): point is Vector3 => Boolean(point))
      .map((point) => new Vector3(point.x - this.simulatedRobotPresentationRoot.position.x, 0, point.z));
  }

  private createBalanceDebugFootprintPoints(
    center: Vector3,
    definition: ViewerBalanceFootprintDefinition
  ): Vector3[] {
    const halfWidth = definition.halfWidthMeters;
    const halfDepth = definition.halfDepthMeters;
    if (!Number.isFinite(halfWidth) || !Number.isFinite(halfDepth) || halfWidth <= 0 || halfDepth <= 0) {
      return [];
    }

    return [
      new Vector3(center.x - halfWidth, 0, center.z - halfDepth),
      new Vector3(center.x + halfWidth, 0, center.z - halfDepth),
      new Vector3(center.x + halfWidth, 0, center.z + halfDepth),
      new Vector3(center.x - halfWidth, 0, center.z + halfDepth)
    ];
  }

  private resolveBalanceDebugCenterOfMass(): Vector3 | null {
    if (this.poseControlTarget === 'observed' && this.comparisonProfileId) {
      const sample = this.comparisonViewerSample?.physics;
      if (!sample?.centerOfMass) return null;
      const bodies = (sample.bodyTransforms ?? []).map((body) =>
        this.deserializeRuntimeHistoryTransform(body, false)
      );
      return this.resolvePhysicsVectorViewerPosition(sample.centerOfMass, bodies);
    }
    const centerOfMass = this.projectedPhysicsCenterOfMass;

    if (
      !centerOfMass ||
      this.projectedPhysicsBodyTransforms.length === 0 ||
      !Number.isFinite(centerOfMass.x) ||
      !Number.isFinite(centerOfMass.y) ||
      !Number.isFinite(centerOfMass.z)
    ) {
      return null;
    }

    return this.resolvePhysicsVectorViewerPosition(centerOfMass, this.projectedPhysicsBodyTransforms);
  }

  private resolvePhysicsVectorViewerPosition(
    position: BodyTransform['position'],
    bodyTransforms: readonly BodyTransform[] = this.projectedPhysicsBodyTransforms
  ): Vector3 {
    const coordinateFrameTransform = bodyTransforms.find(
      (bodyTransform) => typeof bodyTransform.metadata?.coordinateFrame === 'string'
    );
    const pointTransform: BodyTransform = {
      bodyName: '__physics_world_point__',
      position,
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      metadata: {
        coordinateFrame:
          coordinateFrameTransform?.metadata?.coordinateFrame ??
          this.physicsVisualAlignmentProfile?.coordinateFrame ??
          'viewer-y-up',
        sceneYawRadians:
          coordinateFrameTransform?.metadata?.sceneYawRadians ??
          this.physicsVisualAlignmentProfile?.sceneYawRadians ??
          0
      }
    };
    const viewerPosition = new Vector3();

    this.createPhysicsBodyViewerWorldMatrix(pointTransform).decompose(
      viewerPosition,
      new Quaternion(),
      new Vector3()
    );
    return viewerPosition;
  }

  private resolveBalanceDebugJointPosition(candidates: readonly string[]): Vector3 | null {
    const joints = this.getRobotJoints();

    for (const candidate of candidates) {
      const joint = joints[candidate] as (Object3D & RobotJointLike) | undefined;

      if (typeof joint?.getWorldPosition === 'function') {
        const position = joint.getWorldPosition(new Vector3());
        position.x -= this.simulatedRobotPresentationRoot.position.x;
        return position;
      }
    }

    return null;
  }

  private resolveBalanceDebugSupportPolygon(points: Vector3[]): Vector3[] {
    const uniquePoints = points.filter(
      (point, index) =>
        points.findIndex(
          (candidate) => Math.abs(candidate.x - point.x) < 0.0001 && Math.abs(candidate.z - point.z) < 0.0001
        ) === index
    );

    if (uniquePoints.length <= 3) {
      return uniquePoints.map((point) => new Vector3(point.x, 0, point.z));
    }

    const sorted = [...uniquePoints].sort((a, b) => (a.x === b.x ? a.z - b.z : a.x - b.x));
    const cross = (origin: Vector3, a: Vector3, b: Vector3): number =>
      (a.x - origin.x) * (b.z - origin.z) - (a.z - origin.z) * (b.x - origin.x);
    const lower: Vector3[] = [];
    const upper: Vector3[] = [];

    for (const point of sorted) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
        lower.pop();
      }

      lower.push(point);
    }

    for (const point of [...sorted].reverse()) {
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
        upper.pop();
      }

      upper.push(point);
    }

    return [...lower.slice(0, -1), ...upper.slice(0, -1)].map((point) => new Vector3(point.x, 0, point.z));
  }

  private createBalanceDebugSupportOutline(points: Vector3[], color: string): Line {
    return this.createBalanceDebugLine([...points, points[0]], color, 0.8);
  }

  private createBalanceDebugSupportFill(points: Vector3[], color: string, opacity: number): Mesh {
    const vertices: number[] = [];
    const indices: number[] = [];

    for (const point of points) {
      vertices.push(point.x, 0, point.z);
    }

    for (let index = 1; index < points.length - 1; index += 1) {
      indices.push(0, index, index + 1);
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const mesh = new Mesh(
      geometry,
      new MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthTest: false,
        depthWrite: false,
        side: DoubleSide
      })
    );
    mesh.name = 'balance-support-polygon-fill';
    mesh.renderOrder = 993;
    return mesh;
  }

  private evaluateBalanceDebugRisk(
    centerProjection: Vector3,
    polygon: Vector3[]
  ): { level: 'stable' | 'warning' | 'danger'; color: string; fillOpacity: number } {
    if (polygon.length < 3) {
      return { level: 'danger', color: '#ef4444', fillOpacity: 0.16 };
    }

    const inside = this.isBalanceDebugPointInsidePolygon(centerProjection, polygon);
    const edgeDistance = this.getBalanceDebugDistanceToPolygonEdge(centerProjection, polygon);

    if (!inside) {
      return { level: 'danger', color: '#ef4444', fillOpacity: 0.18 };
    }

    if (edgeDistance < 0.018) {
      return { level: 'danger', color: '#ef4444', fillOpacity: 0.18 };
    }

    if (edgeDistance < 0.045) {
      return { level: 'warning', color: '#f59e0b', fillOpacity: 0.15 };
    }

    return { level: 'stable', color: '#22c55e', fillOpacity: 0.13 };
  }

  private isBalanceDebugPointInsidePolygon(point: Vector3, polygon: Vector3[]): boolean {
    let inside = false;

    for (
      let index = 0, previousIndex = polygon.length - 1;
      index < polygon.length;
      previousIndex = index, index += 1
    ) {
      const current = polygon[index];
      const previous = polygon[previousIndex];
      const dz = previous.z - current.z;
      const intersects =
        current.z > point.z !== previous.z > point.z &&
        point.x <
          ((previous.x - current.x) * (point.z - current.z)) / (Math.abs(dz) > 0.000001 ? dz : 0.000001) +
            current.x;

      if (intersects) {
        inside = !inside;
      }
    }

    return inside;
  }

  private getBalanceDebugDistanceToPolygonEdge(point: Vector3, polygon: Vector3[]): number {
    let distance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < polygon.length; index += 1) {
      const start = polygon[index];
      const end = polygon[(index + 1) % polygon.length];

      distance = Math.min(distance, this.getBalanceDebugDistanceToSegment(point, start, end));
    }

    return Number.isFinite(distance) ? distance : 0;
  }

  private getBalanceDebugDistanceToSegment(point: Vector3, start: Vector3, end: Vector3): number {
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const lengthSq = dx * dx + dz * dz;

    if (lengthSq <= 0.000001) {
      return Math.hypot(point.x - start.x, point.z - start.z);
    }

    const t = MathUtils.clamp(((point.x - start.x) * dx + (point.z - start.z) * dz) / lengthSq, 0, 1);
    const closestX = start.x + dx * t;
    const closestZ = start.z + dz * t;

    return Math.hypot(point.x - closestX, point.z - closestZ);
  }

  private createBalanceDebugLine(points: Vector3[], color: string, opacity: number): Line {
    const line = new Line(
      new BufferGeometry().setFromPoints(points),
      new LineBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthTest: false,
        depthWrite: false
      })
    );
    line.renderOrder = 994;
    return line;
  }

  private createBalanceDebugMarker(position: Vector3, color: string, size: number): Mesh {
    const marker = new Mesh(
      new CircleGeometry(size, 24),
      new MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.82,
        depthTest: false,
        depthWrite: false,
        side: DoubleSide
      })
    );
    marker.position.copy(position);
    marker.rotation.x = -Math.PI / 2;
    marker.renderOrder = 995;
    return marker;
  }

  private createBalanceDebugCenterProjectionMarker(position: Vector3, color: string): Mesh {
    const marker = this.createBalanceDebugMarker(position, color, 0.025);

    marker.name = 'balance-center-of-mass-ground-projection';
    return marker;
  }

  private ensureTrajectoryGroup(): Group {
    if (this.trajectoryGroup) {
      return this.trajectoryGroup;
    }

    this.trajectoryGroup = new Group();
    this.trajectoryGroup.name = 'AnimationTrajectoryPreview';
    this.trajectoryGroup.visible = false;
    this.scene.add(this.trajectoryGroup);
    return this.trajectoryGroup;
  }

  private updateTrajectoryGroupVisibility(): void {
    if (!this.trajectoryGroup) {
      return;
    }

    this.trajectoryGroup.visible = this.options.showTrajectories && this.trajectoryGroup.children.length > 0;
  }

  private clearTrajectoryPreview(): void {
    if (!this.trajectoryGroup) {
      this.trajectoryAnchors.clear();
      return;
    }

    for (const child of [...this.trajectoryGroup.children]) {
      this.trajectoryGroup.remove(child);
      this.disposeObject3D(child);
    }

    this.trajectoryGroup.visible = false;
    this.trajectoryAnchors.clear();
  }

  private rebuildTrajectoryPreview(): void {
    const animation = this.trajectoryAnimation;

    if (!this.robot || !animation?.motion.hasMotion) {
      this.trajectorySignature = '';
      this.clearTrajectoryPreview();
      return;
    }

    const duration = getRobotMotionAnimationDuration(animation);

    if (duration <= 0) {
      this.trajectorySignature = '';
      this.clearTrajectoryPreview();
      return;
    }

    const targets = this.getTrajectoryPreviewTargets(animation);

    if (targets.length === 0) {
      this.trajectorySignature = '';
      this.clearTrajectoryPreview();
      return;
    }

    const nextSignature = this.getTrajectorySignature(animation, targets, duration);

    if (this.trajectorySignature === nextSignature && this.trajectoryGroup?.children.length) {
      this.updateTrajectoryGroupVisibility();
      return;
    }

    const trajectoryGroup = this.ensureTrajectoryGroup();
    this.clearTrajectoryPreview();
    this.trajectorySignature = nextSignature;

    const originalPose = this.captureJointPose();
    const previousAnimatedTargets = new Set(this.lastAnimatedJointTargets);
    const sampleCount = Math.max(
      ROBOT_VIEWER_TRAJECTORY_MIN_SAMPLES,
      Math.min(ROBOT_VIEWER_TRAJECTORY_MAX_SAMPLES, Math.ceil(duration * ROBOT_VIEWER_TRAJECTORY_SAMPLE_RATE))
    );
    const pointsByTarget = new Map(targets.map((target) => [target.id, [] as Vector3[]]));

    for (let sampleIndex = 0; sampleIndex <= sampleCount; sampleIndex += 1) {
      const sampleTime = (sampleIndex / sampleCount) * duration;
      this.applyRobotPose(animation, sampleTime, [], duration);
      this.robot.updateMatrixWorld(true);

      for (const target of targets) {
        pointsByTarget.get(target.id)?.push(this.getTrajectoryPoint(target.id));
      }
    }

    this.restoreJointPose(originalPose);
    this.lastAnimatedJointTargets = previousAnimatedTargets;
    this.nextAnimatedJointTargets.clear();

    for (const target of targets) {
      const points = pointsByTarget.get(target.id) ?? [];

      if (points.length < 2) {
        continue;
      }

      trajectoryGroup.add(this.createTrajectoryObject(target, points));
    }

    this.updateTrajectoryCurrentMarkers();
    this.updateTrajectoryGroupVisibility();
    this.requestRender();
  }

  private getTrajectorySignature(
    animation: RobotMotionAnimation,
    targets: Viewer3DTrajectoryPreviewTarget[],
    duration: number
  ): string {
    return JSON.stringify({
      duration: Number(duration.toFixed(3)),
      handsOnly: this.options.showHandTrajectoriesOnly,
      targets: targets.map((target) => target.id),
      tracks: animation.motion.tracks.map((track) => ({
        target: track.target,
        property: track.property,
        keys: track.keys.length,
        firstTime: track.keys[0]?.time ?? null,
        lastTime: track.keys[track.keys.length - 1]?.time ?? null,
        firstValue: track.keys[0]?.value ?? null,
        lastValue: track.keys[track.keys.length - 1]?.value ?? null
      }))
    });
  }

  private getTrajectoryPreviewTargets(animation: RobotMotionAnimation): Viewer3DTrajectoryPreviewTarget[] {
    if (this.options.showHandTrajectoriesOnly) {
      return (this.options.handTipDefinitions ?? [])
        .map(({ id, sourceJoint, label }) => ({ id, sourceJoint, label }))
        .filter((target) => Boolean(this.getRobotJoints()[target.sourceJoint]));
    }

    return Array.from(
      new Map(
        animation.motion.tracks
          .map((track) => track.target)
          .filter((target): target is string =>
            Boolean(target && this.shouldRenderTrajectoryForTarget(target))
          )
          .map((target) => [target, { id: target, sourceJoint: target, label: target }])
      ).values()
    );
  }

  private shouldRenderTrajectoryForTarget(target: string): boolean {
    const joint = this.getRobotJoints()[target];

    if (!joint) {
      return false;
    }

    return this.options.shouldRenderJointTrajectory?.(target, joint.jointType) ?? false;
  }

  private resolveJointColor(jointId: string): string {
    return this.options.resolveJointColor?.(jointId) ?? '#67e8f9';
  }

  private createTrajectoryObject(target: Viewer3DTrajectoryPreviewTarget, points: Vector3[]): Group {
    const color = new Color(this.resolveJointColor(target.id));
    const direction = this.getTrajectoryTerminalDirection(points);
    const line = new Line(
      new BufferGeometry().setFromPoints(points),
      new LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.86,
        depthTest: false,
        depthWrite: false
      })
    );
    line.renderOrder = 996;

    const startMarker = new Mesh(
      new BoxGeometry(0.008, 0.008, 0.008),
      new MeshBasicMaterial({ color, transparent: true, opacity: 0.82, depthTest: false, depthWrite: false })
    );
    startMarker.position.copy(points[0]);
    startMarker.renderOrder = 997;

    const currentMarker = new Mesh(
      new SphereGeometry(0.009, 14, 14),
      new MeshBasicMaterial({
        color: color.clone().offsetHSL(0, 0, 0.16),
        transparent: true,
        opacity: 0.94,
        depthTest: false,
        depthWrite: false
      })
    );
    currentMarker.position.copy(points[points.length - 1]);
    currentMarker.renderOrder = 997;

    const endMarker = new Mesh(
      new ConeGeometry(0.008, 0.024, 12),
      new MeshBasicMaterial({
        color: color.clone().offsetHSL(0, 0, 0.16),
        transparent: true,
        opacity: 0.96,
        depthTest: false,
        depthWrite: false
      })
    );
    endMarker.position.copy(points[points.length - 1]);

    if (direction.lengthSq() > 1e-6) {
      endMarker.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), direction);
      endMarker.position.addScaledVector(direction, -0.012);
    }

    endMarker.renderOrder = 997;

    const trajectory = new Group();
    trajectory.name = `trajectory-${target.id}`;
    trajectory.renderOrder = 995;
    trajectory.userData.target = target.id;
    trajectory.userData.currentMarker = currentMarker;
    trajectory.add(line, startMarker, currentMarker, endMarker);
    return trajectory;
  }

  private getTrajectoryTerminalDirection(points: Vector3[]): Vector3 {
    if (points.length < 2) {
      return new Vector3(0, 1, 0);
    }

    const endPoint = points[points.length - 1];

    for (let index = points.length - 2; index >= 0; index -= 1) {
      const previous = points[index];
      const direction = endPoint.clone().sub(previous);

      if (direction.lengthSq() > 1e-6) {
        return direction.normalize();
      }
    }

    return new Vector3(0, 1, 0);
  }

  private updateTrajectoryCurrentMarkers(): void {
    if (!this.robot || !this.trajectoryGroup?.visible) {
      return;
    }

    this.robot.updateMatrixWorld(true);

    for (const child of this.trajectoryGroup.children) {
      const target = child.userData.target as string | undefined;
      const currentMarker = child.userData.currentMarker as Mesh | undefined;

      if (!target || !currentMarker) {
        continue;
      }

      currentMarker.position.copy(this.getTrajectoryPoint(target));
    }
  }

  private getTrajectoryPoint(target: string): Vector3 {
    const handTip = (this.options.handTipDefinitions ?? []).find((definition) => definition.id === target);
    if (handTip) {
      return this.getHandTipTrajectoryPoint(handTip.sourceJoint);
    }

    const joint = this.getRobotJoints()[target] as (RobotJointLike & Object3D) | undefined;

    if (!joint) {
      return new Vector3();
    }

    const anchor = this.getTrajectoryAnchor(target);

    if (!anchor || typeof joint.localToWorld !== 'function') {
      return typeof joint.getWorldPosition === 'function'
        ? joint.getWorldPosition(new Vector3())
        : new Vector3();
    }

    return joint.localToWorld(anchor.clone());
  }

  private getHandTipTrajectoryPoint(wristJointName: string): Vector3 {
    return this.getRobotHandTipPoint(this.robot, wristJointName);
  }

  private getPoseControlHandTipPoint(wristJointName: string): Vector3 {
    return this.getRobotHandTipPoint(this.getPoseControlRobot(), wristJointName);
  }

  private getRobotHandTipPoint(robot: Object3D | null, wristJointName: string): Vector3 {
    const definition = (this.options.handTipDefinitions ?? []).find((entry) => entry.sourceJoint === wristJointName);
    const fingerRootNames = definition?.fingerRootNames ?? [];
    const joints = ((robot as { joints?: Record<string, RobotJointLike> } | null)?.joints ?? {}) as Record<
      string,
      RobotJointLike
    >;
    const fingerRoots = fingerRootNames
      .map((name) => joints[name] as (Object3D & RobotJointLike) | undefined)
      .filter((entry): entry is Object3D & RobotJointLike => Boolean(entry));

    if (fingerRoots.length === 2) {
      const first = fingerRoots[0].getWorldPosition(new Vector3());
      const second = fingerRoots[1].getWorldPosition(new Vector3());
      return first.add(second).multiplyScalar(0.5);
    }

    const frames = (robot as { frames?: Record<string, Object3D> } | null)?.frames ?? {};
    const leftFrame = definition ? frames[definition.touchFrameNames.left] : undefined;
    const rightFrame = definition ? frames[definition.touchFrameNames.right] : undefined;
    const backFrame = definition ? frames[definition.touchFrameNames.back] : undefined;

    if (leftFrame && rightFrame && backFrame) {
      const leftPoint = leftFrame.getWorldPosition(new Vector3());
      const rightPoint = rightFrame.getWorldPosition(new Vector3());
      const backPoint = backFrame.getWorldPosition(new Vector3());
      const sideMidpoint = leftPoint.add(rightPoint).multiplyScalar(0.5);
      return backPoint.clone().add(backPoint.clone().sub(sideMidpoint));
    }

    if (leftFrame && rightFrame) {
      const leftPoint = leftFrame.getWorldPosition(new Vector3());
      const rightPoint = rightFrame.getWorldPosition(new Vector3());
      return leftPoint.add(rightPoint).multiplyScalar(0.5);
    }

    if (backFrame) {
      return backFrame.getWorldPosition(new Vector3());
    }

    const joint = joints[wristJointName] as (Object3D & RobotJointLike) | undefined;
    const anchor = definition ? this.getTrajectoryAnchor(definition.id) : null;

    if (!joint || !anchor || typeof joint.localToWorld !== 'function') {
      return typeof joint?.getWorldPosition === 'function'
        ? joint.getWorldPosition(new Vector3())
        : new Vector3();
    }

    return joint.localToWorld(anchor.clone());
  }

  private getTrajectoryAnchor(target: string): Vector3 | null {
    if (this.trajectoryAnchors.has(target)) {
      return this.trajectoryAnchors.get(target) ?? null;
    }

    const syntheticHandJointName =
      (this.options.handTipDefinitions ?? []).find((definition) => definition.id === target)?.sourceJoint ?? null;
    const joint = this.getRobotJoints()[syntheticHandJointName ?? target] as
      | (RobotJointLike & Object3D)
      | undefined;

    if (!joint?.matrixWorld || typeof joint.traverse !== 'function') {
      this.trajectoryAnchors.set(target, null);
      return null;
    }

    if (syntheticHandJointName) {
      const anchor = this.getHandTipTrajectoryAnchor(syntheticHandJointName, joint);
      this.trajectoryAnchors.set(target, anchor);
      return anchor;
    }

    const jointInverse = joint.matrixWorld.clone().invert();
    const localBounds = new Box3();
    let hasBounds = false;

    joint.updateMatrixWorld?.(true);
    joint.traverse((node) => {
      if (node !== joint && (node as { isURDFJoint?: boolean }).isURDFJoint) {
        return;
      }

      if (!(node as Mesh).isMesh || (node as { isURDFCollider?: boolean }).isURDFCollider) {
        return;
      }

      const mesh = node as Mesh;
      const geometry = mesh.geometry;

      if (!geometry) {
        return;
      }

      if (!geometry.boundingBox) {
        geometry.computeBoundingBox();
      }

      if (geometry.boundingBox) {
        localBounds.union(
          geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld).applyMatrix4(jointInverse)
        );
        hasBounds = true;
      }
    });

    const anchor = hasBounds ? localBounds.getCenter(new Vector3()) : null;
    this.trajectoryAnchors.set(target, anchor);
    return anchor;
  }

  private getHandTipTrajectoryAnchor(
    wristJointName: string,
    joint: Object3D & RobotJointLike
  ): Vector3 | null {
    const definition = (this.options.handTipDefinitions ?? []).find((entry) => entry.sourceJoint === wristJointName);
    const fingerRootNames = definition?.fingerRootNames ?? [];
    const joints = this.getRobotJoints();
    const fingerRoots = fingerRootNames
      .map((name) => joints[name] as (Object3D & RobotJointLike) | undefined)
      .filter((entry): entry is Object3D & RobotJointLike => Boolean(entry));

    if (fingerRoots.length === 2) {
      joint.updateMatrixWorld(true);
      const first = fingerRoots[0].getWorldPosition(new Vector3());
      const second = fingerRoots[1].getWorldPosition(new Vector3());
      return joint.worldToLocal(first.add(second).multiplyScalar(0.5));
    }

    const frames = (this.robot as { frames?: Record<string, Object3D> } | null)?.frames ?? {};
    const leftFrame = definition ? frames[definition.touchFrameNames.left] : undefined;
    const rightFrame = definition ? frames[definition.touchFrameNames.right] : undefined;
    const backFrame = definition ? frames[definition.touchFrameNames.back] : undefined;

    if (leftFrame && rightFrame && backFrame) {
      joint.updateMatrixWorld(true);
      leftFrame.updateMatrixWorld(true);
      rightFrame.updateMatrixWorld(true);
      backFrame.updateMatrixWorld(true);
      const leftPoint = leftFrame.getWorldPosition(new Vector3());
      const rightPoint = rightFrame.getWorldPosition(new Vector3());
      const backPoint = backFrame.getWorldPosition(new Vector3());
      const sideMidpoint = leftPoint.add(rightPoint).multiplyScalar(0.5);
      const frontPoint = backPoint.clone().add(backPoint.clone().sub(sideMidpoint));
      return joint.worldToLocal(frontPoint);
    }

    if (leftFrame && rightFrame) {
      joint.updateMatrixWorld(true);
      leftFrame.updateMatrixWorld(true);
      rightFrame.updateMatrixWorld(true);
      const leftPoint = leftFrame.getWorldPosition(new Vector3());
      const rightPoint = rightFrame.getWorldPosition(new Vector3());
      return joint.worldToLocal(leftPoint.add(rightPoint).multiplyScalar(0.5));
    }

    if (backFrame) {
      joint.updateMatrixWorld(true);
      backFrame.updateMatrixWorld(true);
      return joint.worldToLocal(backFrame.getWorldPosition(new Vector3()));
    }

    const localBounds = this.getLocalMeshBounds(joint);

    if (!localBounds) {
      return null;
    }

    const corners = [
      new Vector3(localBounds.min.x, localBounds.min.y, localBounds.min.z),
      new Vector3(localBounds.min.x, localBounds.min.y, localBounds.max.z),
      new Vector3(localBounds.min.x, localBounds.max.y, localBounds.min.z),
      new Vector3(localBounds.min.x, localBounds.max.y, localBounds.max.z),
      new Vector3(localBounds.max.x, localBounds.min.y, localBounds.min.z),
      new Vector3(localBounds.max.x, localBounds.min.y, localBounds.max.z),
      new Vector3(localBounds.max.x, localBounds.max.y, localBounds.min.z),
      new Vector3(localBounds.max.x, localBounds.max.y, localBounds.max.z)
    ];

    corners.sort((left, right) => right.lengthSq() - left.lengthSq());
    return corners[0]?.clone() ?? null;
  }

  private getLocalMeshBounds(joint: Object3D & RobotJointLike): Box3 | null {
    if (!joint.matrixWorld || typeof joint.traverse !== 'function') {
      return null;
    }

    const jointInverse = joint.matrixWorld.clone().invert();
    const localBounds = new Box3();
    let hasBounds = false;

    joint.updateMatrixWorld?.(true);
    joint.traverse((node) => {
      if (node !== joint && (node as { isURDFJoint?: boolean }).isURDFJoint) {
        return;
      }

      if (!(node as Mesh).isMesh || (node as { isURDFCollider?: boolean }).isURDFCollider) {
        return;
      }

      const mesh = node as Mesh;
      const geometry = mesh.geometry;

      if (!geometry) {
        return;
      }

      if (!geometry.boundingBox) {
        geometry.computeBoundingBox();
      }

      if (geometry.boundingBox) {
        localBounds.union(
          geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld).applyMatrix4(jointInverse)
        );
        hasBounds = true;
      }
    });

    return hasBounds ? localBounds : null;
  }

  private restoreJointPose(pose: Record<string, number>): void {
    const joints = this.getRobotJoints();

    for (const [target, value] of Object.entries(pose)) {
      const joint = joints[target];

      if (joint) {
        this.setJointValue(joint, value);
      }
    }

    this.robot?.updateMatrixWorld(true);
  }

  private captureRobotTransform(robot: Object3D): {
    position: Vector3;
    quaternion: Quaternion;
    scale: Vector3;
  } {
    return {
      position: robot.position.clone(),
      quaternion: robot.quaternion.clone(),
      scale: robot.scale.clone()
    };
  }

  private restoreRobotTransform(
    robot: Object3D,
    transform: { position: Vector3; quaternion: Quaternion; scale: Vector3 }
  ): void {
    robot.position.copy(transform.position);
    robot.quaternion.copy(transform.quaternion);
    robot.scale.copy(transform.scale);
  }

  private restorePhysicsResetRobotState(): void {
    const robot = this.robot;

    if (!robot || !this.physicsResetPose || !this.physicsResetRobotTransform) {
      this.restoreDefaultRobotState();
      return;
    }

    this.restoreRobotTransform(robot, this.physicsResetRobotTransform);
    this.restoreJointPose(this.physicsResetPose);
    this.lastAnimatedJointTargets.clear();
    this.nextAnimatedJointTargets.clear();
    this.resetPoseEditState();
    this.updateViewerDebugLayers({ poseHandles: true });
  }

  private restoreDefaultRobotState(): void {
    const robot = this.robot;

    if (!robot) {
      return;
    }

    if (this.defaultRobotTransform) {
      this.restoreRobotTransform(robot, this.defaultRobotTransform);
    }

    if (this.defaultPose) {
      this.restoreJointPose(this.defaultPose);
    } else {
      robot.updateMatrixWorld(true);
    }

    this.lastAnimatedJointTargets.clear();
    this.nextAnimatedJointTargets.clear();
    this.resetPoseEditState();
    this.updateViewerDebugLayers({ poseHandles: true });
  }

  setCameraPose(
    position: RobotViewerVector,
    target: RobotViewerVector = this.options.cameraTarget,
    up?: RobotViewerVector
  ): void {
    if (this.options.cameraControlMode === 'orbit') {
      const worldUpPose = resolveWorldUpCameraPose(
        new Vector3(position.x, position.y, position.z),
        new Vector3(target.x, target.y, target.z),
        up ? new Vector3(up.x, up.y, up.z) : this.camera.up
      );
      this.cameraController.setCameraPose(
        this.serializeCameraVector(worldUpPose.position),
        target,
        this.serializeCameraVector(worldUpPose.up)
      );
      return;
    }

    this.cameraController.setCameraPose(position, target, up);
  }

  orbitCameraBy(deltaYawRadians: number, deltaPitchRadians: number): void {
    if (this.options.cameraControlMode === 'orbit') {
      this.cameraController.worldUpOrbitCameraBy(deltaYawRadians, deltaPitchRadians);
      return;
    }

    this.cameraController.orbitCameraBy(deltaYawRadians, deltaPitchRadians);
  }

  getCameraPose(): {
    position: RobotViewerVector;
    target: RobotViewerVector;
    up: RobotViewerVector;
    quaternion: RobotViewerQuaternion;
    projection: Viewer3DCameraProjection;
  } {
    return this.cameraController.getCameraPose();
  }

  resolveEyeRingCameraPose(viewId: Viewer3DSymmetricCameraView = 'mixed'): {
    position: RobotViewerVector;
    target: RobotViewerVector;
    projection: Viewer3DCameraProjection;
  } | null {
    return this.cameraController.resolveEyeRingCameraPose(viewId);
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
    return this.cameraController.resolveRobotObjectCameraPose(anchorNames, offset, options);
  }

  private serializeCameraVector(vector: Vector3): RobotViewerVector {
    return {
      x: Number(vector.x.toFixed(4)),
      y: Number(vector.y.toFixed(4)),
      z: Number(vector.z.toFixed(4))
    };
  }

  private serializeCameraQuaternion(quaternion: Quaternion): RobotViewerQuaternion {
    return {
      x: Number(quaternion.x.toFixed(6)),
      y: Number(quaternion.y.toFixed(6)),
      z: Number(quaternion.z.toFixed(6)),
      w: Number(quaternion.w.toFixed(6))
    };
  }

  private serializeRuntimeHistoryVector(vector: { x: number; y: number; z: number }): ViewerHistoryVector3 {
    return {
      x: Number(vector.x.toFixed(4)),
      y: Number(vector.y.toFixed(4)),
      z: Number(vector.z.toFixed(4))
    };
  }

  transitionCameraPose(
    position: RobotViewerVector,
    target: RobotViewerVector = this.options.cameraTarget,
    durationMs = 420,
    up?: RobotViewerVector
  ): void {
    if (this.options.cameraControlMode === 'orbit') {
      const worldUpPose = resolveWorldUpCameraPose(
        new Vector3(position.x, position.y, position.z),
        new Vector3(target.x, target.y, target.z),
        up ? new Vector3(up.x, up.y, up.z) : this.camera.up
      );
      this.cameraController.transitionCameraPose(
        this.serializeCameraVector(worldUpPose.position),
        target,
        durationMs,
        this.serializeCameraVector(worldUpPose.up)
      );
      return;
    }

    this.cameraController.transitionCameraPose(position, target, durationMs, up);
  }

  resetCameraView(durationMs = 520): void {
    this.transitionCameraPose(VIEWER3D_DEFAULT_CAMERA_POSITION, VIEWER3D_DEFAULT_CAMERA_TARGET, durationMs, {
      x: 0,
      y: 1,
      z: 0
    });
  }

  private cancelCameraTransition(): void {
    this.cameraController.cancelCameraTransition();
  }

  private applyCameraPoseImmediate(position: Vector3, target: Vector3, up?: Vector3): void {
    this.cameraController.applyCameraPoseImmediate(position, target, up);
  }

  setCameraProjection(cameraProjection: Viewer3DCameraProjection): void {
    this.cameraController.setCameraProjection(cameraProjection);
  }

  setCameraControlMode(cameraControlMode: Viewer3DCameraControlMode): void {
    const nextMode = cameraControlMode === 'orbit' ? 'orbit' : 'arcball';
    const activeMode = this.controls instanceof ArcballControls ? 'arcball' : 'orbit';
    if (this.options.cameraControlMode === nextMode && activeMode === nextMode) {
      return;
    }

    this.cancelCameraTransition();
    const target = this.controls.target.clone();

    if (nextMode === 'orbit' && this.controls instanceof ArcballControls) {
      const worldUpPose = resolveWorldUpCameraPose(this.camera.position, target, this.camera.up);
      const completeWorldUpTransition = (): void => {
        if (this.destroyed || this.options.cameraControlMode !== 'orbit') {
          return;
        }

        this.applyCameraPoseImmediate(worldUpPose.position, target, worldUpPose.up);
        this.replaceCameraControls('orbit', target);
      };

      this.options.cameraControlMode = 'orbit';
      this.controls.enabled = false;
      this.setCameraControlsMotionEnabled(false);
      this.cameraController.transitionCameraPose(
        this.serializeCameraVector(worldUpPose.position),
        this.serializeCameraVector(target),
        420,
        this.serializeCameraVector(worldUpPose.up),
        {
          onComplete: completeWorldUpTransition,
          onCancel: completeWorldUpTransition
        }
      );
      return;
    }

    this.replaceCameraControls(nextMode, target);
  }

  private replaceCameraControls(nextMode: Viewer3DCameraControlMode, target: Vector3): void {
    this.controls.enabled = false;
    this.setCameraControlsMotionEnabled(false);
    this.disposeCameraControls();
    this.options.cameraControlMode = nextMode;
    this.controls = this.createCameraControls(nextMode, target);
    this.controlsActive = false;
    this.controlsSettlingFrames = ROBOT_VIEWER_CONTROLS_SETTLING_FRAMES;
    this.visualGroundLayer?.requestReflectionRefresh();
    this.requestRender();
  }

  private handleControlsStart = (): void => {
    this.options.onCameraInteractionStart();
    this.cameraController.handleControlsStart();
  };

  private handleControlsChange = (): void => {
    this.cameraController.handleControlsChange();
  };

  private handleControlsEnd = (): void => {
    this.cameraController.handleControlsEnd();
  };

  private interpolateTrack(track: RobotMotionTrack, time: number): number | null {
    return interpolateRobotMotionTrackValueAtTime(track, time);
  }
}

function formatNavigationDistance(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}m`;
}

function formatNavigationAngle(value: number): string {
  const degrees = MathUtils.radToDeg(normalizeNavigationRadians(value));
  return `${degrees >= 0 ? '+' : ''}${degrees.toFixed(0)}°`;
}

function normalizeNavigationRadians(value: number): number {
  return Math.atan2(Math.sin(value), Math.cos(value));
}

function normalizeFrameRate(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(1, Math.min(240, value)) : fallback;
}

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.closest('[contenteditable="true"]') !== null
  );
}

function isFiniteVector(value: RobotViewerVector): boolean {
  return Number.isFinite(value.x) && Number.isFinite(value.y) && Number.isFinite(value.z);
}

function sampleNavigationPath(points: readonly Vector3[], progress: number): Vector3 {
  const distances = points.slice(1).map((point, index) => point.distanceTo(points[index] ?? point));
  const totalDistance = distances.reduce((total, distance) => total + distance, 0);
  if (totalDistance <= 0) return points[points.length - 1]?.clone() ?? new Vector3();
  let remaining = MathUtils.clamp(progress, 0, 1) * totalDistance;
  for (let index = 0; index < distances.length; index += 1) {
    const distance = distances[index] ?? 0;
    const start = points[index];
    const end = points[index + 1];
    if (!start || !end) continue;
    if (remaining <= distance || index === distances.length - 1) {
      return start.clone().lerp(end, distance > 0 ? remaining / distance : 1);
    }
    remaining -= distance;
  }
  return points[points.length - 1]?.clone() ?? new Vector3();
}
import { resolveViewerLedRingCalibration } from '../ledRingCalibration.js';
