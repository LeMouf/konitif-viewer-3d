import type {
  InteractionInputBinding,
  InteractionInputModifier,
  InteractionInputSignal
} from '@konitif/tools/input';

export const VIEWER_PROJECTILE_CHARGE_ACTION_ID = 'viewer.projectile.charge';
export const VIEWER_PROJECTILE_LAUNCH_ACTION_ID = 'viewer.projectile.launch';

/**
 * Product-level associations. Viewer3D consumes the action id, never a specific key.
 * A caller may replace this catalog or apply session/workspace overrides.
 */
export const DEFAULT_VIEWER_INPUT_BINDINGS: readonly InteractionInputBinding[] = [
  {
    id: 'viewer.projectile.launch.keyboard.primary',
    actionId: VIEWER_PROJECTILE_CHARGE_ACTION_ID,
    source: 'keyboard',
    controlId: 'Space',
    phase: 'press',
    allowRepeat: true,
    enabled: true
  },
  {
    id: 'viewer.projectile.launch.keyboard.primary.release',
    actionId: VIEWER_PROJECTILE_LAUNCH_ACTION_ID,
    source: 'keyboard',
    controlId: 'Space',
    phase: 'release',
    enabled: true
  }
];

/** Observed key fields only; event lifecycle and default prevention remain with the host. */
export interface ViewerKeyboardInput {
  readonly code: string;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly shiftKey: boolean;
  readonly metaKey: boolean;
  readonly repeat: boolean;
}

export function createInteractionKeyboardSignal(
  event: ViewerKeyboardInput,
  phase: InteractionInputSignal['phase']
): InteractionInputSignal {
  const modifiers: InteractionInputModifier[] = [];
  if (event.ctrlKey) modifiers.push('control');
  if (event.altKey) modifiers.push('alt');
  if (event.shiftKey) modifiers.push('shift');
  if (event.metaKey) modifiers.push('meta');
  return {
    source: 'keyboard',
    controlId: event.code,
    phase,
    modifiers,
    repeat: event.repeat
  };
}
