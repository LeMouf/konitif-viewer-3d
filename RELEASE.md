# Release @konitif/viewer-3d

`LeMouf/konitif-viewer-3d` is the sole release authority for
`@konitif/viewer-3d`. The amodal Viewer authority remains in
`LeMouf/konitif-viewer`; this repository owns only the 3D projection contracts
and their explicit-provider renderer.

## Protected release path

1. Keep `VIEWER_3D_NPM_PUBLISH_ENABLED` absent or different from `true` while
   the repository and npm Trusted Publisher are being configured.
2. Protect the `npm-release` environment with a required reviewer. Allow
   deployment tags matching `v*`; do not admit `main` as a deployment branch.
3. Configure the npm Trusted Publisher for repository
   `LeMouf/konitif-viewer-3d`, workflow `publish.yml` and environment
   `npm-release`.
4. Require the validation workflow on `main` and preserve tag ancestry checks.
5. Set `VIEWER_3D_NPM_PUBLISH_ENABLED=true` only after those controls are
   visible and verified.

The workflow checks out the exact tag in a separate directory, verifies that
the tag matches the package version and belongs to `main`, rebuilds, tests and
qualifies the exact archive, then publishes that retained archive through npm
OIDC. It does not install a newer Node or npm toolchain.

## Initial 0.284.1 bootstrap

Version `0.284.1` may use one explicit bootstrap exception if the Trusted
Publisher cannot publish the first package version.

Leave `VIEWER_3D_NPM_PUBLISH_ENABLED` absent while pushing
`v0.284.1`. Run `npm run verify:package`, retain the exact archive reported by
the verifier, and publish only that archive from an already authenticated local
machine.

That bootstrap has no CI provenance and must not be repeated. The next version
must exercise the protected OIDC path; `0.284.1` must never be republished.

## Manual dispatch

Manual dispatch is a retry mechanism for an existing protected tag, not a way
to publish a branch. Dispatch from the exact tag ref and provide the same tag as
input. Dispatching from `main` is intentionally refused.

The repository publishes neither the generic Viewer authority nor Workbench,
product adapters, robot profiles or physics backends.
