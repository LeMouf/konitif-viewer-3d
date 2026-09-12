import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = realpathSync(fileURLToPath(new URL('..', import.meta.url)));
const evidence = mkdtempSync(join(tmpdir(), 'konitif-viewer-3d-package-'));
const cache = join(evidence, 'npm-cache');
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));

assert.equal(manifest.name, '@konitif/viewer-3d');
assert.equal(manifest.private, false);
assert.deepEqual(manifest.dependencies, {
  '@konitif/physics': '0.284.1',
  '@konitif/temporal': '0.284.1',
  '@konitif/tools': '0.284.3',
  '@konitif/viewer': '0.284.1',
  '@types/three': '0.183.1',
  three: '^0.183.2'
});
assert.deepEqual(manifest.exports, {
  '.': { types: './dist/index.d.ts', import: './dist/index.js' },
  './renderer': {
    types: './dist/renderer/index.d.ts',
    import: './dist/renderer/index.js'
  }
});

const run = (command, args, cwd = root) => execFileSync(command, args, {
  cwd,
  encoding: 'utf8',
  maxBuffer: 16 * 1024 * 1024,
  env: { ...process.env, npm_config_offline: 'true', npm_config_cache: cache }
});

function pack(source, destination) {
  mkdirSync(destination, { recursive: true });
  const args = ['pack', '--offline', '--ignore-scripts', '--json', '--pack-destination', destination];
  const npmCli = process.platform === 'win32'
    ? join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js')
    : join(dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js');
  assert.ok(existsSync(npmCli), `Installed npm CLI required at ${npmCli}`);
  return JSON.parse(run(process.execPath, [npmCli, ...args], source))[0];
}

function extract(packed, directory, packageName) {
  const archive = join(directory, packed.filename);
  const target = join(evidence, 'consumer/node_modules', packageName);
  mkdirSync(target, { recursive: true });
  run('tar', ['-xzf', archive, '-C', target, '--strip-components=1']);
  return { archive, target };
}

const viewer3DDirectory = join(evidence, 'viewer-3d');
const packedViewer3D = pack(root, viewer3DDirectory);
const files = packedViewer3D.files.map(file => file.path).sort();
for (const file of files) {
  assert.match(file, /^(dist\/|package\.json$|README\.md$|LICENSE\.md$)/);
}
for (const file of [
  'dist/index.js',
  'dist/index.d.ts',
  'dist/renderer/index.js',
  'dist/renderer/index.d.ts',
  'dist/renderer/Viewer3DRenderer.js',
  'dist/renderer/Viewer3DRenderer.d.ts',
  'README.md',
  'LICENSE.md',
  'package.json'
]) assert.ok(files.includes(file), file);
assert.equal(files.length, 175);
const viewer3D = extract(packedViewer3D, viewer3DDirectory, manifest.name);

const runtimeClosure = [
  '@dimforge/rapier3d-compat',
  '@konitif/composition',
  '@konitif/core',
  '@konitif/physics',
  '@konitif/temporal',
  '@konitif/tools',
  '@konitif/viewer',
  '@tweenjs/tween.js',
  '@types/stats.js',
  '@types/three',
  '@types/webxr',
  '@webgpu/types',
  'fflate',
  'meshoptimizer',
  'three'
];
const dependencies = [];
for (const packageName of runtimeClosure) {
  const source = realpathSync(join(root, 'node_modules', packageName));
  const dependencyManifest = JSON.parse(readFileSync(join(source, 'package.json'), 'utf8'));
  const locked = lock.packages[`node_modules/${packageName}`];
  assert.equal(dependencyManifest.name, packageName);
  assert.equal(dependencyManifest.version, locked.version);
  const target = join(evidence, 'consumer/node_modules', packageName);
  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target, { recursive: true, dereference: true });
  dependencies.push(`${packageName}@${dependencyManifest.version}`);
}

copyFileSync(join(root, 'tests/consumer.mts'), join(evidence, 'consumer/consumer.mts'));
copyFileSync(join(root, 'tests/consumer.mjs'), join(evidence, 'consumer/consumer.mjs'));
run(process.execPath, [
  join(root, 'node_modules/typescript/bin/tsc'),
  '--noEmit',
  '--strict',
  '--skipLibCheck', 'false',
  '--target', 'ES2022',
  '--module', 'NodeNext',
  '--moduleResolution', 'NodeNext',
  '--lib', 'ES2022,DOM,DOM.Iterable',
  'consumer.mts'
], join(evidence, 'consumer'));
run(process.execPath, ['consumer.mjs'], join(evidence, 'consumer'));

const bytes = readFileSync(viewer3D.archive);
assert.equal(
  packedViewer3D.integrity,
  `sha512-${createHash('sha512').update(bytes).digest('base64')}`
);

const result = {
  status: 'passed',
  name: manifest.name,
  version: manifest.version,
  dependencies,
  integrity: packedViewer3D.integrity,
  shasum: createHash('sha1').update(bytes).digest('hex'),
  sha256: createHash('sha256').update(bytes).digest('hex'),
  bytes: bytes.length,
  files: files.length,
  archive: viewer3D.archive,
  consumer: 'isolated ESM runtime and strict NodeNext declarations for root and renderer exports',
  evidence
};
writeFileSync(join(evidence, 'result.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
