const Anthropic = require('@anthropic-ai/sdk').default || require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Prompts y ejemplos en ficheros (backend/prompts/). anthropic.js solo los carga y ensambla.
function loadPrompt(rel) {
  try { return fs.readFileSync(path.join(__dirname, '..', 'prompts', rel), 'utf8'); }
  catch (e) { console.error('No se pudo cargar prompt', rel, e.message); return ''; }
}
const CV_WRITER_TPL = loadPrompt('cv-writer.md');
const COVER_LETTER  = loadPrompt('cover-letter.md');
const VOICE_DNA     = loadPrompt('examples/voice-dna.md');
const CV_EXAMPLE    = loadPrompt('examples/cv-example.md');

const MODEL_FAST   = 'claude-haiku-4-5-20251001';
const MODEL_WRITER = 'claude-sonnet-4-6';

// ─── LLAMADA 1: Análisis rápido de la oferta (Haiku) ─────────────────────────
// Detecta idioma + extrae keywords ATS. Barato y rápido (~1s).
async function analyzeJobOffer(jobText) {
  const response = await client.messages.create({
    model: MODEL_FAST,
    max_tokens: 400,
    system: `Eres un analizador de ofertas de trabajo ATS. Analiza la oferta y devuelve SOLO un JSON válido, sin texto adicional.`,
    messages: [{
      role: 'user',
      content: `Analiza esta oferta de trabajo y devuelve este JSON exacto:
{
  "language": "español",
  "keywords_ats": ["skill1", "herramienta2"],
  "keywords_humanas": ["verbo o frase que usa la empresa"],
  "key_phrases": ["frase clave 1", "frase clave 2"]
}

Reglas:
- language: el idioma principal de la oferta ("español", "english", u otro)
- keywords_ats: máximo 8 términos que un ATS (una máquina) escanea: títulos de rol, nombres de herramientas, tecnologías, metodologías. NUNCA nombres de empresa, ciudades ni genéricos como "experiencia" o "equipo"
- keywords_humanas: máximo 6 señales de que el candidato ha LEÍDO la oferta: verbos de acción que usa la empresa, nombres de producto, lenguaje de resultado, forma de referirse al equipo. Demuestran a una persona (no a la máquina) que encaja
- key_phrases: 3-5 frases específicas del puesto que conviene usar literalmente en el CV (ej: "stakeholder alignment", "test automation", "go-to-market strategy")

OFERTA:
${jobText}`
    }]
  });

  let text = response.content[0].text.trim();
  text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(text);
}

// ─── LLAMADA 2: Escritura del CV (Sonnet para todos) ─────────────────────────
// Recibe el análisis previo como contexto y se enfoca 100% en calidad de escritura.
function buildWriterPrompt(isPro) {
  const base = CV_WRITER_TPL
    .replace('{{VOICE_DNA}}', () => VOICE_DNA)
    .replace('{{QUALITY_BAR}}', () => CV_EXAMPLE);
  return isPro ? base + '\n\n' + COVER_LETTER : base;
}

// Garantía por código: en la carta: en la carta NO deben aparecer guiones largos ni punto y coma
// (son de los "tells" de IA más claros). Los sustituimos por coma, pase lo que pase.
function cleanCoverPunctuation(text) {
  if (!text) return text;
  // OJO: usar [ \t] y NO \s, porque \s incluye saltos de linea y borraria los parrafos.
  return text
    .replace(/[ \t]*[\u2014\u2013][ \t]*/g, ', ') // guion largo/medio -> coma
    .replace(/[ \t]*;[ \t]*/g, ', ')              // punto y coma -> coma
    .replace(/[\u201C\u201D]/g, '"')              // comillas dobles tipograficas -> rectas
    .replace(/[\u2018\u2019]/g, "'")              // comillas simples tipograficas -> rectas
    .replace(/\u2026/g, '...')                     // puntos suspensivos
    .replace(/\u200B/g, '')                        // espacio de ancho cero
    .replace(/\u00A0/g, ' ')                       // espacio duro -> normal
    .replace(/,[ \t]*,/g, ',')                     // limpia comas dobles
    .replace(/[ \t]{2,}/g, ' ');                   // colapsa espacios/tabs, NUNCA saltos de linea
}

async function generateCV(cvText, jobText, analysis, isPro, interviewLanguage = null, extraSkills = []) {
  const { language, keywords_ats = [], keywords_humanas = [], key_phrases = [] } = analysis;

  const langNote = interviewLanguage && interviewLanguage !== 'auto'
    ? `\nNOTA: Las preguntas de entrevista deben estar en este idioma: ${interviewLanguage}. El CV y la carta siguen en ${language}.`
    : '';

  // Skills the user has CONFIRMED they have (from the "keywords que faltan" step).
  const extraBlock = Array.isArray(extraSkills) && extraSkills.length
    ? `\n\nEXPERIENCIA CONFIRMADA POR EL CANDIDATO (el usuario ha confirmado que SÍ tiene experiencia real con esto — incorpóralo de forma honesta y natural en el resumen, en habilidades y en el bullet donde mejor encaje; NO exageres ni inventes detalles que no se deduzcan): ${extraSkills.join(', ')}`
    : '';

  const contextBlock = `CONTEXTO PRE-ANALIZADO (usa esto directamente, no lo re-analices):
- Idioma de la oferta: ${language}
- Keywords ATS de la oferta (úsalas SOLO si el candidato tiene evidencia real de ellas en su CV; las que no tenga, DÉJALAS FUERA, no las inventes): ${keywords_ats.join(', ')}
- Señales humanas (para el reclutador — úsalas sobre todo en la carta): ${keywords_humanas.join(', ')}
- Frases clave a incorporar literalmente: ${key_phrases.join(', ')}

Toda la respuesta (CV, carta, preguntas) debe estar en: ${language}${langNote}${extraBlock}`;

  const response = await client.messages.create({
    model: MODEL_WRITER,
    max_tokens: isPro ? 10000 : 8000,
    // Sin 'temperature': Opus 4.8 lo tiene deprecado y usa su default natural (más humano que temp 0).
    system: buildWriterPrompt(isPro),
    messages: [{
      role: 'user',
      content: `${contextBlock}

CV DEL CANDIDATO:
${cvText}

OFERTA DE TRABAJO:
${jobText}

Optimiza el CV usando el contexto anterior. Devuelve SOLO el JSON.`
    }]
  });

  let text = response.content[0].text.trim();
  text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  const result = JSON.parse(text);

  // La carta nunca debe llevar guiones largos ni punto y coma
  if (result.carta_presentacion) {
    result.carta_presentacion = cleanCoverPunctuation(result.carta_presentacion);
  }

  return result;
}

module.exports = { analyzeJobOffer, generateCV, buildWriterPrompt };
