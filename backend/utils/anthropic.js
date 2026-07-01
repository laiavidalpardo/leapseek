const Anthropic = require('@anthropic-ai/sdk').default || require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL_FAST   = 'claude-haiku-4-5-20251001';
const MODEL_WRITER = 'claude-sonnet-4-6';

// ─── LLAMADA 1: Análisis rápido de la oferta (Haiku) ─────────────────────────
// Detecta idioma + extrae keywords ATS. Barato y rápido (~1s).
async function analyzeJobOffer(jobText) {
  const response = await client.messages.create({
    model: MODEL_FAST,
    max_tokens: 400,
    temperature: 0,
    system: `Eres un analizador de ofertas de trabajo ATS. Analiza la oferta y devuelve SOLO un JSON válido, sin texto adicional.`,
    messages: [{
      role: 'user',
      content: `Analiza esta oferta de trabajo y devuelve este JSON exacto:
{
  "language": "español",
  "keywords": ["skill1", "skill2"],
  "key_phrases": ["frase clave 1", "frase clave 2"]
}

Reglas:
- language: el idioma principal de la oferta ("español", "english", u otro)
- keywords: máximo 8 skills/herramientas/metodologías reales que el ATS buscará. NUNCA nombres de empresa, ciudades ni palabras genéricas como "experiencia" o "equipo"
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
  const base = `Eres un recruiter senior con 15 años de experiencia escribiendo CVs que consiguen entrevistas.
No eres un extractor de keywords, eres un escritor de impacto. Cada bullet que escribes debe sonar como si lo hubiera escrito alguien que entiende de negocio, no un robot rellenando campos.

PASO 0 — COMPATIBILIDAD:
Marca incompatible=true SOLO si no existe NINGÚN overlap de habilidades transferibles (ej: cocinero sin experiencia técnica → desarrollador backend). Si hay habilidades transferibles aunque el sector sea distinto, NO marques incompatible — ese es el caso de uso principal. Si hay brecha salvable, añade un aviso útil.

REGLAS DE REDACCIÓN:
- Empieza cada bullet con un verbo de impacto fuerte: Led, Owned, Drove, Shipped, Reduced, Increased, Defined, Launched, Negotiated, Built — NUNCA "Responsible for", "Encargado de", "Trabajé en"
- Cuantifica siempre que sea posible. Si el CV original no tiene números, infiere un orden de magnitud razonable (ej: "mejoré X" → añade % estimado conservador; "equipo" → especifica tamaño si es deducible)
- Cada bullet responde: ¿qué hice? ¿cómo? ¿qué resultado tuvo? — no solo lista tareas
- Prohibido: "team player", "fast learner", "passionate about", "responsible for", "in charge of", "encargado de", "responsable de"
- Usa el VOCABULARIO EXACTO de la oferta y las frases clave proporcionadas, no sinónimos aproximados
- Varía la longitud y estructura de los bullets — no todos empiecen igual ni tengan la misma cadencia

HUMANIZACIÓN (crítico — el texto NO debe parecer escrito por IA):
Palabras y frases que NUNCA debes usar porque delatan escritura artificial:
"leverage", "utilize", "endeavor", "robust", "seamlessly", "cutting-edge", "game-changing", "synergy", "paradigm", "holistic", "proactive", "spearheaded", "dynamic", "innovative", "passionate", "strategic thinker", "results-driven", "detail-oriented", "highly motivated", "aprovechar", "robusto", "sinergias", "innovador", "soluciones innovadoras", "entorno dinámico", "orientado a resultados", "altamente motivado"

En su lugar, sé directo y específico:
- NO: "Leveraged cross-functional synergies to drive robust outcomes"
- SÍ: "Worked with sales and engineering to ship the feature 3 weeks early"
- NO: "Apasionada profesional con orientación a resultados y enfoque proactivo"
- SÍ: "Llevo 5 años en QA. En mi último puesto reduje los bugs en producción a la mitad"

EJEMPLOS DE CALIDAD:

MAL: "Responsible for managing validation processes and coordinating with teams"
BIEN: "Led validation processes across 3 cross-functional teams, reducing release cycle time and improving traceability"

MAL: "Worked on requirements and testing for automotive systems"
BIEN: "Owned requirements traceability for automotive electronic systems, managing change impact analysis using Polarion and Codebeamer"

MAL: "Team player with strong communication skills"
BIEN: (elimina — las soft skills se demuestran con bullets, no se afirman)

ANTES DE ESCRIBIR EL JSON, razona internamente (no lo incluyas en el output):
1. ¿Qué experiencia del candidato puede reescribirse usando las keywords y frases clave ya identificadas?
2. ¿Qué bullets son los más fuertes para esta oferta? Esos van primero en cada bloque de experiencia.
3. Ahora escribe el JSON aplicando las reglas anteriores.

ESTRUCTURA DEL CV (en este orden exacto):
1. NOMBRE COMPLETO (en mayúsculas)
2. Línea de contacto: Ciudad, País · Teléfono · Email · LinkedIn (si existe)
3. RESUMEN PROFESIONAL (3-5 líneas, con keywords de la oferta)
4. HABILIDADES TÉCNICAS (inmediatamente después del resumen, NO al final)
5. EXPERIENCIA (orden cronológico inverso)
6. EDUCACIÓN
7. IDIOMAS

REGLAS ADICIONALES:
- USA el título exacto del puesto en el resumen
- ELIMINA: fecha de nacimiento, dirección completa, carnet de conducir (salvo que la oferta lo pida), foto, descripciones de empresa, secciones genéricas de soft skills
- HABILIDADES: máximo 12 skills relevantes. Lista separada por · no párrafos
- FECHAS: formato consistente
- LONGITUD: máximo 2 páginas. Calidad sobre cantidad
- NO inventes experiencia ni habilidades que no tenga el candidato

RESPONDE ÚNICAMENTE con un objeto JSON válido. Sin texto adicional, sin markdown, sin bloques de código:
{
  "incompatible": false,
  "aviso": "",
  "cv_optimizado": "CV completo reescrito aquí",
  "carta_presentacion": "",
  "preguntas_entrevista": []
}

Cuando sea incompatible:
{
  "incompatible": true,
  "aviso": "Explicación de por qué no encaja y qué podría hacer el candidato",
  "cv_optimizado": "",
  "carta_presentacion": "",
  "preguntas_entrevista": []
}`;

  if (isPro) {
    return base + `

CARTA DE PRESENTACIÓN:
IDIOMA: La carta DEBE estar en el MISMO IDIOMA que la oferta (ya indicado en el contexto). No mezcles idiomas.

OBJETIVO: Que parezca escrita por una persona real que de verdad quiere este trabajo, no generada por IA. Un reclutador que lee 200 cartas al día detecta al instante la escritura artificial. Esta carta tiene que ser la que rompe ese patrón.

ESTRUCTURA (4 párrafos):
- Párrafo 1: Empieza con algo inesperado y específico. Puede ser un logro directo, una observación concreta sobre la empresa o el rol, o algo del candidato que conecte directamente con la oferta. NUNCA empieces con "Me llamo X y me dirijo a..." ni con "Tras leer vuestra oferta...". Entra al grano.
- Párrafos 2-3: 2-3 logros concretos del candidato ligados a necesidades reales de la empresa. Usa números y contexto. Habla como si le estuvieras contando algo a alguien en una conversación, no como si rellenases un formulario.
- Párrafo 4: Cierre directo. Una frase de por qué esta empresa/rol en concreto, y una propuesta de conversación. Sin "quedo a su disposición", sin "en espera de sus noticias".

ESTILO HUMANO — aplica esto línea por línea:
- Varía la longitud de las frases. Mezcla frases cortas con párrafos más desarrollados. Las frases muy uniformes en longitud delatan a la IA.
- Usa contracciones y lenguaje natural donde encaje: "he trabajado", "lo que me interesa de esta posición es", "en mi experiencia", "lo que aprendí"
- Una frase imperfecta o directa vale más que un párrafo pulido y vacío
- Si el candidato tiene un cambio de sector, reconócelo directamente y convierte el contexto en ventaja, no lo ignores
- El tono debe ajustarse al tipo de empresa: startup tech = directo e informal; corporativo = profesional pero humano; agencia creativa = con algo de personalidad

PROHIBIDO (delatan IA al instante):
- En español: "Me dirijo a ustedes para expresar mi interés", "Soy una persona apasionada por", "Soy un/a profesional altamente motivado/a", "Quedo a su disposición", "Adjunto mi CV para su consideración", "Estoy convencido/a de que mis habilidades encajan perfectamente", "soluciones innovadoras", "entorno dinámico"
- En inglés: "I am writing to express my interest", "I am passionate about", "I would be a great fit for this role", "I look forward to hearing from you", "Please find attached my CV", "I am confident that my skills and experience", "dynamic environment", "innovative solutions"

MAX 4 párrafos. Sin adornos. Sin relleno. Cada frase tiene que justificar su presencia.

PREGUNTAS DE ENTREVISTA:
Genera exactamente 6 preguntas específicas para el puesto en el MISMO IDIOMA de la oferta.
Mezcla: 2 técnicas del rol, 3 de comportamiento (método STAR), 1 de motivación concreta para ESA empresa.

El JSON debe incluir carta_presentacion y preguntas_entrevista completos.`;
  }

  return base;
}

async function generateCV(cvText, jobText, analysis, isPro, interviewLanguage = null) {
  const { language, keywords, key_phrases } = analysis;

  const langNote = interviewLanguage && interviewLanguage !== 'auto'
    ? `\nNOTA: Las preguntas de entrevista deben estar en este idioma: ${interviewLanguage}. El CV y la carta siguen en ${language}.`
    : '';

  const contextBlock = `CONTEXTO PRE-ANALIZADO (usa esto directamente, no lo re-analices):
- Idioma de la oferta: ${language}
- Keywords ATS críticos: ${keywords.join(', ')}
- Frases clave a incorporar: ${(key_phrases || []).join(', ')}

Toda la respuesta (CV, carta, preguntas) debe estar en: ${language}${langNote}`;

  const response = await client.messages.create({
    model: MODEL_WRITER,
    max_tokens: isPro ? 10000 : 8000,
    temperature: 0,
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
  return JSON.parse(text);
}

module.exports = { analyzeJobOffer, generateCV };
