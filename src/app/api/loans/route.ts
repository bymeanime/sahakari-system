import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/loans
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where: any = {}
    if (status && status !== 'ALL') where.status = status

    const [applications, products] = await Promise.all([
      db.loanApplication.findMany({
        where,
        include: { product: true, member: { select: { memberNo: true, firstName: true, lastName: true } } },
        orderBy: { applicationNo: 'desc' },
      }),
      db.loanProduct.findMany({ where: { isActive: true } }),
    ])

    return NextResponse.json({ applications, products })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch loans' }, { status: 500 })
  }
}

// POST /api/loans - Create loan application or update status
export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (body.action === 'approve') {
      const loan = await db.loanApplication.update({
        where: { applicationNo: body.applicationNo },
        data: {
          status: 'APPROVED',
          approvedAmount: body.approvedAmount,
          interestRate: body.interestRate,
          approvalDate: new Date().toISOString().split('T')[0],
          reviewedBy: body.reviewedBy || 'ADMIN',
          approvedBy: body.approvedBy || 'ADMIN',
        },
      })
      return NextResponse.json(loan)
    }

    if (body.action === 'disburse') {
      const loan = await db.loanApplication.update({
        where: { applicationNo: body.applicationNo },
        data: {
          status: 'DISBURSED',
          disbursedAmount: body.disbursedAmount,
          outstandingAmount: body.disbursedAmount,
          disbursementDate: new Date().toISOString().split('T')[0],
          emiAmount: body.emiAmount,
          nextDueDate: body.nextDueDate,
        },
      })
      return NextResponse.json(loan)
    }

    if (body.action === 'reject') {
      const loan = await db.loanApplication.update({
        where: { applicationNo: body.applicationNo },
        data: { status: 'REJECTED', rejectionReason: body.rejectionReason },
      })
      return NextResponse.json(loan)
    }

    // Create new loan application
    const lastApp = await db.loanApplication.findFirst({ orderBy: { applicationNo: 'desc' } })
    const nextNum = lastApp ? parseInt(lastApp.applicationNo.replace('LA-', '')) + 1 : 1
    const applicationNo = `LA-${String(nextNum).padStart(3, '0')}`

    const application = await db.loanApplication.create({
      data: {
        applicationNo,
        memberId: body.memberId,
        productId: body.productId,
        requestedAmount: parseFloat(body.requestedAmount),
        term: parseInt(body.term),
        purpose: body.purpose || null,
        purposeNepali: body.purposeNepali || null,
        status: 'PENDING',
        applicationDate: new Date().toISOString().split('T')[0],
        collateralType: body.collateralType || null,
        collateralValue: body.collateralValue ? parseFloat(body.collateralValue) : null,
        collateralDesc: body.collateralDesc || null,
        guarantorId: body.guarantorId || null,
      },
    })

    return NextResponse.json(application, { status: 201 })
  } catch (error) {
    console.error('Loan error:', error)
    return NextResponse.json({ error: 'Failed to process loan' }, { status: 500 })
  }
}
