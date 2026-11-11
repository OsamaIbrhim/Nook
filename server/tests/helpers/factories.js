import { User } from '../../src/models/User.js';
import { Category } from '../../src/models/Category.js';
import { Product } from '../../src/models/Product.js';
import { Order } from '../../src/models/Order.js';
import { signAccessToken } from '../../src/utils/tokens.js';

let sequence = 0;
const next = () => ++sequence;

export async function createUser(overrides = {}) {
  const n = next();
  return User.create({ name: `User ${n}`, email: `user${n}@example.test`, password: 'Passw0rd-test', ...overrides });
}

export const bearer = (user) => signAccessToken(user);

export async function createCategory(overrides = {}) {
  const n = next();
  return Category.create({ name: `Category ${n}`, slug: `category-${n}`, ...overrides });
}

export async function createProduct({ category, createdBy, ...overrides }) {
  const n = next();
  return Product.create({
    name: `Product ${n}`, slug: `product-${n}`, description: 'Test product', price: 10, stock: 10,
    category: category._id, createdBy: createdBy._id,
    images: [{ url: `/products/product-${n}.jpg`, publicId: `test/product-${n}` }],
    ...overrides
  });
}

export const address = { name: 'Maya Hassan', line1: '12 Garden Street', city: 'Cairo', postalCode: '11511', country: 'eg' };

export async function createOrderDocument({ user, items, ...overrides }) {
  const lines = items.map(({ product, quantity }) => ({
    product: product._id, name: product.name, image: product.images[0]?.url,
    unitPrice: product.price, quantity, lineTotal: product.price * quantity
  }));
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  return Order.create({
    user: user._id, items: lines, shippingAddress: address, subtotal, shipping: 0, total: subtotal, currency: 'egp',
    ...overrides
  });
}
