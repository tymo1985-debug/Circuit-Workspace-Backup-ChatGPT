// Service Worker for Service Year Planner
// Auto-update app shell without manual VERSION bumps.
// Step 26: localization runtime lives in i18n/runtime.js; changing this worker
// forces a fresh install so both the loader and runtime are precached immediately.
// index.html / app.js / manifest / sw.js -> network-first
// images/fonts -> cache-first
// everything else -> stale-while-revalidate

const CACHE_STATIC = 'syp-static';
const CACHE_RUNTIME = 'syp-runtime';
// Step 38: next-visit indicator lives inside the calendar toolbar, not the fixed topbar.
const APP_SHELL_URLS = [
  './',
  './?source=pwa',
  './index.html',
  './app.js',
  './visit-pdf.js',
  './js/pwa.js',
  './fonts/fonts-aptos-regular.js',
  './fonts/fonts-aptos-bold.js',
  './fonts/fonts-aptos-italic.js',
  './fonts/fonts-aptos-bolditalic.js',
  './forms/s302-form.js',
  './favicon.ico',
  './manifest.webmanifest',
  '../shared/style.css',
  '../shared/theme.js',
  '../shared/nav.js',
  '../shared/backup.js',
  '../shared/i18n.js','../shared/sender.js',
  '../shared/doclang.js',
  '../shared/i18n/common.js',
  './i18n/dict.js',
  './i18n/de.js',
  './i18n/de-docs.js',
  './i18n/runtime.js',
  '../shared/fonts/roboto-latin-400-normal.woff2',
  '../shared/fonts/roboto-latin-500-normal.woff2',
  '../shared/fonts/roboto-cyrillic-400-normal.woff2',
  '../shared/fonts/roboto-cyrillic-500-normal.woff2',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './vendor/jspdf.umd.min.js',
  './vendor/jspdf.plugin.autotable.min.js',
  './vendor/pdf-lib.min.js',
  './vendor/fontkit.umd.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_STATIC);
    for (const url of APP_SHELL_URLS) {
      try {
        const req = new Request(url, { cache: 'reload' });
        const res = await fetch(req);
        if (res && res.ok) await cache.put(url, res.clone());
      } catch (_) {
        // Ignore missing assets to keep install robust.
      }
    }
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.map((key) => {
        const isCurrent = key === CACHE_STATIC || key === CACHE_RUNTIME;
        const isLegacy = key.startsWith('static-') || key.startsWith('runtime-') || key.startsWith('syp-v');
        if (!isCurrent && isLegacy) return caches.delete(key);
        return Promise.resolve(false);
      })
    );

    if ('navigationPreload' in self.registration) {
      try { await self.registration.navigationPreload.enable(); } catch (_) {}
    }

    await self.clients.claim();
  })());
});

function isNavigationRequest(request) {
  return request.mode === 'navigate' || (
    request.method === 'GET' &&
    (request.headers.get('accept') || '').includes('text/html')
  );
}

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isAppShellRequest(request) {
  const url = new URL(request.url);
  if (!isSameOrigin(url)) return false;

  const pathname = url.pathname;
  const shellFiles = ['/index.html', '/app.js', '/manifest.webmanifest', '/sw.js'];

  return (
    pathname.endsWith('/') ||
    shellFiles.some((file) => pathname.endsWith(file)) ||
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'manifest' ||
    request.destination === 'document'
  );
}

async function cacheFirst(request) {
  const cached = await caches.match(request);

  const revalidate = fetch(request)
    .then(async (res) => {
      if (res && res.ok) {
        const cache = await caches.open(CACHE_STATIC);
        try { await cache.put(request, res.clone()); } catch (_) {}
      }
      return res;
    })
    .catch(() => null);

  if (cached) {
    revalidate.catch(() => {});
    return cached;
  }

  return (await revalidate) || Response.error();
}

async function networkFirst(request, fallbackUrl = './index.html') {
  const cache = await caches.open(CACHE_RUNTIME);
  try {
    const res = await fetch(request, { cache: 'no-cache' });
    if (res && res.ok) {
      try { await cache.put(request, res.clone()); } catch (_) {}
    }
    return res;
  } catch (_) {
    const cached = await caches.match(request);
    if (cached) return cached;

    const fallback = fallbackUrl
      ? (await caches.match(fallbackUrl)) || (await caches.match('./'))
      : null;

    return fallback || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const fetchPromise = fetch(request)
    .then(async (res) => {
      if (res && res.ok) {
        const cache = await caches.open(CACHE_RUNTIME);
        try { await cache.put(request, res.clone()); } catch (_) {}
      }
      return res;
    })
    .catch(() => cached);

  return cached || fetchPromise.then((res) => res || Response.error());
}

async function offlineFirst(request, fallbackUrl) {
  const cached = await caches.match(request);
  if (cached) {
    fetch(request, { cache: 'no-cache' })
      .then(async (res) => {
        if (res && res.ok) {
          const cache = await caches.open(CACHE_RUNTIME);
          try { await cache.put(request, res.clone()); } catch (_) {}
        }
      })
      .catch(() => {});
    return cached;
  }
  return networkFirst(request, fallbackUrl);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  if (isNavigationRequest(request)) {
    event.respondWith((async () => {
      const preload = await event.preloadResponse;
      if (preload && preload.ok) {
        const cache = await caches.open(CACHE_RUNTIME);
        cache.put(request, preload.clone()).catch(() => {});
        return preload;
      }
      return networkFirst(request, './index.html');
    })());
    return;
  }

  if (isSameOrigin(url) && (url.pathname.includes('/fonts/') || ['image', 'font'].includes(request.destination))) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (isAppShellRequest(request)) {
    event.respondWith(offlineFirst(request, request.destination === 'document' ? './index.html' : null));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});
