# @konitif/viewer-3d

Three.js-based spatial projection contracts and an explicit-provider renderer
for KONITIF Viewer implementations.

## Installation

```sh
npm install @konitif/viewer-3d
```

## What it provides

- Three-dimensional vectors, transforms, scene snapshots and intents.
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

## Public entry points

| Entry | Purpose |
| --- | --- |
| `@konitif/viewer-3d` | Spatial contracts, definitions and scene helpers. |
| `@konitif/viewer-3d/renderer` | Three.js projection runtime and diagnostics. |

## Reference

See [`reference/`](reference/) for the machine-readable capability catalog and
authority diagrams. Legacy 3D composition-source names are compatibility
aliases; the amodal source remains owned by `@konitif/viewer`.

## License

Source-available under [PolyForm Noncommercial 1.0.0](LICENSE.md), not OSI open
source. Commercial use requires separate written authorization.
