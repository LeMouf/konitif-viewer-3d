/** Visual diagnostic anchors; resolution does not confirm sensor activity. */
export interface ViewerDiagnosticContactDefinition {
  readonly id: string;
  readonly names: readonly string[];
  readonly side: 'left' | 'right' | 'fallback';
}
