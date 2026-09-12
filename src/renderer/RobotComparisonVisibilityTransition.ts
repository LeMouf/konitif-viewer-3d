export const ROBOT_COMPARISON_VISIBILITY_LAYOUT_SHARE = 0.62;

export interface RobotComparisonVisibilityTransitionPhases {
  layoutProgress: number;
  opacityProgress: number;
}

const clampProgress = (progress: number): number =>
  Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));

/**
 * On appearance the incarnations reach their final layout before REAL fades
 * in. On disappearance the order is reversed, so no visible ghost slides
 * through the simulated robot.
 */
export function resolveRobotComparisonVisibilityTransitionPhases(
  progress: number,
  appearing: boolean,
  layoutShare = ROBOT_COMPARISON_VISIBILITY_LAYOUT_SHARE
): RobotComparisonVisibilityTransitionPhases {
  const normalized = clampProgress(progress);
  const safeLayoutShare = Math.min(0.9, Math.max(0.1, layoutShare));
  const opacityShare = 1 - safeLayoutShare;

  if (appearing) {
    return {
      layoutProgress: clampProgress(normalized / safeLayoutShare),
      opacityProgress: clampProgress((normalized - safeLayoutShare) / opacityShare)
    };
  }

  return {
    opacityProgress: clampProgress(normalized / opacityShare),
    layoutProgress: clampProgress((normalized - opacityShare) / safeLayoutShare)
  };
}
