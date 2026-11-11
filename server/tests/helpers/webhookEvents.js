let counter = 0;

export function createWebhookSender({ stripe, api }) {
  function signed(type, object, { id = `evt_test_${++counter}`, signature } = {}) {
    const payload = JSON.stringify({ id, object: 'event', type, data: { object } });
    const header = signature ?? stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });
    return { id, payload, header };
  }

  const deliver = ({ payload, header }) => api.request('POST', '/api/v1/payments/webhook', {
    rawBody: payload, headers: { 'content-type': 'application/json', 'stripe-signature': header }
  });

  return {
    signed,
    deliver,
    checkoutEvent: (type, orderId, options) => signed(type, { id: 'cs_test_webhook', object: 'checkout.session', payment_intent: 'pi_test_webhook', metadata: { orderId } }, options),
    chargeEvent: (type, charge, options) => signed(type, { id: 'ch_test_1', object: 'charge', ...charge }, options)
  };
}
