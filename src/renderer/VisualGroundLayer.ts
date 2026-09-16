import {
  type ViewerVisualGroundComponentId,
  type ViewerVisualGroundComponents,
  type ViewerVisualGroundConfig,
  type ViewerVisualGroundOptions,
  DEFAULT_VIEWER_VISUAL_GROUND_CONFIG,
  DEFAULT_VIEWER_VISUAL_GROUND_PALETTE,
  normalizeViewerVisualGroundConfig
} from '../visualGroundConfig.js';
export {
  type ViewerVisualGroundComponentId,
  type ViewerVisualGroundComponents,
  type ViewerVisualGroundConfig,
  type ViewerVisualGroundOptions,
  DEFAULT_VIEWER_VISUAL_GROUND_CONFIG,
  DEFAULT_VIEWER_VISUAL_GROUND_PALETTE,
  normalizeViewerVisualGroundConfig
} from '../visualGroundConfig.js';

import {
  Color,
  DoubleSide,
  FrontSide,
  Group,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  ShaderMaterial,
  Vector2,
  Vector3,
  type BufferGeometry,
  type ColorRepresentation,
  type IUniform,
  type Material
} from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';









export interface ViewerVisualGroundPalette {
  base: Color;
  alternate: Color;
  joint: Color;
  majorJoint: Color;
  reflection: Color;
}

export type ViewerVisualGroundPaletteOptions = Partial<{
  [Key in keyof ViewerVisualGroundPalette]: ColorRepresentation;
}>;

export interface ViewerGroundReflectionRefreshDecision {
  forced: boolean;
  lastRefreshAt: number;
  minimumIntervalMs: number;
  now: number;
}

/**
 * Decides whether the planar reflection needs a new scene projection.
 * The previously rendered texture remains valid between refreshes, so camera
 * and timeline interactions do not need a second full scene render at 120 Hz.
 */
export function shouldRefreshViewerGroundReflection({
  forced,
  lastRefreshAt,
  minimumIntervalMs,
  now
}: ViewerGroundReflectionRefreshDecision): boolean {
  return forced || minimumIntervalMs <= 0 || now - lastRefreshAt >= minimumIntervalMs;
}



type GroundUniforms = {
  konitifGroundTilePatternEnabled: IUniform<number>;
  konitifGroundSurfaceVariationEnabled: IUniform<number>;
  konitifGroundSize: IUniform<number>;
  konitifGroundTileSize: IUniform<number>;
  konitifGroundJointWidth: IUniform<number>;
  konitifGroundMajorJointWidth: IUniform<number>;
  konitifGroundMajorJointOpacity: IUniform<number>;
  konitifGroundVariationStrength: IUniform<number>;
  konitifGroundBaseColor: IUniform<Color>;
  konitifGroundAlternateColor: IUniform<Color>;
  konitifGroundJointColor: IUniform<Color>;
  konitifGroundMajorJointColor: IUniform<Color>;
};

type ReflectionMaterialVariant = {
  material: Material;
  sourceVersion: number;
};

type ReflectionMaterialAssignment = {
  material: Material | Material[];
  mesh: Mesh<BufferGeometry, Material | Material[]>;
};



const VIEWER_GROUND_REFLECTION_GRAZING_FADE_OUT = 0.035;
const VIEWER_GROUND_REFLECTION_GRAZING_FADE_IN = 0.13;

/**
 * Removes the planar mirror before its oblique clip plane becomes unstable at
 * grazing incidence. The opaque visual ground remains continuous underneath.
 */
export function resolveViewerGroundReflectionIncidenceOpacity(incidence: number): number {
  if (!Number.isFinite(incidence)) return 0;
  return MathUtils.smoothstep(
    Math.abs(incidence),
    VIEWER_GROUND_REFLECTION_GRAZING_FADE_OUT,
    VIEWER_GROUND_REFLECTION_GRAZING_FADE_IN
  );
}

/**
 * Pure visual projection of the viewer support plane.
 *
 * The layer owns no raycast, target, navigation, or command behavior. Its
 * components can be disabled independently without changing scene authority.
 */
export class VisualGroundLayer {
  readonly group = new Group();

  private config: ViewerVisualGroundConfig;
  private palette: ViewerVisualGroundPalette;
  private geometry: PlaneGeometry;
  private reflectionGeometry: PlaneGeometry;
  private readonly surfaceMaterial: MeshStandardMaterial;
  private readonly surfaceMesh: Mesh<PlaneGeometry, MeshStandardMaterial>;
  private readonly reflectionMesh: Reflector;
  private readonly reflectionMaterial: ShaderMaterial;
  private readonly reflectionMaterialVariants = new Map<Material, ReflectionMaterialVariant>();
  private compiledUniforms: GroundUniforms | null = null;
  private reflectionMinimumRefreshIntervalMs = 0;
  private reflectionRefreshForced = true;
  private lastReflectionRefreshAt = Number.NEGATIVE_INFINITY;

  constructor(config: ViewerVisualGroundOptions = {}, palette: ViewerVisualGroundPaletteOptions = {}) {
    this.config = normalizeViewerVisualGroundConfig(config);
    this.palette = normalizeViewerVisualGroundPalette(palette);
    this.group.name = 'viewer-visual-ground-layer';

    this.geometry = new PlaneGeometry(this.config.size, this.config.size, 1, 1);
    this.geometry.rotateX(-Math.PI / 2);

    this.surfaceMaterial = new MeshStandardMaterial({
      color: '#ffffff',
      opacity: this.config.surfaceOpacity,
      transparent: this.config.surfaceOpacity < 1,
      metalness: this.config.metalness,
      roughness: this.config.roughness,
      // The mirror camera lives below the support plane. Keeping the visual
      // surface front-sided prevents it from occluding the reflected robot.
      side: FrontSide
    });
    this.surfaceMaterial.name = 'viewer-visual-ground-surface';
    this.surfaceMaterial.fog = this.config.components.fogFade;
    // The decorative surface and the transparent reflection plane occupy the
    // same visual support plane. A sub-millimetre world-space offset alone is
    // not stable at grazing angles: depth quantization makes both fragments
    // alternate while the camera moves. Push the opaque surface back in depth
    // space and pull the reflection forward instead of increasing the visible
    // gap below the robot feet.
    this.surfaceMaterial.polygonOffset = true;
    this.surfaceMaterial.polygonOffsetFactor = 1;
    this.surfaceMaterial.polygonOffsetUnits = 1;
    this.surfaceMaterial.onBeforeCompile = (shader) => {
      const uniforms = createGroundUniforms(this.config, this.palette);
      Object.assign(shader.uniforms, uniforms);
      this.compiledUniforms = uniforms;
      shader.vertexShader = injectGroundVertexShader(shader.vertexShader);
      shader.fragmentShader = injectGroundFragmentShader(shader.fragmentShader);
    };
    this.surfaceMaterial.customProgramCacheKey = () => 'konitif-visual-ground-v3';

    this.surfaceMesh = new Mesh(this.geometry, this.surfaceMaterial);
    this.surfaceMesh.name = 'viewer-visual-ground-surface';
    // Keep the visual surface immediately below the shared support plane.
    // The previous 3 mm offset was visible in close/side views and made a
    // correctly grounded robot appear to float before physics started.
    this.surfaceMesh.position.y = -0.0004;
    this.surfaceMesh.receiveShadow = this.config.components.receiveShadows;
    this.surfaceMesh.renderOrder = 1;
    this.group.add(this.surfaceMesh);

    this.reflectionGeometry = new PlaneGeometry(this.config.size, this.config.size, 1, 1);
    this.reflectionMesh = new Reflector(this.reflectionGeometry, {
      clipBias: 0.002,
      color: this.palette.reflection,
      // Keep the reflection target bounded while antialiasing the reflected
      // silhouette before the final Viewer post-processing pass.
      multisample: 4,
      textureHeight: this.config.reflectionResolution,
      textureWidth: this.config.reflectionResolution
    });
    this.reflectionMesh.rotateX(-Math.PI / 2);
    this.reflectionMaterial = this.reflectionMesh.material as ShaderMaterial;
    this.prepareReflectionMaterial();
    this.prepareReflectionFacingPass();
    this.reflectionMaterial.name = 'viewer-visual-ground-reflection';
    this.reflectionMesh.name = 'viewer-visual-ground-reflection';
    // Reflection remains above the decorative surface but below the physical
    // support plane, avoiding both z-fighting and intersections with soles.
    this.reflectionMesh.position.y = -0.0001;
    this.reflectionMesh.renderOrder = 2;
    this.reflectionMesh.visible = this.config.components.reflection;
    this.group.add(this.reflectionMesh);
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
    if (visible) {
      this.requestReflectionRefresh();
    }
  }

  setReflectionMinimumRefreshInterval(minimumIntervalMs: number): void {
    this.reflectionMinimumRefreshIntervalMs = Number.isFinite(minimumIntervalMs)
      ? Math.max(0, minimumIntervalMs)
      : 0;
  }

  requestReflectionRefresh(): void {
    this.reflectionRefreshForced = true;
  }

  setComponentVisible(componentId: ViewerVisualGroundComponentId, visible: boolean): void {
    if (this.config.components[componentId] === visible) {
      return;
    }

    this.config = {
      ...this.config,
      components: {
        ...this.config.components,
        [componentId]: visible
      }
    };

    if (componentId === 'reflection') {
      this.reflectionMesh.visible = visible;
      if (visible) {
        this.requestReflectionRefresh();
      }
    } else if (componentId === 'receiveShadows') {
      this.surfaceMesh.receiveShadow = visible;
    } else if (componentId === 'fogFade') {
      this.surfaceMaterial.fog = visible;
      this.surfaceMaterial.needsUpdate = true;
    }

    this.synchronizeUniforms();
    this.requestReflectionRefresh();
  }

  configure(config: ViewerVisualGroundOptions): void {
    const previousFogFade = this.config.components.fogFade;
    const nextConfig = normalizeViewerVisualGroundConfig({
      ...this.config,
      ...config,
      components: {
        ...this.config.components,
        ...config.components
      }
    });
    const sizeChanged = nextConfig.size !== this.config.size;
    const reflectionResolutionChanged =
      nextConfig.reflectionResolution !== this.config.reflectionResolution;
    this.config = nextConfig;

    if (sizeChanged) {
      const nextGeometry = new PlaneGeometry(this.config.size, this.config.size, 1, 1);
      nextGeometry.rotateX(-Math.PI / 2);
      this.surfaceMesh.geometry = nextGeometry;
      this.geometry.dispose();
      this.geometry = nextGeometry;

      const nextReflectionGeometry = new PlaneGeometry(this.config.size, this.config.size, 1, 1);
      this.reflectionMesh.geometry = nextReflectionGeometry;
      this.reflectionGeometry.dispose();
      this.reflectionGeometry = nextReflectionGeometry;
    }

    if (reflectionResolutionChanged) {
      this.reflectionMesh
        .getRenderTarget()
        .setSize(this.config.reflectionResolution, this.config.reflectionResolution);
    }

    const surfaceTransparencyChanged =
      this.surfaceMaterial.transparent !== (this.config.surfaceOpacity < 1);
    this.surfaceMaterial.opacity = this.config.surfaceOpacity;
    this.surfaceMaterial.transparent = this.config.surfaceOpacity < 1;
    this.surfaceMaterial.roughness = this.config.roughness;
    this.surfaceMaterial.metalness = this.config.metalness;
    this.reflectionMaterial.uniforms.konitifReflectionOpacity.value = this.config.reflectionOpacity;
    this.reflectionMaterial.uniforms.konitifReflectionBlurRadius.value =
      this.config.reflectionBlurRadius;
    (this.reflectionMaterial.uniforms.konitifReflectionTexelSize.value as Vector2).setScalar(
      1 / this.config.reflectionResolution
    );
    this.reflectionMesh.visible = this.config.components.reflection;
    this.surfaceMesh.receiveShadow = this.config.components.receiveShadows;
    this.surfaceMaterial.fog = this.config.components.fogFade;
    if (previousFogFade !== this.config.components.fogFade) {
      this.surfaceMaterial.needsUpdate = true;
    }
    if (surfaceTransparencyChanged) {
      this.surfaceMaterial.needsUpdate = true;
    }
    this.synchronizeUniforms();
    this.requestReflectionRefresh();
  }

  applyPalette(palette: ViewerVisualGroundPaletteOptions): void {
    this.palette = normalizeViewerVisualGroundPalette({ ...this.palette, ...palette });
    (this.reflectionMaterial.uniforms.color.value as Color).copy(this.palette.reflection);
    this.synchronizeUniforms();
    this.requestReflectionRefresh();
  }

  getConfig(): ViewerVisualGroundConfig {
    return {
      ...this.config,
      components: { ...this.config.components }
    };
  }

  dispose(): void {
    this.group.remove(this.surfaceMesh, this.reflectionMesh);
    this.geometry.dispose();
    this.reflectionGeometry.dispose();
    this.surfaceMaterial.dispose();
    this.reflectionMesh.dispose();
    for (const variant of this.reflectionMaterialVariants.values()) {
      variant.material.dispose();
    }
    this.reflectionMaterialVariants.clear();
    this.compiledUniforms = null;
  }

  private synchronizeUniforms(): void {
    if (!this.compiledUniforms) {
      this.surfaceMaterial.needsUpdate = true;
      return;
    }

    const nextUniforms = createGroundUniforms(this.config, this.palette);
    for (const key of Object.keys(nextUniforms) as (keyof GroundUniforms)[]) {
      const nextValue = nextUniforms[key].value;
      const currentValue = this.compiledUniforms[key].value;
      if (currentValue instanceof Color && nextValue instanceof Color) {
        currentValue.copy(nextValue);
      } else {
        this.compiledUniforms[key].value = nextValue;
      }
    }
  }

  private prepareReflectionMaterial(): void {
    this.reflectionMaterial.uniforms.konitifReflectionOpacity = {
      value: this.config.reflectionOpacity
    };
    this.reflectionMaterial.uniforms.konitifReflectionTexelSize = {
      value: new Vector2(1 / this.config.reflectionResolution, 1 / this.config.reflectionResolution)
    };
    this.reflectionMaterial.uniforms.konitifReflectionBlurRadius = {
      value: this.config.reflectionBlurRadius
    };
    this.reflectionMaterial.fragmentShader = this.reflectionMaterial.fragmentShader
      .replace(
        'uniform sampler2D tDiffuse;',
        `uniform sampler2D tDiffuse;
uniform float konitifReflectionOpacity;
uniform vec2 konitifReflectionTexelSize;
uniform float konitifReflectionBlurRadius;`
      )
      .replace(
        'vec4 base = texture2DProj( tDiffuse, vUv );',
        `vec2 konitifReflectionSampleOffset =
		konitifReflectionTexelSize * konitifReflectionBlurRadius * vUv.w;
		vec4 base = texture2DProj( tDiffuse, vUv ) * 0.52;
		base += texture2DProj(
			tDiffuse,
			vUv + vec4(konitifReflectionSampleOffset, 0.0, 0.0)
		) * 0.12;
		base += texture2DProj(
			tDiffuse,
			vUv - vec4(konitifReflectionSampleOffset, 0.0, 0.0)
		) * 0.12;
		base += texture2DProj(
			tDiffuse,
			vUv + vec4(konitifReflectionSampleOffset.x, -konitifReflectionSampleOffset.y, 0.0, 0.0)
		) * 0.12;
		base += texture2DProj(
			tDiffuse,
			vUv + vec4(-konitifReflectionSampleOffset.x, konitifReflectionSampleOffset.y, 0.0, 0.0)
		) * 0.12;`
      )
      .replace(
        'gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );',
        `gl_FragColor = vec4(
\t\tblendOverlay( base.rgb, color ),
\t\tkonitifReflectionOpacity
\t);`
      );
    this.reflectionMaterial.transparent = true;
    this.reflectionMaterial.depthWrite = false;
    this.reflectionMaterial.polygonOffset = true;
    this.reflectionMaterial.polygonOffsetFactor = -1;
    this.reflectionMaterial.polygonOffsetUnits = -1;
    this.reflectionMaterial.side = FrontSide;
    this.reflectionMaterial.needsUpdate = true;
  }

  /**
   * A planar mirror observes the scene from the opposite side of the support
   * plane. Some robot assets contain mixed triangle winding, which is harmless
   * from the authored camera but exposes missing or inside-out faces from the
   * reflected camera. The reflection therefore receives cached, double-sided
   * material variants while the primary scene keeps its original materials.
   */
  private prepareReflectionFacingPass(): void {
    const renderReflection = this.reflectionMesh.onBeforeRender;
    const reflectorWorldPosition = new Vector3();
    const cameraWorldPosition = new Vector3();
    const reflectorNormal = new Vector3();
    const cameraDirection = new Vector3();

    this.reflectionMesh.onBeforeRender = (...args): void => {
      const camera = args[2];
      this.reflectionMesh.getWorldPosition(reflectorWorldPosition);
      camera.getWorldPosition(cameraWorldPosition);
      reflectorNormal.set(0, 0, 1).transformDirection(this.reflectionMesh.matrixWorld);
      cameraDirection.subVectors(cameraWorldPosition, reflectorWorldPosition).normalize();
      const incidenceOpacity = resolveViewerGroundReflectionIncidenceOpacity(
        cameraDirection.dot(reflectorNormal)
      );
      this.reflectionMaterial.uniforms.konitifReflectionOpacity.value =
        this.config.reflectionOpacity * incidenceOpacity;
      if (incidenceOpacity <= 0) {
        // Refresh once the mirror becomes stable again; never reuse a texture
        // matrix captured on the opposite side of the grazing boundary.
        this.reflectionRefreshForced = true;
        return;
      }

      const now = performance.now();
      if (
        !shouldRefreshViewerGroundReflection({
          forced: this.reflectionRefreshForced,
          lastRefreshAt: this.lastReflectionRefreshAt,
          minimumIntervalMs: this.reflectionMinimumRefreshIntervalMs,
          now
        })
      ) {
        return;
      }

      const scene = args[1];
      const assignments: ReflectionMaterialAssignment[] = [];

      // Match the renderer's visibility traversal: hidden subtrees cannot
      // contribute to this pass. Resolve their variants only when shown.
      scene.traverseVisible((object) => {
        if (object === this.surfaceMesh || object === this.reflectionMesh) {
          return;
        }
        const mesh = object as Mesh<BufferGeometry, Material | Material[]>;
        if (!mesh.isMesh || !mesh.material) return;

        const sourceMaterial = mesh.material;
        const reflectionMaterial = Array.isArray(sourceMaterial)
          ? sourceMaterial.map((material) => this.resolveReflectionMaterialVariant(material))
          : this.resolveReflectionMaterialVariant(sourceMaterial);

        if (reflectionMaterial === sourceMaterial) {
          return;
        }

        assignments.push({ mesh, material: sourceMaterial });
        mesh.material = reflectionMaterial;
      });

      try {
        renderReflection.apply(this.reflectionMesh, args);
        this.lastReflectionRefreshAt = now;
        this.reflectionRefreshForced = false;
      } finally {
        for (const assignment of assignments) {
          assignment.mesh.material = assignment.material;
        }
      }
    };
  }

  private resolveReflectionMaterialVariant(source: Material): Material {
    if (source.side === DoubleSide) {
      return source;
    }

    const current = this.reflectionMaterialVariants.get(source);
    if (current?.sourceVersion === source.version) {
      return current.material;
    }

    current?.material.dispose();
    const material = source.clone();
    material.name = source.name ? `${source.name}-reflection-facing` : 'reflection-facing';
    material.side = DoubleSide;
    material.needsUpdate = true;
    this.reflectionMaterialVariants.set(source, {
      material,
      sourceVersion: source.version
    });
    return material;
  }
}



export function injectGroundVertexShader(source: string): string {
  return source
    .replace('void main() {', 'varying vec2 vKonitifGroundPosition;\nvoid main() {')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvKonitifGroundPosition = position.xz;');
}

export function injectGroundFragmentShader(source: string): string {
  const declarations = `
varying vec2 vKonitifGroundPosition;
uniform float konitifGroundTilePatternEnabled;
uniform float konitifGroundSurfaceVariationEnabled;
uniform float konitifGroundSize;
uniform float konitifGroundTileSize;
uniform float konitifGroundJointWidth;
uniform float konitifGroundMajorJointWidth;
uniform float konitifGroundMajorJointOpacity;
uniform float konitifGroundVariationStrength;
uniform vec3 konitifGroundBaseColor;
uniform vec3 konitifGroundAlternateColor;
uniform vec3 konitifGroundJointColor;
uniform vec3 konitifGroundMajorJointColor;

float konitifGroundHash(vec2 cell) {
  return fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453123);
}
`;
  const diffuseProjection = `
vec2 konitifGroundTiles = (vKonitifGroundPosition + vec2(konitifGroundSize * 0.5)) / konitifGroundTileSize;
vec2 konitifGroundCell = floor(konitifGroundTiles);
float konitifGroundChecker = mod(konitifGroundCell.x + konitifGroundCell.y, 2.0);
float konitifGroundMicroVariation = (konitifGroundHash(konitifGroundCell) - 0.5) * 0.18;
float konitifGroundVariation = mix(0.0, 1.0, konitifGroundChecker);
konitifGroundVariation += konitifGroundMicroVariation * konitifGroundVariationStrength;
konitifGroundVariation = mix(0.5, konitifGroundVariation, konitifGroundSurfaceVariationEnabled);
vec3 konitifGroundTileColor = mix(
  konitifGroundBaseColor,
  konitifGroundAlternateColor,
  clamp(konitifGroundVariation, 0.0, 1.0)
);
// Adjacent 50 cm tiles meet directly. Their checker tint retains the inner
// subdivision without cutting a dark gap through each one-metre group.
vec3 konitifGroundColor = konitifGroundTileColor;
// Shift the one-metre white frame by one tile on both axes.
vec2 konitifGroundMajorTiles = (
  vKonitifGroundPosition + vec2(konitifGroundSize * 0.5 - konitifGroundTileSize)
) / (konitifGroundTileSize * 2.0);
vec2 konitifGroundMajorLocal = fract(konitifGroundMajorTiles);
vec2 konitifGroundMajorEdgeDistance = min(
  konitifGroundMajorLocal,
  1.0 - konitifGroundMajorLocal
);
float konitifGroundMajorJointRatio = konitifGroundMajorJointWidth / (konitifGroundTileSize * 2.0);
// Preserve each directional derivative until after antialiasing. Taking
// fwidth(min(x, y)) makes the gradient unstable where both line families
// cross and produces bright point-like coverage spikes at grazing angles.
vec2 konitifGroundMajorPixelFootprint = max(
  fwidth(konitifGroundMajorEdgeDistance),
  vec2(0.0001)
);
// Analytic one-pixel coverage. The transition width is derived exclusively
// from screen-space derivatives, so a near diagonal line cannot inherit a
// widening/stepping threshold from its authored world-space thickness.
vec2 konitifGroundMajorEdgeCoverage = clamp(
  (
    vec2(konitifGroundMajorJointRatio) - konitifGroundMajorEdgeDistance
  ) / konitifGroundMajorPixelFootprint + vec2(0.5),
  vec2(0.0),
  vec2(1.0)
);
vec2 konitifGroundMajorAxisJoint =
  konitifGroundMajorEdgeCoverage * konitifGroundMajorEdgeCoverage *
  (vec2(3.0) - 2.0 * konitifGroundMajorEdgeCoverage);
// Once a metric line becomes sub-pixel, sampling the periodic pattern would
// create distant moire. Fade its coverage before that threshold; the fog then
// absorbs it instead of leaving a noisy horizon.
vec2 konitifGroundMajorPixelCoverage = clamp(
  vec2(konitifGroundMajorJointRatio) / konitifGroundMajorPixelFootprint,
  vec2(0.0),
  vec2(1.0)
);
konitifGroundMajorAxisJoint *= smoothstep(
  vec2(0.1),
  vec2(0.8),
  konitifGroundMajorPixelCoverage
);
// max() is an intensity-bounded union: a crossing is never brighter than
// either individual line.
float konitifGroundMajorJoint = max(
  konitifGroundMajorAxisJoint.x,
  konitifGroundMajorAxisJoint.y
);
konitifGroundMajorJoint *= konitifGroundTilePatternEnabled;
konitifGroundColor = mix(
  konitifGroundColor,
  konitifGroundMajorJointColor,
  konitifGroundMajorJoint * konitifGroundMajorJointOpacity
);
vec4 diffuseColor = vec4(konitifGroundColor, opacity);
`;

  return source
    .replace('void main() {', `${declarations}\nvoid main() {`)
    .replace('vec4 diffuseColor = vec4( diffuse, opacity );', diffuseProjection);
}

function createGroundUniforms(
  config: ViewerVisualGroundConfig,
  palette: ViewerVisualGroundPalette
): GroundUniforms {
  return {
    konitifGroundTilePatternEnabled: { value: config.components.tilePattern ? 1 : 0 },
    konitifGroundSurfaceVariationEnabled: { value: config.components.surfaceVariation ? 1 : 0 },
    konitifGroundSize: { value: config.size },
    konitifGroundTileSize: { value: config.tileSize },
    konitifGroundJointWidth: { value: config.jointWidth },
    konitifGroundMajorJointWidth: { value: config.majorJointWidth },
    konitifGroundMajorJointOpacity: { value: config.majorJointOpacity },
    konitifGroundVariationStrength: { value: config.variationStrength },
    konitifGroundBaseColor: { value: palette.base.clone() },
    konitifGroundAlternateColor: { value: palette.alternate.clone() },
    konitifGroundJointColor: { value: palette.joint.clone() },
    konitifGroundMajorJointColor: { value: palette.majorJoint.clone() }
  };
}

function normalizeViewerVisualGroundPalette(
  palette: ViewerVisualGroundPaletteOptions
): ViewerVisualGroundPalette {
  return {
    base: normalizePaletteColor(palette.base, DEFAULT_VIEWER_VISUAL_GROUND_PALETTE.base),
    alternate: normalizePaletteColor(
      palette.alternate,
      DEFAULT_VIEWER_VISUAL_GROUND_PALETTE.alternate
    ),
    joint: normalizePaletteColor(palette.joint, DEFAULT_VIEWER_VISUAL_GROUND_PALETTE.joint),
    majorJoint: normalizePaletteColor(
      palette.majorJoint,
      DEFAULT_VIEWER_VISUAL_GROUND_PALETTE.majorJoint
    ),
    reflection: normalizePaletteColor(
      palette.reflection,
      DEFAULT_VIEWER_VISUAL_GROUND_PALETTE.reflection
    )
  };
}

function normalizePaletteColor(value: ColorRepresentation | undefined, fallback: string): Color {
  return value instanceof Color ? value.clone() : new Color(value ?? fallback);
}
