/** Visual support anchors; their existence does not confirm physical contact. */
export interface ViewerSupportDefinition {
  readonly contacts: readonly {
    readonly id: string;
    readonly groupId: string;
    readonly names: readonly string[];
  }[];
  /** Each ordered list selects the first candidate with rendered geometry. */
  readonly geometryGroups: readonly (readonly string[])[];
  /** Independent articulated chains on the rendered copy; never actuator commands. */
  readonly soleStabilizationChains?: readonly {
    readonly groupId: string;
    readonly jointNames: readonly string[];
  }[];
}
