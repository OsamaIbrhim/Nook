import { Helmet } from 'react-helmet-async'
import { siteUrl } from '../utils/site'
const defaultImage = `${siteUrl}/og-cover.jpg`

type SeoProps = {
  title?: string
  description: string
  path?: string
  image?: string
  type?: 'website' | 'product'
  noindex?: boolean
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
}

export function Seo({ title, description, path = '/', image = defaultImage, type = 'website', noindex = false, jsonLd }: SeoProps) {
  const fullTitle = title ? `${title} | Nook Objects` : 'Nook Objects — Fewer, Better Objects for Everyday Life'
  const canonical = `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`
  return <Helmet>
    <title>{fullTitle}</title>
    <meta name="description" content={description}/>
    <link rel="canonical" href={canonical}/>
    <meta name="robots" content={noindex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'}/>
    <meta property="og:type" content={type}/>
    <meta property="og:site_name" content="Nook Objects"/>
    <meta property="og:title" content={fullTitle}/>
    <meta property="og:description" content={description}/>
    <meta property="og:url" content={canonical}/>
    <meta property="og:image" content={image}/>
    <meta property="og:image:alt" content={title || 'Nook Objects collection'}/>
    <meta name="twitter:card" content="summary_large_image"/>
    <meta name="twitter:title" content={fullTitle}/>
    <meta name="twitter:description" content={description}/>
    <meta name="twitter:image" content={image}/>
    {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
  </Helmet>
}
