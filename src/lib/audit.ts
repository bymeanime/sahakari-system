// ============================================================
// Sahakari System Management - Audit Logging Helper
// लेखापरीक्षण लगिङ सहायक
// ============================================================
// यो मोड्यलले प्रणालीको सबै महत्वपूर्ण कार्यहरूको लागि
// लेखापरीक्षण लग रेकर्ड बनाउँछ।
//
// This module creates audit log records for all significant
// system actions, tracking who did what and when.
// ============================================================

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * लेखापरीक्षण लग रेकर्ड बनाउनुहोस्
 * Create an audit log entry for a system action
 *
 * @param action - कार्य प्रकार (Action type, e.g., 'CREATE', 'UPDATE', 'DELETE', 'LOGIN')
 * @param module - मोड्युल नाम (Module name, e.g., 'SAVINGS', 'LOANS', 'ACCOUNTING')
 * @param recordId - रेकर्ड ID (Optional: ID of the affected record)
 * @param details - विवरण (Optional: Human-readable description of the action)
 *
 * @example
 * ```typescript
 * await auditLog('CREATE', 'SAVINGS', account.id, `Created savings account ${account.accountNo}`)
 * await auditLog('UPDATE', 'LOANS', loan.id, `Approved loan ${loan.applicationNo}`)
 * await auditLog('DELETE', 'MEMBERS', member.id, `Deactivated member ${member.memberNo}`)
 * ```
 */
export async function auditLog(
  action: string,
  module: string,
  recordId?: string,
  details?: string
): Promise<void> {
  try {
    // हालको प्रयोगकर्ता प्राप्त गर्नुहोस् / Get current user from session
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id || null

    // लेखापरीक्षण लग रेकर्ड बनाउनुहोस् / Create audit log entry
    await db.auditLog.create({
      data: {
        userId,
        action,
        module,
        recordId: recordId || null,
        details: details || null,
      },
    })
  } catch (error) {
    // लेखापरीक्षण लग असफलताले मुख्य कार्यमा अवरोध गर्नु हुँदैन
    // Audit log failure should not block the main operation
    console.error('Audit log failed / लेखापरीक्षण लग असफल:', error)
  }
}
