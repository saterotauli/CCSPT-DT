import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/actius
export const getActius = async (req: Request, res: Response) => {
  try {
    const actius = await prisma.actius.findMany();
    res.json(actius);
  } catch (err: any) {
    res.status(500).json({ error: 'Error al obtener los actius', details: err.message });
  }
};

// POST /api/actius
export const updateActius = async (req: Request, res: Response) => {
  try {
    console.log('Body recibido en updateActius:', JSON.stringify(req.body, null, 2));
    let actius = [];
    let tipusGlobal: string | undefined, subtipusGlobal: string | undefined, ubicacioGlobal: string | undefined;
    if (Array.isArray(req.body)) {
      actius = req.body;
    } else if (typeof req.body === 'object' && req.body !== null) {
      actius = req.body.actius;
      tipusGlobal = req.body.tipus;
      subtipusGlobal = req.body.subtipus;
      ubicacioGlobal = req.body.ubicacio;
    }
    if (Array.isArray(actius)) {
      actius = actius.map(a => ({
        ...a,
        tipus: a.tipus !== undefined ? a.tipus : tipusGlobal,
        subtipus: a.subtipus !== undefined ? a.subtipus : subtipusGlobal,
        ubicacio: a.ubicacio !== undefined ? a.ubicacio : ubicacioGlobal
      }));
    }
    if (actius.length === 0) {
      return res.json({ message: 'No se recibieron actius.' });
    }
    console.log('Array de actius recibido:', JSON.stringify(actius, null, 2));
    // Inserción/actualización masiva
    for (const actiu of actius) {
      // Validar que tenga guid o actiu_id
      const guid = actiu.guid || actiu.actiu_id;
      if (!guid) {
        console.warn('Actiu sin guid ni actiu_id detectado, ignorando:', actiu);
        continue;
      }
      if (!actiu.guid && actiu.actiu_id) {
        console.log(`Usando actiu_id como guid para actiu: ${actiu.actiu_id}`);
      }
      // Log para depuración: mostrar el actiu antes del upsert
      console.log('Intentando upsert del actiu:', JSON.stringify(actiu, null, 2));
      // Upsert actiu principal
      const upsertedActiu = await prisma.actius.upsert({
        where: { guid: actiu.guid },
        update: {
          tipus: actiu.tipus,
          subtipus: actiu.subtipus,
          ubicacio: actiu.ubicacio,
        },
        create: {
          guid: actiu.guid,
          tipus: actiu.tipus,
          subtipus: actiu.subtipus,
          ubicacio: actiu.ubicacio,
        }
      });
      // Si es una puerta (IFCDOOR), upsert en ifcdoor
      if (actiu.tipus === 'IFCDOOR') {
        await prisma.ifcdoor.upsert({
          where: { actiu_id: upsertedActiu.id },
          update: {
            from_room: actiu.from_room ?? undefined,
            to_room: actiu.to_room ?? undefined,
          },
          create: {
            actiu_id: upsertedActiu.id,
            from_room: actiu.from_room ?? undefined,
            to_room: actiu.to_room ?? undefined,
          }
        });
        // Si además es PortaTallafoc, upsert en ifcdoor_fire
        if (
          actiu.subtipus &&
          (actiu.subtipus.toLowerCase() === 'portatallafoc' || actiu.subtipus.toLowerCase() === 'portatallafocs' || actiu.subtipus.toLowerCase().includes('tallafoc'))
        ) {
          await prisma.ifcdoor_fire.upsert({
            where: { ifcdoor_id: upsertedActiu.id },
            update: { numero: actiu.marca ? String(actiu.marca) : undefined },
            create: {
              ifcdoor_id: upsertedActiu.id,
              numero: actiu.marca ? String(actiu.marca) : undefined
            }
          });
        }
      }
    }

    // Los elementos IfcSanitaryTerminal se suben a la tabla patrimoni.actius a través del array recibido en el body, no desde una tabla propia.

    // Todos los elementos (puertas, sanitarios, etc.) deben venir en el array del body y se insertan/actualizan en patrimoni.actius.

    // BORRADO selectivo: solo borrar los actius del edificio correspondiente que ya no existan en el array recibido
    // Suponemos que todos los actius subidos pertenecen al mismo edificio (ubicacio: 'EDIFICIO-PLANTA-ESPACIO')
    const edificio = actius[0]?.ubicacio?.substring(0, 3);
    if (edificio) {
      // Buscar todos los guids de actius en la BD de ese edificio
      const actiusEnDB = await prisma.actius.findMany({
        where: { ubicacio: { startsWith: edificio } },
        select: { guid: true }
      });
      const guidsEnDB = actiusEnDB.map((a: any) => a.guid);
      const guidsEnviados = actius.map((a: any) => a.guid);
      const guidsABorrar = guidsEnDB.filter((guid: string) => !guidsEnviados.includes(guid));
      if (guidsABorrar.length > 0) {
        await prisma.actius.deleteMany({
          where: {
            guid: { in: guidsABorrar },
            ubicacio: { startsWith: edificio }
          }
        });
      }
    }

    res.json({ message: 'Actius actualizados correctamente' });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar los actius', details: err.message });
  }
};

// POST /api/actius/summary
export const summaryActius = async (req: Request, res: Response) => {
  try {
    let actius = [];
    let tipusGlobal: string | undefined, subtipusGlobal: string | undefined, ubicacioGlobal: string | undefined;
    if (Array.isArray(req.body)) {
      actius = req.body;
    } else if (typeof req.body === 'object' && req.body !== null) {
      actius = req.body.actius;
      tipusGlobal = req.body.tipus;
      subtipusGlobal = req.body.subtipus;
      ubicacioGlobal = req.body.ubicacio;
    }
    if (Array.isArray(actius)) {
      actius = actius.map(a => ({
        ...a,
        tipus: a.tipus !== undefined ? a.tipus : tipusGlobal,
        subtipus: a.subtipus !== undefined ? a.subtipus : subtipusGlobal,
        ubicacio: a.ubicacio !== undefined ? a.ubicacio : ubicacioGlobal
      }));
    }
    if (actius.length === 0) {
      return res.status(200).json({ nuevos: 0, borrados: 0, modificados: 0 });
    }
    console.log(`Llegaron ${actius.length} actius`);
    // Buscar todos los guids en la tabla actius
    const guidsNuevos = actius.map((a: any) => a.guid);
    const actiusDB: any[] = await prisma.actius.findMany({ select: { guid: true, tipus: true, subtipus: true, ubicacio: true } });
    console.log(`Hay ${actiusDB.length} actius en la base de datos`);
    const guidsDB = actiusDB.map((a: any) => a.guid);
    // Nuevos: están en el array recibido pero no en la base de datos
    const nuevos = actius.filter((a: any) => !guidsDB.includes(a.guid)).length;
    console.log(`Nuevos: ${nuevos} ejemplos: ${actius.filter((a: any) => !guidsDB.includes(a.guid)).slice(0, 5).map((a: any) => a.guid)}`);
    // Borrados: están en la base de datos pero no en el array recibido
    const borrados = actiusDB.filter((a: any) => !guidsNuevos.includes(a.guid)).length;
    console.log(`Borrados: ${borrados} ejemplos: ${actiusDB.filter((a: any) => !guidsNuevos.includes(a.guid)).slice(0, 5).map((a: any) => a.guid)}`);
    // Modificados: existen en ambos pero tienen diferencias de campos relevantes
    const modificadosArr = actius.filter((a: any) => {
      const db = actiusDB.find((x: any) => x.guid === a.guid);
      if (!db) return false;
      return (
        db.tipus !== a.tipus ||
        db.subtipus !== a.subtipus ||
        db.ubicacio !== a.ubicacio
      );
    }).map((a: any) => a.guid);
    const modificados = modificadosArr.length;
    console.log(`Modificados: ${modificados} ejemplos: ${actius.filter((a: any) => {
      const db = actiusDB.find((x: any) => x.guid === a.guid);
      if (!db) return false;
      return (
        db.tipus !== a.tipus ||
        db.subtipus !== a.subtipus ||
        db.ubicacio !== a.ubicacio
      );
    }).slice(0, 5).map((a: any) => a.guid)}`);
    res.json({ nuevos, borrados, modificados, guidsNuevos, guidsDB, modificadosArr });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Error al calcular el resumen de actius', details: err.message });
  }
};
