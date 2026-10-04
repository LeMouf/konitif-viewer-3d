import { MeshPhysicalMaterial, MeshStandardMaterial, type Material, type Texture } from 'three';

/** Visual-only projection; never a device command or a measured physical property. */
export interface Viewer3DIncarnationMaterialProjection {
  enabled: boolean;
  environmentIntensity: number;
  roughnessScale: number;
  metalnessScale: number;
  clearcoatScale: number;
}

interface Baseline {
  envMap: Texture | null;
  environmentIntensity: number;
  roughness: number;
  metalness: number;
  clearcoat: number | null;
  iridescence: number | null;
  sheen: number | null;
  transmission: number | null;
}

export function normalizeIncarnationMaterialProjection(value: Viewer3DIncarnationMaterialProjection): Viewer3DIncarnationMaterialProjection {
  for (const key of ['environmentIntensity', 'roughnessScale', 'metalnessScale', 'clearcoatScale'] as const) {
    if (!Number.isFinite(value[key]) || value[key] < 0) throw new Error(`Invalid material projection ${key}`);
  }
  if (typeof value.enabled !== 'boolean') throw new Error('Invalid material projection enabled');
  return { ...value };
}

/** Baselines follow material lifetime and are never multiplied cumulatively. */
export class IncarnationMaterialProjector {
  private readonly baselines = new WeakMap<MeshStandardMaterial, Baseline>();

  apply(materials: Iterable<Material>, projection: Viewer3DIncarnationMaterialProjection): void {
    const value = normalizeIncarnationMaterialProjection(projection);
    for (const material of materials) {
      if (!(material instanceof MeshStandardMaterial)) continue;
      let baseline = this.baselines.get(material);
      if (!baseline) {
        baseline = {
          envMap: material.envMap, environmentIntensity: material.envMapIntensity,
          roughness: material.roughness, metalness: material.metalness,
          clearcoat: material instanceof MeshPhysicalMaterial ? material.clearcoat : null,
          iridescence: material instanceof MeshPhysicalMaterial ? material.iridescence : null,
          sheen: material instanceof MeshPhysicalMaterial ? material.sheen : null,
          transmission: material instanceof MeshPhysicalMaterial ? material.transmission : null
        };
        this.baselines.set(material, baseline);
      }
      material.envMap = value.enabled ? baseline.envMap : null;
      material.envMapIntensity = value.enabled ? baseline.environmentIntensity * value.environmentIntensity : 0;
      material.roughness = value.enabled ? Math.min(1, baseline.roughness * value.roughnessScale) : 1;
      material.metalness = value.enabled ? Math.min(1, baseline.metalness * value.metalnessScale) : 0;
      if (material instanceof MeshPhysicalMaterial) {
        material.clearcoat = value.enabled ? Math.min(1, baseline.clearcoat! * value.clearcoatScale) : 0;
        material.iridescence = value.enabled ? baseline.iridescence! : 0;
        material.sheen = value.enabled ? baseline.sheen! : 0;
        material.transmission = value.enabled ? baseline.transmission! : 0;
      }
      material.needsUpdate = true;
    }
  }
}
