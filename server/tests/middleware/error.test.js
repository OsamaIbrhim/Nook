import '../helpers/env.js';
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { errorHandler } from '../../src/middleware/error.js';
import { ApiError } from '../../src/utils/ApiError.js';

function respond(error) {
  const captured = { headers: {} };
  const res = {
    set(name, value) { captured.headers[name.toLowerCase()] = value; return res; },
    status(code) { captured.status = code; return res; },
    json(body) { captured.body = body; return res; }
  };
  mock.method(console, 'error', () => {});
  try { errorHandler(error, {}, res, () => {}); } finally { mock.restoreAll(); }
  return captured;
}

test('an unexpected error is answered with a generic message and internal_error, never its own text', () => {
  const { status, body } = respond(new Error('connect ECONNREFUSED 10.0.0.5:27017 mongodb://user:secret@host'));
  assert.equal(status, 500);
  assert.equal(body.error.message, 'Internal server error');
  assert.equal(body.error.code, 'internal_error');
  assert.equal(JSON.stringify(body).includes('secret'), false);
});

test('an ApiError keeps its own message and code, also for 5xx statuses chosen on purpose', () => {
  const { status, body } = respond(new ApiError(502, 'Refund could not be issued', undefined, { code: 'refund_failed' }));
  assert.equal(status, 502);
  assert.deepEqual(body.error, { message: 'Refund could not be issued', code: 'refund_failed' });
});

test('every error response is marked uncacheable so an edge cache never stores a 404 or a 500', () => {
  assert.equal(respond(new ApiError(404, 'Product not found')).headers['cache-control'], 'no-store');
  assert.equal(respond(new Error('boom')).headers['cache-control'], 'no-store');
});

test('a client error from the body parser keeps its status and message', () => {
  const error = Object.assign(new Error('request entity too large'), { statusCode: 413 });
  const { status, body } = respond(error);
  assert.equal(status, 413);
  assert.equal(body.error.message, 'request entity too large');
});
