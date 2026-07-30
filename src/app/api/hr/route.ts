import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const [employees, departments] = await Promise.all([
      db.employee.findMany({ orderBy: { employeeId: 'asc' } }),
      db.employee.findMany({ select: { department: true }, distinct: ['department'] }),
    ])
    return NextResponse.json({ employees, departments: departments.map(d => d.department) })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const lastEmp = await db.employee.findFirst({ orderBy: { employeeId: 'desc' } })
    const nextNum = lastEmp ? parseInt(lastEmp.employeeId.replace('EMP-', '')) + 1 : 1
    const employeeId = `EMP-${String(nextNum).padStart(3, '0')}`

    const employee = await db.employee.create({
      data: {
        employeeId,
        firstName: body.firstName,
        lastName: body.lastName,
        firstNameNep: body.firstNameNep || null,
        lastNameNep: body.lastNameNep || null,
        dateOfBirth: body.dateOfBirth || null,
        gender: body.gender || null,
        phone: body.phone || null,
        email: body.email || null,
        address: body.address || null,
        citizenshipNo: body.citizenshipNo || null,
        position: body.position || null,
        department: body.department || null,
        joinDate: body.joinDate || new Date().toISOString().split('T')[0],
        salary: parseFloat(body.salary) || 0,
        status: 'ACTIVE',
        organizationId: body.organizationId || 'org-sahakari-001',
        branchId: body.branchId || null,
      },
    })

    return NextResponse.json(employee, { status: 201 })
  } catch (error) {
    console.error('Employee creation error:', error)
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 })
  }
}
