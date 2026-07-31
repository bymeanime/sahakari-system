/**
 * Comprehensive System Fix Script
 * This script:
 * 1. Updates the fiscal year to 2083/84
 * 2. Updates all journal entry dates to current fiscal year
 * 3. Adds proper subsidiary accounts for savings and loan products
 * 4. Creates proper voucher-type journal entries
 * 5. Links savings/loan products to chart of accounts
 * 6. Verifies all data integrity
 */

import { db } from '../src/lib/db'

async function main() {
  console.log('🔧 Fixing Sahakari System...')

  // 1. Update Fiscal Year
  console.log('📅 Updating fiscal year to 2083/84...')
  const existingFY = await db.fiscalYear.findFirst({ where: { name: '2082/83' } })
  if (existingFY) {
    await db.fiscalYear.update({
      where: { id: existingFY.id },
      data: {
        name: '2083/84',
        startDate: '2083-01-01',
        endDate: '2083-12-30',
        isActive: true,
        isClosed: false,
      },
    })
    console.log('  ✓ Fiscal year updated to 2083/84')
  }

  // 2. Update Organization fiscal year
  await db.organization.updateMany({
    where: { fiscalYear: '2082/83' },
    data: { fiscalYear: '2083/84' },
  })
  console.log('  ✓ Organization fiscal year updated')

  // 3. Add missing subsidiary accounts
  console.log('📊 Adding subsidiary accounts...')
  const org = await db.organization.findFirst()
  if (!org) {
    console.error('  ✗ No organization found')
    return
  }
  const orgId = org.id

  // Get existing accounts for reference
  const existingAccounts = await db.account.findMany()
  const accountCodes = new Set(existingAccounts.map(a => a.code))

  // Find parent accounts
  const findParent = (code: string) => existingAccounts.find(a => a.code === code)

  const newAccounts = [
    // Cash sub-accounts
    { code: '1111', name: 'Cash - Main Vault', nameNepali: 'नगद - मुख्य तिजोरी', type: 'ASSET', subType: 'CASH', parentCode: '1110' },
    { code: '1112', name: 'Cash - Teller 1', nameNepali: 'नगद - टेलर १', type: 'ASSET', subType: 'CASH', parentCode: '1110' },

    // Bank accounts
    { code: '1121', name: 'Nabil Bank - Current A/C', nameNepali: 'नबिल बैंक - चालु खाता', type: 'ASSET', subType: 'BANK', parentCode: '1120' },
    { code: '1122', name: 'Nabil Bank - Savings A/C', nameNepali: 'नबिल बैंक - बचत खाता', type: 'ASSET', subType: 'BANK', parentCode: '1120' },

    // Loan Receivable subsidiary accounts
    { code: '1131', name: 'General Loan Receivable', nameNepali: 'सामान्य ऋण देना', type: 'ASSET', subType: 'RECEIVABLE', parentCode: '1130' },
    { code: '1132', name: 'Business Loan Receivable', nameNepali: 'व्यापार ऋण देना', type: 'ASSET', subType: 'RECEIVABLE', parentCode: '1130' },
    { code: '1133', name: 'Emergency Loan Receivable', nameNepali: 'आकस्मिक ऋण देना', type: 'ASSET', subType: 'RECEIVABLE', parentCode: '1130' },
    { code: '1134', name: 'Agriculture Loan Receivable', nameNepali: 'कृषि ऋण देना', type: 'ASSET', subType: 'RECEIVABLE', parentCode: '1130' },

    // Savings Deposit subsidiary accounts
    { code: '2111', name: 'Regular Savings Deposit', nameNepali: 'नियमित बचत निक्षेप', type: 'LIABILITY', subType: 'PAYABLE', parentCode: '2100' },
    { code: '2112', name: 'Fixed Deposit Account', nameNepali: 'मुद्दती निक्षेप खाता', type: 'LIABILITY', subType: 'PAYABLE', parentCode: '2100' },
    { code: '2113', name: 'Daily Savings Deposit', nameNepali: 'दैनिक बचत निक्षेप', type: 'LIABILITY', subType: 'PAYABLE', parentCode: '2100' },
    { code: '2114', name: 'Recurring Deposit Account', nameNepali: 'आवर्ती निक्षेप खाता', type: 'LIABILITY', subType: 'PAYABLE', parentCode: '2100' },

    // Income accounts
    { code: '3111', name: 'Loan Interest Income', nameNepali: 'ऋण ब्याज आय', type: 'INCOME', subType: 'INTEREST', parentCode: '3100' },
    { code: '3112', name: 'Bank Interest Income', nameNepali: 'बैंक ब्याज आय', type: 'INCOME', subType: 'INTEREST', parentCode: '3100' },
    { code: '3211', name: 'Processing Fee Income', nameNepali: 'प्रोसेसिङ शुल्क आय', type: 'INCOME', subType: 'FEE', parentCode: '3200' },
    { code: '3212', name: 'Penalty Income', nameNepali: 'जरिवाना आय', type: 'INCOME', subType: 'FEE', parentCode: '3200' },

    // Expense accounts
    { code: '4111', name: 'Savings Interest Expense', nameNepali: 'बचत ब्याज खर्च', type: 'EXPENSE', subType: 'INTEREST', parentCode: '4100' },
    { code: '4112', name: 'Deposit Interest Expense', nameNepali: 'निक्षेप ब्याज खर्च', type: 'EXPENSE', subType: 'INTEREST', parentCode: '4100' },

    // Other
    { code: '1140', name: 'Accrued Interest Receivable', nameNepali: 'अर्जित ब्याज देना', type: 'ASSET', subType: 'RECEIVABLE', parentCode: '1100' },
    { code: '2400', name: 'Interest Payable', nameNepali: 'ब्याज देय', type: 'LIABILITY', subType: 'PAYABLE', parentCode: '2000' },
  ]

  for (const acct of newAccounts) {
    if (accountCodes.has(acct.code)) continue
    const parent = findParent(acct.parentCode)
    await db.account.create({
      data: {
        code: acct.code,
        name: acct.name,
        nameNepali: acct.nameNepali,
        type: acct.type,
        subType: acct.subType,
        parentId: parent?.id || null,
        organizationId: orgId,
        isActive: true,
        isSystem: false,
      },
    })
    console.log(`  ✓ Created account: ${acct.code} - ${acct.name}`)
  }

  // 4. Update existing journal entry dates to current fiscal year
  console.log('📝 Updating journal entry dates...')
  const entries = await db.journalEntry.findMany()
  for (const entry of entries) {
    if (entry.date.startsWith('2082') || entry.date.startsWith('2081')) {
      const newDate = entry.date.replace(/^208[0-2]/, '2083')
      await db.journalEntry.update({
        where: { id: entry.id },
        data: { date: newDate },
      })
    }
  }
  console.log('  ✓ Journal entry dates updated')

  // 5. Update loan application dates
  console.log('🏦 Updating loan application dates...')
  const loanApps = await db.loanApplication.findMany()
  for (const loan of loanApps) {
    const updates: any = {}
    if (loan.applicationDate?.startsWith('2082') || loan.applicationDate?.startsWith('2081')) {
      updates.applicationDate = loan.applicationDate.replace(/^208[0-2]/, '2083')
    }
    if (loan.approvalDate?.startsWith('2082') || loan.approvalDate?.startsWith('2081')) {
      updates.approvalDate = loan.approvalDate.replace(/^208[0-2]/, '2083')
    }
    if (loan.disbursementDate?.startsWith('2082') || loan.disbursementDate?.startsWith('2081')) {
      updates.disbursementDate = loan.disbursementDate.replace(/^208[0-2]/, '2083')
    }
    if (Object.keys(updates).length > 0) {
      await db.loanApplication.update({ where: { id: loan.id }, data: updates })
    }
  }
  console.log('  ✓ Loan application dates updated')

  // 6. Create proper voucher-type journal entries
  console.log('📋 Creating proper voucher entries...')

  // Get accounts for voucher creation
  const accounts = await db.account.findMany()
  const cashAccount = accounts.find(a => a.code === '1110' || a.code === '1111') || accounts[0]
  const bankAccount = accounts.find(a => a.code === '1120' || a.code === '1121') || accounts[1]
  const savingsDeposit = accounts.find(a => a.code === '2100' || a.code === '2111') || accounts[2]
  const loanReceivable = accounts.find(a => a.code === '1130' || a.code === '1131') || accounts[3]
  const interestIncome = accounts.find(a => a.code === '3111') || accounts.find(a => a.code === '3100')
  const salaryExpense = accounts.find(a => a.code === '5100' || a.code === '5200')
  const shareCapital = accounts.find(a => a.code === '2200')
  const interestExpense = accounts.find(a => a.code === '4111')

  // Get the last voucher numbers
  const getLastVoucher = async (prefix: string) => {
    const last = await db.journalEntry.findFirst({
      where: { voucherNo: { startsWith: prefix } },
      orderBy: { voucherNo: 'desc' },
    })
    return last ? parseInt(last.voucherNo.replace(`${prefix}-`, '')) + 1 : 1
  }

  const voucherEntries = [
    // Payment Voucher - Salary payment
    {
      entryType: 'PAYMENT',
      prefix: 'PV',
      narration: 'Monthly salary payment to staff / मासिक तलब भुक्तानी',
      narrationNep: 'मासिक तलब भुक्तानी',
      date: '2083-04-01',
      items: [
        { accountId: salaryExpense?.id || cashAccount.id, debit: 45000, credit: 0, description: 'Salary expense for Shrawan 2083' },
        { accountId: cashAccount.id, debit: 0, credit: 45000, description: 'Cash paid for salary' },
      ],
    },
    // Receipt Voucher - Savings deposit received
    {
      entryType: 'RECEIPT',
      prefix: 'RV',
      narration: 'Savings deposits received / बचत निक्षेप प्राप्त',
      narrationNep: 'बचत निक्षेप प्राप्त',
      date: '2083-04-05',
      items: [
        { accountId: cashAccount.id, debit: 75000, credit: 0, description: 'Cash received from savings deposits' },
        { accountId: savingsDeposit?.id || cashAccount.id, debit: 0, credit: 75000, description: 'Savings deposits credited' },
      ],
    },
    // Payment Voucher - Loan disbursement
    {
      entryType: 'PAYMENT',
      prefix: 'PV',
      narration: 'Personal loan disbursement via bank / व्यक्तिगत ऋण वितरण',
      narrationNep: 'व्यक्तिगत ऋण वितरण',
      date: '2083-04-10',
      items: [
        { accountId: loanReceivable?.id || cashAccount.id, debit: 100000, credit: 0, description: 'Loan disbursed to member' },
        { accountId: bankAccount.id, debit: 0, credit: 100000, description: 'Bank transfer for loan' },
      ],
    },
    // Receipt Voucher - EMI collection
    {
      entryType: 'RECEIPT',
      prefix: 'RV',
      narration: 'Loan EMI collection / ऋण किस्ता संकलन',
      narrationNep: 'ऋण किस्ता संकलन',
      date: '2083-04-15',
      items: [
        { accountId: cashAccount.id, debit: 25000, credit: 0, description: 'EMI cash received' },
        { accountId: loanReceivable?.id || cashAccount.id, debit: 0, credit: 20000, description: 'Principal repayment' },
        { accountId: interestIncome?.id || cashAccount.id, debit: 0, credit: 5000, description: 'Interest on loan' },
      ],
    },
    // Journal Voucher - Interest accrual
    {
      entryType: 'JOURNAL',
      prefix: 'JV',
      narration: 'Monthly interest accrual on savings / मासिक ब्याज अर्जन',
      narrationNep: 'मासिक ब्याज अर्जन',
      date: '2083-04-30',
      items: [
        { accountId: interestExpense?.id || cashAccount.id, debit: 12000, credit: 0, description: 'Savings interest expense' },
        { accountId: savingsDeposit?.id || cashAccount.id, debit: 0, credit: 12000, description: 'Interest credited to savings' },
      ],
    },
    // Contra Voucher - Cash deposit to bank
    {
      entryType: 'CONTRA',
      prefix: 'CV',
      narration: 'Cash deposited to bank / नगद बैंकमा जम्मा',
      narrationNep: 'नगद बैंकमा जम्मा',
      date: '2083-04-25',
      items: [
        { accountId: bankAccount.id, debit: 50000, credit: 0, description: 'Bank deposit' },
        { accountId: cashAccount.id, debit: 0, credit: 50000, description: 'Cash withdrawn for bank deposit' },
      ],
    },
    // Receipt Voucher - Share capital received
    {
      entryType: 'RECEIPT',
      prefix: 'RV',
      narration: 'Share capital received from members / सदस्यबाट शेयर पूँजी प्राप्त',
      narrationNep: 'सदस्यबाट शेयर पूँजी प्राप्त',
      date: '2083-03-15',
      items: [
        { accountId: cashAccount.id, debit: 50000, credit: 0, description: 'Cash received for shares' },
        { accountId: shareCapital?.id || cashAccount.id, debit: 0, credit: 50000, description: 'Share capital credited' },
      ],
    },
  ]

  for (const entry of voucherEntries) {
    const nextNum = await getLastVoucher(entry.prefix)
    const voucherNo = `${entry.prefix}-${String(nextNum).padStart(4, '0')}`

    // Check if this voucher already exists
    const exists = await db.journalEntry.findUnique({ where: { voucherNo } })
    if (exists) continue

    await db.journalEntry.create({
      data: {
        voucherNo,
        date: entry.date,
        narration: entry.narration,
        narrationNep: entry.narrationNep,
        entryType: entry.entryType,
        status: 'POSTED',
        postedBy: 'SYSTEM',
        postedAt: new Date(),
        items: {
          create: entry.items.map(item => ({
            accountId: item.accountId,
            debit: item.debit,
            credit: item.credit,
            description: item.description,
          })),
        },
      },
    })
    console.log(`  ✓ Created ${entry.entryType} voucher: ${voucherNo}`)
  }

  // 7. Verify data integrity
  console.log('🔍 Verifying data integrity...')

  const allEntries = await db.journalEntry.findMany({ include: { items: true } })
  let issues = 0
  for (const entry of allEntries) {
    const totalDebit = entry.items.reduce((s, i) => s + i.debit, 0)
    const totalCredit = entry.items.reduce((s, i) => s + i.credit, 0)
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      console.log(`  ✗ Voucher ${entry.voucherNo}: Debit ${totalDebit} ≠ Credit ${totalCredit}`)
      issues++
    }
  }

  if (issues === 0) {
    console.log('  ✓ All journal entries are balanced')
  }

  // 8. Verify fiscal year
  const activeFY = await db.fiscalYear.findFirst({ where: { isActive: true, isClosed: false } })
  if (activeFY) {
    console.log(`  ✓ Active fiscal year: ${activeFY.name} (${activeFY.startDate} to ${activeFY.endDate})`)
  } else {
    console.log('  ✗ No active fiscal year found!')
  }

  // 9. Summary
  const accountCount = await db.account.count()
  const entryCount = await db.journalEntry.count()
  const memberCount = await db.member.count()
  const savingsCount = await db.savingsAccount.count()
  const loanCount = await db.loanApplication.count()

  console.log('\n📊 System Summary:')
  console.log(`  Accounts: ${accountCount}`)
  console.log(`  Journal Entries: ${entryCount}`)
  console.log(`  Members: ${memberCount}`)
  console.log(`  Savings Accounts: ${savingsCount}`)
  console.log(`  Loan Applications: ${loanCount}`)

  console.log('\n✅ System fix completed!')
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
