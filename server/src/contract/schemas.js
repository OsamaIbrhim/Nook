import { z } from 'zod';
import { ORDER_STATUSES, PAYMENT_STATUSES } from '../domain/orderStatus.js';

export const PASSWORD_MIN_LENGTH = 8;

const described = (schema, id) => schema.meta({ id });
const required = (kind) => ({ error: (issue) => (issue.input === undefined ? 'is required' : `must be ${kind}`) });
const text = () => z.string(required('text')).trim().min(1, 'is required');
const optionalText = () => z.string(required('text')).trim().optional();

export const ObjectId = described(z.string(required('a 24 character hex id')).regex(/^[a-f\d]{24}$/i, 'must be a 24 character hex id'), 'ObjectId');
const Money = z.number().min(0);
const Timestamp = z.iso.datetime();
const Quantity = z.int(required('a whole number')).min(1, 'must be a whole number of at least 1');
const OrderStatus = described(z.enum(ORDER_STATUSES), 'OrderStatus');
const PaymentStatus = described(z.enum(PAYMENT_STATUSES), 'PaymentStatus');

export const Pagination = described(z.looseObject({ page: z.int(), limit: z.int(), total: z.int(), pages: z.int() }), 'Pagination');
const ProductImage = described(z.looseObject({ url: z.string(), publicId: z.string(), alt: z.string() }), 'ProductImage');
const CoverImage = described(z.looseObject({ url: z.string(), alt: z.string() }), 'CoverImage');
const CategorySummary = described(z.looseObject({ _id: ObjectId, name: z.string(), slug: z.string() }), 'CategorySummary');

export const Category = described(z.looseObject({
  _id: ObjectId, name: z.string(), slug: z.string(), description: z.string().optional(),
  productCount: z.int().min(0), cover: CoverImage.nullable()
}), 'Category');

export const Product = described(z.looseObject({
  _id: ObjectId, name: z.string(), slug: z.string(), description: z.string(),
  shortDescription: z.string().optional(), sku: z.string().optional(), brand: z.string().optional(),
  material: z.string().optional(), dimensions: z.string().optional(), care: z.string().optional(),
  benefits: z.array(z.string()).optional(), tags: z.array(z.string()).optional(),
  seo: z.looseObject({ title: z.string().optional(), description: z.string().optional() }).optional(),
  price: Money, compareAtPrice: Money.optional(), stock: z.int().min(0),
  category: CategorySummary, images: z.array(ProductImage), isActive: z.boolean(),
  createdAt: Timestamp, updatedAt: Timestamp
}), 'Product');

export const User = described(z.looseObject({
  _id: ObjectId, name: z.string(), email: z.string(), role: z.enum(['customer', 'admin']), isActive: z.boolean(), createdAt: Timestamp
}), 'User');

export const Address = described(z.looseObject({
  name: z.string(), line1: z.string(), line2: z.string().optional(), city: z.string(), state: z.string().optional(),
  postalCode: z.string(), country: z.string().length(2), phone: z.string().optional()
}), 'Address');

export const Order = described(z.looseObject({
  _id: ObjectId,
  code: z.string(),
  user: z.union([ObjectId, z.looseObject({ _id: ObjectId, name: z.string(), email: z.string() })]),
  items: z.array(z.looseObject({ product: ObjectId, name: z.string(), image: z.string().optional(), unitPrice: Money, quantity: Quantity, lineTotal: Money })),
  shippingAddress: Address,
  subtotal: Money, shipping: Money, total: Money, currency: z.string(),
  status: OrderStatus, paymentStatus: PaymentStatus,
  statusHistory: z.array(z.looseObject({ status: z.string(), at: Timestamp, note: z.string().optional() })),
  actions: z.looseObject({ canPay: z.boolean(), canCancel: z.boolean(), nextStatuses: z.array(OrderStatus) }),
  createdAt: Timestamp, updatedAt: Timestamp
}), 'Order');

export const QuoteLine = described(z.looseObject({
  productId: ObjectId, slug: z.string().nullable(), name: z.string().nullable(), image: CoverImage.nullable(),
  category: z.looseObject({ name: z.string(), slug: z.string() }).nullable(),
  unitPrice: Money.nullable(), compareAtPrice: Money.nullable(),
  requestedQuantity: z.int().min(1), quantity: z.int().min(0), maxQuantity: z.int().min(0), lineTotal: Money,
  status: z.enum(['ok', 'adjusted', 'unavailable']),
  issue: z.enum(['stock_reduced', 'quantity_capped', 'out_of_stock', 'inactive', 'not_found']).nullable()
}), 'QuoteLine');

export const Quote = described(z.looseObject({
  currency: z.string(), lines: z.array(QuoteLine), subtotal: Money, shipping: Money, total: Money,
  freeShippingThreshold: Money.nullable(), freeShippingRemaining: Money.nullable(), checkoutAllowed: z.boolean()
}), 'Quote');

export const ShopConfig = described(z.looseObject({
  currency: z.string(), locale: z.string(), freeShippingThreshold: Money.nullable(), flatShippingRate: Money,
  returnWindowDays: z.int().min(0), dispatchDaysMin: z.int().min(0), dispatchDaysMax: z.int().min(0),
  maxLineQuantity: z.int().min(1), reservationMinutes: z.int().min(1), supportEmail: z.string(), shipsTo: z.array(z.string().length(2))
}), 'ShopConfig');

export const ErrorResponse = described(z.looseObject({
  success: z.literal(false),
  error: z.looseObject({
    message: z.string(), code: z.string(), details: z.unknown().optional(),
    fieldErrors: z.array(z.looseObject({ field: z.string(), message: z.string() })).optional()
  })
}), 'ErrorResponse');

export const QuoteRequest = described(z.object({
  lines: z.array(z.object({ productId: ObjectId, quantity: Quantity }), { error: 'must contain between 1 and 50 lines' })
    .min(1, 'must contain between 1 and 50 lines').max(50, 'must contain between 1 and 50 lines')
}), 'QuoteRequest');

export const OrderRequest = described(z.object({
  items: z.array(z.object({ product: ObjectId, quantity: Quantity }), required('a list of items')).min(1, 'must contain at least one item'),
  shippingAddress: z.object({
    name: text(), line1: text(), line2: optionalText(), city: text(), state: optionalText(), postalCode: text(),
    country: z.string(required('a 2 letter country code')).trim().length(2, 'must be a 2 letter country code'), phone: optionalText()
  }, required('an address'))
}), 'OrderRequest');

export const RegisterRequest = described(z.object({
  name: text(),
  email: z.string(required('an email address')).trim().toLowerCase().min(1, 'is required').regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'must be an email address'),
  password: z.string(required('text')).min(1, 'is required').min(PASSWORD_MIN_LENGTH, `must be at least ${PASSWORD_MIN_LENGTH} characters`)
}), 'RegisterRequest');

export const LoginRequest = described(z.object({
  email: z.string(required('text')).trim().toLowerCase().min(1, 'is required'),
  password: z.string(required('text')).min(1, 'is required')
}), 'LoginRequest');

export const CheckoutSessionRequest = described(z.object({ orderId: ObjectId }), 'CheckoutSessionRequest');

export const AuthSession = described(z.looseObject({ user: User, accessToken: z.string() }), 'AuthSession');
export const CheckoutSession = described(z.looseObject({ sessionId: z.string(), url: z.string() }), 'CheckoutSession');

export const IdempotencyKey = z.guid();

export const envelope = (data) => z.looseObject({ success: z.literal(true), data });
