import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { stripeWebhook } from './controllers/paymentController.js';
import authRoutes from './routes/authRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import internalRoutes from './routes/internalRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import shopRoutes from './routes/shopRoutes.js';
import { errorHandler, notFound } from './middleware/error.js';
import { ApiError } from './utils/ApiError.js';
import { noStore } from './middleware/cacheControl.js';
import { envStripeClient } from './config/stripe.js';

export function createApp({ stripe, now = () => new Date(), cronSecret = env.cronSecret } = {}) {
  const app = express();
  app.locals.getStripe = stripe ? () => stripe : envStripeClient;
  app.locals.now = now;
  app.locals.cronSecret = cronSecret;
  app.set('trust proxy', 1);
  app.use(helmet());
  const allowedOrigins = env.clientUrl.split(',').map((url) => new URL(url.trim()).origin);
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new ApiError(403, 'Origin is not allowed', undefined, { code: 'origin_not_allowed' }));
    },
    credentials: true
  }));
  app.post('/api/v1/payments/webhook', express.raw({ type: 'application/json' }), stripeWebhook);
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  if (env.nodeEnv !== 'test') app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
  app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 500, standardHeaders: 'draft-8', legacyHeaders: false }));
  app.get('/api/v1/health', (_req, res) => res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } }));
  app.use('/api/v1/auth', noStore, authRoutes);
  app.use('/api/v1/categories', categoryRoutes);
  app.use('/api/v1/products', productRoutes);
  app.use('/api/v1/cart', cartRoutes);
  app.use('/api/v1/shop', shopRoutes);
  app.use('/api/v1/orders', noStore, orderRoutes);
  app.use('/api/v1/payments', noStore, paymentRoutes);
  app.use('/api/v1/admin', noStore, adminRoutes);
  app.use('/api/v1/internal', internalRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

export const app = createApp();
