/**
 * Клиндарий — минимальный bridge для оставшихся legacy-текстов.
 *
 * Step 33: словарь legacy-ключей и точечный bridge объединены в одном маленьком
 * модуле. Отдельный i18n/audit.js больше не нужен. Bridge запускается только
 * после единственного оставшегося legacy-рендера старого app.js и при смене языка.
 */
(function () {
  'use strict';

  if (window.CWKlindariyAuditRuntimeLoaded) return;
  window.CWKlindariyAuditRuntimeLoaded = true;

  const AUDIT_I18N = {
    ru: {
      'cp.audit.day': 'День',
    },
    uk: {
      'cp.audit.day': 'День',
    },
    en: {
      'cp.audit.day': 'Day',
    },
    pl: {
      'cp.audit.day': 'Dzień',
    },
    de: {
      'cp.audit.day': 'Tag',
    },
  };

  if (typeof CWI18n !== 'undefined') {
    CWI18n.register(AUDIT_I18N);
  } else {
    console.error('circuit-planner/i18n/runtime.js: CWI18n недоступен');
  }

  function installLegacyTextBridge(app) {
    const legacyTextKeys = new Map([
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

    const allRoots = visitRoots;

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
