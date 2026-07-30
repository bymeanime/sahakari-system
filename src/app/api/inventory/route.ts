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
