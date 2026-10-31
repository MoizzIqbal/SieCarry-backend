import dotenv from 'dotenv'
import { connectDB } from '../config/db.js'
import { User } from '../models/User.js'
import { Product } from '../models/Product.js'
import { Category } from '../models/Category.js'
import { slugify } from '../controllers/product.controller.js'
import { seedCategories, seedProducts } from './data.js'

dotenv.config()

async function seed() {
  try {
    await connectDB(process.env.MONGODB_URI)

    await Promise.all([
      User.deleteMany({}),
      Product.deleteMany({}),
      Category.deleteMany({}),
    ])

    await User.create({
      name: process.env.ADMIN_NAME || 'Admin',
      email: process.env.ADMIN_EMAIL || 'admin@siwcarry.com',
      password: process.env.ADMIN_PASSWORD || 'SiwCarry@123',
      role: 'admin',
    })

    await Category.insertMany(seedCategories)

    const usedSlugs = new Set()
    const productsWithSlugs = seedProducts.map((product) => {
      const base = slugify(product.name) || `product-${Date.now()}`
      let slug = base
      let counter = 2
      while (usedSlugs.has(slug)) {
        slug = `${base}-${counter++}`
      }
      usedSlugs.add(slug)
      return { ...product, slug }
    })
    await Product.insertMany(productsWithSlugs)

    console.log('Seed completed successfully')
    console.log(`Admin login: ${process.env.ADMIN_EMAIL || 'admin@siwcarry.com'}`)
    console.log(`Password: ${process.env.ADMIN_PASSWORD || 'SiwCarry@123'}`)
    process.exit(0)
  } catch (error) {
    console.error('Seed failed:', error)
    process.exit(1)
  }
}

seed()
