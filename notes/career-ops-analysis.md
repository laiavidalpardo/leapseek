# Análisis de santifer/career-ops → qué robamos para Leapseek

Fecha: 2026-07-01
Fuente: https://github.com/santifer/career-ops (MIT, 57k⭐). Herramienta LOCAL (CLI sobre Claude Code / otros), no una web. Nosotros copiamos METODOLOGÍA y PROMPTS, no código.

Su autor evaluó 740+ ofertas, generó 100+ CVs y consiguió un puesto de Head of Applied AI con esto. La lógica de prompts está muy pulida.

---

## 🥇 LO QUE MÁS NOS SIRVE (por orden de impacto)

### 1. ~~Detección de "ghost jobs" / ofertas falsas~~ — DESCARTADO (2026-07-01)
Laia decidió NO hacerlo. No reabrir. El modelo de Leapseek es "tú traes la oferta, yo te ayudo con el CV/carta/entrevista", no evaluar ni filtrar ofertas.

### 2. Split de keywords: ATS-crítico vs señales humanas
Ahora mismo sacamos UNA lista de keywords (Call 1 Haiku). Ellos la dividen en dos, y es más inteligente:
- **ATS-critical**: títulos de rol, nombres de herramientas, metodologías (lo que escanea la máquina).
- **Human trust signals**: verbos de acción que usa la empresa, nombres de producto, lenguaje de resultado, forma de hablar del equipo (demuestra que LEÍSTE la oferta).

Regla de oro: *"Mirror their vocabulary, not their structure"* — copia su vocabulario, no su estructura. Cada keyword se usa UNA sola vez. Si no encaja natural, no la metas y avisa al final.

→ Mejora directa a `analyzeJobOffer()`: devolver `keywords_ats` y `keywords_humanas` por separado.

### 3. Distribución de keywords en el CV (dónde colocarlas)
Guía concreta que nos falta en el writer prompt:
- **Resumen**: las top 5 keywords.
- **Primer bullet de cada puesto**: una keyword relevante.
- **Sección de Skills**: el resto.

Orden de secciones para el "escaneo de 6 segundos" del reclutador:
1. Header (nombre + contacto)
2. Resumen profesional (3–4 líneas, denso en keywords)
3. Competencias clave (6–8 frases-keyword)
4. Experiencia (cronológico inverso, **reordenada por relevancia a la oferta**)
5. Proyectos (top 3–4)
6. Educación y certificaciones
7. Skills

→ Casi igual a nuestra estructura, pero añade: reordenar experiencia por relevancia + poner keyword en el primer bullet de cada rol.

### 4. FIX TÉCNICO ATS: ligaduras rompen keywords (crítico si volvemos a PDF)
Su template desactiva ligaduras con:
```css
font-variant-ligatures: none;
font-feature-settings: "liga" 0;
```
Motivo: Chromium headless al generar PDF convierte "fi/fl/ffi" en glifos Unicode U+FB01/FB02/FB03, y el ATS extrae texto roto → keywords que no matchean. Nosotros generamos .docx (menos afectado), pero **apuntar esto por si añadimos export a PDF**. También: fuentes de sistema > web fonts para extracción limpia, sin tablas anidadas, sin texto en imágenes/SVG, sin info crítica en header/footer del PDF.

### 5. Dos niveles de "voz" (Tier 1 vs Tier 2) — más fino que nuestro humanizer
Nosotros aplicamos humanización a todo por igual. Ellos distinguen:
- **Tier 1 — Anti-AI-slop (reglas duras)**: palabras prohibidas, frases muertas, formato. Se aplica a **TODO** el texto generado, CV incluido.
- **Tier 2 — Voz conversacional**: contracciones, empezar frases con "Y/Pero", matices, incisos. Se aplica **SOLO** a texto de cara a persona (carta, mensajes), **NO al CV/ATS**.

→ El CV debe ser nítido y factual; la carta más humana. Deberíamos separar los dos niveles en el prompt en vez de humanizar el CV igual que la carta.

Principio clave: **"Accuracy always wins over style"** — los hechos del CV nunca se sacrifican por sonar bien.

### 6. Self-check de carta (baratísimo, añadir ya)
Antes de dar la carta por buena:
> *"Re-lee cada frase: ¿podría aparecer en CUALQUIER carta para CUALQUIER empresa? Si sí, reescríbela."*

Una sola línea en el prompt que sube mucho la calidad. Añadir a nuestro bloque CARTA.

### 7. Lista ampliada de palabras/frases prohibidas
La nuestra ya es buena; añadir de la suya lo que nos falte:
- **Buzzwords carta**: leverage, synergy, seamless, holistic, robust, cutting-edge, spearheaded, championed, orchestrated, passionate, excited, stakeholder alignment, data-driven, actionable insights, move the needle, north star, unique opportunity, perfect fit, strong track record.
- **Clichés generales**: "passionate about", "results-oriented", "proven track record", "leveraged", "spearheaded", "facilitated", "synergies", "robust", "seamless", "cutting-edge", "innovative", "in today's fast-paced world", "demonstrated ability to", "best practices".
- **Formato**: sin em dashes (—); usar comas o puntos.

### 8. Estructura de carta con conteo de palabras
- Header + credenciales (no cuenta)
- Apertura: 2 frases (por qué aplicas + resumen funcional)
- Intro de perfil: 1 párrafo
- Logros: 4–5 bullets en formato `**Frase líder en negrita,** frase de impacto con métrica`
- Sección de problemas (qué resolverías): 2–3 frases
- Cierre: 1–2 frases
- **Cuerpo total: 350–420 palabras**

→ Nuestra carta son 4 párrafos libres; darle este esqueleto con rango de palabras la hace más consistente.

---

## 🥈 PARA MÁS ADELANTE (features nuevas)

### 9. Simulador de entrevista mejorado: STAR+R + audiencias
Ahora generamos 6 preguntas (2 técnicas, 3 STAR, 1 motivación). Su modelo es más completo:

**STAR+R** = STAR + **Reflection** (qué harías distinto / qué aprendiste). Añadir la R sube el nivel de las respuestas.

**Segmentación por audiencia** (cada ronda pregunta cosas distintas):
| Audiencia | Preguntas típicas | Qué evalúan |
|-----------|-------------------|-------------|
| recruiter-screen | narrativa CV, salario, motivación, ubicación/visa, timing | logística e intención |
| hiring-manager | por qué este rol/equipo, plan 90 días, alcance, liderazgo | motivación y ownership |
| peer-tech | profundidad técnica, system design, coding, colaboración | competencia y encaje |
| panel-mixed | las tres, sin repetir | evaluación transversal |

**Regla anti-invención**: nunca fabricar preguntas. Solo 3 fuentes: (1) sourced (Glassdoor/Blind/blog, con cita+fecha), (2) inferred from JD `[inferred from JD]`, (3) inferred audience `[inferred]`.

### 10. Feedback de respuestas: framing "resultado primero"
Para nuestra feature pendiente de feedback de entrevista, su plantilla de respuesta:
1. **Titular** — la decisión o resultado
2. **Efecto** — impacto en negocio/usuario/sistema
3. **Rationale** — el tradeoff/restricción que lo motivó
4. **Operaciones** — qué hiciste realmente

Ej.: *"Redujimos la latencia de la API un 40% [titular]. Esto habilitó features en tiempo real para móvil, +15% de engagement [efecto]. Elegimos gRPC sobre REST porque los payloads crecían y la serialización era el cuello de botella [rationale]. Perfilamos tráfico real, migramos servicio a servicio, e hicimos rollback de uno por versiones de cliente incompatibles [operaciones]."*

→ Podemos dar feedback puntuando si la respuesta del usuario tiene estos 4 elementos.

### 11. Score multidimensional "¿debería aplicar?" (distinto del ATS)
Su score global 1–5 NO es match de keywords (eso es otra cosa), es "merece la pena aplicar":
| Dimensión | Mide |
|-----------|------|
| Match con CV | Skills/experiencia/pruebas |
| North Star | Encaje con objetivos del candidato |
| Comp | Salario vs mercado (5=top quartil) |
| Señales culturales | Cultura, crecimiento, estabilidad, remoto |
| Red flags | Bloqueadores (ajuste negativo) |
| **Global** | Media ponderada |

Interpretación: 4.5+ aplica ya · 4.0–4.4 vale la pena · 3.5–3.9 solo si razón concreta · <3.5 no recomienda.

→ Feature Pro futura: además del % ATS, un "match score" de si la oferta te conviene. Ojo: requiere saber objetivos del usuario (perfil).

### 12. Multi-idioma real
Tienen modos en 13 idiomas (es, pt, fr, de, it, ja, zh, ar, ru, pl, tr, ua, da). Nosotros ya detectamos idioma de la oferta; si algún día internacionalizamos, su estructura por carpetas de idioma es un buen patrón.

---

## 🚫 LO QUE NO NOS SIRVE (por qué)
- Todo el sistema de **scanning de portales** (Greenhouse/Ashby/Lever con Playwright) y el **dashboard TUI en Go**: es una herramienta local de un power-user, no una web SaaS. Nuestro flujo es "pega la oferta".
- **Batch processing / sub-agents / pipeline**: mismo motivo.
- **Reglas de "no auto-submit", tracker en markdown local**: nuestro historial va en Supabase.
- La regla suya de **no inventar comp data con WebSearch**: nosotros no hacemos research de salario (todavía; ver #11).

---

## ✅ ACCIONES (quick wins primero)
1. **[HECHO 2026-07-01]** Self-check de carta (#6) + lista ampliada de prohibidas (#7) + sin guion largo → `buildWriterPrompt` en `backend/utils/anthropic.js`.
2. **[HECHO 2026-07-01]** Dos niveles de voz Tier 1 (CV+carta) / Tier 2 (solo carta) (#5) + longitud de carta 350-420 palabras (#8).
3. **[HECHO 2026-07-01]** `analyzeJobOffer()` devuelve `keywords_ats` y `keywords_humanas` (#2) + distribución de keywords y reordenar bullets por relevancia (#3).
4. **[HECHO 2026-07-01]** FEATURE "keywords que faltan": el backend devuelve `missing_keywords` (keywords de la oferta que no están en el CV) y acepta `extraSkills` (las que el usuario confirma tener) para regenerar el CV honestamente. UI de chips seleccionables + botón "Añadir al CV y recalcular" en app.html y platform.html. Nace del caso IAV (ASPICE/HIL que Laia probablemente tiene pero no estaban en el CV).
5. **[HECHO 2026-07-01]** Prohibido guion largo (—) y punto y coma (;) en la carta (reforzado). Petición directa de Laia: nadie los escribe a mano, delatan IA.
6. **[PENDIENTE — validar en producción]** Probar el flujo completo con CV + oferta reales tras desplegar.

**Mejoras aún abiertas (de los 3 casos de test):**
- Regla del título condicional: en saltos grandes (ej. Canyon "Senior IT Test Manager") no forzar un título/dominio que el candidato no ha tocado.
- Reforzar la excepción del carné de conducir cuando la oferta lo pide expresamente.
- Poder elegir el idioma de aplicación (no seguir siempre al idioma de la oferta).

**DESCARTADO por Laia (no reabrir):** detección de ghost jobs.
