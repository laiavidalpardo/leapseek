const Anthropic = require('@anthropic-ai/sdk').default || require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-6';

function loadPrompt(name) {
  try { return fs.readFileSync(path.join(__dirname, '..', 'prompts', name), 'utf8'); }
  catch (e) { console.error('No se pudo cargar prompt', name, e.message); return ''; }
}
const Q_PROMPT  = loadPrompt('interview-questions.md');
const FB_PROMPT = loadPrompt('interview-feedback.md');

function parseJSON(text) {
  const t = text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(t);
}

// Genera un pool de ~N preguntas para la entrevista simulada
async function generateInterviewQuestions(cvText, jobText, count = 15) {
  const system = Q_PROMPT.replace('{{N}}', String(count));
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2500,
    system,
    messages: [{
      role: 'user',
      content: `CV DEL CANDIDATO:\n${cvText || '(sin CV)'}\n\nOFERTA DE TRABAJO:\n${jobText}\n\nGenera el pool de preguntas. Devuelve SOLO el JSON.`
    }]
  });
  return parseJSON(response.content[0].text);
}

// Genera el feedback (2 párrafos: lo bueno + lo mejorable), teniendo en cuenta contenido y ritmo
async function generateInterviewFeedback(jobText, qa, meta = {}) {
  const transcript = (qa || []).map((x, i) =>
    `P${i + 1} [${x.area || '-'}] (respondió en ${x.seconds || 0}s, ${x.words || 0} palabras):\n${x.question}\nR: ${x.answer || '(sin respuesta)'}`
  ).join('\n\n');

  const metaLine = `Datos de ritmo de la sesión: respondió ${meta.questionsAnswered || (qa || []).length} preguntas en ${meta.totalMinutes || '?'} min (sesión de ${meta.sessionMinutes || 45} min).`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1200,
    system: FB_PROMPT,
    messages: [{
      role: 'user',
      content: `OFERTA:\n${jobText || '(sin oferta)'}\n\n${metaLine}\n\nTRANSCRIPCIÓN:\n${transcript}\n\nDa el feedback. Devuelve SOLO el JSON.`
    }]
  });
  return parseJSON(response.content[0].text);
}

module.exports = { generateInterviewQuestions, generateInterviewFeedback };
