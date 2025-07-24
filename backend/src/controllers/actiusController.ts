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
    //console.log('Array de actius recibido:', JSON.stringify(actius, null, 2));
    
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
      //console.log('Intentando upsert del actiu:', JSON.stringify(actiu, null, 2));
      // Upsert actiu principal
      const upsertedActiu = await prisma.actius.upsert({
        where: { guid: actiu.guid },
        update: {
          tipus: actiu.tipus,
          subtipus: actiu.subtipus,
          edifici: actiu.edifici,
          planta: actiu.planta,
          zona: actiu.zona,
          ubicacio: actiu.ubicacio, // Solo CSPT_FM_HabitacioID
        },
        create: {
          guid: actiu.guid,
          tipus: actiu.tipus,
          subtipus: actiu.subtipus,
          edifici: actiu.edifici,
          planta: actiu.planta,
          zona: actiu.zona,
          ubicacio: actiu.ubicacio, // Solo CSPT_FM_HabitacioID
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

    // BORRADO SELECTIVO: solo borra los actius del edificio cargado cuyo GUID no esté en el array recibido
    if (req.body.confirmDelete && actius.length > 0) {
      const edificio = actius[0]?.edifici;
      if (typeof edificio === 'string' && edificio.length > 0) {
        const guidsEnviados = actius.map((a: any) => a.guid);
        console.log(`Edificio cargado: ${edificio}`);
        console.log('GUIDs enviados:', guidsEnviados);
        // Obtener todos los actius de ese edificio en la BD
        const actiusEnDB = await prisma.actius.findMany({
          where: { edifici: edificio },
          select: { guid: true, id: true }
        });
        const guidsEnDB = actiusEnDB.map((a: any) => a.guid);
        console.log('GUIDs en BD:', guidsEnDB);
        // Determinar qué GUIDs hay que borrar
        const guidsABorrar = guidsEnDB.filter((guid: string) => !guidsEnviados.includes(guid));
        if (guidsABorrar.length > 0) {
          console.log(`Borrando ${guidsABorrar.length} actius del edificio ${edificio} con GUIDs:`, guidsABorrar);
          // Obtener los IDs de los actius que vamos a borrar
          const actiusABorrar = await prisma.actius.findMany({
            where: { guid: { in: guidsABorrar as string[] }, edifici: edificio },
            select: { id: true, guid: true }
          });
          const idsABorrar = actiusABorrar.map(a => a.id);
          console.log('IDs de actius a borrar:', idsABorrar);
          // Borrar primero las referencias en ifcdoor_fire
          const deletedFireDoors = await prisma.ifcdoor_fire.deleteMany({
            where: { ifcdoor_id: { in: idsABorrar } }
          });
          console.log(`Borradas ${deletedFireDoors.count} puertas tallafoc`);
          // Luego borrar las referencias en ifcdoor
          const deletedDoors = await prisma.ifcdoor.deleteMany({
            where: { actiu_id: { in: idsABorrar } }
          });
          console.log(`Borradas ${deletedDoors.count} puertas`);
          // Finalmente borrar los actius principales
          const deletedActius = await prisma.actius.deleteMany({
            where: { guid: { in: guidsABorrar as string[] }, edifici: edificio }
          });
          console.log(`Borrados ${deletedActius.count} actius del edificio ${edificio}`);
        } else {
          console.log(`No hay actius para borrar en el edificio ${edificio}.`);
        }
      } else {
        console.warn('No se encontró el campo edifici en los actius recibidos, no se realiza borrado selectivo.');
      }
    } else if (req.body.confirmDelete) {
      console.warn('confirmDelete es true pero no hay actius definidos.');
    }

    res.json({ message: 'Actius actualizados correctamente' });
  } catch (err: any) {
    console.error('Error en updateActius:', err);
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
    // --- FILTRADO POR EDIFICIO ---
    const edificio = actius[0]?.edifici;
    const actiusDB: any[] = await prisma.actius.findMany({ select: { guid: true, tipus: true, subtipus: true, ubicacio: true, edifici: true, planta: true, zona: true } });
    const actiusDBEdificio = edificio ? actiusDB.filter((a: any) => a.edifici === edificio) : actiusDB;
    console.log(`Hay ${actiusDBEdificio.length} actius en la base de datos para el edificio ${edificio}`);
    const guidsDB = actiusDBEdificio.map((a: any) => a.guid);
    // Nuevos: están en el array recibido pero no en la base de datos
    const nuevos = actius.filter((a: any) => !guidsDB.includes(a.guid)).length;
    console.log(`Nuevos: ${nuevos} ejemplos: ${actius.filter((a: any) => !guidsDB.includes(a.guid)).slice(0, 5).map((a: any) => a.guid)}`);
    // Borrados: están en la base de datos (DEL EDIFICIO) pero no en el array recibido
    const borrados = actiusDBEdificio.filter((a: any) => !guidsNuevos.includes(a.guid)).length;
    console.log(`Borrados: ${borrados} ejemplos: ${actiusDBEdificio.filter((a: any) => !guidsNuevos.includes(a.guid)).slice(0, 5).map((a: any) => a.guid)}`);
    // Modificados: existen en ambos pero tienen diferencias de campos relevantes
    const modificadosArr = actius.filter((a: any) => {
      const db = actiusDBEdificio.find((x: any) => x.guid === a.guid);
      if (!db) return false;
      return (
        db.tipus !== a.tipus ||
        db.subtipus !== a.subtipus ||
        db.ubicacio !== a.ubicacio ||
        db.edifici !== a.edifici ||
        db.planta !== a.planta ||
        db.zona !== a.zona
      );
    }).map((a: any) => a.guid);
    const modificados = modificadosArr.length;
    console.log(`Modificados: ${modificados} ejemplos: ${actius.filter((a: any) => {
      const db = actiusDBEdificio.find((x: any) => x.guid === a.guid);
      if (!db) return false;
      return (
        db.tipus !== a.tipus ||
        db.subtipus !== a.subtipus ||
        db.ubicacio !== a.ubicacio ||
        db.edifici !== a.edifici ||
        db.planta !== a.planta ||
        db.zona !== a.zona
      );
    }).slice(0, 5).map((a: any) => a.guid)}`);
    res.json({ nuevos, borrados, modificados, guidsNuevos, guidsDB, modificadosArr });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Error al calcular el resumen de actius', details: err.message });
  }
};