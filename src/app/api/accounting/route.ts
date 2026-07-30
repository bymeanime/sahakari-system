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
    console.error('Accounting GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch accounting data' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Double-entry validation: require at least 2 line items
    if (!body.items || !Array.isArray(body.items) || body.items.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 line items are required for a journal entry / जर्नल प्रविष्टिको लागि कम्तिमा २ वटा लाइन आइटम आवश्यक छ' },
        { status: 400 }
      )
    }

    // Double-entry validation: total debits must equal total credits (within 0.01 tolerance)
    const totalDebits = body.items.reduce((sum: number, item: any) => sum + (item.debit || 0), 0)
    const totalCredits = body.items.reduce((sum: number, item: any) => sum + (item.credit || 0), 0)
    const tolerance = 0.01

    if (Math.abs(totalDebits - totalCredits) > tolerance) {
      return NextResponse.json(
        {
          error: `Double-entry validation failed: total debits (Rs. ${totalDebits.toFixed(2)}) must equal total credits (Rs. ${totalCredits.toFixed(2)}) / ` +
                 `दोहोरो प्रविष्टि प्रमाणीकरण असफल: कुल डेबिट (रु. ${totalDebits.toFixed(2)}) कुल क्रेडिट (रु. ${totalCredits.toFixed(2)}) सँग बराबर हुनुपर्छ`,
          totalDebits,
          totalCredits,
        },
        { status: 400 }
      )
    }

    // Validate each item has either debit or credit (not both zero, not both non-zero)
    for (const item of body.items) {
      if ((item.debit || 0) > 0 && (item.credit || 0) > 0) {
        return NextResponse.json(
          { error: 'A line item cannot have both debit and credit amounts / एउटा लाइन आइटममा डेबिट र क्रेडिट दुवै हुन सक्दैन' },
          { status: 400 }
        )
      }
      if ((item.debit || 0) === 0 && (item.credit || 0) === 0) {
        return NextResponse.json(
          { error: 'A line item must have either debit or credit amount / एउटा लाइन आइटममा डेबिट वा क्रेडिट रकम हुनुपर्छ' },
          { status: 400 }
        )
      }
    }

    // Fiscal year locking check
    const entryDate = body.date
    if (entryDate) {
      const activeFiscalYear = await db.fiscalYear.findFirst({
        where: { isActive: true, isClosed: false },
      })
      if (!activeFiscalYear) {
        return NextResponse.json(
          { error: 'No active fiscal year found. Cannot create journal entry / सक्रिय आर्थिक वर्ष फेला परेन। जर्नल प्रविष्टि सिर्जना गर्न सकिँदैन' },
          { status: 400 }
        )
      }
      if (activeFiscalYear.isClosed) {
        return NextResponse.json(
          { error: 'Fiscal year is closed. Cannot create journal entry / आर्थिक वर्ष बन्द छ। जर्नल प्रविष्टि सिर्जना गर्न सकिँदैन' },
          { status: 400 }
        )
      }
      if (entryDate < activeFiscalYear.startDate || entryDate > activeFiscalYear.endDate) {
        return NextResponse.json(
          { error: `Entry date must be within active fiscal year (${activeFiscalYear.startDate} to ${activeFiscalYear.endDate}) / प्रविष्टि मिति सक्रिय आर्थिक वर्षभित्र हुनुपर्छ` },
          { status: 400 }
        )
      }
    }

    // Generate voucher number based on entry type
    const entryType = body.entryType || 'JOURNAL'
    const prefixMap: Record<string, string> = {
      JOURNAL: 'JE',
      PAYMENT: 'PV',
      RECEIPT: 'RV',
      CONTRA: 'CV',
    }
    const prefix = prefixMap[entryType] || 'JE'

    const lastEntry = await db.journalEntry.findFirst({
      where: { voucherNo: { startsWith: prefix } },
      orderBy: { voucherNo: 'desc' },
    })
    const nextNum = lastEntry ? parseInt(lastEntry.voucherNo.replace(`${prefix}-`, '')) + 1 : 1
    const voucherNo = `${prefix}-${String(nextNum).padStart(4, '0')}`

    const entry = await db.journalEntry.create({
      data: {
        voucherNo,
        date: body.date,
        narration: body.narration,
        narrationNep: body.narrationNep || null,
        status: body.status || 'DRAFT',
        entryType,
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
      include: { items: { include: { debitAccount: true, creditAccount: true } } },
    })

    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    console.error('Journal entry error:', error)
    return NextResponse.json({ error: 'Failed to create journal entry / जर्नल प्रविष्टि सिर्जना गर्न असफल' }, { status: 500 })
  }
}
