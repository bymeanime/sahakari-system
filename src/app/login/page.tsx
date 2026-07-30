'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { AlertCircle, Eye, EyeOff, Loader2, Shield } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError(result.error === 'CredentialsSignin' ? 'Invalid email or password / गलत ईमेल वा पासवर्ड' : result.error)
        setLoading(false)
      } else if (result?.ok) {
        // Use window.location for a hard redirect to ensure session cookie is picked up
        window.location.href = '/'
      } else {
        setError('Login failed. Please try again. / लगइन असफल। पुनः प्रयास गर्नुहोस्।')
        setLoading(false)
      }
    } catch (err) {
      setError('An unexpected error occurred / अप्रत्याशित त्रुटि भयो')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">सहकारी प्रणाली</h1>
          <p className="text-emerald-600 mt-1">Sahakari System Management</p>
          <p className="text-gray-500 text-sm mt-1">Nepal Cooperative Banking Software</p>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Sign In / साइन इन</CardTitle>
            <CardDescription>Enter your credentials to access the system</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email Address / ईमेल</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@janatasahakari.org.np"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password / पासवर्ड</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full h-11 bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In / साइन इन'
                )}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
              <p className="text-xs font-semibold text-gray-600 mb-2">Demo Credentials:</p>
              <div className="space-y-1 text-xs text-gray-500">
                <div className="flex justify-between">
                  <span>Super Admin:</span>
                  <span className="font-mono">admin@janatasahakari.org.np</span>
                </div>
                <div className="flex justify-between">
                  <span>Manager:</span>
                  <span className="font-mono">manager@janatasahakari.org.np</span>
                </div>
                <div className="flex justify-between">
                  <span>Password:</span>
                  <span className="font-mono">admin123</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-400 mt-6">
          © 2082 Janata Sahakari Sanstha Ltd. | Cooperative Banking System for Nepal
        </p>
      </div>
    </div>
  )
}
