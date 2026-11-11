import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, refresh, logout, me } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = Router();
const limiter = (limit, options = {}) => rateLimit({
  windowMs: 15 * 60 * 1000, limit, standardHeaders: 'draft-8', legacyHeaders: false,
  message: { success: false, error: { message: 'Too many authentication attempts', code: 'too_many_requests' } }, ...options
});
const registerLimiter = limiter(20);
const loginLimiter = limiter(10, { skipSuccessfulRequests: true });
const refreshLimiter = limiter(60);
router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.post('/refresh', refreshLimiter, refresh);
router.post('/logout', logout);
router.get('/me', protect, me);
export default router;
