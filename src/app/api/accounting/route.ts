import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const [entries, accounts] = await Promise.all([
      db.journalEntry.findMany({
        include: { items: { include: { debitAccount: true, creditAccount: true } } },
        orderBy: { date: 'desc' },
      }),
      db.account.findMany({ where: { subType: { not: 'HEADER' } }, orderBy: { code: 'asc' } }),
    ])
    return NextResponse.json({ entries, accounts })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch accounting data' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const lastEntry = await db.journalEntry.findFirst({ orderBy: { voucherNo: 'desc' } })
    const nextNum = lastEntry ? parseInt(lastEntry.voucherNo.replace('JE-', '')) + 1 : 1
    const voucherNo = `JE-${String(nextNum).padStart(3, '0')}`

    const entry = await db.journalEntry.create({
      data: {
        voucherNo,
        date: body.date,
        narration: body.narration,
        narrationNep: body.narrationNep || null,
        status: 'DRAFT',
        entryType: body.entryType || 'JOURNAL',
        items: {
          create: body.items.map((item: any) => ({
            accountId: item.accountId,
            creditAccountId: item.creditAccountId || null,
            debit: item.debit || 0,
            credit: item.credit || 0,
            description: item.description || null,
          })),
        },
      },
      include: { items: true },
    })

    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    console.error('Journal entry error:', error)
    return NextResponse.json({ error: 'Failed to create journal entry' }, { status: 500 })
  }
}
