# E-Commerce REST API

A Phase 1 backend implementation using Node.js, Express, MongoDB/Mongoose, JWT refresh-token rotation, Stripe Checkout, and Cloudinary image uploads.

## Features

- Registration, login, logout, current-user endpoint, short-lived access tokens, rotating refresh tokens in `httpOnly` cookies
- Customer/admin role authorization and account activation controls
- Product CRUD, soft deletion, Cloudinary images, categories, full-text search, filters, sorting, and pagination
- Server-priced orders, transactional stock reservation, customer history/cancellation, and controlled status transitions
- Stripe Checkout and signature-verified, idempotent webhooks
- Admin statistics, user management, and order management endpoints
- Helmet, CORS allow-list, request size limits, rate limits, centralized errors, and graceful shutdown

## Requirements

- Node.js 20+
- MongoDB replica set (MongoDB Atlas is suitable). Order and webhook inventory operations use transactions.
- Stripe test account and Stripe CLI for local webhook forwarding
- Cloudinary account

## Setup

```bash
cd server
cp .env.example .env
# Fill in all secrets in .env
npm install
npm run dev
```

Create or promote an administrator:

```bash
npm run create-admin -- "Store Admin" admin@example.com "change-this-password"
```

Populate the store with safe demo data:

```bash
npm run seed
```

The seed is repeatable and creates 4 categories, 15 richly specified products with locally verified imagery, 4 users, and 6 orders covering different payment/fulfillment states. It only replaces records owned by the demo users, leaving other store data intact.

Demo credentials:

- Admin: `admin@nook.test` / `Admin123!`
- Customer: `maya@nook.test` / `Customer123!`

The API defaults to `http://localhost:5000/api/v1`. Check it with:

```bash
curl http://localhost:5000/api/v1/health
```

## Authentication

The register/login response contains an access token. Send it on protected requests:

```http
Authorization: Bearer ACCESS_TOKEN
```

The refresh token is only stored in an `httpOnly` cookie. Browser requests to refresh/logout must use credentials (`credentials: "include"` in Fetch or `withCredentials: true` in Axios). Access tokens expire after 15 minutes by default; refresh tokens rotate on every use. A reused refresh token revokes that user's active token family.

For cross-site production frontend/backend hosts, use HTTPS and leave `COOKIE_SECURE=true`. Set `CLIENT_URL` to the exact allowed frontend origin. Multiple origins can be comma-separated.

## Endpoints

### Auth

| Method | Path | Access |
|---|---|---|
| POST | `/auth/register` | Public |
| POST | `/auth/login` | Public |
| POST | `/auth/refresh` | Refresh cookie |
| POST | `/auth/logout` | Public / cookie |
| GET | `/auth/me` | Authenticated |

### Categories and products

| Method | Path | Access |
|---|---|---|
| GET | `/categories` | Public |
| POST | `/categories` | Admin |
| PATCH/DELETE | `/categories/:id` | Admin |
| GET | `/products` | Public |
| GET | `/products/:idOrSlug` | Public |
| POST | `/products` | Admin |
| PATCH/DELETE | `/products/:id` | Admin |

Product list query parameters: `page`, `limit` (max 100), `search`, `category`, `minPrice`, `maxPrice`, and `sort` (`newest`, `price_asc`, `price_desc`, or `name`).

Create/update products as `multipart/form-data`; image fields are named `images` (up to 8 files, 5 MB each). On update, `removeImagePublicIds` may contain a JSON array of Cloudinary public IDs.

### Orders and payments

| Method | Path | Access |
|---|---|---|
| POST | `/orders` | Customer/Admin |
| GET | `/orders/mine` | Authenticated |
| GET | `/orders/:id` | Owner/Admin |
| POST | `/orders/:id/cancel` | Owner, pending/unpaid only |
| GET | `/orders` | Admin |
| PATCH | `/orders/:id/status` | Admin |
| POST | `/payments/checkout-session` | Order owner |
| POST | `/payments/webhook` | Stripe signature |

The client submits product IDs and quantities, but prices are always read from MongoDB. Creating an order reserves inventory in a transaction. An unstarted reservation is automatically released after 35 minutes. Once Checkout begins, Stripe's `checkout.session.expired` webhook releases it. Valid fulfillment transitions are:

`pending → processing → shipped → delivered`, with cancellation permitted before shipping. A paid webhook automatically moves the order to `processing`.

Example order body:

```json
{
  "items": [
    { "product": "64f000000000000000000001", "quantity": 2 }
  ],
  "shippingAddress": {
    "name": "Ada Lovelace",
    "line1": "12 Example Street",
    "city": "Cairo",
    "postalCode": "11511",
    "country": "EG",
    "phone": "+201000000000"
  }
}
```

### Admin

| Method | Path | Access |
|---|---|---|
| GET | `/admin/stats` | Admin |
| GET | `/admin/users` | Admin |
| PATCH | `/admin/users/:id` | Admin |

## Stripe local testing

```bash
stripe login
stripe listen --forward-to localhost:5000/api/v1/payments/webhook
```

Copy the printed `whsec_...` value into `STRIPE_WEBHOOK_SECRET`, restart the API, and use Stripe's test card `4242 4242 4242 4242` with any future expiry/CVC. The webhook route intentionally receives the raw body before the global JSON parser.

## Deployment notes

- Railway: configure all `.env.example` values as service variables and use `npm start` from the `server` directory.
- Use MongoDB Atlas (transactions require a replica set), not an ephemeral local Railway filesystem.
- Set `CLIENT_URL` to the Vercel URL and register the Railway webhook URL in Stripe test mode.
- Cloudinary and Stripe secrets must remain backend-only.
- Use strong random JWT secrets (for example, `openssl rand -base64 48`).

## Verification

```bash
npm test
npm run check
```

`npm install` currently reports zero known vulnerabilities. Full integration tests require test MongoDB/Stripe fixtures and are the next recommended addition.
