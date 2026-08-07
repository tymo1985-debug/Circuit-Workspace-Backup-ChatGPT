/**
 * Единая регистрация Service Worker и безопасное применение обновлений.
 * Подключение: <script src=".../shared/pwa-update.js" data-sw="sw.js" defer></script>
 */
(function (global) {
  'use strict';

  var script = global.document && global.document.currentScript;
  var workerUrl = script && script.getAttribute('data-sw');
  if (!workerUrl || !('serviceWorker' in global.navigator)) return;

  var reloading = false;
  var hadController = !!global.navigator.serviceWorker.controller;

  function reloadForNewWorker() {
    // Первая установка ещё не является обновлением: не перезагружаем страницу
    // у нового пользователя сразу после первого открытия.
    if (!hadController) {
      hadController = true;
      return;
    }
    if (reloading) return;
    reloading = true;
    global.setTimeout(function () { global.location.reload(); }, 150);
  }

  global.navigator.serviceWorker.addEventListener('controllerchange', reloadForNewWorker);

  global.addEventListener('load', function () {
    global.navigator.serviceWorker.register(workerUrl, { updateViaCache: 'none' })
      .then(function (registration) {
        registration.update().catch(function () {});

        // При возвращении во вкладку проверяем обновление, но не чаще раза
        // в 15 минут. Это доставляет новую версию без ручной очистки кэша.
        var lastCheck = Date.now();
        global.document.addEventListener('visibilitychange', function () {
          if (global.document.visibilityState !== 'visible') return;
          if (Date.now() - lastCheck < 15 * 60 * 1000) return;
          lastCheck = Date.now();
          registration.update().catch(function () {});
        });
      })
      .catch(function (error) {
        console.warn('Service Worker registration failed', error);
      });
  });
})(window);
