/** Estimated diagnostic footprint around the first resolved joint, not measured support. */
export interface ViewerBalanceFootprintDefinition {
  readonly jointNames: readonly string[];
  readonly halfWidthMeters: number;
  readonly halfDepthMeters: number;
}
