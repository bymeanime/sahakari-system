import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Get a valid PostgreSQL URL from available env vars
function getValidPostgresUrl(): string | undefined {
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

  return undefined
}

// Create PrismaClient with lazy connection
// During build time, env vars may not be available, so we use a placeholder
// that will be replaced at runtime when the first query is made
function createPrismaClient(): PrismaClient {
  const validUrl = getValidPostgresUrl()

  if (validUrl) {
    // Override DATABASE_URL to ensure Prisma uses the correct URL
    process.env.DATABASE_URL = validUrl
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      datasourceUrl: validUrl,
    })
  }

  // During build time or when no valid URL is available,
  // create PrismaClient without datasourceUrl override.
  // Prisma will use the schema's env("DATABASE_URL") which should
  // be set by Vercel at runtime.
  // If DATABASE_URL is not set at all, Prisma will throw a clear error.
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
