import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'attendance') {
      const date = searchParams.get('date')
      const where: any = {}
      if (date) where.date = date
      const attendances = await db.attendance.findMany({
        where,
        include: { employee: { select: { employeeId: true, firstName: true, lastName: true, department: true } } },
        orderBy: { date: 'desc' },
      })
      return NextResponse.json({ attendances })
    }

    if (action === 'payroll') {
      const month = searchParams.get('month')
      const where: any = {}
      if (month) where.month = month
      const payrollRecords = await db.payrollRecord.findMany({
        where,
        include: { employee: { select: { employeeId: true, firstName: true, lastName: true, department: true, position: true } } },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json({ payrollRecords })
    }

    if (action === 'leaves') {
      const status = searchParams.get('status')
      const where: any = {}
      if (status && status !== 'ALL') where.status = status
      const leaveRequests = await db.leaveRequest.findMany({
        where,
        include: { employee: { select: { employeeId: true, firstName: true, lastName: true, department: true } } },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json({ leaveRequests })
    }

    // Default: return employees
    const [employees, departments] = await Promise.all([
      db.employee.findMany({ orderBy: { employeeId: 'asc' } }),
      db.employee.findMany({ select: { department: true }, distinct: ['department'] }),
    ])
    return NextResponse.json({ employees, departments: departments.map(d => d.department) })
  } catch (error) {
    console.error('HR GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch HR data' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // === ATTENDANCE ===
    if (body.action === 'markAttendance') {
      const records = body.records // Array of { employeeId, date, status, checkIn, checkOut, remarks }
      if (!Array.isArray(records) || records.length === 0) {
        return NextResponse.json({ error: 'No attendance records provided' }, { status: 400 })
      }
      const results = []
      for (const rec of records) {
        // Upsert: if attendance already exists for this employee+date, update it
        const existing = await db.attendance.findFirst({
          where: { employeeId: rec.employeeId, date: rec.date }
        })
        if (existing) {
          const updated = await db.attendance.update({
            where: { id: existing.id },
            data: {
              status: rec.status || 'PRESENT',
              checkIn: rec.checkIn || existing.checkIn,
              checkOut: rec.checkOut || existing.checkOut,
              remarks: rec.remarks || existing.remarks,
            },
          })
          results.push(updated)
        } else {
          const created = await db.attendance.create({
            data: {
              employeeId: rec.employeeId,
              date: rec.date,
              status: rec.status || 'PRESENT',
              checkIn: rec.checkIn || null,
              checkOut: rec.checkOut || null,
              remarks: rec.remarks || null,
            },
          })
          results.push(created)
        }
      }
      return NextResponse.json({ attendances: results }, { status: 201 })
    }

    // === PAYROLL ===
    if (body.action === 'processPayroll') {
      const month = body.month // e.g. "2082-03"
      const employeeIds = body.employeeIds // Array of employee IDs, or empty for all

      const where: any = { status: 'ACTIVE' }
      if (employeeIds && employeeIds.length > 0) where.id = { in: employeeIds }

      const employees = await db.employee.findMany({ where })

      const results = []
      for (const emp of employees) {
        // Check if payroll already exists for this employee+month
        const existing = await db.payrollRecord.findFirst({
          where: { employeeId: emp.id, month }
        })
        if (existing) {
          results.push({ employeeId: emp.id, status: 'already_exists', record: existing })
          continue
        }

        const basicSalary = emp.salary || 0
        const allowances = body.allowances?.[emp.id] || basicSalary * 0.2 // Default 20% allowance
        const pfDeduction = basicSalary * 0.1 // 10% PF
        const citDeduction = 0 // CIT optional
        // Nepal tax calculation (simplified)
        const taxableIncome = basicSalary + allowances - pfDeduction
        let taxDeduction = 0
        const annualTaxable = taxableIncome * 12
        if (annualTaxable <= 500000) taxDeduction = 0
        else if (annualTaxable <= 700000) taxDeduction = (annualTaxable - 500000) * 0.1 / 12
        else if (annualTaxable <= 1000000) taxDeduction = (200000 * 0.1 + (annualTaxable - 700000) * 0.2) / 12
        else if (annualTaxable <= 2000000) taxDeduction = (200000 * 0.1 + 300000 * 0.2 + (annualTaxable - 1000000) * 0.3) / 12
        else taxDeduction = (200000 * 0.1 + 300000 * 0.2 + 1000000 * 0.3 + (annualTaxable - 2000000) * 0.36) / 12

        const otherDeductions = body.deductions?.[emp.id] || 0
        const totalDeductions = pfDeduction + citDeduction + taxDeduction + otherDeductions
        const netSalary = basicSalary + allowances - totalDeductions

        const record = await db.payrollRecord.create({
          data: {
            employeeId: emp.id,
            month,
            basicSalary,
            allowances,
            deductions: otherDeductions,
            pfDeduction,
            citDeduction,
            taxDeduction: Math.round(taxDeduction),
            netSalary: Math.round(netSalary),
            status: 'PENDING',
          },
        })
        results.push(record)
      }
      return NextResponse.json({ payrollRecords: results }, { status: 201 })
    }

    // === PAY PAYROLL ===
    if (body.action === 'payPayroll') {
      const recordId = body.recordId
      if (!recordId) {
        return NextResponse.json({ error: 'Record ID required' }, { status: 400 })
      }
      const record = await db.payrollRecord.update({
        where: { id: recordId },
        data: { status: 'PAID', paidDate: new Date().toISOString().split('T')[0] },
      })

      // Create journal entry for salary payment
      try {
        const org = await db.organization.findFirst()
        const orgId = org?.id || 'org-sahakari-001'
        const salaryExpenseAccount = await db.account.findFirst({ where: { subType: 'SALARY', organizationId: orgId } })
        const cashAccount = await db.account.findFirst({ where: { subType: 'CASH', organizationId: orgId } })
        const bankAccount = await db.account.findFirst({ where: { subType: 'BANK', organizationId: orgId } })
        const paymentAccount = bankAccount || cashAccount

        if (salaryExpenseAccount && paymentAccount) {
          const emp = await db.employee.findUnique({ where: { id: record.employeeId } })
          const lastEntry = await db.journalEntry.findFirst({ where: { voucherNo: { startsWith: 'PV' } }, orderBy: { voucherNo: 'desc' } })
          const nextNum = lastEntry ? parseInt(lastEntry.voucherNo.replace('PV-', '')) + 1 : 1
          const voucherNo = `PV-${String(nextNum).padStart(4, '0')}`

          await db.journalEntry.create({
            data: {
              voucherNo,
              date: new Date().toISOString().split('T')[0],
              narration: `Salary payment - ${emp?.firstName || ''} ${emp?.lastName || ''} (${emp?.employeeId || ''}) - ${record.month}`,
              entryType: 'PAYMENT',
              status: 'POSTED',
              postedBy: 'SYSTEM',
              postedAt: new Date(),
              items: {
                create: [
                  { accountId: salaryExpenseAccount.id, debit: record.netSalary, credit: 0, description: `Salary - ${emp?.employeeId || ''}` },
                  { accountId: paymentAccount.id, debit: 0, credit: record.netSalary, description: `Payment - ${emp?.employeeId || ''}` },
                ],
              },
            },
          })
        }
      } catch (jeError) {
        console.error('Journal entry for payroll failed:', jeError)
      }

      return NextResponse.json(record)
    }

    // === LEAVE REQUEST ===
    if (body.action === 'requestLeave') {
      const leave = await db.leaveRequest.create({
        data: {
          employeeId: body.employeeId,
          leaveType: body.leaveType,
          startDate: body.startDate,
          endDate: body.endDate,
          days: parseInt(body.days) || 1,
          reason: body.reason || null,
          status: 'PENDING',
        },
      })
      return NextResponse.json(leave, { status: 201 })
    }

    // === APPROVE / REJECT LEAVE ===
    if (body.action === 'approveLeave' || body.action === 'rejectLeave') {
      const status = body.action === 'approveLeave' ? 'APPROVED' : 'REJECTED'
      const leave = await db.leaveRequest.update({
        where: { id: body.leaveId },
        data: { status, approvedBy: body.approvedBy || 'ADMIN' },
      })
      return NextResponse.json(leave)
    }

    // === CREATE EMPLOYEE (default) ===
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
    console.error('HR POST error:', error)
    return NextResponse.json({ error: 'Failed to process HR request' }, { status: 500 })
  }
}
