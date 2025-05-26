import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sqlAssistantPrompt } from '../prompts/sqlAssistantPrompt';
import { getOpenAICompletion } from '../services/openaiService';
import { isValidSQL } from '../utils/sqlValidator';

const prisma = new PrismaClient();

// Diccionario de sinónimos para subtipus
const subtipusDictionary: Record<string, string> = {
  'ducha': 'DutxaPlat',
  'duchas': 'DutxaPlat',
  'dutxa': 'DutxaPlat',
  'dutxes': 'DutxaPlat',
  'plato de ducha': 'DutxaPlat',
  'plat de dutxa': 'DutxaPlat',
  'plat dutxa': 'DutxaPlat',
  // Magatzem/almacén sinónimos
  'magatzem': 'Mgtz.',
  'magatzems': 'Mgtz.',
  'almacén': 'Mgtz.',
  'almacen': 'Mgtz.',
  'almacenes': 'Mgtz.',
  'mgtz': 'Mgtz.',
  'mgtz.': 'Mgtz.',
  // InodorMonobloc sinónimos
  'inodor': 'InodorMonobloc',
  'inodoro': 'InodorMonobloc',
  'inodors': 'InodorMonobloc',
  'inodoros': 'InodorMonobloc',
  'water': 'InodorMonobloc',
  'wc': 'InodorMonobloc',
  'váter': 'InodorMonobloc',
  'vater': 'InodorMonobloc',
  // LavaboMural sinónimos
  'lavabo': 'LavaboMural',
  'lavabos': 'LavaboMural',
  'pica': 'LavaboMural',
  'piques': 'LavaboMural',
  'rentamans': 'LavaboMural',
  'rentamanos': 'LavaboMural',
  'lavamanos': 'LavaboMural',
  'lavamanos mural': 'LavaboMural',
  // Añade aquí más sinónimos según sea necesario
};

function normalizaPregunta(pregunta: string): string {
  let preguntaNormalizada = pregunta;
  for (const [sinonimo, canonico] of Object.entries(subtipusDictionary)) {
    // Reemplazo insensible a mayúsculas/minúsculas y solo palabras completas
    const regex = new RegExp(`\\b${sinonimo}\\b`, 'gi');
    preguntaNormalizada = preguntaNormalizada.replace(regex, canonico);
  }
  return preguntaNormalizada;
}

export const consultaNatural = async (req: Request, res: Response) => {
  try {
    const { pregunta } = req.body;
    if (!pregunta) {
      return res.status(400).json({ error: 'La consulta es obligatoria.' });
    }

    // Normalizar la pregunta usando el diccionario de subtipus
    const preguntaNormalizada = normalizaPregunta(pregunta);

    // Construir el prompt final
    const prompt = `${sqlAssistantPrompt}\n\n${preguntaNormalizada}`;

    // Obtener la consulta SQL desde OpenAI
    const sql = (await getOpenAICompletion(prompt)).trim();
    console.log('SQL generado:', sql);

    // Validar la consulta SQL antes de ejecutarla
    if (!isValidSQL(sql)) {
      return res.status(400).json({ error: 'La consulta generada no es válida.', sql });
    }

    // Ejecutar la consulta SQL
    let result;
    function replacerBigInt(key: string, value: any) {
      return typeof value === 'bigint' ? value.toString() : value;
    }
    try {
      result = await prisma.$queryRawUnsafe(sql);
    } catch (e) {
      console.error('Error ejecutando la consulta SQL generada:', e);
      return res.status(400).json({ error: 'Error ejecutando la consulta SQL generada.', sql, details: (e as Error).message });
    }
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ sql, result }, replacerBigInt));
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Error en la consulta', details: err.message });
  }
};
