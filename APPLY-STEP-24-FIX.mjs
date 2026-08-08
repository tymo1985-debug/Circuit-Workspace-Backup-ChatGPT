// Circuit Workspace — Step 24 version-source repair.
// Run from repository root: node APPLY-STEP-24-FIX.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const appPath = 'circuit-planner/app.js';
const pwaPath = 'circuit-planner/js/pwa.js';
const registryPath = 'shared/version.js';

function replaceExactly(text, from, to, label) {
  const count = text.split(from).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one "${from}", found ${count}`);
  return text.replace(from, to);
}

let app = await readFile(appPath, 'utf8');
if (app.includes("version: '9.61.2'")) {
  console.log('app.js already has 9.61.2');
} else {
  app = replaceExactly(app, "version: '9.61.1'", "version: '9.61.2'", appPath);
  await writeFile(appPath, app, 'utf8');
}

let pwa = await readFile(pwaPath, 'utf8');
pwa = pwa.replace(/\n\s*\/\/ Шаг 24: версия поднимается до публикации App\.init\(\), поэтому badge,\n\s*\/\/ document\.title и meta получают один и тот же номер\.\n\s*app\.config\.version = '9\.61\.2';/, '');
pwa = pwa.replace(/\n\s*app\.config\.version = '9\.61\.2';/, '');
await writeFile(pwaPath, pwa, 'utf8');

let registry = await readFile(registryPath, 'utf8');
registry = registry.replace(/self\.CW_VERSION = '[^']+';/, "self.CW_VERSION = '0.12.7';");
registry = registry.replace(
  /('circuit-planner':\s*\{\s*title:\s*'[^']+',\s*version:\s*)'[^']+'/,
  "$1'9.61.2'"
);
await writeFile(registryPath, registry, 'utf8');

for (const file of [appPath, pwaPath, registryPath]) {
  const check = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (check.status !== 0) process.exit(check.status || 1);
}
const versions = spawnSync(process.execPath, ['scripts/check-versions.mjs'], { stdio: 'inherit' });
process.exit(versions.status || 0);
