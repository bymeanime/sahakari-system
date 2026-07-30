import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const meetings = await db.meeting.findMany({ orderBy: { date: 'desc' } })
    return NextResponse.json(meetings)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch meetings' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const meeting = await db.meeting.create({
      data: {
        title: body.title,
        titleNepali: body.titleNepali || null,
        type: body.type,
        date: body.date,
        time: body.time || null,
        venue: body.venue || null,
        agenda: body.agenda || null,
        status: 'SCHEDULED',
        organizationId: body.organizationId || 'org-sahakari-001',
        createdBy: body.createdBy || null,
      },
    })
    return NextResponse.json(meeting, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create meeting' }, { status: 500 })
  }
}
