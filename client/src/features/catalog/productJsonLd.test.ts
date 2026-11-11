import { describe, expect, it } from 'vitest'
import type { Product, ShopConfig } from '../../shared/contract/types'
import { productJsonLd } from './productJsonLd'

const policy: ShopConfig = {
  currency: 'egp',
  locale: 'en-US',
  freeShippingThreshold: 200,
  flatShippingRate: 50,
  returnWindowDays: 30,
  dispatchDaysMin: 1,
  dispatchDaysMax: 2,
  maxLineQuantity: 99,
  reservationMinutes: 35,
  supportEmail: 'hello@nook.store',
  shipsTo: ['EG']
}
const product: Product = {
  _id: 'a'.repeat(24),
  name: 'Ripple Ceramic Mug',
  slug: 'ripple-ceramic-mug',
  description: 'A mug.',
  sku: 'MUG-1',
  material: 'Stoneware',
  price: 24,
  stock: 5,
  category: { _id: 'b'.repeat(24), name: 'Home', slug: 'home' },
  images: [],
  isActive: true,
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-01T10:00:00.000Z'
}
const input = {
  product,
  policy,
  siteUrl: 'https://shop.example.test',
  description: 'A hand-finished mug.',
  imageUrls: ['https://shop.example.test/products/mug.jpg']
}

const [productNode, breadcrumb] = productJsonLd(input) as [Record<string, any>, Record<string, any>]

describe('productJsonLd', () => {
  it('prices the offer in the shop currency, upper-case, with two decimals: 24 becomes "24.00" EGP', () => {
    expect(productNode.offers.price).toBe('24.00')
    expect(productNode.offers.priceCurrency).toBe('EGP')
  })

  it('follows a different currency from the policy', () => {
    const [usd] = productJsonLd({ ...input, policy: { ...policy, currency: 'usd' } }) as [Record<string, any>]
    expect(usd.offers.priceCurrency).toBe('USD')
  })

  it('states the return window and handling time from the policy: 30 days, 1 to 2 days', () => {
    expect(productNode.offers.hasMerchantReturnPolicy.merchantReturnDays).toBe(30)
    const handling = productNode.offers.shippingDetails.deliveryTime.handlingTime
    expect([handling.minValue, handling.maxValue]).toEqual([1, 2])
    const other = (
      productJsonLd({
        ...input,
        policy: { ...policy, returnWindowDays: 14, dispatchDaysMin: 3, dispatchDaysMax: 4 }
      }) as [Record<string, any>]
    )[0]
    expect(other.offers.hasMerchantReturnPolicy.merchantReturnDays).toBe(14)
    expect(other.offers.shippingDetails.deliveryTime.handlingTime).toMatchObject({ minValue: 3, maxValue: 4 })
  })

  it('claims no transit time, because the shop policy does not publish one', () => {
    expect(productNode.offers.shippingDetails.deliveryTime.transitTime).toBeUndefined()
  })

  it('applies the return policy and delivery to the countries the shop ships to', () => {
    expect(productNode.offers.hasMerchantReturnPolicy.applicableCountry).toEqual(['EG'])
    expect(productNode.offers.shippingDetails.shippingDestination.addressCountry).toEqual(['EG'])
    const [two] = productJsonLd({ ...input, policy: { ...policy, shipsTo: ['EG', 'SA'] } }) as [Record<string, any>]
    expect(two.offers.hasMerchantReturnPolicy.applicableCountry).toEqual(['EG', 'SA'])
  })

  it('reports availability from stock: in stock at 5, out of stock at 0', () => {
    expect(productNode.offers.availability).toBe('https://schema.org/InStock')
    const [soldOut] = productJsonLd({ ...input, product: { ...product, stock: 0 } }) as [Record<string, any>]
    expect(soldOut.offers.availability).toBe('https://schema.org/OutOfStock')
  })

  it('identifies the product by its absolute URL and carries name, description, images, sku and category', () => {
    expect(productNode['@id']).toBe('https://shop.example.test/products/ripple-ceramic-mug#product')
    expect(productNode.url).toBe('https://shop.example.test/products/ripple-ceramic-mug')
    expect(productNode).toMatchObject({
      name: 'Ripple Ceramic Mug',
      description: 'A hand-finished mug.',
      image: ['https://shop.example.test/products/mug.jpg'],
      sku: 'MUG-1',
      category: 'Home',
      brand: { name: 'Nook Objects' }
    })
  })

  it('adds a breadcrumb Home > category > product with absolute URLs', () => {
    expect(breadcrumb['@type']).toBe('BreadcrumbList')
    expect(breadcrumb.itemListElement.map((entry: any) => [entry.position, entry.name, entry.item])).toEqual([
      [1, 'Home', 'https://shop.example.test'],
      [2, 'Home', 'https://shop.example.test/products?category=home'],
      [3, 'Ripple Ceramic Mug', 'https://shop.example.test/products/ripple-ceramic-mug']
    ])
  })
})
