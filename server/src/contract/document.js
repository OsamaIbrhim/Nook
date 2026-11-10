import { z } from 'zod';
import {
  AuthSession, Category, CheckoutSession, CheckoutSessionRequest, ErrorResponse, IdempotencyKey, LoginRequest, ObjectId, Order,
  OrderRequest, Pagination, Product, Quote, QuoteRequest, RegisterRequest, ShopConfig, User, envelope
} from './schemas.js';

const content = (schema) => ({ 'application/json': { schema } });
const body = (schema) => ({ required: true, content: content(schema) });
const ok = (description, schema) => ({ description, content: content(envelope(schema)) });
const failure = (description) => ({ description, content: content(ErrorResponse) });
const pathParam = (name, schema) => ({ name, in: 'path', required: true, schema });
const queryParam = (name, schema, description) => ({ name, in: 'query', required: false, schema, ...(description && { description }) });
const bearer = [{ bearerAuth: [] }];

const productQuery = [
  queryParam('page', z.int().min(1)),
  queryParam('limit', z.int().min(1).max(100)),
  queryParam('search', z.string().max(60), 'Word-prefix match on name and tags'),
  queryParam('category', z.string(), 'Category slug or id'),
  queryParam('minPrice', z.number().min(0)),
  queryParam('maxPrice', z.number().min(0)),
  queryParam('sort', z.enum(['newest', 'price_asc', 'price_desc', 'name'])),
  queryParam('ids', z.string(), 'Comma separated product ids, 1 to 24'),
  queryParam('exclude', ObjectId)
];

export const operations = {
  '/products': {
    get: {
      operationId: 'listProducts', tags: ['catalog'], parameters: productQuery,
      responses: { 200: ok('Active products', z.looseObject({ products: z.array(Product), pagination: Pagination })), 400: failure('Invalid filter') }
    }
  },
  '/products/{idOrSlug}': {
    get: {
      operationId: 'getProduct', tags: ['catalog'], parameters: [pathParam('idOrSlug', z.string())],
      responses: { 200: ok('One active product', z.looseObject({ product: Product })), 404: failure('Unknown or inactive product') }
    }
  },
  '/categories': {
    get: { operationId: 'listCategories', tags: ['catalog'], responses: { 200: ok('All categories', z.looseObject({ categories: z.array(Category) })) } }
  },
  '/shop/config': {
    get: { operationId: 'getShopConfig', tags: ['shop'], responses: { 200: ok('Storefront policy', ShopConfig) } }
  },
  '/cart/quote': {
    post: {
      operationId: 'quoteCart', tags: ['cart'], requestBody: body(QuoteRequest),
      responses: { 200: ok('Priced cart', Quote), 400: failure('Invalid cart'), 429: failure('Rate limited') }
    }
  },
  '/orders': {
    post: {
      operationId: 'createOrder', tags: ['orders'], security: bearer,
      parameters: [{ name: 'Idempotency-Key', in: 'header', required: false, schema: IdempotencyKey }],
      requestBody: body(OrderRequest),
      responses: {
        200: ok('The order created earlier with the same Idempotency-Key', z.looseObject({ order: Order })),
        201: ok('Order created', z.looseObject({ order: Order })),
        400: failure('Invalid request'), 401: failure('Not signed in'), 409: failure('Insufficient stock or Idempotency-Key reused with another body')
      }
    }
  },
  '/orders/mine': {
    get: {
      operationId: 'listMyOrders', tags: ['orders'], security: bearer,
      parameters: [queryParam('page', z.int().min(1)), queryParam('limit', z.int().min(1).max(50))],
      responses: { 200: ok('The caller\'s orders, newest first', z.looseObject({ orders: z.array(Order), pagination: Pagination })), 401: failure('Not signed in') }
    }
  },
  '/orders/by-session/{sessionId}': {
    get: {
      operationId: 'getOrderBySession', tags: ['orders'], security: bearer, parameters: [pathParam('sessionId', z.string())],
      responses: { 200: ok('The caller\'s order for a Stripe Checkout session', z.looseObject({ order: Order })), 404: failure('No such order for the caller') }
    }
  },
  '/orders/{id}': {
    get: {
      operationId: 'getOrder', tags: ['orders'], security: bearer, parameters: [pathParam('id', ObjectId)],
      responses: { 200: ok('One order', z.looseObject({ order: Order })), 404: failure('No such order for the caller') }
    }
  },
  '/orders/{id}/cancel': {
    post: {
      operationId: 'cancelOrder', tags: ['orders'], security: bearer, parameters: [pathParam('id', ObjectId)],
      responses: { 200: ok('The cancelled order', z.looseObject({ order: Order })), 404: failure('No such order for the caller'), 409: failure('Order cannot be cancelled') }
    }
  },
  '/payments/checkout-session': {
    post: {
      operationId: 'createCheckoutSession', tags: ['payments'], security: bearer, requestBody: body(CheckoutSessionRequest),
      responses: { 200: ok('The order\'s open session', CheckoutSession), 201: ok('A new session', CheckoutSession), 404: failure('No such order for the caller'), 409: failure('Order is not payable') }
    }
  },
  '/auth/register': {
    post: {
      operationId: 'register', tags: ['auth'], requestBody: body(RegisterRequest),
      responses: { 201: ok('Account created; the refresh token is set as a cookie', AuthSession), 400: failure('Invalid request'), 409: failure('Email already registered') }
    }
  },
  '/auth/login': {
    post: {
      operationId: 'login', tags: ['auth'], requestBody: body(LoginRequest),
      responses: { 200: ok('Signed in; the refresh token is set as a cookie', AuthSession), 400: failure('Invalid request'), 401: failure('Wrong email or password') }
    }
  },
  '/auth/refresh': {
    post: {
      operationId: 'refreshSession', tags: ['auth'],
      responses: { 200: ok('The user and a new access token', AuthSession), 204: { description: 'No refresh cookie: the caller is a guest' }, 401: failure('Invalid, expired or reused refresh token') }
    }
  },
  '/auth/logout': {
    post: { operationId: 'logout', tags: ['auth'], responses: { 204: { description: 'Signed out' } } }
  },
  '/auth/me': {
    get: { operationId: 'getMe', tags: ['auth'], security: bearer, responses: { 200: ok('The signed-in user', z.looseObject({ user: User })), 401: failure('Not signed in') } }
  }
};

const DROPPED_KEYS = new Set(['$schema', '$id', '$defs']);
const INTEGER_LIMITS = new Set([Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER]);
const isOpenObject = (key, value) => key === 'additionalProperties' && (value === false || (typeof value === 'object' && Object.keys(value).length === 0));

function clean(node) {
  if (Array.isArray(node)) return node.map(clean);
  if (node === null || typeof node !== 'object') return node;
  const isDateTime = node.format === 'date-time';
  return Object.fromEntries(Object.entries(node)
    .filter(([key, value]) => !DROPPED_KEYS.has(key) && !isOpenObject(key, value) && !(key === 'pattern' && isDateTime) && !INTEGER_LIMITS.has(value))
    .map(([key, value]) => [key, key === '$ref' ? value.replace('#/$defs/', '#/components/schemas/') : clean(value)]));
}

function inline(schema, io) {
  return clean(z.toJSONSchema(schema, { io, unrepresentable: 'any' }));
}

function resolveSchemas(node, io) {
  if (node instanceof z.ZodType) return inline(node, io);
  if (Array.isArray(node)) return node.map((entry) => resolveSchemas(entry, io));
  if (node === null || typeof node !== 'object') return node;
  return Object.fromEntries(Object.entries(node).map(([key, value]) => [key, resolveSchemas(value, key === 'requestBody' || key === 'parameters' ? 'input' : io)]));
}

export function buildOpenApiDocument() {
  const registered = z.toJSONSchema(z.globalRegistry, { io: 'output', uri: (id) => `#/components/schemas/${id}`, unrepresentable: 'any' }).schemas;
  const schemas = Object.fromEntries(Object.entries(registered).sort(([a], [b]) => a.localeCompare(b)).map(([id, json]) => [id, clean(json)]));
  return {
    openapi: '3.1.0',
    info: { title: 'Nook storefront API', version: '1.0.0' },
    servers: [{ url: '/api/v1' }],
    paths: resolveSchemas(operations, 'output'),
    components: { schemas, securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } } }
  };
}

export function responseSchema(operationId, status) {
  for (const methods of Object.values(operations)) {
    for (const operation of Object.values(methods)) {
      if (operation.operationId === operationId) return operation.responses[status]?.content['application/json'].schema;
    }
  }
  return undefined;
}
