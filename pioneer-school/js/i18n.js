// i18n.js — мост Школы пионеров к общей локализации хаба (shared/i18n.js).
//
// Модуль написан на обычных глобальных скриптах (не ES-модулях), поэтому
// перевод доступен как глобальная функция T(key, vars). Имя короткое
// намеренно: в app.js оно встречается в шаблонных строках сотни раз.
//
// Разрешение языка интерфейса целиком на общем слое:
//   localStorage['cw-lang:pioneer-school'] → свой выбор, если пользователь его сделал;
//   иначе localStorage['cw-lang'] → язык, заданный в Circuit Workspace.
//
// Язык ДОКУМЕНТА подключается отдельно через shared/doclang.js. Он не следует
// за интерфейсом и хранится под cw-doclang:pioneer-school.

const PSI18n = {
  MODULE: 'pioneer-school',
  HUB_VALUE: '__hub',

  ready() { return typeof CWI18n !== 'undefined'; },

  t(key, vars) { return this.ready() ? CWI18n.t(key, vars) : key; },

  isInherited() { return this.ready() ? CWI18n.isInherited() : true; },

  currentValue() {
    if (!this.ready()) return this.HUB_VALUE;
    return CWI18n.isInherited() ? this.HUB_VALUE : CWI18n.getLang();
  },

  choose(value) {
    if (!this.ready()) return;
    if (value === this.HUB_VALUE) CWI18n.resetToHub();
    else CWI18n.setLang(value, { scope: 'module' });
  },

  applyTitle() {
    const version = (self.CW_MODULES && self.CW_MODULES[this.MODULE] && self.CW_MODULES[this.MODULE].version) || '';
    document.title = this.t('module.pioneer-school.title') + (version ? ' v' + version : '');
  },

  fillSelect() {
    const select = document.getElementById('ui-language');
    if (!select || !this.ready()) return;
    const options = [{ code: this.HUB_VALUE, label: this.t('common.language_inherit') }]
      .concat(CWI18n.LANGS.map((l) => ({ code: l.code, label: l.label })));
    select.innerHTML = options.map((o) => `<option value="${o.code}">${o.label}</option>`).join('');
    select.value = this.currentValue();
  },

  _loadScript(src) {
    return new Promise((resolve, reject) => {
      const absolute = new URL(src, document.baseURI).href;
      const existing = Array.from(document.scripts).find((s) => s.src === absolute);
      if (existing) {
        if (existing.dataset.psLoaded === '1' || existing.readyState === 'complete') return resolve();
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', () => reject(new Error(`Не удалось загрузить ${src}`)), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.dataset.psDocLayer = '1';
      script.addEventListener('load', () => {
        script.dataset.psLoaded = '1';
        resolve();
      }, { once: true });
      script.addEventListener('error', () => reject(new Error(`Не удалось загрузить ${src}`)), { once: true });
      document.head.appendChild(script);
    });
  },

  async initDocumentLanguageLayer() {
    if (window.PSDocLang) {
      window.PSDocLang.init();
      return;
    }
    const scripts = [
      '../shared/doclang.js',
      'i18n/doc.js',
      'js/doclang.js',
      'js/documents-i18n.js'
    ];
    for (const src of scripts) await this._loadScript(src);
    if (!window.PSDocLang) throw new Error('PSDocLang не инициализирован');
    window.PSDocLang.init();
  },

  /**
   * @param {Function} rerender — перерисовка текущего экрана. Статическую
   *   разметку переводит CWI18n.apply() по атрибутам data-i18n; всё, что
   *   собирается в JS, нужно построить заново.
   */
  init(rerender) {
    if (!this.ready()) {
      console.error('pioneer-school: shared/i18n.js не подключён — интерфейс останется русским');
      return;
    }
    CWI18n.init({ module: this.MODULE });
    this.applyTitle();
    this.fillSelect();

    const apply = () => {
      this.applyTitle();
      this.fillSelect();
      if (typeof rerender === 'function') rerender();
    };

    CWI18n.onChange(apply);

    const select = document.getElementById('ui-language');
    if (select) select.addEventListener('change', (e) => { this.choose(e.target.value); apply(); });

    // Документный слой грузится после полной загрузки синхронных скриптов
    // страницы. Он не блокирует интерфейс и не вмешивается в язык оболочки.
    this.initDocumentLanguageLayer().catch((error) => {
      console.error('pioneer-school: document language layer failed', error);
    });
  },
};

function T(key, vars) { return PSI18n.t(key, vars); }

window.PSI18n = PSI18n;
window.T = T;
