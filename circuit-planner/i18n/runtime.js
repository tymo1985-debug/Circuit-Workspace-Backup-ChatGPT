/**
 * Клиндарий — минимальный bridge для оставшихся legacy-текстов.
 *
 * Step 32: generic DOM-аудит удалён. Bridge знает только несколько конкретных
 * строк старого app.js и запускается только после трёх соответствующих рендеров
 * и при смене языка. Никаких глобальных наблюдателей, сканирования атрибутов или
 * глобального поиска кириллицы больше нет.
 */
(function () {
  'use strict';

  if (window.CWKlindariyAuditRuntimeLoaded) return;
  window.CWKlindariyAuditRuntimeLoaded = true;

  function installLegacyTextBridge(app) {
    const legacyTextKeys = new Map([
      ['⋯ Ещё действия', 'audit.more_actions'],
      ['Ещё действия', 'audit.more_actions'],
      ['📋 Формуляр визита', 'visit_form_btn'],
      ['Формуляр визита', 'visit_form_btn'],
      ['📋 Сформировать S-302', 'audit.generate_s302'],
      ['Сформировать S-302', 'audit.generate_s302'],
      ['📋 Сформировать и отправить S-302', 'audit.generate_send_s302'],
      ['Сформировать и отправить S-302', 'audit.generate_send_s302'],
      ['Тип', 'type'],
      ['День', 'audit.day'],
    ]);

    const translateTextNode = (node) => {
      if (!node || node.nodeType !== Node.TEXT_NODE) return;
      const parent = node.parentElement;
      if (!parent || ['SCRIPT','STYLE','TEXTAREA','OPTION'].includes(parent.tagName)) return;
      if (parent.closest?.('[contenteditable="true"]')) return;

      const raw = node.nodeValue || '';
      const trimmed = raw.trim();
      const key = legacyTextKeys.get(trimmed);
      if (!key) return;

      const match = raw.match(/^(\s*)(.*?)(\s*)$/s);
      node.nodeValue = (match?.[1] || '') + app.utils.t(key) + (match?.[3] || '');
    };

    const scanText = (root) => {
      if (!root) return;
      if (root.nodeType === Node.TEXT_NODE) {
        translateTextNode(root);
        return;
      }
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) translateTextNode(node);
    };

    const visitRoots = () => [
      app.els?.vfMeetingsList,
      app.els?.vfServiceDaysList,
      app.els?.vfPastoralList,
      app.els?.vfMealsList,
    ].filter(Boolean);

    const allRoots = () => [
      app.els?.calendarSideDetails,
      app.els?.remindersModalList,
      ...visitRoots(),
    ].filter(Boolean);

    const scanSoon = (roots) => {
      const run = () => roots().filter(Boolean).forEach(scanText);
      if (typeof queueMicrotask === 'function') queueMicrotask(run);
      else setTimeout(run, 0);
    };

    const wrapRenderer = (name, roots) => {
      const original = app.ui?.[name];
      if (typeof original !== 'function' || original.__cwLegacyI18nBridge) return;

      const wrapped = function (...args) {
        const result = original.apply(this, args);
        scanSoon(roots);
        return result;
      };
      Object.defineProperty(wrapped, '__cwLegacyI18nBridge', { value: true });
      app.ui[name] = wrapped;
    };

    wrapRenderer('renderCalendarDetails', () => [app.els?.calendarSideDetails]);
    wrapRenderer('renderRemindersModal', () => [app.els?.remindersModalList]);
    wrapRenderer('renderVisitFormLists', visitRoots);

    setTimeout(() => allRoots().forEach(scanText), 0);

    if (typeof CWI18n !== 'undefined' && CWI18n.onChange) {
      CWI18n.onChange(() => setTimeout(() => allRoots().forEach(scanText), 0));
    }

    window.CWI18nAudit = {
      mode: 'minimal-legacy-text-bridge',
      scan: () => allRoots().forEach(scanText),
    };
  }

  if (typeof window.CWKlindariyRegisterPreInitHook !== 'function') {
    console.error('circuit-planner/i18n/runtime.js: pre-init hook API недоступен');
    return;
  }

  window.CWKlindariyRegisterPreInitHook(function installLegacyBridge(app) {
    if (app && app.ui) installLegacyTextBridge(app);
  });
})();
