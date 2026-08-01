import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST() {
  try {
    // Check if menu items already exist
    const existing = await db.menuItem.count()
    if (existing > 0) {
      return NextResponse.json({ message: 'Menu already seeded', count: existing })
    }

    const menuItems = [
      { name: 'Nasi Goreng Spesial', description: 'Nasi goreng dengan telur, ayam, dan sayuran segar', price: 35000, category: 'Makanan', image: '/food/nasi-goreng.jpg' },
      { name: 'Mie Goreng', description: 'Mie goreng bumbu spesial dengan telur dan sayuran', price: 30000, category: 'Makanan', image: '/food/mie-goreng.jpg' },
      { name: 'Ayam Bakar Madu', description: 'Ayam bakar dengan saus madu dan lalapan', price: 45000, category: 'Makanan', image: '/food/ayam-bakar.jpg' },
      { name: 'Sate Ayam', description: '10 tusuk sate ayam dengan bumbu kacang', price: 40000, category: 'Makanan', image: '/food/sate-ayam.jpg' },
      { name: 'Gado-Gado', description: 'Sayuran segar dengan bumbu kacang dan kerupuk', price: 25000, category: 'Makanan', image: '/food/gado-gado.jpg' },
      { name: 'Soto Ayam', description: 'Soto ayam kuning dengan nasi dan telur', price: 28000, category: 'Makanan', image: '/food/soto-ayam.jpg' },
      { name: 'Es Teh Manis', description: 'Teh manis dingin segar', price: 8000, category: 'Minuman', image: '/food/es-teh.jpg' },
      { name: 'Es Jeruk', description: 'Jus jeruk segar dingin', price: 12000, category: 'Minuman', image: '/food/es-jeruk.jpg' },
      { name: 'Jus Alpukat', description: 'Jus alpukat segar dengan susu coklat', price: 18000, category: 'Minuman', image: '/food/jus-alpukat.jpg' },
      { name: 'Kopi Hitam', description: 'Kopi hitam pilihan, bisa panas atau dingin', price: 15000, category: 'Minuman', image: '/food/kopi-hitam.jpg' },
      { name: 'Tahu Crispy', description: 'Tahu goreng crispy dengan saus sambal', price: 15000, category: 'Snack', image: '/food/tahu-crispy.jpg' },
      { name: 'Kentang Goreng', description: 'Kentang goreng crispy dengan saus', price: 20000, category: 'Snack', image: '/food/kentang-goreng.jpg' },
      { name: 'Pisang Goreng', description: 'Pisang goreng crispy dengan keju dan coklat', price: 18000, category: 'Snack', image: '/food/pisang-goreng.jpg' },
      { name: 'Es Campur', description: 'Es campur buah segar dengan sirup', price: 15000, category: 'Dessert', image: '/food/es-campur.jpg' },
      { name: 'Puding Coklat', description: 'Puding coklat lembut dan creamy', price: 12000, category: 'Dessert', image: '/food/puding-coklat.jpg' },
    ]

    const created = await db.menuItem.createMany({
      data: menuItems,
    })

    return NextResponse.json({ message: 'Menu seeded successfully', count: created.count }, { status: 201 })
  } catch (error) {
    console.error('Error seeding menu:', error)
    return NextResponse.json({ error: 'Failed to seed menu' }, { status: 500 })
  }
}
