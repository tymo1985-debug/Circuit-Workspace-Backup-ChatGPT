/**
 * Клиндарий — точечный compatibility-аудит видимой локализации.
 *
 * Step 31: глобальный MutationObserver удалён. Legacy-строки проверяются только
 * после трёх конкретных рендеров старого app.js, где они пока ещё создаются:
 * детали события, окно напоминаний и списки формуляра визита.
 */
(function () {
  'use strict';

  if (window.CWKlindariyAuditRuntimeLoaded) return;
  window.CWKlindariyAuditRuntimeLoaded = true;

  function installVisibleI18nAudit(app) {
    const textKeyByOriginal = new Map([
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

    const trackedText = new Map();
    const trackedAttrs = new Map();
    const nativeLanguageSelects = new Set(['languageSelect','vfLanguageSelect','eventFormLanguageSelect']);
    const translate = (key) => app.utils.t(key);

    const skipTextNode = (node) => {
      const parent = node?.parentElement;
      if (!parent) return true;
      if (['SCRIPT','STYLE','TEXTAREA'].includes(parent.tagName)) return true;
      if (parent.closest?.('[contenteditable="true"]')) return true;
      if (parent.tagName === 'OPTION' && nativeLanguageSelects.has(parent.parentElement?.id)) return true;
      return false;
    };

    const applyTextNode = (node, key) => {
      if (!node?.isConnected || skipTextNode(node)) return;
      const raw = node.nodeValue || '';
      const match = raw.match(/^(\s*)(.*?)(\s*)$/s);
      node.nodeValue = (match?.[1] || '') + translate(key) + (match?.[3] || '');
    };

    const inspectTextNode = (node) => {
      if (skipTextNode(node)) return;
      if (trackedText.has(node)) {
        applyTextNode(node, trackedText.get(node));
        return;
      }
      const key = textKeyByOriginal.get((node.nodeValue || '').trim());
      if (!key) return;
      trackedText.set(node, key);
      applyTextNode(node, key);
    };

    const inspectElementAttrs = (el) => {
      if (!(el instanceof Element)) return;
      ['title','aria-label','placeholder'].forEach((attr) => {
        const value = (el.getAttribute(attr) || '').trim();
        const key = textKeyByOriginal.get(value);
        if (!key) return;
        const token = `${attr}:${key}`;
        trackedAttrs.set(el, trackedAttrs.get(el) || new Set());
        trackedAttrs.get(el).add(token);
        el.setAttribute(attr, translate(key).replace(/^[📋⋯]\s*/, ''));
      });
    };

    const scan = (root) => {
      if (!root) return;
      if (root.nodeType === Node.TEXT_NODE) inspectTextNode(root);
      if (root.nodeType === Node.ELEMENT_NODE) inspectElementAttrs(root);
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
      let node;
      while ((node = walker.nextNode())) {
        if (node.nodeType === Node.TEXT_NODE) inspectTextNode(node);
        else inspectElementAttrs(node);
      }
    };

    const knownRoots = () => [
      app.els?.calendarSideDetails,
      app.els?.remindersModalList,
      app.els?.vfMeetingsList,
      app.els?.vfServiceDaysList,
      app.els?.vfPastoralList,
      app.els?.vfMealsList,
    ].filter(Boolean);

    const reapply = () => {
      for (const [node, key] of Array.from(trackedText.entries())) {
        if (!node.isConnected) {
          trackedText.delete(node);
          continue;
        }
        applyTextNode(node, key);
      }
      for (const [el, tokens] of Array.from(trackedAttrs.entries())) {
        if (!el.isConnected) {
          trackedAttrs.delete(el);
          continue;
        }
        for (const token of tokens) {
          const split = token.indexOf(':');
          const attr = token.slice(0, split);
          const key = token.slice(split + 1);
          el.setAttribute(attr, translate(key).replace(/^[📋⋯]\s*/, ''));
        }
      }
      knownRoots().forEach(scan);
    };

    const report = () => {
      const lang = app.utils.lang();
      if (!['en','pl','de'].includes(lang)) return [];
      const leaks = [];
      const selectors = 'button,summary,label,h1,h2,h3,h4,.small,.hint,.side-label,.modal-sub';
      document.querySelectorAll(selectors).forEach((el) => {
        if (el.closest?.('textarea,[contenteditable="true"]')) return;
        const value = (el.textContent || '').trim();
        if (!value || !/[\u0400-\u04FF]/.test(value)) return;
        leaks.push(value.slice(0, 140));
      });
      const unique = [...new Set(leaks)].slice(0, 30);
      if (unique.length) console.warn('Klindariy i18n audit: возможные непереведённые UI-строки', unique);
      return unique;
    };

    const scanAfterRender = (roots) => {
      const run = () => roots().filter(Boolean).forEach(scan);
      if (typeof queueMicrotask === 'function') queueMicrotask(run);
      else setTimeout(run, 0);
    };

    const wrapRenderer = (name, roots) => {
      const original = app.ui?.[name];
      if (typeof original !== 'function' || original.__cwI18nTargeted) return;
      const wrapped = function (...args) {
        const result = original.apply(this, args);
        scanAfterRender(roots);
        return result;
      };
      Object.defineProperty(wrapped, '__cwI18nTargeted', { value: true });
      app.ui[name] = wrapped;
    };

    wrapRenderer('renderCalendarDetails', () => [app.els?.calendarSideDetails]);
    wrapRenderer('renderRemindersModal', () => [app.els?.remindersModalList]);
    wrapRenderer('renderVisitFormLists', () => [
      app.els?.vfMeetingsList,
      app.els?.vfServiceDaysList,
      app.els?.vfPastoralList,
      app.els?.vfMealsList,
    ]);

    setTimeout(() => {
      knownRoots().forEach(scan);
      if (typeof CWI18n !== 'undefined' && CWI18n.onChange) {
        CWI18n.onChange(() => setTimeout(() => {
          reapply();
          report();
        }, 0));
      }
      setTimeout(report, 50);
    }, 0);

    window.CWI18nAudit = {
      mode: 'targeted-renderers',
      scan: () => knownRoots().forEach(scan),
      report,
      reapply,
    };
  }

  if (typeof window.CWKlindariyRegisterPreInitHook !== 'function') {
    console.error('circuit-planner/i18n/runtime.js: pre-init hook API недоступен');
    return;
  }

  window.CWKlindariyRegisterPreInitHook(function installVisibleAudit(app) {
    if (app && app.ui) installVisibleI18nAudit(app);
  });
})();
