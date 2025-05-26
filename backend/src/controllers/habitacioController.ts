import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/ifcspace
export const getHabitacions = async (req: Request, res: Response) => {
  try {
    const ifcSpaces = await prisma.$queryRaw`
      SELECT * FROM "patrimoni"."ifcspace" ORDER BY guid ASC
    `;
    res.json(ifcSpaces);
  } catch (err: any) {
    res.status(500).json({ error: 'Error al obtener las ifcSpaces', details: err.message });
  }
};

// POST /api/ifcspace/summary
export const summaryHabitacions = async (req: Request, res: Response) => {
  try {
    let ifcSpaces = [];
    if (Array.isArray(req.body)) {
      ifcSpaces = req.body;
    } else if (typeof req.body === 'object' && req.body !== null) {
      ifcSpaces = req.body.ifcSpaces;
    }
    if (!Array.isArray(ifcSpaces)) {
      return res.status(400).json({ error: 'El cuerpo debe ser un array de ifcSpaces.' });
    }
    if (ifcSpaces.length === 0) {
      return res.status(200).json({ nuevos: 0, borrados: 0, modificados: 0 });
    }
    // Agrupar por edificio
    const edificios = Array.from(new Set(ifcSpaces.map((h: any) => h.edifici)));
    let nuevos = 0, borrados = 0, modificados = 0;
    for (const edificio of edificios) {
      const nuevasHabitaciones = ifcSpaces.filter((h: any) => h.edifici === edificio);
      const habitacionesDB: any[] = await prisma.$queryRaw`
        SELECT guid, codi, planta, dispositiu, departament, id, centre_cost, area FROM "patrimoni"."ifcspace" WHERE edifici = ${edificio}
      `;
      const guidsDB = habitacionesDB.map(h => h.guid);
      const guidsNuevos = nuevasHabitaciones.map((h: any) => h.guid);
      // Nuevos: están en nuevasHabitaciones pero no en la base de datos
      nuevos += nuevasHabitaciones.filter(h => !guidsDB.includes(h.guid)).length;
      // Borrados: están en la base de datos pero no en nuevasHabitaciones
      borrados += habitacionesDB.filter(h => !guidsNuevos.includes(h.guid)).length;
      // Modificados: existen en ambos pero tienen diferencias de campos relevantes
      modificados += nuevasHabitaciones.filter(h => {
        const db = habitacionesDB.find(x => x.guid === h.guid);
        if (!db) return false;
        // Compara campos relevantes
        return (
          db.codi !== h.codi ||
          db.planta !== h.planta ||
          db.dispositiu !== h.dispositiu ||
          db.departament !== h.departament ||
          db.id !== h.id ||
          db.centre_cost !== h.centre_cost ||
          Number(db.area) !== Number(h.area)
        );
      }).length;
    }
    res.json({ nuevos, borrados, modificados });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al calcular el resumen de ifcSpaces', details: err.message });
  }
};

// POST /api/ifcspace
export const updateHabitacions = async (req: Request, res: Response) => {
  try {
    let confirmDelete = false;
    let ifcSpaces = [];
    // Permitir que el body sea un array plano o un objeto
    if (Array.isArray(req.body)) {
      ifcSpaces = req.body;
    } else if (typeof req.body === 'object' && req.body !== null) {
      ifcSpaces = req.body.ifcSpaces;
      confirmDelete = req.body.confirmDelete || false;
    }
    if (!Array.isArray(ifcSpaces)) {
      return res.status(400).json({ error: 'El cuerpo debe ser un array de ifcSpaces.' });
    }
    if (ifcSpaces.length === 0) {
      return res.status(400).json({ error: 'El array de ifcSpaces está vacío.' });
    }
    // Agrupar habitaciones subidas por edificio
    const edificios = Array.from(new Set(ifcSpaces.map((h: any) => h.edifici)));
    let habitacionesAEliminar: any[] = [];
    for (const edificio of edificios) {
      console.log(`Edificio procesado: ${edificio}`);
      // Todas las habitaciones subidas para este edificio
      const nuevasHabitaciones = ifcSpaces.filter((h: any) => h.edifici === edificio);
      // Obtener todas las habitaciones actuales de ese edificio (con info extra)
      const habitacionesDB: any[] = await prisma.$queryRaw`
        SELECT guid, codi, planta, dispositiu, departament FROM "patrimoni"."ifcspace" WHERE edifici = ${edificio}
      `;
      const guidsDB = habitacionesDB.map(h => h.guid);
      const guidsNuevos = nuevasHabitaciones.map((h: any) => h.guid);
      console.log(`Guids en BD para edificio ${edificio}:`, guidsDB);
      console.log(`Guids recibidos para edificio ${edificio}:`, guidsNuevos);
      // Habitaciones a eliminar: están en la base de datos pero no en el fichero
      const aEliminar = habitacionesDB.filter(h => !guidsNuevos.includes(h.guid));
      console.log(`Guids a eliminar para edificio ${edificio}:`, aEliminar.map(h => h.guid));
      habitacionesAEliminar = habitacionesAEliminar.concat(aEliminar);
    }
    if (!confirmDelete) {
      // Solo advertir, no borrar
      return res.status(200).json({
        advertencia: 'Se detectaron habitaciones que serían eliminadas si confirmas.',
        habitacionesAEliminar
      });
    }
    // Borrar habitaciones que ya no están
    if (habitacionesAEliminar.length > 0) {
      const guidsAEliminar = habitacionesAEliminar.map(h => h.guid);
      await prisma.$executeRaw`
        DELETE FROM "patrimoni"."ifcspace" WHERE guid = ANY(${guidsAEliminar})
      `;
    }
    // Insertar o actualizar habitaciones nuevas/actualizadas
    for (const h of ifcSpaces) {
      await prisma.$executeRaw`
        INSERT INTO "patrimoni"."ifcspace" (
          guid, dispositiu, edifici, planta, departament, id, centre_cost, area
        ) VALUES (
          ${h.guid}, ${h.dispositiu}, ${h.edifici}, ${h.planta}, ${h.departament}, ${h.id}, ${h.centre_cost}, ${h.area}
        )
        ON CONFLICT (guid) DO UPDATE SET
          dispositiu = EXCLUDED.dispositiu,
          edifici = EXCLUDED.edifici,
          planta = EXCLUDED.planta,
          departament = EXCLUDED.departament,
          id = EXCLUDED.id,
          centre_cost = EXCLUDED.centre_cost,
          area = EXCLUDED.area;
      `;
    }
    res.json({ message: 'IfcSpaces actualizados correctamente', habitacionesEliminadas: habitacionesAEliminar });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar las ifcSpaces', details: err.message });
  }
};
