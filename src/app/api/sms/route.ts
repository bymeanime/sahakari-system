import { NextResponse } from 'next/server'
import { sendEMIReminder, sendLoanApproval, sendLoanDisbursement, sendDepositConfirmation, sendWithdrawalAlert, sendBulkSMS } from '@/lib/sms'
import { db } from '@/lib/db'

// POST /api/sms - Send SMS notifications
export async function POST(request: Request) {
  try {
    const body = await request.json()

    switch (body.type) {
      case 'emi-reminder': {
        const loan = await db.loanApplication.findUnique({
          where: { id: body.loanId },
          include: { member: true },
        })
        if (!loan || !loan.member?.phone) {
          return NextResponse.json({ error: 'Loan or member phone not found' }, { status: 404 })
        }
        const result = await sendEMIReminder(
          `${loan.member.firstName} ${loan.member.lastName}`,
          loan.member.phone,
          loan.applicationNo,
          loan.emiAmount || 0,
          loan.nextDueDate || ''
        )
        return NextResponse.json({ success: true, result })
      }

      case 'loan-approval': {
        const loan = await db.loanApplication.findUnique({
          where: { id: body.loanId },
          include: { member: true },
        })
        if (!loan || !loan.member?.phone) {
          return NextResponse.json({ error: 'Loan or member phone not found' }, { status: 404 })
        }
        const result = await sendLoanApproval(
          `${loan.member.firstName} ${loan.member.lastName}`,
          loan.member.phone,
          loan.applicationNo,
          loan.approvedAmount || 0
        )
        return NextResponse.json({ success: true, result })
      }

      case 'loan-disbursement': {
        const loan = await db.loanApplication.findUnique({
          where: { id: body.loanId },
          include: { member: true },
        })
        if (!loan || !loan.member?.phone) {
          return NextResponse.json({ error: 'Loan or member phone not found' }, { status: 404 })
        }
        const result = await sendLoanDisbursement(
          `${loan.member.firstName} ${loan.member.lastName}`,
          loan.member.phone,
          loan.applicationNo,
          loan.disbursedAmount || 0
        )
        return NextResponse.json({ success: true, result })
      }

      case 'deposit-confirmation': {
        const account = await db.savingsAccount.findUnique({
          where: { id: body.accountId },
          include: { member: true },
        })
        if (!account || !account.member?.phone) {
          return NextResponse.json({ error: 'Account or member phone not found' }, { status: 404 })
        }
        const result = await sendDepositConfirmation(
          `${account.member.firstName} ${account.member.lastName}`,
          account.member.phone,
          account.accountNo,
          body.amount || 0,
          account.balance
        )
        return NextResponse.json({ success: true, result })
      }

      case 'withdrawal-alert': {
        const account = await db.savingsAccount.findUnique({
          where: { id: body.accountId },
          include: { member: true },
        })
        if (!account || !account.member?.phone) {
          return NextResponse.json({ error: 'Account or member phone not found' }, { status: 404 })
        }
        const result = await sendWithdrawalAlert(
          `${account.member.firstName} ${account.member.lastName}`,
          account.member.phone,
          account.accountNo,
          body.amount || 0,
          account.balance
        )
        return NextResponse.json({ success: true, result })
      }

      case 'bulk-sms': {
        const result = await sendBulkSMS(body.recipients, body.message)
        return NextResponse.json({ success: true, result })
      }

      case 'send-all-emi-reminders': {
        // Send EMI reminders to all loans with upcoming due dates
        const loans = await db.loanApplication.findMany({
          where: { status: 'DISBURSED', nextDueDate: { not: null } },
          include: { member: true },
        })
        const results = []
        for (const loan of loans) {
          if (loan.member?.phone) {
            try {
              const result = await sendEMIReminder(
                `${loan.member.firstName} ${loan.member.lastName}`,
                loan.member.phone,
                loan.applicationNo,
                loan.emiAmount || 0,
                loan.nextDueDate || ''
              )
              results.push({ loanNo: loan.applicationNo, success: true, result })
            } catch (err) {
              results.push({ loanNo: loan.applicationNo, success: false, error: String(err) })
            }
          }
        }
        return NextResponse.json({ success: true, sent: results.length, results })
      }

      default:
        return NextResponse.json({ error: 'Invalid SMS type' }, { status: 400 })
    }
  } catch (error) {
    console.error('SMS error:', error)
    return NextResponse.json({ error: 'Failed to send SMS' }, { status: 500 })
  }
}
