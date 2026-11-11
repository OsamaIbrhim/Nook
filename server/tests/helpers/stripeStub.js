import http from 'node:http';
import Stripe from 'stripe';

export async function startStripeStub() {
  const sessions = new Map();
  const refundsByKey = new Map();
  const sessionsByKey = new Map();
  let sessionDelayMs = 0;
  const failures = [];
  const calls = [];
  let counter = 0;
  let refundCounter = 0;

  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const url = new URL(req.url, 'http://stub');
      const params = Object.fromEntries(new URLSearchParams(Buffer.concat(chunks).toString()));
      calls.push({ method: req.method, path: url.pathname, params, idempotencyKey: req.headers['idempotency-key'] });
      const reply = (status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };

      const failure = failures.findIndex((entry) => url.pathname.startsWith(entry.pathPrefix));
      if (failure !== -1) {
        const [{ status, code }] = failures.splice(failure, 1);
        return reply(status, { error: { type: code ? 'invalid_request_error' : 'api_error', code, message: 'Injected stub failure' } });
      }

      if (req.method === 'POST' && url.pathname === '/v1/refunds') {
        const key = req.headers['idempotency-key'];
        if (key && refundsByKey.has(key)) return reply(200, refundsByKey.get(key));
        const refund = { id: `re_test_${++refundCounter}`, object: 'refund', payment_intent: params.payment_intent, status: 'succeeded' };
        if (key) refundsByKey.set(key, refund);
        return reply(200, refund);
      }
      const expire = url.pathname.match(/^\/v1\/checkout\/sessions\/([^/]+)\/expire$/);
      if (req.method === 'POST' && expire && sessions.has(expire[1])) {
        const session = sessions.get(expire[1]);
        if (session.status !== 'open') return reply(400, { error: { type: 'invalid_request_error', message: 'Only Checkout Sessions with a status in ["open"] can be expired.' } });
        session.status = 'expired';
        return reply(200, session);
      }
      if (req.method === 'POST' && url.pathname === '/v1/checkout/sessions') {
        const key = req.headers['idempotency-key'];
        const fingerprint = JSON.stringify(params);
        const create = () => {
          const previous = key && sessionsByKey.get(key);
          if (previous) {
            if (previous.fingerprint !== fingerprint) return reply(400, { error: { type: 'idempotency_error', message: 'Keys for idempotent requests can only be used with the same parameters they were first used with.' } });
            return reply(200, previous.session);
          }
          const id = `cs_test_${++counter}`;
          const session = { id, object: 'checkout.session', url: `https://checkout.stripe.test/${id}`, status: 'open', expires_at: Number(params.expires_at) };
          sessions.set(id, session);
          if (key) sessionsByKey.set(key, { fingerprint, session });
          return reply(200, session);
        };
        return sessionDelayMs ? setTimeout(create, sessionDelayMs) : create();
      }
      const match = url.pathname.match(/^\/v1\/checkout\/sessions\/([^/]+)$/);
      if (req.method === 'GET' && match && sessions.has(match[1])) return reply(200, sessions.get(match[1]));
      reply(404, { error: { type: 'invalid_request_error', message: `Stub has no route for ${req.method} ${url.pathname}` } });
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  const stripe = new Stripe('sk_test_stub_placeholder', { host: '127.0.0.1', port: server.address().port, protocol: 'http', maxNetworkRetries: 0 });
  return {
    stripe,
    calls,
    setSessionStatus(id, status) { sessions.get(id).status = status; },
    delaySessionCreation(ms) { sessionDelayMs = ms; },
    failNext(pathPrefix, status = 500, code) { failures.push({ pathPrefix, status, code }); },
    sessionStatus(id) { return sessions.get(id)?.status; },
    addSession(id, status = 'open') { sessions.set(id, { id, object: 'checkout.session', url: `https://checkout.stripe.test/${id}`, status, expires_at: 0 }); },
    reset() { calls.length = 0; sessions.clear(); refundsByKey.clear(); sessionsByKey.clear(); sessionDelayMs = 0; failures.length = 0; counter = 0; refundCounter = 0; },
    async stop() { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }
  };
}
