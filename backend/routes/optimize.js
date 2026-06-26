const express = require('express');
const multer = require('multer');
const axios = require('axios');
const cheerio = require('cheerio');
const { optimizeCV } = require('../utils/anthropic');
const { extractTextFromPDF } = require('../utils/pdfToText');
const { extractTextFromWord } = require('../utils/wordToText');
const { generateOptimizedPDF } = require('../utils/pdfGenerator');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and Word files allowed'));
    }
  }
});

// Fetch URL content
async function fetchURLContent(url) {
  const proxies = [
    `https://r.jina.ai/${url}`,
    `https://corsproxy.io/?${encodeURIComponent(url)}`
  ];

  for (const proxyUrl of proxies) {
    try {
      const response = await axios.get(proxyUrl, {
        timeout: 10000,
        headers: proxyUrl.includes('r.jina.ai') ? { 'Accept': 'text/markdown' } : {}
      });

      let content = response.data;

      // Clean markdown from Jina
      if (proxyUrl.includes('r.jina.ai')) {
        content = content.replace(/[#*\[\]()]/g, ' ').replace(/\s+/g, ' ').trim();
      } else {
        // Parse HTML
        const $ = cheerio.load(content);
        content = $('body').text().replace(/\s+/g, ' ').trim();
      }

      if (content.length > 200) {
        return content.substring(0, 3000);
      }
    } catch (e) {
      continue;
    }
  }

  throw new Error('Could not fetch URL content');
}

// Extract CV text based on file type
async function extractCVText(file) {
  if (file.mimetype === 'application/pdf') {
    return await extractTextFromPDF(file.buffer);
  } else if (['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'].includes(file.mimetype)) {
    return await extractTextFromWord(file.buffer);
  }
  throw new Error('Unsupported file format');
}

router.post('/', upload.single('cv'), async (req, res) => {
  try {
    const { jobText } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No CV file provided' });
    }

    if (!jobText || jobText.trim().length < 50) {
      return res.status(400).json({ error: 'Job description too short' });
    }

    // Extract CV text
    let cvText;
    try {
      cvText = await extractCVText(req.file);
    } catch (err) {
      return res.status(400).json({ error: 'Could not read CV file: ' + err.message });
    }

    if (cvText.length < 100) {
      return res.status(400).json({ error: 'CV too short or invalid' });
    }

    // Optimize CV with Anthropic
    const result = await optimizeCV(cvText, jobText, false, 'claude-haiku-4-5-20251001');

    // Ensure keywords is an array of max 8
    if (Array.isArray(result.keywords)) {
      result.keywords = result.keywords.slice(0, 8);
    } else {
      result.keywords = [];
    }

    // Generate PDF
    let pdfBuffer;
    try {
      pdfBuffer = await generateOptimizedPDF(result, req.file.originalname);
    } catch (err) {
      console.error('PDF generation error:', err);
      // Still return result even if PDF fails
      return res.json({
        ...result,
        pdf_error: 'Could not generate PDF'
      });
    }

    // Return result with PDF as base64
    res.json({
      ...result,
      pdf_base64: pdfBuffer.toString('base64'),
      pdf_filename: 'cv_optimizado.pdf'
    });

  } catch (err) {
    console.error('Error:', err);
    res.status(400).json({ error: err.message || 'Optimization failed' });
  }
});

module.exports = router;
