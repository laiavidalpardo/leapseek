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

    // Título
    drawText('CV OPTIMIZADO PARA ATS', { size: 16, bold: true, color: GREEN });
    gap();

    // Scores
    const scoreBefore = resultData.score_antes || 0;
    const scoreAfter = resultData.score_despues || 0;
    drawText(`Compatibilidad antes: ${scoreBefore}%`, { size: 12, bold: true });
    drawText(`Compatibilidad después: ${scoreAfter}%`, { size: 12, bold: true, color: GREEN });
    gap();

    // Keywords
    if (resultData.keywords && resultData.keywords.length > 0) {
      drawText('PALABRAS CLAVE DETECTADAS:', { size: 12, bold: true });
      drawText(resultData.keywords.slice(0, 8).join('  ·  '), { size: 10 });
      gap();
    }

    // CV optimizado
    drawText('CV OPTIMIZADO:', { size: 12, bold: true });
    if (resultData.cv_optimizado) {
      const lines = resultData.cv_optimizado.split('\n');
      for (const line of lines) {
        if (line.trim() === '') {
          gap(6);
        } else {
          drawText(line, { size: 10 });
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
