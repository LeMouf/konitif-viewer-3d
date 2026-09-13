# @konitif/viewer-3d

Three.js-based spatial projection contracts and an explicit-provider renderer
for KONITIF Viewers.

## Installation

```sh
npm install @konitif/viewer-3d
```

## What it provides

- Three-dimensional vectors, transforms, scene snapshots and intents.
- A Workbench tool declaration for a spatial projection.
- Data-only definitions for joints, supports, contacts, balance, hands and LED
  placement.
- An optional renderer entry with explicit physics and experiment providers.

## Authority boundary

The amodal Viewer contract belongs to `@konitif/viewer`. This package owns only
the state and lifecycle of its 3D projection. Robot identity, model loading,
authored calibration, physics policy, product campaigns and Workbench shell
state remain host responsibilities.

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
