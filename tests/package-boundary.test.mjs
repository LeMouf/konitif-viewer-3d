import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const json = path => JSON.parse(readFileSync(join(root, path), 'utf8'));

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : path.endsWith('.ts') ? [path] : [];
  });
}

test('the package and lock bind the qualified 3D projection closure', () => {
  const manifest = json('package.json');
  const lock = json('package-lock.json');

  assert.equal(manifest.name, '@konitif/viewer-3d');
  assert.equal(manifest.version, '0.284.1');
  assert.equal(manifest.private, false);
  assert.equal(manifest.repository.url, 'git+https://github.com/LeMouf/konitif-viewer-3d.git');
  assert.deepEqual(manifest.publishConfig, {
    access: 'public',
    registry: 'https://registry.npmjs.org/'
  });
  assert.deepEqual(manifest.dependencies, {
    '@konitif/physics': '0.284.1',
    '@konitif/temporal': '0.284.1',
    '@konitif/tools': '0.284.3',
    '@konitif/viewer': '0.284.1',
    '@types/three': '0.183.1',
    three: '^0.183.2'
  });
  assert.deepEqual(manifest.devDependencies, { typescript: '5.9.3' });
  assert.deepEqual(manifest.files, ['LICENSE.md', 'dist', 'README.md', 'package.json']);
  assert.equal(lock.name, manifest.name);
  assert.equal(lock.version, manifest.version);
  assert.deepEqual(lock.packages[''].dependencies, manifest.dependencies);
  assert.deepEqual(lock.packages[''].devDependencies, manifest.devDependencies);
  assert.deepEqual(Object.keys(lock.packages).sort(), [
    '',
    'node_modules/@dimforge/rapier3d-compat',
    'node_modules/@konitif/composition',
    'node_modules/@konitif/core',
    'node_modules/@konitif/physics',
    'node_modules/@konitif/temporal',
    'node_modules/@konitif/tools',
    'node_modules/@konitif/viewer',
    'node_modules/@tweenjs/tween.js',
    'node_modules/@types/stats.js',
    'node_modules/@types/three',
    'node_modules/@types/webxr',
    'node_modules/@webgpu/types',
    'node_modules/fflate',
    'node_modules/meshoptimizer',
    'node_modules/three',
    'node_modules/typescript'
  ]);
});

test('Viewer remains amodal while this package owns only the 3D projection', () => {
  const files = sourceFiles(join(root, 'src')).sort();
  assert.equal(files.length, 43);

  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    const name = relative(root, file);
    assert.doesNotMatch(source, /@konitif\/(?:workbench|workbench-ui|ui|product|nodal)(?:\/|['"])/, name);
    for (const match of source.matchAll(/(?:from|import\s*\()\s*['"]([^'"]+)['"]/g)) {
      assert.match(
        match[1],
        /^(?:\.\.?\/|three(?:\/|$)|@konitif\/(?:physics|temporal|tools(?:\/input)?|viewer)$)/,
        `${name}: ${match[1]}`
      );
    }
  }

  const index = readFileSync(join(root, 'src/index.ts'), 'utf8');
  assert.match(index, /from '@konitif\/viewer'/);
  assert.match(index, /createViewer3DWorkflowCompositionSource = createViewerWorkflowCompositionSource/);
});

test('validation CI has no publication authority', () => {
  const workflow = readFileSync(join(root, '.github/workflows/ci.yml'), 'utf8');
  assert.match(workflow, /permissions:\n {2}contents: read/);
  assert.doesNotMatch(workflow, /id-token: write|npm publish/);
});
