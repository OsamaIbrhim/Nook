import http from 'node:http';
import Stripe from 'stripe';

export async function startStripeStub() {
  const sessions = new Map();
  const calls = [];
  let counter = 0;

  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const url = new URL(req.url, 'http://stub');
      const params = Object.fromEntries(new URLSearchParams(Buffer.concat(chunks).toString()));
      calls.push({ method: req.method, path: url.pathname, params, idempotencyKey: req.headers['idempotency-key'] });
      const reply = (status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };

      if (req.method === 'POST' && url.pathname === '/v1/checkout/sessions') {
        const id = `cs_test_${++counter}`;
        const session = { id, object: 'checkout.session', url: `https://checkout.stripe.test/${id}`, status: 'open', expires_at: Number(params.expires_at) };
        sessions.set(id, session);
        return reply(200, session);
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
    reset() { calls.length = 0; sessions.clear(); counter = 0; },
    async stop() { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }
  };
}
