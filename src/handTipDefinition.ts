/** Model landmarks for an estimated hand-tip projection, not sensor observations. */
export interface ViewerHandTipDefinition {
  readonly sourceJoint: string;
  readonly id: string;
  readonly label: string;
  readonly fingerRootNames: readonly [string, string];
  readonly touchFrameNames: Readonly<{ left: string; right: string; back: string }>;
}
