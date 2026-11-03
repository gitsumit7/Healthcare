import { Router } from 'express';
import { listHospitals, listHospitalLocations, getHospital } from '../controllers/hospitalController.js';

const router = Router();

router.get('/', listHospitals);
router.get('/locations', listHospitalLocations);
router.get('/:id', getHospital);

export default router;
