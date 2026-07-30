import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/members/[id] - Get a single member by id
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const member = await db.member.findUnique({
      where: { id },
      include: {
        savingsAccounts: true,
        loanApplications: true,
        shareHoldings: true,
      },
    })

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    return NextResponse.json(member)
  } catch (error) {
    console.error('Failed to fetch member:', error)
    return NextResponse.json({ error: 'Failed to fetch member' }, { status: 500 })
  }
}

// PUT /api/members/[id] - Update a member
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existingMember = await db.member.findUnique({ where: { id } })
    if (!existingMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    const member = await db.member.update({
      where: { id },
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        firstNameNep: body.firstNameNep,
        lastNameNep: body.lastNameNep,
        fatherName: body.fatherName,
        grandfatherName: body.grandfatherName,
        dateOfBirth: body.dateOfBirth,
        gender: body.gender,
        citizenshipNo: body.citizenshipNo,
        citizenshipDist: body.citizenshipDist,
        panNo: body.panNo,
        phone: body.phone,
        email: body.email,
        occupation: body.occupation,
        annualIncome: body.annualIncome,
        permanentAddr: body.permanentAddr,
        temporaryAddr: body.temporaryAddr,
        province: body.province,
        district: body.district,
        municipality: body.municipality,
        wardNo: body.wardNo,
        tole: body.tole,
        status: body.status,
        memberType: body.memberType,
        nomineeName: body.nomineeName,
        nomineeRelation: body.nomineeRelation,
        nomineeCitNo: body.nomineeCitNo,
      },
    })

    return NextResponse.json(member)
  } catch (error) {
    console.error('Failed to update member:', error)
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 })
  }
}

// DELETE /api/members/[id] - Delete a member (soft or hard)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const member = await db.member.findUnique({
      where: { id },
      include: {
        savingsAccounts: { where: { status: 'ACTIVE' } },
        loanApplications: { where: { status: { in: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'DISBURSED'] } } },
      },
    })

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    const hasActiveSavings = member.savingsAccounts.length > 0
    const hasActiveLoans = member.loanApplications.length > 0

    if (hasActiveSavings || hasActiveLoans) {
      // Soft delete - set status to RESIGNED
      const updated = await db.member.update({
        where: { id },
        data: { status: 'RESIGNED' },
      })
      return NextResponse.json({
        message: 'Member has active accounts. Status set to RESIGNED.',
        member: updated,
        softDelete: true,
      })
    }

    // Hard delete - no active accounts
    await db.member.delete({ where: { id } })
    return NextResponse.json({
      message: 'Member deleted permanently.',
      softDelete: false,
    })
  } catch (error) {
    console.error('Failed to delete member:', error)
    return NextResponse.json({ error: 'Failed to delete member' }, { status: 500 })
  }
}
