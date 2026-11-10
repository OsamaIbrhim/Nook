import type { Product, ShopConfig } from '../../shared/contract/types'
import { siteName } from '../../shared/seo/siteUrl'

type Input = { product: Product; policy: ShopConfig; siteUrl: string; description: string; imageUrls: string[] }

export function productJsonLd({ product, policy, siteUrl, description, imageUrls }: Input): Record<string, unknown>[] {
  const url = `${siteUrl}/products/${product.slug}`
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      '@id': `${url}#product`,
      name: product.name,
      description,
      image: imageUrls,
      sku: product.sku,
      brand: { '@type': 'Brand', name: product.brand || siteName },
      material: product.material,
      category: product.category.name,
      url,
      offers: {
        '@type': 'Offer',
        url,
        price: product.price.toFixed(2),
        priceCurrency: policy.currency.toUpperCase(),
        availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
        seller: { '@type': 'Organization', name: siteName },
        hasMerchantReturnPolicy: {
          '@type': 'MerchantReturnPolicy',
          applicableCountry: policy.shipsTo,
          returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
          merchantReturnDays: policy.returnWindowDays,
          returnMethod: 'https://schema.org/ReturnByMail'
        },
        shippingDetails: {
          '@type': 'OfferShippingDetails',
          shippingDestination: { '@type': 'DefinedRegion', addressCountry: policy.shipsTo },
          deliveryTime: {
            '@type': 'ShippingDeliveryTime',
            handlingTime: {
              '@type': 'QuantitativeValue',
              minValue: policy.dispatchDaysMin,
              maxValue: policy.dispatchDaysMax,
              unitCode: 'DAY'
            }
          }
        }
      }
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
        {
          '@type': 'ListItem',
          position: 2,
          name: product.category.name,
          item: `${siteUrl}/products?category=${product.category.slug}`
        },
        { '@type': 'ListItem', position: 3, name: product.name, item: url }
      ]
    }
  ]
}
