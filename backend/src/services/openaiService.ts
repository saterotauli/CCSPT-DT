import axios from 'axios';

// Servicio para interactuar con la API de OpenAI
// Aquí se centraliza la lógica para llamar al modelo y procesar la respuesta

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';

export async function getOpenAICompletion(prompt: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('No hay clave de OpenAI configurada.');
  }

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: 'Eres un asistente experto en SQL para una base de datos PostgreSQL.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 256,
        temperature: 0
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    const sql = response.data.choices[0].message.content;
    return sql;
  } catch (err: any) {
    console.error('Error llamando a OpenAI:', err.response?.data || err.message);
    throw new Error('Error llamando a OpenAI: ' + (err.response?.data?.error?.message || err.message));
  }
}
