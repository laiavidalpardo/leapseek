const express = require('express');
const { generateInterviewQuestions, generateInterviewFeedback } = require('../utils/interview');

const router = express.Router();

// Inicia una entrevista: genera el pool de preguntas
router.post('/start', async (req, res) => {
  try {
    const { cvText, jobText } = req.body;
    if (!jobText || jobText.trim().length < 30) {
      return res.status(400).json({ error: 'Falta la oferta' });
    }
    const result = await generateInterviewQuestions(cvText || '', jobText, 15);
    if (!result || !Array.isArray(result.questions)) {
      return res.status(400).json({ error: 'No se pudieron generar preguntas' });
    }
    res.json({ questions: result.questions });
  } catch (err) {
    console.error('interview/start error:', err);
    res.status(400).json({ error: err.message || 'Error generando la entrevista' });
  }
});

// Feedback al terminar la entrevista
router.post('/feedback', async (req, res) => {
  try {
    const { jobText, qa, meta } = req.body;
    if (!Array.isArray(qa) || qa.length === 0) {
      return res.status(400).json({ error: 'No hay respuestas para evaluar' });
    }
    const result = await generateInterviewFeedback(jobText || '', qa, meta || {});
    res.json(result);
  } catch (err) {
    console.error('interview/feedback error:', err);
    res.status(400).json({ error: err.message || 'Error generando el feedback' });
  }
});

module.exports = router;
