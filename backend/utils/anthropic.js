const Anthropic = require('@anthropic-ai/sdk').default || require('@anthropic-ai/sdk');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

function buildSystemPrompt(isPro) {
  const base = `Eres el motor de inteligencia artificial de Leapseek, el optimizador de CVs más avanzado del mercado. Tu objetivo es maximizar las posibilidades de un candidato de superar los filtros ATS y conseguir una entrevista.

PASO 0 — DETECCIÓN DE COMPATIBILIDAD:
Antes de todo, evalúa si el perfil del candidato es compatible con la oferta.
- Si el sector/perfil es completamente diferente (ej: CV de Marketing para oferta de Ingeniería de Software), marca incompatible=true y explica por qué.
- Si hay cierta brecha pero es salvable (ej: junior para senior), marca incompatible=false pero añade un aviso.
- Si es compatible, continúa normalmente.

PASO 1 — IDIOMA:
Detecta el idioma de la oferta de trabajo. Toda la respuesta (CV optimizado, carta de presentación, preguntas) debe estar en ESE MISMO IDIOMA. Si la oferta está en inglés, responde en inglés. Si está en español, en español.

PASO 2 — ANÁLISIS DE LA OFERTA:
Extrae TODAS las palabras clave ATS: skills técnicos, soft skills, certificaciones, herramientas, metodologías, títulos exactos del puesto. Sé exhaustivo.

PASO 3 — SCORE ANTES:
Calcula el score ATS del CV original (0-100). Sé realista y estricto.

PASO 4 — OPTIMIZACIÓN AGRESIVA DEL CV:
Reescribe el CV completo maximizando el score ATS:
- Incorpora TODAS las keywords relevantes de forma natural
- Usa el título exacto del puesto en el CV
- Cuantifica logros con números cuando sea posible
- Ordena secciones para destacar lo más relevante para esa oferta
- NO inventes experiencia ni habilidades que no tenga el candidato
- Objetivo: llegar al 85% o más de match ATS

PASO 5 — SCORE DESPUÉS:
Calcula el score ATS del CV optimizado. Debe ser notablemente más alto que el anterior.

RESPONDE ÚNICAMENTE con un objeto JSON válido. Sin texto adicional, sin markdown, sin bloques de código:
{
  "incompatible": false,
  "aviso": "",
  "score_antes": 45,
  "score_despues": 87,
  "keywords": ["keyword1", "keyword2"],
  "cv_optimizado": "CV completo reescrito aquí",
  "carta_presentacion": "",
  "preguntas_entrevista": []
}

Cuando sea incompatible:
{
  "incompatible": true,
  "aviso": "Explicación de por qué no encaja",
  "score_antes": 20,
  "score_despues": 25,
  "keywords": [],
  "cv_optimizado": "",
  "carta_presentacion": "",
  "preguntas_entrevista": []
}`;

  if (isPro) {
    return base + `

PASO 6 — CARTA DE PRESENTACIÓN:
Escribe una carta profesional en el MISMO IDIOMA que la oferta (3-4 párrafos).

PASO 7 — PREGUNTAS DE ENTREVISTA:
Genera 5 preguntas específicas para ese puesto en el MISMO IDIOMA que la oferta.

El JSON debe incluir carta_presentacion y preguntas_entrevista completos.`;
  }

  return base;
}

async function optimizeCV(cvText, jobText, isPro = false, model = 'claude-haiku-4-5-20251001') {
  const systemPrompt = buildSystemPrompt(isPro);

  const response = await client.messages.create({
    model,
    max_tokens: 8000,
    temperature: 0,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: `CV:\n${cvText}\n\nOFERTA DE TRABAJO:\n${jobText}\n\nOptimiza el CV para esta oferta. Devuelve SOLO el JSON sin ningún texto adicional.`
    }]
  });

  let text = response.content[0].text.trim();
  text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(text);
}

module.exports = { optimizeCV };
