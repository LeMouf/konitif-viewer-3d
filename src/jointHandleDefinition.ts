/** Visual interaction configuration, not authorization to command a device. */
export interface ViewerJointHandleDefinition {
  readonly id: string;
  readonly label: string;
  readonly anchorNames?: readonly string[];
  readonly anchorOffset?: Readonly<{ x: number; y: number; z: number }>;
  readonly anchorLocalTargetNames?: readonly string[];
  readonly anchorLocalTargetRatio?: number;
  readonly joints: readonly {
    readonly id: string;
    readonly dragDirection: 'horizontal' | 'vertical';
    readonly dragScale?: number;
    readonly valueRange?: Readonly<{ min: number; max: number }>;
  }[];
}
