import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import process from 'node:process';

const files = {
  registry: 'shared/version.js',
  congress: 'congress-project/service-worker.js',
  congressHtml: 'congress-project/index.html',
  planner: 'circuit-planner/app.js',
  plannerPwa: 'circuit-planner/js/pwa.js',
  schoolApp: 'pioneer-school/js/app.js',
  schoolSw: 'pioneer-school/sw.js',
  appointments: 'appointments/sw.js',
};

const source = Object.fromEntries(
  await Promise.all(
    Object.entries(files).map(async ([key, file]) => [key, await readFile(file, 'utf8')]),
  ),
);

function capture(text, pattern, label) {
  const match = text.match(pattern);
  if (!match) throw new Error(`Не удалось прочитать версию: ${label}`);
  return match[1];
}

async function walkJavascript(dir) {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'vendor' || entry.name === 'fonts') continue;
      result.push(...await walkJavascript(full));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      result.push(full);
    }
  }
  return result;
}

const errors = [];
const semver = /^\d+\.\d+\.\d+$/;

// Read the module registry without silently accepting duplicate module IDs.
const registryEntries = [...source.registry.matchAll(/'([^']+)':\s*\{[^}]*version:\s*'([^']+)'/g)]
  .map((match) => [match[1], match[2]]);
const registry = {};
for (const [moduleId, version] of registryEntries) {
  if (Object.prototype.hasOwnProperty.call(registry, moduleId)) {
    errors.push(`shared/version.js: дублируется запись модуля ${moduleId}`);
  }
  registry[moduleId] = version;
  if (!semver.test(version)) {
    errors.push(`shared/version.js: ${moduleId} имеет некорректную версию ${version}`);
  }
}

// Klindariy: read the version specifically from App.config, not from the first
// unrelated "version:" token that might appear elsewhere in the monolith.
const plannerVersion = capture(
  source.planner,
  /const\s+App\s*=\s*\{[\s\S]*?config:\s*\{[\s\S]*?version:\s*'([^']+)'/,
  `${files.planner} → App.config.version`,
);

const actual = {
  'congress-project': capture(source.congress, /APP_VERSION\s*=\s*'([^']+)'/, files.congress),
  'circuit-planner': plannerVersion,
  'pioneer-school': capture(source.schoolApp, /APP_VERSION\s*=\s*'([^']+)'/, files.schoolApp),
  appointments: capture(source.appointments, /APP_VERSION\s*=\s*'([^']+)'/, files.appointments),
};

for (const [moduleId, version] of Object.entries(actual)) {
  if (!semver.test(version)) errors.push(`${moduleId}: некорректная версия ${version}`);
  if (registry[moduleId] !== version) {
    errors.push(`${moduleId}: код=${version}, shared/version.js=${registry[moduleId] || 'нет записи'}`);
  }
}

const schoolSwVersion = capture(source.schoolSw, /APP_VERSION\s*=\s*'([^']+)'/, files.schoolSw);
if (schoolSwVersion !== actual['pioneer-school']) {
  errors.push(`pioneer-school: app.js=${actual['pioneer-school']}, sw.js=${schoolSwVersion}`);
}

const shellVersion = capture(source.registry, /CW_VERSION\s*=\s*'([^']+)'/, files.registry);
if (!semver.test(shellVersion)) errors.push(`Хаб: некорректная версия ${shellVersion}`);

if (/<title>[^<]*\bv\d+\.\d+(?:\.\d+)?[^<]*<\/title>/i.test(source.congressHtml)) {
  errors.push('congress-project/index.html: версия не должна быть захардкожена в <title>');
}

// Release guard for Klindariy: app.js is the only allowed source/writer of the
// application version. This catches the exact class of regression that caused
// Step 24 to pass browser-side logic while failing the static release check.
const plannerJsFiles = await walkJavascript('circuit-planner');

// Step 34 guard: the old indirect-eval bootstrap must not return.
if (/\(\s*0\s*,\s*eval\s*\)\s*\(/.test(source.plannerPwa)) {
  errors.push(`${files.plannerPwa}: запрещён indirect eval в pre-init bootstrap`);
}

// Step 35 guard: pre-init modules are normal defer scripts. Synchronous XHR
// blocks the main thread and must not return as a hidden script loader.
if (/\bXMLHttpRequest\b/.test(source.plannerPwa) || /\.open\s*\(\s*['"]GET['"]\s*,[^)]*,\s*false\s*\)/s.test(source.plannerPwa)) {
  errors.push(`${files.plannerPwa}: запрещён синхронный XHR в pre-init bootstrap`);
}

const runtimeVersionWrite = /\b(?:App|app)\.config\.version\s*=(?!=)/g;
for (const file of plannerJsFiles) {
  if (file === files.planner) continue;
  const text = await readFile(file, 'utf8');
  if (runtimeVersionWrite.test(text)) {
    errors.push(`${relative('.', file)}: запрещена runtime-подмена App.config.version; меняйте версию только в circuit-planner/app.js`);
  }
  runtimeVersionWrite.lastIndex = 0;
}

// Do not allow one-off repair scripts to become part of the repository again.
const rootEntries = await readdir('.', { withFileTypes: true });
const repairFiles = rootEntries
  .filter((entry) => entry.isFile() && /^APPLY-STEP-.*-FIX\.mjs$/i.test(entry.name))
  .map((entry) => entry.name);
if (repairFiles.length) {
  errors.push(`корень репозитория: временные repair-файлы не должны коммититься (${repairFiles.join(', ')})`);
}

if (errors.length) {
  console.error(`Проверка версий не пройдена:\n- ${errors.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log(`Версии согласованы: хаб ${shellVersion}; ${Object.entries(actual)
    .map(([id, version]) => `${id} ${version}`)
    .join('; ')}`);
  console.log('Release guard: App.config.version имеет один штатный источник; runtime-подмен и repair-файлов нет.');
}
