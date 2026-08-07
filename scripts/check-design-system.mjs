import { readFile } from 'node:fs/promises';
import process from 'node:process';

const checks = [
  ['shared/style.css', ['.md-topbar-v2', '.md-sidenav', '.md-page', '.md-dialog', '.md-sheet']],
  ['shared/nav.js', ['.md-topbar-v2__lead']],
  ['appointments/index.html', ['data-module="appointments"', 'md-topbar-v2', '../shared/theme.js']],
  ['pioneer-school/index.html', ['data-module="pioneer-school"', 'md-topbar-v2', 'md-sidenav', '../shared/theme.js']],
  ['congress-project/js/main.js', ['dataset.module="congress-project"', 'md-topbar-v2', 'md-sidenav', 'md-table--cards']],
  ['congress-project/index.html', ['../shared/theme.js', 'id="printArea"']],
  ['congress-project/js/letters.js', ['class="letter-page"']],
  ['circuit-planner/index.html', ['../shared/theme.js', 'id="pinOverlay"', 'class="bottom-nav"']],
  ['circuit-planner/app.js', ["dataset.module = 'circuit-planner'", 'themeBridge:', 'md-topbar-v2', 'md-sidenav', 'calendarViewStyles']],
];

const errors = [];
for (const [file, markers] of checks) {
  const source = await readFile(file, 'utf8');
  for (const marker of markers) {
    if (!source.includes(marker)) errors.push(`${file}: отсутствует контрольный маркер ${marker}`);
  }
}

const congressCss = await readFile('congress-project/styles.css', 'utf8');
if (!/@media print/.test(congressCss) || !/\.module-tools\{display:none!important\}/.test(congressCss)) {
  errors.push('congress-project/styles.css: панель инструментов не защищена от печати');
}

const plannerApp = await readFile('circuit-planner/app.js', 'utf8');
for (const protectedMarker of [
  "storageKey: 'service-year-planner-v9-4-2'",
  "localStorage.getItem('syp-pin-hash')",
  "style.id = 'calendarViewStyles'",
]) {
  if (!plannerApp.includes(protectedMarker)) errors.push(`circuit-planner/app.js: исчез защищённый маркер ${protectedMarker}`);
}

if (errors.length) {
  console.error(`Проверка дизайн-системы не пройдена:\n- ${errors.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log('Проверка дизайн-системы пройдена: общая оболочка и защищённые границы модулей на месте.');
}
