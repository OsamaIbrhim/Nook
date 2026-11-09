import test from 'node:test';
import assert from 'node:assert/strict';
import { freeShippingRemaining, priceCart, shippingFor } from '../../src/domain/pricing.js';
import { createShopPolicy } from '../../src/domain/shopPolicy.js';

const flatRate15FreeAt100 = createShopPolicy({ flatShippingRate: 15, freeShippingThreshold: 100 });
const noShipping = createShopPolicy({ flatShippingRate: 0, freeShippingThreshold: null });
const shopDefaults = createShopPolicy({});
const product = (id, price, stock, extra = {}) => ({ id, name: id, price, stock, isActive: true, ...extra });
const line = (productId, quantity) => ({ productId, quantity });

test('shippingFor charges the flat rate below the threshold and nothing at or above it: 99.99 pays 15, 100.00 and 100.01 are free', () => {
  assert.equal(shippingFor(99.99, flatRate15FreeAt100), 15);
  assert.equal(shippingFor(100, flatRate15FreeAt100), 0);
  assert.equal(shippingFor(100.01, flatRate15FreeAt100), 0);
});

test('shippingFor uses the policy flat rate: 20 instead of 15', () => {
  assert.equal(shippingFor(50, createShopPolicy({ flatShippingRate: 20, freeShippingThreshold: 100 })), 20);
});

test('shippingFor uses the policy threshold: 50.00 is free when the threshold is 50', () => {
  assert.equal(shippingFor(50, createShopPolicy({ flatShippingRate: 15, freeShippingThreshold: 50 })), 0);
});

test('shippingFor without a threshold never grants free shipping', () => {
  assert.equal(shippingFor(1000, createShopPolicy({ flatShippingRate: 15, freeShippingThreshold: null })), 15);
});

test('the shop defaults charge a flat 50 below 200 and nothing from 200: 199.99 pays 50, 200.00 and 200.01 are free', () => {
  assert.equal(shippingFor(0.01, shopDefaults), 50);
  assert.equal(shippingFor(199.99, shopDefaults), 50);
  assert.equal(shippingFor(200, shopDefaults), 0);
  assert.equal(shippingFor(200.01, shopDefaults), 0);
});

test('a policy with a zero flat rate and no threshold charges no shipping at any subtotal', () => {
  assert.equal(shippingFor(0.01, noShipping), 0);
  assert.equal(shippingFor(50, noShipping), 0);
});

test('priceCart totals lines: 2 x 24.00 + 1 x 99.50 = 147.50, free shipping above the threshold', () => {
  const quote = priceCart([line('mug', 2), line('lamp', 1)], [product('mug', 24, 5), product('lamp', 99.5, 2)], flatRate15FreeAt100);
  assert.deepEqual(quote.lines.map((l) => l.lineTotal), [48, 99.5]);
  assert.equal(quote.subtotal, 147.5);
  assert.equal(quote.shipping, 0);
  assert.equal(quote.total, 147.5);
  assert.equal(quote.checkoutAllowed, true);
});

test('priceCart adds the flat rate below the threshold: 3 x 24.00 = 72.00, + 15 = 87.00', () => {
  const quote = priceCart([line('mug', 3)], [product('mug', 24, 5)], flatRate15FreeAt100);
  assert.equal(quote.subtotal, 72);
  assert.equal(quote.shipping, 15);
  assert.equal(quote.total, 87);
});

test('priceCart applies the threshold on the subtotal: 100.00 is free, 99.99 pays 15 for a total of 114.99', () => {
  assert.equal(priceCart([line('a', 1)], [product('a', 100, 1)], flatRate15FreeAt100).shipping, 0);
  const quote = priceCart([line('a', 1)], [product('a', 99.99, 1)], flatRate15FreeAt100);
  assert.equal(quote.shipping, 15);
  assert.equal(quote.total, 114.99);
});

test('priceCart is exact where floats drift: 0.10 + 0.20 is 0.30 and 3 x 19.99 is 59.97', () => {
  const sum = priceCart([line('a', 1), line('b', 1)], [product('a', 0.1, 1), product('b', 0.2, 1)], noShipping);
  assert.equal(sum.subtotal, 0.3);
  assert.equal(sum.total, 0.3);
  assert.equal(priceCart([line('a', 3)], [product('a', 19.99, 5)], noShipping).lines[0].lineTotal, 59.97);
});

test('priceCart reduces the quantity to the stock: asking for 7 with 5 left gives 5, stock_reduced, 5 x 24.00 = 120.00', () => {
  const [result] = priceCart([line('mug', 7)], [product('mug', 24, 5)], noShipping).lines;
  assert.deepEqual(result, { productId: 'mug', unitPrice: 24, requestedQuantity: 7, quantity: 5, maxQuantity: 5, lineTotal: 120, status: 'adjusted', issue: 'stock_reduced' });
});

test('priceCart keeps a line unchanged when the quantity equals the stock', () => {
  const [result] = priceCart([line('mug', 5)], [product('mug', 24, 5)], noShipping).lines;
  assert.equal(result.status, 'ok');
  assert.equal(result.issue, null);
  assert.equal(result.quantity, 5);
});

test('priceCart caps a line at the policy maximum: 120 requested, 500 in stock, maximum 99', () => {
  const [result] = priceCart([line('mug', 120)], [product('mug', 1, 500)], noShipping).lines;
  assert.equal(result.quantity, 99);
  assert.equal(result.maxQuantity, 99);
  assert.equal(result.issue, 'quantity_capped');
});

test('priceCart follows the policy maximum: 12 requested with maximum 10 gives 10', () => {
  const [result] = priceCart([line('mug', 12)], [product('mug', 1, 50)], createShopPolicy({ maxLineQuantity: 10 })).lines;
  assert.equal(result.quantity, 10);
  assert.equal(result.issue, 'quantity_capped');
});

test('priceCart blames the cap, not the stock, when stock equals the maximum', () => {
  const [result] = priceCart([line('mug', 120)], [product('mug', 1, 99)], noShipping).lines;
  assert.equal(result.quantity, 99);
  assert.equal(result.issue, 'quantity_capped');
});

test('priceCart marks sold out, inactive and unknown products unavailable with zero quantity and total', () => {
  const quote = priceCart(
    [line('gone', 1), line('off', 1), line('nope', 1)],
    [product('gone', 5, 0), product('off', 5, 3, { isActive: false })],
    noShipping
  );
  assert.deepEqual(quote.lines.map((l) => [l.issue, l.status, l.quantity, l.lineTotal]), [
    ['out_of_stock', 'unavailable', 0, 0], ['inactive', 'unavailable', 0, 0], ['not_found', 'unavailable', 0, 0]
  ]);
  assert.equal(quote.checkoutAllowed, false);
  assert.equal(quote.subtotal, 0);
  assert.equal(quote.shipping, 0);
  assert.equal(quote.total, 0);
});

test('priceCart leaves unavailable lines out of the totals: 2 x 24.00 stays 48.00 beside an inactive lamp', () => {
  const quote = priceCart([line('mug', 2), line('lamp', 1)], [product('mug', 24, 5), product('lamp', 99.5, 2, { isActive: false })], flatRate15FreeAt100);
  assert.equal(quote.subtotal, 48);
  assert.equal(quote.shipping, 15);
  assert.equal(quote.total, 63);
  assert.equal(quote.checkoutAllowed, true);
});

test('priceCart merges repeated ids and keeps first-seen order: mug 1 + lamp 1 + mug 2 gives mug 3, lamp 1', () => {
  const quote = priceCart([line('mug', 1), line('lamp', 1), line('mug', 2)], [product('mug', 24, 5), product('lamp', 99.5, 2)], noShipping);
  assert.deepEqual(quote.lines.map((l) => [l.productId, l.requestedQuantity]), [['mug', 3], ['lamp', 1]]);
});

test('priceCart merges before clamping: 3 + 4 requested with 5 in stock gives 5', () => {
  const [result] = priceCart([line('mug', 3), line('mug', 4)], [product('mug', 24, 5)], noShipping).lines;
  assert.equal(result.requestedQuantity, 7);
  assert.equal(result.quantity, 5);
});

test('priceCart reads the product id from _id when id is absent (lean documents)', () => {
  const quote = priceCart([line('p1', 2)], [{ _id: 'p1', price: 10, stock: 3, isActive: true }], noShipping);
  assert.equal(quote.subtotal, 20);
});

test('priceCart rejects a quantity that is not a positive integer', () => {
  for (const quantity of [0, -1, 1.5, '2']) assert.throws(() => priceCart([line('mug', quantity)], [product('mug', 24, 5)], noShipping), /Invalid quantity for mug/);
});

test('priceCart uses the product price: changing 24.00 to 30.00 changes the total', () => {
  assert.equal(priceCart([line('mug', 2)], [product('mug', 30, 5)], noShipping).total, 60);
});

test('freeShippingRemaining is the gap to the threshold: 200 - 147.50 = 52.50, 200 - 199.99 = 0.01, none from 200', () => {
  assert.equal(freeShippingRemaining(147.5, shopDefaults), 52.5);
  assert.equal(freeShippingRemaining(199.99, shopDefaults), 0.01);
  assert.equal(freeShippingRemaining(200, shopDefaults), 0);
  assert.equal(freeShippingRemaining(250, shopDefaults), 0);
});

test('freeShippingRemaining is the whole threshold for an empty cart and null when the policy has no threshold', () => {
  assert.equal(freeShippingRemaining(0, shopDefaults), 200);
  assert.equal(freeShippingRemaining(10, noShipping), null);
});

test('freeShippingRemaining follows the policy threshold: 100 - 40 = 60', () => {
  assert.equal(freeShippingRemaining(40, flatRate15FreeAt100), 60);
});
