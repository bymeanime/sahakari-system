import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/savings/[id] - Get a single savings account by id
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const account = await db.savingsAccount.findUnique({
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
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    })

    if (!account) {
      return NextResponse.json({ error: 'Savings account not found' }, { status: 404 })
    }

    return NextResponse.json(account)
  } catch (error) {
    console.error('Failed to fetch savings account:', error)
    return NextResponse.json({ error: 'Failed to fetch savings account' }, { status: 500 })
  }
}

// PUT /api/savings/[id] - Update a savings account
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.savingsAccount.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Savings account not found' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (body.status !== undefined) data.status = body.status
    if (body.nominiName !== undefined) data.nominiName = body.nominiName
    if (body.nominiRelation !== undefined) data.nominiRelation = body.nominiRelation
    if (body.closedDate !== undefined) data.closedDate = body.closedDate

    // If status is being set to CLOSED, also set closedDate if not provided
    if (body.status === 'CLOSED' && !body.closedDate) {
      data.closedDate = new Date().toISOString().split('T')[0]
    }

    const account = await db.savingsAccount.update({
      where: { id },
      data,
    })

    return NextResponse.json(account)
  } catch (error) {
    console.error('Failed to update savings account:', error)
    return NextResponse.json({ error: 'Failed to update savings account' }, { status: 500 })
  }
}

// DELETE /api/savings/[id] - Close a savings account (soft delete)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.savingsAccount.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Savings account not found' }, { status: 404 })
    }

    if (existing.status === 'CLOSED') {
      return NextResponse.json({ error: 'Account is already closed' }, { status: 400 })
    }

    const account = await db.savingsAccount.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedDate: new Date().toISOString().split('T')[0],
      },
    })

    return NextResponse.json({
      message: 'Savings account closed successfully.',
      account,
    })
  } catch (error) {
    console.error('Failed to close savings account:', error)
    return NextResponse.json({ error: 'Failed to close savings account' }, { status: 500 })
  }
}
