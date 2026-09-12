# @konitif/viewer-3d

Product-neutral 3D contracts and explicit-provider renderer for a reusable
spatial projection. Scene state enters through a `Viewer3DPort`; selection,
focus, camera and reset operations leave as intents.

The amodal `ViewerSnapshot`, `ViewerIntent`, `ViewerPort` and Workflow source
belong to `@konitif/viewer`. This package extends those contracts with vectors,
transforms and camera intents. Historical `Viewer3DWorkflowCompositionSource`
names remain compatibility aliases.

The root entry contains the 3D scene and support contracts. The optional
`@konitif/viewer-3d/renderer` entry contains the Three.js projection runtime.
It requires explicit physics and experiment providers and does not construct a
Workbench recorder or a product campaign.

Robot model names, Behavior projection states, authored calibrations, product
campaigns and product UI belong in specialization or host packages. The
historical `@konitif/ui/robot-viewer/renderer` entry remains a compatibility
facade; it is not the renderer authority.

LED groups use model-local placement definitions and a product-provided
calibration. The renderer supports circular and straight-strip layouts while
remaining unaware of robot-specific frame names and default offsets.

The standalone candidate consumes published Tools 0.284.3, Temporal 0.284.1,
Physics 0.284.1 and Viewer 0.284.1. Composition 0.284.2 remains owned
transitively by the amodal Viewer package. The distributable manifest and lock
retain those public versions; no workspace alias is part of the release
contract.

`npm run verify:package` creates an isolated consumer for both public exports
and checks their ESM runtime and strict NodeNext declarations. A successful
local qualification proves the archive boundary, not its presence on npm.
