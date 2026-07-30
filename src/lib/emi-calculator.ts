// ============================================================
// Sahakari System Management - EMI Calculation Engine
// इक्वेटेड मासिक किस्ती (EMI) गणना इन्जिन
// ============================================================
// यो मोड्यलले नेपाली सहकारी संस्थाहरूको लागि EMI गणना गर्दछ।
// यसले फ्ल्याट रेट र घट्दो शेष दुवै विधिहरूलाई समर्थन गर्दछ।
//
// This module calculates Equated Monthly Installments (EMI) for
// Nepalese cooperative institutions. It supports both flat-rate
// and reducing-balance methods as per NRB directives.
// ============================================================

/**
 * EMI गणना विधि / EMI Calculation Method
 */
export type EMIMethod = 'FLAT_RATE' | 'REDUCING_BALANCE'

/**
 * ऋण तिरो तालिका पंक्ति / Loan repayment schedule row
 */
export interface RepaymentScheduleRow {
  /** किस्ती नम्बर / Installment number */
  installmentNo: number
  /** EMI रकम / EMI amount */
  emiAmount: number
  /** मुख्य रकम भाग / Principal component */
  principal: number
   /** ब्याज भाग / Interest component */
  interest: number
  /** बाँकी मुख्य रकम / Outstanding principal balance */
  outstandingBalance: number
  /** कुल तिरो / Total payment (principal + interest) */
  totalPayment: number
}

/**
 * EMI गणना परिणाम / EMI Calculation Result
 */
export interface EMICalculationResult {
  /** मुख्य रकम / Principal amount */
  principal: number
  /** वार्षिक ब्याज दर / Annual interest rate (%) */
  annualRate: number
  /** अवधि (महिनामा) / Term in months */
  termMonths: number
  /** गणना विधि / Calculation method */
  method: EMIMethod
  /** मासिक EMI / Monthly EMI */
  emi: number
  /** कुल ब्याज / Total interest payable */
  totalInterest: number
  /** कुल तिरो / Total payment (principal + interest) */
  totalPayment: number
  /** तिरो तालिका / Repayment schedule */
  schedule: RepaymentScheduleRow[]
}

// -----------------------------------------------------------
// फ्ल्याट रेट EMI गणना / Flat Rate EMI Calculation
// -----------------------------------------------------------
// फ्ल्याट रेट विधिमा ब्याज मुख्य रकममा गणना गरिन्छ
// र अवधि भरि समान रहन्छ।
//
// In flat-rate method, interest is calculated on the original
// principal amount throughout the loan tenure.
// Formula: EMI = (Principal + Total Interest) / TermMonths
// Where: Total Interest = Principal × AnnualRate × TermMonths / 12 / 100
// -----------------------------------------------------------

/**
 * फ्ल्याट रेट विधिले EMI गणना गर्नुहोस्
 * Calculate EMI using the flat-rate method
 *
 * @param principal - मुख्य ऋण रकम (Loan principal amount)
 * @param annualRate - वार्षिक ब्याज दर प्रतिशतमा (Annual interest rate in %)
 * @param termMonths - अवधि महिनामा (Loan term in months)
 * @returns EMI रकम (Monthly EMI amount)
 */
export function calculateFlatRateEMI(
  principal: number,
  annualRate: number,
  termMonths: number
): number {
  if (principal <= 0) throw new Error('Principal must be positive / मुख्य रकम धनात्मक हुनुपर्छ')
  if (annualRate < 0) throw new Error('Interest rate cannot be negative / ब्याज दर ऋणात्मक हुन सक्दैन')
  if (termMonths <= 0) throw new Error('Term must be positive / अवधि धनात्मक हुनुपर्छ')

  // कुल ब्याज = मुख्य रकम × वार्षिक दर × अवधि(वर्ष) / 100
  const totalInterest = (principal * annualRate * termMonths) / (12 * 100)
  // EMI = (मुख्य रकम + कुल ब्याज) / अवधि(महिना)
  const emi = (principal + totalInterest) / termMonths
  return Math.round(emi * 100) / 100
}

// -----------------------------------------------------------
// घट्दो शेष EMI गणना / Reducing Balance EMI Calculation
// -----------------------------------------------------------
// घट्दो शेष विधिमा ब्याज बाँकी मुख्य रकममा गणना गरिन्छ।
// हरेक किस्ती भुक्तानी पछि ब्याज घट्दै जान्छ।
//
// In reducing-balance method, interest is calculated on the
// outstanding principal balance, which decreases with each payment.
// Formula: EMI = P × r × (1+r)^n / ((1+r)^n - 1)
// Where: P = principal, r = monthly rate, n = term in months
// -----------------------------------------------------------

/**
 * घट्दो शेष विधिले EMI गणना गर्नुहोस्
 * Calculate EMI using the reducing-balance method
 *
 * @param principal - मुख्य ऋण रकम (Loan principal amount)
 * @param annualRate - वार्षिक ब्याज दर प्रतिशतमा (Annual interest rate in %)
 * @param termMonths - अवधि महिनामा (Loan term in months)
 * @returns EMI रकम (Monthly EMI amount)
 */
export function calculateReducingBalanceEMI(
  principal: number,
  annualRate: number,
  termMonths: number
): number {
  if (principal <= 0) throw new Error('Principal must be positive / मुख्य रकम धनात्मक हुनुपर्छ')
  if (annualRate < 0) throw new Error('Interest rate cannot be negative / ब्याज दर ऋणात्मक हुन सक्दैन')
  if (termMonths <= 0) throw new Error('Term must be positive / अवधि धनात्मक हुनुपर्छ')

  // शून्य ब्याज दरको लागि / For zero interest rate
  if (annualRate === 0) {
    return Math.round((principal / termMonths) * 100) / 100
  }

  // मासिक ब्याज दर / Monthly interest rate
  const monthlyRate = annualRate / (12 * 100)

  // EMI = P × r × (1+r)^n / ((1+r)^n - 1)
  const factor = Math.pow(1 + monthlyRate, termMonths)
  const emi = principal * monthlyRate * factor / (factor - 1)

  return Math.round(emi * 100) / 100
}

// -----------------------------------------------------------
// तिरो तालिका उत्पादन / Repayment Schedule Generation
// -----------------------------------------------------------

/**
 * पूर्ण तिरो तालिका उत्पादन गर्नुहोस्
 * Generate a full loan repayment (amortization) schedule
 *
 * @param principal - मुख्य ऋण रकम (Loan principal amount)
 * @param annualRate - वार्षिक ब्याज दर प्रतिशतमा (Annual interest rate in %)
 * @param termMonths - अवधि महिनामा (Loan term in months)
 * @param method - गणना विधि (Calculation method: 'FLAT_RATE' or 'REDUCING_BALANCE')
 * @returns EMI गणना परिणाम तिरो तालिका सहित (EMI calculation result with schedule)
 */
export function generateRepaymentSchedule(
  principal: number,
  annualRate: number,
  termMonths: number,
  method: EMIMethod = 'REDUCING_BALANCE'
): EMICalculationResult {
  const emi = method === 'FLAT_RATE'
    ? calculateFlatRateEMI(principal, annualRate, termMonths)
    : calculateReducingBalanceEMI(principal, annualRate, termMonths)

  const schedule: RepaymentScheduleRow[] = []
  let outstandingBalance = principal
  let totalInterest = 0

  const monthlyRate = annualRate / (12 * 100)

  if (method === 'FLAT_RATE') {
    // फ्ल्याट रेट: प्रत्येक किस्तीमा समान मुख्य रकम र समान ब्याज
    // Flat rate: equal principal and equal interest in each installment
    const monthlyPrincipal = principal / termMonths
    const monthlyInterest = (principal * annualRate) / (12 * 100)

    for (let i = 1; i <= termMonths; i++) {
      outstandingBalance -= monthlyPrincipal
      totalInterest += monthlyInterest

      schedule.push({
        installmentNo: i,
        emiAmount: emi,
        principal: Math.round(monthlyPrincipal * 100) / 100,
        interest: Math.round(monthlyInterest * 100) / 100,
        outstandingBalance: Math.round(Math.max(0, outstandingBalance) * 100) / 100,
        totalPayment: Math.round((monthlyPrincipal + monthlyInterest) * 100) / 100,
      })
    }
  } else {
    // घट्दो शेष: प्रत्येक किस्तीमा ब्याज बाँकी शेषमा गणना
    // Reducing balance: interest calculated on outstanding balance
    for (let i = 1; i <= termMonths; i++) {
      const interestComponent = outstandingBalance * monthlyRate
      const principalComponent = emi - interestComponent
      outstandingBalance -= principalComponent
      totalInterest += interestComponent

      schedule.push({
        installmentNo: i,
        emiAmount: emi,
        principal: Math.round(principalComponent * 100) / 100,
        interest: Math.round(interestComponent * 100) / 100,
        outstandingBalance: Math.round(Math.max(0, outstandingBalance) * 100) / 100,
        totalPayment: Math.round(emi * 100) / 100,
      })
    }
  }

  return {
    principal,
    annualRate,
    termMonths,
    method,
    emi,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalPayment: Math.round((principal + totalInterest) * 100) / 100,
    schedule,
  }
}
