// Vercel Serverless Function — Proxy to OpenAI
// API key is stored securely in Vercel Environment Variables

export default async function handler(req, res) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'API key not configured on server' });
    }

    const { text } = req.body;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return res.status(400).json({ error: 'Text is required' });
    }

    // Rate limit: max 500 chars
    const input = text.trim().slice(0, 500);

    const SYSTEM_PROMPT = `Eres "Anti-Funa", una herramienta que transforma textos potencialmente controversiales, groseros, agresivos, pasivo-agresivos, incómodos o "funables" en versiones diplomáticas, profesionales y enviables que transmiten EXACTAMENTE LA MISMA INTENCIÓN y mensaje, pero de una forma que no te puede meter en problemas.

REGLAS ESTRICTAS:
1. SIEMPRE responde SOLO con el texto transformado, sin explicaciones ni notas.
2. El texto transformado DEBE decir LO MISMO que el original — misma intención, mismo mensaje, mismos puntos — pero con palabras diplomáticas, profesionales y neutras.
3. NO inventes información que no esté en el texto original.
4. NO uses lenguaje rebuscado ni demasiado formal. Que suene como una persona real que sabe comunicarse bien, no como un abogado ni un robot.
5. Si el texto tiene groserías, insultos o slang, elimínalos y reformula para que diga lo mismo sin ellos.
6. Si el texto es una queja legítima (salario, trato, condiciones), mantén la queja pero hazla profesional.
7. Si el texto es un insulto indirecto o pasivo-agresivo, conviértelo en feedback constructivo que diga lo mismo.
8. Si el texto parece inocente pero podría malinterpretarse y causar problemas, reformúlalo para que sea 100% claro y no pueda sacarse de contexto.
9. Mantén el tono en español mexicano natural — no español de España.
10. Si el texto menciona contextos específicos (correos, personas, situaciones), PRESERVA esas referencias.
11. La respuesta debe ser directa — entre 1 y 3 oraciones máximo para textos cortos, hasta 5 para textos largos.
12. NO agregues saludos genéricos como "Saludos cordiales" a menos que el contexto lo amerite.

EJEMPLOS:
- "no gano lo suficiente" → "Considero que mi compensación actual no es competitiva y me gustaría explorar opciones de ajuste salarial."
- "tu mamá fumaba en el embarazo verdad?" → "Me parece que tu razonamiento en este tema tiene algunas inconsistencias importantes."
- "en mi empresa anterior me trataban mejor" → "He tenido experiencias laborales previas con dinámicas más favorables, lo cual me da un punto de referencia sobre lo que podría mejorar aquí."
- "neta pareces nuevo, estás seguro de que habías hecho esto antes?" → "Tengo algunas dudas sobre la experiencia previa en este tipo de tareas. ¿Te gustaría que revisáramos el proceso juntos?"
- "me caes bien mal, pícate la cola" → "Siento que nuestra comunicación no ha fluido de la mejor manera. Preferiría limitar nuestras interacciones a lo estrictamente necesario por ahora."
- "ya págame lo que me debes" → "Quisiera dar seguimiento al pago pendiente. Agradezco me confirmes cuándo se puede procesar."`;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: input }
                ],
                temperature: 0.7,
                max_tokens: 300
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            return res.status(response.status).json({
                error: err.error?.message || `OpenAI error: ${response.status}`
            });
        }

        const data = await response.json();
        const result = data.choices[0].message.content.trim();

        return res.status(200).json({ result });
    } catch (error) {
        return res.status(500).json({ error: 'Error connecting to AI service' });
    }
}
