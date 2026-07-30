import { PrismaClient } from '@prisma/client'

// Fix DATABASE_URL for Vercel serverless environment
// The schema requires postgresql:// but Vercel may not set DATABASE_URL correctly
// We need to ensure DATABASE_URL is a valid PostgreSQL URL before PrismaClient is created
function ensureDatabaseUrl(): string {
  // Check all possible sources for a valid PostgreSQL URL
  const candidates = [
    process.env.POSTGRES_PRISMA_URL,
    process.env.DATABASE_URL,
    process.env.DATABASE_URL_UNPOOLED,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_URL_NON_POOLING,
  ]

  for (const url of candidates) {
    if (url && (url.startsWith('postgresql://') || url.startsWith('postgres://'))) {
      return url
    }
  }

  // Fallback: if no valid URL found, throw a helpful error
  throw new Error(
    'No valid PostgreSQL DATABASE_URL found. Checked: POSTGRES_PRISMA_URL, DATABASE_URL, DATABASE_URL_UNPOOLED, POSTGRES_URL, POSTGRES_URL_NON_POOLING'
  )
}

// Set DATABASE_URL before PrismaClient is instantiated
// This is critical for Vercel serverless where the env var might not be set correctly
const validUrl = ensureDatabaseUrl()
if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.startsWith('postgresql://')) {
  process.env.DATABASE_URL = validUrl
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasourceUrl: validUrl,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
