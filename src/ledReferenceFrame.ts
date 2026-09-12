/** Authored model-local frame for ring placement; axes must be finite unit vectors. */
export interface ViewerLedReferenceFrame {
  readonly anchorNames: readonly string[];
  readonly centerNames: readonly string[];
  readonly fallbackCenter: Readonly<{ x: number; y: number; z: number }>;
  readonly vertical: Readonly<{ x: number; y: number; z: number }>;
  readonly forward: Readonly<{ x: number; y: number; z: number }>;
  readonly lateral: Readonly<{ x: number; y: number; z: number }>;
}
