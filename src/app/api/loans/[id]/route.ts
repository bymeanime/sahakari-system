import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/loans/[id] - Get a single loan application by id
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const loan = await db.loanApplication.findUnique({
      where: { id },
      include: {
        product: true,
        member: {
          select: {
            id: true,
            memberNo: true,
            firstName: true,
            lastName: true,
            firstNameNep: true,
            lastNameNep: true,
          },
        },
        repayments: {
          orderBy: { installmentNo: 'asc' },
        },
        guarantor: {
          select: {
            id: true,
            memberNo: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    if (!loan) {
      return NextResponse.json({ error: 'Loan application not found' }, { status: 404 })
    }

    return NextResponse.json(loan)
  } catch (error) {
    console.error('Failed to fetch loan application:', error)
    return NextResponse.json({ error: 'Failed to fetch loan application' }, { status: 500 })
  }
}

// PUT /api/loans/[id] - Update a loan application
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.loanApplication.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Loan application not found' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (body.status !== undefined) data.status = body.status
    if (body.approvedAmount !== undefined) data.approvedAmount = body.approvedAmount
    if (body.interestRate !== undefined) data.interestRate = body.interestRate
    if (body.disbursedAmount !== undefined) data.disbursedAmount = body.disbursedAmount
    if (body.outstandingAmount !== undefined) data.outstandingAmount = body.outstandingAmount
    if (body.emiAmount !== undefined) data.emiAmount = body.emiAmount
    if (body.nextDueDate !== undefined) data.nextDueDate = body.nextDueDate
    if (body.rejectionReason !== undefined) data.rejectionReason = body.rejectionReason
    if (body.approvalDate !== undefined) data.approvalDate = body.approvalDate
    if (body.disbursementDate !== undefined) data.disbursementDate = body.disbursementDate
    if (body.reviewedBy !== undefined) data.reviewedBy = body.reviewedBy
    if (body.approvedBy !== undefined) data.approvedBy = body.approvedBy

    const loan = await db.loanApplication.update({
      where: { id },
      data,
    })

    return NextResponse.json(loan)
  } catch (error) {
    console.error('Failed to update loan application:', error)
    return NextResponse.json({ error: 'Failed to update loan application' }, { status: 500 })
  }
}

// DELETE /api/loans/[id] - Reject a loan application
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.loanApplication.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Loan application not found' }, { status: 404 })
    }

    // Only allow rejection for PENDING or UNDER_REVIEW applications
    if (existing.status !== 'PENDING' && existing.status !== 'UNDER_REVIEW') {
      return NextResponse.json(
        { error: 'Only PENDING or UNDER_REVIEW applications can be rejected.' },
        { status: 400 }
      )
    }

    const loan = await db.loanApplication.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: 'Rejected by administrator',
      },
    })

    return NextResponse.json({
      message: 'Loan application rejected.',
      loan,
    })
  } catch (error) {
    console.error('Failed to reject loan application:', error)
    return NextResponse.json({ error: 'Failed to reject loan application' }, { status: 500 })
  }
}
