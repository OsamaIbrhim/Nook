import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { quoteCart } from '../controllers/cartController.js';

const router = Router();
const quoteLimiter = rateLimit({
  windowMs: 60 * 1000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false,
  message: { success: false, error: { message: 'Too many quote requests', code: 'too_many_requests' } }
});
router.post('/quote', quoteLimiter, quoteCart);
export default router;
