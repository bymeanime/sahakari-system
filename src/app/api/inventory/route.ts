import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const items = await db.inventoryItem.findMany({ orderBy: { code: 'asc' } })
    return NextResponse.json(items)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Stock transaction
    if (body.action === 'stockIn' || body.action === 'stockOut') {
      const { itemId, quantity, unitPrice, description, referenceNo } = body
      if (!itemId || !quantity) {
        return NextResponse.json({ error: 'itemId and quantity are required' }, { status: 400 })
      }

      const item = await db.inventoryItem.findUnique({ where: { id: itemId } })
      if (!item) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 })
      }

      const qty = parseInt(quantity)
      const price = parseFloat(unitPrice) || item.unitPrice
      const newQty = body.action === 'stockIn' ? item.quantity + qty : item.quantity - qty

      if (newQty < 0) {
        return NextResponse.json({ error: 'Insufficient stock' }, { status: 400 })
      }

      const [updatedItem, transaction] = await db.$transaction([
        db.inventoryItem.update({
          where: { id: itemId },
          data: {
            quantity: newQty,
            unitPrice: price,
            totalValue: newQty * price,
          },
        }),
        db.inventoryTransaction.create({
          data: {
            itemId,
            type: body.action === 'stockIn' ? 'PURCHASE' : 'SALE',
            quantity: qty,
            unitPrice: price,
            totalAmount: qty * price,
            date: new Date().toISOString().split('T')[0],
            description: description || null,
            referenceNo: referenceNo || null,
          },
        }),
      ])

      return NextResponse.json({ item: updatedItem, transaction }, { status: 201 })
    }

    // Create new item
    const item = await db.inventoryItem.create({
      data: {
        name: body.name,
        nameNepali: body.nameNepali || null,
        code: body.code,
        category: body.category || null,
        unit: body.unit || 'PCS',
        quantity: parseInt(body.quantity) || 0,
        minStockLevel: parseInt(body.minStockLevel) || 0,
        unitPrice: parseFloat(body.unitPrice) || 0,
        totalValue: (parseInt(body.quantity) || 0) * (parseFloat(body.unitPrice) || 0),
        supplier: body.supplier || null,
        location: body.location || null,
        organizationId: body.organizationId || 'org-sahakari-001',
      },
    })
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create inventory item' }, { status: 500 })
  }
}
