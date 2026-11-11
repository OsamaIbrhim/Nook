import '../helpers/env.js';
import { before, after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { startApi } from '../helpers/apiClient.js';

let api;
before(async () => { api = await startApi(); });
after(async () => { await api.stop(); });

describe('GET /shop/config', () => {
  it('serves the storefront policy to anyone, with the 2026-11-09 shipping and currency decisions', async () => {
    const res = await api.request('GET', '/api/v1/shop/config');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, {
      success: true,
      data: {
        currency: 'egp', locale: 'en-US', freeShippingThreshold: 200, flatShippingRate: 50, returnWindowDays: 30,
        dispatchDaysMin: 1, dispatchDaysMax: 2, maxLineQuantity: 99, reservationMinutes: 35, supportEmail: 'hello@nook.store', shipsTo: ['EG']
      }
    });
  });

  it('may be cached at the edge for five minutes', async () => {
    const res = await api.request('GET', '/api/v1/shop/config');
    assert.equal(res.headers.get('cache-control'), 'public, max-age=0, s-maxage=300');
  });
});

describe('error responses', () => {
  it('carry a stable code: unknown route 404 not_found, missing token 401 unauthorized', async () => {
    const missing = await api.request('GET', '/api/v1/nowhere');
    assert.equal(missing.status, 404);
    assert.equal(missing.body.error.code, 'not_found');
    const anonymous = await api.request('GET', '/api/v1/orders/mine');
    assert.equal(anonymous.status, 401);
    assert.equal(anonymous.body.error.code, 'unauthorized');
  });

  it('answer malformed JSON with 400 bad_request and an oversized body with 413 payload_too_large, never a stack', async () => {
    const malformed = await api.request('POST', '/api/v1/cart/quote', { rawBody: '{"lines":', headers: { 'content-type': 'application/json' } });
    assert.equal(malformed.status, 400);
    assert.equal(malformed.body.error.code, 'bad_request');
    const oversized = await api.request('POST', '/api/v1/cart/quote', { rawBody: JSON.stringify({ lines: 'x'.repeat(1_100_000) }), headers: { 'content-type': 'application/json' } });
    assert.equal(oversized.status, 413);
    assert.equal(oversized.body.error.code, 'payload_too_large');
    assert.equal('stack' in oversized.body.error, false);
  });

  it('answer a foreign Origin with 403 origin_not_allowed instead of a 500, and still serve the configured client origin', async () => {
    const foreign = await api.request('GET', '/api/v1/shop/config', { headers: { origin: 'http://evil.test' } });
    assert.equal(foreign.status, 403);
    assert.equal(foreign.body.error.code, 'origin_not_allowed');
    assert.equal('stack' in foreign.body.error, false);
    const known = await api.request('GET', '/api/v1/shop/config', { headers: { origin: 'http://localhost:5173' } });
    assert.equal(known.status, 200);
    assert.equal(known.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  });
});
