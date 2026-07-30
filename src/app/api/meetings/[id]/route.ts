import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/meetings/[id] - Get a single meeting by id
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const meeting = await db.meeting.findUnique({
      where: { id },
    })

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    return NextResponse.json(meeting)
  } catch (error) {
    console.error('Failed to fetch meeting:', error)
    return NextResponse.json({ error: 'Failed to fetch meeting' }, { status: 500 })
  }
}

// PUT /api/meetings/[id] - Update a meeting
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.meeting.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (body.title !== undefined) data.title = body.title
    if (body.titleNepali !== undefined) data.titleNepali = body.titleNepali
    if (body.type !== undefined) data.type = body.type
    if (body.date !== undefined) data.date = body.date
    if (body.time !== undefined) data.time = body.time
    if (body.venue !== undefined) data.venue = body.venue
    if (body.agenda !== undefined) data.agenda = body.agenda
    if (body.minutes !== undefined) data.minutes = body.minutes
    if (body.decisions !== undefined) data.decisions = body.decisions
    if (body.status !== undefined) data.status = body.status
    if (body.attendees !== undefined) data.attendees = body.attendees

    const meeting = await db.meeting.update({
      where: { id },
      data,
    })

    return NextResponse.json(meeting)
  } catch (error) {
    console.error('Failed to update meeting:', error)
    return NextResponse.json({ error: 'Failed to update meeting' }, { status: 500 })
  }
}

// DELETE /api/meetings/[id] - Soft delete a meeting (set status to CANCELLED)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.meeting.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    if (existing.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Meeting is already cancelled' }, { status: 400 })
    }

    const meeting = await db.meeting.update({
      where: { id },
      data: { status: 'CANCELLED' },
    })

    return NextResponse.json({
      message: 'Meeting cancelled successfully.',
      meeting,
    })
  } catch (error) {
    console.error('Failed to cancel meeting:', error)
    return NextResponse.json({ error: 'Failed to cancel meeting' }, { status: 500 })
  }
}
