/** Authored ring placement in a model-local frame, independent of physical LED state. */
export interface ViewerLedPlacementDefinition {
  readonly id: string;
  readonly anchorNames: readonly string[];
  readonly vertical: Readonly<{ x: number; y: number; z: number }>;
  readonly forward: Readonly<{ x: number; y: number; z: number }>;
  readonly normal: Readonly<{ x: number; y: number; z: number }>;
  /** Optional explicit third translation axis. Defaults to vertical × forward. */
  readonly lateral?: Readonly<{ x: number; y: number; z: number }>;
  /** Local X axis of the authored LED plane. Defaults to `vertical`. */
  readonly layoutDirection?: Readonly<{ x: number; y: number; z: number }>;
  readonly mirrorDirection: 1 | -1;
  readonly handTip?: Readonly<{ sourceJoint: string; ratio: number }>;
}
