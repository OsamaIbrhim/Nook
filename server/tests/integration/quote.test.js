import '../helpers/env.js';
import { before, after, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { startDatabase } from '../helpers/replSet.js';
import { startApi } from '../helpers/apiClient.js';
import { address, bearer, createCategory, createProduct, createUser } from '../helpers/factories.js';
import { Product } from '../../src/models/Product.js';

let db, api, admin, alice, home, mug, lamp;

before(async () => {
  db = await startDatabase();
  api = await startApi();
  admin = await createUser({ role: 'admin' });
  alice = await createUser();
  home = await createCategory({ name: 'Home', slug: 'home' });
});

after(async () => {
  await api.stop();
  await db.stop();
});

beforeEach(async () => {
  await db.clear('Product', 'Order');
  mug = await createProduct({
    category: home, createdBy: admin, name: 'Ripple Ceramic Mug', slug: 'ripple-ceramic-mug', price: 24, compareAtPrice: 32, stock: 5,
    images: [{ url: '/products/mug.jpg', publicId: 'test/mug', alt: 'A speckled mug' }]
  });
  lamp = await createProduct({ category: home, createdBy: admin, name: 'Arc Table Lamp', slug: 'arc-table-lamp', price: 99.5, stock: 2 });
});

const quote = (lines, options = {}) => api.request('POST', '/api/v1/cart/quote', { body: { lines }, ...options });
const line = (product, quantity) => ({ productId: product.id, quantity });

describe('POST /cart/quote totals', () => {
  it('prices lines from the catalog: 2 x 24 + 1 x 99.50 = 147.50, + 50 shipping = 197.50, 52.50 short of free shipping', async () => {
    const res = await quote([line(mug, 2), line(lamp, 1)]);
    assert.equal(res.status, 200);
    const { data } = res.body;
    assert.equal(data.currency, 'egp');
    assert.equal(data.subtotal, 147.5);
    assert.equal(data.shipping, 50);
    assert.equal(data.total, 197.5);
    assert.equal(data.freeShippingThreshold, 200);
    assert.equal(data.freeShippingRemaining, 52.5);
    assert.equal(data.checkoutAllowed, true);
    assert.deepEqual(Object.keys(data).sort(), ['checkoutAllowed', 'currency', 'freeShippingRemaining', 'freeShippingThreshold', 'lines', 'shipping', 'subtotal', 'total']);
  });

  it('describes a purchasable line with the exact documented fields', async () => {
    const { data } = (await quote([line(mug, 2)])).body;
    assert.deepEqual(data.lines, [{
      productId: mug.id, slug: 'ripple-ceramic-mug', name: 'Ripple Ceramic Mug',
      image: { url: '/products/mug.jpg', alt: 'A speckled mug' }, category: { name: 'Home', slug: 'home' },
      unitPrice: 24, compareAtPrice: 32, requestedQuantity: 2, quantity: 2, maxQuantity: 5, lineTotal: 48, status: 'ok', issue: null
    }]);
  });

  it('falls back to the product name for a missing image alt and null for a product without images', async () => {
    const withoutImages = await createProduct({ category: home, createdBy: admin, name: 'Bare Shelf', price: 10, stock: 1, images: [] });
    const { data } = (await quote([line(withoutImages, 1)])).body;
    assert.equal(data.lines[0].image, null);
    const plain = await createProduct({ category: home, createdBy: admin, name: 'Plain Cup', price: 10, stock: 1, images: [{ url: '/p.jpg', publicId: 'p' }] });
    assert.deepEqual((await quote([line(plain, 1)])).body.data.lines[0].image, { url: '/p.jpg', alt: 'Plain Cup' });
    assert.equal(data.lines[0].compareAtPrice, null);
  });

  it('ships free from 200: 2 x 99.50 + 24 = 223.00, nothing remaining', async () => {
    const { data } = (await quote([line(lamp, 2), line(mug, 1)])).body;
    assert.equal(data.subtotal, 223);
    assert.equal(data.shipping, 0);
    assert.equal(data.total, 223);
    assert.equal(data.freeShippingRemaining, 0);
  });

  it('merges repeated products: 1 + 2 mugs is one line of 3, 72.00', async () => {
    const { data } = (await quote([line(mug, 1), line(mug, 2)])).body;
    assert.equal(data.lines.length, 1);
    assert.equal(data.lines[0].quantity, 3);
    assert.equal(data.lines[0].lineTotal, 72);
  });

  it('ignores a client supplied price and reflects a price change on the next quote', async () => {
    const first = await api.request('POST', '/api/v1/cart/quote', { body: { lines: [{ productId: mug.id, quantity: 1, unitPrice: 0.01 }] } });
    assert.equal(first.body.data.lines[0].unitPrice, 24);
    await Product.updateOne({ _id: mug._id }, { price: 30 });
    const second = await quote([line(mug, 1)]);
    assert.equal(second.body.data.lines[0].unitPrice, 30);
    assert.equal(second.body.data.total, 80);
  });

  it('works for guests and leaves stock untouched', async () => {
    await quote([line(mug, 5)]);
    assert.equal((await Product.findById(mug._id)).stock, 5);
  });
});

describe('POST /cart/quote adjustments', () => {
  it('reduces a line to the stock: 7 requested, 5 left, 5 x 24 = 120 + 50 shipping = 170', async () => {
    const { data } = (await quote([line(mug, 7)])).body;
    assert.deepEqual(
      { quantity: data.lines[0].quantity, requestedQuantity: data.lines[0].requestedQuantity, maxQuantity: data.lines[0].maxQuantity, status: data.lines[0].status, issue: data.lines[0].issue, lineTotal: data.lines[0].lineTotal },
      { quantity: 5, requestedQuantity: 7, maxQuantity: 5, status: 'adjusted', issue: 'stock_reduced', lineTotal: 120 }
    );
    assert.equal(data.total, 170);
  });

  it('caps a line at 99: 120 requested of a 1.00 product with 500 in stock gives 99, + 50 shipping = 149', async () => {
    const bulk = await createProduct({ category: home, createdBy: admin, name: 'Brass Bookmark', price: 1, stock: 500 });
    const { data } = (await quote([line(bulk, 120)])).body;
    assert.equal(data.lines[0].quantity, 99);
    assert.equal(data.lines[0].issue, 'quantity_capped');
    assert.equal(data.total, 149);
  });

  it('flags an out of stock product as unavailable with its details, and refuses checkout when nothing is left', async () => {
    await Product.updateOne({ _id: lamp._id }, { stock: 0 });
    const { data } = (await quote([line(lamp, 1)])).body;
    assert.equal(data.lines[0].status, 'unavailable');
    assert.equal(data.lines[0].issue, 'out_of_stock');
    assert.equal(data.lines[0].name, 'Arc Table Lamp');
    assert.deepEqual([data.lines[0].quantity, data.lines[0].lineTotal, data.lines[0].unitPrice], [0, 0, null]);
    assert.deepEqual([data.subtotal, data.shipping, data.total, data.checkoutAllowed, data.freeShippingRemaining], [0, 0, 0, false, 200]);
  });

  it('excludes unavailable lines from the totals but keeps the rest purchasable', async () => {
    await Product.updateOne({ _id: lamp._id }, { stock: 0 });
    const { data } = (await quote([line(mug, 1), line(lamp, 1)])).body;
    assert.equal(data.subtotal, 24);
    assert.equal(data.total, 74);
    assert.equal(data.checkoutAllowed, true);
  });

  it('reveals nothing about an inactive or unknown product', async () => {
    await Product.updateOne({ _id: lamp._id }, { isActive: false });
    const { data } = (await quote([line(lamp, 1), { productId: '64f000000000000000000001', quantity: 1 }])).body;
    const [inactive, unknown] = data.lines;
    assert.equal(inactive.issue, 'inactive');
    assert.equal(unknown.issue, 'not_found');
    for (const hidden of [inactive, unknown]) {
      assert.deepEqual([hidden.slug, hidden.name, hidden.image, hidden.category, hidden.compareAtPrice, hidden.unitPrice], [null, null, null, null, null, null]);
    }
  });

  it('accepts an upper-case id', async () => {
    const { data } = (await quote([{ productId: mug.id.toUpperCase(), quantity: 1 }])).body;
    assert.equal(data.lines[0].status, 'ok');
    assert.equal(data.lines[0].productId, mug.id);
  });
});

describe('POST /cart/quote validation', () => {
  const rejected = async (body, field) => {
    const res = await api.request('POST', '/api/v1/cart/quote', { body });
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.equal(res.body.error.code, 'validation_failed');
    assert.ok(res.body.error.fieldErrors.some((entry) => entry.field === field), JSON.stringify(res.body.error.fieldErrors));
    return res;
  };

  it('requires between 1 and 50 lines', async () => {
    await rejected({}, 'lines');
    await rejected({ lines: 'x' }, 'lines');
    await rejected({ lines: [] }, 'lines');
    await rejected({ lines: Array.from({ length: 51 }, () => ({ productId: mug.id, quantity: 1 })) }, 'lines');
    const fifty = await quote(Array.from({ length: 50 }, () => ({ productId: mug.id, quantity: 1 })));
    assert.equal(fifty.status, 200);
  });

  it('requires a 24 character hex product id given as a string', async () => {
    await rejected({ lines: [{ quantity: 1 }] }, 'lines[0].productId');
    await rejected({ lines: [{ productId: 'abcdefghijkl', quantity: 1 }] }, 'lines[0].productId');
    await rejected({ lines: [{ productId: [mug.id], quantity: 1 }] }, 'lines[0].productId');
    await rejected({ lines: [{ productId: { $ne: null }, quantity: 1 }] }, 'lines[0].productId');
  });

  it('requires a whole quantity of at least 1', async () => {
    for (const quantity of [0, -1, 1.5, '2', null, undefined, Number.MAX_SAFE_INTEGER + 1]) {
      await rejected({ lines: [{ productId: mug.id, quantity }] }, 'lines[0].quantity');
    }
  });

  it('reports every bad line with its index', async () => {
    const res = await rejected({ lines: [{ productId: mug.id, quantity: 1 }, { productId: 'bad', quantity: 0 }] }, 'lines[1].productId');
    assert.deepEqual(res.body.error.fieldErrors.map((entry) => entry.field), ['lines[1].productId', 'lines[1].quantity']);
  });
});

describe('POST /cart/quote rate limit', () => {
  it('allows 60 requests per minute per client address and then answers 429', async () => {
    const ip = '203.0.113.77';
    for (let i = 0; i < 60; i += 1) assert.equal((await quote([line(mug, 1)], { ip })).status, 200);
    const limited = await quote([line(mug, 1)], { ip });
    assert.equal(limited.status, 429);
    assert.equal(limited.body.error.code, 'too_many_requests');
    assert.equal((await quote([line(mug, 1)], { ip: '203.0.113.78' })).status, 200);
  });
});

describe('quote and order agree', () => {
  it('charges at checkout exactly what the quote promised', async () => {
    const lines = [line(mug, 2), line(lamp, 1)];
    const promised = (await quote(lines)).body.data;
    const created = await api.request('POST', '/api/v1/orders', {
      token: bearer(alice), body: { items: lines.map(({ productId, quantity }) => ({ product: productId, quantity })), shippingAddress: address }
    });
    assert.equal(created.status, 201);
    const { order } = created.body.data;
    assert.deepEqual([order.subtotal, order.shipping, order.total], [promised.subtotal, promised.shipping, promised.total]);
  });
});
