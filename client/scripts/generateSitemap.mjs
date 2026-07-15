import fs from 'node:fs/promises'

const siteUrl = (process.env.VITE_SITE_URL || 'https://nook-objects.vercel.app').replace(/\/$/, '')
const apiUrl = (process.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '')
const urls = [
  { path: '/', priority: '1.0', frequency: 'weekly' },
  { path: '/products', priority: '0.9', frequency: 'daily' }
]

try {
  let page = 1
  let pages = 1
  while (page <= pages) {
    const response = await fetch(`${apiUrl}/products?page=${page}&limit=100`)
    if (!response.ok) throw new Error(`API returned ${response.status}`)
    const payload = await response.json()
    pages = payload.data.pagination.pages
    for (const product of payload.data.products) urls.push({ path: `/products/${product.slug}`, priority: '0.8', frequency: 'weekly', modified: product.updatedAt })
    page += 1
  }
  console.log(`Sitemap: included ${urls.length - 2} products`)
} catch (error) {
  console.warn(`Sitemap: product API unavailable; writing static routes only (${error.message})`)
}

const body = urls.map((entry) => `  <url><loc>${siteUrl}${entry.path}</loc>${entry.modified ? `<lastmod>${new Date(entry.modified).toISOString()}</lastmod>` : ''}<changefreq>${entry.frequency}</changefreq><priority>${entry.priority}</priority></url>`).join('\n')
await fs.mkdir('public', { recursive: true })
await fs.writeFile('public/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`)
await fs.writeFile('public/robots.txt', `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /account\nDisallow: /cart\nDisallow: /checkout\nDisallow: /orders\n\nSitemap: ${siteUrl}/sitemap.xml\n`)
