import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// -----------------------------------------------------------
// Zod Validation Schemas (Fix 11)
// -----------------------------------------------------------

const depositSchema = z.object({
  action: z.literal('deposit'),
  accountNo: z.string().regex(/^SA-\d{3,}$/, 'Account number must be in format SA-XXX'),
  amount: z.number().positive('Amount must be a positive number'),
  description: z.string().optional(),
  date: z.string().optional(),
  processedBy: z.string().optional(),
})

const withdrawalSchema = z.object({
  action: z.literal('withdraw'),
  accountNo: z.string().regex(/^SA-\d{3,}$/, 'Account number must be in format SA-XXX'),
  amount: z.number().positive('Amount must be a positive number'),
  description: z.string().optional(),
  date: z.string().optional(),
  processedBy: z.string().optional(),
})

const createAccountSchema = z.object({
  memberId: z.string().min(1, 'Member ID is required'),
  productId: z.string().min(1, 'Product ID is required'),
  initialDeposit: z.number().min(0, 'Initial deposit cannot be negative').optional(),
  openedDate: z.string().optional(),
  nominiName: z.string().optional(),
  nominiRelation: z.string().optional(),
  processedBy: z.string().optional(),
})

const savingsActionSchema = z.discriminatedUnion('action', [
  depositSchema,
  withdrawalSchema,
  createAccountSchema,
])

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

    // Validate input with Zod
    const parsed = savingsActionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const data = parsed.data

    // --- DEPOSIT ---
    if (data.action === 'deposit') {
      const result = await db.$transaction(async (tx) => {
        const account = await tx.savingsAccount.findUnique({
          where: { accountNo: data.accountNo },
          include: { product: true },
        })

        if (!account) {
          throw new Error('Account not found / खाता भेटिएन')
        }

        // Account status validation: only ACTIVE or DORMANT accounts can accept deposits
        if (account.status !== 'ACTIVE' && account.status !== 'DORMANT') {
          throw new Error(`Cannot deposit to ${account.status} account / ${account.status} खातामा जम्मा गर्न सकिँदैन`)
        }

        // Reactivate DORMANT account on deposit
        const updateData: any = { balance: { increment: data.amount } }
        if (account.status === 'DORMANT') {
          updateData.status = 'ACTIVE'
        }

        const updatedAccount = await tx.savingsAccount.update({
          where: { accountNo: data.accountNo },
          data: updateData,
        })

        await tx.savingsTransaction.create({
          data: {
            accountNo: data.accountNo,
            type: 'DEPOSIT',
            amount: data.amount,
            balanceAfter: updatedAccount.balance,
            description: data.description || (account.status === 'DORMANT' ? 'Reactivation deposit / पुनः सक्रिय जम्मा' : 'Cash deposit'),
            transactionDate: data.date || new Date().toISOString().split('T')[0],
            processedBy: data.processedBy || 'ADMIN',
          },
        })

        // Create corresponding journal entry (Receipt Voucher) for double-entry
        try {
          const org = await tx.organization.findFirst()
          const orgId = org?.id || 'org-sahakari-001'
          // Find Cash and Savings Deposit accounts
          const cashAccount = await tx.account.findFirst({ where: { subType: 'CASH', organizationId: orgId } })
          const savingsDepositAccount = await tx.account.findFirst({ where: { code: '2110', organizationId: orgId } })
            || await tx.account.findFirst({ where: { code: '2100', organizationId: orgId } })
            || await tx.account.findFirst({ where: { subType: 'PAYABLE', type: 'LIABILITY', organizationId: orgId } })

          if (cashAccount && savingsDepositAccount) {
            const lastEntry = await tx.journalEntry.findFirst({ where: { voucherNo: { startsWith: 'RV' } }, orderBy: { voucherNo: 'desc' } })
            const nextNum = lastEntry ? parseInt(lastEntry.voucherNo.replace('RV-', '')) + 1 : 1
            const voucherNo = `RV-${String(nextNum).padStart(4, '0')}`

            await tx.journalEntry.create({
              data: {
                voucherNo,
                date: data.date || new Date().toISOString().split('T')[0],
                narration: `Savings deposit - ${data.accountNo} / बचत निक्षेप`,
                entryType: 'RECEIPT',
                status: 'POSTED',
                postedBy: data.processedBy || 'SYSTEM',
                postedAt: new Date(),
                items: {
                  create: [
                    { accountId: cashAccount.id, debit: data.amount, credit: 0, description: `Cash received - ${data.accountNo}` },
                    { accountId: savingsDepositAccount.id, debit: 0, credit: data.amount, description: `Savings deposit - ${data.accountNo}` },
                  ],
                },
              },
            })
          }
        } catch (jeError) {
          // Journal entry creation failure should not block the deposit
          console.error('Journal entry creation failed for deposit:', jeError)
        }

        return updatedAccount
      })

      return NextResponse.json(result)
    }

    // --- WITHDRAWAL ---
    if (data.action === 'withdraw') {
      const result = await db.$transaction(async (tx) => {
        const account = await tx.savingsAccount.findUnique({
          where: { accountNo: data.accountNo },
          include: { product: true },
        })

        if (!account) {
          throw new Error('Account not found / खाता भेटिएन')
        }

        // Account status validation: only ACTIVE accounts can withdraw
        if (account.status !== 'ACTIVE') {
          throw new Error(`Cannot withdraw from ${account.status} account / ${account.status} खाताबाट निकासा गर्न सकिँदैन`)
        }

        // Check minimum balance constraint
        const minBalance = account.product?.minBalance || 0
        const balanceAfterWithdrawal = account.balance - data.amount
        if (balanceAfterWithdrawal < minBalance) {
          throw new Error(
            `Insufficient balance. Minimum balance requirement: Rs. ${minBalance}. Available for withdrawal: Rs. ${account.balance - minBalance} / ` +
            `अपर्याप्त शेष। न्यूनतम शेष आवश्यकता: रु. ${minBalance}। निकासा योग्य: रु. ${account.balance - minBalance}`
          )
        }

        // Check lock-in period
        if (account.product?.lockInPeriod) {
          const openedDate = new Date(account.openedDate)
          const lockInEndDate = new Date(openedDate)
          lockInEndDate.setMonth(lockInEndDate.getMonth() + account.product.lockInPeriod)
          if (new Date() < lockInEndDate) {
            throw new Error(
              `Account is in lock-in period until ${lockInEndDate.toISOString().split('T')[0]}. Withdrawal not allowed / ` +
              `खाता ${lockInEndDate.toISOString().split('T')[0]} सम्म लक-इन अवधिमा छ। निकासा गर्न सकिँदैन`
            )
          }
        }

        // Check withdrawal limit from product
        if (account.product?.withdrawalLimit && data.amount > account.product.withdrawalLimit) {
          throw new Error(
            `Withdrawal amount exceeds product limit of Rs. ${account.product.withdrawalLimit} / ` +
            `निकासा रकम उत्पादन सीमा रु. ${account.product.withdrawalLimit} भन्दा बढी छ`
          )
        }

        // Check sufficient balance
        if (account.balance < data.amount) {
          throw new Error(
            `Insufficient balance. Current balance: Rs. ${account.balance} / ` +
            `अपर्याप्त शेष। हालको शेष: रु. ${account.balance}`
          )
        }

        const updatedAccount = await tx.savingsAccount.update({
          where: { accountNo: data.accountNo },
          data: { balance: { decrement: data.amount } },
        })

        await tx.savingsTransaction.create({
          data: {
            accountNo: data.accountNo,
            type: 'WITHDRAWAL',
            amount: data.amount,
            balanceAfter: updatedAccount.balance,
            description: data.description || 'Cash withdrawal',
            transactionDate: data.date || new Date().toISOString().split('T')[0],
            processedBy: data.processedBy || 'ADMIN',
          },
        })

        // Create corresponding journal entry (Payment Voucher) for double-entry
        try {
          const org = await tx.organization.findFirst()
          const orgId = org?.id || 'org-sahakari-001'
          const cashAccount = await tx.account.findFirst({ where: { subType: 'CASH', organizationId: orgId } })
          const savingsDepositAccount = await tx.account.findFirst({ where: { code: '2110', organizationId: orgId } })
            || await tx.account.findFirst({ where: { code: '2100', organizationId: orgId } })
            || await tx.account.findFirst({ where: { subType: 'PAYABLE', type: 'LIABILITY', organizationId: orgId } })

          if (cashAccount && savingsDepositAccount) {
            const lastEntry = await tx.journalEntry.findFirst({ where: { voucherNo: { startsWith: 'PV' } }, orderBy: { voucherNo: 'desc' } })
            const nextNum = lastEntry ? parseInt(lastEntry.voucherNo.replace('PV-', '')) + 1 : 1
            const voucherNo = `PV-${String(nextNum).padStart(4, '0')}`

            await tx.journalEntry.create({
              data: {
                voucherNo,
                date: data.date || new Date().toISOString().split('T')[0],
                narration: `Savings withdrawal - ${data.accountNo} / बचत निकासा`,
                entryType: 'PAYMENT',
                status: 'POSTED',
                postedBy: data.processedBy || 'SYSTEM',
                postedAt: new Date(),
                items: {
                  create: [
                    { accountId: savingsDepositAccount.id, debit: data.amount, credit: 0, description: `Savings withdrawal - ${data.accountNo}` },
                    { accountId: cashAccount.id, debit: 0, credit: data.amount, description: `Cash paid - ${data.accountNo}` },
                  ],
                },
              },
            })
          }
        } catch (jeError) {
          console.error('Journal entry creation failed for withdrawal:', jeError)
        }

        return updatedAccount
      })

      return NextResponse.json(result)
    }

    // --- CREATE NEW ACCOUNT ---
    const lastAccount = await db.savingsAccount.findFirst({ orderBy: { accountNo: 'desc' } })
    const nextNum = lastAccount ? parseInt(lastAccount.accountNo.replace('SA-', '')) + 1 : 1
    const accountNo = `SA-${String(nextNum).padStart(3, '0')}`

    const account = await db.savingsAccount.create({
      data: {
        accountNo,
        memberId: data.memberId,
        productId: data.productId,
        balance: data.initialDeposit || 0,
        interestEarned: 0,
        openedDate: data.openedDate || new Date().toISOString().split('T')[0],
        status: 'ACTIVE',
        nominiName: data.nominiName || null,
        nominiRelation: data.nominiRelation || null,
      },
    })

    if (data.initialDeposit && data.initialDeposit > 0) {
      await db.savingsTransaction.create({
        data: {
          accountNo: account.accountNo,
          type: 'DEPOSIT',
          amount: data.initialDeposit,
          balanceAfter: data.initialDeposit,
          description: 'Opening deposit',
          transactionDate: data.openedDate || new Date().toISOString().split('T')[0],
          processedBy: data.processedBy || 'ADMIN',
        },
      })
    }

    return NextResponse.json(account, { status: 201 })
  } catch (error: any) {
    console.error('Savings error:', error)
    // Return meaningful error messages from transaction validation
    const message = error?.message || 'Failed to process savings'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
