const mammoth = require('mammoth');

async function extractTextFromWord(wordBuffer) {
  try {
    const result = await mammoth.extractRawText({ buffer: wordBuffer });
    return result.value;
  } catch (err) {
    throw new Error('Failed to parse Word file: ' + err.message);
  }
}

module.exports = { extractTextFromWord };
