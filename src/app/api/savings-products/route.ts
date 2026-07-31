import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/savings-products
export async function GET() {
  try {
    const products = await db.savingsProduct.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
    })
    return NextResponse.json(products)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch savings products' }, { status: 500 })
  }
}

// POST /api/savings-products
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const org = await db.organization.findFirst()
    if (!org) return NextResponse.json({ error: 'No organization found' }, { status: 400 })

    const product = await db.savingsProduct.create({
      data: {
        name: body.name,
        nameNepali: body.nameNepali || null,
        code: body.code,
        description: body.description || null,
        interestRate: body.interestRate || 0,
        minBalance: body.minBalance || 0,
        minOpeningAmt: body.minOpeningAmt || 0,
        withdrawalLimit: body.withdrawalLimit || null,
        lockInPeriod: body.lockInPeriod || null,
        compoundingFreq: body.compoundingFreq || 'QUARTERLY',
        isDefault: body.isDefault || false,
        organizationId: org.id,
        isActive: true,
      },
    })
    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create savings product' }, { status: 500 })
  }
}
