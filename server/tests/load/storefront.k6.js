import http from 'k6/http';
import { check } from 'k6';
import { Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const SPREAD_CLIENT_IPS = (__ENV.SPREAD_CLIENT_IPS || 'true') === 'true';
const quoteBodyErrors = new Rate('quote_body_errors');

export const options = {
  scenarios: {
    ramp: {
      executor: 'ramping-arrival-rate',
      startRate: 5, timeUnit: '1s', preAllocatedVUs: 50, maxVUs: 400,
      stages: [{ target: 100, duration: '3m' }],
      tags: { phase: 'ramp' }
    },
    sustained: {
      executor: 'constant-arrival-rate',
      rate: 50, timeUnit: '1s', duration: '5m', preAllocatedVUs: 50, maxVUs: 200,
      startTime: '3m30s',
      tags: { phase: 'sustained' }
    }
  },
  thresholds: {
    'http_req_duration{phase:sustained}': ['p(95)<300', 'p(99)<800'],
    'http_req_failed{phase:sustained}': ['rate<0.001'],
    'quote_body_errors{phase:sustained}': ['rate<0.001'],
    'http_req_duration{phase:ramp}': ['p(99)<5000']
  }
};

export function setup() {
  const res = http.get(`${BASE_URL}/api/v1/products?limit=3`);
  const products = res.status === 200 ? res.json('data.products') : [];
  if (!products.length) throw new Error(`No products at ${BASE_URL}; seed the database before running the load test`);
  return { productIds: products.map((product) => product._id) };
}

function clientHeaders() {
  const headers = { 'content-type': 'application/json' };
  if (SPREAD_CLIENT_IPS) headers['x-forwarded-for'] = `10.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${1 + Math.floor(Math.random() * 254)}`;
  return headers;
}

export default function run({ productIds }) {
  const headers = clientHeaders();
  if (Math.random() < 0.3) {
    const res = http.get(`${BASE_URL}/api/v1/shop/config`, { headers, tags: { name: 'GET /shop/config' } });
    check(res, { 'config 200': (r) => r.status === 200 });
    return;
  }
  const lines = productIds.map((productId, index) => ({ productId, quantity: index + 1 }));
  const res = http.post(`${BASE_URL}/api/v1/cart/quote`, JSON.stringify({ lines }), { headers, tags: { name: 'POST /cart/quote' } });
  const ok = check(res, { 'quote 200': (r) => r.status === 200, 'quote has totals': (r) => res.status === 200 && typeof res.json('data.total') === 'number' });
  quoteBodyErrors.add(!ok);
}
