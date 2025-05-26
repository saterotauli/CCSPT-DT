import { Router } from 'express';
import { getIfcBuildings, createIfcBuilding, updateIfcBuilding, deleteIfcBuilding } from '../controllers/ifcBuildingController';

const router = Router();

router.get('/', getIfcBuildings);
router.post('/', createIfcBuilding);
router.put('/:guid', updateIfcBuilding);
router.delete('/:guid', deleteIfcBuilding);

export default router;