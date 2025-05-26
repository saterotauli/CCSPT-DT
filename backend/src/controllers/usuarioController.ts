import { Request, Response } from 'express';
import { PrismaClient, Rol } from '@prisma/client';

const prisma = new PrismaClient();

// Obtener todos los usuarios
export const getUsuarios = async (req: Request, res: Response) => {
  const usuarios = await prisma.usuario.findMany();
  res.json(usuarios);
};

// Crear usuario
export const createUsuario = async (req: Request, res: Response) => {
  const { nombre, email, rol, password } = req.body;
  try {
    const usuario = await prisma.usuario.create({
      data: { nombre, email, rol, password },
    });
    res.status(201).json(usuario);
  } catch (error) {
    res.status(400).json({ error: 'No se pudo crear el usuario', details: error });
  }
};

// Actualizar usuario
export const updateUsuario = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { nombre, email, rol } = req.body;
  try {
    const usuario = await prisma.usuario.update({
      where: { id: Number(id) },
      data: { nombre, email, rol },
    });
    res.json(usuario);
  } catch (error) {
    res.status(400).json({ error: 'No se pudo actualizar el usuario', details: error });
  }
};

// Eliminar usuario
export const deleteUsuario = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.usuario.delete({ where: { id: Number(id) } });
    res.json({ message: 'Usuario eliminado' });
  } catch (error) {
    res.status(400).json({ error: 'No se pudo eliminar el usuario', details: error });
  }
};
