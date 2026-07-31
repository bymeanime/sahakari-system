import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/fiscal-years
export async function GET() {
  try {
    const fiscalYears = await db.fiscalYear.findMany({
      orderBy: { startDate: 'desc' },
    })
    return NextResponse.json(fiscalYears)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch fiscal years' }, { status: 500 })
  }
}

// POST /api/fiscal-years
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const org = await db.organization.findFirst()
    if (!org) return NextResponse.json({ error: 'No organization found' }, { status: 400 })

    if (body.action === 'activate') {
      // Deactivate all other fiscal years first
      await db.fiscalYear.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      })
      const fy = await db.fiscalYear.update({
        where: { id: body.id },
        data: { isActive: true, isClosed: false },
      })
      // Update organization fiscal year
      await db.organization.update({
        where: { id: org.id },
        data: { fiscalYear: fy.name },
      })
      return NextResponse.json(fy)
    }

    if (body.action === 'close') {
      const fy = await db.fiscalYear.update({
        where: { id: body.id },
        data: { isClosed: true, isActive: false },
      })
      return NextResponse.json(fy)
    }

    // Create new fiscal year
    const fy = await db.fiscalYear.create({
      data: {
        name: body.name,
        startDate: body.startDate,
        endDate: body.endDate,
        isActive: body.isActive || false,
        isClosed: false,
        organizationId: org.id,
      },
    })
    return NextResponse.json(fy, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to manage fiscal year' }, { status: 500 })
  }
}
