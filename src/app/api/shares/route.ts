import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const [holdings, products] = await Promise.all([
      db.shareHolding.findMany({
        include: { member: { select: { memberNo: true, firstName: true, lastName: true } } },
        orderBy: { purchaseDate: 'desc' },
      }),
      db.shareProduct.findMany({ where: { isActive: true } }),
    ])
    return NextResponse.json({ holdings, products })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch shares' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const holding = await db.shareHolding.create({
      data: {
        memberId: body.memberId,
        productId: body.productId,
        shareCount: parseInt(body.shareCount),
        shareValue: parseFloat(body.shareValue),
        purchaseDate: body.purchaseDate || new Date().toISOString().split('T')[0],
        certificateNo: body.certificateNo || null,
        status: 'ACTIVE',
      },
    })

    // Update issued shares count
    await db.shareProduct.update({
      where: { id: body.productId },
      data: {
        issuedShares: { increment: parseInt(body.shareCount) },
        availableShares: { decrement: parseInt(body.shareCount) },
      },
    })

    return NextResponse.json(holding, { status: 201 })
  } catch (error) {
    console.error('Share creation error:', error)
    return NextResponse.json({ error: 'Failed to issue shares' }, { status: 500 })
  }
}
