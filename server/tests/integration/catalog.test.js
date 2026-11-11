import '../helpers/env.js';
import { before, after, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { startDatabase } from '../helpers/replSet.js';
import { startApi } from '../helpers/apiClient.js';
import { bearer, createCategory, createProduct, createUser } from '../helpers/factories.js';
import { Product } from '../../src/models/Product.js';

let db, api, admin, home, kitchen, empty;

before(async () => {
  db = await startDatabase();
  api = await startApi();
  admin = await createUser({ role: 'admin' });
});

after(async () => {
  await api.stop();
  await db.stop();
});

beforeEach(async () => {
  await db.clear('Product', 'Category');
  home = await createCategory({ name: 'Home', slug: 'home' });
  kitchen = await createCategory({ name: 'Kitchen', slug: 'kitchen' });
  empty = await createCategory({ name: 'Wellness', slug: 'wellness' });
});

const day = (n) => new Date(Date.UTC(2026, 10, n));
const product = (overrides) => createProduct({ createdBy: admin, ...overrides });

describe('GET /categories', () => {
  it('counts active products and covers each category with the newest active product that has an image', async () => {
    await product({ category: home, name: 'Old Vase', createdAt: day(1), images: [{ url: '/old.jpg', publicId: 'old', alt: 'Old alt' }] });
    await product({ category: home, name: 'New Vase', createdAt: day(5), images: [{ url: '/new.jpg', publicId: 'new', alt: 'New alt' }] });
    await product({ category: home, name: 'Newest Without Image', createdAt: day(9), images: [] });
    await product({ category: home, name: 'Hidden Lamp', createdAt: day(10), isActive: false, images: [{ url: '/hidden.jpg', publicId: 'hidden' }] });
    await product({ category: kitchen, name: 'Plain Jug', createdAt: day(2), images: [{ url: '/jug.jpg', publicId: 'jug' }] });

    const res = await api.request('GET', '/api/v1/categories');
    assert.equal(res.status, 200);
    const byName = Object.fromEntries(res.body.data.categories.map((category) => [category.name, category]));
    assert.equal(byName.Home.productCount, 3);
    assert.deepEqual(byName.Home.cover, { url: '/new.jpg', alt: 'New alt' });
    assert.equal(byName.Kitchen.productCount, 1);
    assert.deepEqual(byName.Kitchen.cover, { url: '/jug.jpg', alt: 'Plain Jug' });
    assert.equal(byName.Wellness.productCount, 0);
    assert.equal(byName.Wellness.cover, null);
  });

  it('keeps the existing fields and the name ordering', async () => {
    const res = await api.request('GET', '/api/v1/categories');
    assert.deepEqual(res.body.data.categories.map((category) => category.slug), ['home', 'kitchen', 'wellness']);
    assert.deepEqual(Object.keys(res.body.data.categories[0]).sort(), ['__v', '_id', 'cover', 'createdAt', 'description', 'name', 'productCount', 'slug', 'updatedAt']);
  });
});

describe('GET /products ids and exclude', () => {
  let a, b, c, d;
  beforeEach(async () => {
    [a, b, c, d] = [];
    a = await product({ category: home, name: 'Alpha', createdAt: day(1) });
    b = await product({ category: home, name: 'Bravo', createdAt: day(2) });
    c = await product({ category: kitchen, name: 'Charlie', createdAt: day(3) });
    d = await product({ category: kitchen, name: 'Delta', createdAt: day(4), isActive: false });
  });
  const names = (res) => res.body.data.products.map((entry) => entry.name);

  it('returns only the listed products with ids', async () => {
    const res = await api.request('GET', `/api/v1/products?ids=${a.id},${c.id}`);
    assert.deepEqual(names(res).sort(), ['Alpha', 'Charlie']);
    assert.equal(res.body.data.pagination.total, 2);
  });

  it('never returns an inactive product, even when listed', async () => {
    const res = await api.request('GET', `/api/v1/products?ids=${a.id},${d.id}`);
    assert.deepEqual(names(res), ['Alpha']);
  });

  it('drops the excluded product from a listing', async () => {
    const res = await api.request('GET', `/api/v1/products?category=home&exclude=${a.id}`);
    assert.deepEqual(names(res), ['Bravo']);
  });

  it('combines ids and exclude', async () => {
    const res = await api.request('GET', `/api/v1/products?ids=${a.id},${b.id},${c.id}&exclude=${b.id}`);
    assert.deepEqual(names(res).sort(), ['Alpha', 'Charlie']);
  });

  it('accepts exactly 24 ids and rejects 25, a malformed id and a malformed exclude with 400', async () => {
    const ids = Array.from({ length: 24 }, () => a.id).join(',');
    assert.equal((await api.request('GET', `/api/v1/products?ids=${ids}`)).status, 200);
    const tooMany = await api.request('GET', `/api/v1/products?ids=${ids},${a.id}`);
    assert.equal(tooMany.status, 400);
    assert.equal(tooMany.body.error.code, 'validation_failed');
    assert.equal((await api.request('GET', '/api/v1/products?ids=nope')).status, 400);
    assert.equal((await api.request('GET', '/api/v1/products?exclude=nope')).status, 400);
    assert.equal((await api.request('GET', '/api/v1/products?ids=')).status, 200);
  });

  it('leaves unfiltered listing unchanged', async () => {
    const res = await api.request('GET', '/api/v1/products');
    assert.deepEqual(names(res), ['Charlie', 'Bravo', 'Alpha']);
    assert.equal(await Product.countDocuments(), 4);
  });
});

describe('admin category errors', () => {
  const create = (body) => api.request('POST', '/api/v1/categories', { token: bearer(admin), body });

  it('reports a model validation failure as validation_failed with the offending field', async () => {
    const res = await create({ name: 'x'.repeat(81) });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'validation_failed');
    assert.equal(res.body.error.fieldErrors.length, 1);
    assert.equal(res.body.error.fieldErrors[0].field, 'name');
  });

  it('reports a duplicate as 409 duplicate_value', async () => {
    const res = await create({ name: 'Home' });
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'duplicate_value');
  });

  it('reports a missing field with fieldErrors', async () => {
    const res = await create({});
    assert.deepEqual(res.body.error.fieldErrors, [{ field: 'name', message: 'is required' }]);
  });
});

describe('GET /products search', () => {
  const find = async (term) => (await api.request('GET', `/api/v1/products?search=${encodeURIComponent(term)}`)).body.data.products.map((entry) => entry.name).sort();
  beforeEach(async () => {
    await product({ category: home, name: 'Ripple Ceramic Mug', tags: ['ceramics', 'coffee'] });
    await product({ category: home, name: 'Muted Linen Runner', tags: ['linen'] });
    await product({ category: kitchen, name: 'Glass Carafe Set', tags: ['glass'] });
  });

  it('matches the start of any word of the name: "mu" finds the mug and the muted runner', async () => {
    assert.deepEqual(await find('mu'), ['Muted Linen Runner', 'Ripple Ceramic Mug']);
  });

  it('ignores case and matches the start of a tag', async () => {
    assert.deepEqual(await find('MU'), ['Muted Linen Runner', 'Ripple Ceramic Mug']);
    assert.deepEqual(await find('coff'), ['Ripple Ceramic Mug']);
  });

  it('does not match the middle of a word: "ug" finds nothing', async () => {
    assert.deepEqual(await find('ug'), []);
  });

  it('requires every word of the search: "ceramic mu" finds only the mug', async () => {
    assert.deepEqual(await find('ceramic mu'), ['Ripple Ceramic Mug']);
  });

  it('treats regular expression characters literally: ".*" and "(" match nothing and never fail', async () => {
    assert.deepEqual(await find('.*'), []);
    assert.deepEqual(await find('('), []);
    assert.deepEqual(await find('[a-z]+'), []);
  });

  it('accepts a very long search without error', async () => {
    assert.equal((await api.request('GET', `/api/v1/products?search=${'mu'.repeat(200)}`)).status, 200);
  });
});

describe('product and category slugs', () => {
  const patch = (path, body) => api.request('PATCH', path, { token: bearer(admin), body });

  it('keeps a product slug when it is renamed', async () => {
    const mug = await product({ category: home, name: 'Ripple Ceramic Mug', slug: 'ripple-ceramic-mug' });
    const res = await patch(`/api/v1/products/${mug.id}`, { name: 'Ripple Mug, Large' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.product.name, 'Ripple Mug, Large');
    assert.equal(res.body.data.product.slug, 'ripple-ceramic-mug');
    assert.equal((await api.request('GET', '/api/v1/products/ripple-ceramic-mug')).status, 200);
  });

  it('changes a product slug only when an explicit slug is given, and answers 409 for a taken one', async () => {
    const mug = await product({ category: home, name: 'Ripple Ceramic Mug', slug: 'ripple-ceramic-mug' });
    await product({ category: home, name: 'Other', slug: 'taken-slug' });
    const changed = await patch(`/api/v1/products/${mug.id}`, { slug: 'Ripple Mug' });
    assert.equal(changed.body.data.product.slug, 'ripple-mug');
    const clash = await patch(`/api/v1/products/${mug.id}`, { slug: 'taken-slug' });
    assert.equal(clash.status, 409);
    assert.equal(clash.body.error.code, 'duplicate_value');
    assert.equal(clash.body.error.message, 'Duplicate value for slug');
  });

  it('keeps a category slug when it is renamed and changes it only on request', async () => {
    const renamed = await patch(`/api/v1/categories/${home.id}`, { name: 'Living Room' });
    assert.equal(renamed.body.data.category.name, 'Living Room');
    assert.equal(renamed.body.data.category.slug, 'home');
    const moved = await patch(`/api/v1/categories/${home.id}`, { slug: 'Living Room' });
    assert.equal(moved.body.data.category.slug, 'living-room');
    assert.equal((await patch(`/api/v1/categories/${home.id}`, { slug: 'kitchen' })).status, 409);
  });

  it('uses an explicit slug on create and ignores unknown category fields', async () => {
    const created = await api.request('POST', '/api/v1/categories', { token: bearer(admin), body: { name: 'Studio', slug: 'Art Studio', createdAt: '2000-01-01', _id: '64f000000000000000000009' } });
    assert.equal(created.body.data.category.slug, 'art-studio');
    assert.notEqual(created.body.data.category._id, '64f000000000000000000009');
    assert.notEqual(created.body.data.category.createdAt.slice(0, 4), '2000');
  });
});

describe('cache headers', () => {
  const PUBLIC = 'public, max-age=0, s-maxage=60, stale-while-revalidate=300';

  it('lets the edge cache the catalog reads for a minute', async () => {
    await product({ category: home, name: 'Ripple Ceramic Mug', slug: 'ripple-ceramic-mug' });
    for (const path of ['/api/v1/products', '/api/v1/products/ripple-ceramic-mug', '/api/v1/categories']) {
      const res = await api.request('GET', path);
      assert.equal(res.status, 200, path);
      assert.equal(res.headers.get('cache-control'), PUBLIC, path);
    }
  });

  it('never lets the edge cache an error response', async () => {
    const missing = await api.request('GET', '/api/v1/products/nope');
    assert.equal(missing.status, 404);
    assert.equal(missing.headers.get('cache-control'), 'no-store');
  });

  it('marks account, order, payment and admin responses no-store, errors included', async () => {
    for (const path of ['/api/v1/auth/me', '/api/v1/orders/mine', '/api/v1/admin/stats', '/api/v1/payments/checkout-session']) {
      const res = await api.request('GET', path);
      assert.equal(res.headers.get('cache-control'), 'no-store', path);
    }
    const ok = await api.request('GET', '/api/v1/admin/stats', { token: bearer(admin) });
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get('cache-control'), 'no-store');
  });
});

describe('admin searches and filters', () => {
  it('searches users literally: "a.b" finds a.b only, never axb, and a lone "(" does not fail', async () => {
    await createUser({ name: 'a.b', email: 'dotted@example.test' });
    await createUser({ name: 'axb', email: 'plain@example.test' });
    const names = async (term) => (await api.request('GET', `/api/v1/admin/users?search=${encodeURIComponent(term)}`, { token: bearer(admin) })).body.data.users.map((user) => user.name);
    assert.deepEqual(await names('a.b'), ['a.b']);
    assert.deepEqual(await names('('), []);
    assert.equal((await api.request('GET', '/api/v1/admin/users?search=.*', { token: bearer(admin) })).body.data.users.length, 0);
  });

  it('rejects an unknown order status or payment status filter with 400 and accepts the documented ones', async () => {
    for (const query of ['status=teleported', 'paymentStatus=maybe']) {
      const res = await api.request('GET', `/api/v1/orders?${query}`, { token: bearer(admin) });
      assert.equal(res.status, 400, query);
      assert.equal(res.body.error.code, 'validation_failed');
    }
    assert.equal((await api.request('GET', '/api/v1/orders?status=pending&paymentStatus=unpaid', { token: bearer(admin) })).status, 200);
  });

  it('paginates with the shared shape and caps the limit at 100', async () => {
    const res = await api.request('GET', '/api/v1/products?limit=500&page=1');
    assert.deepEqual(res.body.data.pagination, { page: 1, limit: 100, total: 0, pages: 0 });
  });
});
