import express from 'express';
import { updateActius, getActius } from '../controllers/actiusController';

const router = express.Router();

// GET /api/actius
router.get('/actius', getActius);
// POST /api/actius
router.post('/actius', updateActius);
// POST /api/actius/summary
import { summaryActius } from '../controllers/actiusController';
router.post('/actius/summary', summaryActius);

export default router;
