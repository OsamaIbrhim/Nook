# Nook E-Commerce Dashboard

React + TypeScript + Tailwind frontend for the e-commerce API in `../server`.

## Immersive design system

The storefront uses an original editorial direction inspired by immersive creative-studio sites rather than copying any one website. The homepage now features a dynamic, art-directed product photography stage with pointer parallax, timed crossfades, accessible controls, oversized typography, staggered product editorial, and high-contrast collection navigation. It uses real catalog imagery instead of an artificial 3D object, keeping the experience premium, fast, and directly relevant to what customers can buy.

## Included

- Responsive storefront, product search/filter/sort, product details, persistent Redux cart
- Registration/login with automatic access-token refresh
- Shipping checkout flow and Stripe Checkout redirect
- Customer order history, detail timeline, and payment resume
- Protected admin dashboard with stats, products/images/categories, order status, and user management
- Skeleton loading, empty, retryable error, toast, offline, and responsive states
- Global render-error recovery, friendly API/network errors, debounced search, keyboard focus, reduced-motion support
- Mobile storefront and mobile-specific admin order/user cards with 44px touch targets
- Direction-aware fixed navigation, Lenis smooth scrolling, route scroll restoration, and a subtle reading-progress bar
- Modern borderless-focus form treatment and accessible custom category/sort menus

## Run

```bash
cp .env.example .env
npm install
npm run dev
```

Set `VITE_API_URL` to the backend `/api/v1` URL. The backend `CLIENT_URL` must match this frontend origin (usually `http://localhost:5173`).

## SEO and production readiness

- Route-level titles, descriptions, canonical URLs, robots directives, Open Graph, and Twitter cards
- Product and breadcrumb JSON-LD with live price, stock, material, shipping, and return data
- Organization and WebSite search schema on the homepage
- Generated `robots.txt` and XML sitemap; the production build adds live product URLs when the API is reachable
- Lazy route bundles and a lightweight, GPU-accelerated product-image stage without a heavy 3D runtime
- Private customer/admin routes marked `noindex`

Set `VITE_SITE_URL` to the canonical production origin. Before launch, run representative PDP URLs through Google Rich Results Test and submit `/sitemap.xml` in Google Search Console.

## Production

```bash
npm run build
```

Deploy the `client` directory to Vercel, set `VITE_API_URL` to Railway's API URL, and configure Vercel rewrites to `index.html` for SPA routes if the framework preset does not do so automatically.
