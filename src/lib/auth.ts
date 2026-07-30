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
          throw new Error('Email and password are required / ईमेल र पासवर्ड आवश्यक छ')
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
          include: { organization: true, branch: true, employee: true },
        })

        if (!user || !user.isActive) {
          throw new Error('Invalid credentials or account disabled / अवैध प्रमाणहरू वा खाता अक्षम')
        }

        const passwordValid = await bcrypt.compare(credentials.password, user.password)

        if (!passwordValid) {
          throw new Error('Invalid credentials / अवैध प्रमाणहरू')
        }

        // Update last login
        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })

        // Create audit log
        try {
          await db.auditLog.create({
            data: {
              userId: user.id,
              action: 'LOGIN',
              module: 'AUTH',
              details: `User ${user.email} logged in`,
            },
          })
        } catch (e) {
          // Non-critical - don't fail login if audit log fails
          console.error('Audit log failed:', e)
        }

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
        token.role = (user as any).role as string
        token.organizationId = (user as any).organizationId as string
        token.branchId = (user as any).branchId as string
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        const role = token.role as string | undefined
        const organizationId = token.organizationId as string | undefined
        const branchId = token.branchId as string | undefined

        if (role) {
          (session.user as any).role = role
        }
        if (organizationId) {
          (session.user as any).organizationId = organizationId
        }
        if (branchId) {
          (session.user as any).branchId = branchId
        }
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
  // Use NEXTAUTH_SECRET from env, or generate a stable one for development
  secret: process.env.NEXTAUTH_SECRET || 'sahakari-dev-secret-change-in-production-2024',
  // Trust the Vercel proxy for secure cookies
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
}
