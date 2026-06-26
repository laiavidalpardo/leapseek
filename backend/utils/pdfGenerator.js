const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

const COLOR_DARK   = rgb(14/255,  26/255,  20/255);  // #0E1A14
const COLOR_GREEN  = rgb(61/255, 214/255, 140/255);  // #3DD68C
const COLOR_MUTED  = rgb(107/255, 143/255, 122/255); // #6B8F7A
const COLOR_WHITE  = rgb(1, 1, 1);
const COLOR_BLACK  = rgb(0, 0, 0);

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 45;
const CONTENT_W = PAGE_W - MARGIN * 2;

async function generateOptimizedPDF(resultData) {
  try {
    const pdfDoc = await PDFDocument.create();
    const fontReg  = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    let y = PAGE_H;

    function newPage() {
      page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }

    function ensureSpace(needed) {
      if (y - needed < MARGIN) newPage();
    }

    // Wrap text into lines fitting maxWidth
    function wrapText(text, font, size, maxWidth) {
      const words = String(text).split(' ');
      const lines = [];
      let current = '';
      for (const w of words) {
        const test = current ? current + ' ' + w : w;
        if (font.widthOfTextAtSize(test, size) > maxWidth && current) {
          lines.push(current);
          current = w;
        } else {
          current = test;
        }
      }
      if (current) lines.push(current);
      return lines;
    }

    function drawLine(text, { x = MARGIN, size = 10, font = fontReg, color = COLOR_BLACK, lineGap = 4 } = {}) {
      const lines = wrapText(text, font, size, CONTENT_W - (x - MARGIN));
      for (const l of lines) {
        ensureSpace(size + lineGap);
        page.drawText(l, { x, y: y - size, size, font, color });
        y -= size + lineGap;
      }
    }

    function gap(px = 8) { y -= px; }

    // ── Parse CV text into structured blocks ──────────────────────────
    const rawLines = (resultData.cv_optimizado || '').split('\n').map(l => l.trim()).filter(l => l);

    let name = '';
    let contact = '';
    const sections = []; // { title, lines[] }
    let currentSection = null;

    for (const line of rawLines) {
      if (!name) { name = line; continue; }
      if (!contact && (line.includes('@') || line.includes('·') || line.includes('|') || line.match(/\+\d/))) {
        contact = line; continue;
      }
      const isHeader = line === line.toUpperCase() && line.length > 2 && !/^[•\-–]/.test(line) && !/\d{4}/.test(line);
      if (isHeader) {
        currentSection = { title: line, lines: [] };
        sections.push(currentSection);
      } else if (currentSection) {
        currentSection.lines.push(line);
      }
    }

    // ── HEADER BLOCK ─────────────────────────────────────────────────
    const headerH = 62;
    page.drawRectangle({ x: 0, y: PAGE_H - headerH, width: PAGE_W, height: headerH, color: COLOR_DARK });

    const nameSize = 20;
    const nameTrimmed = name.toUpperCase();
    page.drawText(nameTrimmed, {
      x: MARGIN, y: PAGE_H - headerH/2 - nameSize/2,
      size: nameSize, font: fontBold, color: COLOR_WHITE
    });

    y = PAGE_H - headerH - 12;

    // ── CONTACT LINE ─────────────────────────────────────────────────
    if (contact) {
      page.drawText(contact, { x: MARGIN, y, size: 9, font: fontReg, color: COLOR_MUTED });
      y -= 20;
    }

    // ── SECTIONS ─────────────────────────────────────────────────────
    for (const section of sections) {
      gap(6);
      ensureSpace(30);

      // Green left bar + section title
      page.drawRectangle({ x: MARGIN, y: y - 13, width: 3, height: 14, color: COLOR_GREEN });
      page.drawText(section.title, { x: MARGIN + 8, y: y - 12, size: 11, font: fontBold, color: COLOR_GREEN });
      y -= 16;

      // Thin separator line
      page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
      y -= 8;

      for (const line of section.lines) {
        if (!line.trim()) { gap(4); continue; }

        const isBullet  = /^[•\-–]/.test(line);
        const isJobLine = line.includes(' | ') || (line.includes('|') && line.match(/\d{4}/));

        if (isBullet) {
          ensureSpace(14);
          const bulletText = line.replace(/^[•\-–]\s*/, '');
          page.drawText('•', { x: MARGIN + 6, y: y - 10, size: 9, font: fontBold, color: COLOR_GREEN });
          const wrapped = wrapText(bulletText, fontReg, 9.5, CONTENT_W - 16);
          for (const wl of wrapped) {
            ensureSpace(14);
            page.drawText(wl, { x: MARGIN + 16, y: y - 10, size: 9.5, font: fontReg, color: COLOR_BLACK });
            y -= 13;
          }
        } else if (isJobLine) {
          gap(2);
          ensureSpace(14);
          const parts = line.split('|').map(p => p.trim());
          // Title in bold, rest in muted
          const title = parts[0];
          const rest  = parts.slice(1).join(' · ');
          const titleW = fontBold.widthOfTextAtSize(title, 10);
          page.drawText(title, { x: MARGIN, y: y - 10, size: 10, font: fontBold, color: COLOR_BLACK });
          if (rest) {
            page.drawText(' · ' + rest, { x: MARGIN + titleW, y: y - 10, size: 9.5, font: fontReg, color: COLOR_MUTED });
          }
          y -= 14;
        } else {
          ensureSpace(14);
          const wrapped = wrapText(line, fontReg, 9.5, CONTENT_W);
          for (const wl of wrapped) {
            ensureSpace(14);
            page.drawText(wl, { x: MARGIN, y: y - 10, size: 9.5, font: fontReg, color: COLOR_BLACK });
            y -= 13;
          }
        }
      }
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (err) {
    throw new Error('Failed to generate PDF: ' + err.message);
  }
}

module.exports = { generateOptimizedPDF };
