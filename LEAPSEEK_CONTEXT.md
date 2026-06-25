# LEAPSEEK — Contexto completo del proyecto

## Qué es Leapseek
Leapseek es una aplicación web de búsqueda de empleo que usa IA para:
1. Optimizar CVs para cada oferta de trabajo (pasar filtros ATS)
2. Generar cartas de presentación personalizadas
3. Simular entrevistas de trabajo con IA (pendiente de construir)
4. Dar feedback detallado de la entrevista (pendiente)
5. Preparar al candidato antes de la entrevista (pendiente)

El producto está dirigido a todo tipo de personas que buscan trabajo — recién graduados, profesionales en activo, personas sin estudios, cualquiera.

---

## La fundadora
- Test Engineer de software de coches (sector automoción)
- Trabaja en home office con jornada completa
- Tiene ~5 horas semanales para dedicar a Leapseek
- Sin conocimientos de programación pero con criterio técnico (sabe detectar fallos)
- No quiere aparecer en cámara en redes sociales (miedo al entorno laboral)
- Ordenador de trabajo: NO usar para Leapseek (riesgo laboral)
- Ordenador personal: MacBook Neo 2026, chip A18 Pro, 512GB — pendiente de comprar
- Basada en España

---

## Identidad de marca

**Nombre:** Leapseek
- "Leap" = salto en inglés
- "Seek" = buscar
- Doble significado: dar el salto + buscar trabajo
- Claim: "Da el salto a tu próximo trabajo"

**Logo:**
- Icono: letra L en negro con borde blanco sobre fondo verde esmeralda, esquinas redondeadas
- La L toca el borde inferior y el lado izquierdo del cuadrado
- El borde blanco se funde con el fondo blanco
- Colores: verde #3DD68C, negro #0E1A14, blanco #FFFFFF
- Tipografía logo: mayúsculas bold, sans-serif (Arial Black)
- Archivos: leapseek_logo.svg, leapseek_logo.jpg

**Paleta de colores:**
- Verde principal: #3DD68C
- Verde oscuro: #28B874
- Fondo claro: #F7FBF9
- Fondo blanco: #FFFFFF
- Texto: #0E1A14
- Muted: #6B8F7A
- Border: #D6EDE3
- Surface: #EEF7F2

**Tipografías:**
- Títulos: Syne (Google Fonts) — weight 700/800
- Cuerpo: DM Sans (Google Fonts) — weight 300/400/500/600

**Tono de marca:**
- Moderno y cercano (como Notion)
- No corporativo, no serio
- Habla directamente al usuario
- Referencias de diseño: TicketSwap, Kleinanzeigen, ClassPass

---

## Web actual

**URLs:**
- Landing page: leapseek.netlify.app (index.html)
- App: leapseek.netlify.app/app.html
- Legal: leapseek.netlify.app/legal.html
- Hosting: Netlify (gratuito)
- Dominio propio pendiente: leapseek.app (~15€/año, pendiente de comprar)

**Archivos del proyecto:**
- index.html — landing page completa
- app.html — la aplicación de optimización de CV
- legal.html — política de privacidad, términos y condiciones, política de cookies

---

## Funcionalidades actuales (app.html)

### Lo que hace ahora:
1. El usuario sube su CV en PDF
2. Pega el texto de la oferta de trabajo en un textarea
3. La app llama a la API de Anthropic (Claude Sonnet 4.6)
4. Devuelve JSON con:
   - score_antes (estimación ATS antes de optimizar)
   - score_despues (estimación ATS después de optimizar)
   - keywords (palabras clave detectadas en la oferta)
   - cv_optimizado (CV reescrito con keywords)
   - carta_presentacion (solo usuarios Pro)
   - preguntas_entrevista (solo usuarios Pro)
5. Muestra score ATS visual con anillos animados
6. Muestra keywords como tags
7. Tabs: CV optimizado / Carta (bloqueada para gratis) / Entrevista (oculta para gratis)
8. Botón copiar CV
9. Botón descargar PDF (usando jsPDF)
10. Detecta incompatibilidad de perfil con la oferta

### Flujo de usuario gratuito:
1. Hace clic en "Adaptar mi CV"
2. Aparece popup pidiendo email (se guarda en Brevo y en localStorage)
3. Sube CV + pega texto de oferta
4. Ve resultado: score ATS + keywords + CV optimizado
5. Carta de presentación bloqueada con preview borrosa → botón "Ver planes Pro"
6. Pestaña entrevista oculta
7. Botón "Nueva" oculto (solo 1 uso gratuito)

### Limitaciones técnicas actuales (IMPORTANTES):
- **API key expuesta en el HTML** — cualquiera que inspeccione el código la ve y puede usarla
- **Control de usos por localStorage** — se puede saltear borrando el navegador
- **No hay backend** — todo corre en el frontend
- **LinkedIn bloquea scraping** — por eso se usa textarea para pegar texto
- **Score ATS es estimación de IA** — no es un cálculo real (pendiente skill diferencial)
- **No hay login de usuarios** — no hay base de datos
- **No hay sistema de pagos** — Stripe pendiente

---

## Planes y precios definidos

| Plan | Precio mensual | Precio anual | Funcionalidades |
|------|---------------|--------------|-----------------|
| Gratis | 0€ | — | 1 CV optimizado, score ATS, keywords. Sin carta ni entrevista |
| Pro | 12,99€/mes | 99€/año (ahorra 37%) | CV ilimitado + carta de presentación + 3 simulacros/mes + feedback básico |
| Élite | 19,99€/mes | 159€/año (ahorra 34%) | Todo ilimitado + preparación completa + feedback detallado + informe empresa |

**Nota política de uso razonable Élite:** máximo orientativo 50 simulacros/mes. Incluido en términos y condiciones.

**Modelo de IA por plan:**
- Gratis: Claude Sonnet 4.6 (necesario para leer PDFs — Haiku no puede)
- Pro: Claude Sonnet 4.6
- Élite: Claude Sonnet 4.6 (considerar Opus para simulacros en el futuro)

**Coste actual por uso:** ~0,20€ con Sonnet (2000 max_tokens, temperature: 0)

---

## API de Anthropic

**Modelo actual:** claude-sonnet-4-6
**Parámetros:**
- max_tokens: 2000
- temperature: 0 (para consistencia en scores)
- Herramienta web_search: eliminada (causaba problemas)

**API key:** La fundadora tiene su propia API key en console.anthropic.com
- Auto-reload: DESACTIVADO
- Límite mensual: 5$ (para evitar sustos)
- La API key está actualmente hardcodeada en app.html (PROBLEMA DE SEGURIDAD — resolver en fase 2)

**Prompt del sistema (resumen):**
- Detecta compatibilidad perfil/oferta (si no encaja avisa)
- Detecta idioma de la oferta y responde en ese idioma
- Calcula score ATS antes y después
- Optimización agresiva de keywords (objetivo 85%+)
- Para usuarios Pro: genera carta + preguntas de entrevista
- Responde SOLO en JSON

---

## Email y lista de espera

**Brevo (antes Sendinblue):**
- URL del formulario: https://9efe9e10.sibforms.com/serve/MUIFAFHMgLkvKYYNcLL8qcDVgXmNaeUCDpPMCgBwTbaA3RQjLtmIoEIHzGB4jMIwBfEwz8zkP5r-5-d9Nh_u38HOt-kyz0AJt5LPZhcXD4Rwy6XR6ifWUlWeihKe3QNOk58hMts8I_YL8XHLFiHS_LDND8W6ppglk-IkZc9AFVeVEOU5YATdIAFEiuRxddtwyUwTBUH_k0o7r9gtRQ==
- Se usa en: popup de lista de espera (landing) y gate de email (app)
- Los emails se guardan en Brevo → Contacts

**Email del negocio:** leapseek@gmail.com (o similar, confirmar)

---

## Instagram

**Handle:** @leapseek
**Posts publicados:**
1. Post 1 (fondo negro): "El 75% de los CVs son rechazados por un robot antes de que nadie los lea. Lo estamos arreglando!" — 11 visualizaciones
2. Post 2 (fondo verde): "Llevo 3 meses aplicando a ofertas y nada. Spoiler: el problema no eras tú" — 8 visualizaciones

**Post 3 pendiente:** "Una palabra puede ser la diferencia entre que te llamen o no. La IA ya lo sabe. Pronto tú también." (fondo negro)

**Estrategia:**
- Publicar entre 19-21h España
- Alternar fondos: negro, verde, negro
- Máximo 5 hashtags (límite Instagram)
- No sale la cara de la fundadora (privacidad laboral)
- Contenido: educativo sobre ATS y búsqueda de empleo, sin mostrar el producto todavía
- Futuro: reels mostrando el producto en acción

**Hashtags que funcionan:**
#buscarempleo #empleojoven #trabajoenespana #cv #inteligenciaartificial

---

## Legal

**Documentos creados (legal.html):**
- Política de privacidad (RGPD compliant)
- Términos y condiciones (incluye política de uso razonable)
- Política de cookies

**Estado legal:**
- No se almacenan CVs en servidores (los procesa la API y descarta)
- Datos de pago gestionados por Stripe (pendiente de integrar)
- Marca "Leapseek" NO registrada todavía
- Existe una empresa china de beauty con web leapseek.com — sector completamente diferente, no hay conflicto
- Pendiente: registrar marca en OEPM España (~150€) cuando haya ingresos
- Pendiente: registrar marca EUIPO Europa (~1.200€) cuando escale

---

## Tareas pendientes ordenadas por prioridad

### 🔴 FASE 2 — Backend (con Claude Code, ordenador personal):
1. **Backend Node.js + Supabase** — lo más urgente
   - API key segura en servidor (no expuesta en HTML)
   - Control real de usuarios por email en base de datos
   - Control real de límite de usos (no por localStorage)
   - Convertir PDF a texto en servidor → usar Haiku para bajar coste a ~0,02€
2. **Sistema de pagos Stripe** — Pro y Élite reales
3. **Login de usuarios** — historial de CVs, gestión de plan

### 🟡 PENDIENTE — Producto:
4. **Skill diferencial ATS** — algoritmo propio que cuente keywords reales
   - No usar estimación de IA sino cálculo matemático real
   - Hacer CVs más competitivos que cualquier competidor
   - Score 100% consistente y reproducible
5. **Simulacro de entrevista** — flujo completo:
   - Preparación previa (info empresa, preguntas típicas)
   - Simulacro por texto (fase 1) → por voz con ElevenLabs (fase 2)
   - Feedback detallado por respuesta
6. **Informe de empresa** — al pegar la oferta, mostrar info de la empresa
7. **Extensión de Chrome** — para leer ofertas de LinkedIn sin copiar texto

### 🟢 PENDIENTE — Marketing y web:
8. **Tercer post de Instagram** — "Una palabra puede cambiarlo todo"
9. **Primer reel de Instagram** — mostrar el producto en acción
10. **SEO** — cuando el producto esté sólido
11. **Testimonios reales** — cuando haya usuarios con resultados reales
12. **Comprar dominio leapseek.app** — ~15€/año, cuando haya tracción
13. **Registrar marca OEPM** — cuando haya ingresos

### ⚙️ PENDIENTE — Técnico menor:
14. **Actualizar precios en web** con tres planes correctos
15. **Botón "Nueva"** — gestionar mejor para usuarios gratuitos

---

## Stack técnico actual y planificado

**Fase 1 (actual):**
- Frontend: HTML + CSS + JavaScript vanilla
- Hosting: Netlify (gratuito)
- IA: Anthropic API (Claude Sonnet 4.6)
- Email/lista de espera: Brevo
- PDF generation: jsPDF
- Sin backend, sin base de datos, sin autenticación

**Fase 2 (planificada con Claude Code):**
- Frontend: HTML/CSS/JS (mismo, mejorado)
- Backend: Node.js + Express
- Base de datos: Supabase (PostgreSQL)
- Autenticación: Supabase Auth
- Pagos: Stripe
- Hosting backend: Railway o Render (gratuito para empezar)
- Hosting frontend: Netlify (mismo)
- IA: Anthropic API (Haiku para gratis, Sonnet para Pro/Élite)
- Voz (futuro): ElevenLabs

---

## Decisiones importantes ya tomadas (no reabrir)
- Nombre: Leapseek (definitivo)
- Colores: verde #3DD68C + blanco + negro (definitivo)
- 1 uso gratuito con Sonnet (no Haiku — no lee PDFs)
- Pegar texto en lugar de link para las ofertas (LinkedIn bloquea scraping)
- Precios: Gratis / 12,99€ o 99€/año / 19,99€ o 159€/año
- No mostrar cara de la fundadora en redes
- No registrar marca todavía (esperar ingresos)
- No comprar dominio todavía (esperar tracción)
- Brevo para emails (formulario ya configurado)

---

## Cómo usar este documento en Claude Code
Cuando empieces una sesión nueva en Claude Code, comparte este archivo al inicio con:
"Lee el archivo LEAPSEEK_CONTEXT.md para entender el proyecto antes de empezar"

Así tendrás todo el contexto sin tener que repetirlo.
