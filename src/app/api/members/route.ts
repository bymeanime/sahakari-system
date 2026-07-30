import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/members - List all members
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const memberType = searchParams.get('memberType')

    const where: any = {}
    if (status && status !== 'ALL') where.status = status
    if (memberType && memberType !== 'ALL') where.memberType = memberType
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { memberNo: { contains: search } },
        { phone: { contains: search } },
      ]
    }

    const members = await db.member.findMany({
      where,
      include: {
        savingsAccounts: { include: { product: true } },
        loanApplications: { include: { product: true } },
        shareHoldings: true,
      },
      orderBy: { memberNo: 'asc' },
    })

    return NextResponse.json(members)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
  }
}

// POST /api/members - Create a new member
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // KYC field validation (Fix 5)
    const kycErrors: string[] = []
    if (!body.citizenshipNo) {
      kycErrors.push('Citizenship number is required / नागरिकता नम्बर आवश्यक छ')
    }
    if (!body.permanentAddr) {
      kycErrors.push('Permanent address is required / स्थायी ठेगाना आवश्यक छ')
    }
    if (!body.dateOfBirth) {
      kycErrors.push('Date of birth is required / जन्म मिति आवश्यक छ')
    }
    if (kycErrors.length > 0) {
      return NextResponse.json(
        { error: 'KYC validation failed / KYC प्रमाणीकरण असफल', details: kycErrors },
        { status: 400 }
      )
    }

    const lastMember = await db.member.findFirst({ orderBy: { memberNo: 'desc' } })
    const nextNum = lastMember ? parseInt(lastMember.memberNo.replace('M-', '')) + 1 : 1
    const memberNo = `M-${String(nextNum).padStart(3, '0')}`

    const member = await db.member.create({
      data: {
        memberNo,
        firstName: body.firstName,
        lastName: body.lastName,
        firstNameNep: body.firstNameNep || null,
        lastNameNep: body.lastNameNep || null,
        fatherName: body.fatherName || null,
        grandfatherName: body.grandfatherName || null,
        dateOfBirth: body.dateOfBirth || null,
        gender: body.gender || null,
        citizenshipNo: body.citizenshipNo || null,
        citizenshipDist: body.citizenshipDist || null,
        panNo: body.panNo || null,
        phone: body.phone || null,
        email: body.email || null,
        occupation: body.occupation || null,
        annualIncome: body.annualIncome ? parseFloat(body.annualIncome) : null,
        permanentAddr: body.permanentAddr || null,
        temporaryAddr: body.temporaryAddr || null,
        province: body.province || null,
        district: body.district || null,
        municipality: body.municipality || null,
        wardNo: body.wardNo || null,
        tole: body.tole || null,
        membershipDate: body.membershipDate || new Date().toISOString().split('T')[0],
        status: 'ACTIVE',
        memberType: body.memberType || 'REGULAR',
        nomineeName: body.nomineeName || null,
        nomineeRelation: body.nomineeRelation || null,
        nomineeCitNo: body.nomineeCitNo || null,
        organizationId: body.organizationId || 'org-sahakari-001',
        branchId: body.branchId || null,
        introducedBy: body.introducedBy || null,
      },
    })

    return NextResponse.json(member, { status: 201 })
  } catch (error) {
    console.error('Member creation error:', error)
    return NextResponse.json({ error: 'Failed to create member' }, { status: 500 })
  }
}
