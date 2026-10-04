import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../scripts/select-ci-runtime.sh', import.meta.url));
const shellPath = (value) => process.platform === 'win32' ? value.replaceAll('\\', '/') : value;
// The Windows system bash launches WSL; use the already installed Git shell
// to exercise this Linux-runner fixture against the same local files.
const bash = process.platform === 'win32'
  ? resolve(execFileSync('git', ['--exec-path'], { encoding: 'utf8' }).trim(), '../../../bin/bash.exe')
  : 'bash';

function run(npmVersion) {
  const directory = mkdtempSync(join(tmpdir(), 'konitif-viewer-cached-runtime-'));
  const bin = join(directory, 'node', process.versions.node, 'x64', 'bin');
  mkdirSync(bin, { recursive: true });
  if (process.platform === 'win32') {
    writeFileSync(join(bin, 'node'), `#!/bin/sh\nexec '${shellPath(process.execPath)}' "$@"\n`, { mode: 0o755 });
  } else {
    symlinkSync(process.execPath, join(bin, 'node'));
  }
  if (npmVersion) {
    writeFileSync(join(bin, 'npm'), `#!/bin/sh\nprintf '%s\\n' '${npmVersion}'\n`, { mode: 0o755 });
  }
  return spawnSync(bash, [shellPath(script)], {
    encoding: 'utf8',
    env: {
      ...process.env,
      RUNNER_TOOL_CACHE: shellPath(directory),
      GITHUB_PATH: shellPath(join(directory, 'github-path'))
    }
  });
}

test('selects a compatible cached runtime without requiring one patch release', () => {
  const result = run('11.6.0');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Using cached Node/);
});

test('fails closed for incompatible or missing cached npm without installing anything', () => {
  for (const version of ['10.9.4', '11.5.0', 'invalid', null]) {
    const result = run(version);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /no installation attempted/);
  }
});
