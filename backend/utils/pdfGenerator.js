const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

const GREEN = rgb(61 / 255, 214 / 255, 140 / 255);
const BLACK = rgb(0, 0, 0);

async function generateOptimizedPDF(resultData) {
  try {
    const pdfDoc = await PDFDocument.create();
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const margin = 40;
    const pageWidth = 612 - margin * 2;
    const lineHeight = 15;

    let page = pdfDoc.addPage([612, 792]);
    let y = 792 - margin;

    function ensureSpace(needed = lineHeight) {
      if (y - needed < margin) {
        page = pdfDoc.addPage([612, 792]);
        y = 792 - margin;
      }
    }

    function drawText(text, { size = 11, bold = false, color = BLACK } = {}) {
      const font = bold ? fontBold : fontRegular;
      const maxChars = Math.floor(pageWidth / (size * 0.55));
      const words = String(text).split(' ');
      let line = '';

      for (const word of words) {
        const test = line ? line + ' ' + word : word;
        if (test.length > maxChars && line) {
          ensureSpace(size + 4);
          page.drawText(line, { x: margin, y, size, font, color });
          y -= size + 4;
          line = word;
        } else {
          line = test;
        }
      }
      if (line) {
        ensureSpace(size + 4);
        page.drawText(line, { x: margin, y, size, font, color });
        y -= size + 4;
      }
    }

    function gap(px = 8) { y -= px; }

    // CV optimizado — solo el contenido, sin métricas ATS
    if (resultData.cv_optimizado) {
      const lines = resultData.cv_optimizado.split('\n');
      for (const line of lines) {
        if (line.trim() === '') {
          gap(6);
        } else {
          const isSectionHeader = line.trim() === line.trim().toUpperCase() && line.trim().length > 2;
          drawText(line, { size: isSectionHeader ? 12 : 10, bold: isSectionHeader });
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
