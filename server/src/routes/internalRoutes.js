import { Router } from 'express';
import { releaseReservations } from '../controllers/jobController.js';
import { requireCronSecret } from '../middleware/cronSecret.js';

const router = Router();
router.get('/jobs/release-reservations', requireCronSecret, releaseReservations);
export default router;
