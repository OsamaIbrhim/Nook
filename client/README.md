# Nook E-Commerce Dashboard

React + TypeScript + Tailwind frontend for the e-commerce API in `../server`.

## Included

- Responsive storefront, product search/filter/sort, product details, persistent Redux cart
- Registration/login with automatic access-token refresh
- Shipping checkout flow and Stripe Checkout redirect
- Customer order history, detail timeline, and payment resume
- Protected admin dashboard with stats, products/images/categories, order status, and user management
- Skeleton loading, empty, retryable error, toast, offline, and responsive states
- Global render-error recovery, friendly API/network errors, debounced search, keyboard focus, reduced-motion support
- Mobile storefront and mobile-specific admin order/user cards with 44px touch targets

## Run

```bash
cp .env.example .env
npm install
npm run dev
```

Set `VITE_API_URL` to the backend `/api/v1` URL. The backend `CLIENT_URL` must match this frontend origin (usually `http://localhost:5173`).

## Production

```bash
npm run build
```

Deploy the `client` directory to Vercel, set `VITE_API_URL` to Railway's API URL, and configure Vercel rewrites to `index.html` for SPA routes if the framework preset does not do so automatically.
