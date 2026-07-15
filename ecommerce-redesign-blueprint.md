# Nook E-Commerce Redesign Blueprint

## Project Variables

- **Niche/Product:** Curated premium objects for the home, kitchen, workspace, and personal-wellness rituals.
- **Target Audience:** Design-conscious urban professionals, renters, and homeowners aged 25–45 who value aesthetics but do not have time to search through generic marketplaces.
- **Primary Customer Pain Point:** Marketplace overload—too many interchangeable products, uncertain quality, and difficulty finding objects that are both useful and visually distinctive.
- **Brand Identity & Tone:** Immersive, editorial, confident, tactile, and intelligent. Gallery-level taste without gallery-level intimidation.
- **Core commercial promise:** **“Fewer, better objects—already selected for how beautifully they work and live.”**

## CEO-Level Funnel Strategy

Nook should not sell “products.” It should sell relief from three problems:

1. **Decision fatigue:** The customer should never compare 200 versions of the same object.
2. **Quality uncertainty:** Materials, dimensions, care, delivery, and returns must be immediately verifiable.
3. **Aesthetic risk:** Every product should be shown in a real context so the customer can confidently imagine it at home.

The Three.js experience should create desire, not become an obstacle. Use WebGL for the homepage hero, selected product storytelling, and optional PDP interaction. Product discovery, pricing, cart access, and checkout must remain standard HTML and immediately usable.

---

# A. The Strict 7-Section Homepage Blueprint

## 1. Conversion Header and Navigation

### Goal

Give every visitor an immediate path to products, search, account, and cart without forcing them to understand the brand first.

### Exact copy

- **Announcement:** “Complimentary delivery on orders over $100 — 30-day returns.”
- **Primary navigation:** “New Objects” · “Home” · “Kitchen” · “Workspace” · “Wellness”
- **Search placeholder:** “What are you looking for?”
- **Utility labels:** “Search” · “Account” · “Bag (0)”
- **Mobile menu CTA:** “Explore the Collection”

### UI/UX visual cues

- Use a two-level header: a 28–32px announcement strip and a 64–72px navigation row.
- Keep the logo left, commercial navigation centered, and search/account/cart right.
- Make the cart visually persistent and show item count without opening it.
- On mobile, keep logo, search, and bag visible; move category links into a full-screen menu.
- Header becomes solid after the first 80px of scroll so it remains readable above WebGL content.
- Search must open instantly and return product thumbnails, names, categories, prices, and recent searches.
- Minimum mobile touch target: 44×44px.

### Psychological purpose

**Orientation and control.** The customer immediately understands that this is a store—not just a creative portfolio.

---

## 2. Outcome-Driven Three.js Hero

### Goal

Create immediate desire while explaining, in under five seconds, why Nook is better than a large marketplace.

### Exact copy

- **Eyebrow:** “CURATED FOR REAL LIFE”
- **H1:** “Stop searching. Start living with better objects.”
- **H2:** “Useful, distinctive pieces selected for how they feel, function, and transform your everyday space.”
- **Primary CTA:** “Shop the Collection”
- **Secondary CTA:** “Why Nook Chooses Better”
- **Microcopy below CTA:** “Small collection. Clear materials. Straightforward returns.”

### UI/UX visual cues

- Build a full-viewport editorial hero with left-aligned copy and one interactive Three.js product sculpture on the right.
- The 3D object should respond subtly to pointer movement and scroll; it must not spin continuously at high speed.
- Keep the H1 readable in ordinary HTML above the canvas. Never render essential copy inside WebGL.
- Desktop H1: 72–120px; mobile H1: 44–58px; maximum 10–12 words visible before the line break.
- Primary CTA uses the highest-contrast brand color. Secondary CTA is text-based to preserve hierarchy.
- Load a compressed poster image first, then progressively activate Three.js.
- Respect `prefers-reduced-motion`, cap DPR, lazy-load 3D dependencies, and provide a static fallback.

### Psychological purpose

**Problem recognition → desired outcome.** The visitor sees that Nook removes choice overload and makes confident taste easier.

---

## 3. Trust and Verification Strip

### Goal

Resolve the silent questions that block a first purchase: “Is this legitimate?”, “Will the object match the images?”, and “Can I return it?”

### Exact copy

- **H2:** “Good taste should come with proof.”
- **Trust point 1:** “Materials, dimensions, and care—shown clearly.”
- **Trust point 2:** “Photographed in real spaces, not hidden behind renders.”
- **Trust point 3:** “30 days to decide at home.”
- **Trust point 4:** “Secure checkout powered by Stripe.”
- **CTA:** “Read Our Buying Standard”

### UI/UX visual cues

- Use four horizontally aligned proof cards on desktop and a swipeable, snap-aligned row on mobile.
- Pair each claim with a simple verification icon, not decorative badges.
- Add direct links from each statement to materials, photography methodology, return policy, and payment information.
- Avoid vague claims such as “premium quality.” Name the evidence.
- Keep this section compact and visible immediately after the hero.

### Psychological purpose

**Risk reversal.** Turn visual interest into credible purchase confidence.

> These promises must be operationally true before publishing. If the actual return window or shipping threshold differs, replace the numbers everywhere consistently.

---

## 4. Category Routing by Customer Intent

### Goal

Help customers self-select by the moment they want to improve rather than forcing them to understand internal catalog taxonomy.

### Exact copy

- **Eyebrow:** “SHOP BY RITUAL”
- **H2:** “What should feel better today?”
- **Category 1:** “Make home feel considered.” / CTA: “Shop Home”
- **Category 2:** “Make gathering feel effortless.” / CTA: “Shop Kitchen”
- **Category 3:** “Make focus feel natural.” / CTA: “Shop Workspace”
- **Category 4:** “Make slowing down easier.” / CTA: “Shop Wellness”

### UI/UX visual cues

- Use four large editorial panels with context photography or lightweight hover-reactive 3D compositions.
- Show the category outcome first and category name second.
- Display product count only when useful; do not use counts that make the assortment feel thin.
- On mobile, stack cards vertically with a 4:3 image ratio and place the CTA in the lower thumb zone.
- The entire panel should be clickable, not just the text link.
- Preserve category and scroll state when customers return from a PDP.

### Psychological purpose

**Reduced cognitive load.** Convert “I want my space to feel better” into a clear shopping route.

---

## 5. Pain-Point Resolution and Featured Product

### Goal

Demonstrate the Nook selection standard through one commercially important product rather than making unsupported brand claims.

### Exact copy

- **Eyebrow:** “ONE OBJECT. THREE PROBLEMS SOLVED.”
- **H2:** “A desk tray that clears the surface—and your head.”
- **Body copy:** “No more loose cables, scattered notes, or keys that disappear when you need them. Solid oak gives everyday clutter one deliberate place while aging beautifully with use.”
- **Benefit 1:** “Everything visible. Nothing scattered.”
- **Benefit 2:** “Solid oak, not plastic made to imitate it.”
- **Benefit 3:** “Sized for small desks and shared spaces.”
- **Price line:** “Oak Desk Tray — $42”
- **Primary CTA:** “Add to Bag — $42”
- **Secondary CTA:** “See Materials & Dimensions”
- **Reassurance:** “In stock · Dispatches in 1–2 business days”

### UI/UX visual cues

- Use a 55/45 split: immersive product media left, purchase information right.
- Provide a draggable Three.js product view only after the primary image loads.
- Use numbered hotspots to reveal storage, finish, scale, and material benefits.
- Keep price, stock, and CTA in ordinary DOM content and visible without interacting with the 3D model.
- On mobile, order content as: image → outcome headline → benefits → price → add-to-cart.
- Clicking “Add to Bag” should open a fast mini-cart, not send the customer to a new page.

### Psychological purpose

**Mechanism and proof.** Show exactly how a selected object solves an everyday frustration.

---

## 6. Verified Social Proof and Real-Space Validation

### Goal

Reduce aesthetic and quality uncertainty by showing the objects in customers’ actual homes and workspaces.

### Exact copy

- **Eyebrow:** “LIVED WITH, NOT JUST LOOKED AT”
- **H2:** “Better in real life.”
- **Featured review:** “It looked beautiful online, but the reason I kept it is how much calmer my desk feels. Everything finally has a place.”
- **Attribution:** “Maya H. · Verified buyer · Oak Desk Tray”
- **Supporting proof:** “4.8 average from verified buyers”
- **CTA:** “See Customer Spaces”
- **UGC prompt:** “Living with Nook? Tag @nook.objects”

### UI/UX visual cues

- Combine verified reviews with customer-uploaded photos in an asymmetric editorial grid.
- Place star rating, review count, product purchased, and verified-buyer label together.
- Never hide negative reviews. Provide filters for rating, product, and “with photos.”
- Use real customer imagery with permission; do not disguise generated imagery as UGC.
- On mobile, show one complete review at a time rather than clipping three partial cards.

### Psychological purpose

**Social validation and visual certainty.** Customers can see that the product works outside the campaign shoot.

---

## 7. Final Conversion Gateway and Footer

### Goal

Capture visitors who reached the bottom but have not selected a product, while preserving access to policies and support.

### Exact copy

- **H2:** “Your space does not need more. It needs better.”
- **Supporting copy:** “Start with one object that removes friction, earns its place, and feels good to live with.”
- **Primary CTA:** “Find Your First Nook Object”
- **Secondary CTA:** “Take the 60-Second Edit”
- **Email headline:** “A smaller, better inbox.”
- **Email copy:** “New objects, material stories, and useful-space ideas. Sent occasionally.”
- **Email CTA:** “Join the Edit”
- **Footer links:** “Shipping” · “Returns” · “Materials & Care” · “Contact” · “Order Tracking” · “Privacy” · “Terms” · “Accessibility”

### UI/UX visual cues

- Use a bold, high-contrast closing panel with one dominant CTA.
- “Take the 60-Second Edit” launches a short product-finder quiz with no email gate.
- Keep newsletter capture secondary to the purchase CTA.
- Footer text must remain readable; do not use tiny low-contrast typography for policies.
- Include payment methods, contact response expectations, country/currency control, and accessibility statement.
- On mobile, use collapsible footer groups but keep shipping, returns, and contact visible.

### Psychological purpose

**Commitment and recovery.** Give undecided visitors one final, low-friction path toward a relevant product.

---

# B. The Ultimate Product Detail Page (PDP)

## Above-the-Fold Desktop Layout

Use a **58/42 two-column grid** within a 1440px maximum container.

### Left: Product media

1. One large primary image with a 4:5 or 1:1 ratio.
2. Vertical thumbnail rail for context, detail, scale, video, and optional 3D view.
3. Minimum recommended media set:
   - Clean front view
   - Alternate angle
   - Material close-up
   - Product in a real room
   - Human/hand scale reference
   - Dimensions graphic
   - 6–12 second muted product video
4. Use responsive AVIF/WebP sources, explicit dimensions, blur placeholders, and zoom that works with keyboard and touch.
5. Label the 3D control **“Explore in 3D”**. Do not replace essential photography with a model.

### Right: Purchase panel hierarchy

Display information in this exact order:

1. **Breadcrumb:** “Workspace / Organization”
2. **Verified rating link:** “★★★★★ 4.8 · 126 verified reviews”
3. **Product name:** “Oak Desk Tray”
4. **Outcome line:** “Clear the surface. Keep the essentials within reach.”
5. **Price:** “$42”
6. **Payment reassurance:** “Secure checkout. No hidden fees.”
7. **Benefit bullets:**
   - “Gives cables, pens, keys, and notes one visible home.”
   - “Solid oak develops character instead of wearing out.”
   - “Compact footprint preserves your usable desk space.”
8. **Finish selector:** Show visual swatches with text labels; never communicate selection using color alone.
9. **Stock and delivery:** “In stock · Order today for dispatch by Friday.”
10. **Primary CTA:** “Add to Bag — $42”
11. **Accelerated checkout:** “Buy Now” or platform wallet buttons, visually secondary to Add to Bag.
12. **Risk reversal:** “30-day returns · Secure Stripe checkout · Materials verified”
13. **Expandable details:** “Dimensions” · “Materials & Care” · “Delivery & Returns” · “Why Nook Selected It”

## Mobile PDP Sequence

1. Compact sticky header with back, product name, and bag.
2. Swipeable image gallery with visible `1 / 6` counter.
3. Rating and verified-review link.
4. Product name, outcome line, and price.
5. Variant/finish selection.
6. Three benefit bullets.
7. Delivery estimate and stock state.
8. Full-width Add-to-Bag button.
9. Details accordions.
10. Reviews and related products.

Do not place a long product description before price and CTA.

## Sticky Add-to-Cart Behavior

### Mobile

- Show the sticky bar after the main CTA scrolls out of view.
- Bar height: 64–72px plus safe-area inset.
- Left side: abbreviated product name and price.
- Right side: high-contrast button reading **“Add — $42.”**
- Preserve the selected finish and quantity.
- Hide the bar when the keyboard, cart drawer, or checkout is open.
- Show an inline validation message if a required option has not been selected.

### Desktop

- Keep the purchase panel sticky within its column until the media gallery ends.
- Do not add a second floating CTA while the original button remains visible.

## Ethical Urgency Strategy

Use urgency only when it is based on real inventory or delivery data.

### Approved copy

- “Only 4 left in this finish.”
- “Order within 3h 12m for Friday dispatch.”
- “Next small-batch release: August 12.”
- “18 people saved this object this week.” — only if based on actual unique-user data.

### Do not use

- Resetting countdown timers
- Invented viewer counts
- Permanent “limited time” discounts
- Fake low-stock labels
- Preselected paid add-ons

False urgency may create a short-term lift but damages repeat purchase rate, trust, and brand equity.

## Review Placement and Structure

- Place the aggregate rating directly above the title.
- Make it an anchor link to the full review section.
- Add one concise review excerpt below the trust row when sufficient verified reviews exist.
- Review section filters: “Most helpful,” “Newest,” rating, “With photos,” and selected finish.
- Show review distribution, verified status, date, product option, and merchant response.
- Ask post-purchase questions that generate useful proof: room size, use case, finish selected, and photo.

## Add-to-Cart Interaction

On success:

1. Change the button label briefly to **“Added to Bag ✓.”**
2. Open a mini-cart without navigating away.
3. Show product, selected option, quantity, subtotal, and delivery threshold progress.
4. Primary mini-cart CTA: **“Secure Checkout.”**
5. Secondary action: **“Keep Exploring.”**
6. Never add unrelated items automatically.

---

# Frictionless Frontend Principles

## Mobile-first interaction

- 44×44px minimum touch targets; 48px preferred for primary actions.
- Keep important actions in the lower two-thirds of the screen.
- Never place two equal-weight primary CTAs beside each other on a narrow screen.
- Avoid horizontal scrolling except intentional, snap-aligned media galleries.
- Preserve cart, filters, and scroll position across navigation.

## Speed and Three.js governance

- Target LCP under 2.5 seconds, INP under 200ms, and CLS under 0.1 at the 75th percentile.
- Render all commercial copy, pricing, and CTAs in semantic HTML.
- Lazy-load Three.js after the hero poster and critical text.
- Use compressed GLB/GLTF with Draco or Meshopt, KTX2 textures, capped DPR, and adaptive quality.
- Pause rendering when the canvas leaves the viewport or the tab becomes hidden.
- Disable nonessential 3D on low-power devices, data-saver mode, and reduced-motion mode.
- The store must remain completely purchasable if WebGL fails.

## Reduced cognitive load

- One primary action per viewport.
- Benefit-first copy followed by material evidence.
- Maximum four top-level shopping categories.
- Filters open in a mobile bottom sheet with visible result count and “Clear all.”
- Use plain labels: “Bag,” “Returns,” and “Dimensions,” not invented terminology.

## Accessibility and confidence

- WCAG 2.2 AA contrast and keyboard access.
- Visible focus treatment and skip-to-content link.
- Alt text should describe product, finish, angle, and context.
- Announce cart updates with an ARIA live region.
- Do not autoplay sound or high-motion video.
- Keep policy text, stock messages, and errors specific and readable.

---

# CRO Measurement Plan

## Primary commercial metrics

- Product-view → Add-to-Cart rate
- Add-to-Cart → Checkout-start rate
- Checkout completion rate
- Revenue per session
- Mobile conversion rate
- Return rate by product and acquisition source

## Diagnostic metrics

- Hero CTA click-through rate
- Category route selection rate
- Search usage and zero-result rate
- PDP media interaction versus conversion
- Variant-selection errors
- Sticky Add-to-Cart conversion contribution
- Core Web Vitals segmented by device

## First three controlled experiments

1. **Hero proposition:** “Stop searching…” against “Fewer, better objects for everyday life.”
2. **Featured-product CTA:** Direct Add to Bag against “Explore the Object.”
3. **PDP proof order:** Reviews above benefit line against reviews directly below benefits.

Run one meaningful hypothesis per funnel stage, define the primary metric before launch, and guard against improvements that increase returns or reduce average order value.
