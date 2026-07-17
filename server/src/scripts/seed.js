import mongoose from 'mongoose'
import { connectDatabase } from '../config/db.js'
import { User } from '../models/User.js'
import { Category } from '../models/Category.js'
import { Product } from '../models/Product.js'
import { Order } from '../models/Order.js'
import { slugify } from '../utils/slugify.js'
import { env } from '../config/env.js'

const categories = [
  ['Home', 'Warm, useful pieces for everyday spaces.'],
  ['Kitchen', 'Thoughtful tools for cooking and gathering.'],
  ['Workspace', 'Objects that make focused work feel better.'],
  ['Wellness', 'Simple rituals for slower, calmer days.']
]

const catalog = [
  ['Ripple Ceramic Mug', 'Home', 24, 32, 'A hand-finished stoneware mug with a softly rippled surface and comfortable handle.', '/products/ripple-ceramic-mug.jpg'],
  ['Linen Table Runner', 'Kitchen', 38, 18, 'Washed natural linen with a relaxed drape for everyday meals and special gatherings.', '/products/linen-table-runner.jpg'],
  ['Oak Desk Tray', 'Workspace', 42, 14, 'A solid oak catchall that keeps pens, notes, and small essentials beautifully organized.', '/products/oak-desk-tray.jpg'],
  ['Orbit Table Lamp', 'Home', 128, 11, 'A dimmable opal-glass table lamp that brings soft, glare-free light to a bedside, shelf, or reading corner.', '/products/orbit-table-lamp.jpg'],
  ['Calm Soy Candle', 'Wellness', 28, 25, 'A clean-burning soy candle with cedar, bergamot, and soft herbal notes.', '/products/calm-soy-candle.jpg'],
  ['Woven Market Basket', 'Home', 56, 9, 'A sturdy handwoven basket for market mornings, blankets, or everyday storage.', '/products/woven-market-basket.jpg'],
  ['Glass Carafe Set', 'Kitchen', 48, 16, 'Lightweight borosilicate glass carafe with two matching tumblers.', '/products/glass-carafe-set.jpg'],
  ['Minimal Weekly Planner', 'Workspace', 18, 40, 'An undated weekly planner with generous space and smooth recycled paper.', '/products/minimal-weekly-planner.jpg'],
  ['Botanical Bath Soak', 'Wellness', 22, 30, 'Mineral-rich salts blended with lavender and dried botanicals.', '/products/botanical-bath-soak.jpg'],
  ['Bouclé Cushion', 'Home', 44, 12, 'A tactile neutral cushion with a feather-soft recycled fill.', '/products/boucle-cushion.jpg'],
  ['Acacia Serving Board', 'Kitchen', 35, 21, 'Warm acacia wood shaped for bread, cheese, and shared snacks.', '/products/acacia-serving-board.jpg'],
  ['Brass Bookmark', 'Workspace', 14, 50, 'A slim brushed-brass page marker that develops a beautiful patina.', '/products/brass-bookmark.jpg'],
  ['Stone Incense Holder', 'Wellness', 19, 19, 'A weighty natural-stone holder with a minimal carved channel.', '/products/stone-incense-holder.jpg'],
  ['Speckled Bud Vase', 'Home', 26, 17, 'A small wheel-thrown vase for a single stem or tiny gathered arrangement.', '/products/speckled-bud-vase.jpg'],
  ['Cotton Tea Towels', 'Kitchen', 20, 35, 'A pair of absorbent yarn-dyed cotton towels in gentle earth tones.', '/products/cotton-tea-towels.jpg'],
]

const seedEmails = ['admin@nook.test', 'maya@nook.test', 'omar@nook.test', 'lina@nook.test']

function imageUrl(photoId) {
  if (photoId.startsWith('/')) return photoId
  return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=900&q=80`
}

async function seed() {
  await connectDatabase()
  console.log('Seeding Nook demo data…')

  // Only remove records owned by the demo identities; real store data is left intact.
  const oldUsers = await User.find({ email: { $in: seedEmails } }).select('_id')
  if (oldUsers.length) {
    const ids = oldUsers.map((user) => user._id)
    await Order.deleteMany({ user: { $in: ids } })
    await Product.deleteMany({ createdBy: { $in: ids } })
    await User.deleteMany({ _id: { $in: ids } })
  }

  const [admin, maya, omar, lina] = await User.create([
    { name: 'Nook Admin', email: seedEmails[0], password: 'Admin123!', role: 'admin' },
    { name: 'Maya Hassan', email: seedEmails[1], password: 'Customer123!', role: 'customer' },
    { name: 'Omar Saleh', email: seedEmails[2], password: 'Customer123!', role: 'customer' },
    { name: 'Lina Adel', email: seedEmails[3], password: 'Customer123!', role: 'customer' }
  ])

  const categoryDocs = {}
  for (const [name, description] of categories) {
    categoryDocs[name] = await Category.findOneAndUpdate(
      { slug: slugify(name) },
      { name, slug: slugify(name), description },
      { upsert: true, new: true, runValidators: true }
    )
  }

  const specifications = {
    'Ripple Ceramic Mug': ['Glazed stoneware', '350 ml · 9 × 9.5 cm', 'Dishwasher safe', ['Comfortable rounded handle for slow mornings.', 'Tactile ripple glaze gives every mug subtle character.', 'Generous 350 ml capacity without feeling oversized.']],
    'Linen Table Runner': ['100% European flax linen', '40 × 180 cm', 'Machine wash cold; line dry', ['Softens the table without formal styling.', 'Washed linen improves with every use.', 'Neutral tone works across everyday and occasion settings.']],
    'Oak Desk Tray': ['FSC-certified solid oak', '30 × 18 × 2.5 cm', 'Wipe with a barely damp cloth', ['Gives pens, keys, notes, and cables one visible home.', 'Solid oak develops character instead of wearing out.', 'Compact footprint preserves usable desk space.']],
    'Orbit Table Lamp': ['Opal glass and brushed brass', '28 × 28 × 34 cm', 'Dust with a soft dry cloth', ['Soft, glare-free light makes evenings calmer.', 'Inline dimmer adapts from reading to ambient light.', 'Compact sculptural form fits shelves and small tables.']],
    'Calm Soy Candle': ['Soy wax, cotton wick, essential-oil fragrance', '240 g · 50-hour burn', 'Trim wick to 5 mm before lighting', ['Creates a warm cedar-and-bergamot atmosphere.', 'Clean soy wax burns slowly and evenly.', 'Reusable glass vessel keeps waste lower.']],
    'Woven Market Basket': ['Handwoven seagrass', '42 × 24 × 30 cm', 'Spot clean and air dry', ['Carries market goods without disposable bags.', 'Structured weave doubles as open home storage.', 'Comfortable handles are built for everyday use.']],
    'Glass Carafe Set': ['Heat-resistant borosilicate glass', '1 L carafe · two 250 ml tumblers', 'Dishwasher safe', ['Keeps water visible and within easy reach.', 'Lightweight glass is durable for daily use.', 'Matching tumblers stack neatly beside the carafe.']],
    'Minimal Weekly Planner': ['FSC recycled paper and cotton cover', 'A5 · 160 pages', 'Keep dry', ['Undated pages remove the pressure of missed weeks.', 'One clear spread reduces planning clutter.', 'Smooth paper works with pencil, gel, and fountain pens.']],
    'Botanical Bath Soak': ['Epsom salt, sea salt, lavender, chamomile', '400 g · approximately 8 baths', 'Store sealed in a dry place', ['Turns an ordinary bath into a calmer nightly ritual.', 'Mineral salts help tired bodies unwind.', 'Measured scoop keeps every use simple.']],
    'Bouclé Cushion': ['Recycled bouclé cover and recycled fill', '45 × 45 cm', 'Removable cover; gentle wash', ['Adds softness and texture without loud color.', 'Supportive fill keeps its shape through daily use.', 'Neutral weave layers easily with existing furniture.']],
    'Acacia Serving Board': ['FSC-certified acacia wood', '42 × 18 × 1.8 cm', 'Hand wash; oil occasionally', ['Moves easily from preparation to serving.', 'Dense acacia resists everyday knife marks.', 'Long handle makes sharing and carrying comfortable.']],
    'Brass Bookmark': ['Brushed solid brass', '12 × 2.5 cm', 'Polish or allow a natural patina', ['Keeps a page without damaging the binding.', 'Slim profile disappears neatly inside a book.', 'Solid brass becomes more personal with use.']],
    'Stone Incense Holder': ['Natural travertine stone', '24 × 4 × 2 cm', 'Wipe clean after use', ['Catches ash in one clean carved channel.', 'Weighty stone stays stable on narrow surfaces.', 'Each piece has naturally unique patterning.']],
    'Speckled Bud Vase': ['Hand-glazed stoneware', '8 × 8 × 15 cm', 'Hand wash recommended', ['Makes a single stem feel intentional.', 'Small footprint fits shelves and bedside tables.', 'Hand-applied glaze makes each vase subtly unique.']],
    'Cotton Tea Towels': ['100% yarn-dyed cotton', 'Set of 2 · 50 × 70 cm each', 'Machine wash warm', ['Absorbent weave handles real kitchen work.', 'Yarn-dyed color stays richer through washing.', 'Hanging loop keeps towels within easy reach.']],
  }
  const products = await Product.create(catalog.map(([name, category, price, stock, shortDescription, photoId], index) => {
    const [material, dimensions, care, benefits] = specifications[name]
    const description = `${shortDescription} Selected by Nook for its honest materials, useful proportions, and ability to improve an everyday ritual without adding visual noise.`
    return {
      name,
      slug: slugify(name),
      shortDescription,
      description,
      sku: `NOOK-${String(index + 1).padStart(3, '0')}`,
      brand: 'Nook Objects',
      material,
      dimensions,
      care,
      benefits,
      tags: [slugify(category), ...name.toLowerCase().split(' ').filter((word) => word.length > 3)],
      seo: { title: `${name} — Curated ${category} Object`, description: `${shortDescription} Discover verified materials, dimensions, care details, secure checkout, and 30-day returns from Nook Objects.` },
      price,
      compareAtPrice: index % 4 === 0 ? Number(price) + 10 : undefined,
      stock,
      category: categoryDocs[category]._id,
      images: [{ url: imageUrl(photoId), publicId: `demo/${slugify(name)}`, alt: `${name} in ${material.toLowerCase()}` }],
      isActive: true,
      createdBy: admin._id
    }
  }))

  const address = { name: 'Maya Hassan', line1: '12 Garden Street', city: 'Cairo', state: 'Cairo', postalCode: '11511', country: 'EG', phone: '+201000000000' }
  const makeItems = (indexes) => indexes.map(([index, quantity]) => {
    const product = products[index]
    return { product: product._id, name: product.name, image: product.images[0].url, unitPrice: product.price, quantity, lineTotal: product.price * quantity }
  })
  const orderData = [
    { user: maya, indexes: [[0, 2], [6, 1]], status: 'delivered', paymentStatus: 'paid', daysAgo: 18 },
    { user: maya, indexes: [[8, 1], [11, 2]], status: 'shipped', paymentStatus: 'paid', daysAgo: 4 },
    { user: omar, indexes: [[5, 1], [9, 1]], status: 'processing', paymentStatus: 'paid', daysAgo: 2 },
    { user: omar, indexes: [[2, 1]], status: 'delivered', paymentStatus: 'paid', daysAgo: 31 },
    { user: lina, indexes: [[3, 2], [15, 1]], status: 'pending', paymentStatus: 'unpaid', daysAgo: 0 },
    { user: lina, indexes: [[1, 1], [12, 2]], status: 'cancelled', paymentStatus: 'failed', daysAgo: 9 }
  ]

  for (const sample of orderData) {
    const items = makeItems(sample.indexes)
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0)
    const createdAt = new Date(Date.now() - sample.daysAgo * 24 * 60 * 60 * 1000)
    await Order.create({
      user: sample.user._id,
      items,
      shippingAddress: { ...address, name: sample.user.name },
      subtotal,
      shipping: 0,
      total: subtotal,
      currency: env.currency,
      status: sample.status,
      paymentStatus: sample.paymentStatus,
      inventoryReserved: sample.status === 'pending',
      statusHistory: [{ status: 'pending', at: createdAt }, ...(sample.status !== 'pending' ? [{ status: sample.status, at: new Date(createdAt.getTime() + 86400000) }] : [])],
      createdAt,
      updatedAt: createdAt
    })
  }

  console.log(`Created ${products.length} products, ${categories.length} categories, ${seedEmails.length} users, and ${orderData.length} orders.`)
  console.log('Admin: admin@nook.test / Admin123!')
  console.log('Customer: maya@nook.test / Customer123!')
}

seed().catch((error) => { console.error(error); process.exitCode = 1 }).finally(async () => { await mongoose.connection.close() })
