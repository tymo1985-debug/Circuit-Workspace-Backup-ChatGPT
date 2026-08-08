/**
 * Клиндарий — аудит видимой локализации.
 *
 * Step 29: немецкий интерфейс живёт в i18n/de.js, немецкие документы —
 * в i18n/de-docs.js. Здесь остаётся только диагностический compatibility layer
 * для динамических строк, которые всё ещё создаются старым app.js.
 */
(function () {
  'use strict';

  if (window.CWKlindariyAuditRuntimeLoaded) return;
  window.CWKlindariyAuditRuntimeLoaded = true;

  // ---------- Schritt 25: i18n-Audit der sichtbaren Oberfläche ----------
  // Здесь только общие UI-слова. JW-термины продолжают приходить из основного
  // словаря/немецкого слоя, уже сверенного по jw.org.
  const AUDIT_I18N = {
    ru: {
      'cp.audit.more_actions': '⋯ Ещё действия',
      'cp.audit.generate_s302': '📋 Сформировать S-302',
      'cp.audit.generate_send_s302': '📋 Сформировать и отправить S-302',
      'cp.audit.day': 'День',
    },
    uk: {
      'cp.audit.more_actions': '⋯ Інші дії',
      'cp.audit.generate_s302': '📋 Сформувати S-302',
      'cp.audit.generate_send_s302': '📋 Сформувати й надіслати S-302',
      'cp.audit.day': 'День',
    },
    en: {
      'cp.audit.more_actions': '⋯ More actions',
      'cp.audit.generate_s302': '📋 Generate S-302',
      'cp.audit.generate_send_s302': '📋 Generate and send S-302',
      'cp.audit.day': 'Day',
    },
    pl: {
      'cp.audit.more_actions': '⋯ Więcej działań',
      'cp.audit.generate_s302': '📋 Utwórz S-302',
      'cp.audit.generate_send_s302': '📋 Utwórz i wyślij S-302',
      'cp.audit.day': 'Dzień',
    },
    de: {
      'cp.audit.more_actions': '⋯ Weitere Aktionen',
      'cp.audit.generate_s302': '📋 S-302 erstellen',
      'cp.audit.generate_send_s302': '📋 S-302 erstellen und senden',
      'cp.audit.day': 'Tag',
    },
  };

  if (typeof CWI18n !== 'undefined') CWI18n.register(AUDIT_I18N);

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
      const parent = node.parentElement;
      if (!parent) return true;
      if (['SCRIPT','STYLE','TEXTAREA'].includes(parent.tagName)) return true;
      if (parent.closest('[contenteditable="true"]')) return true;
      if (parent.tagName === 'OPTION' && nativeLanguageSelects.has(parent.parentElement?.id)) return true;
      return false;
    };

    const applyTextNode = (node, key) => {
      if (!node?.isConnected || skipTextNode(node)) return;
      const raw = node.nodeValue || '';
      const match = raw.match(/^(\s*)(.*?)(\s*)$/s);
      const lead = match?.[1] || '';
      const trail = match?.[3] || '';
      node.nodeValue = lead + translate(key) + trail;
    };

    const inspectTextNode = (node) => {
      if (skipTextNode(node)) return;
      if (trackedText.has(node)) {
        applyTextNode(node, trackedText.get(node));
        return;
      }
      const trimmed = (node.nodeValue || '').trim();
      const key = textKeyByOriginal.get(trimmed);
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

    const scan = (root = document.body) => {
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
      scan(document.body);
    };

    const report = () => {
      const lang = app.utils.lang();
      if (!['en','pl','de'].includes(lang)) return [];
      const leaks = [];
      const selectors = 'button,summary,label,h1,h2,h3,h4,.small,.hint,.side-label,.modal-sub';
      document.querySelectorAll(selectors).forEach((el) => {
        if (el.closest('textarea,[contenteditable="true"]')) return;
        const value = (el.textContent || '').trim();
        if (!value || !/[\u0400-\u04FF]/.test(value)) return;
        leaks.push(value.slice(0, 140));
      });
      const unique = [...new Set(leaks)].slice(0, 30);
      if (unique.length) console.warn('Klindariy i18n audit: возможные непереведённые UI-строки', unique);
      return unique;
    };

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        if (m.type === 'characterData') inspectTextNode(m.target);
        m.addedNodes.forEach((node) => scan(node));
      });
    });

    setTimeout(() => {
      scan(document.body);
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      if (typeof CWI18n !== 'undefined' && CWI18n.onChange) {
        CWI18n.onChange(() => setTimeout(() => {
          reapply();
          report();
        }, 0));
      }
      setTimeout(report, 50);
    }, 0);

    window.CWI18nAudit = { scan: () => scan(document.body), report, reapply };
  }

  if (typeof window.CWKlindariyRegisterPreInitHook !== 'function') {
    console.error('circuit-planner/i18n/runtime.js: pre-init hook API недоступен');
    return;
  }

  window.CWKlindariyRegisterPreInitHook(function installVisibleAudit(app) {
    if (app && app.ui) installVisibleI18nAudit(app);
  });
})();
