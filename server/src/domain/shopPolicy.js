const DEFAULTS = {
  currency: 'egp',
  locale: 'en-US',
  flatShippingRate: 50,
  freeShippingThreshold: 200,
  returnWindowDays: 30,
  dispatchDaysMin: 1,
  dispatchDaysMax: 2,
  maxLineQuantity: 99,
  reservationMinutes: 35,
  checkoutSessionMinutes: 30,
  supportEmail: 'hello@nook.store',
  shipsTo: ['EG']
};

const STRIPE_MIN_SESSION_MINUTES = 30;
const isWholeNumber = (value) => Number.isInteger(value) && value >= 0;

export function createShopPolicy(values) {
  const policy = { ...DEFAULTS, ...values };
  if (!Number.isInteger(policy.maxLineQuantity) || policy.maxLineQuantity < 1) throw new RangeError('maxLineQuantity must be a positive integer');
  if (!(policy.flatShippingRate >= 0)) throw new RangeError('flatShippingRate must be zero or more');
  if (policy.freeShippingThreshold !== null && !(policy.freeShippingThreshold >= 0)) throw new RangeError('freeShippingThreshold must be null or zero or more');
  if (policy.checkoutSessionMinutes < STRIPE_MIN_SESSION_MINUTES) throw new RangeError(`checkoutSessionMinutes must be at least ${STRIPE_MIN_SESSION_MINUTES}, the Stripe minimum`);
  if (policy.reservationMinutes < policy.checkoutSessionMinutes) throw new RangeError('reservationMinutes must not be shorter than checkoutSessionMinutes');
  if (!isWholeNumber(policy.returnWindowDays)) throw new RangeError('returnWindowDays must be a whole number of days');
  if (!isWholeNumber(policy.dispatchDaysMin) || !isWholeNumber(policy.dispatchDaysMax) || policy.dispatchDaysMin > policy.dispatchDaysMax) {
    throw new RangeError('dispatchDaysMin and dispatchDaysMax must be whole numbers with the minimum not above the maximum');
  }
  if (!Array.isArray(policy.shipsTo) || !policy.shipsTo.length || !policy.shipsTo.every((code) => /^[A-Z]{2}$/.test(code))) {
    throw new RangeError('shipsTo must list at least one upper-case ISO country code');
  }
  if (!String(policy.supportEmail).includes('@')) throw new RangeError('supportEmail must be an email address');
  return Object.freeze({ ...policy, shipsTo: Object.freeze([...policy.shipsTo]) });
}

export function readShopPolicy(env) {
  return createShopPolicy({ currency: (env.STRIPE_CURRENCY || DEFAULTS.currency).toLowerCase() });
}

export const toPublicConfig = (policy) => ({
  currency: policy.currency,
  locale: policy.locale,
  freeShippingThreshold: policy.freeShippingThreshold,
  flatShippingRate: policy.flatShippingRate,
  returnWindowDays: policy.returnWindowDays,
  dispatchDaysMin: policy.dispatchDaysMin,
  dispatchDaysMax: policy.dispatchDaysMax,
  maxLineQuantity: policy.maxLineQuantity,
  reservationMinutes: policy.reservationMinutes,
  supportEmail: policy.supportEmail,
  shipsTo: [...policy.shipsTo]
});
