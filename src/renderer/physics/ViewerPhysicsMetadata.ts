import type { ViewerJointResolutionEntry } from './ViewerJointResolution.js';
import type { ViewerJointValueCoefficients } from './ViewerPhysicsJointMapping.js';

/** Viewer input requirements, not the full authored calibration or a validated mode. */
export interface ViewerPhysicsJointBinding extends ViewerJointResolutionEntry, ViewerJointValueCoefficients {
  readonly sourceJointName?: string;
}

/** Only the legacy alignment fields read by the viewer, not simulation policy. */
export interface ViewerPhysicsAlignment {
  coordinateFrame?: string;
  sceneYawRadians?: number;
  jointMappings?: ViewerPhysicsJointBinding[];
  visualRootBodyName?: string;
  bodyVisualObjectNames?: Record<string, string[]>;
}

// Viewer-side legacy interpretation; intentionally distinct from MuJoCo rules.
// Pure data functions: no renderer, host effects or session state.
export function resolvePhysicsSourceString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function resolvePhysicsSourceStringListMap(value: unknown): Map<string, readonly string[]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return new Map();
  }

  const entries = Object.entries(value)
    .map(
      ([key, candidates]) =>
        [
          key,
          Array.isArray(candidates)
            ? candidates.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
            : []
        ] as const
    )
    .filter((entry): entry is readonly [string, string[]] => entry[0].length > 0 && entry[1].length > 0);

  return new Map(entries);
}

export function resolvePhysicsSourceStringSet(value: unknown): Set<string> {
  if (!Array.isArray(value)) {
    return new Set();
  }

  return new Set(value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0));
}

export function resolvePhysicsJointMappings(value: unknown): Map<string, ViewerPhysicsJointBinding> {
  if (!Array.isArray(value)) {
    return new Map();
  }

  const entries = value
    .filter((entry): entry is ViewerPhysicsJointBinding => {
      return (
        !!entry &&
        typeof entry === 'object' &&
        !Array.isArray(entry) &&
        typeof (entry as ViewerPhysicsJointBinding).mode === 'string'
      );
    })
    .map(
      (mapping) =>
        [
          mapping.visualJointName ?? mapping.physicsJointName ?? mapping.sourceJointName ?? '',
          mapping
        ] as const
    )
    .filter((entry): entry is readonly [string, ViewerPhysicsJointBinding] => entry[0].length > 0);

  return new Map(entries);
}

export function resolvePhysicsVisualAlignmentProfile(value: unknown): ViewerPhysicsAlignment | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as ViewerPhysicsAlignment)
    : null;
}
