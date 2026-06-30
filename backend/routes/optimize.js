const express = require('express');
const multer = require('multer');
const axios = require('axios');
const cheerio = require('cheerio');
const jwt = require('jsonwebtoken');
const { optimizeCV } = require('../utils/anthropic');
const { extractTextFromPDF } = require('../utils/pdfToText');
const { extractTextFromWord } = require('../utils/wordToText');
const { generateOptimizedDocx } = require('../utils/docxGenerator');
const { calculateATSScore } = require('../utils/scoring');

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
    const { jobText, interviewLanguage } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No CV file provided' });
    }

    if (!jobText || jobText.trim().length < 50) {
      return res.status(400).json({ error: 'Job description too short' });
    }

    // Determine plan from JWT
    let isPro = false;
    let model = 'claude-haiku-4-5-20251001';
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
        if (decoded.plan === 'pro' || decoded.plan === 'elite') {
          isPro = true;
          model = 'claude-sonnet-4-6';
        }
      } catch (_) {}
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
    const result = await optimizeCV(cvText, jobText, isPro, model, interviewLanguage || null);

    // Override AI scores with real mathematical ATS scoring
    if (result.cv_optimizado) {
      const atsScores = calculateATSScore(cvText, result.cv_optimizado, jobText);
      result.score_antes   = atsScores.score_antes;
      result.score_despues = atsScores.score_despues;
      result.keywords      = atsScores.keywords;
    } else if (Array.isArray(result.keywords)) {
      result.keywords = result.keywords.slice(0, 8);
    } else {
      result.keywords = [];
    }

    // Generate DOCX
    let docxBuffer;
    try {
      docxBuffer = await generateOptimizedDocx(result);
    } catch (err) {
      console.error('DOCX generation error:', err);
      return res.json({
        ...result,
        docx_error: 'Could not generate DOCX'
      });
    }

    // Return result with DOCX as base64
    res.json({
      ...result,
      docx_base64: docxBuffer.toString('base64'),
      docx_filename: 'cv_optimizado.docx'
    });

  } catch (err) {
    console.error('Error:', err);
    res.status(400).json({ error: err.message || 'Optimization failed' });
  }
});

module.exports = router;
