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

FORMATO DE SALIDA — devuelve la carta en PIEZAS estructuradas en el objeto "cover" del JSON (no un bloque de texto):
- "city_date": "Ciudad, Mes Año" (ej: "Barcelona, julio 2026"), usa la ciudad del candidato
- "re": "Re: [título exacto del puesto de la oferta] - [empresa]" (usa guion normal " - ", NUNCA guion largo)
- "greeting": saludo directo (ej: "Hola equipo de [empresa]," o en inglés "Hi [company] team,")
- "paragraphs": array con los 4 párrafos del cuerpo, cada uno una cadena sin saltos de línea dentro
- "closing": línea corta de cierre antes de la firma (ej: "Un saludo," / "Gracias por tu tiempo," / "Best regards,")
No repitas el nombre ni el contacto en la carta: se añaden solos desde el CV.

PREGUNTAS DE ENTREVISTA:
Genera exactamente 6 preguntas específicas para el puesto en el MISMO IDIOMA de la oferta.
Mezcla: 2 técnicas del rol, 3 de comportamiento (método STAR), 1 de motivación concreta para ESA empresa.

El JSON debe incluir el objeto cover completo (city_date, re, greeting, paragraphs, closing) y preguntas_entrevista.