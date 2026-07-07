# Modo Entrevista — diseño cerrado (2026-07-07)

Feature v1 (texto; la voz es post-lanzamiento, solo Élite).

## Flujo
1. Se lanza desde una candidatura ya optimizada (tiene CV + oferta como contexto).
2. **Sesión cronometrada: 45 min** (rango aceptable 40-50). Cronómetro visible.
3. **Preguntas una a una**, formato chat. La persona escribe la respuesta y pasa a la siguiente.
4. **Número dinámico:** las preguntas van saliendo hasta que se acaba el tiempo (de un pool pre-generado de ~15). Rápido respondiendo → más preguntas; lento → menos.
5. **Aviso suave** si tarda demasiado en una pregunta ("vamos cerrando esta respuesta, que el tiempo corre"). NO corte brusco. El cronómetro general hace de límite real.
6. Al acabar (tiempo o pool): **feedback de 2 párrafos** en texto.
7. El feedback **se guarda en el dashboard** (asociado a esa candidatura).

## Áreas que cubren las preguntas (basadas en STAR + entrevista por competencias)
1. Calentamiento ("cuéntame de ti")
2. Motivación (por qué esta empresa / rol)
3-4. Experiencia / logros (STAR)
5-6. Comportamiento (conflicto, presión/fracaso) (STAR)
7-8. Técnica del rol
9. Perfil personal (fortalezas/debilidades, feedback, metas)
10. Salario / disponibilidad
(pool de ~15 para llenar 45 min; distribuidas por estas áreas)

## Señales que se miden por respuesta
- Tiempo que tarda en responder (timestamp pregunta mostrada → respuesta enviada)
- Longitud de la respuesta (nº de palabras)

## Feedback (2 párrafos) evalúa DOS cosas
- **Contenido:** ¿usó STAR? ¿ejemplos concretos con números? ¿respondió lo que le preguntaban?
- **Ritmo:** ¿demasiado corto (falta profundidad)? ¿demasiado largo (no va al grano)? ¿gestionó bien el tiempo? ¿cuántas preguntas cubrió?
- Párrafo 1 = lo que hizo bien · Párrafo 2 = lo que mejorar (concreto y accionable)

## Referencias / fuente de las preguntas
- Frameworks: **STAR** + entrevista por competencias (en el prompt).
- La oferta (competencias que pide) + el CV.
- Conocimiento del modelo (sabe cómo son las entrevistas reales). NO rascamos Glassdoor (career-ops sí, pero añade fragilidad; idea futura).

## Repetición
- Preguntas **diferentes** cada intento (v1: la IA genera pool fresco = comportamiento por defecto).
- **Futuro (adaptativo):** el feedback detecta áreas flojas → la siguiente sesión se centra en ellas.

## Arquitectura de build
- Backend: `POST /api/interview/start` → genera pool de ~15 preguntas (CV+oferta, idioma de la oferta, por áreas). Prompt en `backend/prompts/interview-questions.md`.
- Backend: `POST /api/interview/feedback` → recibe Q+A + tiempos → devuelve feedback 2 párrafos. Prompt en `backend/prompts/interview-feedback.md`.
- Frontend: sección Entrevista en platform.html → chat una-a-una + cronómetro 45 min + aviso suave + tiempos por respuesta.
- Persistencia: guardar sesión + feedback en Supabase (tabla `interview_sessions` o dentro de `applications`) para el dashboard.

## Dependencia con el dashboard
El feedback se guarda en el dashboard. Como el dashboard aún no existe: guardar la sesión en una tabla Supabase ya, y el dashboard la leerá cuando se construya. (O mostrar el feedback ya y persistir cuando esté el dashboard — decidir al construir.)
