import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const orders = await db.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
      },
    })
    return NextResponse.json(orders)
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { tableNumber, customerName, notes, items } = body

    if (!tableNumber || !items || items.length === 0) {
      return NextResponse.json({ error: 'Table number and items are required' }, { status: 400 })
    }

    // Calculate total price
    let totalPrice = 0
    const orderItemsData = []

    for (const item of items) {
      const menuItem = await db.menuItem.findUnique({ where: { id: item.menuItemId } })
      if (!menuItem) {
        return NextResponse.json({ error: `Menu item ${item.menuItemId} not found` }, { status: 404 })
      }
      const itemTotal = menuItem.price * item.quantity
      totalPrice += itemTotal
      orderItemsData.push({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        price: menuItem.price,
        notes: item.notes || null,
      })
    }

    const order = await db.order.create({
      data: {
        tableNumber,
        customerName: customerName || null,
        notes: notes || null,
        totalPrice,
        items: {
          create: orderItemsData,
        },
      },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
      },
    })

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}
