// doclang.js — независимый язык документов Школы пионеров.
(function (global) {
  'use strict';

  const PSDocLang = {
    MODULE: 'pioneer-school',
    LANGS: ['ru', 'uk', 'en', 'pl', 'de'],
    _ready: false,

    get() {
      return global.CWDocLang ? global.CWDocLang.get() : 'ru';
    },

    set(lang) {
      if (!global.CWDocLang) return this.get();
      return global.CWDocLang.set(lang);
    },

    locale(lang) {
      return {
        ru: 'ru-RU',
        uk: 'uk-UA',
        en: 'en-GB',
        pl: 'pl-PL',
        de: 'de-DE'
      }[lang || this.get()] || 'ru-RU';
    },

    t(key, vars, fallback) {
      if (!global.CWI18n) return fallback ?? key;
      const value = global.CWI18n.t(key, vars || null, this.get());
      return (!value || value === key) ? (fallback ?? key) : value;
    },

    _optionKey(fieldKey, value) {
      if (fieldKey === 'attending' || fieldKey === 'transport' || fieldKey === 'lodging') {
        return `doc.ps.registration.option.${value}`;
      }
      return `doc.ps.registration.option.${fieldKey}.${value}`;
    },

    labelForValue(fieldKey, value, fallback) {
      return this.t(this._optionKey(fieldKey, value), null, fallback ?? value);
    },

    localizeRegistrationSchema(schema) {
      const self = this;
      const localized = {
        ...schema,
        sections: (schema.sections || []).map((section) => ({
          ...section,
          title: self.t(`doc.ps.registration.section.${section.id}`, null, section.title),
          fields: (section.fields || []).map((field) => ({
            ...field,
            label: self.t(`doc.ps.registration.field.${field.key}`, null, field.label),
            hint: field.hint
              ? self.t(`doc.ps.registration.hint.${field.key}`, null, field.hint)
              : field.hint,
            options: (field.options || []).map((opt) => ({
              ...opt,
              label: self.labelForValue(field.key, opt.value, opt.label)
            }))
          }))
        })),
        closingText: self.t('doc.ps.registration.closing', null, schema.closingText)
      };
      localized.allFields = function () { return localized.sections.flatMap((s) => s.fields); };
      localized.fieldByKey = function (key) { return localized.allFields().find((f) => f.key === key) || null; };
      localized.labelForValue = function (key, value) {
        const f = localized.fieldByKey(key);
        const opt = f && f.options ? f.options.find((o) => o.value === value) : null;
        return opt ? opt.label : value;
      };
      return localized;
    },

    _languageOptions() {
      if (!global.CWI18n || !Array.isArray(global.CWI18n.LANGS)) {
        return this.LANGS.map((code) => ({ code, label: code.toUpperCase() }));
      }
      return global.CWI18n.LANGS.filter((l) => this.LANGS.includes(l.code));
    },

    _ensureControl(routeId, controlId) {
      const route = document.getElementById(routeId);
      if (!route) return null;
      let wrap = document.getElementById(controlId + '-wrap');
      if (!wrap) {
        const header = route.querySelector('.route-header') || route;
        wrap = document.createElement('div');
        wrap.id = controlId + '-wrap';
        wrap.className = 'doc-language-control';
        wrap.style.cssText = 'margin-top:12px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;';
        const label = document.createElement('label');
        label.htmlFor = controlId;
        label.className = 'hint';
        label.style.margin = '0';
        const select = document.createElement('select');
        select.id = controlId;
        select.className = 'lang-select';
        select.style.minWidth = '150px';
        wrap.append(label, select);
        header.appendChild(wrap);
        select.addEventListener('change', (event) => this.set(event.target.value));
      }
      return wrap;
    },

    renderControls() {
      const controls = [
        ['route-registration', 'registration-doc-language'],
        ['route-afterschool', 's253-doc-language']
      ];
      const current = this.get();
      const labelText = global.CWI18n
        ? global.CWI18n.t('ps.doc.language_label')
        : 'Document language';

      controls.forEach(([routeId, controlId]) => {
        const wrap = this._ensureControl(routeId, controlId);
        if (!wrap) return;
        const label = wrap.querySelector('label');
        const select = wrap.querySelector('select');
        label.textContent = labelText;
        select.innerHTML = this._languageOptions()
          .map((item) => `<option value="${item.code}">${item.label}</option>`)
          .join('');
        select.value = current;
      });
    },

    init() {
      if (!global.CWDocLang || !global.CWI18n) {
        console.error('pioneer-school: CWDocLang/CWI18n unavailable');
        return;
      }
      global.CWDocLang.init({ module: this.MODULE, langs: this.LANGS, apply: false });
      this.renderControls();
      if (this._ready) return;
      this._ready = true;
      global.CWDocLang.onChange(() => this.renderControls());
      global.CWI18n.onChange(() => this.renderControls());
    }
  };

  global.PSDocLang = PSDocLang;
})(typeof self !== 'undefined' ? self : this);
