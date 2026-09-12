/** Fields read by selection, not the caller's complete calibration contract. */
export interface ViewerJointResolutionEntry {
  readonly mode: string;
  readonly visualJointName?: string;
  readonly physicsJointName?: string;
}

/** Only the implicit case is authored here; explicit entries keep their type and identity. */
export interface ViewerImplicitJointMapping {
  mode: 'direct';
  visualJointName: string;
  physicsJointName: string;
}

/** Local model correspondence rules; inputs remain owned by the caller. */
export function resolveViewerJointMapping<Mapping extends ViewerJointResolutionEntry>(
  jointName: string,
  mappings: ReadonlyMap<string, Mapping>,
  auxiliaryJointNames: ReadonlySet<string>
): Mapping | ViewerImplicitJointMapping | null {
  const explicitMapping = mappings.get(jointName);
  if (explicitMapping) return explicitMapping;
  if (mappings.size > 0 || auxiliaryJointNames.has(jointName)) return null;
  return { mode: 'direct', visualJointName: jointName, physicsJointName: jointName };
}

export function selectDirectViewerJointMappings<Joint, Mapping extends ViewerJointResolutionEntry>(
  joints: Readonly<Record<string, Joint>>,
  mappings: ReadonlyMap<string, Mapping>,
  auxiliaryJointNames: ReadonlySet<string>
): Array<{ joint: Joint; mapping: Mapping | ViewerImplicitJointMapping }> {
  if (mappings.size > 0) {
    return Array.from(mappings.values())
      .filter(mapping => mapping.mode === 'direct' && !!mapping.visualJointName && !!mapping.physicsJointName)
      .map(mapping => ({ joint: joints[mapping.visualJointName as string], mapping }))
      .filter(entry => !!entry.joint);
  }
  return Object.entries(joints)
    .filter(([jointName]) => !auxiliaryJointNames.has(jointName))
    .map(([jointName, joint]) => ({
      joint,
      mapping: { mode: 'direct', visualJointName: jointName, physicsJointName: jointName }
    }));
}
