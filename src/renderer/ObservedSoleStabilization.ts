type Point = readonly [number, number, number];
type Rotation = readonly [number, number, number, number];

/** Geometric presentation anchors, not physical-contact observations. */
export class ObservedSoleAnchors {
  private connectionId: string | null = null;
  private anchors = new Map<string, Point>();
  private released = new Set<string>();
  reset(): void { this.connectionId = null; this.anchors.clear(); this.released.clear(); }

  resolve(connectionId: string, groups: readonly { id: string; position: Point; eligible: boolean }[], strength: number):
    { id: string; target: Point; inferred: true }[] {
    if (this.connectionId !== connectionId || !Number.isFinite(strength) || strength <= 0) this.reset();
    this.connectionId = connectionId;
    if (!Number.isFinite(strength) || strength <= 0) return [];
    const present = new Set(groups.map(group => group.id));
    for (const id of this.anchors.keys()) if (!present.has(id)) this.anchors.delete(id);
    for (const id of this.released) if (!present.has(id)) this.released.delete(id);
    const targets: { id: string; target: Point; inferred: true }[] = [];
    for (const group of groups) {
      if (!group.eligible || !group.position.every(Number.isFinite)) {
        this.anchors.delete(group.id); this.released.delete(group.id); continue;
      }
      if (this.released.has(group.id)) continue;
      const anchor = this.anchors.get(group.id) ?? [...group.position] as unknown as Point;
      const slip = Math.hypot(anchor[0]-group.position[0], anchor[2]-group.position[2]);
      // Do not turn intentional horizontal motion into a permanently pinned leg.
      if (slip > .012) { this.anchors.delete(group.id); this.released.add(group.id); continue; }
      this.anchors.set(group.id,anchor);
      const amount = Math.min(1,strength);
      targets.push({ id: group.id, inferred: true, target: [
        group.position[0] + (anchor[0]-group.position[0])*amount,
        group.position[1], // height stays owned by grounding / observed articulation
        group.position[2] + (anchor[2]-group.position[2])*amount
      ] });
    }
    return targets;
  }
}

export interface SolePose { position: Point; orientation: Rotation; supportMinimumY?: number }

/** Numerical IK of a rendered copy. The caller must never supply a hardware actuator. */
export function projectBoundedSoleCorrection(input: {
  values: readonly number[];
  limits: readonly (readonly [number, number])[];
  targetPosition: Point;
  targetOrientation: Rotation;
  /** Optional lowest rendered sole point, in the same world frame as position. */
  targetSupportMinimumY?: number;
  evaluate(values: readonly number[]): SolePose;
}): { values: number[]; residualMeters: number; iterations: number; inferred: true; physicsAffected: false } {
  const initial = [...input.values];
  if (!initial.length || initial.length !== input.limits.length || !initial.every(Number.isFinite) ||
      !input.targetPosition.every(Number.isFinite) || !input.targetOrientation.every(Number.isFinite)) {
    throw new TypeError('Invalid sole presentation constraint');
  }
  const limits = input.limits.map(([low,high], index) => {
    if (!Number.isFinite(low) || !Number.isFinite(high) || low > high) throw new TypeError('Invalid joint limits');
    return [Math.max(low,initial[index]!-.04),Math.min(high,initial[index]!+.04)] as const;
  });
  if (limits.some(([low,high], index) => low > high || initial[index]! < low || initial[index]! > high)) {
    throw new TypeError('Observed pose outside admitted joint limits');
  }
  const residual = (values: readonly number[]) => {
    const pose = input.evaluate(values);
    if (!pose.position.every(Number.isFinite) || !pose.orientation.every(Number.isFinite)) throw new TypeError('Invalid evaluated pose');
    const [x,y,z,w] = pose.orientation;
    const [tx,ty,tz,tw] = input.targetOrientation;
    // target^-1 * actual; angular error weighted by a 10 cm lever arm.
    const q = [tw*x-tx*w-ty*z+tz*y, tw*y+tx*z-ty*w-tz*x,
      tw*z-tx*y+ty*x-tz*w, tw*w+tx*x+ty*y+tz*z];
    const sign = q[3]! < 0 ? -1 : 1;
    const supportResidual: number[] = [];
    if (input.targetSupportMinimumY !== undefined) {
      if (!Number.isFinite(input.targetSupportMinimumY) || !Number.isFinite(pose.supportMinimumY)) throw new TypeError('Invalid sole surface');
      // A centroid constraint alone cannot guarantee contact of the visible sole.
      supportResidual.push((pose.supportMinimumY! - input.targetSupportMinimumY) * 10);
    }
    return [...pose.position.map((value,index) => value-input.targetPosition[index]!),
      ...q.slice(0,3).map(value => value*sign*.2), ...supportResidual];
  };
  const cost = (values: readonly number[]) => values.reduce((sum,value) => sum+value*value,0);
  let values = initial;
  let error = residual(values);
  let iterations = 0;
  for (; iterations < 6 && cost(error) > 1e-10; iterations++) {
    const columns = values.map((value,index) => {
      const step = value+1e-4 <= limits[index]![1] ? 1e-4 : -1e-4;
      const probe = [...values]; probe[index] = Math.max(limits[index]![0],Math.min(limits[index]![1],value+step));
      const actualStep = probe[index]!-value;
      if (Math.abs(actualStep) < 1e-10) return error.map(() => 0);
      const nextError = residual(probe);
      return error.map((entry,row) => (nextError[row]!-entry)/actualStep);
    });
    const matrix = columns.map((left,i) => columns.map((right,j) =>
      left.reduce((sum,value,row) => sum+value*right[row]!,0)+(i === j ? 1e-6 : 0)));
    const gradient = columns.map(column => -column.reduce((sum,value,row) => sum+value*error[row]!,0));
    const delta = solve(matrix,gradient);
    let improved = false;
    for (const scale of [1,.5,.25]) {
      const next = values.map((value,index) => Math.max(limits[index]![0],Math.min(limits[index]![1],value+delta[index]!*scale)));
      const nextError = residual(next);
      if (cost(nextError) < cost(error)) { values = next; error = nextError; improved = true; break; }
    }
    if (!improved) break;
  }
  return { values, residualMeters: Math.hypot(...error.slice(0,3)), iterations, inferred: true, physicsAffected: false };
}

function solve(matrix: number[][], vector: number[]): number[] {
  const rows = matrix.map((row,index) => [...row,vector[index]!]);
  for (let column = 0; column < rows.length; column++) {
    let pivot = column;
    for (let row = column+1; row < rows.length; row++) if (Math.abs(rows[row]![column]!) > Math.abs(rows[pivot]![column]!)) pivot = row;
    [rows[column],rows[pivot]] = [rows[pivot]!,rows[column]!];
    const divisor = rows[column]![column]!;
    if (!Number.isFinite(divisor) || Math.abs(divisor) < 1e-12) return vector.map(() => 0);
    for (let entry = column; entry <= rows.length; entry++) rows[column]![entry]! /= divisor;
    for (let row = 0; row < rows.length; row++) {
      if (row === column) continue;
      const factor = rows[row]![column]!;
      for (let entry = column; entry <= rows.length; entry++) rows[row]![entry]! -= factor*rows[column]![entry]!;
    }
  }
  return rows.map(row => row[rows.length]!);
}
