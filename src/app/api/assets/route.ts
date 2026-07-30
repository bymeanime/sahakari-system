import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const assets = await db.asset.findMany({ orderBy: { code: 'asc' } })
    return NextResponse.json(assets)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const asset = await db.asset.create({
      data: {
        name: body.name,
        nameNepali: body.nameNepali || null,
        code: body.code,
        category: body.category || null,
        purchaseDate: body.purchaseDate || null,
        purchasePrice: parseFloat(body.purchasePrice) || 0,
        currentValue: parseFloat(body.currentValue) || 0,
        depreciationRate: parseFloat(body.depreciationRate) || 0,
        accumulatedDep: (parseFloat(body.purchasePrice) || 0) - (parseFloat(body.currentValue) || 0),
        location: body.location || null,
        responsiblePerson: body.responsiblePerson || null,
        status: 'ACTIVE',
        organizationId: body.organizationId || 'org-sahakari-001',
        description: body.description || null,
      },
    })
    return NextResponse.json(asset, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create asset' }, { status: 500 })
  }
}
