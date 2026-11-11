import { AlertCircle, Minus, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { Link, useParams } from 'react-router-dom'
import { errorMessage } from '../../../shared/http/errors'
import { absoluteMediaUrl, mediaUrl } from '../../../shared/media/imageUrl'
import { Seo } from '../../../shared/seo/Seo'
import { siteUrl } from '../../../shared/seo/siteUrl'
import { PageError } from '../../../shared/ui/PageError'
import { productGridClass } from '../../../shared/ui/Skeletons'
import { addLine } from '../../cart'
import { dispatchCopy, returnsCopy, useMoney, usePolicy } from '../../policy'
import { useGetProductQuery, useListProductsQuery } from '../api'
import { ProductCard } from '../components/ProductCard'
import { productJsonLd } from '../productJsonLd'

const LOW_STOCK = 4
const ADDED_FEEDBACK_MS = 1600
const stepButton = 'grid size-11 place-items-center disabled:opacity-45'
const disclosure = 'group border-b border-line py-4'
const disclosureSummary =
  'flex cursor-pointer list-none items-center justify-between text-eyebrow font-medium uppercase [&::-webkit-details-marker]:hidden'

function ProductSkeleton() {
  return (
    <div aria-label="Loading product" className="container-app grid gap-8 py-10 lg:grid-cols-12">
      <div className="plate aspect-[4/5] lg:col-span-7" />
      <div className="space-y-4 lg:col-span-4 lg:col-start-9">
        <div className="h-3 w-1/3 bg-paper-sunken" />
        <div className="h-14 w-4/5 bg-paper-sunken" />
        <div className="h-6 w-1/4 bg-paper-sunken" />
        <div className="h-12 w-full bg-paper-sunken" />
      </div>
    </div>
  )
}

export function ProductDetailPage() {
  const money = useMoney()
  const policy = usePolicy()
  const dispatch = useDispatch()
  const { slug = '' } = useParams()
  const { data: product, error, refetch } = useGetProductQuery(slug)
  const { data: related } = useListProductsQuery(
    product ? { category: product.category.slug, exclude: product._id, limit: 4 } : {},
    { skip: !product }
  )
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    if (!added) return
    const timer = window.setTimeout(() => setAdded(false), ADDED_FEEDBACK_MS)
    return () => window.clearTimeout(timer)
  }, [added])

  if (error)
    return (
      <div className="container-app py-16">
        <PageError message={errorMessage(error)} retry={refetch} />
      </div>
    )
  if (!product) return <ProductSkeleton />

  const path = `/products/${product.slug}`
  const description = product.seo?.description || product.shortDescription || product.description.slice(0, 165)
  const soldOut = product.stock <= 0
  const onSale = Boolean(product.compareAtPrice && product.compareAtPrice > product.price)
  const maxQuantity = Math.min(product.stock, policy?.maxLineQuantity ?? product.stock)
  const details = [product.material, product.dimensions].filter(Boolean).join(' · ')
  const sections = [
    ['Details', details],
    ['Care', product.care],
    [
      'Delivery and returns',
      policy
        ? [
            `Dispatches in ${dispatchCopy(policy.dispatchDaysMin, policy.dispatchDaysMax)}.`,
            policy.freeShippingThreshold === null
              ? `Delivery ${money(policy.flatShippingRate)}.`
              : `Delivery ${money(policy.flatShippingRate)}, free from ${money(policy.freeShippingThreshold)}.`,
            returnsCopy(policy.returnWindowDays) && `${returnsCopy(policy.returnWindowDays)}.`
          ]
            .filter(Boolean)
            .join(' ')
        : ''
    ],
    ['Why we chose it', product.description]
  ].filter((section): section is [string, string] => Boolean(section[1]))

  const add = () => {
    dispatch(addLine({ productId: product._id, quantity }))
    setAdded(true)
  }

  return (
    <>
      <Seo
        page="product"
        title={product.seo?.title || product.name}
        description={description}
        path={path}
        image={absoluteMediaUrl(product.images[0]?.url)}
        jsonLd={
          policy
            ? productJsonLd({
                product,
                policy,
                siteUrl,
                description,
                imageUrls: product.images.map((image) => absoluteMediaUrl(image.url))
              })
            : undefined
        }
      />
      <div className="container-app pb-(--section-gap) pt-6">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-caption text-ink-muted">
          <Link to="/products" className="link-text">
            Collection
          </Link>
          <span aria-hidden="true">/</span>
          <Link to={`/products?category=${product.category.slug}`} className="link-text">
            {product.category.name}
          </Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{product.name}</span>
        </nav>

        <div className="mt-6 grid gap-8 lg:grid-cols-12">
          <div className="flex flex-col gap-(--grid-gap) lg:col-span-7">
            {product.images.length ? (
              product.images.map((image, index) => (
                <div key={image.url} className="plate aspect-[4/5]">
                  <img
                    src={mediaUrl(image.url)}
                    alt={image.alt || product.name}
                    width={1024}
                    height={1280}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    fetchPriority={index === 0 ? 'high' : 'auto'}
                    decoding="async"
                    className="h-full w-full object-cover object-[50%_55%]"
                  />
                </div>
              ))
            ) : (
              <p className="plate grid aspect-[4/5] place-items-center text-caption text-ink-subtle">
                Image coming soon
              </p>
            )}
          </div>

          <section className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:col-span-4 lg:col-start-9 lg:self-start">
            <p className="eyebrow">{[product.category.name, product.sku].filter(Boolean).join(' / ')}</p>
            <h1 className="mt-3 text-h1 tracking-[-0.015em]">{product.name}</h1>
            <p className="mt-5 flex items-baseline gap-3 text-title tabular-nums">
              {onSale && product.compareAtPrice && (
                <s className="text-base text-ink-subtle">{money(product.compareAtPrice)}</s>
              )}
              <span className={onSale ? 'text-accent' : ''}>{money(product.price)}</span>
              {onSale && <span className="text-eyebrow font-medium uppercase text-accent">Sale</span>}
            </p>
            {product.shortDescription && (
              <p className="mt-5 max-w-[62ch] text-lead text-ink-muted">{product.shortDescription}</p>
            )}
            {!!product.benefits?.length && (
              <ul className="mt-5 space-y-2 text-ink-muted">
                {product.benefits.slice(0, 3).map((benefit) => (
                  <li key={benefit} className="flex gap-3">
                    <span aria-hidden="true">—</span>
                    {benefit}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-8 flex gap-3">
              <div className="flex items-center border border-line-strong">
                <button
                  type="button"
                  className={stepButton}
                  onClick={() => setQuantity((value) => value - 1)}
                  disabled={soldOut || quantity <= 1}
                  aria-label="Decrease quantity"
                >
                  <Minus size={16} strokeWidth={1.5} />
                </button>
                <span className="w-8 text-center tabular-nums" aria-live="polite" aria-label={`Quantity ${quantity}`}>
                  {quantity}
                </span>
                <button
                  type="button"
                  className={stepButton}
                  onClick={() => setQuantity((value) => value + 1)}
                  disabled={soldOut || quantity >= maxQuantity}
                  aria-label="Increase quantity"
                >
                  <Plus size={16} strokeWidth={1.5} />
                </button>
              </div>
              <button type="button" onClick={add} disabled={soldOut} className="btn-primary flex-1">
                <span aria-live="polite">
                  {soldOut ? 'Sold out' : added ? 'Added' : `Add to bag, ${money(product.price * quantity)}`}
                </span>
              </button>
            </div>

            <p className="mt-4 text-sm text-ink-muted">
              {soldOut ? (
                'This object is currently unavailable.'
              ) : product.stock <= LOW_STOCK ? (
                <span className="flex items-center gap-2 text-accent">
                  <AlertCircle size={16} strokeWidth={1.5} aria-hidden="true" />
                  Only {product.stock} left
                </span>
              ) : policy ? (
                `In stock. Dispatches in ${dispatchCopy(policy.dispatchDaysMin, policy.dispatchDaysMax)}.`
              ) : (
                'In stock.'
              )}
            </p>
            {added && (
              <p className="mt-3 text-sm">
                <Link to="/cart" className="link-text">
                  View your bag
                </Link>
              </p>
            )}

            <div className="mt-8 border-t border-line">
              {sections.map(([title, content]) => (
                <details key={title} name="product-details" className={disclosure}>
                  <summary className={disclosureSummary}>
                    {title}
                    <Plus
                      size={16}
                      strokeWidth={1.5}
                      aria-hidden="true"
                      className="transition-transform duration-(--dur-base) group-open:rotate-45"
                    />
                  </summary>
                  <p className="max-w-[62ch] pt-4 text-sm text-ink-muted">{content}</p>
                </details>
              ))}
            </div>
          </section>
        </div>

        {!!related?.products.length && (
          <section aria-labelledby="related-title" className="pt-(--section-gap)">
            <h2 id="related-title" className="text-h2 tracking-[-0.01em]">
              More from {product.category.name}
            </h2>
            <div className={`${productGridClass} mt-10`}>
              {related.products.map((entry) => (
                <ProductCard key={entry._id} product={entry} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  )
}
