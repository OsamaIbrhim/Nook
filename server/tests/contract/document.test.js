import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildOpenApiDocument } from '../../src/contract/document.js';

const committed = JSON.parse(fs.readFileSync(new URL('../../contract/openapi.json', import.meta.url), 'utf8'));
const document = buildOpenApiDocument();

describe('OpenAPI document', () => {
  it('equals the committed server/contract/openapi.json (run `npm run contract` after changing a schema)', () => {
    assert.deepEqual(document, committed);
  });

  it('documents every storefront operation by id', () => {
    const ids = Object.values(document.paths).flatMap((methods) => Object.values(methods).map((operation) => operation.operationId)).sort();
    assert.deepEqual(ids, [
      'cancelOrder', 'createCheckoutSession', 'createOrder', 'getMe', 'getOrder', 'getOrderBySession', 'getProduct', 'getShopConfig',
      'listCategories', 'listMyOrders', 'listProducts', 'login', 'logout', 'quoteCart', 'refreshSession', 'register'
    ]);
  });

  it('limits a quote to 1..50 lines and each quantity to a whole number of at least 1', () => {
    const { lines } = document.components.schemas.QuoteRequest.properties;
    assert.equal(lines.minItems, 1);
    assert.equal(lines.maxItems, 50);
    assert.equal(lines.items.properties.quantity.type, 'integer');
    assert.equal(lines.items.properties.quantity.minimum, 1);
  });

  it('requires a password of at least 8 characters when registering', () => {
    assert.equal(document.components.schemas.RegisterRequest.properties.password.minLength, 8);
  });

  it('documents the guest refresh answer: 204 without a body', () => {
    assert.equal(document.paths['/auth/refresh'].post.responses['204'].content, undefined);
  });

  it('documents the Idempotency-Key header on order creation as optional', () => {
    const header = document.paths['/orders'].post.parameters.find((parameter) => parameter.name === 'Idempotency-Key');
    assert.equal(header.in, 'header');
    assert.equal(header.required, false);
  });
});
