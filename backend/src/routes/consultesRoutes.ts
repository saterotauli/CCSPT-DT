import express from 'express';
import { consultaNatural } from '../controllers/consultesController';

const router = express.Router();

router.post('/consultes', consultaNatural);

export default router;
