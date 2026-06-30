// Real ATS keyword scoring — mathematical algorithm, not AI-estimated

const STOP_ES = new Set(['a','al','algo','ante','antes','con','contra','de','del','desde','donde','durante','el','ella','en','entre','es','esa','ese','esta','este','esto','ha','hay','la','las','le','les','lo','los','me','mi','muy','más','ni','no','nos','o','otra','otro','para','pero','por','porque','que','se','ser','si','sin','sobre','son','su','sus','tan','te','todo','tu','un','una','uno','y','ya','también','como','cada','así','bajo','han','sus','nos','mis','bien','hace','ser','fue','son','sea','era','hay','aún']);

const STOP_EN = new Set(['a','about','above','after','all','am','an','and','any','are','as','at','be','been','being','but','by','can','did','do','does','down','each','few','for','from','get','had','has','have','he','her','him','his','how','i','if','in','into','is','it','its','just','me','more','most','my','no','not','now','of','off','on','only','or','our','out','own','she','so','some','such','than','that','the','their','them','then','there','these','they','this','those','to','too','up','us','very','was','we','were','what','when','where','which','who','will','with','you','your','been','being','would','could','should','may','might','shall','must','its','also','both','during','including','without','within','across','among','through','between','since','about','against','into','onto','toward','towards']);

// Generic words that appear in any CV — don't count them as ATS keywords
const GENERIC = new Set(['trabajo','trabajar','empresa','años','año','experiencia','equipo','capacidad','conocimiento','conocimientos','habilidades','persona','personas','perfil','buscamos','ofrecemos','salario','funciones','responsabilidades','requisitos','incorporación','jornada','contrato','vacante','puesto','cargo','rol','trabajo','tareas','función','área','departamento','nivel','tipo','forma','manera','lugar','tiempo','vez','parte','caso','project','team','experience','skills','ability','year','years','working','work','role','position','company','looking','required','requirements','responsibilities','candidate','apply','job','great','good','new','will','join','including','ensure','provide','support','develop','manage','use','using','help','based','well','strong','ability','excellent','highly','key','preferred']);

const STOP_ALL = new Set([...STOP_ES, ...STOP_EN, ...GENERIC]);

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\sáéíóúüñàèìòùâêîôûäëïöü]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 4 && !STOP_ALL.has(w) && !/^\d+$/.test(w));
}

// Extract ATS keywords from job offer (unigrams + bigrams weighted by frequency)
function extractKeywords(jobText, topN = 50) {
  const words = tokenize(jobText);
  const rawWords = jobText.toLowerCase().replace(/[^\w\sáéíóúüñ]/g, ' ').split(/\s+/);

  // Unigram frequency
  const freq = {};
  for (const w of words) {
    freq[w] = (freq[w] || 0) + 1;
  }

  // Bigrams (catch "machine learning", "customer success", "atención al cliente", etc.)
  const bigramFreq = {};
  for (let i = 0; i < rawWords.length - 1; i++) {
    const w1 = rawWords[i].trim();
    const w2 = rawWords[i + 1].trim();
    if (w1.length >= 3 && w2.length >= 3 && !STOP_ALL.has(w1) && !STOP_ALL.has(w2)) {
      const bg = w1 + ' ' + w2;
      bigramFreq[bg] = (bigramFreq[bg] || 0) + 1;
    }
  }

  const keywords = [];

  // Add top unigrams sorted by frequency (more frequent = more important in this job)
  const sortedUnigrams = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN);
  for (const [w] of sortedUnigrams) keywords.push(w);

  // Add bigrams that appear 2+ times (specific phrases)
  for (const [bg, count] of Object.entries(bigramFreq)) {
    if (count >= 2 && keywords.length < topN + 20) keywords.push(bg);
  }

  return [...new Set(keywords)];
}

// Count how many keywords appear in a CV text
function scoreCV(cvText, keywords) {
  const cvLower = cvText.toLowerCase();
  let matches = 0;
  for (const kw of keywords) {
    if (cvLower.includes(kw)) matches++;
  }
  return keywords.length > 0 ? Math.round((matches / keywords.length) * 100) : 0;
}

// Main function: returns real mathematical ATS scores
function calculateATSScore(originalCVText, optimizedCVText, jobText) {
  const keywords = extractKeywords(jobText, 50);
  if (keywords.length === 0) return { score_antes: 0, score_despues: 0, keywords: [] };

  const scoreBefore = scoreCV(originalCVText, keywords);
  const scoreAfter  = scoreCV(optimizedCVText, keywords);

  // Top 8 display keywords: ones found in optimized CV, single words only (for tag display)
  const displayKeywords = keywords
    .filter(kw => !kw.includes(' ') && optimizedCVText.toLowerCase().includes(kw))
    .slice(0, 8);

  return {
    score_antes: scoreBefore,
    score_despues: scoreAfter,
    keywords: displayKeywords
  };
}

module.exports = { calculateATSScore, extractKeywords, scoreCV };
