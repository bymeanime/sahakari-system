import { db } from '../src/lib/db'

const ORG_ID = 'org-sahakari-001'
const BRANCH_ID_MAIN = 'branch-main-001'
const BRANCH_ID_2 = 'branch-west-002'

async function main() {
  console.log('🌱 Seeding Sahakari System...')

  // 1. Create Organization
  await db.organization.upsert({
    where: { id: ORG_ID },
    update: {},
    create: {
      id: ORG_ID,
      name: 'Janata Sahakari Sanstha Ltd.',
      nameNepali: 'जनता सहकारी संस्था लि.',
      code: 'JSS-001',
      registrationNo: 'REG-2080-1234',
      panNo: '301234567',
      address: 'Putalisadak, Kathmandu',
      district: 'Kathmandu',
      province: 'Bagmati',
      wardNo: '5',
      municipality: 'Kathmandu Metropolitan City',
      phone: '01-4234567',
      email: 'info@janatasahakari.org.np',
      level: 'PRIMARY',
      fiscalYear: '2082/83',
      establishedDate: '2070-01-15',
      isActive: true,
    },
  })

  // 2. Create Branches
  await db.branch.upsert({
    where: { id: BRANCH_ID_MAIN },
    update: {},
    create: {
      id: BRANCH_ID_MAIN,
      name: 'Main Branch - Putalisadak',
      code: 'BR-MAIN',
      address: 'Putalisadak, Kathmandu',
      district: 'Kathmandu',
      phone: '01-4234567',
      organizationId: ORG_ID,
      isActive: true,
    },
  })

  await db.branch.upsert({
    where: { id: BRANCH_ID_2 },
    update: {},
    create: {
      id: BRANCH_ID_2,
      name: 'West Branch - Kalanki',
      code: 'BR-WEST',
      address: 'Kalanki, Kathmandu',
      district: 'Kathmandu',
      phone: '01-4345678',
      organizationId: ORG_ID,
      isActive: true,
    },
  })

  // 3. Create Users (password will be hashed in section 18)
  // Skip early user creation - users are created with hashed passwords below

  // 4. Create Members
  const memberData = [
    { memberNo: 'M-001', firstName: 'Sita', lastName: 'Thapa', firstNameNep: 'सीता', lastNameNep: 'थापा', fatherName: 'Hari Thapa', gender: 'FEMALE', phone: '9841234501', occupation: 'Business', membershipDate: '2075-03-15', district: 'Kathmandu', province: 'Bagmati', wardNo: '5', municipality: 'Kathmandu' },
    { memberNo: 'M-002', firstName: 'Hari', lastName: 'Magar', firstNameNep: 'हरि', lastNameNep: 'मगर', fatherName: 'Bhim Magar', gender: 'MALE', phone: '9841234502', occupation: 'Farmer', membershipDate: '2075-04-20', district: 'Kavre', province: 'Bagmati', wardNo: '3', municipality: 'Banepa' },
    { memberNo: 'M-003', firstName: 'Laxmi', lastName: 'Tamang', firstNameNep: 'लक्ष्मी', lastNameNep: 'तामाङ', fatherName: 'Dawa Tamang', gender: 'FEMALE', phone: '9841234503', occupation: 'Teacher', membershipDate: '2076-01-10', district: 'Lalitpur', province: 'Bagmati', wardNo: '7', municipality: 'Lalitpur' },
    { memberNo: 'M-004', firstName: 'Bishnu', lastName: 'Gurung', firstNameNep: 'विष्णु', lastNameNep: 'गुरुङ', fatherName: 'Chandra Gurung', gender: 'MALE', phone: '9841234504', occupation: 'Driver', membershipDate: '2076-06-05', district: 'Dhading', province: 'Bagmati', wardNo: '2', municipality: 'Dhading Besi' },
    { memberNo: 'M-005', firstName: 'Anita', lastName: 'Rai', firstNameNep: 'अनिता', lastNameNep: 'राई', fatherName: 'Mohan Rai', gender: 'FEMALE', phone: '9841234505', occupation: 'Tailor', membershipDate: '2077-02-18', district: 'Bhaktapur', province: 'Bagmati', wardNo: '4', municipality: 'Bhaktapur' },
    { memberNo: 'M-006', firstName: 'Krishna', lastName: 'Sharma', firstNameNep: 'कृष्ण', lastNameNep: 'शर्मा', fatherName: 'Gopal Sharma', gender: 'MALE', phone: '9841234506', occupation: 'Shopkeeper', membershipDate: '2077-08-12', district: 'Kathmandu', province: 'Bagmati', wardNo: '10', municipality: 'Kathmandu' },
    { memberNo: 'M-007', firstName: 'Maya', lastName: 'Dongol', firstNameNep: 'माया', lastNameNep: 'डंगोल', fatherName: 'Suresh Dongol', gender: 'FEMALE', phone: '9841234507', occupation: 'Business', membershipDate: '2078-01-25', district: 'Lalitpur', province: 'Bagmati', wardNo: '3', municipality: 'Lalitpur' },
    { memberNo: 'M-008', firstName: 'Prem', lastName: 'BK', firstNameNep: 'प्रेम', lastNameNep: 'बीके', fatherName: 'Kumar BK', gender: 'MALE', phone: '9841234508', occupation: 'Labour', membershipDate: '2078-05-30', district: 'Nuwakot', province: 'Bagmati', wardNo: '6', municipality: 'Bidur' },
    { memberNo: 'M-009', firstName: 'Sunita', lastName: 'Karki', firstNameNep: 'सुनिता', lastNameNep: 'कार्की', fatherName: 'Dinesh Karki', gender: 'FEMALE', phone: '9841234509', occupation: 'Health Worker', membershipDate: '2079-03-08', district: 'Kathmandu', province: 'Bagmati', wardNo: '8', municipality: 'Kathmandu' },
    { memberNo: 'M-010', firstName: 'Raj', lastName: 'Adhikari', firstNameNep: 'राज', lastNameNep: 'अधिकारी', fatherName: 'Bharat Adhikari', gender: 'MALE', phone: '9841234510', occupation: 'Government Service', membershipDate: '2079-09-15', district: 'Kavre', province: 'Bagmati', wardNo: '1', municipality: 'Dhulikhel' },
    { memberNo: 'M-011', firstName: 'Gita', lastName: 'Maharjan', firstNameNep: 'गीता', lastNameNep: 'महर्जन', fatherName: 'Hira Maharjan', gender: 'FEMALE', phone: '9841234511', occupation: 'Farmer', membershipDate: '2080-01-20', district: 'Lalitpur', province: 'Bagmati', wardNo: '9', municipality: 'Lalitpur' },
    { memberNo: 'M-012', firstName: 'Dipak', lastName: 'Poudel', firstNameNep: 'दीपक', lastNameNep: 'पौडेल', fatherName: 'Shyam Poudel', gender: 'MALE', phone: '9841234512', occupation: 'Student', membershipDate: '2080-06-10', district: 'Chitwan', province: 'Bagmati', wardNo: '4', municipality: 'Bharatpur' },
  ]

  for (const m of memberData) {
    await db.member.upsert({
      where: { memberNo: m.memberNo },
      update: {},
      create: {
        memberNo: m.memberNo,
        firstName: m.firstName,
        lastName: m.lastName,
        firstNameNep: m.firstNameNep,
        lastNameNep: m.lastNameNep,
        fatherName: m.fatherName,
        gender: m.gender,
        phone: m.phone,
        occupation: m.occupation,
        membershipDate: m.membershipDate,
        district: m.district,
        province: m.province,
        wardNo: m.wardNo,
        municipality: m.municipality,
        status: 'ACTIVE',
        memberType: 'REGULAR',
        organizationId: ORG_ID,
        branchId: BRANCH_ID_MAIN,
      },
    })
  }

  // Fetch member IDs
  const members = await db.member.findMany()
  const memberMap: Record<string, string> = {}
  for (const m of members) {
    memberMap[m.memberNo] = m.id
  }

  // 5. Create Savings Products
  const savingsProducts = [
    { id: 'sp-SV-REG', name: 'Regular Savings', nameNepali: 'नियमित बचत', code: 'SV-REG', interestRate: 6.0, minBalance: 500, minOpeningAmt: 1000, compoundingFreq: 'QUARTERLY', isDefault: true },
    { id: 'sp-SV-FD', name: 'Fixed Deposit', nameNepali: 'मुद्दती निक्षेप', code: 'SV-FD', interestRate: 10.0, minBalance: 10000, minOpeningAmt: 10000, lockInPeriod: 12, compoundingFreq: 'QUARTERLY' },
    { id: 'sp-SV-DLY', name: 'Daily Savings', nameNepali: 'दैनिक बचत', code: 'SV-DLY', interestRate: 5.0, minBalance: 100, minOpeningAmt: 100, compoundingFreq: 'MONTHLY' },
    { id: 'sp-SV-RD', name: 'Recurring Deposit', nameNepali: 'आवर्ती निक्षेप', code: 'SV-RD', interestRate: 8.5, minBalance: 500, minOpeningAmt: 500, lockInPeriod: 6, compoundingFreq: 'QUARTERLY' },
  ]

  for (const sp of savingsProducts) {
    await db.savingsProduct.upsert({
      where: { id: sp.id },
      update: {},
      create: {
        id: sp.id,
        name: sp.name,
        nameNepali: sp.nameNepali,
        code: sp.code,
        interestRate: sp.interestRate,
        minBalance: sp.minBalance,
        minOpeningAmt: sp.minOpeningAmt,
        lockInPeriod: sp.lockInPeriod || null,
        compoundingFreq: sp.compoundingFreq,
        isDefault: sp.isDefault || false,
        organizationId: ORG_ID,
      },
    })
  }

  // 6. Create Savings Accounts
  const savingsAccounts = [
    { accountNo: 'SA-001', memberNo: 'M-001', productId: 'sp-SV-REG', balance: 45000, openedDate: '2075-03-15' },
    { accountNo: 'SA-002', memberNo: 'M-002', productId: 'sp-SV-REG', balance: 28000, openedDate: '2075-04-20' },
    { accountNo: 'SA-003', memberNo: 'M-003', productId: 'sp-SV-FD', balance: 100000, openedDate: '2076-01-10' },
    { accountNo: 'SA-004', memberNo: 'M-004', productId: 'sp-SV-REG', balance: 15000, openedDate: '2076-06-05' },
    { accountNo: 'SA-005', memberNo: 'M-005', productId: 'sp-SV-DLY', balance: 8500, openedDate: '2077-02-18' },
    { accountNo: 'SA-006', memberNo: 'M-006', productId: 'sp-SV-REG', balance: 62000, openedDate: '2077-08-12' },
    { accountNo: 'SA-007', memberNo: 'M-007', productId: 'sp-SV-FD', balance: 200000, openedDate: '2078-01-25' },
    { accountNo: 'SA-008', memberNo: 'M-008', productId: 'sp-SV-DLY', balance: 3200, openedDate: '2078-05-30' },
    { accountNo: 'SA-009', memberNo: 'M-009', productId: 'sp-SV-RD', balance: 36000, openedDate: '2079-03-08' },
    { accountNo: 'SA-010', memberNo: 'M-010', productId: 'sp-SV-REG', balance: 78000, openedDate: '2079-09-15' },
  ]

  for (const sa of savingsAccounts) {
    await db.savingsAccount.upsert({
      where: { accountNo: sa.accountNo },
      update: {},
      create: {
        accountNo: sa.accountNo,
        memberId: memberMap[sa.memberNo],
        productId: sa.productId,
        balance: sa.balance,
        interestEarned: sa.balance * 0.06,
        openedDate: sa.openedDate,
        status: 'ACTIVE',
      },
    })
  }

  // 7. Create Loan Products
  const loanProducts = [
    { id: 'lp-LN-GEN', name: 'General Loan', nameNepali: 'सामान्य ऋण', code: 'LN-GEN', interestRate: 12.0, maxAmount: 500000, minAmount: 10000, maxTerm: 60, minTerm: 6, repaymentSchedule: 'MONTHLY', guarantorRequired: true },
    { id: 'lp-LN-BIZ', name: 'Business Loan', nameNepali: 'व्यापार ऋण', code: 'LN-BIZ', interestRate: 14.0, maxAmount: 2000000, minAmount: 50000, maxTerm: 84, minTerm: 12, repaymentSchedule: 'MONTHLY', collateralRequired: true, guarantorRequired: true },
    { id: 'lp-LN-EMG', name: 'Emergency Loan', nameNepali: 'आकस्मिक ऋण', code: 'LN-EMG', interestRate: 10.0, maxAmount: 100000, minAmount: 5000, maxTerm: 24, minTerm: 3, repaymentSchedule: 'MONTHLY' },
    { id: 'lp-LN-AGR', name: 'Agriculture Loan', nameNepali: 'कृषि ऋण', code: 'LN-AGR', interestRate: 8.0, maxAmount: 500000, minAmount: 20000, maxTerm: 36, minTerm: 6, repaymentSchedule: 'QUARTERLY', guarantorRequired: true },
    { id: 'lp-LN-EDU', name: 'Education Loan', nameNepali: 'शिक्षा ऋण', code: 'LN-EDU', interestRate: 7.0, maxAmount: 300000, minAmount: 10000, maxTerm: 60, minTerm: 12, repaymentSchedule: 'MONTHLY' },
  ]

  for (const lp of loanProducts) {
    await db.loanProduct.upsert({
      where: { id: lp.id },
      update: {},
      create: {
        id: lp.id,
        name: lp.name,
        nameNepali: lp.nameNepali,
        code: lp.code,
        interestRate: lp.interestRate,
        maxAmount: lp.maxAmount,
        minAmount: lp.minAmount,
        maxTerm: lp.maxTerm,
        minTerm: lp.minTerm,
        repaymentSchedule: lp.repaymentSchedule,
        collateralRequired: lp.collateralRequired || false,
        guarantorRequired: lp.guarantorRequired || false,
        organizationId: ORG_ID,
      },
    })
  }

  // 8. Create Loan Applications
  const loanApps = [
    { applicationNo: 'LA-001', memberNo: 'M-001', productId: 'lp-LN-GEN', requestedAmount: 200000, approvedAmount: 200000, term: 24, purpose: 'Home renovation', status: 'DISBURSED', interestRate: 12.0, disbursedAmount: 200000, outstandingAmount: 145000, emiAmount: 9800 },
    { applicationNo: 'LA-002', memberNo: 'M-002', productId: 'lp-LN-AGR', requestedAmount: 100000, approvedAmount: 100000, term: 12, purpose: 'Vegetable farming', status: 'DISBURSED', interestRate: 8.0, disbursedAmount: 100000, outstandingAmount: 65000, emiAmount: 8700 },
    { applicationNo: 'LA-003', memberNo: 'M-006', productId: 'lp-LN-BIZ', requestedAmount: 500000, approvedAmount: 450000, term: 36, purpose: 'Expand shop', status: 'DISBURSED', interestRate: 14.0, disbursedAmount: 450000, outstandingAmount: 380000, emiAmount: 15400 },
    { applicationNo: 'LA-004', memberNo: 'M-003', productId: 'lp-LN-EDU', requestedAmount: 150000, approvedAmount: null, term: 24, purpose: 'MBA studies', status: 'PENDING', guarantorId: 'M-010' },
    { applicationNo: 'LA-005', memberNo: 'M-005', productId: 'lp-LN-EMG', requestedAmount: 50000, approvedAmount: null, term: 6, purpose: 'Medical emergency', status: 'UNDER_REVIEW' },
    { applicationNo: 'LA-006', memberNo: 'M-009', productId: 'lp-LN-GEN', requestedAmount: 80000, approvedAmount: 80000, term: 12, purpose: 'Family event', status: 'APPROVED', interestRate: 12.0 },
  ]

  for (const la of loanApps) {
    await db.loanApplication.upsert({
      where: { applicationNo: la.applicationNo },
      update: {},
      create: {
        applicationNo: la.applicationNo,
        memberId: memberMap[la.memberNo],
        productId: la.productId,
        requestedAmount: la.requestedAmount,
        approvedAmount: la.approvedAmount,
        term: la.term,
        purpose: la.purpose,
        status: la.status,
        interestRate: la.interestRate || null,
        disbursedAmount: la.disbursedAmount || null,
        outstandingAmount: la.outstandingAmount || null,
        emiAmount: la.emiAmount || null,
        guarantorId: la.guarantorId ? memberMap[la.guarantorId] : null,
        applicationDate: '2082-01-15',
        disbursementDate: la.status === 'DISBURSED' ? '2082-02-01' : null,
      },
    })
  }

  // 9. Create Chart of Accounts
  const accounts = [
    { code: '1000', name: 'Assets', nameNepali: 'सम्पत्ति', type: 'ASSET', subType: 'HEADER' },
    { code: '1100', name: 'Current Assets', nameNepali: 'चालु सम्पत्ति', type: 'ASSET', subType: 'HEADER' },
    { code: '1110', name: 'Cash in Hand', nameNepali: 'हातमा नगद', type: 'ASSET', subType: 'CASH' },
    { code: '1120', name: 'Bank Account', nameNepali: 'बैंक खाता', type: 'ASSET', subType: 'BANK' },
    { code: '1130', name: 'Savings Deposits', nameNepali: 'बचत निक्षेप', type: 'ASSET', subType: 'RECEIVABLE' },
    { code: '1140', name: 'Loan Receivable', nameNepali: 'ऋण प्राप्य', type: 'ASSET', subType: 'RECEIVABLE' },
    { code: '1200', name: 'Fixed Assets', nameNepali: 'स्थिर सम्पत्ति', type: 'ASSET', subType: 'HEADER' },
    { code: '1210', name: 'Land & Building', nameNepali: 'जग्गा र भवन', type: 'ASSET', subType: 'FIXED' },
    { code: '1220', name: 'Furniture & Equipment', nameNepali: 'फर्निचर र उपकरण', type: 'ASSET', subType: 'FIXED' },
    { code: '2000', name: 'Liabilities', nameNepali: 'दायित्व', type: 'LIABILITY', subType: 'HEADER' },
    { code: '2100', name: 'Member Deposits', nameNepali: 'सदस्य निक्षेप', type: 'LIABILITY', subType: 'PAYABLE' },
    { code: '2200', name: 'Share Capital', nameNepali: 'शेयर पूँजी', type: 'LIABILITY', subType: 'EQUITY' },
    { code: '2300', name: 'Reserve Fund', nameNepali: 'रिजर्भ कोष', type: 'LIABILITY', subType: 'EQUITY' },
    { code: '3000', name: 'Income', nameNepali: 'आम्दानी', type: 'INCOME', subType: 'HEADER' },
    { code: '3100', name: 'Interest Income', nameNepali: 'ब्याज आम्दानी', type: 'INCOME', subType: 'INTEREST' },
    { code: '3200', name: 'Fee Income', nameNepali: 'शुल्क आम्दानी', type: 'INCOME', subType: 'FEE' },
    { code: '3300', name: 'Other Income', nameNepali: 'अन्य आम्दानी', type: 'INCOME', subType: 'OTHER' },
    { code: '4000', name: 'Expenses', nameNepali: 'खर्च', type: 'EXPENSE', subType: 'HEADER' },
    { code: '4100', name: 'Interest Expense', nameNepali: 'ब्याज खर्च', type: 'EXPENSE', subType: 'INTEREST' },
    { code: '4200', name: 'Salary & Wages', nameNepali: 'तलब र ज्याला', type: 'EXPENSE', subType: 'SALARY' },
    { code: '4300', name: 'Office Expenses', nameNepali: 'कार्यालय खर्च', type: 'EXPENSE', subType: 'OFFICE' },
    { code: '4400', name: 'Depreciation', nameNepali: 'ह्रास', type: 'EXPENSE', subType: 'DEPRECIATION' },
    { code: '5000', name: 'Equity', nameNepali: 'इक्विटी', type: 'EQUITY', subType: 'HEADER' },
    { code: '5100', name: 'Retained Earnings', nameNepali: 'सञ्चित आम्दानी', type: 'EQUITY', subType: 'EQUITY' },
  ]

  const accountMap: Record<string, string> = {}
  for (const acct of accounts) {
    const created = await db.account.create({
      data: {
        code: acct.code,
        name: acct.name,
        nameNepali: acct.nameNepali,
        type: acct.type,
        subType: acct.subType,
        organizationId: ORG_ID,
        isSystem: true,
      },
    })
    accountMap[acct.code] = created.id
  }

  // Update parent references
  const parentMap: Record<string, string> = {
    '1100': '1000', '1200': '1000',
    '1110': '1100', '1120': '1100', '1130': '1100', '1140': '1100',
    '1210': '1200', '1220': '1200',
    '2100': '2000', '2200': '2000', '2300': '2000',
    '3100': '3000', '3200': '3000', '3300': '3000',
    '4100': '4000', '4200': '4000', '4300': '4000', '4400': '4000',
    '5100': '5000',
  }

  for (const [code, parentCode] of Object.entries(parentMap)) {
    if (accountMap[code] && accountMap[parentCode]) {
      await db.account.update({
        where: { id: accountMap[code] },
        data: { parentId: accountMap[parentCode] },
      })
    }
  }

  // 10. Create Employees
  const employees = [
    { employeeId: 'EMP-001', firstName: 'Ram', lastName: 'Bahadur', firstNameNep: 'राम', lastNameNep: 'बहादुर', position: 'Manager', department: 'Administration', salary: 45000, joinDate: '2070-01-15' },
    { employeeId: 'EMP-002', firstName: 'Sita', lastName: 'Kumari', firstNameNep: 'सीता', lastNameNep: 'कुमारी', position: 'Accountant', department: 'Finance', salary: 35000, joinDate: '2072-03-10' },
    { employeeId: 'EMP-003', firstName: 'Hari', lastName: 'Prasad', firstNameNep: 'हरि', lastNameNep: 'प्रसाद', position: 'Loan Officer', department: 'Credit', salary: 30000, joinDate: '2074-06-20' },
    { employeeId: 'EMP-004', firstName: 'Maya', lastName: 'Devi', firstNameNep: 'माया', lastNameNep: 'देवी', position: 'Teller', department: 'Operations', salary: 25000, joinDate: '2076-01-05' },
    { employeeId: 'EMP-005', firstName: 'Bikash', lastName: 'Thapa', firstNameNep: 'विकास', lastNameNep: 'थापा', position: 'Field Officer', department: 'Credit', salary: 22000, joinDate: '2078-04-15' },
    { employeeId: 'EMP-006', firstName: 'Anju', lastName: 'Rai', firstNameNep: 'अञ्जु', lastNameNep: 'राई', position: 'Cashier', department: 'Operations', salary: 23000, joinDate: '2079-02-01' },
  ]

  for (const emp of employees) {
    await db.employee.upsert({
      where: { employeeId: emp.employeeId },
      update: {},
      create: {
        employeeId: emp.employeeId,
        firstName: emp.firstName,
        lastName: emp.lastName,
        firstNameNep: emp.firstNameNep,
        lastNameNep: emp.lastNameNep,
        position: emp.position,
        department: emp.department,
        salary: emp.salary,
        joinDate: emp.joinDate,
        status: 'ACTIVE',
        organizationId: ORG_ID,
        branchId: BRANCH_ID_MAIN,
      },
    })
  }

  // 11. Create Share Products
  await db.shareProduct.upsert({
    where: { id: 'sp-share-001' },
    update: {},
    create: {
      id: 'sp-share-001',
      name: 'Ordinary Share',
      nameNepali: 'साधारण शेयर',
      faceValue: 100,
      totalShares: 10000,
      issuedShares: 3200,
      availableShares: 6800,
      organizationId: ORG_ID,
    },
  })

  // 12. Create Share Holdings
  const shareHoldings = [
    { memberNo: 'M-001', shareCount: 50, shareValue: 5000 },
    { memberNo: 'M-002', shareCount: 30, shareValue: 3000 },
    { memberNo: 'M-003', shareCount: 25, shareValue: 2500 },
    { memberNo: 'M-006', shareCount: 100, shareValue: 10000 },
    { memberNo: 'M-007', shareCount: 40, shareValue: 4000 },
    { memberNo: 'M-010', shareCount: 75, shareValue: 7500 },
  ]

  for (const sh of shareHoldings) {
    await db.shareHolding.create({
      data: {
        memberId: memberMap[sh.memberNo],
        productId: 'sp-share-001',
        shareCount: sh.shareCount,
        shareValue: sh.shareValue,
        purchaseDate: '2080-01-01',
        status: 'ACTIVE',
      },
    })
  }

  // 13. Create Assets
  const assets = [
    { name: 'Office Building', nameNepali: 'कार्यालय भवन', code: 'AST-001', category: 'BUILDING', purchasePrice: 5000000, currentValue: 4500000, depreciationRate: 2.5, location: 'Putalisadak' },
    { name: 'Computer Set', nameNepali: 'कम्प्युटर सेट', code: 'AST-002', category: 'IT', purchasePrice: 80000, currentValue: 50000, depreciationRate: 20, location: 'Main Office' },
    { name: 'Safe Box', nameNepali: 'सेफ बक्स', code: 'AST-003', category: 'FURNITURE', purchasePrice: 150000, currentValue: 120000, depreciationRate: 10, location: 'Main Office' },
    { name: 'Office Furniture', nameNepali: 'कार्यालय फर्निचर', code: 'AST-004', category: 'FURNITURE', purchasePrice: 200000, currentValue: 150000, depreciationRate: 10, location: 'Main Office' },
    { name: 'Motorcycle', nameNepali: 'मोटरसाइकल', code: 'AST-005', category: 'VEHICLE', purchasePrice: 250000, currentValue: 180000, depreciationRate: 15, location: 'Field Office' },
  ]

  for (const ast of assets) {
    await db.asset.upsert({
      where: { code: ast.code },
      update: {},
      create: {
        name: ast.name,
        nameNepali: ast.nameNepali,
        code: ast.code,
        category: ast.category,
        purchasePrice: ast.purchasePrice,
        currentValue: ast.currentValue,
        depreciationRate: ast.depreciationRate,
        accumulatedDep: ast.purchasePrice - ast.currentValue,
        location: ast.location,
        status: 'ACTIVE',
        organizationId: ORG_ID,
      },
    })
  }

  // 14. Create Inventory Items
  const inventoryItems = [
    { name: 'Passbook', nameNepali: 'पासबुक', code: 'INV-001', category: 'Stationery', unit: 'PCS', quantity: 500, minStockLevel: 100, unitPrice: 25, supplier: 'Nepal Press' },
    { name: 'Voucher Book', nameNepali: 'भौचर बुक', code: 'INV-002', category: 'Stationery', unit: 'PCS', quantity: 200, minStockLevel: 50, unitPrice: 50, supplier: 'Nepal Press' },
    { name: 'Receipt Book', nameNepali: 'रसिद बुक', code: 'INV-003', category: 'Stationery', unit: 'PCS', quantity: 150, minStockLevel: 30, unitPrice: 40, supplier: 'Nepal Press' },
    { name: 'Stamp Paper', nameNepali: 'टिकट कागज', code: 'INV-004', category: 'Stationery', unit: 'PCS', quantity: 1000, minStockLevel: 200, unitPrice: 5, supplier: 'General Store' },
    { name: 'Printer Cartridge', nameNepali: 'प्रिन्टर कार्ट्रिज', code: 'INV-005', category: 'IT Supplies', unit: 'PCS', quantity: 10, minStockLevel: 3, unitPrice: 3500, supplier: 'IT Hub' },
  ]

  for (const inv of inventoryItems) {
    await db.inventoryItem.upsert({
      where: { code: inv.code },
      update: {},
      create: {
        name: inv.name,
        nameNepali: inv.nameNepali,
        code: inv.code,
        category: inv.category,
        unit: inv.unit,
        quantity: inv.quantity,
        minStockLevel: inv.minStockLevel,
        unitPrice: inv.unitPrice,
        totalValue: inv.quantity * inv.unitPrice,
        supplier: inv.supplier,
        organizationId: ORG_ID,
      },
    })
  }

  // 15. Create Journal Entries (using upsert to avoid unique constraint errors)
  const journalEntries = [
    { voucherNo: 'JE-001', date: '2082-01-15', narration: 'Opening balance entry', status: 'POSTED', entryType: 'JOURNAL', items: [{ accountId: accountMap['1110'], debit: 500000, credit: 0 }, { accountId: accountMap['2100'], debit: 0, credit: 500000 }] },
    { voucherNo: 'JE-002', date: '2082-01-20', narration: 'Loan disbursement', status: 'POSTED', entryType: 'PAYMENT', items: [{ accountId: accountMap['1140'], debit: 200000, credit: 0 }, { accountId: accountMap['1110'], debit: 0, credit: 200000 }] },
    { voucherNo: 'JE-003', date: '2082-02-01', narration: 'Salary payment', status: 'POSTED', entryType: 'PAYMENT', items: [{ accountId: accountMap['4200'], debit: 180000, credit: 0 }, { accountId: accountMap['1110'], debit: 0, credit: 180000 }] },
  ]

  for (const je of journalEntries) {
    await db.journalEntry.upsert({
      where: { voucherNo: je.voucherNo },
      update: {},
      create: {
        voucherNo: je.voucherNo,
        date: je.date,
        narration: je.narration,
        status: je.status as any,
        entryType: je.entryType as any,
        items: {
          create: je.items.map((item: any) => ({
            accountId: item.accountId,
            debit: item.debit,
            credit: item.credit,
          })),
        },
      },
    })
  }

  // 16. Create Meetings
  const meetings = [
    { title: 'Annual General Meeting 2082', titleNepali: 'वार्षिक आम सभा २०८२', type: 'ANNUAL_GENERAL', date: '2082-04-15', time: '10:00', venue: 'Community Hall, Putalisadak', status: 'SCHEDULED', agenda: 'Review annual report, approve budget, elect board members' },
    { title: 'Board Meeting - Ashad', titleNepali: 'बोर्ड बैठक - असार', type: 'BOARD', date: '2082-02-30', time: '14:00', venue: 'Office Conference Room', status: 'COMPLETED', agenda: 'Review loan applications, approve new policies', decisions: 'Approved 5 new loan applications, revised interest rates for FD' },
    { title: 'Center Meeting - Group A', titleNepali: 'केन्द्र बैठक - समूह ए', type: 'CENTER', date: '2082-03-05', time: '08:00', venue: 'Community Center', status: 'COMPLETED', agenda: 'Monthly savings collection, loan discussion' },
  ]

  for (const mt of meetings) {
    await db.meeting.create({
      data: {
        title: mt.title,
        titleNepali: mt.titleNepali,
        type: mt.type,
        date: mt.date,
        time: mt.time,
        venue: mt.venue,
        status: mt.status,
        agenda: mt.agenda,
        decisions: mt.decisions || null,
        organizationId: ORG_ID,
      },
    })
  }

  // 17. Create Fiscal Year
  await db.fiscalYear.upsert({
    where: { id: 'fy-2082' },
    update: {},
    create: {
      id: 'fy-2082',
      name: '2082/83',
      startDate: '2082-01-01',
      endDate: '2082-12-30',
      isActive: true,
      isClosed: false,
      organizationId: ORG_ID,
    },
  })

  // 18. Create Users for Authentication
  const bcryptModule = await import('bcryptjs')
  const hashedPassword = await bcryptModule.default.hash('admin123', 10)

  const users = [
    { email: 'admin@janatasahakari.org.np', name: 'Ram Bahadur Shrestha', nameNepali: 'राम बहादुर श्रेष्ठ', role: 'SUPER_ADMIN', phone: '9841234567' },
    { email: 'manager@janatasahakari.org.np', name: 'Sita Devi Thapa', nameNepali: 'सीता देवी थापा', role: 'MANAGER', phone: '9841234568' },
    { email: 'accountant@janatasahakari.org.np', name: 'Hari Prasad Adhikari', nameNepali: 'हरि प्रसाद अधिकारी', role: 'ACCOUNTANT', phone: '9841234569' },
    { email: 'teller@janatasahakari.org.np', name: 'Maya Kumari Tamang', nameNepali: 'माया कुमारी तामाङ', role: 'TELLER', phone: '9841234570' },
    { email: 'staff@janatasahakari.org.np', name: 'Bishnu Lal Maharjan', nameNepali: 'विष्णु लाल महर्जन', role: 'STAFF', phone: '9841234571' },
  ]

  for (const u of users) {
    await db.user.upsert({
      where: { email: u.email },
      update: { password: hashedPassword },
      create: {
        email: u.email,
        password: hashedPassword,
        name: u.name,
        nameNepali: u.nameNepali,
        role: u.role,
        phone: u.phone,
        organizationId: ORG_ID,
        branchId: BRANCH_ID_MAIN,
        isActive: true,
      },
    })
  }

  // 19. Create Notifications
  const notifications = [
    { userId: 'user-admin', title: 'EMI Due Reminder', message: 'Loan LA-001 EMI of NPR 8,500 is due on 2082-04-15', type: 'WARNING' },
    { userId: 'user-admin', title: 'Loan Application Pending', message: '3 loan applications are pending review', type: 'INFO' },
    { userId: 'user-admin', title: 'Dormant Account Alert', message: 'Account SA-005 has been dormant for 6 months', type: 'WARNING' },
  ]

  for (const n of notifications) {
    await db.notification.create({
      data: {
        userId: n.userId,
        title: n.title,
        message: n.message,
        type: n.type,
      },
    })
  }

  console.log('✅ Seeding complete! Sahakari system is ready.')
  console.log('📧 Login credentials: admin@janatasahakari.org.np / admin123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
