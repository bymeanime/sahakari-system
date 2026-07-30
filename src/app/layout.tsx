import type { Metadata } from 'next'
import './globals.css'
import { SessionProvider } from '@/components/session-provider'

export const metadata: Metadata = {
  title: 'Sahakari System - Nepal Cooperative Banking Management',
  description: 'Comprehensive cooperative banking management system for Nepal',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
