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
Reescribe el CV completo siguiendo estas reglas estrictas:

ESTRUCTURA (en este orden exacto):
1. NOMBRE COMPLETO (en mayúsculas)
2. Línea de contacto: Ciudad, País · Teléfono · Email · LinkedIn (si existe)
3. RESUMEN PROFESIONAL (3-5 líneas, con keywords de la oferta)
4. HABILIDADES TÉCNICAS (inmediatamente después del resumen, NO al final)
5. EXPERIENCIA (orden cronológico inverso)
6. EDUCACIÓN
7. IDIOMAS

REGLAS DE CONTENIDO:
- USA el título exacto del puesto de la oferta en el resumen
- ELIMINA: fecha de nacimiento, dirección completa (solo ciudad/país), carnet de conducir (salvo que la oferta lo pida), foto
- ELIMINA: descripciones de la empresa debajo de cada trabajo
- ELIMINA: secciones de "Competencias" o "Soft Skills" genéricas — integra lo relevante en el resumen
- BULLET POINTS: máximo 2 líneas cada uno, empezar con verbo de acción, cuantificar logros con números siempre que sea posible
- HABILIDADES: máximo 12 skills, los más relevantes para ESA oferta concreta. Formato lista separada por · no párrafos largos
- FECHAS: formato consistente (ej: "Enero 2020 – Presente" o "Jan 2020 – Present")
- ACRÓNIMOS: la primera vez escribe el nombre completo seguido del acrónimo entre paréntesis (ej: "Software-in-the-Loop (SiL)")
- LONGITUD: máximo 2 páginas. Prioriza calidad sobre cantidad. Elimina bullets redundantes
- NO inventes experiencia ni habilidades que no tenga el candidato
- Incorpora TODAS las keywords relevantes de la oferta de forma natural
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
Escribe una carta profesional de 3-4 párrafos en el MISMO IDIOMA que la oferta. Estructura: párrafo 1 presenta al candidato y el puesto, párrafo 2-3 relaciona sus logros más relevantes con las necesidades de la empresa, párrafo 4 cierra con llamada a la acción.

PASO 7 — PREGUNTAS DE ENTREVISTA:
Genera exactamente 8 preguntas de entrevista específicas para ese puesto en el MISMO IDIOMA que la oferta. Mezcla: preguntas técnicas del rol, preguntas de comportamiento (método STAR) y una pregunta sobre motivación.

El JSON debe incluir carta_presentacion y preguntas_entrevista completos.`;
  }

  return base;
}

async function optimizeCV(cvText, jobText, isPro = false, model = 'claude-haiku-4-5-20251001', interviewLanguage = null) {
  const systemPrompt = buildSystemPrompt(isPro);

  const langNote = interviewLanguage
    ? `\n\nNOTA IMPORTANTE: Las preguntas de entrevista (preguntas_entrevista) deben estar en ESTE idioma: ${interviewLanguage}. El CV y la carta siguen en el idioma de la oferta.`
    : '';

  const response = await client.messages.create({
    model,
    max_tokens: isPro ? 10000 : 8000,
    temperature: 0,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: `CV:\n${cvText}\n\nOFERTA DE TRABAJO:\n${jobText}\n\nOptimiza el CV para esta oferta. Devuelve SOLO el JSON sin ningún texto adicional.${langNote}`
    }]
  });

  let text = response.content[0].text.trim();
  text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(text);
}

module.exports = { optimizeCV };
