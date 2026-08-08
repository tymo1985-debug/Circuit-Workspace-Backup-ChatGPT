/**
 * Клиндарий — словарь оставшихся динамических legacy-строк.
 *
 * Step 30: переводы отделены от механизма DOM-аудита. Этот файл только
 * регистрирует i18n-ключи и не меняет App, DOM, версию или пользовательские данные.
 */
(function () {
  'use strict';

  if (window.CWKlindariyAuditI18nLoaded) return;
  window.CWKlindariyAuditI18nLoaded = true;

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

  if (typeof CWI18n !== 'undefined') {
    CWI18n.register(AUDIT_I18N);
  } else {
    console.error('circuit-planner/i18n/audit.js: CWI18n недоступен');
  }
})();
