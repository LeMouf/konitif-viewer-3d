import {
  Color,
  DynamicDrawUsage,
  Euler,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  Quaternion,
  ShaderMaterial,
  SphereGeometry,
  Vector3
} from 'three';

export type ViewerProjectileVisualPhase =
  | 'flight'
  | 'robot-contact'
  | 'ground-contact'
  | 'settled'
  | 'fading';

const PHASE_COLORS: Record<ViewerProjectileVisualPhase, string> = {
  flight: '#ef4444',
  'robot-contact': '#fde047',
  'ground-contact': '#fb923c',
  settled: '#a3e635',
  fading: '#7f1d1d'
};

const HIDDEN_MATRIX = new Matrix4().makeScale(0, 0, 0);
const INSTANCE_SCALE = new Vector3(1, 1, 1);

export class ViewerProjectileParticleRenderer {
  readonly mesh: InstancedMesh;

  private readonly active: InstancedBufferAttribute;
  private readonly phaseColor: InstancedBufferAttribute;
  private readonly fadeStartedAt: InstancedBufferAttribute;
  private readonly occupied: boolean[];
  private readonly matrix = new Matrix4();
  private readonly euler = new Euler();
  private readonly rotation = new Quaternion();

  constructor(
    readonly capacity: number,
    radiusMeters: number,
    fadeDurationSeconds: number
  ) {
    const geometry = new SphereGeometry(radiusMeters, 18, 12);
    this.active = new InstancedBufferAttribute(new Float32Array(capacity), 1);
    this.phaseColor = new InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    this.fadeStartedAt = new InstancedBufferAttribute(new Float32Array(capacity), 1);
    this.active.setUsage(DynamicDrawUsage);
    this.phaseColor.setUsage(DynamicDrawUsage);
    this.fadeStartedAt.setUsage(DynamicDrawUsage);
    geometry.setAttribute('instanceActive', this.active);
    geometry.setAttribute('instancePhaseColor', this.phaseColor);
    geometry.setAttribute('instanceFadeStartedAt', this.fadeStartedAt);

    const material = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uFadeDuration: { value: Math.max(0.001, fadeDurationSeconds) }
      },
      vertexShader: `
        attribute float instanceActive;
        attribute vec3 instancePhaseColor;
        attribute float instanceFadeStartedAt;
        uniform float uTime;
        uniform float uFadeDuration;
        varying vec3 vPhaseColor;
        varying vec3 vNormal;
        varying float vAlpha;

        void main() {
          float fading = step(0.0, instanceFadeStartedAt);
          float fade = clamp(1.0 - (uTime - instanceFadeStartedAt) / uFadeDuration, 0.0, 1.0);
          vAlpha = instanceActive * mix(1.0, fade, fading);
          vPhaseColor = instancePhaseColor;
          float particleScale = mix(0.72, 1.0, vAlpha);
          vec4 instancePosition = instanceMatrix * vec4(position * particleScale, 1.0);
          vNormal = normalize(mat3(modelViewMatrix * instanceMatrix) * normal);
          gl_Position = projectionMatrix * modelViewMatrix * instancePosition;
        }
      `,
      fragmentShader: `
        varying vec3 vPhaseColor;
        varying vec3 vNormal;
        varying float vAlpha;

        float interleavedGradientNoise(vec2 pixel) {
          return fract(52.9829189 * fract(dot(pixel, vec2(0.06711056, 0.00583715))));
        }

        void main() {
          if (vAlpha <= 0.0 || vAlpha < interleavedGradientNoise(gl_FragCoord.xy)) discard;
          float diffuse = 0.58 + 0.42 * max(0.0, dot(normalize(vNormal), normalize(vec3(0.35, 0.8, 0.45))));
          gl_FragColor = vec4(vPhaseColor * diffuse, 1.0);
        }
      `,
      depthTest: true,
      depthWrite: true,
      transparent: false,
      toneMapped: false
    });

    this.mesh = new InstancedMesh(geometry, material, capacity);
    this.mesh.name = 'viewer-projectile-particle-pool';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1095;
    this.occupied = Array.from({ length: capacity }, () => false);
    for (let slot = 0; slot < capacity; slot += 1) {
      this.mesh.setMatrixAt(slot, HIDDEN_MATRIX);
      this.fadeStartedAt.setX(slot, -1);
      this.setPhase(slot, 'flight', 0);
    }
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  allocate(): number | null {
    const slot = this.occupied.findIndex((occupied) => !occupied);
    if (slot < 0) return null;
    this.occupied[slot] = true;
    this.active.setX(slot, 1);
    this.fadeStartedAt.setX(slot, -1);
    this.active.needsUpdate = true;
    this.fadeStartedAt.needsUpdate = true;
    return slot;
  }

  release(slot: number): void {
    if (!this.occupied[slot]) return;
    this.occupied[slot] = false;
    this.active.setX(slot, 0);
    this.mesh.setMatrixAt(slot, HIDDEN_MATRIX);
    this.active.needsUpdate = true;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  updateTransform(slot: number, position: Vector3, rotationX: number, rotationY: number, scale = 1): void {
    this.rotation.setFromEuler(this.euler.set(rotationX, rotationY, 0, 'XYZ'));
    INSTANCE_SCALE.setScalar(Math.max(0.01, Math.min(1, scale)));
    this.matrix.compose(position, this.rotation, INSTANCE_SCALE);
    this.mesh.setMatrixAt(slot, this.matrix);
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  setPhase(slot: number, phase: ViewerProjectileVisualPhase, nowSeconds: number): void {
    const color = new Color(PHASE_COLORS[phase]);
    this.phaseColor.setXYZ(slot, color.r, color.g, color.b);
    this.fadeStartedAt.setX(slot, phase === 'fading' ? nowSeconds : -1);
    this.phaseColor.needsUpdate = true;
    this.fadeStartedAt.needsUpdate = true;
  }

  setTime(nowSeconds: number): void {
    (this.mesh.material as ShaderMaterial).uniforms.uTime.value = nowSeconds;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as ShaderMaterial).dispose();
  }
}
