/** Local compatibility coefficients, not an invertibility or unit guarantee. */
export interface ViewerJointValueCoefficients {
  readonly scale?: number;
  readonly sign?: number;
  readonly offset?: number;
}

// Scalar adaptation only: selection, limits and coordinate frames belong to callers.
export function createPhysicsJointTargetValue(mapping: ViewerJointValueCoefficients, value: number): number {
  const scale = resolvePhysicsJointMappingScale(mapping);
  const offset = typeof mapping.offset === 'number' && Number.isFinite(mapping.offset) ? mapping.offset : 0;

  return value * scale + offset;
}

export function createVisualJointValueFromPhysics(mapping: ViewerJointValueCoefficients, value: number): number {
  const scale = resolvePhysicsJointMappingScale(mapping);
  const offset = typeof mapping.offset === 'number' && Number.isFinite(mapping.offset) ? mapping.offset : 0;

  return scale === 0 ? value : (value - offset) / scale;
}

export function createVisualJointValueFromSource(mapping: ViewerJointValueCoefficients, value: number): number {
  return createPhysicsJointTargetValue(mapping, value);
}

export function resolvePhysicsJointMappingScale(mapping: ViewerJointValueCoefficients): number {
  const scale = typeof mapping.scale === 'number' && Number.isFinite(mapping.scale) ? mapping.scale : 1;
  const sign = typeof mapping.sign === 'number' && Number.isFinite(mapping.sign) ? mapping.sign : 1;

  return scale * sign;
}
