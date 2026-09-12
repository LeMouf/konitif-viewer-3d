export interface PoseHandleSelectionState {
  hoveredPoseHandleId: string | null;
  hoveredPoseHandleAxisId: string | null;
  hoveredPoseHandleAxisIds: string[];
  selectedPoseHandleId: string | null;
  selectedPoseHandleAxisId: string | null;
  selectedPoseHandleAxisIds: string[];
}

export class SelectionController {
  hoveredPoseHandleId: string | null = null;
  hoveredPoseHandleAxisId: string | null = null;
  hoveredPoseHandleAxisIds: string[] = [];
  externalHoveredJointTargets: string[] = [];
  selectedPoseHandleId: string | null = null;
  selectedPoseHandleAxisId: string | null = null;
  selectedPoseHandleAxisIds: string[] = [];

  hasFocus(): boolean {
    return Boolean(
      this.hoveredPoseHandleId ||
        this.hoveredPoseHandleAxisId ||
        this.hoveredPoseHandleAxisIds.length > 0 ||
        this.selectedPoseHandleId ||
        this.selectedPoseHandleAxisId ||
        this.selectedPoseHandleAxisIds.length > 0
    );
  }

  setHover(handleId: string | null, axisIds: string[]): boolean {
    const nextAxisId = axisIds.length === 1 ? axisIds[0] ?? null : null;
    const nextAxisSignature = axisIds.join('|');
    const currentAxisSignature = this.hoveredPoseHandleAxisIds.join('|');

    if (this.hoveredPoseHandleId === handleId && currentAxisSignature === nextAxisSignature) {
      return false;
    }

    this.hoveredPoseHandleId = handleId;
    this.hoveredPoseHandleAxisId = nextAxisId;
    this.hoveredPoseHandleAxisIds = axisIds;
    return true;
  }

  select(handleId: string, axisIds: string[]): void {
    const selectedAxisId = axisIds.length === 1 ? axisIds[0] ?? null : null;

    this.selectedPoseHandleId = handleId;
    this.selectedPoseHandleAxisId = selectedAxisId;
    this.selectedPoseHandleAxisIds = axisIds;
    this.hoveredPoseHandleId = handleId;
    this.hoveredPoseHandleAxisId = selectedAxisId;
    this.hoveredPoseHandleAxisIds = axisIds;
  }

  clearHover(): boolean {
    if (!this.hoveredPoseHandleId && !this.hoveredPoseHandleAxisId && this.hoveredPoseHandleAxisIds.length === 0) {
      return false;
    }

    this.hoveredPoseHandleId = null;
    this.hoveredPoseHandleAxisId = null;
    this.hoveredPoseHandleAxisIds = [];
    return true;
  }

  clearFocus(): boolean {
    const hadFocus = this.hasFocus();

    this.hoveredPoseHandleId = null;
    this.hoveredPoseHandleAxisId = null;
    this.hoveredPoseHandleAxisIds = [];
    this.selectedPoseHandleId = null;
    this.selectedPoseHandleAxisId = null;
    this.selectedPoseHandleAxisIds = [];
    return hadFocus;
  }

  setExternalHoveredJointTargets(jointTargets: readonly string[]): boolean {
    const nextJointTargets = Array.from(
      new Set(jointTargets.filter((target): target is string => typeof target === 'string' && target.length > 0))
    );
    const currentSignature = this.externalHoveredJointTargets.join('|');
    const nextSignature = nextJointTargets.join('|');

    if (currentSignature === nextSignature) {
      return false;
    }

    this.externalHoveredJointTargets = nextJointTargets;
    return true;
  }
}
