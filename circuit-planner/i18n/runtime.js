/**
 * Клиндарий — compatibility runtime документов и видимого i18n-аудита.
 *
 * Step 28: немецкий интерфейс вынесен в i18n/de.js. Здесь остаются только
 * немецкий документный слой (формуляр/PDF/письмо) и аудит динамических строк.
 * Следующий этап сможет переносить их в app.js независимо от UI-словаря.
 */
(function () {
  'use strict';

  if (window.CWKlindariyDocumentRuntimeLoaded) return;
  window.CWKlindariyDocumentRuntimeLoaded = true;

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

  // ---------- Schritt 24: deutsche Dokumentsprache ----------
  // JW-spezifische Begriffe in diesem Block wurden ausschließlich anhand
  // der deutschsprachigen Inhalte auf jw.org gewählt.
  const DE_VP_DICT = {
    visitTypeMeeting: 'Versammlung',
    visitTypeGroup: 'Gruppe',
    visitTypePregroup: 'Vorgruppe',

    meetingTypeMidweek: 'Leben-und-Dienst-Zusammenkunft',
    meetingTypeWeekend: 'Zusammenkunft am Wochenende',
    meetingTypeElders: 'Ältestensitzung',
    meetingTypeWithElders: 'Zusammenkunft mit den Ältesten',
    meetingTypePioneers: 'Zusammenkunft mit Pionieren',
    meetingTypeOther: 'Andere',

    meetingTypeLabel: 'Art der Zusammenkunft',
    dayLabel: 'Wochentag',
    timeLabel: 'Uhrzeit',
    placeLabel: 'Ort',

    weekdayMon: 'Montag',
    weekdayTue: 'Dienstag',
    weekdayWed: 'Mittwoch',
    weekdayThu: 'Donnerstag',
    weekdayFri: 'Freitag',
    weekdaySat: 'Samstag',
    weekdaySun: 'Sonntag',

    serviceTableTime: 'Uhrzeit',
    serviceTablePlace: 'Treffpunkt',
    serviceTablePartner: 'Mit wem (Name/Telefon)',
    serviceTableKind: 'Art des Predigtdienstes',

    pastoralName: 'Name',
    pastoralDay: 'Tag',
    pastoralTime: 'Uhrzeit',
    pastoralReason: 'Grund für den Hirtenbesuch',

    mealDay: 'Tag',
    mealTime: 'Uhrzeit',
    mealPlace: 'Ort',
    mealHost: 'Gastgeber',
    mealPhone: 'Telefon',
    mealNote: 'Notiz',

    pdfPageForAlex: 'Formular für Alex',
    pdfPageForLydia: 'Formular für Lidia',
    pdfVisitTypeLabel: 'Besuchsart:',
    pdfMeetingsSchedule: 'Zusammenkünfte',
    pdfServicePlan: 'Plan für den Predigtdienst',
    pdfPastoralVisits: 'Hirtenbesuche',
    pdfMeals: 'Mahlzeiten',
    pdfNotes: 'Zusätzliche Notizen',
    pdfManualLinesTitle: 'Für handschriftliche Notizen',
    pdfGeneratedOn: 'Dokument erstellt am',
  };

  const DE_VPI = {
    lang: 'de',
    WEEKDAYS: ['weekdayMon','weekdayTue','weekdayWed','weekdayThu','weekdayFri','weekdaySat','weekdaySun'],
    MEETING_TYPES: ['meetingTypeMidweek','meetingTypeWeekend','meetingTypeElders','meetingTypeWithElders','meetingTypePioneers','meetingTypeOther'],
    MEAL_DAY_KEYS: ['weekdayWed','weekdayThu','weekdayFri','weekdaySat','weekdaySun'],
    dict: DE_VP_DICT,
    t(key) { return this.dict[key] || key; },
  };

  const DE_LETTER_BODY = `
<p>Die Zeit vergeht schnell! Meine Frau und ich freuen uns sehr, dass die Zeit gekommen ist, eure Versammlung zu besuchen. Es ist für uns wieder eine große Freude, die Woche des Besuchs mit euch zu verbringen.</p>

<p>Der Besuch findet vom {start_date} bis {end_date} statt.</p>

<p>Diese Woche gibt uns die Gelegenheit, einander zu dienen und uns von Jehova stärken zu lassen (Jesaja 41:10).</p>

<p>Die Versammlung wird sich bestimmt freuen, davon zu hören. Ihr könnt die Brüder und Schwestern schon jetzt ermuntern, die Woche des Besuchs möglichst gut zu unterstützen. Ihr könnt die Verkündiger auch an die Möglichkeit erinnern, im Besuchsmonat als Hilfspioniere mit einem Ziel von 15 oder 30 Stunden zu dienen. Alle, die in diesem Monat in irgendeiner Form im Pionierdienst stehen, laden wir herzlich zur Zusammenkunft mit Pionieren ein. Liebe Älteste, eure Unterstützung in dieser Woche wird uns allen helfen, möglichst viel Ermunterung und Nutzen daraus zu ziehen.</p>

<p>Für uns ist es immer eine besondere Freude, mit euch im Predigtdienst zusammenzuarbeiten, zum Beispiel beim Predigen an öffentlichen Orten. Wir begleiten Verkündiger auch gern bei Rückbesuchen und Bibelstudien, zu denen sie uns einladen. Vielleicht gibt es in der Versammlung Kinder oder Jugendliche, mit denen die Bibel studiert wird — auch zu solchen Bibelstudien kommen wir gern mit. Wer mit uns in den Predigtdienst gehen möchte, aber gerade keinen Rückbesuch oder kein Bibelstudium hat, kann sich ebenfalls gern mit uns verabreden.</p>`;

  const DE_EMAIL_BODY_TEMPLATES = {
    Congregation: `Liebe Brüder,

im Anhang sende ich euch den Brief vor dem Besuch der Versammlung {congregation} vom {start_date} bis {end_date}.

Mit brüderlichen Grüßen
{sender}`,
    Group: `Liebe Brüder,

im Anhang sende ich euch den Brief vor dem Besuch der Gruppe {congregation} vom {start_date} bis {end_date}.

Mit brüderlichen Grüßen
{sender}`,
    Pregroup: `Liebe Brüder,

im Anhang sende ich euch den Brief vor dem Besuch der Vorgruppe {congregation} vom {start_date} bis {end_date}.

Mit brüderlichen Grüßen
{sender}`,
  };

  const DE_SALUTATIONS = {
    Congregation: 'An die Ältestenschaft der Versammlung {congregation}{cong_number_suffix}',
    Group: 'An den verantwortlichen Bruder der Gruppe {congregation}',
    Pregroup: 'An den verantwortlichen Bruder der Vorgruppe {congregation}',
  };

  const DE_DEFAULT_MEMO = {
    title: 'HINWEISE FÜR DEN KOORDINATOR DER ÄLTESTENSCHAFT',
    html: `<div>• Bitte das aktuelle Formular S-61 beachten und die benötigten Angaben rechtzeitig vorbereiten.</div>
<div>• Die Zusammenkunft mit den ernannten Brüdern bitte für Freitagabend einplanen.</div>
<div>• Bitte 2–3 Hirtenbesuche einplanen. Wenn möglich, nicht unmittelbar nach einer Zusammenkunft für den Predigtdienst. Donnerstagvormittag bitte freihalten.</div>
<div>• Ich besuche gern junge Verkündiger, Pioniere sowie ältere Brüder und Schwestern, die Ermunterung gebrauchen können.</div>
<div>• Bitte genügend Möglichkeiten für den gemeinsamen Predigtdienst einplanen.</div>
<div>• Änderungen oder besondere Bedürfnisse bitte möglichst früh mitteilen.</div>`
  };

  const DE_NATIVE_LANG_NAMES = {
    ru: 'Русский',
    uk: 'Українська',
    en: 'English',
    pl: 'Polski',
    de: 'Deutsch',
  };

  function deFormatDate(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  function deLetterSuffix(app, visitType) {
    return app.ui.letterTypeSuffix ? app.ui.letterTypeSuffix(visitType) : (
      visitType === 'group' ? 'Group' : visitType === 'pregroup' ? 'Pregroup' : 'Congregation'
    );
  }

  function deSubstitute(app, template, entry, event) {
    const congregation = event?.name || entry?.title || '';
    const congNumber = event?.congNumber || '';
    return String(template || '')
      .replace(/\{congregation\}/g, congregation)
      .replace(/\{cong_number\}/g, congNumber)
      .replace(/\{cong_number_suffix\}/g, congNumber ? ` (${congNumber})` : '')
      .replace(/\{start_date\}/g, deFormatDate(entry?.start))
      .replace(/\{end_date\}/g, deFormatDate(entry?.end))
      .replace(/\{today\}/g, deFormatDate(new Date()))
      .replace(/\{sender\}/g, app.shared.sender().name || '')
      .replace(/\{contact_name\}/g, event?.contactName || '');
  }

  function deVisitFormTranslateDom(root) {
    if (!root) return;
    const map = new Map([
      ['Тип', 'Art'],
      ['День', 'Tag'],
      ['Время', 'Uhrzeit'],
      ['Место', 'Ort'],
      ['Место проведения', 'Ort'],
      ['С кем (имя / телефон)', 'Mit wem (Name / Telefon)'],
      ['С кем (имя/тел.)', 'Mit wem (Name/Telefon)'],
      ['Вид служения', 'Art des Predigtdienstes'],
      ['Имя', 'Name'],
      ['Причина пастырского посещения', 'Grund für den Hirtenbesuch'],
      ['Кто принимает', 'Gastgeber'],
      ['Телефон', 'Telefon'],
      ['Примечание', 'Notiz'],
      ['Удалить', 'Löschen'],
    ]);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const raw = node.nodeValue || '';
      const trimmed = raw.trim();
      if (!map.has(trimmed)) continue;
      node.nodeValue = raw.replace(trimmed, map.get(trimmed));
    }
    root.querySelectorAll('option[value]').forEach((opt) => {
      const key = opt.value;
      if (DE_VP_DICT[key]) opt.textContent = DE_VP_DICT[key];
    });
  }

  function dePlainParagraphs(html) {
    const holder = document.createElement('div');
    holder.innerHTML = String(html || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h[1-6])>/gi, '\n\n');
    return (holder.textContent || '')
      .split(/\n\s*\n/g)
      .map((p) => p.trim())
      .filter(Boolean);
  }

  function buildGermanLetterPdf(app, entry, event, draftOverride) {
    if (!window.jspdf) {
      app.utils.toast(app.utils.t('pdf_not_loaded'));
      return null;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const FONT = 'Aptos';
    const hasRegular = !!window.APTOS_REGULAR_B64;
    const hasBold = !!window.APTOS_BOLD_B64;

    if (hasRegular) {
      doc.addFileToVFS('Aptos.ttf', window.APTOS_REGULAR_B64);
      doc.addFont('Aptos.ttf', FONT, 'normal');
    }
    if (hasBold) {
      doc.addFileToVFS('Aptos-Bold.ttf', window.APTOS_BOLD_B64);
      doc.addFont('Aptos-Bold.ttf', FONT, 'bold');
    }

    const margin = 54;
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const bottom = pageH - 58;
    const usable = pageW - margin * 2;
    let y = margin;

    const setFont = (bold = false, size = 11, color = [30, 34, 44]) => {
      doc.setFont(hasRegular ? FONT : 'helvetica', bold && hasBold ? 'bold' : 'normal');
      doc.setFontSize(size);
      doc.setTextColor(...color);
    };

    const drawHeader = () => {
      setFont(false, 9.5, [60, 64, 74]);
      const s = app.shared.sender();
      const lines = [s.name, s.address, s.phone1, s.email].filter(Boolean);
      let hy = margin;
      lines.forEach((line) => {
        doc.text(String(line), pageW - margin, hy, { align: 'right' });
        hy += 13;
      });
      setFont();
      y = Math.max(y, hy + 18);
    };

    const ensure = (need = 30) => {
      if (y + need <= bottom) return;
      doc.addPage();
      y = margin;
      drawHeader();
    };

    const paragraph = (text, opts = {}) => {
      const size = opts.size || 11;
      const gap = opts.gap ?? 13;
      const bold = !!opts.bold;
      const align = opts.align || 'left';
      setFont(bold, size, opts.color || [30, 34, 44]);
      const lines = doc.splitTextToSize(String(text || ''), usable);
      ensure(lines.length * (size + 3) + gap + 8);
      if (align === 'center') {
        lines.forEach((line) => {
          doc.text(line, pageW / 2, y, { align: 'center' });
          y += size + 3;
        });
      } else {
        doc.text(lines, margin, y);
        y += lines.length * (size + 3);
      }
      y += gap;
    };

    drawHeader();

    const suffix = deLetterSuffix(app, event?.visitType);
    paragraph(deSubstitute(app, DE_SALUTATIONS[suffix], entry, event), { bold: true, size: 11.5, gap: 4 });
    setFont(false, 10.5);
    doc.text(deFormatDate(new Date()), pageW - margin, y, { align: 'right' });
    y += 24;

    paragraph('Liebe Brüder!', { bold: true, gap: 10 });

    const bodyHtml = draftOverride?.bodyHtml || DE_LETTER_BODY;
    dePlainParagraphs(deSubstitute(app, bodyHtml, entry, event)).forEach((p) => paragraph(p, { gap: 11 }));

    paragraph('Wir freuen uns schon sehr auf die gemeinsame Zeit und senden euch herzliche brüderliche Grüße.', { gap: 16 });
    paragraph(`Euer ${app.shared.sender().name || ''}`, { bold: true, gap: 0 });

    const configured = draftOverride?.pages ?? (app.state.app.settings.letterPages?.[suffix] || []);
    const hasCyrillic = (value) => /[\u0400-\u04FF]/.test(String(value || ''));
    let pages = configured;
    if (Array.isArray(configured) && configured.some((p) => hasCyrillic(p?.title) || hasCyrillic(p?.html))) {
      pages = [DE_DEFAULT_MEMO];
    }

    (pages || []).forEach((page) => {
      doc.addPage();
      y = margin;
      drawHeader();
      if (page?.title) paragraph(deSubstitute(app, page.title, entry, event), { bold: true, size: 12.5, align: 'center', gap: 18 });
      dePlainParagraphs(deSubstitute(app, page?.html || '', entry, event)).forEach((p) => paragraph(p, { size: 10.2, gap: 9 }));
    });

    const total = doc.internal.getNumberOfPages();
    for (let n = 1; n <= total; n += 1) {
      doc.setPage(n);
      setFont(false, 8.5, [100, 104, 112]);
      doc.text(`Seite ${n} / ${total}`, pageW - margin, pageH - 28, { align: 'right' });
    }
    return doc;
  }

  // Deutsch также доступен как независимый язык ДОКУМЕНТА.
  ['eventFormLanguageSelect', 'vfLanguageSelect'].forEach((id) => {
    const select = document.getElementById(id);
    if (!select || select.querySelector('option[value="de"]')) return;
    const option = document.createElement('option');
    option.value = 'de';
    option.textContent = 'Deutsch';
    select.appendChild(option);
  });

  if (typeof window.CWKlindariyRegisterPreInitHook !== 'function') {
    console.error('circuit-planner/i18n/runtime.js: pre-init hook API недоступен');
    return;
  }

  window.CWKlindariyRegisterPreInitHook(function installGermanDocumentRuntime(app) {
    if (app && app.ui) {
      const originalRetranslateVisitFormWeekdays = app.ui.retranslateVisitFormWeekdays?.bind(app.ui);
      if (originalRetranslateVisitFormWeekdays) {
        app.ui.retranslateVisitFormWeekdays = function (oldLang, newLang) {
          const state = app.state.visitFormData;
          if (!state) return;
          const deDays = {
            Понедельник: 'Montag', Вторник: 'Dienstag', Среда: 'Mittwoch',
            Четверг: 'Donnerstag', Пятница: 'Freitag', Суббота: 'Samstag', Воскресенье: 'Sonntag'
          };
          const ruDays = {
            Montag: 'Понедельник', Dienstag: 'Вторник', Mittwoch: 'Среда',
            Donnerstag: 'Четверг', Freitag: 'Пятница', Samstag: 'Суббота', Sonntag: 'Воскресенье'
          };

          if (newLang === 'de') {
            // Сначала используем существующий нормализатор для известных языков,
            // затем переводим стабильные русские названия дней на немецкие.
            originalRetranslateVisitFormWeekdays(oldLang, 'ru');
            (state.servicePlan || []).forEach((day) => {
              if (deDays[day.label]) day.label = deDays[day.label];
            });
            return;
          }

          if (oldLang === 'de') {
            (state.servicePlan || []).forEach((day) => {
              if (ruDays[day.label]) day.label = ruDays[day.label];
            });
            originalRetranslateVisitFormWeekdays('ru', newLang);
            return;
          }

          originalRetranslateVisitFormWeekdays(oldLang, newLang);
        };
      }

      const originalRenderVisitFormLists = app.ui.renderVisitFormLists?.bind(app.ui);
      if (originalRenderVisitFormLists) {
        app.ui.renderVisitFormLists = function () {
          const result = originalRenderVisitFormLists();
          if (app.state.visitFormData?.language === 'de') {
            deVisitFormTranslateDom(app.els.vfMeetingsList);
            deVisitFormTranslateDom(app.els.vfServiceDaysList);
            deVisitFormTranslateDom(app.els.vfPastoralList);
            deVisitFormTranslateDom(app.els.vfMealsList);
          }
          return result;
        };
      }

      const originalRenderVisitFormLanguageReminder = app.ui.renderVisitFormLanguageReminder?.bind(app.ui);
      if (originalRenderVisitFormLanguageReminder) {
        app.ui.renderVisitFormLanguageReminder = function () {
          const lang = app.state.visitFormData?.language || 'ru';
          const interfaceLang = app.state.app?.settings?.language || 'ru';
          if (lang === 'de' || interfaceLang === 'de') {
            if (!app.els.vfLanguageReminder) return;
            const langName = DE_NATIVE_LANG_NAMES[lang] || lang;
            app.els.vfLanguageReminder.innerHTML = app.utils.t('vf_language_note', {
              lang: app.utils.escapeHtml(langName)
            });
            return;
          }
          return originalRenderVisitFormLanguageReminder();
        };
      }

      const originalBuildVisitPdfDoc = app.ui.buildVisitPdfDoc?.bind(app.ui);
      if (originalBuildVisitPdfDoc) {
        app.ui.buildVisitPdfDoc = function () {
          const state = app.state.visitFormData;
          if (state?.language !== 'de') return originalBuildVisitPdfDoc();
          if (typeof window.PdfGenerator === 'undefined' || !window.jspdf) {
            app.utils.toast(app.utils.t('pdf_not_loaded'));
            return null;
          }
          return window.PdfGenerator.generate(state, DE_VPI);
        };
      }

      const originalOpenLetterModal = app.ui.openLetterModal?.bind(app.ui);
      if (originalOpenLetterModal) {
        app.ui.openLetterModal = function (itemId) {
          const result = originalOpenLetterModal(itemId);
          const entry = app.state.app.entries.find((e) => e.id === app.state.letterEntryId);
          const event = entry ? app.data.getEventById(entry.eventId) : null;
          const lang = event?.formLanguage || app.shared.docLang() || '';
          if (entry && event && lang === 'de') {
            const suffix = deLetterSuffix(app, event.visitType);
            if (app.els.letterEmailBodyInput && !entry.emailBody) {
              app.els.letterEmailBodyInput.value = deSubstitute(app, DE_EMAIL_BODY_TEMPLATES[suffix], entry, event);
            }
            if (app.els.letterSubjectInput && !entry.subject && app.ui.buildLetterSubject) {
              app.els.letterSubjectInput.value = app.ui.buildLetterSubject(entry, event);
            }
          }
          return result;
        };
      }

      const originalBuildLetterPdfDoc = app.ui.buildLetterPdfDoc?.bind(app.ui);
      if (originalBuildLetterPdfDoc) {
        app.ui.buildLetterPdfDoc = function (entry, event, draftOverride) {
          const lang = event?.formLanguage || app.shared.docLang() || '';
          if (lang !== 'de') return originalBuildLetterPdfDoc(entry, event, draftOverride);
          return buildGermanLetterPdf(app, entry, event, draftOverride);
        };
      }

      // Кнопка «сбросить текст e-mail к стандартному» в app.js знает только
      // старые четыре языка. Для de перехватываем её в capture-фазе после init().
      setTimeout(() => {
        const btn = app.els.letterEmailBodyResetToDefaultBtn;
        if (!btn || btn.dataset.deDocumentResetInstalled === '1') return;
        btn.dataset.deDocumentResetInstalled = '1';
        btn.addEventListener('click', (eventClick) => {
          const entry = app.state.app.entries.find((e) => e.id === app.state.letterEntryId);
          const event = entry ? app.data.getEventById(entry.eventId) : null;
          const lang = event?.formLanguage || app.shared.docLang() || '';
          if (!entry || !event || lang !== 'de') return;
          eventClick.preventDefault();
          eventClick.stopImmediatePropagation();
          const suffix = deLetterSuffix(app, event.visitType);
          const fresh = deSubstitute(app, DE_EMAIL_BODY_TEMPLATES[suffix], entry, event);
          if (app.els.letterEmailBodyInput) app.els.letterEmailBodyInput.value = fresh;
          entry.emailBody = fresh;
          app.store.save();
          app.utils.toast(app.utils.t('letter_reset_done'));
        }, true);
      }, 0);
    }


    if (app && app.ui) {
      installVisibleI18nAudit(app);
    }
  });
})();
