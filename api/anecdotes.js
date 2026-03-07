import { createClient } from '@supabase/supabase-js';

// Inicializar cliente Supabase usando variables de entorno seguras de Vercel
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Fallback por si no están configuradas las variables
if (!supabaseUrl || !supabaseKey) {
    console.warn("Faltan variables de entorno de Supabase.");
}

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export default async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (!supabase) {
        return res.status(500).json({ error: 'Configuración de base de datos ausente.' });
    }

    // MÉTODO GET: Leer las anécdotas
    if (req.method === 'GET') {
        try {
            // Pedimos las últimas 25 anécdotas, ordenadas por más recientes
            const { data, error } = await supabase
                .from('anecdotes')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(25);

            if (error) throw error;

            return res.status(200).json({ anecdotes: data });
        } catch (err) {
            console.error('Error al obtener anécdotas:', err);
            return res.status(500).json({ error: 'Fallo al leer la base de datos' });
        }
    }

    // MÉTODO POST: Insertar una nueva anécdota
    if (req.method === 'POST') {
        try {
            const { name, cat, text } = req.body;

            if (!text || text.trim().length === 0) {
                return res.status(400).json({ error: 'El texto está vacío' });
            }

            // Validar que no manden biblias para no saturar la BD
            if (text.length > 800) {
                return res.status(400).json({ error: 'El texto es demasiado largo' });
            }

            // Preparamos la data limpia
            const safeName = name ? name.trim().substring(0, 50) : 'Anónimo';
            const safeCat = cat ? cat.trim().substring(0, 100) : 'Otro desastre laboral 🔥';
            const safeText = text.trim();

            const { data, error } = await supabase
                .from('anecdotes')
                .insert([{ name: safeName, cat: safeCat, text: safeText }])
                .select();

            if (error) throw error;

            return res.status(200).json({ success: true, inserted: data[0] });

        } catch (err) {
            console.error('Error al guardar anécdota:', err);
            return res.status(500).json({ error: 'Fallo al guardar en la base de datos' });
        }
    }

    // Si no es GET ni POST
    return res.status(405).json({ error: 'Método no permitido' });
}
