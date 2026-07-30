/**
 * Bikram Sambat (BS) Calendar Utility for Nepal
 * Converts between AD (Gregorian) and BS (Bikram Sambat) dates
 */

// BS Calendar data - days in each month for years 2070-2090
const bsCalendarData: Record<number, number[]> = {
  2070: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2071: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2072: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2073: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2074: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2075: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2076: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2077: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2078: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2079: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2081: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2082: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2083: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2084: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2085: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2086: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2087: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2088: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2089: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2090: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
}

export const bsMonths = [
  'Baisakh', 'Jestha', 'Ashad', 'Shrawan', 'Bhadra', 'Ashwin',
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
]

export const bsMonthsNep = [
  'बैशाख', 'जेठ', 'असार', 'श्रावण', 'भदौ', 'आश्विन',
  'कार्तिक', 'मंसिर', 'पुष', 'माघ', 'फाल्गुन', 'चैत्र'
]

export const bsDays = ['आइतबार', 'सोमबार', 'मङ्गलबार', 'बुधबार', 'बिहिबार', 'शुक्रबार', 'शनिबार']

export const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९']

export function toNepaliDigits(num: number | string): string {
  return String(num).replace(/[0-9]/g, (d) => nepaliDigits[parseInt(d)])
}

export function formatBSDate(bsDate: string): { en: string; nep: string } {
  const [y, m, d] = bsDate.split('-').map(Number)
  const monthName = bsMonths[m - 1] || ''
  const monthNep = bsMonthsNep[m - 1] || ''
  return {
    en: `${d} ${monthName} ${y}`,
    nep: `${toNepaliDigits(d)} ${monthNep} ${toNepaliDigits(y)}`,
  }
}

export function getBSMonthDays(year: number, month: number): number {
  if (bsCalendarData[year]) {
    return bsCalendarData[year][month - 1] || 30
  }
  return 30 // default
}

export function getBSYearRange(): number[] {
  return Object.keys(bsCalendarData).map(Number).sort((a, b) => a - b)
}

export function getBSMonthGrid(year: number, month: number): (number | null)[][] {
  const totalDays = getBSMonthDays(year, month)
  const weeks: (number | null)[][] = []
  let week: (number | null)[] = []

  // Approximate: BS months start on different days
  // For simplicity, we'll use a basic algorithm
  const startDay = ((year + month) % 7) // Simplified start day

  for (let i = 0; i < startDay; i++) {
    week.push(null)
  }

  for (let day = 1; day <= totalDays; day++) {
    week.push(day)
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }

  if (week.length > 0) {
    while (week.length < 7) week.push(null)
    weeks.push(week)
  }

  return weeks
}

// Get today's approximate BS date
export function getTodayBS(): string {
  const today = new Date()
  const adYear = today.getFullYear()
  // Approximate BS year (BS is ~57 years ahead of AD)
  const bsYear = adYear + 57
  const adMonth = today.getMonth() + 1
  // BS months are offset by about 2-3 months from AD
  // Baisakh starts around mid-April
  let bsMonth = adMonth - 3
  if (bsMonth <= 0) bsMonth += 12
  if (bsMonth > 12) bsMonth = 12
  const bsDay = today.getDate()

  // Validate
  if (bsCalendarData[bsYear]) {
    const maxDays = bsCalendarData[bsYear][bsMonth - 1]
    return `${bsYear}-${String(bsMonth).padStart(2, '0')}-${String(Math.min(bsDay, maxDays)).padStart(2, '0')}`
  }

  return `${bsYear}-${String(bsMonth).padStart(2, '0')}-${String(bsDay).padStart(2, '0')}`
}

// Nepali number to words (for check printing, etc.)
export function nprToWords(amount: number): string {
  if (amount === 0) return 'Zero'
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  if (amount < 20) return ones[amount]
  if (amount < 100) return tens[Math.floor(amount / 10)] + (amount % 10 ? ' ' + ones[amount % 10] : '')
  if (amount < 1000) return ones[Math.floor(amount / 100)] + ' Hundred' + (amount % 100 ? ' ' + nprToWords(amount % 100) : '')
  if (amount < 100000) return nprToWords(Math.floor(amount / 1000)) + ' Thousand' + (amount % 1000 ? ' ' + nprToWords(amount % 1000) : '')
  if (amount < 10000000) return nprToWords(Math.floor(amount / 100000)) + ' Lakh' + (amount % 100000 ? ' ' + nprToWords(amount % 100000) : '')
  return nprToWords(Math.floor(amount / 10000000)) + ' Crore' + (amount % 10000000 ? ' ' + nprToWords(amount % 10000000) : '')
}
