import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const org = await db.organization.findFirst()
    const branches = await db.branch.findMany()
    const fiscalYears = await db.fiscalYear.findMany({ orderBy: { startDate: 'desc' } })
    const users = await db.user.findMany({ select: { id: true, name: true, email: true, role: true, isActive: true } })

    return NextResponse.json({ organization: org, branches, fiscalYears, users })
  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (body.action === 'updateOrg') {
      const org = await db.organization.findFirst()
      if (!org) {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
      }
      const updated = await db.organization.update({
        where: { id: org.id },
        data: {
          name: body.name,
          nameNepali: body.nameNepali,
          code: body.code,
          panNo: body.panNo,
          province: body.province,
          district: body.district,
          phone: body.phone,
          email: body.email,
        },
      })
      return NextResponse.json(updated)
    }

    if (body.action === 'createFiscalYear') {
      const fy = await db.fiscalYear.create({
        data: {
          name: body.name,
          startDate: body.startDate,
          endDate: body.endDate,
          isActive: body.isActive || false,
          isClosed: false,
          organizationId: body.organizationId,
        },
      })
      return NextResponse.json(fy, { status: 201 })
    }

    if (body.action === 'closeFiscalYear') {
      const fy = await db.fiscalYear.update({
        where: { id: body.id },
        data: { isClosed: true, isActive: false },
      })
      return NextResponse.json(fy)
    }

    if (body.action === 'activateFiscalYear') {
      // Deactivate all other fiscal years first
      await db.fiscalYear.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      })
      const fy = await db.fiscalYear.update({
        where: { id: body.id },
        data: { isActive: true, isClosed: false },
      })
      return NextResponse.json(fy)
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Settings POST error:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
