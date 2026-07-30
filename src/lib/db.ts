import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Determine the correct database URL
// Priority: POSTGRES_PRISMA_URL > DATABASE_URL (if valid postgresql://) > fallback
function getDatabaseUrl(): string | undefined {
  // Prefer POSTGRES_PRISMA_URL (set by Vercel Postgres/Neon)
  if (process.env.POSTGRES_PRISMA_URL) {
    return process.env.POSTGRES_PRISMA_URL
  }
  
  // Use DATABASE_URL only if it's a valid PostgreSQL URL
  if (process.env.DATABASE_URL?.startsWith('postgresql://') || process.env.DATABASE_URL?.startsWith('postgres://')) {
    return process.env.DATABASE_URL
  }
  
  // Fallback: DATABASE_URL_UNPOOLED from Vercel
  if (process.env.DATABASE_URL_UNPOOLED?.startsWith('postgresql://')) {
    return process.env.DATABASE_URL_UNPOOLED
  }
  
  // Last resort: POSTGRES_URL from Vercel
  if (process.env.POSTGRES_URL?.startsWith('postgresql://')) {
    return process.env.POSTGRES_URL
  }
  
  return undefined
}

const datasourceUrl = getDatabaseUrl()

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    ...(datasourceUrl ? { datasourceUrl } : {}),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
