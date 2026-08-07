import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { extname, dirname, resolve, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const root = process.cwd();
const required = [
  'index.html',
  'manifest.json',
  'service-worker.js',
  'shared/version.js',
  'shared/i18n.js',
  'shared/backup.js',
  'congress-project/index.html',
  'circuit-planner/index.html',
  'pioneer-school/index.html',
  'appointments/index.html',
];

const errors = [];

async function walk(directory) {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === '.git') continue;
    const absolute = resolve(directory, entry.name);
    if (entry.isDirectory()) found.push(...await walk(absolute));
    else found.push(absolute);
  }
  return found;
}

for (const file of required) {
  if (!existsSync(resolve(root, file))) errors.push(`Отсутствует обязательный файл: ${file}`);
}

const files = await walk(root);

for (const absolute of files) {
  const file = relative(root, absolute);
  const extension = extname(file).toLowerCase();

  if (extension === '.json' || extension === '.webmanifest') {
    try {
      JSON.parse(await readFile(absolute, 'utf8'));
    } catch (error) {
      errors.push(`${file}: некорректный JSON (${error.message})`);
    }
  }

  if ((extension === '.js' || extension === '.mjs') && !file.includes('/vendor/')) {
    const check = spawnSync(process.execPath, ['--check', absolute], { encoding: 'utf8' });
    if (check.status !== 0) errors.push(`${file}: ошибка синтаксиса JavaScript`);
  }

  if (extension === '.html') {
    const html = await readFile(absolute, 'utf8');
    for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
      const original = match[1];
      if (/^(?:https?:|data:|mailto:|tel:|#|javascript:|\/\/)/i.test(original)) continue;
      if (original.includes('${')) continue;
      const local = original.split(/[?#]/, 1)[0];
      if (!local) continue;
      if (!existsSync(resolve(dirname(absolute), local))) {
        errors.push(`${file}: ссылка ведёт на отсутствующий файл ${original}`);
      }
    }
  }
}

if (errors.length) {
  console.error(`Проверка репозитория не пройдена:\n- ${errors.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log(`Проверка репозитория пройдена: ${files.length} файлов, обязательные пути на месте.`);
}
