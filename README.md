# @konitif/viewer-3d

Three.js-based spatial projection contracts and an explicit-provider renderer
for KONITIF Viewer implementations.

## Installation

```sh
npm install @konitif/viewer-3d
```

## What it provides

- Three-dimensional vectors, transforms, scene snapshots and intents.
- Camera-derived orientation compass math with no DOM or renderer dependency.
- A Workbench tool declaration for a spatial projection.
- Data-only definitions for articulated transforms, supports, contacts, mass
  properties, landmarks and emitter placement.
- An optional renderer entry with explicit simulation and observation
  providers.

## Authority boundary

The amodal Viewer contract belongs to `@konitif/viewer`. This package owns only
the state and lifecycle of its 3D projection. Subject identity, asset loading,
authored calibration, simulation policy, observation protocols and shell state
remain responsibilities of explicit providers.

## Quick start

```ts
import { createViewer3DSceneSnapshot } from '@konitif/viewer-3d';

const scene = createViewer3DSceneSnapshot({
  sourceId: 'subject:example',
  transforms: [{
    id: 'origin',
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0, w: 1 },
  }],
});
```

Import `@konitif/viewer-3d/renderer` only when a Three.js renderer and its
explicit providers are required.

The renderer's `setIncarnationMaterialProjection(target, projection)` tunes
standard/physical materials independently for `simulated` or `observed` visual
incarnations. Scales are applied from the captured material baseline, so repeated
updates do not accumulate. The observed clone never changes the source mesh.
Color/opacity remain owned by comparison appearance. These are visual settings,
not robot commands, measured material properties or evidence of emitted light.

## Public entry points

| Entry | Purpose |
| --- | --- |
| `@konitif/viewer-3d` | Spatial contracts, definitions and scene helpers. |
| `@konitif/viewer-3d/renderer` | Three.js projection runtime and diagnostics. |
| `@konitif/viewer-3d/visual-ground` | Ground contracts, defaults and normalization without Three.js. |
| `@konitif/viewer-3d/orientation` | Pure camera quaternion-to-CSS orientation projection. |
| `@konitif/viewer-3d/led-calibration` | Numeric LED group calibration with explicit subject defaults, without Three.js. |
| `@konitif/viewer-3d/projectile` | Headless launch, trajectory, ground-step and visual capacity helpers. |

The orientation entry observes the camera quaternion and derives its inverse
view rotation. It never accumulates an independent orientation or owns a camera.
It can be used without importing Three.js or a browser component:

```ts
import { resolveViewerOrientationGizmoTransform } from '@konitif/viewer-3d/orientation';

const transform = resolveViewerOrientationGizmoTransform({ x: 0, y: 0, z: 0, w: 1 });
```

## Observed pose playback

The observed robot's interpolated presentation uses a bounded buffer with a
450 ms visual delay. It interpolates only between admitted poses;
it never changes telemetry, predicts a future motion or drives the robot.
On buffer underrun it holds the last known pose rather than inventing motion.
Hosts may explicitly declare `sourceClock: 'monotonic'` when admitting a pose.
The buffer then preserves source intervals through receipt bursts, mapping
elapsed source time to the first receipt without comparing clock epochs.
Without that guarantee it uses receipt intervals. Session changes, invalid
samples and timeline gaps over 500 ms reset its history.
The raw presentation mode remains immediate. This delay does not apply to LED
observations or other sensor readings.

Hosts may author independent `supportDefinition.soleStabilizationChains` and
set `setObservedRobotSoleStabilizationStrength(0..1)` (default: disabled).
This is an inferred geometric presentation constraint, not measured contact
or simulated friction. It corrects only rendered articulated joints, within
authored limits and 0.04 radians of each admitted pose. A lifted sole or more
than 12 mm horizontal drift releases its anchor; session changes, disabling,
raw playback and timeline gaps discard anchors. Source observations and
hardware commands are never modified.
Eligible soles are constrained to a common lowest visible surface before root
grounding. Cached convex vertices give exact directional support of rigid
foot meshes, rather than the empty corners of a rotated bounding box.
Lifted or released feet are not pulled back into the contact plane.

Buffered poses use shape-preserving Hermite interpolation between already
admitted neighbors, with continuous velocity at interior sample boundaries.
The curve stays inside each segment's angular endpoints and stops at missing
data; its provenance includes the neighboring observations used for tangents.
This does not add visual delay or extrapolate a future pose.

## Reference

See [`reference/`](reference/) for the machine-readable capability catalog and
authority diagrams. Legacy 3D composition-source names are compatibility
aliases; the amodal source remains owned by `@konitif/viewer`.

## License

Source-available under [PolyForm Noncommercial 1.0.0](LICENSE.md), not OSI open
source. Commercial use requires separate written authorization.
