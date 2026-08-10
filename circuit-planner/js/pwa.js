/**
 * Клиндарий — pre-app bootstrap + регистрация PWA.
 *
 * Step 35: pre-init модули подключаются обычными defer-скриптами в index.html.
 * i18n/de.js отвечает за немецкий интерфейс; i18n/de-docs.js — за немецкие
 * документы. Временный legacy i18n bridge удалён в Step 40.
 * app.js остаётся владельцем App и версии.
 */
(function () {
  'use strict';

  const preInitHooks = [];
  window.CWKlindariyRegisterPreInitHook = function (hook) {
    if (typeof hook === 'function') preInitHooks.push(hook);
  };

  // app.js publishes its local const App as window.App immediately before App.init().
  // Keep exactly one interception point and let modules register small independent hooks.
  let publishedApp = null;
  Object.defineProperty(window, 'App', {
    configurable: true,
    enumerable: true,
    get() { return publishedApp; },
    set(app) {
      publishedApp = app;
      try {
        for (const hook of preInitHooks) {
          try {
            hook(app);
          } catch (error) {
            console.error('Klindariy pre-init hook failed', error);
          }
        }
      } finally {
        Object.defineProperty(window, 'App', {
          value: app,
          writable: true,
          configurable: true,
          enumerable: true
        });
      }
    }
  });

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
