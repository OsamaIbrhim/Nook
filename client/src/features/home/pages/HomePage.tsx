import { Link } from 'react-router-dom'
import { mediaUrl } from '../../../shared/media/imageUrl'
import { Seo } from '../../../shared/seo/Seo'
import { siteName, siteUrl } from '../../../shared/seo/siteUrl'
import { ProductGridSkeleton } from '../../../shared/ui/Skeletons'
import { ProductCard, useListCategoriesQuery, useListProductsQuery } from '../../catalog'
import { useMoney, usePolicy } from '../../policy'

const homeSchema = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${siteUrl}/#organization`,
    name: siteName,
    url: siteUrl,
    logo: `${siteUrl}/favicon.svg`
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteUrl}/#website`,
    url: siteUrl,
    name: siteName,
    publisher: { '@id': `${siteUrl}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${siteUrl}/products?search={search_term_string}` },
      'query-input': 'required name=search_term_string'
    }
  }
]

const arrivalsGrid = 'grid grid-cols-2 gap-x-(--grid-gap) gap-y-10 md:grid-cols-4'

const principles = [
  ['01', 'Materials', 'Stoneware, oak, linen, brass. Each one is named on the page, so you know what you are buying.'],
  ['02', 'Makers', 'Small workshops we can name, working in batches small enough to check by hand.'],
  ['03', 'Made to last', 'If an object will not survive daily use, it does not make the collection.']
]

export function HomePage() {
  const { data, isLoading, isError, refetch } = useListProductsQuery({ limit: 4 })
  const { data: categories = [] } = useListCategoriesQuery()
  const policy = usePolicy()
  const money = useMoney()
  const products = data?.products ?? []
  const deliveryLine =
    policy && policy.freeShippingThreshold !== null
      ? `Free delivery from ${money(policy.freeShippingThreshold)}.`
      : 'Tracked delivery on every order.'

  return (
    <>
      <Seo page="home" path="/" jsonLd={homeSchema} />

      <section aria-labelledby="hero-title">
        <div className="plate h-[min(68svh,125vw)] md:h-[clamp(420px,78svh,860px)]">
          <img
            src={mediaUrl('/og-cover.jpg')}
            alt="A speckled stoneware mug on a dark slate table"
            width={1376}
            height={768}
            fetchPriority="high"
            className="hero-settle h-full w-full object-cover object-[30%_50%]"
          />
        </div>
        <div className="container-app grid gap-8 pb-(--section-gap) pt-8 lg:grid-cols-12 lg:pt-12">
          <h1 id="hero-title" className="text-hero tracking-[-0.025em] lg:col-span-8">
            Objects for a <em>quieter</em> home.
          </h1>
          <div className="lg:col-span-4 lg:col-start-9 lg:pt-3">
            <p className="max-w-[62ch] text-lead text-ink-muted">
              A small collection of useful things, chosen for their materials and made to last.
            </p>
            <Link to="/products" className="btn-primary mt-7 w-full sm:w-auto">
              Shop the collection
            </Link>
          </div>
        </div>
      </section>

      {categories.length > 0 && (
        <section aria-labelledby="rooms-title" className="container-app pb-(--section-gap)">
          <p className="eyebrow">Shop by room</p>
          <h2 id="rooms-title" className="mt-3 text-h2 tracking-[-0.01em]">
            Four rooms, one idea.
          </h2>
          <ul className="mt-10 grid grid-cols-2 gap-x-(--grid-gap) gap-y-10 md:grid-cols-4">
            {categories.map((category) => (
              <li key={category.slug} className="relative">
                <div className="plate aspect-[4/5]">
                  {category.cover && (
                    <img
                      src={mediaUrl(category.cover.url)}
                      alt=""
                      width={800}
                      height={1000}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover object-[50%_55%]"
                    />
                  )}
                </div>
                <Link
                  to={`/products?category=${category.slug}`}
                  className="mt-3 block font-display text-title after:absolute after:inset-0"
                >
                  {category.name}
                </Link>
                <p className="text-caption text-ink-subtle">
                  {category.productCount} {category.productCount === 1 ? 'object' : 'objects'}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(isLoading || isError || products.length > 0) && (
        <section aria-labelledby="new-title" className="container-app pb-(--section-gap)">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="eyebrow">New</p>
              <h2 id="new-title" className="mt-3 text-h2 tracking-[-0.01em]">
                Recently arrived
              </h2>
            </div>
            <Link to="/products" className="link-text shrink-0 text-sm">
              View all
            </Link>
          </div>
          <div className="mt-10">
            {isLoading ? (
              <ProductGridSkeleton count={4} className={arrivalsGrid} />
            ) : isError ? (
              <div role="status" className="bg-paper-sunken p-8">
                <h3 className="text-h3">We couldn’t load this.</h3>
                <button type="button" onClick={() => refetch()} className="btn-secondary mt-6">
                  Try again
                </button>
              </div>
            ) : (
              <div className={arrivalsGrid}>
                {products.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <section aria-labelledby="statement-title" className="bg-paper-sunken py-(--section-gap)">
        <div className="container-app">
          <h2 id="statement-title" className="max-w-[18ch] text-h2 tracking-[-0.01em]">
            We keep the collection small <em>on purpose.</em>
          </h2>
          <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-(--grid-gap)">
            {principles.map(([numeral, title, text]) => (
              <li key={numeral} className="border-t border-line-strong pt-5">
                <p className="eyebrow">{numeral}</p>
                <h3 className="mt-3 text-title">{title}</h3>
                <p className="mt-3 max-w-[40ch] text-ink-muted">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        aria-labelledby="delivery-title"
        className="container-app grid items-center gap-8 py-(--section-gap) lg:grid-cols-12"
      >
        <div className="plate aspect-[3/2] lg:col-span-7">
          <img
            src={mediaUrl('/products/linen-table-runner.jpg')}
            alt=""
            width={1024}
            height={1024}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        </div>
        <div className="lg:col-span-4 lg:col-start-9">
          <p className="eyebrow">Delivery and returns</p>
          <h2 id="delivery-title" className="mt-3 text-h3">
            {deliveryLine} {policy && policy.returnWindowDays > 0 ? 'Time to change your mind.' : ''}
          </h2>
          <p className="mt-5 max-w-[62ch] text-ink-muted">
            Every order is tracked from our studio to your door.
            {policy &&
              policy.returnWindowDays > 0 &&
              ` Unused objects come back within ${policy.returnWindowDays} days.`}
          </p>
          <Link to="/products" className="link-text mt-6 inline-block text-sm">
            Browse the collection
          </Link>
        </div>
      </section>
    </>
  )
}
