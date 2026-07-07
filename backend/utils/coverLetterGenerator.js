const { Document, Packer, Paragraph, TextRun } = require('docx');

// ── Paleta y medidas, clonadas de Coverletter_plantilla.docx ─────────────────
const FONT     = 'Arial';
const C_ACCENT = '1A5276'; // azul (nombre, Re, firma)
const C_BODY   = '111111'; // casi negro (saludo, cuerpo, cierre)
const C_MUTED  = '666666'; // gris (contacto, fecha)
const MARGIN   = 1440;     // 1 pulgada
const PAGE_W   = 11906;    // A4

// Normalización ATS + limpieza de markdown (igual criterio que el CV)
function clean(t) {
  return (t || '')
    .replace(/\*\*/g, '').replace(/`/g, '')
    .replace(/[\u2014\u2013]/g, '-')
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\u2026/g, '...')
    .replace(/\u200B/g, '')
    .replace(/\u00A0/g, ' ')
    .trim();
}

function run(text, opts = {}) {
  return new TextRun({ text: clean(text), font: FONT, size: opts.size || 21, color: opts.color || C_BODY, bold: !!opts.bold, italics: !!opts.italics });
}

function P(children, spacing) {
  return new Paragraph({ spacing, children: Array.isArray(children) ? children : [children] });
}

async function generateCoverLetterDocx(cover, name, contact) {
  const children = [];

  // Cabecera: nombre (azul, negrita) + contacto (gris)
  children.push(P(run(name, { bold: true, size: 40, color: C_ACCENT }), { after: 40 }));
  if (contact) children.push(P(run(contact, { size: 18, color: C_MUTED }), { after: 240 }));

  // Ciudad + fecha (cursiva gris)
  if (cover.city_date) children.push(P(run(cover.city_date, { italics: true, size: 19, color: C_MUTED }), { after: 240 }));

  // Re: puesto - empresa (azul, negrita)
  if (cover.re) children.push(P(run(cover.re, { bold: true, size: 22, color: C_ACCENT }), { after: 240 }));

  // Saludo
  if (cover.greeting) children.push(P(run(cover.greeting, { size: 21, color: C_BODY }), { after: 160 }));

  // Cuerpo (un párrafo por cada elemento)
  for (const par of (cover.paragraphs || [])) {
    children.push(P(run(par, { size: 21, color: C_BODY }), { after: 200 }));
  }

  // Cierre + firma
  if (cover.closing) children.push(P(run(cover.closing, { size: 21, color: C_BODY }), { before: 120, after: 40 }));
  children.push(P(run(name, { bold: true, size: 22, color: C_ACCENT }), { after: 20 }));
  if (contact) children.push(P(run(contact, { size: 18, color: C_MUTED }), {}));

  const doc = new Document({
    styles: { default: { document: { run: { font: FONT, size: 21, color: C_BODY } } } },
    sections: [{
      properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN } } },
      children
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

// Texto plano de la carta (para la vista previa y el botón de copiar en la web)
function coverToText(cover, name, contact) {
  if (!cover || typeof cover !== 'object') return '';
  const parts = [];
  if (cover.city_date) parts.push(cover.city_date, '');
  if (cover.re) parts.push(cover.re, '');
  if (cover.greeting) parts.push(cover.greeting, '');
  for (const par of (cover.paragraphs || [])) parts.push(par, '');
  if (cover.closing) parts.push(cover.closing);
  if (name) parts.push(name);
  if (contact) parts.push(contact);
  return parts.join('\n');
}

module.exports = { generateCoverLetterDocx, coverToText };
