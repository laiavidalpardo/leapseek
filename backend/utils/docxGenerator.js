const { Document, Packer, Paragraph, TextRun, Tab, TabStopType, BorderStyle, LevelFormat, AlignmentType } = require('docx');

// ── Paleta y medidas, clonadas de CV_plantilla.docx ──────────────────────────
const FONT     = 'Arial';
const C_ACCENT = '1A5276'; // azul de la plantilla (nombre, títulos, empresas)
const C_BLACK  = '000000'; // texto y roles
const C_MUTED  = '666666'; // gris: contacto, fechas, ubicación

const MARGIN     = 1080;              // 0.75" como la plantilla
const PAGE_W     = 11906;             // A4
const RIGHT_TAB  = PAGE_W - MARGIN * 2; // tope para alinear fechas a la derecha

const LABELS = {
  es: { summary: 'RESUMEN PROFESIONAL', experience: 'EXPERIENCIA PROFESIONAL', skills: 'COMPETENCIAS', education: 'FORMACIÓN', languages: 'IDIOMAS' },
  en: { summary: 'PROFESSIONAL SUMMARY', experience: 'PROFESSIONAL EXPERIENCE', skills: 'CORE SKILLS', education: 'EDUCATION', languages: 'LANGUAGES' }
};

function clean(t) {
  return (t || '').replace(/\*\*/g, '').replace(/`/g, '').trim();
}

function run(text, opts = {}) {
  return new TextRun({ text: clean(text), font: FONT, size: opts.size || 20, color: opts.color || C_BLACK, bold: !!opts.bold, italics: !!opts.italics });
}

// Título de sección: azul, negrita, MAYÚSCULAS, con línea inferior
function sectionHeader(title) {
  return new Paragraph({
    spacing: { before: 280, after: 100 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: C_ACCENT, space: 4 } },
    children: [run(title.toUpperCase(), { bold: true, size: 24, color: C_ACCENT })]
  });
}

function bullet(text) {
  return new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    spacing: { before: 50, after: 50 },
    children: [run(text.replace(/^[•\-–*]\s*/, ''), { size: 20 })]
  });
}

// Línea de puesto: "Rol  |  Empresa   [tab→]   Fechas"
// before: 180 (separación con la experiencia anterior). after: gapAfter (60 hacia los bullets si no hay ubicación).
function jobLine(role, company, dates, gapAfter) {
  const kids = [run(role, { bold: true, size: 22 })];
  if (company) {
    kids.push(run('  |  ', { color: C_MUTED, size: 20 }));
    kids.push(run(company, { bold: true, size: 20, color: C_ACCENT }));
  }
  if (dates) {
    kids.push(new TextRun({ children: [new Tab()] }));
    kids.push(run(dates, { italics: true, size: 18, color: C_MUTED }));
  }
  return new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
    spacing: { before: 180, after: gapAfter },
    children: kids
  });
}

// Ubicación en cursiva gris. after: 60 (separación hacia los bullets).
function locationLine(text) {
  return new Paragraph({ spacing: { before: 0, after: 60 }, children: [run(text, { italics: true, size: 18, color: C_MUTED })] });
}

// ── Render desde CV estructurado ─────────────────────────────────────────────
function renderStructured(cv, lang) {
  const L = LABELS[lang && lang.toLowerCase().startsWith('esp') ? 'es' : 'en'];
  const children = [];

  // Nombre
  children.push(new Paragraph({ spacing: { before: 0, after: 40 }, children: [run(cv.name, { bold: true, size: 44, color: C_ACCENT })] }));

  // Tagline (primera parte en negrita, resto normal)
  if (cv.tagline) {
    const parts = clean(cv.tagline).split('|').map(s => s.trim());
    const kids = [];
    parts.forEach((p, i) => {
      if (i > 0) kids.push(run('  |  ', { size: 22, color: C_MUTED }));
      kids.push(run(p, { size: 22, color: C_MUTED, bold: i === 0 }));
    });
    children.push(new Paragraph({ spacing: { before: 0, after: 60 }, children: kids }));
  }

  // Contacto (240 twips de aire tras el header)
  if (cv.contact) {
    children.push(new Paragraph({ spacing: { before: 0, after: 240 }, children: [run(cv.contact, { size: 18, color: C_MUTED })] }));
  }

  // Resumen
  if (cv.summary) {
    children.push(sectionHeader(L.summary));
    children.push(new Paragraph({ spacing: { before: 40, after: 40 }, children: [run(cv.summary, { size: 20 })] }));
  }

  // Experiencia
  if (Array.isArray(cv.experience) && cv.experience.length) {
    children.push(sectionHeader(L.experience));
    for (const job of cv.experience) {
      const hasLoc = !!job.location;
      // 60 twips entre el título del puesto y sus bullets: va tras la ubicación, o tras el puesto si no hay.
      children.push(jobLine(job.role || '', job.company || '', job.dates || '', hasLoc ? 0 : 60));
      if (hasLoc) children.push(locationLine(job.location));
      for (const b of (job.bullets || [])) children.push(bullet(b));
    }
  }

  // Competencias (por categorías)
  if (Array.isArray(cv.skills) && cv.skills.length) {
    children.push(sectionHeader(L.skills));
    for (const grp of cv.skills) {
      if (grp && grp.category) {
        children.push(new Paragraph({
          spacing: { before: 40, after: 40 },
          children: [ run(grp.category + ':  ', { bold: true, size: 20 }), run(grp.items || '', { size: 20 }) ]
        }));
      } else if (typeof grp === 'string') {
        children.push(new Paragraph({ spacing: { before: 40, after: 40 }, children: [run(grp, { size: 20 })] }));
      }
    }
  }

  // Educación
  if (Array.isArray(cv.education) && cv.education.length) {
    children.push(sectionHeader(L.education));
    for (const ed of cv.education) {
      const kids = [run(ed.degree || '', { bold: true, size: 20 })];
      if (ed.school) { kids.push(new TextRun({ children: [new Tab()] })); kids.push(run(ed.school, { size: 18, color: C_MUTED })); }
      children.push(new Paragraph({ tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }], spacing: { before: 40, after: 20 }, children: kids }));
      if (ed.dates) children.push(locationLine(ed.dates));
    }
  }

  // Idiomas
  if (cv.languages) {
    children.push(sectionHeader(L.languages));
    children.push(new Paragraph({ spacing: { before: 40, after: 40 }, children: [run(cv.languages, { size: 20 })] }));
  }

  return children;
}

// ── Fallback: si aún llega texto plano (formato antiguo) ──────────────────────
function renderPlainText(text) {
  const lines = (text || '').split('\n').map(l => l.trim()).filter(l => l);
  const children = [];
  if (lines.length) children.push(new Paragraph({ spacing: { after: 40 }, children: [run((lines.shift() || '').toUpperCase(), { bold: true, size: 44, color: C_ACCENT })] }));
  for (const line of lines) {
    if (/^[•\-–*]/.test(line)) children.push(bullet(line));
    else if (line === line.toUpperCase() && line.length > 2) children.push(sectionHeader(line));
    else children.push(new Paragraph({ spacing: { before: 20, after: 20 }, children: [run(line, { size: 20 })] }));
  }
  return children;
}

async function generateOptimizedDocx(resultData, language) {
  const children = (resultData.cv && typeof resultData.cv === 'object')
    ? renderStructured(resultData.cv, language)
    : renderPlainText(resultData.cv_optimizado || '');

  const doc = new Document({
    numbering: {
      config: [{
        reference: 'bullets',
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: '•',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 360, hanging: 200 } } }
        }]
      }]
    },
    styles: { default: { document: { run: { font: FONT, size: 20, color: C_BLACK } } } },
    sections: [{
      properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN } } },
      children
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

module.exports = { generateOptimizedDocx };
