import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/employees/[id] - Get a single employee by id
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const employee = await db.employee.findUnique({
      where: { id },
      include: {
        attendances: {
          orderBy: { createdAt: 'desc' },
          take: 30,
        },
        payrollRecords: {
          orderBy: { createdAt: 'desc' },
          take: 12,
        },
        leaveRequests: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    return NextResponse.json(employee)
  } catch (error) {
    console.error('Failed to fetch employee:', error)
    return NextResponse.json({ error: 'Failed to fetch employee' }, { status: 500 })
  }
}

// PUT /api/employees/[id] - Update an employee
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.employee.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (body.firstName !== undefined) data.firstName = body.firstName
    if (body.lastName !== undefined) data.lastName = body.lastName
    if (body.firstNameNep !== undefined) data.firstNameNep = body.firstNameNep
    if (body.lastNameNep !== undefined) data.lastNameNep = body.lastNameNep
    if (body.dateOfBirth !== undefined) data.dateOfBirth = body.dateOfBirth
    if (body.gender !== undefined) data.gender = body.gender
    if (body.phone !== undefined) data.phone = body.phone
    if (body.email !== undefined) data.email = body.email
    if (body.address !== undefined) data.address = body.address
    if (body.citizenshipNo !== undefined) data.citizenshipNo = body.citizenshipNo
    if (body.position !== undefined) data.position = body.position
    if (body.department !== undefined) data.department = body.department
    if (body.joinDate !== undefined) data.joinDate = body.joinDate
    if (body.endDate !== undefined) data.endDate = body.endDate
    if (body.salary !== undefined) data.salary = body.salary
    if (body.status !== undefined) data.status = body.status

    const employee = await db.employee.update({
      where: { id },
      data,
    })

    return NextResponse.json(employee)
  } catch (error) {
    console.error('Failed to update employee:', error)
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 })
  }
}

// DELETE /api/employees/[id] - Soft delete an employee (set status to TERMINATED)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.employee.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    if (existing.status === 'TERMINATED') {
      return NextResponse.json({ error: 'Employee is already terminated' }, { status: 400 })
    }

    const employee = await db.employee.update({
      where: { id },
      data: {
        status: 'TERMINATED',
        endDate: new Date().toISOString().split('T')[0],
        isActive: false,
      },
    })

    return NextResponse.json({
      message: 'Employee terminated successfully.',
      employee,
    })
  } catch (error) {
    console.error('Failed to terminate employee:', error)
    return NextResponse.json({ error: 'Failed to terminate employee' }, { status: 500 })
  }
}
