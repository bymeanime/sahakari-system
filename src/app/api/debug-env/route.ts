import { NextResponse } from 'next/server'

export async function GET() {
  const envInfo = {
    DATABASE_URL: process.env.DATABASE_URL 
      ? `${process.env.DATABASE_URL.substring(0, 30)}...` 
      : 'NOT SET',
    DATABASE_URL_STARTS: process.env.DATABASE_URL?.substring(0, 15) || 'N/A',
    POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL 
      ? `${process.env.POSTGRES_PRISMA_URL.substring(0, 30)}...` 
      : 'NOT SET',
    DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED 
      ? `${process.env.DATABASE_URL_UNPOOLED.substring(0, 30)}...` 
      : 'NOT SET',
    POSTGRES_URL: process.env.POSTGRES_URL 
      ? `${process.env.POSTGRES_URL.substring(0, 30)}...` 
      : 'NOT SET',
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
  }
  
  return NextResponse.json(envInfo)
}
