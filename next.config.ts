import type { NextConfig } from "next";

// Ensure DATABASE_URL is set to a valid PostgreSQL URL for Prisma
// This is needed because Vercel may set DATABASE_URL at runtime
// but the Prisma client needs it during module initialization
function getPostgresUrl(): string | undefined {
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

const validUrl = getPostgresUrl()
if (validUrl && (!process.env.DATABASE_URL || !process.env.DATABASE_URL.startsWith('postgresql://'))) {
  process.env.DATABASE_URL = validUrl
}

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  serverExternalPackages: ['bcryptjs'],
};

export default nextConfig;
