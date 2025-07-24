import express from 'express';
import { updateHabitacions, getHabitacions, buscarPorDepartamento } from '../controllers/habitacioController';

const router = express.Router();

// GET /api/ifcspace/search?departament=valor
router.get('/ifcspace/search', buscarPorDepartamento);
// GET /api/ifcspace
router.get('/ifcspace', getHabitacions);
// POST /api/ifcspace
router.post('/ifcspace', updateHabitacions);
// POST /api/ifcspace/summary
import { summaryHabitacions } from '../controllers/habitacioController';
router.post('/ifcspace/summary', summaryHabitacions);

export default router;
