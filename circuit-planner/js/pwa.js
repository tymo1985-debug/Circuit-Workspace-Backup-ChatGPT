/**
 * Клиндарий — pre-app bootstrap + регистрация PWA.
 *
 * Step 28: один общий pre-init hook-механизм подключает независимые i18n-модули.
 * i18n/de.js отвечает за немецкий интерфейс; i18n/de-docs.js — за немецкие
 * документы; i18n/runtime.js — только за аудит. app.js остаётся владельцем App и версии.
 */
(function () {
  'use strict';

  const preInitHooks = [];
  window.CWKlindariyRegisterPreInitHook = function (hook) {
    if (typeof hook === 'function') preInitHooks.push(hook);
  };

  function loadPreInitScript(relativeUrl, loadedFlag) {
    if (loadedFlag && window[loadedFlag]) return;
    const current = document.currentScript;
    const base = current?.src || window.location.href;
    const url = new URL(relativeUrl, base);
    const request = new XMLHttpRequest();
    request.open('GET', url.href, false);
    request.send(null);
    const ok = (request.status >= 200 && request.status < 300) || request.status === 0;
    if (!ok || !request.responseText) {
      throw new Error(`${relativeUrl} HTTP ${request.status || 'error'}`);
    }
    // Same-origin app-shell source only; executed before app.js in deterministic order.
    (0, eval)(`${request.responseText}
//# sourceURL=${url.href}`);
  }

  try {
    loadPreInitScript('../i18n/de.js', 'CWKlindariyGermanUiLoaded');
    loadPreInitScript('../i18n/de-docs.js', 'CWKlindariyGermanDocumentsLoaded');
    loadPreInitScript('../i18n/runtime.js', 'CWKlindariyAuditRuntimeLoaded');
  } catch (error) {
    console.error('Klindariy pre-init i18n failed to load', error);
  }

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
