import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') || 'summary'

    const [members, savingsAccounts, loanApps, employees, assets, shareHoldings, journalEntries, accounts, meetings, inventoryItems] = await Promise.all([
      db.member.findMany(),
      db.savingsAccount.findMany({ include: { product: true, member: { select: { firstName: true, lastName: true } } } }),
      db.loanApplication.findMany({ include: { product: true, member: { select: { firstName: true, lastName: true } } } }),
      db.employee.findMany(),
      db.asset.findMany(),
      db.shareHolding.findMany({ include: { member: { select: { firstName: true, lastName: true } } } }),
      db.journalEntry.findMany({ include: { items: true } }),
      db.account.findMany({ orderBy: { code: 'asc' } }),
      db.meeting.findMany(),
      db.inventoryItem.findMany(),
    ])

    // Balance Sheet
    const totalAssets = assets.reduce((s, a) => s + a.currentValue, 0)
    const totalSavings = savingsAccounts.reduce((s, a) => s + a.balance, 0)
    const totalLoansDisbursed = loanApps.filter(l => l.status === 'DISBURSED').reduce((s, l) => s + (l.disbursedAmount || 0), 0)
    const totalOutstanding = loanApps.filter(l => l.status === 'DISBURSED').reduce((s, l) => s + (l.outstandingAmount || 0), 0)
    const totalShareCapital = shareHoldings.reduce((s, sh) => s + sh.shareValue, 0)
    const totalDeposits = journalEntries.filter(j => j.status === 'POSTED').reduce((sum, j) => sum + j.items.reduce((s, i) => s + i.debit, 0), 0)
    const totalSalaryExpense = employees.reduce((s, e) => s + e.salary, 0)

    // Income Statement
    const interestIncome = loanApps.filter(l => l.status === 'DISBURSED').reduce((s, l) => {
      const rate = l.interestRate || 0
      const amount = l.disbursedAmount || 0
      return s + (amount * rate / 100 / 12)
    }, 0)
    const interestExpense = savingsAccounts.reduce((s, a) => s + (a.balance * (a.product?.interestRate || 0) / 100 / 12), 0)
    const netIncome = interestIncome - interestExpense - totalSalaryExpense

    // NRB Regulatory Report Data
    const nrbReturn = {
      reportingPeriod: '2082/83',
      institutionName: 'Janata Sahakari Sanstha Ltd.',
      institutionCode: 'JSS-001',
      panNo: '301234567',
      district: 'Kathmandu',
      province: 'Bagmati',
      capitalAdequacy: {
        shareCapital: totalShareCapital,
        reserveFund: 0,
        retainedEarnings: netIncome > 0 ? netIncome : 0,
        totalCapital: totalShareCapital + (netIncome > 0 ? netIncome : 0),
        riskWeightedAssets: totalLoansDisbursed,
        capitalRatio: totalLoansDisbursed > 0 ? ((totalShareCapital / totalLoansDisbursed) * 100).toFixed(2) + '%' : 'N/A',
      },
      assetQuality: {
        totalLoans: totalLoansDisbursed,
        performingLoans: totalOutstanding,
        nonPerformingLoans: 0,
        nplRatio: '0%',
        loanLossProvision: 0,
      },
      liquidity: {
        totalDeposits: totalSavings,
        totalLiquidAssets: totalSavings * 0.15,
        liquidityRatio: '15%',
      },
      earnings: {
        interestIncome: Math.round(interestIncome),
        interestExpense: Math.round(interestExpense),
        netInterestMargin: Math.round(interestIncome - interestExpense),
        operatingExpense: totalSalaryExpense,
        returnOnAssets: totalAssets > 0 ? ((netIncome / totalAssets) * 100).toFixed(2) + '%' : 'N/A',
      },
      membership: {
        totalMembers: members.length,
        activeMembers: members.filter(m => m.status === 'ACTIVE').length,
        femaleMembers: members.filter(m => m.gender === 'FEMALE').length,
        shareHolders: shareHoldings.length,
      },
    }

    // Member Directory
    const memberDirectory = members.map(m => ({
      memberNo: m.memberNo,
      name: `${m.firstName} ${m.lastName}`,
      nameNep: m.firstNameNep && m.lastNameNep ? `${m.firstNameNep} ${m.lastNameNep}` : '',
      phone: m.phone,
      occupation: m.occupation,
      status: m.status,
      membershipDate: m.membershipDate,
      savings: savingsAccounts.filter(sa => sa.memberId === m.id).reduce((s, a) => s + a.balance, 0),
      loans: loanApps.filter(la => la.memberId === m.id && la.status === 'DISBURSED').reduce((s, l) => s + (l.outstandingAmount || 0), 0),
      shares: shareHoldings.filter(sh => sh.memberId === m.id).reduce((s, sh) => s + sh.shareCount, 0),
    }))

    // Cash Flow
    const cashFlow = {
      inflows: {
        memberDeposits: totalSavings,
        loanRepayments: totalLoansDisbursed - totalOutstanding,
        shareCapital: totalShareCapital,
        otherIncome: 0,
        totalInflows: totalSavings + (totalLoansDisbursed - totalOutstanding) + totalShareCapital,
      },
      outflows: {
        loanDisbursements: totalLoansDisbursed,
        depositWithdrawals: 0,
        salaryExpense: totalSalaryExpense,
        officeExpense: 0,
        interestPayments: Math.round(interestExpense),
        totalOutflows: totalLoansDisbursed + totalSalaryExpense + Math.round(interestExpense),
      },
      netCashFlow: totalSavings + (totalLoansDisbursed - totalOutstanding) + totalShareCapital - totalLoansDisbursed - totalSalaryExpense - Math.round(interestExpense),
    }

    return NextResponse.json({
      balanceSheet: {
        assets: { cashInHand: 120000, bankBalance: 380000, loanReceivable: totalOutstanding, fixedAssets: totalAssets, totalAssets: 120000 + 380000 + totalOutstanding + totalAssets },
        liabilities: { memberDeposits: totalSavings, shareCapital: totalShareCapital, reserveFund: 0, retainedEarnings: netIncome > 0 ? netIncome : 0, totalLiabilities: totalSavings + totalShareCapital + (netIncome > 0 ? netIncome : 0) },
      },
      incomeStatement: {
        income: { interestIncome: Math.round(interestIncome), feeIncome: 5000, otherIncome: 0, totalIncome: Math.round(interestIncome) + 5000 },
        expenses: { interestExpense: Math.round(interestExpense), salaryExpense: totalSalaryExpense, officeExpense: 15000, depreciation: assets.reduce((s, a) => s + a.accumulatedDep, 0) / 5, totalExpenses: Math.round(interestExpense) + totalSalaryExpense + 15000 },
        netIncome: Math.round(netIncome),
      },
      nrbReturn,
      memberDirectory,
      cashFlow,
      loanPortfolio: {
        totalDisbursed: totalLoansDisbursed,
        totalOutstanding,
        totalCollected: totalLoansDisbursed - totalOutstanding,
        collectionRate: totalLoansDisbursed > 0 ? (((totalLoansDisbursed - totalOutstanding) / totalLoansDisbursed) * 100).toFixed(1) + '%' : '0%',
        byProduct: loanApps.filter(l => l.status === 'DISBURSED').reduce((acc: any, l) => {
          const key = l.product?.name || 'Unknown'
          if (!acc[key]) acc[key] = { count: 0, amount: 0, outstanding: 0 }
          acc[key].count++
          acc[key].amount += l.disbursedAmount || 0
          acc[key].outstanding += l.outstandingAmount || 0
          return acc
        }, {}),
      },
      savingsReport: {
        totalBalance: totalSavings,
        totalInterest: savingsAccounts.reduce((s, a) => s + a.interestEarned, 0),
        byProduct: savingsAccounts.reduce((acc: any, sa) => {
          const key = sa.product?.name || 'Unknown'
          if (!acc[key]) acc[key] = { count: 0, balance: 0, interest: 0 }
          acc[key].count++
          acc[key].balance += sa.balance
          acc[key].interest += sa.interestEarned
          return acc
        }, {}),
      },
      assetRegister: assets,
      hrReport: {
        totalEmployees: employees.length,
        totalSalary: totalSalaryExpense,
        byDepartment: employees.reduce((acc: any, e) => {
          if (!acc[e.department]) acc[e.department] = { count: 0, salary: 0 }
          acc[e.department].count++
          acc[e.department].salary += e.salary
          return acc
        }, {}),
      },
      auditTrail: journalEntries.map(je => ({
        voucherNo: je.voucherNo,
        date: je.date,
        type: je.entryType,
        narration: je.narration,
        status: je.status,
        totalDebit: je.items.reduce((s, i) => s + i.debit, 0),
        totalCredit: je.items.reduce((s, i) => s + i.credit, 0),
      })),
    })
  } catch (error) {
    console.error('Report error:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
