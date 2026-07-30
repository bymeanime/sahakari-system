import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/savings - List all savings accounts
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const productId = searchParams.get('productId')

    const where: any = {}
    if (status && status !== 'ALL') where.status = status
    if (productId) where.productId = productId

    const accounts = await db.savingsAccount.findMany({
      where,
      include: { product: true, member: { select: { memberNo: true, firstName: true, lastName: true, firstNameNep: true, lastNameNep: true } } },
      orderBy: { accountNo: 'asc' },
    })

    const products = await db.savingsProduct.findMany({ where: { isActive: true } })

    return NextResponse.json({ accounts, products })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch savings' }, { status: 500 })
  }
}

// POST /api/savings - Create new savings account or deposit/withdraw
export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (body.action === 'deposit') {
      const account = await db.savingsAccount.update({
        where: { accountNo: body.accountNo },
        data: { balance: { increment: body.amount } },
      })
      await db.savingsTransaction.create({
        data: {
          accountNo: body.accountNo,
          type: 'DEPOSIT',
          amount: body.amount,
          balanceAfter: account.balance,
          description: body.description || 'Cash deposit',
          transactionDate: body.date || new Date().toISOString().split('T')[0],
          processedBy: body.processedBy || 'ADMIN',
        },
      })
      return NextResponse.json(account)
    }

    if (body.action === 'withdraw') {
      const account = await db.savingsAccount.update({
        where: { accountNo: body.accountNo },
        data: { balance: { decrement: body.amount } },
      })
      await db.savingsTransaction.create({
        data: {
          accountNo: body.accountNo,
          type: 'WITHDRAWAL',
          amount: body.amount,
          balanceAfter: account.balance,
          description: body.description || 'Cash withdrawal',
          transactionDate: body.date || new Date().toISOString().split('T')[0],
          processedBy: body.processedBy || 'ADMIN',
        },
      })
      return NextResponse.json(account)
    }

    // Create new account
    const lastAccount = await db.savingsAccount.findFirst({ orderBy: { accountNo: 'desc' } })
    const nextNum = lastAccount ? parseInt(lastAccount.accountNo.replace('SA-', '')) + 1 : 1
    const accountNo = `SA-${String(nextNum).padStart(3, '0')}`

    const account = await db.savingsAccount.create({
      data: {
        accountNo,
        memberId: body.memberId,
        productId: body.productId,
        balance: body.initialDeposit || 0,
        interestEarned: 0,
        openedDate: body.openedDate || new Date().toISOString().split('T')[0],
        status: 'ACTIVE',
        nominiName: body.nominiName || null,
        nominiRelation: body.nominiRelation || null,
      },
    })

    if (body.initialDeposit && body.initialDeposit > 0) {
      await db.savingsTransaction.create({
        data: {
          accountNo: account.accountNo,
          type: 'DEPOSIT',
          amount: body.initialDeposit,
          balanceAfter: body.initialDeposit,
          description: 'Opening deposit',
          transactionDate: body.openedDate || new Date().toISOString().split('T')[0],
          processedBy: body.processedBy || 'ADMIN',
        },
      })
    }

    return NextResponse.json(account, { status: 201 })
  } catch (error) {
    console.error('Savings error:', error)
    return NextResponse.json({ error: 'Failed to process savings' }, { status: 500 })
  }
}
