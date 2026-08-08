// documents-i18n.js — документная локализация PDF Школы пионеров.
// Никаких изменений схемы данных: переводятся только видимые подписи/тексты.
(function (global) {
  'use strict';

  const D = global.PSDocLang;
  if (!D) return;

  const pdf = global.PdfExport;
  if (pdf) {
    // Для печатного бланка используем уже существующий PDF_FORM_FONT_B64:
    // он содержит Latin + Latin Extended (PL/DE) + кириллицу.
    pdf._ensureCyrillicFont = function (doc) {
      if (doc.__psDocumentFontLoaded) return;
      const fontB64 = global.PDF_FORM_FONT_B64 || global.PDF_FONT_DEJAVU_SANS;
      if (!fontB64) throw new Error('Шрифт для PDF-бланка не загрузился.');
      doc.addFileToVFS('DejaVuSans.ttf', fontB64);
      doc.addFont('DejaVuSans.ttf', 'DejaVuSans', 'normal');
      doc.__psDocumentFontLoaded = true;
    };

    // Разрешаем Latin Extended: ł, ż, ą, ć, ń, ó, ś, ź, ä, ö, ü, ß и т. п.
    pdf._sanitizeForFont = function (str) {
      return String(str ?? '').replace(/[^\x20-\x7E\u00A0-\u024F\u0400-\u04FF\u2010-\u2026]/g, '-');
    };

    pdf._formatDateRu = function (value) {
      if (!value) return '';
      const date = new Date(value);
      if (isNaN(date.getTime())) return String(value);
      return date.toLocaleDateString(D.locale(), { year: 'numeric', month: 'long', day: 'numeric' });
    };

    pdf._regLabels = function () {
      return {
        yesNo: {
          yes: D.t('doc.ps.registration.option.yes', null, 'Yes'),
          no: D.t('doc.ps.registration.option.no', null, 'No')
        },
        language: {
          ru: D.t('doc.ps.registration.option.language.ru', null, 'Russian'),
          uk: D.t('doc.ps.registration.option.language.uk', null, 'Ukrainian'),
          pl: D.t('doc.ps.registration.option.language.pl', null, 'Polish'),
          de: D.t('doc.ps.registration.option.language.de', null, 'German'),
          other: D.t('doc.ps.registration.option.language.other', null, 'Other')
        },
        format: {
          print: D.t('doc.ps.registration.option.format.print', null, 'Printed copy'),
          jwpub: D.t('doc.ps.registration.option.format.jwpub', null, 'JWPub'),
          pdf: 'PDF',
          epub: 'EPUB'
        }
      };
    };

    pdf.buildRegistrationLines = function (record, config = {}) {
      const L = this._regLabels();
      const language = record.language === 'other'
        ? (record.languageOther || L.language.other)
        : (L.language[record.language] || record.language || '');
      const formats = (record.format || []).map((f) => L.format[f] || f).join(', ');
      const date = this._formatDateRu(record.submittedAt || new Date().toISOString());

      const lines = [
        D.t('doc.ps.registration.submitted_date', { date }, `Date: ${date}`),
        '',
        `${D.t('doc.ps.registration.field.lastName', null, 'Last name')}: ${record.lastName || '—'}`,
        `${D.t('doc.ps.registration.field.firstName', null, 'First name')}: ${record.firstName || '—'}`,
        `${D.t('doc.ps.registration.field.address', null, 'Address')}: ${record.address || '—'}`,
        `${D.t('doc.ps.registration.field.email', null, 'Email')}: ${record.email || '—'}`,
        `${D.t('doc.ps.registration.field.phone', null, 'Phone')}: ${record.phone || '—'}`,
        '',
        `${D.t('doc.ps.registration.answer_attendance', null, 'Attendance')}: ${L.yesNo[record.attending] || '—'}`
      ];
      if (record.attending === 'no') {
        lines.push(`${D.t('doc.ps.registration.reason', null, 'Reason')}: ${record.attendReason || '—'}`);
      }
      lines.push(
        `${D.t('doc.ps.registration.answer_transport', null, 'Transport')}: ${L.yesNo[record.transport] || '—'}`,
        `${D.t('doc.ps.registration.answer_lodging', null, 'Accommodation')}: ${L.yesNo[record.lodging] || '—'}`,
        '',
        `${D.t('doc.ps.registration.answer_language', null, 'Textbook language')}: ${language || '—'}`,
        `${D.t('doc.ps.registration.answer_format', null, 'Textbook format')}: ${formats || '—'}`,
        '',
        `${D.t('doc.ps.registration.answer_notes', null, 'Additional information')}: ${record.notes || '—'}`
      );

      if (config.deadline) {
        lines.push('', D.t('doc.ps.registration.deadline', { date: this._formatDateRu(config.deadline) }));
      }
      if (config.email) lines.push(`${D.t('doc.ps.registration.email', null, 'Email')}: ${config.email}`);
      if (config.whatsapp) lines.push(`${D.t('doc.ps.registration.whatsapp', null, 'WhatsApp')}: ${config.whatsapp}`);
      return lines;
    };

    pdf.downloadRegistrationFormulaire = async function (record, config = {}) {
      const title = config.title || D.t('doc.ps.registration.title');
      const doc = await this.buildDocument(title, this.buildRegistrationLines(record, config));
      const namePart = `${record.lastName || ''}-${record.firstName || ''}`
        .trim().replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '-');
      doc.save(`registration-${namePart || 'student'}.pdf`);
    };

    pdf.downloadRegistrationBlankForm = async function (config = {}) {
      const jsPDF = this._requireJsPdf();
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      this._ensureCyrillicFont(doc);

      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      const left = 40;
      const right = W - 40;
      const width = right - left;
      let y = 48;

      const ensure = (need) => {
        if (y + need <= H - 42) return;
        doc.addPage();
        this._ensureCyrillicFont(doc);
        y = 48;
      };

      const text = (value, size = 10.5, color = 20, maxWidth = width) => {
        doc.setFont('DejaVuSans');
        doc.setFontSize(size);
        doc.setTextColor(color);
        const lines = doc.splitTextToSize(this._sanitizeForFont(value), maxWidth);
        ensure(lines.length * (size + 3) + 4);
        doc.text(lines, left, y);
        y += lines.length * (size + 3);
        return lines;
      };

      const section = (id) => {
        ensure(32);
        y += 6;
        text(D.t(`doc.ps.registration.section.${id}`), 12.5, 20);
        doc.setDrawColor(200);
        doc.line(left, y - 7, right, y - 7);
        y += 5;
      };

      const lineField = (key) => {
        ensure(28);
        doc.setFont('DejaVuSans');
        doc.setFontSize(10.5);
        doc.setTextColor(20);
        const label = this._sanitizeForFont(D.t(`doc.ps.registration.field.${key}`));
        doc.text(label + ':', left, y);
        const labelWidth = Math.min(doc.getTextWidth(label + ':') + 10, 235);
        doc.setDrawColor(140);
        doc.line(left + labelWidth, y + 2, right, y + 2);
        y += 23;
      };

      const question = (key) => {
        text(D.t(`doc.ps.registration.field.${key}`), 10.5, 20);
        y += 2;
      };

      const checkbox = (x, label) => {
        const box = 9;
        doc.setDrawColor(90);
        doc.rect(x, y - box + 2, box, box);
        doc.setFont('DejaVuSans');
        doc.setFontSize(10);
        doc.setTextColor(20);
        doc.text(this._sanitizeForFont(label), x + box + 4, y);
      };

      const yes = () => D.t('doc.ps.registration.option.yes');
      const no = () => D.t('doc.ps.registration.option.no');

      doc.setFont('DejaVuSans');
      doc.setFontSize(17);
      doc.setTextColor(20);
      const title = config.title || D.t('doc.ps.registration.title');
      const titleLines = doc.splitTextToSize(this._sanitizeForFont(title), width);
      doc.text(titleLines, left, y);
      y += titleLines.length * 20 + 5;

      text(D.t('doc.ps.registration.header_print'), 10, 80);
      y += 4;

      section('personal');
      lineField('lastName');
      lineField('firstName');
      lineField('address');
      lineField('email');
      lineField('phone');

      section('attendance');
      question('attending');
      checkbox(left, yes());
      checkbox(left + 105, no());
      y += 22;
      lineField('attendReason');

      section('transport');
      question('transport');
      checkbox(left, yes());
      checkbox(left + 105, no());
      y += 22;

      section('lodging');
      question('lodging');
      checkbox(left, yes());
      checkbox(left + 105, no());
      y += 22;

      section('textbook');
      question('language');
      const langItems = [
        ['ru', left], ['uk', left + 105], ['pl', left + 220]
      ];
      langItems.forEach(([code, x]) => checkbox(x, D.t(`doc.ps.registration.option.language.${code}`)));
      y += 22;
      checkbox(left, D.t('doc.ps.registration.option.language.de'));
      checkbox(left + 105, D.t('doc.ps.registration.option.language.other'));
      doc.setDrawColor(140);
      doc.line(left + 245, y + 2, right, y + 2);
      y += 25;

      question('format');
      checkbox(left, D.t('doc.ps.registration.option.format.print'));
      checkbox(left + 150, D.t('doc.ps.registration.option.format.jwpub'));
      checkbox(left + 300, 'PDF');
      checkbox(left + 370, 'EPUB');
      y += 25;

      section('extra');
      question('notes');
      for (let i = 0; i < 3; i++) {
        ensure(22);
        doc.setDrawColor(140);
        doc.line(left, y + 2, right, y + 2);
        y += 20;
      }

      ensure(120);
      y += 4;
      doc.setDrawColor(210);
      doc.line(left, y, right, y);
      y += 18;
      text(D.t('doc.ps.registration.closing'), 10, 70);

      const fallback = D.t('doc.ps.registration.fallback_contact');
      const deadline = config.deadline ? this._formatDateRu(config.deadline) : fallback;
      text(D.t('doc.ps.registration.deadline', { date: deadline }), 10.5, 20);
      text(D.t('doc.ps.registration.send_to'), 10.5, 20);
      text(`- ${D.t('doc.ps.registration.email')}: ${config.email || fallback}`, 10, 50);
      text(`- ${D.t('doc.ps.registration.whatsapp')}: ${config.whatsapp || config.phone || fallback}`, 10, 50);

      doc.save('registration-blank-form.pdf');
    };

    pdf.downloadS253 = async function (data) {
      const lines = [
        D.t('doc.ps.s253.page1'),
        ...(data.notAttendedFromList || []).map((s) =>
          `  ${s.name} — ${s.reason || D.t('doc.ps.s253.no_comment')}`),
        '',
        D.t('doc.ps.s253.page2'),
        ...(data.attendedNotOnList || []).map((s) =>
          `  ${s.name} — ${s.congregation || ''}`)
      ];
      const doc = await this.buildDocument(D.t('doc.ps.s253.title'), lines);
      doc.save('s253-report.pdf');
    };
  }

  const form = global.PdfFormExport;
  if (form) {
    const originalGenerate = form.generate.bind(form);

    form.generate = function (config, schema) {
      return originalGenerate(config, D.localizeRegistrationSchema(schema));
    };

    form._fmtDate = function (iso) {
      if (!iso) return null;
      const date = new Date(iso);
      if (isNaN(date.getTime())) return iso;
      return date.toLocaleDateString(D.locale(), { year: 'numeric', month: 'long', day: 'numeric' });
    };

    form._drawHeader = function (state, config) {
      const contentWidth = this.PAGE_W - this.MARGIN * 2;
      const title = config.title || D.t('doc.ps.registration.title');
      this._wrapLines(state, title, 17, contentWidth).forEach((line) => {
        this._text(state, line, { size: 17 });
        state.y -= 21;
      });
      state.y -= 4;
      this._wrapLines(state, D.t('doc.ps.registration.header_interactive'), 10.5, contentWidth)
        .forEach((line) => {
          this._text(state, line, { size: 10.5, color: 0.42 });
          state.y -= 13;
        });
      state.y -= 10;

      if (config.extraInstructions && config.extraInstructions.trim()) {
        this._wrapLines(state, config.extraInstructions.trim(), 10.5, contentWidth).forEach((line) => {
          this._ensureSpace(state, 20);
          this._text(state, line, { size: 10.5, color: 0.25 });
          state.y -= 13;
        });
        state.y -= 8;
      }
    };

    form._drawField = function (state, field) {
      const contentWidth = this.PAGE_W - this.MARGIN * 2;

      let label = field.label || '';
      if (field.showIf) {
        const parentLabel = D.labelForValue(field.showIf.field, field.showIf.equals, field.showIf.equals);
        label = `${label} (${D.t('doc.ps.registration.only_if', { value: parentLabel })})`;
      }
      if (field.required) label += ' *';

      if (field.type === 'radio' || field.type === 'checkboxes') {
        this._ensureSpace(state, 46);
        this._wrapLines(state, label, 11, contentWidth).forEach((line) => {
          this._text(state, line, { size: 11 });
          state.y -= 14;
        });
        state.y -= 4;
        this._drawOptions(state, field);
        state.y -= 10;
        return;
      }

      const isFull = field.pdfWidth === 'full' || field.type === 'textarea';
      const lines = field.pdfLines || 1;
      const boxHeight = field.type === 'textarea' ? 16 * lines : 18;
      this._ensureSpace(state, boxHeight + 34);

      this._wrapLines(state, label, 11, contentWidth).forEach((line) => {
        this._text(state, line, { size: 11 });
        state.y -= 14;
      });
      state.y -= 2;

      const width = isFull ? contentWidth : Math.min(300, contentWidth);
      const tf = state.form.createTextField(this._fieldName(field.key));
      if (field.type === 'textarea') tf.enableMultiline();
      tf.addToPage(state.page, {
        x: this.MARGIN,
        y: state.y - boxHeight + 12,
        width,
        height: boxHeight,
        font: state.font,
        borderWidth: 0.7,
        borderColor: state.rgb(0.62, 0.6, 0.55),
        backgroundColor: state.rgb(0.99, 0.985, 0.97)
      });
      tf.setFontSize(11);
      state.fieldCount++;
      state.y -= boxHeight + 14;

      if (field.hint) {
        this._ensureSpace(state, 18);
        this._wrapLines(state, field.hint, 9, contentWidth).forEach((line) => {
          this._text(state, line, { size: 9, color: 0.5 });
          state.y -= 11;
        });
        state.y -= 4;
      }
    };

    // Экспортное значение радиокнопки — стабильный код (yes/no/ru/uk...),
    // а видимая подпись — перевод. Язык документа больше не меняет данные.
    form._drawOptions = function (state, field) {
      const box = 12;
      const gap = 16;
      let x = this.MARGIN;
      const maxX = this.PAGE_W - this.MARGIN;

      let radioGroup = null;
      if (field.type === 'radio') {
        radioGroup = state.form.createRadioGroup(this._fieldName(field.key));
      }

      field.options.forEach((opt) => {
        const labelWidth = state.font.widthOfTextAtSize(opt.label, 10.5);
        const itemWidth = box + 5 + labelWidth + gap;
        if (x + itemWidth > maxX) {
          x = this.MARGIN;
          state.y -= 22;
          this._ensureSpace(state, 26);
        }

        if (field.type === 'radio') {
          radioGroup.addOptionToPage(String(opt.value), state.page, {
            x, y: state.y - 2, width: box, height: box,
            borderWidth: 0.7, borderColor: state.rgb(0.62, 0.6, 0.55),
            backgroundColor: state.rgb(0.99, 0.985, 0.97)
          });
        } else {
          const cb = state.form.createCheckBox(this._fieldName(field.key + '_' + opt.value));
          cb.addToPage(state.page, {
            x, y: state.y - 2, width: box, height: box,
            borderWidth: 0.7, borderColor: state.rgb(0.62, 0.6, 0.55),
            backgroundColor: state.rgb(0.99, 0.985, 0.97)
          });
        }
        state.fieldCount++;

        state.page.drawText(opt.label, {
          x: x + box + 5, y: state.y, size: 10.5,
          font: state.font, color: state.rgb(0.12, 0.12, 0.12)
        });
        x += itemWidth;
      });
      state.y -= 20;
    };

    form._drawClosing = function (state, config, schema) {
      const contentWidth = this.PAGE_W - this.MARGIN * 2;
      this._ensureSpace(state, 130);
      state.y -= 6;
      state.page.drawLine({
        start: { x: this.MARGIN, y: state.y },
        end: { x: this.PAGE_W - this.MARGIN, y: state.y },
        thickness: 0.7, color: state.rgb(0.82, 0.8, 0.75)
      });
      state.y -= 18;

      this._wrapLines(state, schema.closingText, 10.5, contentWidth).forEach((line) => {
        this._ensureSpace(state, 16);
        this._text(state, line, { size: 10.5, color: 0.3 });
        state.y -= 13;
      });
      state.y -= 8;

      const fallback = D.t('doc.ps.registration.fallback_contact');
      const deadline = this._fmtDate(config.deadline) || fallback;
      this._ensureSpace(state, 80);
      this._text(state, D.t('doc.ps.registration.deadline', { date: deadline }), { size: 11 });
      state.y -= 18;
      this._text(state, D.t('doc.ps.registration.send_to'), { size: 11 });
      state.y -= 15;

      const contacts = [
        [D.t('doc.ps.registration.email'), config.email],
        [D.t('doc.ps.registration.phone'), config.phone],
        [D.t('doc.ps.registration.whatsapp'), config.whatsapp || config.phone]
      ].filter(([, value]) => value && String(value).trim());

      if (!contacts.length) {
        this._text(state, `- ${fallback}`, { x: this.MARGIN + 10, size: 10.5, color: 0.35 });
        state.y -= 14;
      } else {
        contacts.forEach(([label, value]) => {
          this._ensureSpace(state, 16);
          this._text(state, `- ${label}: ${value}`, { x: this.MARGIN + 10, size: 10.5, color: 0.2 });
          state.y -= 14;
        });
      }
    };
  }
})(typeof self !== 'undefined' ? self : this);
