/**
 * Bikram Sambat (BS) Calendar Utility for Nepal
 * Converts between AD (Gregorian) and BS (Bikram Sambat) dates
 *
 * Uses accurate month-length data sourced from nepali-date-converter
 * and a fixed reference date for precise AD↔BS conversion.
 */

// BS Calendar data - days in each month for years 2070-2090
// Verified against nepali-date-converter library for accuracy
// Month order: Baisakh, Jestha, Ashad, Shrawan, Bhadra, Ashwin,
//              Kartik, Mangsir, Poush, Magh, Falgun, Chaitra
const bsCalendarData: Record<number, number[]> = {
  2070: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2071: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2072: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2073: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2074: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2075: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2076: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2077: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2078: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2079: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2081: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2082: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2083: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2084: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2085: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2086: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2087: [31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 30, 30],
  2088: [30, 31, 32, 32, 30, 31, 30, 30, 29, 30, 30, 30],
  2089: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2090: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
}

// Reference point: BS 2070/01/01 (Baisakh 1, 2070) = April 14, 2013 AD
const BS_REF_YEAR = 2070
const BS_REF_MONTH = 1
const BS_REF_DAY = 1
const AD_REF_DATE = new Date(2013, 3, 14) // April 14, 2013 (month is 0-indexed)

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

  // Calculate the correct start day of the week for the first day of this BS month
  // We use the adToBS reference point and walk forward to find the weekday
  let startDay = 0 // Default to Sunday (0)

  // Calculate total days from BS 2070/01/01 to the start of this month
  let totalDaysFromRef = 0
  for (let y = BS_REF_YEAR; y < year; y++) {
    for (let m = 0; m < 12; m++) {
      totalDaysFromRef += bsCalendarData[y] ? bsCalendarData[y][m] : 30
    }
  }
  for (let m = 0; m < month - 1; m++) {
    totalDaysFromRef += bsCalendarData[year] ? bsCalendarData[year][m] : 30
  }

  // BS 2070/01/01 = April 14, 2013 = Sunday (getDay() returns 0)
  // So the first day of the month is (totalDaysFromRef % 7) days after Sunday
  const refDayOfWeek = AD_REF_DATE.getDay() // 0 = Sunday
  startDay = (refDayOfWeek + totalDaysFromRef) % 7

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

/**
 * Convert an AD (Gregorian) date to a BS (Bikram Sambat) date string.
 *
 * Algorithm:
 * 1. Calculate the number of days from the reference AD date (April 14, 2013)
 *    to the target AD date.
 * 2. Add those days to the reference BS date (2070/01/01), walking through
 *    the BS calendar lookup table month by month.
 * 3. Return the resulting BS date in "YYYY-MM-DD" format.
 *
 * Accurate for AD dates from April 14, 2013 onward (BS 2070–2090).
 */
export function adToBS(adDate: Date): string {
  const diffTime = adDate.getTime() - AD_REF_DATE.getTime()
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    // Before reference date — fall back to approximation
    const adYear = adDate.getFullYear()
    const bsYear = adYear + 56
    return `${bsYear}-01-01`
  }

  let bsYear = BS_REF_YEAR
  let bsMonth = BS_REF_MONTH
  let bsDay = BS_REF_DAY
  let remainingDays = diffDays

  while (remainingDays > 0) {
    const daysInMonth = bsCalendarData[bsYear]
      ? bsCalendarData[bsYear][bsMonth - 1]
      : 30

    if (bsDay + remainingDays <= daysInMonth) {
      bsDay += remainingDays
      remainingDays = 0
    } else {
      // Move to the 1st of the next month
      remainingDays -= daysInMonth - bsDay + 1
      bsDay = 1
      bsMonth++

      if (bsMonth > 12) {
        bsMonth = 1
        bsYear++
      }
    }
  }

  return `${bsYear}-${String(bsMonth).padStart(2, '0')}-${String(bsDay).padStart(2, '0')}`
}

/**
 * Get today's date in Bikram Sambat format.
 * Returns a string in "YYYY-MM-DD" format.
 *
 * Uses the accurate adToBS() conversion instead of the
 * crude adYear+57 approximation.
 */
export function getTodayBS(): string {
  return adToBS(new Date())
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
