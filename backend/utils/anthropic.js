const Anthropic = require('@anthropic-ai/sdk').default || require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Guía de voz anti-IA (copiada de career-ops/voice-dna.md). Fuente de verdad del estilo de escritura.
let VOICE_DNA = '';
try {
  VOICE_DNA = fs.readFileSync(path.join(__dirname, '..', 'config', 'voice-dna.md'), 'utf8');
} catch (e) {
  console.error('No se pudo cargar voice-dna.md:', e.message);
}

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

REGLA DE HONESTIDAD (LA MÁS IMPORTANTE, POR ENCIMA DE TODO LO DEMÁS):
NO añadas una tecnología, herramienta, norma o metodología al CV solo porque aparezca en la oferta. Si el CV original NO da evidencia de que el candidato la conoce (ej: ASPICE, HIL, JIRA, Confluence, SAP, una norma concreta), NO la menciones: ni en el resumen, ni en habilidades, ni en los bullets. NUNCA inventes conocimiento de una herramienta o norma. Es MUCHO mejor un CV honesto con menos keywords que uno inflado que quede en evidencia en la entrevista. Las keywords de la oferta que el candidato no tenga se le preguntarán aparte al usuario después: tu trabajo NO es meterlas, es dejarlas fuera si no hay evidencia.
- DISTRIBUCIÓN de keywords: usa SOLO las keywords ATS para las que el candidato tenga evidencia real en su CV (más las de la lista de EXPERIENCIA CONFIRMADA, si la hay). Esas repártelas en el RESUMEN, en HABILIDADES y en el primer bullet donde encajen de forma natural. Cada keyword una sola vez.
- Varía la longitud y estructura de los bullets — no todos empiecen igual ni tengan la misma cadencia

HUMANIZACIÓN — DOS NIVELES (crítico, el texto NO debe parecer escrito por IA):

NIVEL 1 (aplica a TODO: CV y carta) — palabras y frases PROHIBIDAS porque delatan IA al instante:
"leverage", "utilize", "endeavor", "robust", "seamless", "seamlessly", "cutting-edge", "game-changing", "synergy", "synergies", "paradigm", "holistic", "proactive", "spearheaded", "championed", "orchestrated", "dynamic", "innovative", "passionate", "excited", "strategic thinker", "results-driven", "detail-oriented", "highly motivated", "data-driven", "actionable insights", "move the needle", "north star", "stakeholder alignment", "unique opportunity", "perfect fit", "strong track record", "proven track record", "best practices", "aprovechar", "robusto", "sinergias", "innovador", "soluciones innovadoras", "entorno dinámico", "orientado a resultados", "altamente motivado", "apasionado", "capacidad demostrada de"
Además: PROHIBIDO el guion largo (—) y el punto y coma (;). Usa comas, puntos y frases más cortas. Nadie escribe a mano con guion largo ni con punto y coma: delatan IA al instante.

NIVEL 2 (aplica SOLO a la carta, NUNCA al CV) — voz conversacional: contracciones, alguna frase que empiece por "Y" o "Pero", tono directo y natural. El CV va nítido y factual; la carta suena más humana.

REGLA QUE MANDA SIEMPRE: la precisión gana al estilo. Nunca inventes ni adornes un hecho para que suene mejor.

═══ GUÍA DE VOZ (fuente de verdad del estilo de escritura; aplícala con criterio, SOBRE TODO en la carta. Los términos en inglés valen igual para su equivalente en español) ═══
${VOICE_DNA}
═══ FIN GUÍA DE VOZ ═══

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

LISTÓN DE CALIDAD (nivel al que deben llegar los bullets — densos en métricas):
- "Led ML platform team (3 engineers): built model registry, A/B testing framework and feature store, cutting model deployment from 2 weeks to 4 hours"
- "Designed real-time fraud detection pipeline (Kafka to feature computation to inference): 99.7% precision at 50ms p99"
Patrón de cada bullet: VERBO de impacto + QUÉ construiste/hiciste + HERRAMIENTA concreta + RESULTADO con número. El resumen igual: denso en cifras (ej: "scaling from 2 models to 15+ in production"). Si el CV original trae números, úsalos; si no, estima un orden de magnitud conservador. NUNCA inventes cifras concretas falsas.

ANTES DE ESCRIBIR EL JSON, razona internamente (no lo incluyas en el output):
1. ¿Qué experiencia del candidato puede reescribirse usando las keywords y frases clave ya identificadas?
2. ¿Qué bullets son los más fuertes para esta oferta? Esos van primero en cada bloque de experiencia.
3. Ahora escribe el JSON aplicando las reglas anteriores.

NIVEL DE REESCRITURA:
No estás editando el CV, estás RECONSTRUYÉNDOLO para el rol objetivo.
- Herramientas/tecnologías que no aparecen en la oferta ni aportan al rol objetivo: ELIMÍNALAS
- La sección de skills se construye desde cero para el rol objetivo, no se copia del original
- Cada bullet se reescribe preguntando: "¿qué le importa de esto al recruiter de ESTA oferta?" Si un detalle técnico no responde a eso, se generaliza o se elimina
- Conserva siempre: empresas, fechas, títulos, logros cuantificados, idiomas
- (Esto NO contradice la honestidad: reconstruir y reenfocar SÍ; inventar herramientas o experiencia que el candidato no tiene, NUNCA)

ESTRUCTURA Y FORMATO DE SALIDA:
Devuelves el CV en CAMPOS ESTRUCTURADOS (no como texto corrido). Rellena cada campo:
- name: nombre completo
- tagline: EXACTAMENTE 3 frases cortas separadas por " | " → el título del puesto objetivo + 2 fortalezas clave (ej: "Test & Validation Engineer | Vehicle Networks | Test Automation")
- contact: "Ciudad, País | Teléfono | Email | idiomas abreviados". ELIMINA fecha de nacimiento, dirección completa y foto
- summary: resumen profesional de 3-5 líneas, específico para ESTA oferta, con las keywords que el candidato SÍ tiene
- experience: array en orden cronológico INVERSO. Cada puesto: { role, company, location, dates, bullets }. Dentro de cada puesto ordena los bullets poniendo primero el más relevante para esta oferta. NO incluyas descripciones de la empresa. Conserva empresas, fechas y títulos reales
- skills: array de 2-4 CATEGORÍAS relevantes para el rol, cada una { category, items }. "items" es una cadena de skills separados por 3 espacios. Construye las categorías desde cero para el rol objetivo (ej: "Testing & Validation", "Tools", "Methodologies"). Máximo ~12 skills en total, solo los que el candidato tiene
- education: array de { degree, school, dates }
- languages: "Idioma — Nivel | Idioma — Nivel"

RESPONDE ÚNICAMENTE con un objeto JSON válido. Sin texto adicional, sin markdown, sin bloques de código:
{
  "incompatible": false,
  "aviso": "",
  "cv": {
    "name": "",
    "tagline": "",
    "contact": "",
    "summary": "",
    "experience": [
      { "role": "", "company": "", "location": "", "dates": "", "bullets": ["", ""] }
    ],
    "skills": [
      { "category": "", "items": "" }
    ],
    "education": [
      { "degree": "", "school": "", "dates": "" }
    ],
    "languages": ""
  },
  "carta_presentacion": "",
  "preguntas_entrevista": []
}

Cuando sea incompatible:
{
  "incompatible": true,
  "aviso": "Explicación de por qué no encaja y qué podría hacer el candidato",
  "cv": null,
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

PUNTUACIÓN (crítico en la carta): PROHIBIDO usar el guion largo (—) y el punto y coma (;). Una persona normal escribiendo una carta no los usa. Sustitúyelos SIEMPRE por un punto y una frase nueva, o por una coma. Si te sale un punto y coma, parte la frase en dos.

LONGITUD: cuerpo de 350-420 palabras. Ni más (delata relleno) ni mucho menos (parece plantilla).

SELF-CHECK FINAL (obligatorio antes de dar la carta por buena): re-lee cada frase y pregúntate "¿esta frase valdría para CUALQUIER carta a CUALQUIER empresa?". Si la respuesta es sí, reescríbela para que sea específica de este candidato y esta oferta.

PREGUNTAS DE ENTREVISTA:
Genera exactamente 6 preguntas específicas para el puesto en el MISMO IDIOMA de la oferta.
Mezcla: 2 técnicas del rol, 3 de comportamiento (método STAR), 1 de motivación concreta para ESA empresa.

El JSON debe incluir carta_presentacion y preguntas_entrevista completos.`;
  }

  return base;
}

// Garantía por código: en la carta NO deben aparecer guiones largos ni punto y coma
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

module.exports = { analyzeJobOffer, generateCV };
