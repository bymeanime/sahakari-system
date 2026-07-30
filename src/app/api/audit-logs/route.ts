import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/audit-logs - List audit logs with pagination and filtering
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const skip = parseInt(searchParams.get('skip') || '0')
    const take = parseInt(searchParams.get('take') || '50')
    const userId = searchParams.get('userId')
    const filterModule = searchParams.get('module')
    const action = searchParams.get('action')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: Record<string, unknown> = {}

    if (userId) where.userId = userId
    if (filterModule) where.module = filterModule
    if (action) where.action = action

    if (startDate || endDate) {
      const createdAt: Record<string, unknown> = {}
      if (startDate) createdAt.gte = new Date(startDate)
      if (endDate) createdAt.lte = new Date(endDate)
      where.createdAt = createdAt
    }

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      db.auditLog.count({ where }),
    ])

    return NextResponse.json({
      logs,
      total,
      skip,
      take,
      hasMore: skip + take < total,
    })
  } catch (error) {
    console.error('Failed to fetch audit logs:', error)
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
  }
}
