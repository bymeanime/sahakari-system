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
      const loan = await db.loanApplication.findUnique({
        where: { applicationNo: body.applicationNo },
      })
      if (!loan) {
        return NextResponse.json({ error: 'Loan application not found' }, { status: 404 })
      }
      const memberShares = await db.shareHolding.aggregate({
        where: { memberId: loan.memberId, status: 'ACTIVE' },
        _sum: { shareCount: true },
      })
      if ((memberShares._sum.shareCount || 0) < 5) {
        return NextResponse.json(
          { error: 'Member must hold minimum shares for loan eligibility / ऋण योग्यताको लागि सदस्यले न्यूनतम शेयर राख्नुपर्छ' },
          { status: 400 }
        )
      }

      const approvedLoan = await db.loanApplication.update({
        where: { applicationNo: body.applicationNo },
        data: {
          status: 'APPROVED',
          approvedAmount: body.approvedAmount,
          interestRate: body.interestRate,
          loanType: body.loanType || loan.loanType || 'EMI',
          processingFee: body.processingFee || 0,
          insuranceCharge: body.insuranceCharge || 0,
          serviceCharge: body.serviceCharge || 0,
          totalCharges: (body.processingFee || 0) + (body.insuranceCharge || 0) + (body.serviceCharge || 0),
          penaltyRate: body.penaltyRate || 0,
          approvalDate: new Date().toISOString().split('T')[0],
          reviewedBy: body.reviewedBy || 'ADMIN',
          approvedBy: body.approvedBy || 'ADMIN',
        },
      })
      return NextResponse.json(approvedLoan)
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

      // Create corresponding Payment Voucher for loan disbursement
      try {
        const org = await db.organization.findFirst()
        const orgId = org?.id || 'org-sahakari-001'
        const product = await db.loanProduct.findUnique({ where: { id: loan.productId } })

        let loanReceivableAccount = await db.account.findFirst({ where: { code: '1131', organizationId: orgId } })
        if (product?.code?.includes('BIZ')) loanReceivableAccount = await db.account.findFirst({ where: { code: '1132', organizationId: orgId } })
        else if (product?.code?.includes('EMG')) loanReceivableAccount = await db.account.findFirst({ where: { code: '1133', organizationId: orgId } })
        else if (product?.code?.includes('AGR')) loanReceivableAccount = await db.account.findFirst({ where: { code: '1134', organizationId: orgId } })
        else if (product?.code?.includes('EDU')) loanReceivableAccount = await db.account.findFirst({ where: { code: '1135', organizationId: orgId } })

        if (!loanReceivableAccount) loanReceivableAccount = await db.account.findFirst({ where: { code: '1130', organizationId: orgId } })
        if (!loanReceivableAccount) loanReceivableAccount = await db.account.findFirst({ where: { subType: 'RECEIVABLE', type: 'ASSET', organizationId: orgId } })

        const cashAccount = await db.account.findFirst({ where: { subType: 'CASH', organizationId: orgId } })
        const bankAccount = await db.account.findFirst({ where: { subType: 'BANK', organizationId: orgId } })
        const paymentAccount = bankAccount || cashAccount

        if (loanReceivableAccount && paymentAccount) {
          const lastEntry = await db.journalEntry.findFirst({ where: { voucherNo: { startsWith: 'PV' } }, orderBy: { voucherNo: 'desc' } })
          const nextNum = lastEntry ? parseInt(lastEntry.voucherNo.replace('PV-', '')) + 1 : 1
          const voucherNo = `PV-${String(nextNum).padStart(4, '0')}`

          await db.journalEntry.create({
            data: {
              voucherNo,
              date: new Date().toISOString().split('T')[0],
              narration: `Loan disbursement - ${body.applicationNo} / ऋण वितरण`,
              entryType: 'PAYMENT',
              status: 'POSTED',
              postedBy: 'SYSTEM',
              postedAt: new Date(),
              items: {
                create: [
                  { accountId: loanReceivableAccount.id, debit: body.disbursedAmount, credit: 0, description: `Loan disbursed - ${body.applicationNo}` },
                  { accountId: paymentAccount.id, debit: 0, credit: body.disbursedAmount, description: `Payment for loan - ${body.applicationNo}` },
                ],
              },
            },
          })
        }
      } catch (jeError) {
        console.error('Journal entry creation failed for loan disbursement:', jeError)
      }

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

    // Get loan product for charges
    const product = body.productId ? await db.loanProduct.findUnique({ where: { id: body.productId } }) : null

    const processingFee = body.processingFee || product?.processingFee || 0
    const insuranceCharge = body.insuranceCharge || product?.insuranceCharge || 0
    const serviceCharge = body.serviceCharge || product?.serviceCharge || 0
    const totalCharges = processingFee + insuranceCharge + serviceCharge
    const loanType = body.loanType || product?.loanType || 'EMI'
    const penaltyRate = body.penaltyRate || product?.penaltyRate || 0

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
        loanType,
        processingFee,
        insuranceCharge,
        serviceCharge,
        totalCharges,
        penaltyRate,
      },
    })

    return NextResponse.json(application, { status: 201 })
  } catch (error) {
    console.error('Loan error:', error)
    return NextResponse.json({ error: 'Failed to process loan' }, { status: 500 })
  }
}
