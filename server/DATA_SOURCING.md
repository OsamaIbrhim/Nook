# Product Data Sourcing Policy

## What is in the demo database

The Nook seed catalog contains original product names, descriptions, benefit copy, specifications, SKUs, SEO fields, and original/appropriately sourced imagery. It is designed to demonstrate the store without representing third-party marketplace listings as inventory Nook owns.

Run:

```bash
npm run seed
```

The command is repeatable and only replaces records attached to the documented demo users.

## Why the project does not scrape major marketplaces

Amazon, eBay, Etsy, and other large marketplaces provide official APIs with authentication, usage, attribution, caching, and display requirements. Copying listings, descriptions, reviews, prices, and images into an unrelated merchant database can violate marketplace terms, copyright, seller rights, and consumer expectations. It can also create products that Nook takes payment for but cannot fulfill.

For a production catalog, use one of these approved paths:

1. Import products that Nook owns from its inventory/PIM export.
2. Connect to an authorized supplier feed with resale rights.
3. Use official marketplace APIs only for the use case permitted by that provider (for example, an attributed affiliate experience rather than Nook checkout).
4. Store source IDs and refresh time-sensitive price and availability according to provider rules.

## Official integration candidates

- **eBay Browse API:** Search and retrieve listing details through OAuth. Best for an explicitly attributed eBay buying experience.
- **Etsy Open API v3:** Access listing/shop data with an Etsy application key and OAuth where required.
- **Amazon Creators API:** Use through the Amazon Associates program and comply with content display/cache requirements. Do not bulk-copy program content into Nook-owned inventory.

Credentials were not present in this workspace, so no external marketplace account was accessed and no third-party proprietary catalog was copied.

## Required production fields

Every sellable Nook product should include:

- Merchant-owned SKU
- Original name and benefit-led description
- Price, currency, inventory, and category
- Brand, material, dimensions, and care instructions
- At least three accurate product images with rights to publish
- Descriptive image alt text
- SEO title and meta description
- Shipping and return eligibility
- GTIN/MPN only when legitimately assigned

Never invent reviews, GTINs, scarcity, seller relationships, certifications, or customer photos.
