import 'dotenv/config';

const requiredInProduction = [
  'MONGODB_URI', 'CLIENT_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET',
  'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET',
  'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'
];

if (process.env.NODE_ENV === 'production') {
  const missing = requiredInProduction.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Missing environment variables: ${missing.join(', ')}`);
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ecommerce',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-this-please',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-this-please',
  accessTtl: process.env.ACCESS_TOKEN_TTL || '15m',
  refreshTtl: process.env.REFRESH_TOKEN_TTL || '7d',
  cookieSecure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET
  },
  stripeSecret: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  currency: (process.env.STRIPE_CURRENCY || 'usd').toLowerCase()
};
