import Stripe from 'stripe';
import { env } from './env.js';
import { ApiError } from '../utils/ApiError.js';

let envClient;

export function envStripeClient() {
  if (!env.stripeSecret) throw new ApiError(503, 'Stripe is not configured');
  envClient ||= new Stripe(env.stripeSecret);
  return envClient;
}
