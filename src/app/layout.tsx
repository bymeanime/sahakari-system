import type { Metadata } from 'next'
import './globals.css'

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
      <body className="antialiased">{children}</body>
    </html>
  )
}
