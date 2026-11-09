const MINUTE_MS = 60_000;

export const reservationExpiry = (now, policy) => new Date(now.getTime() + policy.reservationMinutes * MINUTE_MS);

export const checkoutSessionExpiryUnix = (now, policy) => Math.floor(now.getTime() / 1000) + policy.checkoutSessionMinutes * 60;

export const isExpired = (order, now) => order.reservationExpiresAt.getTime() <= now.getTime();
