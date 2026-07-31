import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') || ''

    const [entries, accounts] = await Promise.all([
      db.journalEntry.findMany({
        include: { items: { include: { debitAccount: true, creditAccount: true } } },
        orderBy: { date: 'desc' },
      }),
      db.account.findMany({ where: { subType: { not: 'HEADER' } }, orderBy: { code: 'asc' } }),
    ])

    const postedEntries = entries.filter(j => j.status === 'POSTED')

    // --- TRIAL BALANCE ---
    if (reportType === 'trial-balance') {
      const trialBalance = accounts.map(acct => {
        const debitTotal = postedEntries.reduce((sum, je) =>
          sum + je.items.filter(i => i.accountId === acct.id).reduce((s, i) => s + i.debit, 0), 0)
        const creditTotal = postedEntries.reduce((sum, je) =>
          sum + je.items.filter(i => i.accountId === acct.id).reduce((s, i) => s + i.credit, 0), 0)
        const balance = debitTotal - creditTotal
        return {
          code: acct.code,
          name: acct.name,
          nameNepali: acct.nameNepali,
          type: acct.type,
          debit: balance > 0 ? balance : 0,
          credit: balance < 0 ? Math.abs(balance) : 0,
        }
      }).filter(row => row.debit > 0 || row.credit > 0)

      const totalDebit = trialBalance.reduce((s, r) => s + r.debit, 0)
      const totalCredit = trialBalance.reduce((s, r) => s + r.credit, 0)

      return NextResponse.json({
        reportType: 'trial-balance',
        asOfDate: new Date().toISOString().split('T')[0],
        rows: trialBalance,
        totalDebit,
        totalCredit,
        isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
      })
    }

    // --- LEDGER ---
    if (reportType === 'ledger') {
      const accountId = searchParams.get('accountId')
      if (!accountId) {
        return NextResponse.json({ error: 'accountId is required for ledger report' }, { status: 400 })
      }

      const account = accounts.find(a => a.id === accountId)
      if (!account) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 })
      }

      const relevantEntries = postedEntries.filter(je =>
        je.items.some(i => i.accountId === accountId)
      )

      let runningBalance = 0
      const ledgerRows = relevantEntries.flatMap(je => {
        return je.items.filter(i => i.accountId === accountId).map(item => {
          runningBalance += item.debit - item.credit
          return {
            date: je.date,
            voucherNo: je.voucherNo,
            entryType: je.entryType,
            narration: je.narration,
            debit: item.debit,
            credit: item.credit,
            balance: runningBalance,
            description: item.description,
          }
        })
      })

      return NextResponse.json({
        reportType: 'ledger',
        account: { id: account.id, code: account.code, name: account.name, nameNepali: account.nameNepali, type: account.type },
        rows: ledgerRows,
        openingBalance: 0,
        closingBalance: runningBalance,
      })
    }

    // --- DAY BOOK ---
    if (reportType === 'day-book') {
      const date = searchParams.get('date')
      const filtered = date ? entries.filter(je => je.date === date) : entries.filter(je => je.date === new Date().toISOString().split('T')[0])

      const dayBookRows = filtered.map(je => ({
        id: je.id,
        voucherNo: je.voucherNo,
        date: je.date,
        entryType: je.entryType,
        narration: je.narration,
        status: je.status,
        items: je.items.map(item => ({
          accountId: item.accountId,
          accountName: item.debitAccount?.name || '',
          accountCode: item.debitAccount?.code || '',
          debit: item.debit,
          credit: item.credit,
          description: item.description,
        })),
        totalDebit: je.items.reduce((s, i) => s + i.debit, 0),
        totalCredit: je.items.reduce((s, i) => s + i.credit, 0),
      }))

      return NextResponse.json({
        reportType: 'day-book',
        date: date || new Date().toISOString().split('T')[0],
        rows: dayBookRows,
      })
    }

    // --- CASH BOOK ---
    if (reportType === 'cash-book') {
      const cashAccounts = accounts.filter(a =>
        a.type === 'ASSET' && (a.subType === 'CASH' || a.name.toLowerCase().includes('cash') || a.name.toLowerCase().includes('नगद'))
      )

      const cashRows: any[] = []
      let cashBalance = 0

      cashAccounts.forEach(acct => {
        const relevantEntries = postedEntries.filter(je =>
          je.items.some(i => i.accountId === acct.id)
        )
        relevantEntries.forEach(je => {
          je.items.filter(i => i.accountId === acct.id).forEach(item => {
            cashBalance += item.debit - item.credit
            cashRows.push({
              date: je.date,
              voucherNo: je.voucherNo,
              narration: je.narration,
              debit: item.debit,
              credit: item.credit,
              balance: cashBalance,
              description: item.description,
            })
          })
        })
      })

      return NextResponse.json({
        reportType: 'cash-book',
        accountName: cashAccounts.map(a => a.name).join(', ') || 'Cash',
        rows: cashRows,
        openingBalance: 0,
        closingBalance: cashBalance,
      })
    }

    // --- BANK BOOK ---
    if (reportType === 'bank-book') {
      const bankAccounts = accounts.filter(a =>
        a.type === 'ASSET' && (a.subType === 'BANK' || a.name.toLowerCase().includes('bank') || a.name.toLowerCase().includes('बैंक'))
      )

      const bankRows: any[] = []
      let bankBalance = 0

      bankAccounts.forEach(acct => {
        const relevantEntries = postedEntries.filter(je =>
          je.items.some(i => i.accountId === acct.id)
        )
        relevantEntries.forEach(je => {
          je.items.filter(i => i.accountId === acct.id).forEach(item => {
            bankBalance += item.debit - item.credit
            bankRows.push({
              date: je.date,
              voucherNo: je.voucherNo,
              narration: je.narration,
              debit: item.debit,
              credit: item.credit,
              balance: bankBalance,
              description: item.description,
            })
          })
        })
      })

      return NextResponse.json({
        reportType: 'bank-book',
        accountName: bankAccounts.map(a => a.name).join(', ') || 'Bank',
        rows: bankRows,
        openingBalance: 0,
        closingBalance: bankBalance,
      })
    }

    return NextResponse.json({ error: 'Invalid report type. Use: trial-balance, ledger, day-book, cash-book, bank-book' }, { status: 400 })
  } catch (error) {
    console.error('Accounting reports error:', error)
    return NextResponse.json({ error: 'Failed to generate accounting report' }, { status: 500 })
  }
}
