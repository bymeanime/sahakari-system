// ============================================================
// Sahakari System Management - API Authorization Helper
// API प्राधिकरण सहायक
// ============================================================
// यो मोड्यलले API राउटहरूमा भूमिका-आधारित पहुँच नियन्त्रण प्रदान गर्दछ।
// This module provides role-based access control for API routes.
// ============================================================

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'

/**
 * भूमिका-आधारित प्राधिकरण आवश्यक गर्नुहोस्
 * Require that the current session user has one of the specified roles.
 *
 * यदि प्रयोगकर्ताको भूमिका अनुमत भूमिकाहरूको सूचीमा छैन भने,
 * 403 Forbidden प्रतिक्रिया फर्काउँछ।
 *
 * If the user's role is not in the allowed roles list,
 * returns a 403 Forbidden response.
 *
 * @param roles - अनुमत भूमिकाहरूको सरणी (Array of allowed roles)
 * @returns सत्र डाटा वा 403 प्रतिक्रिया (Session data or 403 response)
 *
 * @example
 * ```typescript
 * // In an API route handler:
 * const session = await requireRole(['ADMIN', 'MANAGER'])
 * if (session instanceof NextResponse) return session // Not authorized
 * // session.user is now typed and authorized
 * ```
 */
export async function requireRole(roles: string[]) {
  const session = await getServerSession(authOptions)

  // प्रमाणीकरण जाँच / Authentication check
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Authentication required / प्रमाणीकरण आवश्यक छ' },
      { status: 401 }
    )
  }

  const userRole = (session.user as any).role

  // प्राधिकरण जाँच / Authorization check
  if (!userRole || !roles.includes(userRole)) {
    return NextResponse.json(
      {
        error: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${userRole || 'None'} / ` +
               `पहुँच अस्वीकृत। आवश्यक भूमिका: ${roles.join(' वा ')}। तपाईंको भूमिका: ${userRole || 'कुनै पनि होइन'}`,
      },
      { status: 403 }
    )
  }

  return session
}
