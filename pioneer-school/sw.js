// Школа пионеров — service worker модуля.
const APP_VERSION = '1.7.1';
const CACHE_PREFIX = 'pioneer-school-cache-v';
const CACHE_NAME = CACHE_PREFIX + APP_VERSION;

const ASSETS = [
  './',
  './index.html',
  './register.html',
  './manifest.json',
  './css/styles.css',
  './icons/favicon-32.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  '../shared/style.css',
  '../shared/theme.js',
  '../shared/nav.js',
  '../shared/backup.js',
  '../shared/pwa-update.js',
  '../shared/version.js',
  '../shared/i18n.js',
  '../shared/i18n/common.js',
  '../shared/doclang.js',
  './i18n/dict.js',
  './i18n/doc.js',
  './js/i18n.js',
  './js/doclang.js',
  './js/documents-i18n.js',
  '../shared/fonts/roboto-latin-400-normal.woff2',
  '../shared/fonts/roboto-latin-500-normal.woff2',
  '../shared/fonts/roboto-cyrillic-400-normal.woff2',
  '../shared/fonts/roboto-cyrillic-500-normal.woff2',
  '../shared/fonts/material-symbols-outlined-subset.woff2',
  './js/db.js',
  './js/app.js',
  './js/utils/dateUtils.js',
  './js/utils/validators.js',
  './js/modules/anketa.js',
  './js/modules/assignment.js',
  './js/modules/registration.js',
  './js/modules/substitutes.js',
  './js/modules/students.js',
  './js/modules/pdfImport.js',
  './js/modules/textbooks.js',
  './js/modules/practical.js',
  './js/modules/review.js',
  './js/modules/afterSchool.js',
  './js/modules/signLanguage.js',
  './js/export/pdfExport.js',
  './js/export/pdfFormExport.js',
  './js/export/excelExport.js',
  './js/modules/registrationSchema.js',
  './js/export/fonts/dejavu-sans-subset.js',
  './js/export/fonts/dejavu-form-b64.js',
  './js/vendor/pdf-lib.min.js',
  './js/vendor/fontkit.umd.min.js',
  './js/vendor/jspdf.umd.min.js',
  './js/vendor/pdf.min.js',
  './js/vendor/pdf.worker.min.js',
  './js/vendor/xlsx.full.min.js',
  './data/seed-lessons.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(ASSETS);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME).map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response && response.ok && (url.origin === self.location.origin || response.type === 'cors')) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    } catch (_) {
      if (request.mode === 'navigate') {
        const shell = await caches.match('./index.html');
        if (shell) return shell;
      }
      return Response.error();
    }
  })());
});
