const { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle, LevelFormat, TabStopPosition, TabStopType } = require('docx');

const C_DARK    = '0E1A14';
const C_GREEN   = '3DD68C';
const C_GREEN_D = '28B874';
const C_MUTED   = '6B8F7A';
const C_GRAY    = 'AAAAAA';

// Parse plain text CV into structured blocks
function parseCVText(text) {
  const rawLines = text.split('\n').map(l => l.trim()).filter(l => l);

  let name    = '';
  let contact = '';
  const sections = [];
  let currentSection = null;

  for (const line of rawLines) {
    if (!name) { name = line; continue; }
    if (!contact && (line.includes('@') || line.includes('·') || line.includes('|') || line.match(/\+\d/))) {
      contact = line; continue;
    }
    const isHeader = (
      line === line.toUpperCase() &&
      line.length > 2 &&
      !/^[•\-–]/.test(line) &&
      !/^\d/.test(line) &&
      !line.match(/^\d{4}/)
    );
    if (isHeader) {
      currentSection = { title: line, lines: [] };
      sections.push(currentSection);
    } else if (currentSection) {
      currentSection.lines.push(line);
    }
  }

  return { name, contact, sections };
}

function sectionHeader(title) {
  return new Paragraph({
    spacing: { before: 200, after: 60 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: 'E0E0E0', space: 4 }
    },
    children: [
      new TextRun({
        text: title.toUpperCase(),
        bold: true,
        size: 22,
        color: C_DARK,
        font: 'Calibri'
      }),
    ]
  });
}

function jobLine(line) {
  // Format: "Job Title | Company | Location | Dates" or "Job Title | Company | Dates"
  const parts = line.split('|').map(p => p.trim());
  const title = parts[0] || '';
  const rest  = parts.slice(1).join('  ·  ');

  return new Paragraph({
    spacing: { before: 100, after: 20 },
    children: [
      new TextRun({ text: title, bold: true, size: 20, color: C_DARK, font: 'Calibri' }),
      rest ? new TextRun({ text: '  ·  ' + rest, size: 19, color: C_MUTED, font: 'Calibri' }) : new TextRun('')
    ]
  });
}

function bulletParagraph(text) {
  const content = text.replace(/^[•\-–]\s*/, '');
  return new Paragraph({
    spacing: { before: 20, after: 20 },
    indent: { left: 240, hanging: 160 },
    children: [
      new TextRun({ text: '•  ', bold: true, size: 19, color: C_GREEN_D, font: 'Calibri' }),
      new TextRun({ text: content, size: 19, color: C_DARK, font: 'Calibri' }),
    ]
  });
}

function bodyParagraph(text) {
  return new Paragraph({
    spacing: { before: 20, after: 20 },
    children: [
      new TextRun({ text, size: 19, color: C_DARK, font: 'Calibri' })
    ]
  });
}

function spacer(before = 80) {
  return new Paragraph({ spacing: { before, after: 0 }, children: [new TextRun('')] });
}

async function generateOptimizedDocx(resultData) {
  const { name, contact, sections } = parseCVText(resultData.cv_optimizado || '');

  const children = [];

  // ── NAME ─────────────────────────────────────────────────────────────
  children.push(new Paragraph({
    spacing: { before: 0, after: 40 },
    children: [
      new TextRun({
        text: name.toUpperCase(),
        bold: true,
        size: 38,
        color: C_DARK,
        font: 'Calibri'
      })
    ]
  }));

  // Green accent line under name
  children.push(new Paragraph({
    spacing: { before: 0, after: 60 },
    border: { bottom: { style: BorderStyle.THICK, size: 12, color: C_GREEN, space: 1 } },
    children: [new TextRun({ text: '', size: 4 })]
  }));

  // ── CONTACT ──────────────────────────────────────────────────────────
  if (contact) {
    children.push(new Paragraph({
      spacing: { before: 60, after: 100 },
      children: [
        new TextRun({ text: contact, size: 18, color: C_MUTED, font: 'Calibri' })
      ]
    }));
  }

  // ── SECTIONS ─────────────────────────────────────────────────────────
  for (const section of sections) {
    children.push(sectionHeader(section.title));

    for (const line of section.lines) {
      if (!line.trim()) { children.push(spacer(30)); continue; }

      const isBullet  = /^[•\-–]/.test(line);
      const isJobLine = line.includes(' | ') || (line.includes('|') && line.match(/\d{4}/));

      if (isBullet) {
        children.push(bulletParagraph(line));
      } else if (isJobLine) {
        children.push(jobLine(line));
      } else {
        children.push(bodyParagraph(line));
      }
    }
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 20, color: C_DARK }
        }
      }
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4 in twentieths of a point
          margin: { top: 720, right: 900, bottom: 720, left: 900 } // ~2.5cm
        }
      },
      children
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

module.exports = { generateOptimizedDocx };
