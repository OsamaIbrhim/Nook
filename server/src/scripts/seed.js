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
  ['Ripple Ceramic Mug', 'Home', 24, 32, 'A hand-finished stoneware mug with a softly rippled surface and comfortable handle.', 'photo-1514228742587-6b1558fcca3d'],
  ['Linen Table Runner', 'Kitchen', 38, 18, 'Washed natural linen with a relaxed drape for everyday meals and special gatherings.', 'photo-1603199506016-b9a594b593c0'],
  ['Oak Desk Tray', 'Workspace', 42, 14, 'A solid oak catchall that keeps pens, notes, and small essentials beautifully organized.', 'photo-1494438639946-1ebd1d20bf85'],
  ['Calm Soy Candle', 'Wellness', 28, 25, 'A clean-burning soy candle with cedar, bergamot, and soft herbal notes.', 'photo-1602874801006-e26c8e9eafbd'],
  ['Woven Market Basket', 'Home', 56, 9, 'A sturdy handwoven basket for market mornings, blankets, or everyday storage.', 'photo-1590874103328-eac38a683ce7'],
  ['Glass Carafe Set', 'Kitchen', 48, 16, 'Lightweight borosilicate glass carafe with two matching tumblers.', 'photo-1523362628745-0c100150b504'],
  ['Minimal Weekly Planner', 'Workspace', 18, 40, 'An undated weekly planner with generous space and smooth recycled paper.', 'photo-1506784983877-45594efa4cbe'],
  ['Botanical Bath Soak', 'Wellness', 22, 30, 'Mineral-rich salts blended with lavender and dried botanicals.', 'photo-1608571423902-eed4a5ad8108'],
  ['Bouclé Cushion', 'Home', 44, 12, 'A tactile neutral cushion with a feather-soft recycled fill.', 'photo-1586023492125-27b2c045efd7'],
  ['Acacia Serving Board', 'Kitchen', 35, 21, 'Warm acacia wood shaped for bread, cheese, and shared snacks.', 'photo-1556911220-bff31c812dba'],
  ['Brass Bookmark', 'Workspace', 14, 50, 'A slim brushed-brass page marker that develops a beautiful patina.', 'photo-1544947950-fa07a98d237f'],
  ['Stone Incense Holder', 'Wellness', 19, 19, 'A weighty natural-stone holder with a minimal carved channel.', 'photo-1603006905003-be475563bc59'],
  ['Speckled Bud Vase', 'Home', 26, 17, 'A small wheel-thrown vase for a single stem or tiny gathered arrangement.', 'photo-1610701596007-11502861dcfa'],
  ['Cotton Tea Towels', 'Kitchen', 20, 35, 'A pair of absorbent yarn-dyed cotton towels in gentle earth tones.', 'photo-1556912167-f556f1f39fdf'],
  ['Canvas Pencil Case', 'Workspace', 16, 27, 'Hard-wearing cotton canvas with a smooth brass zip and roomy interior.', 'photo-1455390582262-044cdead277a'],
  ['Dry Body Brush', 'Wellness', 21, 22, 'Natural sisal bristles and an easy-grip beechwood handle.', 'photo-1556228578-8c89e6adf883']
]

const seedEmails = ['admin@nook.test', 'maya@nook.test', 'omar@nook.test', 'lina@nook.test']

function imageUrl(photoId) {
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

  const products = await Product.create(catalog.map(([name, category, price, stock, description, photoId], index) => ({
    name,
    slug: slugify(name),
    description,
    price,
    compareAtPrice: index % 4 === 0 ? Number(price) + 10 : undefined,
    stock,
    category: categoryDocs[category]._id,
    images: [{ url: imageUrl(photoId), publicId: `demo/${slugify(name)}`, alt: name }],
    isActive: true,
    createdBy: admin._id
  })))

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
