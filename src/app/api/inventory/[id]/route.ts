import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/inventory/[id] - Get a single inventory item by id
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const item = await db.inventoryItem.findUnique({
      where: { id },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    })

    if (!item) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 })
    }

    return NextResponse.json(item)
  } catch (error) {
    console.error('Failed to fetch inventory item:', error)
    return NextResponse.json({ error: 'Failed to fetch inventory item' }, { status: 500 })
  }
}

// PUT /api/inventory/[id] - Update an inventory item
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.inventoryItem.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = body.name
    if (body.nameNepali !== undefined) data.nameNepali = body.nameNepali
    if (body.category !== undefined) data.category = body.category
    if (body.unit !== undefined) data.unit = body.unit
    if (body.minStockLevel !== undefined) data.minStockLevel = body.minStockLevel
    if (body.unitPrice !== undefined) data.unitPrice = body.unitPrice
    if (body.supplier !== undefined) data.supplier = body.supplier
    if (body.location !== undefined) data.location = body.location
    if (body.isActive !== undefined) data.isActive = body.isActive

    // Recalculate totalValue = quantity * unitPrice
    const quantity = existing.quantity
    const unitPrice = body.unitPrice !== undefined ? body.unitPrice : existing.unitPrice
    data.totalValue = quantity * unitPrice

    const item = await db.inventoryItem.update({
      where: { id },
      data,
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error('Failed to update inventory item:', error)
    return NextResponse.json({ error: 'Failed to update inventory item' }, { status: 500 })
  }
}

// DELETE /api/inventory/[id] - Soft delete an inventory item (set isActive to false)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.inventoryItem.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 })
    }

    if (!existing.isActive) {
      return NextResponse.json({ error: 'Inventory item is already deactivated' }, { status: 400 })
    }

    const item = await db.inventoryItem.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({
      message: 'Inventory item deactivated successfully.',
      item,
    })
  } catch (error) {
    console.error('Failed to deactivate inventory item:', error)
    return NextResponse.json({ error: 'Failed to deactivate inventory item' }, { status: 500 })
  }
}
