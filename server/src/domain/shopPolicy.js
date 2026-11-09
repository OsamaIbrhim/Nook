const DEFAULTS = {
  currency: 'usd',
  flatShippingRate: 0,
  freeShippingThreshold: null,
  maxLineQuantity: 99,
  reservationMinutes: 35,
  checkoutSessionMinutes: 30
};

const STRIPE_MIN_SESSION_MINUTES = 30;

export function createShopPolicy(values) {
  const policy = { ...DEFAULTS, ...values };
  if (!Number.isInteger(policy.maxLineQuantity) || policy.maxLineQuantity < 1) throw new RangeError('maxLineQuantity must be a positive integer');
  if (!(policy.flatShippingRate >= 0)) throw new RangeError('flatShippingRate must be zero or more');
  if (policy.freeShippingThreshold !== null && !(policy.freeShippingThreshold >= 0)) throw new RangeError('freeShippingThreshold must be null or zero or more');
  if (policy.checkoutSessionMinutes < STRIPE_MIN_SESSION_MINUTES) throw new RangeError(`checkoutSessionMinutes must be at least ${STRIPE_MIN_SESSION_MINUTES}, the Stripe minimum`);
  if (policy.reservationMinutes < policy.checkoutSessionMinutes) throw new RangeError('reservationMinutes must not be shorter than checkoutSessionMinutes');
  return Object.freeze(policy);
}

export function readShopPolicy(env) {
  return createShopPolicy({ currency: (env.STRIPE_CURRENCY || DEFAULTS.currency).toLowerCase() });
}
