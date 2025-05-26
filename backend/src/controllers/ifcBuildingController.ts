// backend/src/controllers/ifcBuildingController.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getIfcBuildings = async (req: Request, res: Response) => {
  try {
    const ifcBuildings = await prisma.$queryRaw`
      SELECT * FROM "patrimoni"."ifcbuilding" ORDER BY nom ASC
    `;
    res.json(ifcBuildings);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los ifcBuildingos', details: error });
  }
};

export const createIfcBuilding = async (req: Request, res: Response) => {
  const { guid, nom, codi } = req.body;
  try {
    const result = await prisma.$executeRaw`
      INSERT INTO "patrimoni"."ifcbuilding" (guid, nom, codi)
      VALUES (${guid}, ${nom}, ${codi})
    `;
    res.status(201).json({ message: 'IfcBuilding creado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear ifcBuilding', details: error });
  }
};

export const updateIfcBuilding = async (req: Request, res: Response) => {
  const { guid } = req.params;
  const { nom, codi } = req.body;
  try {
    const result = await prisma.$executeRaw`
      UPDATE "patrimoni"."ifcbuilding"
      SET nom = ${nom}, codi = ${codi}
      WHERE guid = ${guid}
    `;
    res.json({ message: 'IfcBuilding actualizado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar ifcBuilding', details: error });
  }
};

export const deleteIfcBuilding = async (req: Request, res: Response) => {
  const { guid } = req.params;
  try {
    const result = await prisma.$executeRaw`
      DELETE FROM "patrimoni"."ifcbuilding"
      WHERE guid = ${guid}
    `;
    res.json({ message: 'IfcBuilding eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar ifcBuilding', details: error });
  }
};