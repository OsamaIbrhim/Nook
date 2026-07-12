import { Router } from 'express';
import { createCheckoutSession } from '../controllers/paymentController.js';
import { protect } from '../middleware/auth.js';
const router = Router();
router.post('/checkout-session', protect, createCheckoutSession);
export default router;
