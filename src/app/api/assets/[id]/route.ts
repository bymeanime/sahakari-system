import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/assets/[id] - Get a single asset by id
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const asset = await db.asset.findUnique({
      where: { id },
    })

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    return NextResponse.json(asset)
  } catch (error) {
    console.error('Failed to fetch asset:', error)
    return NextResponse.json({ error: 'Failed to fetch asset' }, { status: 500 })
  }
}

// PUT /api/assets/[id] - Update an asset
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.asset.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = body.name
    if (body.nameNepali !== undefined) data.nameNepali = body.nameNepali
    if (body.category !== undefined) data.category = body.category
    if (body.purchaseDate !== undefined) data.purchaseDate = body.purchaseDate
    if (body.purchasePrice !== undefined) data.purchasePrice = body.purchasePrice
    if (body.currentValue !== undefined) data.currentValue = body.currentValue
    if (body.depreciationRate !== undefined) data.depreciationRate = body.depreciationRate
    if (body.accumulatedDep !== undefined) data.accumulatedDep = body.accumulatedDep
    if (body.location !== undefined) data.location = body.location
    if (body.responsiblePerson !== undefined) data.responsiblePerson = body.responsiblePerson
    if (body.status !== undefined) data.status = body.status
    if (body.description !== undefined) data.description = body.description

    const asset = await db.asset.update({
      where: { id },
      data,
    })

    return NextResponse.json(asset)
  } catch (error) {
    console.error('Failed to update asset:', error)
    return NextResponse.json({ error: 'Failed to update asset' }, { status: 500 })
  }
}

// DELETE /api/assets/[id] - Soft delete an asset (set status to DISPOSED)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.asset.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    if (existing.status === 'DISPOSED') {
      return NextResponse.json({ error: 'Asset is already disposed' }, { status: 400 })
    }

    const asset = await db.asset.update({
      where: { id },
      data: { status: 'DISPOSED' },
    })

    return NextResponse.json({
      message: 'Asset disposed successfully.',
      asset,
    })
  } catch (error) {
    console.error('Failed to dispose asset:', error)
    return NextResponse.json({ error: 'Failed to dispose asset' }, { status: 500 })
  }
}
