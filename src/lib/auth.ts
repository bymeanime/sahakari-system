import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'admin@janatasahakari.org.np' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required')
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
          include: { organization: true, branch: true, employee: true },
        })

        if (!user || !user.isActive) {
          throw new Error('Invalid credentials or account disabled')
        }

        const passwordValid = await bcrypt.compare(credentials.password, user.password)

        if (!passwordValid) {
          throw new Error('Invalid credentials')
        }

        // Update last login
        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })

        // Create audit log
        await db.auditLog.create({
          data: {
            userId: user.id,
            action: 'LOGIN',
            module: 'AUTH',
            details: `User ${user.email} logged in`,
          },
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
          branchId: user.branchId,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.organizationId = (user as any).organizationId
        token.branchId = (user as any).branchId
        token.lastActivity = Date.now()
      }

      // Fix 10: Session timeout - check if user has been idle for more than 15 minutes
      const SESSION_TIMEOUT_MS = 15 * 60 * 1000 // 15 minutes
      if (token.lastActivity && Date.now() - (token.lastActivity as number) > SESSION_TIMEOUT_MS) {
        // Force re-authentication by returning an empty token
        return {} as any
      }

      // Update last activity timestamp on each request
      token.lastActivity = Date.now()

      return token
    },
    async session({ session, token }) {
      // If token is empty (timed out), return empty session to force re-login
      if (!token.role) {
        return { ...session, user: null } as any
      }

      if (session.user) {
        (session.user as any).role = token.role
        (session.user as any).organizationId = token.organizationId
        (session.user as any).branchId = token.branchId
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
  },
  secret: (() => {
    if (!process.env.NEXTAUTH_SECRET) {
      throw new Error('NEXTAUTH_SECRET environment variable is not set. Application cannot start without it.')
    }
    return process.env.NEXTAUTH_SECRET
  })(),
}
