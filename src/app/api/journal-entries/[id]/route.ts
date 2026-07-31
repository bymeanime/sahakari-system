import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/journal-entries/[id] - Get a single journal entry by id
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const entry = await db.journalEntry.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            debitAccount: true,
            creditAccount: true,
          },
        },
      },
    })

    if (!entry) {
      return NextResponse.json({ error: 'Journal entry not found' }, { status: 404 })
    }

    return NextResponse.json(entry)
  } catch (error) {
    console.error('Failed to fetch journal entry:', error)
    return NextResponse.json({ error: 'Failed to fetch journal entry' }, { status: 500 })
  }
}

// PUT /api/journal-entries/[id] - Update a journal entry
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.journalEntry.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Journal entry not found' }, { status: 404 })
    }

    // Prevent modification of POSTED entries (audit integrity)
    // Only DRAFT entries can be modified; POSTED entries can only be cancelled
    if (existing.status === 'POSTED' && body.status !== 'CANCELLED') {
      return NextResponse.json(
        { error: 'Cannot modify a POSTED entry. Create a reversal entry instead. / पोस्ट गरिएको प्रविष्टि परिमार्जन गर्न सकिँदैन। उल्टो प्रविष्टि सिर्जना गर्नुहोस्।' },
        { status: 400 }
      )
    }

    // Check fiscal year closure
    if (existing.date) {
      const closedFY = await db.fiscalYear.findFirst({ where: { isClosed: true } })
      if (closedFY && existing.date >= closedFY.startDate && existing.date <= closedFY.endDate) {
        return NextResponse.json(
          { error: 'Cannot modify entry in a closed fiscal year / बन्द आर्थिक वर्षको प्रविष्टि परिमार्जन गर्न सकिँदैन' },
          { status: 400 }
        )
      }
    }

    const data: Record<string, unknown> = {}
    if (body.status !== undefined) data.status = body.status
    if (body.postedBy !== undefined) data.postedBy = body.postedBy

    // If status is being set to POSTED, set postedAt to current time
    if (body.status === 'POSTED') {
      data.postedAt = new Date()
    }

    const entry = await db.journalEntry.update({
      where: { id },
      data,
      include: {
        items: {
          include: {
            debitAccount: true,
            creditAccount: true,
          },
        },
      },
    })

    return NextResponse.json(entry)
  } catch (error) {
    console.error('Failed to update journal entry:', error)
    return NextResponse.json({ error: 'Failed to update journal entry' }, { status: 500 })
  }
}

// DELETE /api/journal-entries/[id] - Cancel a journal entry (soft delete for audit trail)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.journalEntry.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Journal entry not found' }, { status: 404 })
    }

    if (existing.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Journal entry is already cancelled' }, { status: 400 })
    }

    // Prevent cancelling POSTED entries - require reversal entry instead
    if (existing.status === 'POSTED') {
      return NextResponse.json(
        { error: 'Cannot cancel a POSTED entry. Create a reversal entry instead. / पोस्ट गरिएको प्रविष्टि रद्द गर्न सकिँदैन। उल्टो प्रविष्टि सिर्जना गर्नुहोस्।' },
        { status: 400 }
      )
    }

    const entry = await db.journalEntry.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        items: {
          include: {
            debitAccount: true,
            creditAccount: true,
          },
        },
      },
    })

    return NextResponse.json({
      message: 'Journal entry cancelled successfully. Record preserved for audit trail.',
      entry,
    })
  } catch (error) {
    console.error('Failed to cancel journal entry:', error)
    return NextResponse.json({ error: 'Failed to cancel journal entry' }, { status: 500 })
  }
}
