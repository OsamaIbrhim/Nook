import { Router } from 'express';
import { dashboardStats, listUsers, updateUser } from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/auth.js';
const router = Router();
router.use(protect, authorize('admin'));
router.get('/stats', dashboardStats);
router.get('/users', listUsers);
router.patch('/users/:id', updateUser);
export default router;
