# Nook — Full-Stack E-Commerce

A complete e-commerce API and responsive dashboard/storefront.

## Stack

- **API:** Node.js, Express, MongoDB, Mongoose
- **Web:** React, TypeScript, Redux Toolkit, Tailwind CSS, Vite
- **Auth:** JWT access tokens and rotating refresh-token cookies
- **Payments:** Stripe Checkout and verified webhooks
- **Images:** Cloudinary

## Projects

- [`server/`](server/) — authentication, catalog, orders, inventory, payments, and admin API
- [`client/`](client/) — customer storefront, cart/checkout, order history, and admin dashboard

## Local development

### 1. API

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

The API defaults to `http://localhost:5000/api/v1`. MongoDB must support transactions; MongoDB Atlas is recommended.

### 2. Web app

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

The app defaults to `http://localhost:5173`. Ensure the server's `CLIENT_URL` matches it.

### 3. Demo data

```bash
cd server
npm run seed
```

This adds sample categories, products, customers, and orders. Sign in with `admin@nook.test` / `Admin123!` or `maya@nook.test` / `Customer123!`.

To create a separate administrator:

```bash
npm run create-admin -- "Store Admin" admin@example.com "secure-password"
```

See each project's README for endpoint, Stripe, Cloudinary, and deployment details.
