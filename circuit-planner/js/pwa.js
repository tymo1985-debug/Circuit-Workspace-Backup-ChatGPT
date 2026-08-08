/**
 * Клиндарий — pre-app bootstrap + регистрация PWA.
 *
 * Шаг 26: локализация вынесена в i18n/runtime.js. Здесь остаётся только
 * детерминированная загрузка pre-init runtime и PWA lifecycle.
 */
(function () {
  'use strict';

  function loadI18nRuntime() {
    if (window.CWKlindariyI18nRuntimeLoaded) return;
    const current = document.currentScript;
    const base = current?.src || window.location.href;
    const url = new URL('../i18n/runtime.js', base);
    const request = new XMLHttpRequest();
    request.open('GET', url.href, false);
    request.send(null);
    const ok = (request.status >= 200 && request.status < 300) || request.status === 0;
    if (!ok || !request.responseText) {
      throw new Error(`i18n runtime HTTP ${request.status || 'error'}`);
    }
    // Indirect eval executes the already wrapped runtime in global scope. The file is
    // same-origin and part of the app shell; no user-controlled source is evaluated.
    (0, eval)(`${request.responseText}
//# sourceURL=${url.href}`);
  }

  try {
    loadI18nRuntime();
  } catch (error) {
    console.error('Klindariy i18n runtime failed to load', error);
  }

  // ---------- Регистрация и обновление PWA ----------
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async function () {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
      try { await registration.update(); } catch (_) {}

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });

      registration.addEventListener('updatefound', function () {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', function () {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            try { registration.waiting?.postMessage({ type: 'SKIP_WAITING' }); } catch (_) {}
          }
        });
      });
    } catch (error) {
      console.warn('Service Worker registration failed', error);
    }
  });
})();
