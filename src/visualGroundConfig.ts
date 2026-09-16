export type ViewerVisualGroundComponentId =
  | 'tilePattern'
  | 'surfaceVariation'
  | 'fogFade'
  | 'receiveShadows'
  | 'reflection'
  | 'focusTilt';

export interface ViewerVisualGroundComponents {
  tilePattern: boolean;
  surfaceVariation: boolean;
  fogFade: boolean;
  receiveShadows: boolean;
  reflection: boolean;
  focusTilt: boolean;
}

export interface ViewerVisualGroundConfig {
  size: number;
  tileSize: number;
  jointWidth: number;
  majorJointWidth: number;
  majorJointOpacity: number;
  variationStrength: number;
  surfaceOpacity: number;
  roughness: number;
  metalness: number;
  reflectionOpacity: number;
  reflectionResolution: number;
  reflectionBlurRadius: number;
  fogDensity: number;
  components: ViewerVisualGroundComponents;
}

export type ViewerVisualGroundOptions = Omit<Partial<ViewerVisualGroundConfig>, 'components'> & {
  components?: Partial<ViewerVisualGroundComponents>;
};

export const DEFAULT_VIEWER_VISUAL_GROUND_CONFIG: ViewerVisualGroundConfig = {
  // Orthographic/isometric projections preserve their footprint with depth.
  // The visual plane must therefore extend beyond the distance at which the
  // exponential fog becomes opaque, otherwise its near edge remains visible.
  size: 160,
  tileSize: 0.5,
  jointWidth: 0,
  majorJointWidth: 0.003,
  majorJointOpacity: 0.55,
  variationStrength: 0.11,
  surfaceOpacity: 1,
  roughness: 0.58,
  metalness: 0.04,
  reflectionOpacity: 0.14,
  reflectionResolution: 1024,
  reflectionBlurRadius: 1.2,
  // Keep the robot readable at working distance while absorbing the tile
  // pattern before it reaches the horizon. The previous 0.068 density left a
  // visible checker band between the ground and the sky on wide viewports.
  fogDensity: 0.095,
  components: {
    tilePattern: true,
    surfaceVariation: true,
    fogFade: true,
    receiveShadows: true,
    reflection: true,
    focusTilt: true
  }
};

export const DEFAULT_VIEWER_VISUAL_GROUND_PALETTE = {
  base: '#172c40',
  alternate: '#203a50',
  joint: '#102235',
  majorJoint: '#afc7d5',
  reflection: '#b6d1e2'
} as const;

export function normalizeViewerVisualGroundConfig(
  config: ViewerVisualGroundOptions = {}
): ViewerVisualGroundConfig {
  const components = config.components ?? {};
  return {
    size: clampFinite(config.size, DEFAULT_VIEWER_VISUAL_GROUND_CONFIG.size, 2, 320),
    tileSize: clampFinite(config.tileSize, DEFAULT_VIEWER_VISUAL_GROUND_CONFIG.tileSize, 0.05, 4),
    jointWidth: clampFinite(config.jointWidth, DEFAULT_VIEWER_VISUAL_GROUND_CONFIG.jointWidth, 0, 0.2),
    majorJointWidth: clampFinite(
      config.majorJointWidth,
      DEFAULT_VIEWER_VISUAL_GROUND_CONFIG.majorJointWidth,
      0.001,
      0.1
    ),
    majorJointOpacity: clampFinite(
      config.majorJointOpacity,
      DEFAULT_VIEWER_VISUAL_GROUND_CONFIG.majorJointOpacity,
      0,
      1
    ),
    variationStrength: clampFinite(
      config.variationStrength,
      DEFAULT_VIEWER_VISUAL_GROUND_CONFIG.variationStrength,
      0,
      0.5
    ),
    surfaceOpacity: clampFinite(
      config.surfaceOpacity,
      DEFAULT_VIEWER_VISUAL_GROUND_CONFIG.surfaceOpacity,
      0,
      1
    ),
    roughness: clampFinite(config.roughness, DEFAULT_VIEWER_VISUAL_GROUND_CONFIG.roughness, 0, 1),
    metalness: clampFinite(config.metalness, DEFAULT_VIEWER_VISUAL_GROUND_CONFIG.metalness, 0, 1),
    reflectionOpacity: clampFinite(
      config.reflectionOpacity,
      DEFAULT_VIEWER_VISUAL_GROUND_CONFIG.reflectionOpacity,
      0,
      0.5
    ),
    reflectionResolution: Math.round(
      clampFinite(
        config.reflectionResolution,
        DEFAULT_VIEWER_VISUAL_GROUND_CONFIG.reflectionResolution,
        128,
        2048
      )
    ),
    reflectionBlurRadius: clampFinite(
      config.reflectionBlurRadius,
      DEFAULT_VIEWER_VISUAL_GROUND_CONFIG.reflectionBlurRadius,
      0,
      2.5
    ),
    fogDensity: clampFinite(config.fogDensity, DEFAULT_VIEWER_VISUAL_GROUND_CONFIG.fogDensity, 0.001, 0.5),
    components: {
      tilePattern: components.tilePattern ?? DEFAULT_VIEWER_VISUAL_GROUND_CONFIG.components.tilePattern,
      surfaceVariation:
        components.surfaceVariation ?? DEFAULT_VIEWER_VISUAL_GROUND_CONFIG.components.surfaceVariation,
      fogFade: components.fogFade ?? DEFAULT_VIEWER_VISUAL_GROUND_CONFIG.components.fogFade,
      receiveShadows:
        components.receiveShadows ?? DEFAULT_VIEWER_VISUAL_GROUND_CONFIG.components.receiveShadows,
      reflection: components.reflection ?? DEFAULT_VIEWER_VISUAL_GROUND_CONFIG.components.reflection,
      focusTilt: components.focusTilt ?? DEFAULT_VIEWER_VISUAL_GROUND_CONFIG.components.focusTilt
    }
  };
}

function clampFinite(value: number | undefined, fallback: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(maximum, Math.max(minimum, value as number));
}
