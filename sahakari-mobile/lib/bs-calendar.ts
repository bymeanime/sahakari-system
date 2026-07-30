// ============================================================
// Sahakari Mobile - Bikram Sambat (BS) Calendar Utilities
// Nepali Calendar support for the mobile app
// ============================================================

// BS Month names in Nepali and English
export const bsMonths = [
  'बैशाख', 'जेठ', 'अषाढ', 'श्रावण', 'भाद्र', 'आश्विन',
  'कार्तिक', 'मंसिर', 'पुष', 'माघ', 'फाल्गुन', 'चैत्र'
];

export const bsMonthsEn = [
  'Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
];

// BS Day names
export const bsDays = ['आइत', 'सोम', 'मंगल', 'बुध', 'बिही', 'शुक्र', 'शनि'];
export const bsDaysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Nepali digits
const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

export function toNepaliDigits(num: number | string): string {
  return String(num).replace(/[0-9]/g, (d) => nepaliDigits[parseInt(d)]);
}

// Days in each BS month for years 2070-2090
// This is a lookup table since BS months have variable days
const bsMonthDays: Record<number, number[]> = {
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
  2083: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2084: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2085: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2086: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2087: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2088: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2089: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2090: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
};

// Reference: BS 2070/01/01 = AD 2013/04/14 (Monday)
const REF_BS_YEAR = 2070;
const REF_BS_MONTH = 1;
const REF_BS_DAY = 1;
const REF_AD_DATE = new Date(2013, 3, 14); // April 14, 2013

/**
 * Get total days in a BS month
 */
export function getBSMonthDays(year: number, month: number): number {
  const yearData = bsMonthDays[year];
  if (!yearData) return 30; // fallback
  return yearData[month - 1] || 30;
}

/**
 * Get the year range for BS calendar
 */
export function getBSYearRange(): number[] {
  return Object.keys(bsMonthDays).map(Number).sort();
}

/**
 * Get today's BS date
 */
export function getTodayBS(): { year: number; month: number; day: number } {
  return adToBS(new Date());
}

/**
 * Convert AD date to BS date
 * Simple approximation algorithm
 */
export function adToBS(adDate: Date): { year: number; month: number; day: number } {
  const diffMs = adDate.getTime() - REF_AD_DATE.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let bsYear = REF_BS_YEAR;
  let bsMonth = REF_BS_MONTH;
  let bsDay = REF_BS_DAY + diffDays;

  // Adjust year
  while (bsDay > 0) {
    const daysInYear = getYearDays(bsYear);
    if (bsDay > daysInYear) {
      bsDay -= daysInYear;
      bsYear++;
    } else {
      break;
    }
  }

  // Adjust month
  while (bsDay > 0) {
    const daysInMonth = getBSMonthDays(bsYear, bsMonth);
    if (bsDay > daysInMonth) {
      bsDay -= daysInMonth;
      bsMonth++;
      if (bsMonth > 12) {
        bsMonth = 1;
        bsYear++;
      }
    } else {
      break;
    }
  }

  return { year: bsYear, month: bsMonth, day: Math.max(1, bsDay) };
}

/**
 * Get total days in a BS year
 */
function getYearDays(year: number): number {
  const yearData = bsMonthDays[year];
  if (!yearData) return 365;
  return yearData.reduce((sum, days) => sum + days, 0);
}

/**
 * Format BS date as string
 */
export function formatBSDate(year: number, month: number, day: number): string {
  return `${toNepaliDigits(year)} ${bsMonths[month - 1]} ${toNepaliDigits(day)}`;
}

/**
 * Format BS date in short form
 */
export function formatBSShort(year: number, month: number, day: number): string {
  return `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
}

/**
 * Get month grid for BS calendar picker
 */
export function getBSMonthGrid(year: number, month: number): (number | null)[][] {
  const daysInMonth = getBSMonthDays(year, month);
  const firstDayOfWeek = getFirstDayOfWeekBS(year, month);

  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = [];

  // Fill first week with empty cells
  for (let i = 0; i < firstDayOfWeek; i++) {
    currentWeek.push(null);
  }

  // Fill in the days
  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  // Fill remaining cells in last week
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  return weeks;
}

/**
 * Get the day of week (0=Sun, 1=Mon, ...) for the first day of a BS month
 * Approximation based on the reference date
 */
function getFirstDayOfWeekBS(year: number, month: number): number {
  // Calculate total days from reference
  let totalDays = 0;

  // Add days from complete years
  for (let y = REF_BS_YEAR; y < year; y++) {
    totalDays += getYearDays(y);
  }

  // Add days from complete months in the current year
  for (let m = 1; m < month; m++) {
    totalDays += getBSMonthDays(year, m);
  }

  // Reference day is Monday (1)
  return (1 + totalDays) % 7; // 0=Sunday, 1=Monday, etc.
}

/**
 * Convert NPR amount to Nepali words
 */
export function nprToWords(amount: number): string {
  if (amount === 0) return 'शून्य';

  const ones = ['', 'एक', 'दुई', 'तीन', 'चार', 'पाँच', 'छ', 'सात', 'आठ', 'नौ',
    'दस', 'एघार', 'बाह्र', 'तेह्र', 'चौध', 'पन्ध्र', 'सोह्र', 'सत्र', 'अठार', 'उन्नाइस',
    'बीस', 'एक्काइस', 'बाइस', 'तेइस', 'चौबीस', 'पच्चीस', 'छब्बीस', 'सत्ताइस', 'अट्ठाइस', 'उनन्तीस',
    'तीस', 'एकतीस', 'बत्तीस', 'तेत्तीस', 'चौंतीस', 'पैंतीस', 'छत्तीस', 'सैंतीस', 'अठतीस', 'उनन्चालीस',
    'चालीस', 'एकचालीस', 'बयालीस', 'त्रिचालीस', 'चवालीस', 'पैंतालीस', 'छयालीस', 'सतचालीस', 'अठचालीस', 'उनन्चास',
    'पचास', 'एकाउन्न', 'बाउन्न', 'त्रिपन्न', 'चवन्न', 'पचपन्न', 'छपन्न', 'सत्ताउन्न', 'अट्ठाउन्न', 'उनन्साठी',
    'साठी', 'एकसट्ठी', 'बयसट्ठी', 'त्रिसट्ठी', 'चौंसट्ठी', 'पैंसट्ठी', 'छयसट्ठी', 'सतसट्ठी', 'अठसट्ठी', 'उनन्सत्तरी',
    'सत्तरी', 'एकहत्तर', 'बहत्तर', 'त्रिहत्तर', 'चौहत्तर', 'पचहत्तर', 'छयहत्तर', 'सतहत्तर', 'अठहत्तर', 'उनासी',
    'असी', 'एकासी', 'बयासी', 'त्रियासी', 'चौरासी', 'पचासी', 'छयासी', 'सतासी', 'अठासी', 'उनान्नब्बे',
    'नब्बे', 'एकान्नब्बे', 'बयान्नब्बे', 'त्रियान्नब्बे', 'चौरान्नब्बे', 'पन्चान्नब्बे', 'छयान्नब्बे', 'सन्तान्नब्बे', 'अन्ठान्नब्बे', 'उनान्सय'
  ];

  if (amount < 0) return 'ऋण ' + nprToWords(-amount);
  if (amount <= 99) return ones[Math.floor(amount)] || '';

  if (amount < 1000) {
    const hundreds = Math.floor(amount / 100);
    const remainder = amount % 100;
    return (ones[hundreds] || '') + ' सय' + (remainder > 0 ? ' ' + nprToWords(remainder) : '');
  }

  if (amount < 100000) {
    const thousands = Math.floor(amount / 1000);
    const remainder = amount % 1000;
    return nprToWords(thousands) + ' हजार' + (remainder > 0 ? ' ' + nprToWords(remainder) : '');
  }

  if (amount < 10000000) {
    const lakhs = Math.floor(amount / 100000);
    const remainder = amount % 100000;
    return nprToWords(lakhs) + ' लाख' + (remainder > 0 ? ' ' + nprToWords(remainder) : '');
  }

  const crores = Math.floor(amount / 10000000);
  const remainder = amount % 10000000;
  return nprToWords(crores) + ' करोड' + (remainder > 0 ? ' ' + nprToWords(remainder) : '');
}

/**
 * Format NPR currency
 */
export function formatNPR(amount: number): string {
  return `NPR ${amount.toLocaleString('en-NP')}`;
}
