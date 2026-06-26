const pdfParse = require('pdf-parse');

async function extractTextFromPDF(pdfBuffer) {
  try {
    const data = await pdfParse(pdfBuffer);
    if (data && data.text) return data.text;
    if (data && data.numpages) {
      return `PDF with ${data.numpages} pages`;
    }
    return '';
  } catch (err) {
    throw new Error('Failed to parse PDF: ' + err.message);
  }
}

module.exports = { extractTextFromPDF };
