// ============================================================
// Sahakari System Management - SMS Integration Utility
// Nepal Cooperative Banking SMS Gateway
// Supports: SparrowSMS (Nepal) & Mock Provider (Development)
// ============================================================

// -----------------------------------------------------------
// Types & Interfaces
// -----------------------------------------------------------

export interface SMSResult {
  success: boolean
  messageId?: string
  error?: string
  provider: string
  to: string
  message: string
  timestamp: Date
}

export interface SMSProvider {
  name: string
  send(to: string, message: string): Promise<SMSResult>
  sendBulk(recipients: string[], message: string): Promise<SMSResult[]>
}

export interface SparrowSMSResponse {
  response_code: number
  response_msg: string
  message_id?: string
  error?: string
}

// -----------------------------------------------------------
// Phone Number Formatting
// -----------------------------------------------------------

/**
 * Format a Nepal phone number to international format (977XXXXXXXXXX)
 * Accepts: 98XXXXXXXX, +97798XXXXXXXX, 97798XXXXXXXX
 */
function formatNepalPhone(phone: string): string {
  // Remove all spaces, dashes, parentheses
  let cleaned = phone.replace(/[\s\-()]/g, '')

  // Remove leading +
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1)
  }

  // If starts with 977, keep as is
  if (cleaned.startsWith('977')) {
    return cleaned
  }

  // If starts with 0 (like 098XXXXXXXX), remove the leading 0 and add 977
  if (cleaned.startsWith('0')) {
    return '977' + cleaned.substring(1)
  }

  // If 10-digit number starting with 9 (like 98XXXXXXXX), add 977 prefix
  if (cleaned.length === 10 && cleaned.startsWith('9')) {
    return '977' + cleaned
  }

  // Return as-is if we can't determine the format
  return cleaned
}

/**
 * Format amount in NPR with commas
 */
function formatNPR(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Convert number to Nepali Unicode digits
 */
function toNepaliDigits(num: number | string): string {
  const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९']
  return String(num).replace(/[0-9]/g, (d) => nepaliDigits[parseInt(d)])
}

/**
 * Format amount in Nepali (with Devanagari digits)
 */
function formatNPRNepali(amount: number): string {
  const formatted = amount.toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `रु. ${toNepaliDigits(formatted)}`
}

// -----------------------------------------------------------
// SparrowSMS Provider
// Implementation for Nepal's Sparrow SMS Gateway
// API Docs: http://api.sparrowsms.com/v2/sms/
// -----------------------------------------------------------

class SparrowSMSProvider implements SMSProvider {
  name = 'SparrowSMS'
  private apiKey: string
  private from: string
  private baseUrl = 'http://api.sparrowsms.com/v2/sms/'

  constructor() {
    this.apiKey = process.env.SPARROW_SMS_API_KEY || ''
    this.from = process.env.SPARROW_SMS_FROM || 'InfoClb'

    if (!this.apiKey) {
      console.warn('[SparrowSMS] WARNING: SPARROW_SMS_API_KEY is not set. SMS sending will fail.')
    }
  }

  async send(to: string, message: string): Promise<SMSResult> {
    const formattedPhone = formatNepalPhone(to)
    const timestamp = new Date()

    if (!this.apiKey) {
      return {
        success: false,
        error: 'SparrowSMS API key not configured',
        provider: this.name,
        to: formattedPhone,
        message,
        timestamp,
      }
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          token: this.apiKey,
          from: this.from,
          to: formattedPhone,
          text: message,
        }),
      })

      const data: SparrowSMSResponse = await response.json()

      if (response.ok && data.response_code === 200) {
        return {
          success: true,
          messageId: data.message_id,
          provider: this.name,
          to: formattedPhone,
          message,
          timestamp,
        }
      }

      return {
        success: false,
        error: data.response_msg || data.error || `SparrowSMS error: ${data.response_code}`,
        provider: this.name,
        to: formattedPhone,
        message,
        timestamp,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('[SparrowSMS] Send failed:', errorMessage)

      return {
        success: false,
        error: errorMessage,
        provider: this.name,
        to: formattedPhone,
        message,
        timestamp,
      }
    }
  }

  async sendBulk(recipients: string[], message: string): Promise<SMSResult[]> {
    // SparrowSMS supports bulk sending via comma-separated numbers
    const results: SMSResult[] = []

    // Process in batches of 50 to avoid API limits
    const batchSize = 50
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize)
      const batchPhone = batch.map(formatNepalPhone).join(',')

      const timestamp = new Date()

      if (!this.apiKey) {
        batch.forEach((phone) => {
          results.push({
            success: false,
            error: 'SparrowSMS API key not configured',
            provider: this.name,
            to: formatNepalPhone(phone),
            message,
            timestamp,
          })
        })
        continue
      }

      try {
        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            token: this.apiKey,
            from: this.from,
            to: batchPhone,
            text: message,
          }),
        })

        const data: SparrowSMSResponse = await response.json()

        if (response.ok && data.response_code === 200) {
          batch.forEach((phone) => {
            results.push({
              success: true,
              messageId: data.message_id,
              provider: this.name,
              to: formatNepalPhone(phone),
              message,
              timestamp,
            })
          })
        } else {
          batch.forEach((phone) => {
            results.push({
              success: false,
              error: data.response_msg || 'Bulk SMS failed',
              provider: this.name,
              to: formatNepalPhone(phone),
              message,
              timestamp,
            })
          })
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        batch.forEach((phone) => {
          results.push({
            success: false,
            error: errorMessage,
            provider: this.name,
            to: formatNepalPhone(phone),
            message,
            timestamp,
          })
        })
      }
    }

    return results
  }
}

// -----------------------------------------------------------
// Mock SMS Provider
// For development/testing - logs SMS to console
// -----------------------------------------------------------

class MockSMSProvider implements SMSProvider {
  name = 'MockSMS'

  async send(to: string, message: string): Promise<SMSResult> {
    const formattedPhone = formatNepalPhone(to)
    const timestamp = new Date()

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📱 [MockSMS] Sending SMS')
    console.log(`   To: ${formattedPhone}`)
    console.log(`   Message: ${message}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    return {
      success: true,
      messageId: `mock-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      provider: this.name,
      to: formattedPhone,
      message,
      timestamp,
    }
  }

  async sendBulk(recipients: string[], message: string): Promise<SMSResult[]> {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`📱 [MockSMS] Sending Bulk SMS to ${recipients.length} recipients`)
    console.log(`   Message: ${message}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    return recipients.map((to, index) => ({
      success: true,
      messageId: `mock-bulk-${Date.now()}-${index}`,
      provider: this.name,
      to: formatNepalPhone(to),
      message,
      timestamp: new Date(),
    }))
  }
}

// -----------------------------------------------------------
// Provider Factory
// -----------------------------------------------------------

let cachedProvider: SMSProvider | null = null

function getSMSProvider(): SMSProvider {
  if (cachedProvider) return cachedProvider

  const providerName = (process.env.SMS_PROVIDER || 'mock').toLowerCase()

  switch (providerName) {
    case 'sparrow':
      cachedProvider = new SparrowSMSProvider()
      break
    case 'mock':
    default:
      cachedProvider = new MockSMSProvider()
      break
  }

  return cachedProvider
}

// -----------------------------------------------------------
// Public SMS Functions
// -----------------------------------------------------------

/**
 * Send a single SMS message
 * @param to - Phone number (Nepal format: 98XXXXXXXX or +97798XXXXXXXX)
 * @param message - SMS text content
 * @returns SMS result with delivery status
 */
export async function sendSMS(to: string, message: string): Promise<SMSResult> {
  const provider = getSMSProvider()
  return provider.send(to, message)
}

/**
 * Send bulk SMS to multiple recipients
 * @param recipients - Array of phone numbers
 * @param message - SMS text content
 * @returns Array of SMS results for each recipient
 */
export async function sendBulkSMS(recipients: string[], message: string): Promise<SMSResult[]> {
  const provider = getSMSProvider()
  return provider.sendBulk(recipients, message)
}

/**
 * Send EMI (Equated Monthly Installment) reminder
 * Bilingual: English + Nepali
 */
export async function sendEMIReminder(
  memberName: string,
  phone: string,
  loanNo: string,
  amount: number,
  dueDate: string
): Promise<SMSResult> {
  const message = [
    `Dear ${memberName},`,
    `Your EMI of ${formatNPR(amount)} for Loan #${loanNo} is due on ${dueDate}.`,
    `Please pay on time to avoid penalty.`,
    `- Sahakari Sanstha`,
    ``,
    `श्रीमान्/श्रीमती ${memberName},`,
    `तपाईंको ऋण नं. ${loanNo} को किस्ता रकम ${formatNPRNepali(amount)} मिति ${dueDate} भित्र बुझाउनुहोला।`,
    `जरिवाना बचाउन समयमै भुक्तानी गर्नुहोला।`,
    `- सहकारी संस्था`,
  ].join('\n')

  return sendSMS(phone, message)
}

/**
 * Send loan approval notification
 * Bilingual: English + Nepali
 */
export async function sendLoanApproval(
  memberName: string,
  phone: string,
  loanNo: string,
  amount: number
): Promise<SMSResult> {
  const message = [
    `Dear ${memberName},`,
    `Congratulations! Your loan (#${loanNo}) of ${formatNPR(amount)} has been approved.`,
    `Please visit the office for disbursement.`,
    `- Sahakari Sanstha`,
    ``,
    `श्रीमान्/श्रीमती ${memberName},`,
    `बधाई! तपाईंको ऋण नं. ${loanNo} रकम ${formatNPRNepali(amount)} स्वीकृत भएको छ।`,
    `ऋण वितरणको लागि कार्यालयमा उपस्थित हुनुहोला।`,
    `- सहकारी संस्था`,
  ].join('\n')

  return sendSMS(phone, message)
}

/**
 * Send loan disbursement notification
 * Bilingual: English + Nepali
 */
export async function sendLoanDisbursement(
  memberName: string,
  phone: string,
  loanNo: string,
  amount: number
): Promise<SMSResult> {
  const message = [
    `Dear ${memberName},`,
    `Your loan (#${loanNo}) of ${formatNPR(amount)} has been disbursed to your account.`,
    `EMI will start from next month.`,
    `- Sahakari Sanstha`,
    ``,
    `श्रीमान्/श्रीमती ${memberName},`,
    `तपाईंको ऋण नं. ${loanNo} रकम ${formatNPRNepali(amount)} तपाईंको खातामा वितरण गरिएको छ।`,
    `किस्ता आगामी महिनादेखि सुरु हुनेछ।`,
    `- सहकारी संस्था`,
  ].join('\n')

  return sendSMS(phone, message)
}

/**
 * Send deposit confirmation
 * Bilingual: English + Nepali
 */
export async function sendDepositConfirmation(
  memberName: string,
  phone: string,
  accountNo: string,
  amount: number,
  balance: number
): Promise<SMSResult> {
  const message = [
    `Dear ${memberName},`,
    `${formatNPR(amount)} deposited to A/C ${accountNo}.`,
    `Available Balance: ${formatNPR(balance)}.`,
    `- Sahakari Sanstha`,
    ``,
    `श्रीमान्/श्रीमती ${memberName},`,
    `खाता नं. ${accountNo} मा ${formatNPRNepali(amount)} जम्मा भएको छ।`,
    `उपलब्ध शेष: ${formatNPRNepali(balance)}।`,
    `- सहकारी संस्था`,
  ].join('\n')

  return sendSMS(phone, message)
}

/**
 * Send withdrawal alert
 * Bilingual: English + Nepali
 */
export async function sendWithdrawalAlert(
  memberName: string,
  phone: string,
  accountNo: string,
  amount: number,
  balance: number
): Promise<SMSResult> {
  const message = [
    `Dear ${memberName},`,
    `${formatNPR(amount)} withdrawn from A/C ${accountNo}.`,
    `Available Balance: ${formatNPR(balance)}.`,
    `- Sahakari Sanstha`,
    ``,
    `श्रीमान्/श्रीमती ${memberName},`,
    `खाता नं. ${accountNo} बाट ${formatNPRNepali(amount)} निकासा भएको छ।`,
    `उपलब्ध शेष: ${formatNPRNepali(balance)}।`,
    `- सहकारी संस्था`,
  ].join('\n')

  return sendSMS(phone, message)
}

/**
 * Send meeting reminder
 * Bilingual: English + Nepali
 */
export async function sendMeetingReminder(
  memberName: string,
  phone: string,
  meetingTitle: string,
  date: string,
  venue: string
): Promise<SMSResult> {
  const message = [
    `Dear ${memberName},`,
    `Reminder: "${meetingTitle}" on ${date} at ${venue}.`,
    `Your presence is requested.`,
    `- Sahakari Sanstha`,
    ``,
    `श्रीमान्/श्रीमती ${memberName},`,
    `सम्झाना: "${meetingTitle}" मिति ${date} स्थान ${venue}।`,
    `तपाईंको उपस्थिति अपेक्षित छ।`,
    `- सहकारी संस्था`,
  ].join('\n')

  return sendSMS(phone, message)
}

/**
 * Send share certificate notification
 * Bilingual: English + Nepali
 */
export async function sendShareCertificate(
  memberName: string,
  phone: string,
  shareCount: number,
  certificateNo: string
): Promise<SMSResult> {
  const message = [
    `Dear ${memberName},`,
    `Your ${shareCount} shares have been certified. Certificate No: ${certificateNo}.`,
    `Please collect from the office.`,
    `- Sahakari Sanstha`,
    ``,
    `श्रीमान्/श्रीमती ${memberName},`,
    `तपाईंको ${toNepaliDigits(shareCount)} वटा शेयरको प्रमाणपत्र तयार भएको छ। प्रमाणपत्र नं: ${certificateNo}।`,
    `कार्यालयबाट संकलन गर्नुहोला।`,
    `- सहकारी संस्था`,
  ].join('\n')

  return sendSMS(phone, message)
}
