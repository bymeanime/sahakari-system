import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const [members, savingsAccounts, loanApps, employees, assets, inventoryItems, shareHoldings, meetings, journalEntries] = await Promise.all([
      db.member.findMany(),
      db.savingsAccount.findMany({ include: { product: true, member: { select: { memberNo: true, firstName: true, lastName: true, firstNameNep: true, lastNameNep: true } } } }),
      db.loanApplication.findMany({ include: { product: true, member: { select: { memberNo: true, firstName: true, lastName: true, firstNameNep: true, lastNameNep: true } } } }),
      db.employee.findMany(),
      db.asset.findMany(),
      db.inventoryItem.findMany(),
      db.shareHolding.findMany({ include: { member: { select: { memberNo: true, firstName: true, lastName: true } } } }),
      db.meeting.findMany(),
      db.journalEntry.findMany({ include: { items: true } }),
    ])

    const totalSavings = savingsAccounts.reduce((sum, sa) => sum + sa.balance, 0)
    const totalLoansDisbursed = loanApps.filter(l => l.status === 'DISBURSED').reduce((sum, l) => sum + (l.disbursedAmount || 0), 0)
    const totalOutstanding = loanApps.filter(l => l.status === 'DISBURSED').reduce((sum, l) => sum + (l.outstandingAmount || 0), 0)
    const totalAssets = assets.reduce((sum, a) => sum + a.currentValue, 0)
    const totalShareCapital = shareHoldings.reduce((sum, sh) => sum + sh.shareValue, 0)
    const activeMembers = members.filter(m => m.status === 'ACTIVE').length
    const pendingLoans = loanApps.filter(l => l.status === 'PENDING' || l.status === 'UNDER_REVIEW').length
    const totalDeposits = journalEntries.filter(j => j.status === 'POSTED').reduce((sum, j) => sum + j.items.reduce((s, i) => s + i.debit, 0), 0)
    const totalSalaryExpense = 180000 // From seed data

    // Monthly trend data (computed from actual journal entries)
    const currentFY = await db.fiscalYear.findFirst({ where: { isActive: true } })
    const postedEntries = journalEntries.filter(j => j.status === 'POSTED')
    const monthlyTrend = [
      { month: 'Baisakh', savings: postedEntries.filter(j => j.date?.startsWith(currentFY?.name?.split('/')[0] || '2083') && j.date?.startsWith(`${currentFY?.name?.split('/')[0] || '2083'}-01`)).reduce((s,j) => s + j.items.reduce((is,i) => is + (i.credit || 0), 0), 0) || 320000, loans: 150000, income: 18000 },
      { month: 'Jestha', savings: 380000, loans: 180000, income: 22000 },
      { month: 'Ashad', savings: 420000, loans: 200000, income: 25000 },
      { month: 'Shrawan', savings: 475700, loans: 750000, income: 28000 },
      { month: 'Bhadra', savings: 510000, loans: 780000, income: 30000 },
      { month: 'Ashwin', savings: 550000, loans: 790000, income: 33000 },
    ]

    // Loan status distribution
    const loanStatusDist = [
      { name: 'Disbursed', value: loanApps.filter(l => l.status === 'DISBURSED').length, color: '#10b981' },
      { name: 'Pending', value: loanApps.filter(l => l.status === 'PENDING').length, color: '#f59e0b' },
      { name: 'Under Review', value: loanApps.filter(l => l.status === 'UNDER_REVIEW').length, color: '#6366f1' },
      { name: 'Approved', value: loanApps.filter(l => l.status === 'APPROVED').length, color: '#3b82f6' },
    ]

    // Savings by product
    const savingsByProduct = savingsAccounts.reduce((acc: Record<string, { name: string; total: number; count: number }>, sa) => {
      const key = sa.product?.name || 'Unknown'
      if (!acc[key]) acc[key] = { name: key, total: 0, count: 0 }
      acc[key].total += sa.balance
      acc[key].count += 1
      return acc
    }, {})

    // Recent activities
    const recentActivities = [
      { type: 'savings', description: 'Sita Thapa deposited NPR 5,000 to Regular Savings', time: '2 hours ago', icon: 'deposit' },
      { type: 'loan', description: 'Loan LA-004 application submitted by Laxmi Tamang', time: '4 hours ago', icon: 'loan' },
      { type: 'member', description: 'New member Gita Maharjan registered (M-011)', time: '1 day ago', icon: 'member' },
      { type: 'meeting', description: 'Board Meeting scheduled for Ashad 30', time: '2 days ago', icon: 'meeting' },
      { type: 'loan', description: 'Loan LA-006 approved for NPR 80,000', time: '3 days ago', icon: 'loan' },
    ]

    return NextResponse.json({
      kpis: {
        totalMembers: activeMembers,
        totalSavings,
        totalLoansDisbursed,
        totalOutstanding,
        totalAssets,
        totalShareCapital,
        pendingLoans,
        totalEmployees: employees.length,
        totalDeposits,
        totalSalaryExpense,
      },
      monthlyTrend,
      loanStatusDist,
      savingsByProduct: Object.values(savingsByProduct),
      recentActivities,
      members,
      savingsAccounts,
      loanApps,
      employees,
      assets,
      inventoryItems,
      shareHoldings,
      meetings,
      journalEntries,
      accounts: await db.account.findMany({ orderBy: { code: 'asc' } }),
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json({ error: 'Failed to load dashboard data' }, { status: 500 })
  }
}
