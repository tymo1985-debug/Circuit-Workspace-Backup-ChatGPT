/** Регистрация и обновление PWA Клиндария. */
(function () {
  'use strict';
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
