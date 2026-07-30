import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const [loanApps, members, savingsAccounts] = await Promise.all([
      db.loanApplication.findMany({
        where: { status: 'DISBURSED' },
        include: { member: { select: { firstName: true, lastName: true, phone: true } }, product: true },
      }),
      db.member.findMany({ where: { status: 'ACTIVE' } }),
      db.savingsAccount.findMany({
        where: { status: 'DORMANT' },
        include: { member: { select: { firstName: true, lastName: true } } },
      }),
    ])

    const notifications: Array<{
      id: string
      type: string
      title: string
      message: string
      messageNep: string
      severity: string
      date: string
      memberId?: string
      memberName?: string
      action?: string
    }> = []

    // EMI Due Reminders
    loanApps.forEach(loan => {
      if (loan.nextDueDate && loan.emiAmount) {
        notifications.push({
          id: `emi-${loan.applicationNo}`,
          type: 'EMI_DUE',
          title: 'EMI Due Reminder',
          message: `${loan.member?.firstName} ${loan.member?.lastName} - EMI of NPR ${loan.emiAmount.toLocaleString()} due for ${loan.applicationNo}`,
          messageNep: `${loan.member?.firstName} ${loan.member?.lastName} - ${loan.applicationNo} को NPR ${loan.emiAmount.toLocaleString()} किस्ता बक्यौता`,
          severity: 'WARNING',
          date: loan.nextDueDate,
          memberName: `${loan.member?.firstName} ${loan.member?.lastName}`,
          action: 'SEND_SMS',
        })
      }
    })

    // Overdue Loans
    loanApps.forEach(loan => {
      if (loan.outstandingAmount && loan.outstandingAmount > 0) {
        const daysSinceDisbursement = loan.disbursementDate ? 
          Math.floor((Date.now() - new Date(loan.disbursementDate).getTime()) / (1000 * 60 * 60 * 24)) : 0
        if (daysSinceDisbursement > 30) {
          notifications.push({
            id: `overdue-${loan.applicationNo}`,
            type: 'LOAN_OVERDUE',
            title: 'Overdue Loan',
            message: `${loan.member?.firstName} ${loan.member?.lastName} has an overdue amount of NPR ${loan.outstandingAmount.toLocaleString()}`,
            messageNep: `${loan.member?.firstName} ${loan.member?.lastName} को NPR ${loan.outstandingAmount.toLocaleString()} ऋण बक्यौता भएको`,
            severity: 'ERROR',
            date: loan.disbursementDate || '',
            memberName: `${loan.member?.firstName} ${loan.member?.lastName}`,
            action: 'SEND_SMS',
          })
        }
      }
    })

    // Pending Loan Applications
    const pendingLoans = loanApps.filter(l => l.status === 'PENDING' || l.status === 'UNDER_REVIEW')
    if (pendingLoans.length > 0) {
      notifications.push({
        id: 'pending-loans',
        type: 'PENDING_LOANS',
        title: 'Pending Loan Applications',
        message: `${pendingLoans.length} loan applications are pending review`,
        messageNep: `${pendingLoans.length} वटा ऋण आवेदन समीक्षाको लागि पेन्डिङ छन्`,
        severity: 'INFO',
        date: new Date().toISOString().split('T')[0],
        action: 'REVIEW',
      })
    }

    // Low Stock Alerts
    notifications.push({
      id: 'system-info',
      type: 'SYSTEM',
      title: 'System Running',
      message: 'Sahakari System is operational. All modules active.',
      messageNep: 'सहकारी प्रणाली सञ्चालनमा छ। सबै मोड्युल सक्रिय छन्।',
      severity: 'SUCCESS',
      date: new Date().toISOString().split('T')[0],
    })

    // Member Milestones
    members.forEach(m => {
      if (m.membershipDate) {
        const joinDate = new Date(m.membershipDate)
        const years = Math.floor((Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 365))
        if (years > 0 && years % 5 === 0) {
          notifications.push({
            id: `milestone-${m.memberNo}`,
            type: 'MILESTONE',
            title: 'Membership Milestone',
            message: `${m.firstName} ${m.lastName} has completed ${years} years of membership`,
            messageNep: `${m.firstName} ${m.lastName} ले ${years} वर्षको सदस्यता पूरा गर्नुभयो`,
            severity: 'SUCCESS',
            date: m.membershipDate,
            memberName: `${m.firstName} ${m.lastName}`,
          })
          return
        }
      }
    })

    // Dormant Accounts
    savingsAccounts.forEach(sa => {
      notifications.push({
        id: `dormant-${sa.accountNo}`,
        type: 'DORMANT_ACCOUNT',
        title: 'Dormant Savings Account',
        message: `Account ${sa.accountNo} has been dormant - no transactions for 6+ months`,
        messageNep: `खाता ${sa.accountNo} निष्क्रिय छ - ६ महिना भन्दा बढी कुनै लेनदेन छैन`,
        severity: 'WARNING',
        date: new Date().toISOString().split('T')[0],
      })
    })

    return NextResponse.json(notifications)
  } catch (error) {
    console.error('Notifications error:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}
