// ============================================================
// Sahakari System Management - NRB Regulatory Report Generator
// Nepal Rastra Bank (NRB) Cooperative Sector Reporting
// ============================================================
// Generates regulatory reports as per NRB directives for
// savings & credit cooperative institutions (SACCOS).
//
// Report Types:
//   balance-sheet    - निश्शेष जानकारी (Balance Sheet)
//   income-statement - आय-व्यय जानकारी (Income Statement)
//   nrb-return       - नेपाल राष्ट्र बैंक रिटर्न (NRB Quarterly Return)
//   capital-adequacy - पूँजी पर्याप्तता विवरण (Capital Adequacy Report)
//   loan-portfolio   - ऋण विवरण (Loan Portfolio Report)
//   savings-report   - बचत विवरण (Savings Report)
//   member-directory - सदस्य विवरण (Member Directory)
//   cash-flow        - नगद प्रवाह विवरण (Cash Flow Statement)
//
// Query Parameters:
//   type   - Report type (required)
//   format - Output format: 'json' (default) or 'pdf'
// ============================================================

import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// -----------------------------------------------------------
// NRB Compliance Constants
// -----------------------------------------------------------

const NRB_COMPLIANCE = {
  /** Minimum capital adequacy ratio for cooperatives (8%) */
  MIN_CAPITAL_ADEQUACY_RATIO: 8,

  /** Maximum single borrower exposure as % of capital fund (25%) */
  MAX_SINGLE_BORROWER_EXPOSURE: 25,

  /** Minimum statutory liquidity ratio (15%) */
  MIN_STATUTORY_LIQUIDITY_RATIO: 15,

  /** NPL classification and provisioning requirements */
  NPL_CLASSIFICATION: {
    PASS: { label: 'Pass', labelNep: 'सामान्य', provision: 1, provisionNep: '१%' },
    WATCH_LIST: { label: 'Watch List', labelNep: 'सतर्कता', provision: 5, provisionNep: '५%' },
    SUB_STANDARD: { label: 'Sub-standard', labelNep: 'उप-मानक', provision: 25, provisionNep: '२५%' },
    DOUBTFUL: { label: 'Doubtful', labelNep: 'शंकास्पद', provision: 50, provisionNep: '५०%' },
    LOSS: { label: 'Loss', labelNep: 'घाटा', provision: 100, provisionNep: '१००%' },
  } as const,

  /** Past due days thresholds for NPL classification (as per NRB Directive) */
  NPL_THRESHOLDS: {
    PASS: 30,           // 0-30 days past due
    WATCH_LIST: 90,     // 31-90 days past due
    SUB_STANDARD: 180,  // 91-180 days past due
    DOUBTFUL: 360,      // 181-360 days past due
    LOSS: Infinity,     // 361+ days past due
  },
} as const

// -----------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------

function formatNPR(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function toNepaliDigits(num: number | string): string {
  const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९']
  return String(num).replace(/[0-9]/g, (d) => nepaliDigits[parseInt(d)])
}

function formatNPRNepali(amount: number): string {
  const formatted = amount.toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `रु. ${toNepaliDigits(formatted)}`
}

/** Get current fiscal year in BS format */
function getCurrentFiscalYear(): string {
  const today = new Date()
  const bsYear = today.getFullYear() + 57
  // BS fiscal year: if current month is after Chaitra (mid-April), next FY
  const fiscalStart = today.getMonth() + 1 > 3 ? bsYear : bsYear - 1
  return `${fiscalStart}/${(fiscalStart + 1) % 100}`
}

/** Get previous fiscal year */
function getPreviousFiscalYear(): string {
  const current = getCurrentFiscalYear()
  const [startYear] = current.split('/').map(Number)
  return `${startYear - 1}/${startYear % 100}`
}

/** Classify NPL based on days past due */
function classifyNPL(daysPastDue: number): keyof typeof NRB_COMPLIANCE.NPL_CLASSIFICATION {
  if (daysPastDue <= NRB_COMPLIANCE.NPL_THRESHOLDS.PASS) return 'PASS'
  if (daysPastDue <= NRB_COMPLIANCE.NPL_THRESHOLDS.WATCH_LIST) return 'WATCH_LIST'
  if (daysPastDue <= NRB_COMPLIANCE.NPL_THRESHOLDS.SUB_STANDARD) return 'SUB_STANDARD'
  if (daysPastDue <= NRB_COMPLIANCE.NPL_THRESHOLDS.DOUBTFUL) return 'DOUBTFUL'
  return 'LOSS'
}

/** Calculate days past due from a due date string */
function getDaysPastDue(dueDate: string): number {
  const due = new Date(dueDate)
  const now = new Date()
  const diffMs = now.getTime() - due.getTime()
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
}

// -----------------------------------------------------------
// Data Fetching
// -----------------------------------------------------------

async function fetchReportData() {
  const [
    organization,
    members,
    savingsAccounts,
    savingsTransactions,
    savingsProducts,
    loanApplications,
    loanRepayments,
    loanProducts,
    shareHoldings,
    shareProducts,
    assets,
    accounts,
    journalEntries,
    journalEntryItems,
    employees,
    meetings,
    fiscalYears,
  ] = await Promise.all([
    db.organization.findFirst({ where: { isActive: true } }),
    db.member.findMany(),
    db.savingsAccount.findMany({
      include: {
        product: true,
        member: { select: { id: true, firstName: true, lastName: true, firstNameNep: true, lastNameNep: true, phone: true } },
      },
    }),
    db.savingsTransaction.findMany({ orderBy: { transactionDate: 'desc' } }),
    db.savingsProduct.findMany({ where: { isActive: true } }),
    db.loanApplication.findMany({
      include: {
        product: true,
        member: { select: { id: true, firstName: true, lastName: true, firstNameNep: true, lastNameNep: true, phone: true } },
        guarantor: { select: { id: true, firstName: true, lastName: true } },
        repayments: true,
      },
    }),
    db.loanRepayment.findMany({ orderBy: { paymentDate: 'desc' } }),
    db.loanProduct.findMany({ where: { isActive: true } }),
    db.shareHolding.findMany({
      include: {
        member: { select: { id: true, firstName: true, lastName: true, firstNameNep: true, lastNameNep: true } },
        product: true,
      },
    }),
    db.shareProduct.findMany({ where: { isActive: true } }),
    db.asset.findMany(),
    db.account.findMany({ orderBy: { code: 'asc' } }),
    db.journalEntry.findMany({
      where: { status: 'POSTED' },
      include: { items: { include: { debitAccount: true, creditAccount: true } } },
    }),
    db.journalEntryItem.findMany({
      include: { debitAccount: true, creditAccount: true },
    }),
    db.employee.findMany({ where: { isActive: true } }),
    db.meeting.findMany(),
    db.fiscalYear.findMany({ orderBy: { startDate: 'desc' } }),
  ])

  return {
    organization,
    members,
    savingsAccounts,
    savingsTransactions,
    savingsProducts,
    loanApplications,
    loanRepayments,
    loanProducts,
    shareHoldings,
    shareProducts,
    assets,
    accounts,
    journalEntries,
    journalEntryItems,
    employees,
    meetings,
    fiscalYears,
  }
}

// -----------------------------------------------------------
// Report Generators
// -----------------------------------------------------------

/** Institution header - common to all NRB reports */
function getInstitutionHeader(organization: Awaited<ReturnType<typeof db.organization.findFirst>>) {
  return {
    institutionName: organization?.name || 'N/A',
    institutionNameNep: organization?.nameNepali || '',
    registrationNo: organization?.registrationNo || '',
    panNo: organization?.panNo || '',
    code: organization?.code || '',
    district: organization?.district || '',
    province: organization?.province || '',
    address: organization?.address || '',
    phone: organization?.phone || '',
    email: organization?.email || '',
    wardNo: organization?.wardNo || '',
    municipality: organization?.municipality || '',
    establishedDate: organization?.establishedDate || '',
    fiscalYear: organization?.fiscalYear || getCurrentFiscalYear(),
    reportingPeriod: getCurrentFiscalYear(),
    previousPeriod: getPreviousFiscalYear(),
    generatedAt: new Date().toISOString(),
  }
}

// -----------------------------------------------------------
// 1. Balance Sheet (निश्शेष जानकारी)
// -----------------------------------------------------------

function generateBalanceSheet(data: Awaited<ReturnType<typeof fetchReportData>>) {
  const header = getInstitutionHeader(data.organization)

  // Calculate totals
  const totalSavingsDeposits = data.savingsAccounts.reduce((s, a) => s + a.balance, 0)
  const totalShareCapital = data.shareHoldings.reduce((s, sh) => s + sh.shareValue, 0)
  const totalLoanReceivable = data.loanApplications
    .filter((l) => l.status === 'DISBURSED')
    .reduce((s, l) => s + (l.outstandingAmount || 0), 0)
  const totalFixedAssets = data.assets.reduce((s, a) => s + a.currentValue, 0)
  const totalDepreciation = data.assets.reduce((s, a) => s + a.accumulatedDep, 0)
  const netFixedAssets = totalFixedAssets - totalDepreciation

  // Accounting totals from journal entries
  const totalDebits = data.journalEntries.reduce((sum, je) => sum + je.items.reduce((s, i) => s + i.debit, 0), 0)
  const totalCredits = data.journalEntries.reduce((sum, je) => sum + je.items.reduce((s, i) => s + i.credit, 0), 0)

  // Income & Expense for retained earnings
  const interestIncome = data.loanApplications
    .filter((l) => l.status === 'DISBURSED')
    .reduce((s, l) => s + ((l.disbursedAmount || 0) * (l.interestRate || 0)) / 100 / 12, 0)
  const interestExpense = data.savingsAccounts.reduce((s, a) => s + (a.balance * (a.product?.interestRate || 0)) / 100 / 12, 0)
  const totalSalaryExpense = data.employees.reduce((s, e) => s + e.salary, 0)
  const netIncome = interestIncome - interestExpense - totalSalaryExpense

  // Cash & bank balance from accounts
  const cashAccounts = data.accounts.filter((a) => a.type === 'ASSET' && (a.subType === 'CASH' || a.subType === 'BANK'))
  const cashInHand = cashAccounts.filter((a) => a.subType === 'CASH').reduce((s, a) => {
    const debitTotal = data.journalEntryItems.filter((i) => i.accountId === a.id).reduce((s, i) => s + i.debit - i.credit, 0)
    return s + Math.max(0, debitTotal)
  }, 0)
  const bankBalance = cashAccounts.filter((a) => a.subType === 'BANK').reduce((s, a) => {
    const debitTotal = data.journalEntryItems.filter((i) => i.accountId === a.id).reduce((s, i) => s + i.debit - i.credit, 0)
    return s + Math.max(0, debitTotal)
  }, 0)

  // Reserve fund (from equity accounts)
  const reserveFund = data.accounts
    .filter((a) => a.type === 'EQUITY' && a.name.toLowerCase().includes('reserve'))
    .reduce((s, a) => {
      const creditTotal = data.journalEntryItems.filter((i) => i.accountId === a.id).reduce((s, i) => s + i.credit - i.debit, 0)
      return s + Math.max(0, creditTotal)
    }, 0)

  const totalAssets = cashInHand + bankBalance + totalLoanReceivable + netFixedAssets
  const totalLiabilities = totalSavingsDeposits + totalShareCapital + reserveFund + (netIncome > 0 ? netIncome : 0)

  return {
    reportType: 'balance-sheet',
    reportTitle: 'Balance Sheet',
    reportTitleNep: 'निश्शेष जानकारी',
    header,
    nrbCompliance: {
      capitalAdequacyRatio: totalLoanReceivable > 0 ? ((totalShareCapital + reserveFund + (netIncome > 0 ? netIncome : 0)) / totalLoanReceivable) * 100 : 0,
      minRequiredRatio: NRB_COMPLIANCE.MIN_CAPITAL_ADEQUACY_RATIO,
      isCompliant: totalLoanReceivable > 0 ? ((totalShareCapital + reserveFund + (netIncome > 0 ? netIncome : 0)) / totalLoanReceivable) * 100 >= NRB_COMPLIANCE.MIN_CAPITAL_ADEQUACY_RATIO : true,
    },
    currentPeriod: {
      assets: {
        cashInHand: { amount: cashInHand, label: 'Cash in Hand', labelNep: 'हातमा नगद' },
        bankBalance: { amount: bankBalance, label: 'Bank Balance', labelNep: 'बैंक शेष' },
        loanReceivable: { amount: totalLoanReceivable, label: 'Loan Receivable', labelNep: 'ऋण उपलब्ध' },
        fixedAssets: { amount: netFixedAssets, label: 'Fixed Assets (Net)', labelNep: 'स्थायी सम्पत्ति (शुद्ध)' },
        totalAssets: { amount: totalAssets, label: 'Total Assets', labelNep: 'कुल सम्पत्ति' },
      },
      liabilities: {
        memberDeposits: { amount: totalSavingsDeposits, label: 'Member Deposits', labelNep: 'सदस्य निक्षेप' },
        shareCapital: { amount: totalShareCapital, label: 'Share Capital', labelNep: 'शेयर पूँजी' },
        reserveFund: { amount: reserveFund, label: 'Reserve Fund', labelNep: 'आरक्ष कोष' },
        retainedEarnings: { amount: netIncome > 0 ? netIncome : 0, label: 'Retained Earnings', labelNep: 'सञ्चित आय' },
        totalLiabilities: { amount: totalLiabilities, label: 'Total Liabilities & Equity', labelNep: 'कुल दायित्व र पूँजी' },
      },
    },
    previousPeriod: {
      // Previous year comparison (placeholder - would need historical data)
      note: 'Previous year figures require historical data from prior fiscal year records.',
    },
    summary: {
      totalAssets,
      totalLiabilities,
      surplus: totalAssets - totalLiabilities,
      isBalanced: Math.abs(totalAssets - totalLiabilities) < 1,
    },
    currency: 'NPR',
    currencyNep: 'नेपाली रूपैयाँ',
  }
}

// -----------------------------------------------------------
// 2. Income Statement (आय-व्यय जानकारी)
// -----------------------------------------------------------

function generateIncomeStatement(data: Awaited<ReturnType<typeof fetchReportData>>) {
  const header = getInstitutionHeader(data.organization)

  // Income calculations
  const interestIncome = data.loanApplications
    .filter((l) => l.status === 'DISBURSED')
    .reduce((s, l) => s + ((l.disbursedAmount || 0) * (l.interestRate || 0)) / 100 / 12, 0)
  const feeIncome = data.loanApplications
    .filter((l) => l.status === 'DISBURSED' || l.status === 'CLOSED')
    .reduce((s, l) => s + (l.product?.processingFee || 0), 0)
  const penaltyIncome = data.loanRepayments.reduce((s, r) => s + r.penaltyAmount, 0)

  // Expense calculations
  const interestExpense = data.savingsAccounts.reduce((s, a) => s + (a.balance * (a.product?.interestRate || 0)) / 100 / 12, 0)
  const totalSalaryExpense = data.employees.reduce((s, e) => s + e.salary, 0)
  const totalDepreciation = data.assets.reduce((s, a) => s + a.accumulatedDep, 0) / 5
  const officeExpense = data.accounts
    .filter((a) => a.type === 'EXPENSE' && a.name.toLowerCase().includes('office'))
    .reduce((s, a) => {
      const debitTotal = data.journalEntryItems.filter((i) => i.accountId === a.id).reduce((s, i) => s + i.debit, 0)
      return s + debitTotal
    }, 0)

  const totalIncome = interestIncome + feeIncome + penaltyIncome
  const totalExpenses = interestExpense + totalSalaryExpense + officeExpense + totalDepreciation
  const netIncome = totalIncome - totalExpenses

  return {
    reportType: 'income-statement',
    reportTitle: 'Income Statement',
    reportTitleNep: 'आय-व्यय जानकारी',
    header,
    currentPeriod: {
      income: {
        interestIncome: { amount: Math.round(interestIncome), label: 'Interest Income', labelNep: 'ब्याज आय' },
        feeIncome: { amount: Math.round(feeIncome), label: 'Fee & Commission Income', labelNep: 'शुल्क तथा कमिसन आय' },
        penaltyIncome: { amount: Math.round(penaltyIncome), label: 'Penalty Income', labelNep: 'जरिवाना आय' },
        otherIncome: { amount: 0, label: 'Other Income', labelNep: 'अन्य आय' },
        totalIncome: { amount: Math.round(totalIncome), label: 'Total Income', labelNep: 'कुल आय' },
      },
      expenses: {
        interestExpense: { amount: Math.round(interestExpense), label: 'Interest Expense', labelNep: 'ब्याज खर्च' },
        salaryExpense: { amount: Math.round(totalSalaryExpense), label: 'Salary & Benefits', labelNep: 'तलब तथा भत्ता' },
        officeExpense: { amount: Math.round(officeExpense), label: 'Office & Administrative', labelNep: 'कार्यालय तथा प्रशासनिक' },
        depreciation: { amount: Math.round(totalDepreciation), label: 'Depreciation', labelNep: 'ह्रासकट्टी' },
        otherExpenses: { amount: 0, label: 'Other Expenses', labelNep: 'अन्य खर्च' },
        totalExpenses: { amount: Math.round(totalExpenses), label: 'Total Expenses', labelNep: 'कुल खर्च' },
      },
      netIncome: {
        amount: Math.round(netIncome),
        label: 'Net Income / (Loss)',
        labelNep: 'खुद आय / (घाटा)',
      },
    },
    previousPeriod: {
      note: 'Previous year figures require historical data from prior fiscal year records.',
    },
    keyRatios: {
      returnOnAssets: data.assets.reduce((s, a) => s + a.currentValue, 0) > 0
        ? ((netIncome / data.assets.reduce((s, a) => s + a.currentValue, 0)) * 100).toFixed(2) + '%'
        : 'N/A',
      netInterestMargin: totalIncome > 0
        ? (((interestIncome - interestExpense) / totalIncome) * 100).toFixed(2) + '%'
        : 'N/A',
      operatingRatio: totalIncome > 0
        ? ((totalExpenses / totalIncome) * 100).toFixed(2) + '%'
        : 'N/A',
    },
    currency: 'NPR',
    currencyNep: 'नेपाली रूपैयाँ',
  }
}

// -----------------------------------------------------------
// 3. NRB Quarterly Return (नेपाल राष्ट्र बैंक रिटर्न)
// -----------------------------------------------------------

function generateNRBReturn(data: Awaited<ReturnType<typeof fetchReportData>>) {
  const header = getInstitutionHeader(data.organization)

  const totalSavingsDeposits = data.savingsAccounts.reduce((s, a) => s + a.balance, 0)
  const totalShareCapital = data.shareHoldings.reduce((s, sh) => s + sh.shareValue, 0)
  const totalLoansDisbursed = data.loanApplications
    .filter((l) => l.status === 'DISBURSED')
    .reduce((s, l) => s + (l.disbursedAmount || 0), 0)
  const totalOutstanding = data.loanApplications
    .filter((l) => l.status === 'DISBURSED')
    .reduce((s, l) => s + (l.outstandingAmount || 0), 0)
  const totalCollected = totalLoansDisbursed - totalOutstanding
  const totalFixedAssets = data.assets.reduce((s, a) => s + a.currentValue, 0)
  const totalSalaryExpense = data.employees.reduce((s, e) => s + e.salary, 0)
  const interestIncome = data.loanApplications
    .filter((l) => l.status === 'DISBURSED')
    .reduce((s, l) => s + ((l.disbursedAmount || 0) * (l.interestRate || 0)) / 100 / 12, 0)
  const interestExpense = data.savingsAccounts.reduce((s, a) => s + (a.balance * (a.product?.interestRate || 0)) / 100 / 12, 0)
  const netIncome = interestIncome - interestExpense - totalSalaryExpense

  // NPL classification
  const overdueRepayments = data.loanRepayments.filter((r) => r.status === 'OVERDUE')
  const nplByClassification: Record<string, { count: number; amount: number; provision: number }> = {
    PASS: { count: 0, amount: 0, provision: 0 },
    WATCH_LIST: { count: 0, amount: 0, provision: 0 },
    SUB_STANDARD: { count: 0, amount: 0, provision: 0 },
    DOUBTFUL: { count: 0, amount: 0, provision: 0 },
    LOSS: { count: 0, amount: 0, provision: 0 },
  }

  // Classify overdue loans
  const disbursedLoans = data.loanApplications.filter((l) => l.status === 'DISBURSED')
  disbursedLoans.forEach((loan) => {
    const overdueRepaymentsForLoan = loan.repayments.filter((r) => r.status === 'OVERDUE' || r.status === 'PENDING')
    if (overdueRepaymentsForLoan.length > 0) {
      const earliestOverdue = overdueRepaymentsForLoan.sort((a, b) => a.paymentDate.localeCompare(b.paymentDate))[0]
      const daysPastDue = getDaysPastDue(earliestOverdue.paymentDate)
      const classification = classifyNPL(daysPastDue)
      const outstanding = loan.outstandingAmount || 0
      const provisionRate = NRB_COMPLIANCE.NPL_CLASSIFICATION[classification].provision / 100

      nplByClassification[classification].count++
      nplByClassification[classification].amount += outstanding
      nplByClassification[classification].provision += outstanding * provisionRate
    } else {
      // Performing loan
      const outstanding = loan.outstandingAmount || 0
      nplByClassification.PASS.count++
      nplByClassification.PASS.amount += outstanding
      nplByClassification.PASS.provision += outstanding * 0.01 // 1% general provision
    }
  })

  const totalNPL = nplByClassification.WATCH_LIST.amount + nplByClassification.SUB_STANDARD.amount + nplByClassification.DOUBTFUL.amount + nplByClassification.LOSS.amount
  const totalProvisions = Object.values(nplByClassification).reduce((s, c) => s + c.provision, 0)
  const nplRatio = totalLoansDisbursed > 0 ? (totalNPL / totalLoansDisbursed) * 100 : 0

  // Capital adequacy (includes mandatory reserve fund per Cooperative Act 2047 Section 66)
  const reserveFund = netIncome > 0 ? Math.round(netIncome * 0.25) : 0
  const capitalFund = totalShareCapital + reserveFund + (netIncome > 0 ? netIncome : 0)

  // Risk-weighted assets calculation (Fix 3)
  // Cash: 0% risk weight, Bank balance: 0% risk weight
  // Performing loans: 100% risk weight, Fixed assets: 100% risk weight
  const cashAccounts = data.accounts.filter((a) => a.type === 'ASSET' && (a.subType === 'CASH' || a.subType === 'BANK'))
  const cashInHand = cashAccounts.filter((a) => a.subType === 'CASH').reduce((s, a) => {
    const debitTotal = data.journalEntryItems.filter((i) => i.accountId === a.id).reduce((s, i) => s + i.debit - i.credit, 0)
    return s + Math.max(0, debitTotal)
  }, 0)
  const bankBalance = cashAccounts.filter((a) => a.subType === 'BANK').reduce((s, a) => {
    const debitTotal = data.journalEntryItems.filter((i) => i.accountId === a.id).reduce((s, i) => s + i.debit - i.credit, 0)
    return s + Math.max(0, debitTotal)
  }, 0)
  const performingLoansOutstanding = totalOutstanding // 100% risk weight
  const fixedAssetsForRWA = data.assets.reduce((s, a) => s + a.currentValue, 0)
  const riskWeightedAssets = (cashInHand * 0) + (bankBalance * 0) + (performingLoansOutstanding * 1.0) + (fixedAssetsForRWA * 1.0)
  const capitalAdequacyRatio = riskWeightedAssets > 0 ? (capitalFund / riskWeightedAssets) * 100 : 0

  // Single borrower exposure
  const memberLoanExposure = disbursedLoans.reduce((acc: Record<string, number>, loan) => {
    const memberId = loan.memberId
    acc[memberId] = (acc[memberId] || 0) + (loan.outstandingAmount || 0)
    return acc
  }, {})
  const maxSingleExposure = Math.max(...Object.values(memberLoanExposure), 0)
  const singleBorrowerRatio = capitalFund > 0 ? (maxSingleExposure / capitalFund) * 100 : 0

  // Liquidity (Fix 4: actual calculation from liquid assets / total deposits)
  const liquidAssets = cashInHand + bankBalance
  const liquidityRatio = totalSavingsDeposits > 0 ? (liquidAssets / totalSavingsDeposits) * 100 : 0

  return {
    reportType: 'nrb-return',
    reportTitle: 'NRB Quarterly Return',
    reportTitleNep: 'नेपाल राष्ट्र बैंक रिटर्न',
    header,
    capitalAdequacy: {
      shareCapital: { amount: totalShareCapital, label: 'Share Capital', labelNep: 'शेयर पूँजी' },
      reserveFund: { amount: netIncome > 0 ? Math.round(netIncome * 0.25) : 0, label: 'Reserve Fund', labelNep: 'आरक्ष कोष' },
      retainedEarnings: { amount: netIncome > 0 ? Math.round(netIncome) : 0, label: 'Retained Earnings', labelNep: 'सञ्चित आय' },
      totalCapitalFund: { amount: Math.round(capitalFund), label: 'Total Capital Fund', labelNep: 'कुल पूँजी कोष' },
      riskWeightedAssets: { amount: Math.round(riskWeightedAssets), label: 'Risk-Weighted Assets', labelNep: 'जोखिम-भारित सम्पत्ति' },
      capitalAdequacyRatio: {
        value: capitalAdequacyRatio.toFixed(2) + '%',
        minimum: NRB_COMPLIANCE.MIN_CAPITAL_ADEQUACY_RATIO + '%',
        isCompliant: capitalAdequacyRatio >= NRB_COMPLIANCE.MIN_CAPITAL_ADEQUACY_RATIO,
      },
    },
    assetQuality: {
      totalLoans: { amount: Math.round(totalLoansDisbursed), label: 'Total Loans', labelNep: 'कुल ऋण' },
      performingLoans: { amount: Math.round(nplByClassification.PASS.amount), label: 'Performing Loans', labelNep: 'सामान्य ऋण' },
      nonPerformingLoans: { amount: Math.round(totalNPL), label: 'Non-Performing Loans', labelNep: 'नष्ट हुने ऋण' },
      nplRatio: {
        value: nplRatio.toFixed(2) + '%',
        label: 'NPL Ratio',
        labelNep: 'NPL अनुपात',
      },
      nplClassification: Object.entries(nplByClassification).map(([key, val]) => ({
        classification: NRB_COMPLIANCE.NPL_CLASSIFICATION[key as keyof typeof NRB_COMPLIANCE.NPL_CLASSIFICATION].label,
        classificationNep: NRB_COMPLIANCE.NPL_CLASSIFICATION[key as keyof typeof NRB_COMPLIANCE.NPL_CLASSIFICATION].labelNep,
        count: val.count,
        amount: Math.round(val.amount),
        provisionRate: NRB_COMPLIANCE.NPL_CLASSIFICATION[key as keyof typeof NRB_COMPLIANCE.NPL_CLASSIFICATION].provision + '%',
        provisionRateNep: NRB_COMPLIANCE.NPL_CLASSIFICATION[key as keyof typeof NRB_COMPLIANCE.NPL_CLASSIFICATION].provisionNep,
        provisionAmount: Math.round(val.provision),
      })),
      totalProvisions: { amount: Math.round(totalProvisions), label: 'Total Loan Loss Provisions', labelNep: 'कुल ऋण नोक्सानी बन्दोबस्त' },
    },
    singleBorrowerExposure: {
      maxSingleExposure: { amount: Math.round(maxSingleExposure), label: 'Maximum Single Borrower Exposure', labelNep: 'अधिकतम एकल ऋणी जोखिम' },
      capitalFund: { amount: Math.round(capitalFund), label: 'Capital Fund', labelNep: 'पूँजी कोष' },
      exposureRatio: {
        value: singleBorrowerRatio.toFixed(2) + '%',
        maximum: NRB_COMPLIANCE.MAX_SINGLE_BORROWER_EXPOSURE + '%',
        isCompliant: singleBorrowerRatio <= NRB_COMPLIANCE.MAX_SINGLE_BORROWER_EXPOSURE,
      },
    },
    liquidity: {
      totalDeposits: { amount: Math.round(totalSavingsDeposits), label: 'Total Deposits', labelNep: 'कुल निक्षेप' },
      liquidAssets: { amount: Math.round(liquidAssets), label: 'Liquid Assets', labelNep: 'तरल सम्पत्ति' },
      statutoryLiquidityRatio: {
        value: liquidityRatio.toFixed(2) + '%',
        minimum: NRB_COMPLIANCE.MIN_STATUTORY_LIQUIDITY_RATIO + '%',
        isCompliant: liquidityRatio >= NRB_COMPLIANCE.MIN_STATUTORY_LIQUIDITY_RATIO,
      },
    },
    earnings: {
      interestIncome: { amount: Math.round(interestIncome), label: 'Interest Income', labelNep: 'ब्याज आय' },
      interestExpense: { amount: Math.round(interestExpense), label: 'Interest Expense', labelNep: 'ब्याज खर्च' },
      netInterestMargin: { amount: Math.round(interestIncome - interestExpense), label: 'Net Interest Margin', labelNep: 'खुद ब्याज अन्तर' },
      operatingExpense: { amount: Math.round(totalSalaryExpense), label: 'Operating Expense', labelNep: 'सञ्चालन खर्च' },
      returnOnAssets: totalFixedAssets > 0 ? ((netIncome / totalFixedAssets) * 100).toFixed(2) + '%' : 'N/A',
    },
    membership: {
      totalMembers: data.members.length,
      activeMembers: data.members.filter((m) => m.status === 'ACTIVE').length,
      inactiveMembers: data.members.filter((m) => m.status === 'INACTIVE').length,
      femaleMembers: data.members.filter((m) => m.gender === 'FEMALE').length,
      maleMembers: data.members.filter((m) => m.gender === 'MALE').length,
      shareHolders: data.shareHoldings.length,
    },
    complianceSummary: {
      capitalAdequacyCompliant: capitalAdequacyRatio >= NRB_COMPLIANCE.MIN_CAPITAL_ADEQUACY_RATIO,
      singleBorrowerExposureCompliant: singleBorrowerRatio <= NRB_COMPLIANCE.MAX_SINGLE_BORROWER_EXPOSURE,
      statutoryLiquidityCompliant: liquidityRatio >= NRB_COMPLIANCE.MIN_STATUTORY_LIQUIDITY_RATIO,
      overallCompliant: capitalAdequacyRatio >= NRB_COMPLIANCE.MIN_CAPITAL_ADEQUACY_RATIO
        && singleBorrowerRatio <= NRB_COMPLIANCE.MAX_SINGLE_BORROWER_EXPOSURE
        && liquidityRatio >= NRB_COMPLIANCE.MIN_STATUTORY_LIQUIDITY_RATIO,
    },
    currency: 'NPR',
    currencyNep: 'नेपाली रूपैयाँ',
  }
}

// -----------------------------------------------------------
// 4. Capital Adequacy Report (पूँजी पर्याप्तता विवरण)
// -----------------------------------------------------------

function generateCapitalAdequacy(data: Awaited<ReturnType<typeof fetchReportData>>) {
  const header = getInstitutionHeader(data.organization)

  const totalShareCapital = data.shareHoldings.reduce((s, sh) => s + sh.shareValue, 0)
  const totalLoansDisbursed = data.loanApplications
    .filter((l) => l.status === 'DISBURSED')
    .reduce((s, l) => s + (l.disbursedAmount || 0), 0)
  const totalOutstanding = data.loanApplications
    .filter((l) => l.status === 'DISBURSED')
    .reduce((s, l) => s + (l.outstandingAmount || 0), 0)

  const interestIncome = data.loanApplications
    .filter((l) => l.status === 'DISBURSED')
    .reduce((s, l) => s + ((l.disbursedAmount || 0) * (l.interestRate || 0)) / 100 / 12, 0)
  const interestExpense = data.savingsAccounts.reduce((s, a) => s + (a.balance * (a.product?.interestRate || 0)) / 100 / 12, 0)
  const totalSalaryExpense = data.employees.reduce((s, e) => s + e.salary, 0)
  const netIncome = interestIncome - interestExpense - totalSalaryExpense

  // Capital components (includes mandatory reserve fund per Cooperative Act 2047 Section 66)
  const reserveFund = netIncome > 0 ? Math.round(netIncome * 0.25) : 0
  const tier1Capital = totalShareCapital + reserveFund + (netIncome > 0 ? netIncome : 0)
  const tier2Capital = 0 // Subordinated debt, etc. - not applicable for most cooperatives
  const totalCapital = tier1Capital + tier2Capital

  // Risk-weighted assets calculation
  const riskWeights = {
    cashAndBank: { weight: 0, label: 'Cash & Bank Balances', labelNep: 'नगद तथा बैंक शेष' },
    govtSecurities: { weight: 0, label: 'Government Securities', labelNep: 'सरकारी प्रतिभूति' },
    performingLoans: { weight: 100, label: 'Performing Loans', labelNep: 'सामान्य ऋण' },
    watchListLoans: { weight: 100, label: 'Watch List Loans', labelNep: 'सतर्कता ऋण' },
    subStandardLoans: { weight: 100, label: 'Sub-standard Loans', labelNep: 'उप-मानक ऋण' },
    doubtfulLoans: { weight: 100, label: 'Doubtful Loans', labelNep: 'शंकास्पद ऋण' },
    lossLoans: { weight: 100, label: 'Loss Loans', labelNep: 'घाटा ऋण' },
    fixedAssets: { weight: 100, label: 'Fixed Assets', labelNep: 'स्थायी सम्पत्ति' },
    otherAssets: { weight: 100, label: 'Other Assets', labelNep: 'अन्य सम्पत्ति' },
  }

  const totalFixedAssets = data.assets.reduce((s, a) => s + a.currentValue, 0)
  const totalRiskWeightedAssets = totalOutstanding + totalFixedAssets // simplified: all at 100% risk weight

  const capitalAdequacyRatio = totalRiskWeightedAssets > 0 ? (totalCapital / totalRiskWeightedAssets) * 100 : 0

  return {
    reportType: 'capital-adequacy',
    reportTitle: 'Capital Adequacy Report',
    reportTitleNep: 'पूँजी पर्याप्तता विवरण',
    header,
    capitalStructure: {
      tier1Capital: {
        paidUpCapital: { amount: totalShareCapital, label: 'Paid-up Share Capital', labelNep: 'चुक्ता शेयर पूँजी' },
        reserveFund: { amount: netIncome > 0 ? Math.round(netIncome * 0.25) : 0, label: 'Statutory Reserve Fund', labelNep: 'सांविधिक आरक्ष कोष' },
        retainedEarnings: { amount: netIncome > 0 ? Math.round(netIncome) : 0, label: 'Retained Earnings', labelNep: 'सञ्चित आय' },
        totalTier1: { amount: Math.round(tier1Capital), label: 'Total Tier 1 Capital', labelNep: 'कुल तह १ पूँजी' },
      },
      tier2Capital: {
        subordinatedDebt: { amount: 0, label: 'Subordinated Debt', labelNep: 'अधीनस्थ ऋण' },
        generalProvision: { amount: 0, label: 'General Provision (excess)', labelNep: 'सामान्य बन्दोबस्त (अतिरिक्त)' },
        totalTier2: { amount: tier2Capital, label: 'Total Tier 2 Capital', labelNep: 'कुल तह २ पूँजी' },
      },
      totalCapital: { amount: Math.round(totalCapital), label: 'Total Capital Fund', labelNep: 'कुल पूँजी कोष' },
    },
    riskWeightedAssets: {
      items: Object.entries(riskWeights).map(([key, val]) => {
        let amount = 0
        if (key === 'performingLoans') amount = totalOutstanding
        else if (key === 'fixedAssets') amount = totalFixedAssets
        else if (key === 'otherAssets') amount = 0
        return {
          ...val,
          grossAmount: amount,
          riskWeight: val.weight + '%',
          riskWeightedAmount: (amount * val.weight) / 100,
        }
      }),
      totalRiskWeightedAssets: { amount: Math.round(totalRiskWeightedAssets), label: 'Total Risk-Weighted Assets', labelNep: 'कुल जोखिम-भारित सम्पत्ति' },
    },
    capitalAdequacyRatio: {
      current: capitalAdequacyRatio.toFixed(2) + '%',
      minimumRequired: NRB_COMPLIANCE.MIN_CAPITAL_ADEQUACY_RATIO + '%',
      surplus: Math.max(0, capitalAdequacyRatio - NRB_COMPLIANCE.MIN_CAPITAL_ADEQUACY_RATIO).toFixed(2) + '%',
      deficit: Math.max(0, NRB_COMPLIANCE.MIN_CAPITAL_ADEQUACY_RATIO - capitalAdequacyRatio).toFixed(2) + '%',
      isCompliant: capitalAdequacyRatio >= NRB_COMPLIANCE.MIN_CAPITAL_ADEQUACY_RATIO,
      requiredCapital: Math.round((totalRiskWeightedAssets * NRB_COMPLIANCE.MIN_CAPITAL_ADEQUACY_RATIO) / 100),
      currentCapital: Math.round(totalCapital),
    },
    currency: 'NPR',
    currencyNep: 'नेपाली रूपैयाँ',
  }
}

// -----------------------------------------------------------
// 5. Loan Portfolio Report (ऋण विवरण)
// -----------------------------------------------------------

function generateLoanPortfolio(data: Awaited<ReturnType<typeof fetchReportData>>) {
  const header = getInstitutionHeader(data.organization)

  const disbursedLoans = data.loanApplications.filter((l) => l.status === 'DISBURSED')
  const totalDisbursed = disbursedLoans.reduce((s, l) => s + (l.disbursedAmount || 0), 0)
  const totalOutstanding = disbursedLoans.reduce((s, l) => s + (l.outstandingAmount || 0), 0)
  const totalCollected = totalDisbursed - totalOutstanding

  // By product type
  const byProduct = disbursedLoans.reduce((acc: Record<string, { count: number; disbursed: number; outstanding: number; interestRate: number }>, l) => {
    const key = l.product?.name || 'Unknown'
    if (!acc[key]) acc[key] = { count: 0, disbursed: 0, outstanding: 0, interestRate: 0 }
    acc[key].count++
    acc[key].disbursed += l.disbursedAmount || 0
    acc[key].outstanding += l.outstandingAmount || 0
    acc[key].interestRate = l.product?.interestRate || 0
    return acc
  }, {})

  // By purpose
  const byPurpose = disbursedLoans.reduce((acc: Record<string, { count: number; amount: number }>, l) => {
    const key = l.purpose || 'General'
    if (!acc[key]) acc[key] = { count: 0, amount: 0 }
    acc[key].count++
    acc[key].amount += l.disbursedAmount || 0
    return acc
  }, {})

  // NPL classification
  const nplBreakdown: Record<string, { count: number; amount: number; provision: number }> = {
    PASS: { count: 0, amount: 0, provision: 0 },
    WATCH_LIST: { count: 0, amount: 0, provision: 0 },
    SUB_STANDARD: { count: 0, amount: 0, provision: 0 },
    DOUBTFUL: { count: 0, amount: 0, provision: 0 },
    LOSS: { count: 0, amount: 0, provision: 0 },
  }

  disbursedLoans.forEach((loan) => {
    const overdueRepayments = loan.repayments.filter((r) => r.status === 'OVERDUE' || r.status === 'PENDING')
    if (overdueRepayments.length > 0) {
      const earliestOverdue = overdueRepayments.sort((a, b) => a.paymentDate.localeCompare(b.paymentDate))[0]
      const daysPastDue = getDaysPastDue(earliestOverdue.paymentDate)
      const classification = classifyNPL(daysPastDue)
      const outstanding = loan.outstandingAmount || 0
      const provisionRate = NRB_COMPLIANCE.NPL_CLASSIFICATION[classification].provision / 100

      nplBreakdown[classification].count++
      nplBreakdown[classification].amount += outstanding
      nplBreakdown[classification].provision += outstanding * provisionRate
    } else {
      const outstanding = loan.outstandingAmount || 0
      nplBreakdown.PASS.count++
      nplBreakdown.PASS.amount += outstanding
      nplBreakdown.PASS.provision += outstanding * 0.01
    }
  })

  // By member (top borrowers)
  const memberLoans = disbursedLoans.reduce((acc: Record<string, { name: string; outstanding: number; count: number }>, l) => {
    const memberId = l.memberId
    const name = `${l.member?.firstName || ''} ${l.member?.lastName || ''}`
    if (!acc[memberId]) acc[memberId] = { name, outstanding: 0, count: 0 }
    acc[memberId].outstanding += l.outstandingAmount || 0
    acc[memberId].count++
    return acc
  }, {})

  const topBorrowers = Object.values(memberLoans)
    .sort((a, b) => b.outstanding - a.outstanding)
    .slice(0, 20)

  // Guarantor analysis
  const guaranteedLoans = disbursedLoans.filter((l) => l.guarantorId)
  const totalGuaranteedAmount = guaranteedLoans.reduce((s, l) => s + (l.outstandingAmount || 0), 0)

  // Collection rate
  const collectionRate = totalDisbursed > 0 ? ((totalCollected / totalDisbursed) * 100).toFixed(1) : '0.0'

  // Overdue loans detail
  const overdueLoans = disbursedLoans
    .filter((l) => l.repayments.some((r) => r.status === 'OVERDUE' || r.status === 'PENDING'))
    .map((l) => {
      const overdueRepayments = l.repayments.filter((r) => r.status === 'OVERDUE' || r.status === 'PENDING')
      const daysPastDue = overdueRepayments.length > 0
        ? getDaysPastDue(overdueRepayments.sort((a, b) => a.paymentDate.localeCompare(b.paymentDate))[0].paymentDate)
        : 0
      return {
        applicationNo: l.applicationNo,
        memberName: `${l.member?.firstName || ''} ${l.member?.lastName || ''}`,
        disbursedAmount: l.disbursedAmount || 0,
        outstandingAmount: l.outstandingAmount || 0,
        daysPastDue,
        nplClassification: NRB_COMPLIANCE.NPL_CLASSIFICATION[classifyNPL(daysPastDue)].label,
        nplClassificationNep: NRB_COMPLIANCE.NPL_CLASSIFICATION[classifyNPL(daysPastDue)].labelNep,
        provisionRequired: (l.outstandingAmount || 0) * NRB_COMPLIANCE.NPL_CLASSIFICATION[classifyNPL(daysPastDue)].provision / 100,
        nextDueDate: l.nextDueDate || 'N/A',
      }
    })

  return {
    reportType: 'loan-portfolio',
    reportTitle: 'Loan Portfolio Report',
    reportTitleNep: 'ऋण विवरण',
    header,
    summary: {
      totalDisbursed: { amount: Math.round(totalDisbursed), label: 'Total Disbursed', labelNep: 'कुल वितरण' },
      totalOutstanding: { amount: Math.round(totalOutstanding), label: 'Total Outstanding', labelNep: 'कुल बक्यौता' },
      totalCollected: { amount: Math.round(totalCollected), label: 'Total Collected', labelNep: 'कुल संकलन' },
      collectionRate: { value: collectionRate + '%', label: 'Collection Rate', labelNep: 'संकलन दर' },
      totalLoanAccounts: { value: disbursedLoans.length, label: 'Total Loan Accounts', labelNep: 'कुल ऋण खाता' },
      guaranteedLoans: { count: guaranteedLoans.length, amount: Math.round(totalGuaranteedAmount) },
    },
    byProduct: Object.entries(byProduct).map(([name, val]) => ({
      productName: name,
      count: val.count,
      disbursed: Math.round(val.disbursed),
      outstanding: Math.round(val.outstanding),
      interestRate: val.interestRate + '%',
    })),
    byPurpose: Object.entries(byPurpose).map(([purpose, val]) => ({
      purpose,
      count: val.count,
      amount: Math.round(val.amount),
    })),
    nplAnalysis: {
      classification: Object.entries(nplBreakdown).map(([key, val]) => ({
        classification: NRB_COMPLIANCE.NPL_CLASSIFICATION[key as keyof typeof NRB_COMPLIANCE.NPL_CLASSIFICATION].label,
        classificationNep: NRB_COMPLIANCE.NPL_CLASSIFICATION[key as keyof typeof NRB_COMPLIANCE.NPL_CLASSIFICATION].labelNep,
        count: val.count,
        amount: Math.round(val.amount),
        provisionRate: NRB_COMPLIANCE.NPL_CLASSIFICATION[key as keyof typeof NRB_COMPLIANCE.NPL_CLASSIFICATION].provision + '%',
        provisionAmount: Math.round(val.provision),
      })),
      totalNPL: Math.round(nplBreakdown.WATCH_LIST.amount + nplBreakdown.SUB_STANDARD.amount + nplBreakdown.DOUBTFUL.amount + nplBreakdown.LOSS.amount),
      totalProvisions: Math.round(Object.values(nplBreakdown).reduce((s, v) => s + v.provision, 0)),
    },
    topBorrowers: topBorrowers.map((b) => ({
      name: b.name,
      outstanding: Math.round(b.outstanding),
      loanCount: b.count,
    })),
    overdueLoans,
    currency: 'NPR',
    currencyNep: 'नेपाली रूपैयाँ',
  }
}

// -----------------------------------------------------------
// 6. Savings Report (बचत विवरण)
// -----------------------------------------------------------

function generateSavingsReport(data: Awaited<ReturnType<typeof fetchReportData>>) {
  const header = getInstitutionHeader(data.organization)

  const totalBalance = data.savingsAccounts.reduce((s, a) => s + a.balance, 0)
  const totalInterestEarned = data.savingsAccounts.reduce((s, a) => s + a.interestEarned, 0)

  // By product
  const byProduct = data.savingsAccounts.reduce((acc: Record<string, { count: number; balance: number; interest: number; rate: number }>, sa) => {
    const key = sa.product?.name || 'Unknown'
    if (!acc[key]) acc[key] = { count: 0, balance: 0, interest: 0, rate: sa.product?.interestRate || 0 }
    acc[key].count++
    acc[key].balance += sa.balance
    acc[key].interest += sa.interestEarned
    return acc
  }, {})

  // By status
  const byStatus = data.savingsAccounts.reduce((acc: Record<string, { count: number; balance: number }>, sa) => {
    const key = sa.status
    if (!acc[key]) acc[key] = { count: 0, balance: 0 }
    acc[key].count++
    acc[key].balance += sa.balance
    return acc
  }, {})

  // Recent transactions
  const recentTransactions = data.savingsTransactions.slice(0, 100).map((t) => ({
    accountNo: t.accountNo,
    type: t.type,
    amount: t.amount,
    balanceAfter: t.balanceAfter,
    description: t.description,
    transactionDate: t.transactionDate,
    referenceNo: t.referenceNo,
  }))

  // Deposit vs withdrawal summary
  const totalDeposits = data.savingsTransactions.filter((t) => t.type === 'DEPOSIT').reduce((s, t) => s + t.amount, 0)
  const totalWithdrawals = data.savingsTransactions.filter((t) => t.type === 'WITHDRAWAL').reduce((s, t) => s + t.amount, 0)
  const totalInterestPaid = data.savingsTransactions.filter((t) => t.type === 'INTEREST').reduce((s, t) => s + t.amount, 0)

  // Dormant accounts (no transactions in last 6 months)
  const dormantAccounts = data.savingsAccounts.filter((sa) => sa.status === 'DORMANT')

  // Account growth
  const activeAccounts = data.savingsAccounts.filter((sa) => sa.status === 'ACTIVE').length
  const closedAccounts = data.savingsAccounts.filter((sa) => sa.status === 'CLOSED').length
  const frozenAccounts = data.savingsAccounts.filter((sa) => sa.status === 'FROZEN').length

  return {
    reportType: 'savings-report',
    reportTitle: 'Savings Report',
    reportTitleNep: 'बचत विवरण',
    header,
    summary: {
      totalBalance: { amount: Math.round(totalBalance), label: 'Total Savings Balance', labelNep: 'कुल बचत शेष' },
      totalInterestEarned: { amount: Math.round(totalInterestEarned), label: 'Total Interest Earned', labelNep: 'कुल ब्याज आर्जित' },
      totalAccounts: { value: data.savingsAccounts.length, label: 'Total Savings Accounts', labelNep: 'कुल बचत खाता' },
      activeAccounts: { value: activeAccounts, label: 'Active Accounts', labelNep: 'सक्रिय खाता' },
      dormantAccounts: { value: dormantAccounts.length, label: 'Dormant Accounts', labelNep: 'निष्क्रिय खाता' },
      closedAccounts: { value: closedAccounts, label: 'Closed Accounts', labelNep: 'बन्द खाता' },
      frozenAccounts: { value: frozenAccounts, label: 'Frozen Accounts', labelNep: 'फ्रिज खाता' },
    },
    byProduct: Object.entries(byProduct).map(([name, val]) => ({
      productName: name,
      count: val.count,
      balance: Math.round(val.balance),
      interestEarned: Math.round(val.interest),
      interestRate: val.rate + '%',
    })),
    byStatus: Object.entries(byStatus).map(([status, val]) => ({
      status,
      count: val.count,
      balance: Math.round(val.balance),
    })),
    transactionSummary: {
      totalDeposits: { amount: Math.round(totalDeposits), label: 'Total Deposits', labelNep: 'कुल निक्षेप' },
      totalWithdrawals: { amount: Math.round(totalWithdrawals), label: 'Total Withdrawals', labelNep: 'कुल निकासा' },
      totalInterestPaid: { amount: Math.round(totalInterestPaid), label: 'Total Interest Paid', labelNep: 'कुल ब्याज भुक्तानी' },
      netDepositGrowth: { amount: Math.round(totalDeposits - totalWithdrawals), label: 'Net Deposit Growth', labelNep: 'खुद निक्षेप वृद्धि' },
    },
    recentTransactions,
    currency: 'NPR',
    currencyNep: 'नेपाली रूपैयाँ',
  }
}

// -----------------------------------------------------------
// 7. Member Directory (सदस्य विवरण)
// -----------------------------------------------------------

function generateMemberDirectory(data: Awaited<ReturnType<typeof fetchReportData>>) {
  const header = getInstitutionHeader(data.organization)

  const memberDirectory = data.members.map((m) => {
    const memberSavings = data.savingsAccounts.filter((sa) => sa.memberId === m.id)
    const memberLoans = data.loanApplications.filter((la) => la.memberId === m.id && la.status === 'DISBURSED')
    const memberShares = data.shareHoldings.filter((sh) => sh.memberId === m.id)

    return {
      memberNo: m.memberNo,
      name: `${m.firstName} ${m.lastName}`,
      nameNep: m.firstNameNep && m.lastNameNep ? `${m.firstNameNep} ${m.lastNameNep}` : '',
      phone: m.phone || '',
      email: m.email || '',
      gender: m.gender || '',
      occupation: m.occupation || '',
      citizenshipNo: m.citizenshipNo || '',
      permanentAddress: m.permanentAddr || '',
      district: m.district || '',
      province: m.province || '',
      membershipDate: m.membershipDate || '',
      status: m.status,
      memberType: m.memberType,
      nomineeName: m.nomineeName || '',
      nomineeRelation: m.nomineeRelation || '',
      savings: {
        totalBalance: memberSavings.reduce((s, a) => s + a.balance, 0),
        accountCount: memberSavings.length,
        accounts: memberSavings.map((sa) => ({
          accountNo: sa.accountNo,
          product: sa.product?.name || '',
          balance: sa.balance,
          status: sa.status,
        })),
      },
      loans: {
        totalOutstanding: memberLoans.reduce((s, l) => s + (l.outstandingAmount || 0), 0),
        loanCount: memberLoans.length,
        loans: memberLoans.map((l) => ({
          applicationNo: l.applicationNo,
          product: l.product?.name || '',
          disbursedAmount: l.disbursedAmount || 0,
          outstandingAmount: l.outstandingAmount || 0,
          interestRate: l.interestRate || 0,
          status: l.status,
        })),
      },
      shares: {
        totalShares: memberShares.reduce((s, sh) => s + sh.shareCount, 0),
        totalValue: memberShares.reduce((s, sh) => s + sh.shareValue, 0),
        holdings: memberShares.map((sh) => ({
          certificateNo: sh.certificateNo || '',
          shareCount: sh.shareCount,
          shareValue: sh.shareValue,
          purchaseDate: sh.purchaseDate,
          status: sh.status,
        })),
      },
    }
  })

  // Summary statistics
  const totalMembers = data.members.length
  const activeMembers = data.members.filter((m) => m.status === 'ACTIVE').length
  const inactiveMembers = data.members.filter((m) => m.status === 'INACTIVE').length
  const resignedMembers = data.members.filter((m) => m.status === 'RESIGNED').length
  const suspendedMembers = data.members.filter((m) => m.status === 'SUSPENDED').length
  const deceasedMembers = data.members.filter((m) => m.status === 'DECEASED').length

  const byGender = {
    male: data.members.filter((m) => m.gender === 'MALE').length,
    female: data.members.filter((m) => m.gender === 'FEMALE').length,
    other: data.members.filter((m) => m.gender === 'OTHER').length,
    unspecified: data.members.filter((m) => !m.gender).length,
  }

  const byMemberType = data.members.reduce((acc: Record<string, number>, m) => {
    const type = m.memberType || 'UNSPECIFIED'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {})

  const byDistrict = data.members.reduce((acc: Record<string, number>, m) => {
    const district = m.district || 'Unknown'
    acc[district] = (acc[district] || 0) + 1
    return acc
  }, {})

  return {
    reportType: 'member-directory',
    reportTitle: 'Member Directory',
    reportTitleNep: 'सदस्य विवरण',
    header,
    summary: {
      totalMembers,
      activeMembers,
      inactiveMembers,
      resignedMembers,
      suspendedMembers,
      deceasedMembers,
      byGender,
      byMemberType,
      byDistrict,
    },
    members: memberDirectory,
    currency: 'NPR',
    currencyNep: 'नेपाली रूपैयाँ',
  }
}

// -----------------------------------------------------------
// 8. Cash Flow Statement (नगद प्रवाह विवरण)
// -----------------------------------------------------------

function generateCashFlow(data: Awaited<ReturnType<typeof fetchReportData>>) {
  const header = getInstitutionHeader(data.organization)

  const totalSavingsDeposits = data.savingsAccounts.reduce((s, a) => s + a.balance, 0)
  const totalShareCapital = data.shareHoldings.reduce((s, sh) => s + sh.shareValue, 0)
  const totalLoansDisbursed = data.loanApplications
    .filter((l) => l.status === 'DISBURSED')
    .reduce((s, l) => s + (l.disbursedAmount || 0), 0)
  const totalOutstanding = data.loanApplications
    .filter((l) => l.status === 'DISBURSED')
    .reduce((s, l) => s + (l.outstandingAmount || 0), 0)

  const interestIncome = data.loanApplications
    .filter((l) => l.status === 'DISBURSED')
    .reduce((s, l) => s + ((l.disbursedAmount || 0) * (l.interestRate || 0)) / 100 / 12, 0)
  const interestExpense = data.savingsAccounts.reduce((s, a) => s + (a.balance * (a.product?.interestRate || 0)) / 100 / 12, 0)
  const totalSalaryExpense = data.employees.reduce((s, e) => s + e.salary, 0)

  // Inflows
  const depositInflows = data.savingsTransactions.filter((t) => t.type === 'DEPOSIT').reduce((s, t) => s + t.amount, 0)
  const loanRepaymentInflows = totalLoansDisbursed - totalOutstanding
  const shareCapitalInflows = totalShareCapital
  const feeIncome = data.loanApplications
    .filter((l) => l.status === 'DISBURSED' || l.status === 'CLOSED')
    .reduce((s, l) => s + (l.product?.processingFee || 0), 0)
  const penaltyIncome = data.loanRepayments.reduce((s, r) => s + r.penaltyAmount, 0)
  const totalInflows = depositInflows + loanRepaymentInflows + shareCapitalInflows + feeIncome + penaltyIncome

  // Outflows
  const loanDisbursementOutflows = totalLoansDisbursed
  const withdrawalOutflows = data.savingsTransactions.filter((t) => t.type === 'WITHDRAWAL').reduce((s, t) => s + t.amount, 0)
  const salaryOutflows = totalSalaryExpense
  const interestPaymentOutflows = data.savingsTransactions.filter((t) => t.type === 'INTEREST').reduce((s, t) => s + t.amount, 0)
  const assetPurchaseOutflows = data.assets.reduce((s, a) => s + a.purchasePrice, 0)
  const totalOutflows = loanDisbursementOutflows + withdrawalOutflows + salaryOutflows + interestPaymentOutflows + assetPurchaseOutflows

  // Net cash flow
  const netCashFlow = totalInflows - totalOutflows

  // Operating activities
  const operatingInflows = {
    interestReceived: { amount: Math.round(loanRepaymentInflows), label: 'Interest & Principal Received', labelNep: 'ब्याज तथा मूल रकम प्राप्त' },
    feeIncome: { amount: Math.round(feeIncome), label: 'Fee Income', labelNep: 'शुल्क आय' },
    penaltyIncome: { amount: Math.round(penaltyIncome), label: 'Penalty Income', labelNep: 'जरिवाना आय' },
    totalOperatingInflows: { amount: Math.round(loanRepaymentInflows + feeIncome + penaltyIncome), label: 'Total Operating Inflows', labelNep: 'कुल सञ्चालन आगमन' },
  }
  const operatingOutflows = {
    interestPaid: { amount: Math.round(interestPaymentOutflows), label: 'Interest Paid on Deposits', labelNep: 'निक्षेपमा ब्याज भुक्तानी' },
    salaryPaid: { amount: Math.round(salaryOutflows), label: 'Salary & Benefits Paid', labelNep: 'तलब तथा भत्ता भुक्तानी' },
    officeExpenses: { amount: 0, label: 'Office & Administrative Expenses', labelNep: 'कार्यालय तथा प्रशासनिक खर्च' },
    totalOperatingOutflows: { amount: Math.round(interestPaymentOutflows + salaryOutflows), label: 'Total Operating Outflows', labelNep: 'कुल सञ्चालन जाने' },
  }
  const netOperatingCash = operatingInflows.totalOperatingInflows.amount - operatingOutflows.totalOperatingOutflows.amount

  // Investing activities
  const investingInflows = {
    assetSale: { amount: 0, label: 'Proceeds from Asset Sale', labelNep: 'सम्पत्ति बिक्रीबाट प्राप्त' },
    totalInvestingInflows: { amount: 0, label: 'Total Investing Inflows', labelNep: 'कुल लगानी आगमन' },
  }
  const investingOutflows = {
    loanDisbursement: { amount: Math.round(loanDisbursementOutflows), label: 'Loan Disbursements', labelNep: 'ऋण वितरण' },
    assetPurchase: { amount: Math.round(assetPurchaseOutflows), label: 'Asset Purchases', labelNep: 'सम्पत्ति खरिद' },
    totalInvestingOutflows: { amount: Math.round(loanDisbursementOutflows + assetPurchaseOutflows), label: 'Total Investing Outflows', labelNep: 'कुल लगानी जाने' },
  }
  const netInvestingCash = investingInflows.totalInvestingInflows.amount - investingOutflows.totalInvestingOutflows.amount

  // Financing activities
  const financingInflows = {
    memberDeposits: { amount: Math.round(depositInflows), label: 'Member Deposits Received', labelNep: 'सदस्य निक्षेप प्राप्त' },
    shareCapital: { amount: Math.round(shareCapitalInflows), label: 'Share Capital Received', labelNep: 'शेयर पूँजी प्राप्त' },
    totalFinancingInflows: { amount: Math.round(depositInflows + shareCapitalInflows), label: 'Total Financing Inflows', labelNep: 'कुल वित्तीय आगमन' },
  }
  const financingOutflows = {
    depositWithdrawals: { amount: Math.round(withdrawalOutflows), label: 'Deposit Withdrawals', labelNep: 'निक्षेप निकासा' },
    shareRedemptions: { amount: 0, label: 'Share Redemptions', labelNep: 'शेयर फिर्ता' },
    totalFinancingOutflows: { amount: Math.round(withdrawalOutflows), label: 'Total Financing Outflows', labelNep: 'कुल वित्तीय जाने' },
  }
  const netFinancingCash = financingInflows.totalFinancingInflows.amount - financingOutflows.totalFinancingOutflows.amount

  return {
    reportType: 'cash-flow',
    reportTitle: 'Cash Flow Statement',
    reportTitleNep: 'नगद प्रवाह विवरण',
    header,
    operatingActivities: {
      inflows: operatingInflows,
      outflows: operatingOutflows,
      netCashFromOperations: { amount: Math.round(netOperatingCash), label: 'Net Cash from Operations', labelNep: 'सञ्चालनबाट खुद नगद' },
    },
    investingActivities: {
      inflows: investingInflows,
      outflows: investingOutflows,
      netCashFromInvesting: { amount: Math.round(netInvestingCash), label: 'Net Cash from Investing', labelNep: 'लगानीबाट खुद नगद' },
    },
    financingActivities: {
      inflows: financingInflows,
      outflows: financingOutflows,
      netCashFromFinancing: { amount: Math.round(netFinancingCash), label: 'Net Cash from Financing', labelNep: 'वित्तीयबाट खुद नगद' },
    },
    summary: {
      totalInflows: { amount: Math.round(totalInflows), label: 'Total Cash Inflows', labelNep: 'कुल नगद आगमन' },
      totalOutflows: { amount: Math.round(totalOutflows), label: 'Total Cash Outflows', labelNep: 'कुल नगद जाने' },
      netCashFlow: { amount: Math.round(netCashFlow), label: 'Net Cash Flow', labelNep: 'खुद नगद प्रवाह' },
      cashAtBeginning: { amount: 0, label: 'Cash at Beginning of Period', labelNep: 'अवधि सुरुमा नगद' },
      cashAtEnd: { amount: Math.round(netCashFlow), label: 'Cash at End of Period', labelNep: 'अवधि अन्त्यमा नगद' },
    },
    currency: 'NPR',
    currencyNep: 'नेपाली रूपैयाँ',
  }
}

// -----------------------------------------------------------
// API Route Handler
// -----------------------------------------------------------

const VALID_REPORT_TYPES = [
  'balance-sheet',
  'income-statement',
  'nrb-return',
  'capital-adequacy',
  'loan-portfolio',
  'savings-report',
  'member-directory',
  'cash-flow',
] as const

type ReportType = (typeof VALID_REPORT_TYPES)[number]

const REPORT_GENERATORS: Record<ReportType, (data: Awaited<ReturnType<typeof fetchReportData>>) => unknown> = {
  'balance-sheet': generateBalanceSheet,
  'income-statement': generateIncomeStatement,
  'nrb-return': generateNRBReturn,
  'capital-adequacy': generateCapitalAdequacy,
  'loan-portfolio': generateLoanPortfolio,
  'savings-report': generateSavingsReport,
  'member-directory': generateMemberDirectory,
  'cash-flow': generateCashFlow,
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') as ReportType | null
    const format = (searchParams.get('format') || 'json').toLowerCase()

    // Validate report type
    if (!reportType || !VALID_REPORT_TYPES.includes(reportType)) {
      return NextResponse.json(
        {
          error: 'Invalid or missing report type',
          validTypes: VALID_REPORT_TYPES,
          usage: '/api/reports/nrb?type=<report-type>&format=<json|pdf>',
        },
        { status: 400 }
      )
    }

    // Validate format
    if (format !== 'json' && format !== 'pdf') {
      return NextResponse.json(
        {
          error: 'Invalid format. Use "json" or "pdf"',
        },
        { status: 400 }
      )
    }

    // Fetch all data
    const data = await fetchReportData()

    // Generate report
    const generator = REPORT_GENERATORS[reportType]
    const report = generator(data)

    // Return based on format
    if (format === 'pdf') {
      // For PDF format, return the JSON data with a flag indicating PDF generation is needed
      // In production, this would use a PDF generation library (e.g., puppeteer, jsPDF, or a service)
      return NextResponse.json({
        ...report,
        _meta: {
          format: 'pdf',
          note: 'PDF generation requires server-side rendering. The JSON data below can be used for PDF template rendering. Implement PDF generation using a library like @react-pdf/renderer, puppeteer, or a dedicated PDF service.',
          generatedAt: new Date().toISOString(),
        },
      })
    }

    // Default: return JSON
    return NextResponse.json(report)
  } catch (error) {
    console.error('[NRB Report] Generation error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate NRB report',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
