const pdf = require('pdf-parse');

async function extractTextFromPDF(pdfBuffer) {
  try {
    const data = await pdf(pdfBuffer);
    return data.text;
  } catch (err) {
    throw new Error('Failed to parse PDF: ' + err.message);
  }
}

module.exports = { extractTextFromPDF };
