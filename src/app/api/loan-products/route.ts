import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/loan-products
export async function GET() {
  try {
    const products = await db.loanProduct.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
    })
    return NextResponse.json(products)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch loan products' }, { status: 500 })
  }
}

// POST /api/loan-products
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const org = await db.organization.findFirst()
    if (!org) return NextResponse.json({ error: 'No organization found' }, { status: 400 })

    const product = await db.loanProduct.create({
      data: {
        name: body.name,
        nameNepali: body.nameNepali || null,
        code: body.code,
        description: body.description || null,
        interestRate: body.interestRate,
        maxAmount: body.maxAmount || null,
        minAmount: body.minAmount || null,
        maxTerm: body.maxTerm || null,
        minTerm: body.minTerm || null,
        repaymentSchedule: body.repaymentSchedule || 'MONTHLY',
        processingFee: body.processingFee || 0,
        insuranceRequired: body.insuranceRequired || false,
        guarantorRequired: body.guarantorRequired !== false,
        collateralRequired: body.collateralRequired || false,
        organizationId: org.id,
        isActive: true,
      },
    })
    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create loan product' }, { status: 500 })
  }
}
