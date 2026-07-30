'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useNavigationStore, type ModuleKey } from '@/store/navigation-store'
import { formatBSDate, toNepaliDigits, getTodayBS, getBSMonthGrid, getBSMonthDays, bsMonths, bsMonthsNep, getBSYearRange, nprToWords } from '@/lib/bs-calendar'
import { BSCalendarPicker } from '@/components/bs-calendar-picker'
import {
  LayoutDashboard, Users, PiggyBank, HandCoins, BookOpen, UserCog,
  Package, Building2, Share2, CalendarDays, BarChart3, Settings,
  ChevronLeft, ChevronRight, Bell, Search, Menu, X, TrendingUp,
  TrendingDown, DollarSign, CreditCard, ArrowUpRight,
  ArrowDownRight, Eye, Plus, CheckCircle2,
  Clock, AlertCircle, FileText, Download,
  Globe, Shield, LogOut, Send, Printer, ChevronDown,
  AlertTriangle, Info, CheckCircle, AlertCircleIcon, RefreshCw,
  Trash2, Edit, Save, Loader2, Minus, ChevronUp, Receipt, Banknote
} from 'lucide-react'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
  CardFooter
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts'
import { toast } from 'sonner'

// ============================================================
// Types
// ============================================================
interface DashboardData {
  kpis: {
    totalMembers: number; totalSavings: number; totalLoansDisbursed: number
    totalOutstanding: number; totalAssets: number; totalShareCapital: number
    pendingLoans: number; totalEmployees: number; totalDeposits: number; totalSalaryExpense: number
  }
  monthlyTrend: Array<{ month: string; savings: number; loans: number; income: number }>
  loanStatusDist: Array<{ name: string; value: number; color: string }>
  savingsByProduct: Array<{ name: string; total: number; count: number }>
  recentActivities: Array<{ type: string; description: string; time: string; icon: string }>
  members: any[]; savingsAccounts: any[]; loanApps: any[]; employees: any[]
  assets: any[]; inventoryItems: any[]; shareHoldings: any[]; meetings: any[]
  journalEntries: any[]; accounts: any[]
}

// ============================================================
// Navigation Config
// ============================================================
const navItems: Array<{ key: ModuleKey; label: string; labelNep: string; icon: any; color: string }> = [
  { key: 'dashboard', label: 'Dashboard', labelNep: 'ड्यासबोर्ड', icon: LayoutDashboard, color: 'text-emerald-600' },
  { key: 'members', label: 'Members', labelNep: 'सदस्य', icon: Users, color: 'text-blue-600' },
  { key: 'savings', label: 'Savings', labelNep: 'बचत', icon: PiggyBank, color: 'text-amber-600' },
  { key: 'loans', label: 'Loans', labelNep: 'ऋण', icon: HandCoins, color: 'text-rose-600' },
  { key: 'accounting', label: 'Accounting', labelNep: 'लेखा', icon: BookOpen, color: 'text-purple-600' },
  { key: 'hr', label: 'HR & Payroll', labelNep: 'मानव संसाधन', icon: UserCog, color: 'text-teal-600' },
  { key: 'inventory', label: 'Inventory', labelNep: 'सूची', icon: Package, color: 'text-orange-600' },
  { key: 'assets', label: 'Assets', labelNep: 'सम्पत्ति', icon: Building2, color: 'text-cyan-600' },
  { key: 'shares', label: 'Shares', labelNep: 'शेयर', icon: Share2, color: 'text-indigo-600' },
  { key: 'meetings', label: 'Meetings', labelNep: 'बैठक', icon: CalendarDays, color: 'text-pink-600' },
  { key: 'reports', label: 'Reports', labelNep: 'प्रतिवेदन', icon: BarChart3, color: 'text-slate-600' },
  { key: 'settings', label: 'Settings', labelNep: 'सेटिङ', icon: Settings, color: 'text-gray-600' },
]

// ============================================================
// Helpers
// ============================================================
const formatNPR = (amount: number) => `NPR ${amount.toLocaleString('en-NP')}`
const statusColor = (status: string) => {
  const map: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-800', DISBURSED: 'bg-emerald-100 text-emerald-800',
    APPROVED: 'bg-blue-100 text-blue-800', PAID: 'bg-emerald-100 text-emerald-800',
    COMPLETED: 'bg-emerald-100 text-emerald-800', POSTED: 'bg-emerald-100 text-emerald-800',
    PENDING: 'bg-amber-100 text-amber-800', UNDER_REVIEW: 'bg-purple-100 text-purple-800',
    SCHEDULED: 'bg-blue-100 text-blue-800', DRAFT: 'bg-gray-100 text-gray-800',
    INACTIVE: 'bg-gray-100 text-gray-800', CLOSED: 'bg-gray-100 text-gray-800',
    REJECTED: 'bg-red-100 text-red-800', CANCELLED: 'bg-red-100 text-red-800',
    OVERDUE: 'bg-red-100 text-red-800', FROZEN: 'bg-cyan-100 text-cyan-800',
    DORMANT: 'bg-gray-100 text-gray-800', SUSPENDED: 'bg-red-100 text-red-800',
  }
  return map[status] || 'bg-gray-100 text-gray-800'
}

// ============================================================
// BS DATE PICKER COMPONENT
// ============================================================
function BSDatePicker({ value, onChange, label }: { value: string; onChange: (v: string) => void; label?: string }) {
  const [open, setOpen] = useState(false)
  const parts = value ? value.split('-').map(Number) : [2082, 1, 1]
  const [year, setYear] = useState(parts[0])
  const [month, setMonth] = useState(parts[1])
  const [day, setDay] = useState(parts[2])
  const years = getBSYearRange()

  const formatted = value ? formatBSDate(value) : { en: 'Select Date', nep: 'मिति छान्नुहोस्' }
  const grid = getBSMonthGrid(year, month)
  const maxDays = getBSMonthDays(year, month)

  const selectDay = (d: number) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    onChange(dateStr)
    setOpen(false)
  }

  return (
    <div className="space-y-1">
      {label && <Label className="text-xs">{label}</Label>}
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-3 py-2 border rounded-lg bg-white text-sm text-left hover:border-emerald-400 transition-colors"
        >
          <div>
            <span className="text-gray-900">{formatted.en}</span>
            <span className="text-gray-400 ml-2 text-xs">({formatted.nep})</span>
          </div>
          <CalendarDays className="w-4 h-4 text-gray-400" />
        </button>
        {open && (
          <div className="absolute top-full mt-1 left-0 z-50 bg-white border rounded-xl shadow-xl p-4 w-80">
            <div className="flex items-center gap-2 mb-3">
              <Select value={String(year)} onValueChange={v => { setYear(Number(v)); setDay(1) }}>
                <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map(y => <SelectItem key={y} value={String(y)}>{toNepaliDigits(y)}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={String(month)} onValueChange={v => { setMonth(Number(v)); setDay(1) }}>
                <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {bsMonths.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m} ({bsMonthsNep[i]})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
              {['आ', 'सो', 'मं', 'बु', 'बि', 'शु', 'श'].map((d, i) => (
                <div key={i} className="text-xs text-gray-400 py-1 font-medium">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {grid.flat().map((d, i) => (
                <button
                  key={i}
                  disabled={!d}
                  onClick={() => d && selectDay(d)}
                  className={`h-8 w-8 rounded-lg text-xs flex items-center justify-center transition-colors ${
                    d === day && month === parts[1] && year === parts[0]
                      ? 'bg-emerald-600 text-white font-bold'
                      : d ? 'hover:bg-emerald-50 text-gray-700' : 'text-transparent'
                  }`}
                >
                  {d ? toNepaliDigits(d) : ''}
                </button>
              ))}
            </div>
            <div className="mt-3 pt-2 border-t flex justify-between items-center">
              <span className="text-xs text-gray-400">{bsMonths[month - 1]} {year} - {toNepaliDigits(maxDays)} days</span>
              <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => { onChange(getTodayBS()); setOpen(false) }}>Today</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// NOTIFICATION PANEL
// ============================================================
function NotificationPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      fetch('/api/notifications')
        .then(r => r.json())
        .then(d => { setNotifications(Array.isArray(d) ? d : []) })
        .catch(() => {})
    }
  }, [open])

  if (!open) return null

  const severityIcon = (s: string) => {
    if (s === 'ERROR') return <AlertCircle className="w-4 h-4 text-red-500" />
    if (s === 'WARNING') return <AlertTriangle className="w-4 h-4 text-amber-500" />
    if (s === 'SUCCESS') return <CheckCircle className="w-4 h-4 text-emerald-500" />
    return <Info className="w-4 h-4 text-blue-500" />
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white shadow-2xl h-full overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between z-10">
          <div>
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            <p className="text-xs text-gray-500">सूचना तथा चेतावनी</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 text-gray-400"><Bell className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>No notifications</p></div>
          ) : (
            notifications.map((n, i) => (
              <div key={n.id || i} className={`p-3 rounded-lg border ${
                n.severity === 'ERROR' ? 'border-red-200 bg-red-50' :
                n.severity === 'WARNING' ? 'border-amber-200 bg-amber-50' :
                n.severity === 'SUCCESS' ? 'border-emerald-200 bg-emerald-50' :
                'border-blue-200 bg-blue-50'
              }`}>
                <div className="flex items-start gap-2">
                  {severityIcon(n.severity)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{n.title}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{n.messageNep}</p>
                    {n.action === 'SEND_SMS' && (
                      <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={async () => {
                        try {
                          const res = await fetch('/api/sms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'emi-reminder', loanId: n.id?.replace('emi-', '') }) })
                          if (res.ok) toast.success('SMS sent to member')
                          else toast.error('Failed to send SMS')
                        } catch { toast.error('SMS service unavailable') }
                      }}>
                        <Send className="w-3 h-3 mr-1" /> Send SMS
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// LOGIN PAGE
// ============================================================
function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('admin@janatasahakari.org.np')
  const [password, setPassword] = useState('admin123')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    await new Promise(r => setTimeout(r, 800))
    if (email === 'admin@janatasahakari.org.np' && password === 'admin123') {
      onLogin()
    } else {
      setError('Invalid credentials. Try admin@janatasahakari.org.np / admin123')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white font-bold text-3xl">S</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Sahakari System</h1>
          <p className="text-emerald-600 mt-1">सहकारी व्यवस्थापन प्रणाली</p>
          <p className="text-gray-500 text-sm mt-1">Nepal Cooperative Banking Management</p>
        </div>
        <Card className="border-0 shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Sign In</CardTitle>
            <CardDescription>Enter your credentials to access the system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@sahakari.org.np" />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch id="remember" checked={true} />
                <Label htmlFor="remember" className="text-xs text-gray-500">Remember me</Label>
              </div>
              <button className="text-xs text-emerald-600 hover:underline">Forgot password?</button>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleLogin} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </CardFooter>
        </Card>
        <div className="text-center mt-6 text-xs text-gray-400">
          <p>Demo: admin@janatasahakari.org.np / admin123</p>
          <p className="mt-1">Sahakari System v1.0 | Cooperative Act 2047 Compliant</p>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// MAIN APP
// ============================================================
export default function SahakariApp() {
  const { data: session, status } = useSession()
  const { activeModule, setActiveModule, sidebarOpen, setSidebarOpen } = useNavigationStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)

  const loadData = useCallback(() => {
    setLoading(true)
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/dashboard')
        .then(res => res.json())
        .then(d => { setData(d); setLoading(false) })
        .catch(() => setLoading(false))
    }
  }, [status])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto text-emerald-600 animate-spin mb-4" />
          <h2 className="text-xl font-bold text-gray-900">Loading Sahakari System...</h2>
          <p className="text-gray-500 text-sm mt-1">सहकारी प्रणाली लोड हुँदैछ...</p>
        </div>
      </div>
    )
  }

  if (status !== 'authenticated') {
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
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Sign In</CardTitle>
              <CardDescription>Enter your credentials to access the system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-500 text-center py-4">
                <a href="/login" className="text-emerald-600 hover:underline font-medium">Click here to sign in</a>
              </p>
            </CardContent>
          </Card>
          <div className="text-center mt-6 text-xs text-gray-400">
            <p>Demo: admin@janatasahakari.org.np / admin123</p>
            <p className="mt-1">Sahakari System v2.0 | Cooperative Act 2047 Compliant</p>
          </div>
        </div>
      </div>
    )
  }

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto text-emerald-600 animate-spin mb-4" />
          <h2 className="text-xl font-bold text-gray-900">Loading Sahakari System...</h2>
          <p className="text-gray-500 text-sm mt-1">सहकारी प्रणाली लोड हुँदैछ...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 flex flex-col transition-all duration-300 fixed h-full z-40 lg:relative ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            {sidebarOpen && (
              <div className="overflow-hidden">
                <h1 className="font-bold text-gray-900 text-sm leading-tight">Sahakari System</h1>
                <p className="text-xs text-gray-500">सहकारी व्यवस्थापन</p>
              </div>
            )}
          </div>
          <button className="lg:hidden p-1 rounded hover:bg-gray-100" onClick={() => setMobileMenuOpen(false)}>
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <ScrollArea className="flex-1 py-3">
          <nav className="space-y-1 px-2">
            {navItems.map(item => (
              <button
                key={item.key}
                onClick={() => { setActiveModule(item.key); setMobileMenuOpen(false) }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                  activeModule === item.key ? 'bg-emerald-50 text-emerald-700 font-medium shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
                title={item.label}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 ${activeModule === item.key ? 'text-emerald-600' : item.color}`} />
                {sidebarOpen && (
                  <div className="flex-1 text-left">
                    <span>{item.label}</span>
                    <span className="block text-xs text-gray-400">{item.labelNep}</span>
                  </div>
                )}
              </button>
            ))}
          </nav>
        </ScrollArea>
        <div className="p-3 border-t border-gray-100 space-y-2">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-full hidden lg:flex items-center justify-center gap-2 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 text-sm transition-colors">
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            {sidebarOpen && <span>Collapse</span>}
          </button>
          <button onClick={() => signOut({ callbackUrl: '/login' })} className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-sm transition-colors">
            <LogOut className="w-4 h-4" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>
      {mobileMenuOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setMobileMenuOpen(false)} />}
      <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
      <main className="flex-1 min-h-screen flex flex-col">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 flex items-center gap-4 sticky top-0 z-20">
          <button className="lg:hidden" onClick={() => setMobileMenuOpen(true)}>
            <Menu className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input placeholder="Search members, accounts, loans..." className="pl-10 bg-gray-50 border-gray-200" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-lg hover:bg-gray-100" onClick={() => setNotifOpen(true)}>
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-gray-200">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <span className="text-emerald-700 font-medium text-sm">{session?.user?.name?.split(' ').map(n => n[0]).join('') || 'U'}</span>
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-900">{session?.user?.name || 'User'}</p>
                <p className="text-xs text-gray-500">{(session?.user as any)?.role || 'Staff'} | {getTodayBS()}</p>
              </div>
            </div>
          </div>
        </header>
        <div className="flex-1 p-4 lg:p-6 overflow-auto">
          {activeModule === 'dashboard' && <DashboardModule data={data} />}
          {activeModule === 'members' && <MembersModule data={data} onRefresh={loadData} />}
          {activeModule === 'savings' && <SavingsModule data={data} onRefresh={loadData} />}
          {activeModule === 'loans' && <LoansModule data={data} onRefresh={loadData} />}
          {activeModule === 'accounting' && <AccountingModule data={data} onRefresh={loadData} />}
          {activeModule === 'hr' && <HRModule data={data} onRefresh={loadData} />}
          {activeModule === 'inventory' && <InventoryModule data={data} onRefresh={loadData} />}
          {activeModule === 'assets' && <AssetsModule data={data} onRefresh={loadData} />}
          {activeModule === 'shares' && <SharesModule data={data} onRefresh={loadData} />}
          {activeModule === 'meetings' && <MeetingsModule data={data} onRefresh={loadData} />}
          {activeModule === 'reports' && <ReportsModule data={data} />}
          {activeModule === 'settings' && <SettingsModule data={data} />}
        </div>
        <footer className="bg-white border-t border-gray-200 px-4 py-3 text-center">
          <p className="text-xs text-gray-500">
            Sahakari System v1.0 | Janata Sahakari Sanstha Ltd. | जनता सहकारी संस्था लि. | FY {toNepaliDigits('2082/83')}
          </p>
        </footer>
      </main>
    </div>
  )
}

// ============================================================
// DASHBOARD MODULE
// ============================================================
function DashboardModule({ data }: { data: DashboardData }) {
  const { kpis, monthlyTrend, loanStatusDist, savingsByProduct, recentActivities } = data
  const todayBS = getTodayBS()

  const kpiCards = [
    { title: 'Total Members', titleNep: 'कुल सदस्य', value: kpis.totalMembers, icon: Users, color: 'from-blue-500 to-blue-600', change: '+12%', up: true },
    { title: 'Total Savings', titleNep: 'कुल बचत', value: formatNPR(kpis.totalSavings), icon: PiggyBank, color: 'from-amber-500 to-amber-600', change: '+8.5%', up: true },
    { title: 'Loans Disbursed', titleNep: 'ऋण वितरण', value: formatNPR(kpis.totalLoansDisbursed), icon: HandCoins, color: 'from-rose-500 to-rose-600', change: '+15%', up: true },
    { title: 'Outstanding', titleNep: 'बक्यौता', value: formatNPR(kpis.totalOutstanding), icon: CreditCard, color: 'from-purple-500 to-purple-600', change: '-3%', up: false },
    { title: 'Total Assets', titleNep: 'कुल सम्पत्ति', value: formatNPR(kpis.totalAssets), icon: Building2, color: 'from-emerald-500 to-emerald-600', change: '+5%', up: true },
    { title: 'Share Capital', titleNep: 'शेयर पूँजी', value: formatNPR(kpis.totalShareCapital), icon: Share2, color: 'from-indigo-500 to-indigo-600', change: '+2%', up: true },
  ]

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10">
          <h2 className="text-2xl font-bold">Welcome to Janata Sahakari Sanstha</h2>
          <p className="text-emerald-100 mt-1">जनता सहकारी संस्था लि. - Putalisadak, Kathmandu</p>
          <div className="flex items-center gap-4 mt-4 flex-wrap">
            <Badge className="bg-white/20 text-white border-0">FY: {toNepaliDigits('2082/83')}</Badge>
            <Badge className="bg-white/20 text-white border-0">आज: {formatBSDate(todayBS).nep}</Badge>
            <Badge className="bg-amber-400/30 text-amber-100 border-0">{kpis.pendingLoans} Pending Loans</Badge>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map((kpi, i) => (
          <Card key={i} className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
            <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${kpi.color}`}></div>
            <CardContent className="p-4 pl-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium">{kpi.title}</p>
                  <p className="text-xs text-gray-400">{kpi.titleNep}</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">{kpi.value}</p>
                </div>
                <div className={`p-2 rounded-lg bg-gradient-to-br ${kpi.color}`}><kpi.icon className="w-4 h-4 text-white" /></div>
              </div>
              <div className="flex items-center gap-1 mt-2">
                {kpi.up ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : <TrendingDown className="w-3 h-3 text-red-500" />}
                <span className={`text-xs font-medium ${kpi.up ? 'text-emerald-600' : 'text-red-600'}`}>{kpi.change}</span>
                <span className="text-xs text-gray-400">vs last month</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Monthly Trend</CardTitle>
            <CardDescription>Savings, Loans & Income (मासिक प्रवृत्ति)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorLoans" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => formatNPR(value)} />
                <Legend />
                <Area type="monotone" dataKey="savings" stroke="#10b981" fill="url(#colorSavings)" strokeWidth={2} name="Savings" />
                <Area type="monotone" dataKey="loans" stroke="#f43f5e" fill="url(#colorLoans)" strokeWidth={2} name="Loans" />
                <Line type="monotone" dataKey="income" stroke="#6366f1" strokeWidth={2} name="Income" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Loan Status</CardTitle>
            <CardDescription>ऋण स्थिति</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={loanStatusDist} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                  {loanStatusDist.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {loanStatusDist.map((item, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-gray-600">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Savings by Product</CardTitle>
            <CardDescription>बचत उत्पादन अनुसार</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={savingsByProduct}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => formatNPR(value)} />
                <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} name="Total Balance" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Activities</CardTitle>
            <CardDescription>भर्खरको गतिविधि</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivities.map((act, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    act.icon === 'deposit' ? 'bg-emerald-100 text-emerald-600' :
                    act.icon === 'loan' ? 'bg-rose-100 text-rose-600' :
                    act.icon === 'member' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                  }`}>
                    {act.icon === 'deposit' ? <PiggyBank className="w-4 h-4" /> : act.icon === 'loan' ? <HandCoins className="w-4 h-4" /> : act.icon === 'member' ? <Users className="w-4 h-4" /> : <CalendarDays className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{act.description}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{act.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {navItems.slice(1, 6).map(item => (
          <Card key={item.key} className="cursor-pointer hover:shadow-md transition-all border-0 shadow-sm group" onClick={() => useNavigationStore.getState().setActiveModule(item.key)}>
            <CardContent className="p-4 text-center">
              <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center bg-gray-50 group-hover:scale-110 transition-transform ${item.color}`}><item.icon className="w-6 h-6" /></div>
              <p className="text-sm font-medium text-gray-900">{item.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{item.labelNep}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// MEMBERS MODULE (with CRUD)
// ============================================================
function MembersModule({ data, onRefresh }: { data: DashboardData; onRefresh: () => void }) {
  const [filter, setFilter] = useState('ALL')
  const [addOpen, setAddOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})

  const filtered = data.members.filter(m => filter === 'ALL' || m.status === filter)

  const handleAdd = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        toast.success('Member registered successfully! / सदस्य दर्ता भयो!')
        setAddOpen(false)
        setForm({})
        onRefresh()
      } else {
        toast.error('Failed to register member')
      }
    } catch { toast.error('Network error') }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Member Management</h2>
          <p className="text-gray-500 text-sm">सदस्य व्यवस्थापन - {data.members.length} total members</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-2" /> Add Member</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Member / नयाँ सदस्य दर्ता</DialogTitle>
              <DialogDescription>Register a new cooperative member</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
              <div className="space-y-2"><Label>First Name *</Label><Input placeholder="First name" value={form.firstName || ''} onChange={e => setForm({...form, firstName: e.target.value})} /></div>
              <div className="space-y-2"><Label>Last Name *</Label><Input placeholder="Last name" value={form.lastName || ''} onChange={e => setForm({...form, lastName: e.target.value})} /></div>
              <div className="space-y-2"><Label>First Name (नेपाली)</Label><Input placeholder="पहिलो नाम" value={form.firstNameNep || ''} onChange={e => setForm({...form, firstNameNep: e.target.value})} /></div>
              <div className="space-y-2"><Label>Last Name (नेपाली)</Label><Input placeholder="थर" value={form.lastNameNep || ''} onChange={e => setForm({...form, lastNameNep: e.target.value})} /></div>
              <div className="space-y-2"><Label>Father&apos;s Name</Label><Input placeholder="बुबाको नाम" value={form.fatherName || ''} onChange={e => setForm({...form, fatherName: e.target.value})} /></div>
              <div className="space-y-2"><Label>Gender</Label>
                <Select value={form.gender || ''} onValueChange={v => setForm({...form, gender: v})}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent><SelectItem value="MALE">Male</SelectItem><SelectItem value="FEMALE">Female</SelectItem><SelectItem value="OTHER">Other</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Phone *</Label><Input placeholder="98XXXXXXXX" value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} /></div>
              <div className="space-y-2"><Label>Citizenship No.</Label><Input placeholder="नागरिकता नम्बर" value={form.citizenshipNo || ''} onChange={e => setForm({...form, citizenshipNo: e.target.value})} /></div>
              <div className="space-y-2"><Label>Occupation</Label><Input placeholder="पेशा" value={form.occupation || ''} onChange={e => setForm({...form, occupation: e.target.value})} /></div>
              <div className="space-y-2"><Label>Province</Label>
                <Select value={form.province || ''} onValueChange={v => setForm({...form, province: v})}>
                  <SelectTrigger><SelectValue placeholder="प्रदेश" /></SelectTrigger>
                  <SelectContent>{['Koshi', 'Madhesh', 'Bagmati', 'Gandaki', 'Lumbini', 'Karnali', 'Sudurpashchim'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>District</Label><Input placeholder="जिल्ला" value={form.district || ''} onChange={e => setForm({...form, district: e.target.value})} /></div>
              <div className="space-y-2"><Label>Municipality</Label><Input placeholder="नगरपालिका" value={form.municipality || ''} onChange={e => setForm({...form, municipality: e.target.value})} /></div>
              <div className="space-y-2"><Label>Ward No.</Label><Input placeholder="वडा नम्बर" value={form.wardNo || ''} onChange={e => setForm({...form, wardNo: e.target.value})} /></div>
              <div className="space-y-2"><Label>Member Type</Label>
                <Select value={form.memberType || 'REGULAR'} onValueChange={v => setForm({...form, memberType: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="REGULAR">Regular</SelectItem><SelectItem value="ASSOCIATE">Associate</SelectItem><SelectItem value="HONORARY">Honorary</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2"><BSDatePicker label="Membership Date (BS)" value={form.membershipDate || getTodayBS()} onChange={v => setForm({...form, membershipDate: v})} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleAdd} disabled={saving || !form.firstName || !form.lastName}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Register Member
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">{data.members.length}</p><p className="text-xs text-gray-500">Total / कुल</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-emerald-600">{data.members.filter(m=>m.status==='ACTIVE').length}</p><p className="text-xs text-gray-500">Active</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-amber-600">{data.members.filter(m=>m.gender==='FEMALE').length}</p><p className="text-xs text-gray-500">Female / महिला</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-purple-600">{data.members.filter(m=>m.gender==='MALE').length}</p><p className="text-xs text-gray-500">Male / पुरुष</p></CardContent></Card>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {['ALL', 'ACTIVE', 'INACTIVE', 'SUSPENDED'].map(s => (
          <Button key={s} variant={filter === s ? 'default' : 'outline'} size="sm" onClick={() => setFilter(s)} className={filter === s ? 'bg-emerald-600 hover:bg-emerald-700' : ''}>{s}</Button>
        ))}
      </div>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow className="bg-gray-50">
                <TableHead className="font-semibold">Member No.</TableHead>
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold hidden sm:table-cell">नेपाली</TableHead>
                <TableHead className="font-semibold hidden md:table-cell">Phone</TableHead>
                <TableHead className="font-semibold hidden md:table-cell">Occupation</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map(m => (
                  <TableRow key={m.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-emerald-600">{m.memberNo}</TableCell>
                    <TableCell>{m.firstName} {m.lastName}</TableCell>
                    <TableCell className="hidden sm:table-cell">{m.firstNameNep} {m.lastNameNep}</TableCell>
                    <TableCell className="hidden md:table-cell">{m.phone}</TableCell>
                    <TableCell className="hidden md:table-cell">{m.occupation}</TableCell>
                    <TableCell><Badge className={statusColor(m.status)}>{m.status}</Badge></TableCell>
                    <TableCell><Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// SAVINGS MODULE (Enhanced - with new account dialog & account detail)
// ============================================================
function SavingsModule({ data, onRefresh }: { data: DashboardData; onRefresh: () => void }) {
  const [actionOpen, setActionOpen] = useState(false)
  const [newAccountOpen, setNewAccountOpen] = useState(false)
  const [actionType, setActionType] = useState<'deposit' | 'withdraw'>('deposit')
  const [selectedAccount, setSelectedAccount] = useState('')
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [detailAccount, setDetailAccount] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [newAcctForm, setNewAcctForm] = useState<Record<string, string>>({ openingDate: getTodayBS() })

  const totalBalance = data.savingsAccounts.reduce((s, a) => s + a.balance, 0)

  // Fetch products for new account dialog
  useEffect(() => {
    fetch('/api/savings')
      .then(r => r.json())
      .then(d => { if (d.products) setProducts(d.products) })
      .catch(() => {})
  }, [])

  // Fetch transaction history for detail view
  const openDetail = (acct: any) => {
    setDetailAccount(acct)
    fetch(`/api/savings/${acct.id}`)
      .then(r => r.json())
      .then(d => { if (d.transactions) setTransactions(d.transactions) })
      .catch(() => setTransactions([]))
  }

  const handleAction = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/savings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionType, accountNo: selectedAccount, amount: parseFloat(amount) }),
      })
      if (res.ok) {
        toast.success(`${actionType === 'deposit' ? 'Deposit' : 'Withdrawal'} successful! / ${actionType === 'deposit' ? 'निक्षेप' : 'निकासा'} सफल!`)
        setActionOpen(false)
        setAmount('')
        onRefresh()
      } else { const d = await res.json(); toast.error(d.error || 'Transaction failed') }
    } catch { toast.error('Network error') }
    setSaving(false)
  }

  const handleNewAccount = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/savings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          memberId: newAcctForm.memberId,
          productId: newAcctForm.productId,
          initialDeposit: parseFloat(newAcctForm.openingAmount || '0'),
          openedDate: newAcctForm.openingDate || getTodayBS(),
          nominiName: newAcctForm.nomineeName || undefined,
          nominiRelation: newAcctForm.nomineeRelation || undefined,
        }),
      })
      if (res.ok) {
        toast.success('Savings account created! / बचत खाता खोलियो!')
        setNewAccountOpen(false)
        setNewAcctForm({ openingDate: getTodayBS() })
        onRefresh()
      } else { const d = await res.json(); toast.error(d.error || 'Failed to create account') }
    } catch { toast.error('Network error') }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h2 className="text-2xl font-bold text-gray-900">Savings & Deposits</h2><p className="text-gray-500 text-sm">बचत तथा निक्षेप व्यवस्थापन</p></div>
        <div className="flex gap-2">
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setNewAcctForm({ openingDate: getTodayBS() }); setNewAccountOpen(true) }}><Plus className="w-4 h-4 mr-2" /> New Account</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-amber-600">{data.savingsAccounts.length}</p><p className="text-xs text-gray-500">Accounts</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-emerald-600">{formatNPR(totalBalance)}</p><p className="text-xs text-gray-500">Total Balance</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">{formatNPR(data.savingsAccounts.reduce((s,a)=>s+a.interestEarned,0))}</p><p className="text-xs text-gray-500">Interest</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-purple-600">{data.savingsAccounts.filter(a=>a.status==='ACTIVE').length}</p><p className="text-xs text-gray-500">Active</p></CardContent></Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow className="bg-gray-50">
                <TableHead className="font-semibold">Account No.</TableHead>
                <TableHead className="font-semibold">Member</TableHead>
                <TableHead className="font-semibold hidden sm:table-cell">Product</TableHead>
                <TableHead className="font-semibold">Balance</TableHead>
                <TableHead className="font-semibold hidden md:table-cell">Interest</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data.savingsAccounts.map(sa => (
                  <TableRow key={sa.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-amber-600">{sa.accountNo}</TableCell>
                    <TableCell>{sa.member ? `${sa.member.firstName} ${sa.member.lastName}` : '—'}</TableCell>
                    <TableCell className="hidden sm:table-cell">{sa.product?.name || '—'}</TableCell>
                    <TableCell className="font-medium">{formatNPR(sa.balance)}</TableCell>
                    <TableCell className="hidden md:table-cell">{formatNPR(sa.interestEarned)}</TableCell>
                    <TableCell><Badge className={statusColor(sa.status)}>{sa.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" title="View Details" onClick={() => openDetail(sa)}><Eye className="w-4 h-4 text-blue-600" /></Button>
                        <Button variant="ghost" size="sm" title="Deposit" onClick={() => { setActionType('deposit'); setSelectedAccount(sa.accountNo); setActionOpen(true) }}><ArrowUpRight className="w-4 h-4 text-emerald-600" /></Button>
                        <Button variant="ghost" size="sm" title="Withdraw" onClick={() => { setActionType('withdraw'); setSelectedAccount(sa.accountNo); setActionOpen(true) }}><ArrowDownRight className="w-4 h-4 text-rose-600" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Deposit/Withdraw Dialog */}
      <Dialog open={actionOpen} onOpenChange={setActionOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{actionType === 'deposit' ? 'Cash Deposit / नगद निक्षेप' : 'Cash Withdrawal / नगद निकासा'}</DialogTitle>
            <DialogDescription>Account: {selectedAccount}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Amount (NPR)</Label><Input type="number" placeholder="Enter amount" value={amount} onChange={e => setAmount(e.target.value)} /></div>
            {amount && <div className="p-3 bg-gray-50 rounded-lg text-sm"><p className="text-gray-500">In words: {nprToWords(parseFloat(amount))} Rupees Only</p></div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionOpen(false)}>Cancel</Button>
            <Button className={actionType === 'deposit' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'} onClick={handleAction} disabled={saving || !amount}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {actionType === 'deposit' ? 'Deposit' : 'Withdraw'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Account Dialog */}
      <Dialog open={newAccountOpen} onOpenChange={setNewAccountOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Savings Account / नयाँ बचत खाता</DialogTitle>
            <DialogDescription>Open a new savings account for a member</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>Member *</Label>
              <Select value={newAcctForm.memberId || ''} onValueChange={v => setNewAcctForm({...newAcctForm, memberId: v})}>
                <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>
                  {data.members.map(m => <SelectItem key={m.id} value={m.id}>{m.memberNo} - {m.firstName} {m.lastName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Savings Product *</Label>
              <Select value={newAcctForm.productId || ''} onValueChange={v => setNewAcctForm({...newAcctForm, productId: v})}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.interestRate}% p.a.)</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Opening Amount (NPR)</Label><Input type="number" placeholder="0" value={newAcctForm.openingAmount || ''} onChange={e => setNewAcctForm({...newAcctForm, openingAmount: e.target.value})} /></div>
            <div className="space-y-2"><Label>Nominee Name</Label><Input placeholder="नाम" value={newAcctForm.nomineeName || ''} onChange={e => setNewAcctForm({...newAcctForm, nomineeName: e.target.value})} /></div>
            <div className="space-y-2"><Label>Nominee Relation</Label><Input placeholder="नाता" value={newAcctForm.nomineeRelation || ''} onChange={e => setNewAcctForm({...newAcctForm, nomineeRelation: e.target.value})} /></div>
            <div className="sm:col-span-2"><BSDatePicker label="Opening Date (BS)" value={newAcctForm.openingDate || getTodayBS()} onChange={v => setNewAcctForm({...newAcctForm, openingDate: v})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewAccountOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleNewAccount} disabled={saving || !newAcctForm.memberId || !newAcctForm.productId}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Create Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Account Detail Dialog */}
      <Dialog open={!!detailAccount} onOpenChange={() => setDetailAccount(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Account Details / खाता विवरण</DialogTitle>
            <DialogDescription>{detailAccount?.accountNo} - {detailAccount?.member ? `${detailAccount.member.firstName} ${detailAccount.member.lastName}` : ''}</DialogDescription>
          </DialogHeader>
          {detailAccount && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 bg-emerald-50 rounded-lg text-center"><p className="text-lg font-bold text-emerald-700">{formatNPR(detailAccount.balance)}</p><p className="text-xs text-emerald-600">Balance</p></div>
                <div className="p-3 bg-blue-50 rounded-lg text-center"><p className="text-lg font-bold text-blue-700">{formatNPR(detailAccount.interestEarned)}</p><p className="text-xs text-blue-600">Interest</p></div>
                <div className="p-3 bg-amber-50 rounded-lg text-center"><p className="text-lg font-bold text-amber-700">{detailAccount.product?.name || '—'}</p><p className="text-xs text-amber-600">Product</p></div>
                <div className="p-3 bg-gray-50 rounded-lg text-center"><p className="text-lg font-bold text-gray-700">{detailAccount.status}</p><p className="text-xs text-gray-600">Status</p></div>
              </div>
              {detailAccount.nominiName && (
                <div className="p-3 bg-gray-50 rounded-lg"><p className="text-sm text-gray-500">Nominee: <span className="font-medium text-gray-900">{detailAccount.nominiName}</span> ({detailAccount.nominiRelation || 'N/A'})</p></div>
              )}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Transaction History / कारोबार विवरण</h4>
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-400"><FileText className="w-8 h-8 mx-auto mb-2 opacity-50" /><p className="text-sm">No transactions yet</p></div>
                ) : (
                  <Card className="border shadow-none"><CardContent className="p-0"><div className="overflow-x-auto">
                    <Table><TableHeader><TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Type</TableHead>
                      <TableHead className="font-semibold">Amount</TableHead>
                      <TableHead className="font-semibold">Balance</TableHead>
                      <TableHead className="font-semibold hidden sm:table-cell">Description</TableHead>
                    </TableRow></TableHeader><TableBody>
                      {transactions.map((tx: any) => (
                        <TableRow key={tx.id} className="hover:bg-gray-50">
                          <TableCell className="text-sm">{tx.transactionDate}</TableCell>
                          <TableCell><Badge className={tx.type === 'DEPOSIT' ? 'bg-emerald-100 text-emerald-800' : tx.type === 'WITHDRAWAL' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'}>{tx.type}</Badge></TableCell>
                          <TableCell className={`font-medium ${tx.type === 'DEPOSIT' ? 'text-emerald-600' : 'text-rose-600'}`}>{formatNPR(tx.amount)}</TableCell>
                          <TableCell className="font-medium">{formatNPR(tx.balanceAfter)}</TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-gray-500">{tx.description || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody></Table>
                  </div></CardContent></Card>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================
// LOANS MODULE (Enhanced - with new application dialog & EMI schedule)
// ============================================================
function LoansModule({ data, onRefresh }: { data: DashboardData; onRefresh: () => void }) {
  const [tab, setTab] = useState('all')
  const [actionOpen, setActionOpen] = useState(false)
  const [newAppOpen, setNewAppOpen] = useState(false)
  const [actionType, setActionType] = useState<'approve' | 'disburse' | 'reject'>('approve')
  const [selectedLoan, setSelectedLoan] = useState('')
  const [actionForm, setActionForm] = useState<Record<string, string>>({})
  const [newAppForm, setNewAppForm] = useState<Record<string, string>>({ applicationDate: getTodayBS() })
  const [loanProducts, setLoanProducts] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [emiSchedule, setEmiSchedule] = useState<any[]>([])
  const [emiLoanId, setEmiLoanId] = useState<string | null>(null)

  // Fetch loan products
  useEffect(() => {
    fetch('/api/loans')
      .then(r => r.json())
      .then(d => { if (d.products) setLoanProducts(d.products) })
      .catch(() => {})
  }, [])

  const filtered = data.loanApps.filter(l => {
    if (tab === 'all') return true
    if (tab === 'pending') return l.status === 'PENDING' || l.status === 'UNDER_REVIEW'
    if (tab === 'disbursed') return l.status === 'DISBURSED'
    if (tab === 'approved') return l.status === 'APPROVED'
    return true
  })

  const handleAction = async () => {
    setSaving(true)
    try {
      const body: any = { action: actionType, applicationNo: selectedLoan }
      if (actionType === 'approve') {
        body.approvedAmount = actionForm.approvedAmount
        body.interestRate = actionForm.interestRate
      } else if (actionType === 'disburse') {
        body.disbursedAmount = actionForm.disbursedAmount
        body.emiAmount = actionForm.emiAmount
      } else if (actionType === 'reject') {
        body.rejectionReason = actionForm.rejectionReason
      }
      const res = await fetch('/api/loans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) {
        toast.success(`Loan ${actionType}d successfully!`)
        setActionOpen(false)
        setActionForm({})
        onRefresh()
      } else { toast.error('Action failed') }
    } catch { toast.error('Network error') }
    setSaving(false)
  }

  const handleNewApplication = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: newAppForm.memberId,
          productId: newAppForm.productId,
          requestedAmount: newAppForm.requestedAmount,
          term: newAppForm.term,
          purpose: newAppForm.purpose,
          purposeNepali: newAppForm.purposeNepali,
          collateralType: newAppForm.collateralType,
          collateralValue: newAppForm.collateralValue,
          collateralDesc: newAppForm.collateralDesc,
          guarantorId: newAppForm.guarantorId || undefined,
        }),
      })
      if (res.ok) {
        toast.success('Loan application submitted! / ऋण आवेदन दाखिल भयो!')
        setNewAppOpen(false)
        setNewAppForm({ applicationDate: getTodayBS() })
        onRefresh()
      } else { toast.error('Failed to submit application') }
    } catch { toast.error('Network error') }
    setSaving(false)
  }

  const showEmiSchedule = (loan: any) => {
    const P = loan.disbursedAmount || loan.approvedAmount || loan.requestedAmount
    const r = (loan.interestRate || 12) / 100 / 12
    const n = loan.term || 12
    const emi = P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1)
    const schedule = []
    let balance = P
    for (let i = 1; i <= n; i++) {
      const interest = balance * r
      const principal = emi - interest
      balance -= principal
      schedule.push({ month: i, emi: Math.round(emi), principal: Math.round(principal), interest: Math.round(interest), balance: Math.round(Math.max(0, balance)) })
    }
    setEmiSchedule(schedule)
    setEmiLoanId(loan.id)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h2 className="text-2xl font-bold text-gray-900">Loan Management</h2><p className="text-gray-500 text-sm">ऋण व्यवस्थापन</p></div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setNewAppForm({ applicationDate: getTodayBS() }); setNewAppOpen(true) }}><Plus className="w-4 h-4 mr-2" /> New Application</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-rose-600">{data.loanApps.length}</p><p className="text-xs text-gray-500">Applications</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-emerald-600">{formatNPR(data.loanApps.filter(l=>l.status==='DISBURSED').reduce((s,l)=>s+(l.disbursedAmount||0),0))}</p><p className="text-xs text-gray-500">Disbursed</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-amber-600">{formatNPR(data.loanApps.filter(l=>l.status==='DISBURSED').reduce((s,l)=>s+(l.outstandingAmount||0),0))}</p><p className="text-xs text-gray-500">Outstanding</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">{data.loanApps.filter(l=>l.status==='PENDING'||l.status==='UNDER_REVIEW').length}</p><p className="text-xs text-gray-500">Pending</p></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="pending">Pending</TabsTrigger><TabsTrigger value="approved">Approved</TabsTrigger><TabsTrigger value="disbursed">Disbursed</TabsTrigger></TabsList>
      </Tabs>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow className="bg-gray-50">
                <TableHead className="font-semibold">App No.</TableHead>
                <TableHead className="font-semibold">Member</TableHead>
                <TableHead className="font-semibold hidden sm:table-cell">Product</TableHead>
                <TableHead className="font-semibold">Amount</TableHead>
                <TableHead className="font-semibold hidden md:table-cell">Term</TableHead>
                <TableHead className="font-semibold hidden md:table-cell">Rate</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map(la => (
                  <TableRow key={la.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-rose-600">{la.applicationNo}</TableCell>
                    <TableCell>{la.member ? `${la.member.firstName} ${la.member.lastName}` : '—'}</TableCell>
                    <TableCell className="hidden sm:table-cell">{la.product?.name || '—'}</TableCell>
                    <TableCell className="font-medium">{formatNPR(la.requestedAmount)}</TableCell>
                    <TableCell className="hidden md:table-cell">{la.term} mo</TableCell>
                    <TableCell className="hidden md:table-cell">{la.interestRate ? `${la.interestRate}%` : '—'}</TableCell>
                    <TableCell><Badge className={statusColor(la.status)}>{la.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {(la.status === 'PENDING' || la.status === 'UNDER_REVIEW') && (
                          <>
                            <Button variant="ghost" size="sm" className="text-emerald-600" onClick={() => { setActionType('approve'); setSelectedLoan(la.applicationNo); setActionForm({approvedAmount: String(la.requestedAmount), interestRate: String(la.product?.interestRate || '')}); setActionOpen(true) }}><CheckCircle2 className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="sm" className="text-red-600" onClick={() => { setActionType('reject'); setSelectedLoan(la.applicationNo); setActionForm({}); setActionOpen(true) }}><X className="w-4 h-4" /></Button>
                          </>
                        )}
                        {la.status === 'APPROVED' && (
                          <Button variant="ghost" size="sm" className="text-blue-600" onClick={() => { setActionType('disburse'); setSelectedLoan(la.applicationNo); setActionForm({disbursedAmount: String(la.approvedAmount || la.requestedAmount)}); setActionOpen(true) }}><DollarSign className="w-4 h-4" /></Button>
                        )}
                        {(la.status === 'DISBURSED' || la.status === 'APPROVED') && (
                          <Button variant="ghost" size="sm" className="text-purple-600" title="EMI Schedule" onClick={() => showEmiSchedule(la)}><Receipt className="w-4 h-4" /></Button>
                        )}
                        <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Action Dialog (approve/disburse/reject) */}
      <Dialog open={actionOpen} onOpenChange={setActionOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{actionType === 'approve' ? 'Approve Loan / ऋण स्वीकृत' : actionType === 'disburse' ? 'Disburse Loan / ऋण वितरण' : 'Reject Loan / ऋण अस्वीकृत'}</DialogTitle>
            <DialogDescription>Application: {selectedLoan}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {actionType === 'approve' && (
              <>
                <div className="space-y-2"><Label>Approved Amount (NPR)</Label><Input type="number" value={actionForm.approvedAmount || ''} onChange={e => setActionForm({...actionForm, approvedAmount: e.target.value})} /></div>
                <div className="space-y-2"><Label>Interest Rate (%)</Label><Input type="number" step="0.5" value={actionForm.interestRate || ''} onChange={e => setActionForm({...actionForm, interestRate: e.target.value})} /></div>
              </>
            )}
            {actionType === 'disburse' && (
              <>
                <div className="space-y-2"><Label>Disbursement Amount (NPR)</Label><Input type="number" value={actionForm.disbursedAmount || ''} onChange={e => setActionForm({...actionForm, disbursedAmount: e.target.value})} /></div>
                <div className="space-y-2"><Label>EMI Amount (NPR)</Label><Input type="number" value={actionForm.emiAmount || ''} onChange={e => setActionForm({...actionForm, emiAmount: e.target.value})} /></div>
              </>
            )}
            {actionType === 'reject' && (
              <div className="space-y-2"><Label>Rejection Reason</Label><Textarea placeholder="अस्वीकृति कारण..." value={actionForm.rejectionReason || ''} onChange={e => setActionForm({...actionForm, rejectionReason: e.target.value})} /></div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionOpen(false)}>Cancel</Button>
            <Button className={actionType === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'} onClick={handleAction} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {actionType === 'approve' ? 'Approve' : actionType === 'disburse' ? 'Disburse' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Application Dialog */}
      <Dialog open={newAppOpen} onOpenChange={setNewAppOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Loan Application / नयाँ ऋण आवेदन</DialogTitle>
            <DialogDescription>Submit a new loan application</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>Member *</Label>
              <Select value={newAppForm.memberId || ''} onValueChange={v => setNewAppForm({...newAppForm, memberId: v})}>
                <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>
                  {data.members.map(m => <SelectItem key={m.id} value={m.id}>{m.memberNo} - {m.firstName} {m.lastName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Loan Product *</Label>
              <Select value={newAppForm.productId || ''} onValueChange={v => setNewAppForm({...newAppForm, productId: v})}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {loanProducts.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.interestRate}% p.a.)</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Requested Amount (NPR) *</Label><Input type="number" value={newAppForm.requestedAmount || ''} onChange={e => setNewAppForm({...newAppForm, requestedAmount: e.target.value})} /></div>
            <div className="space-y-2"><Label>Term (months) *</Label><Input type="number" value={newAppForm.term || ''} onChange={e => setNewAppForm({...newAppForm, term: e.target.value})} /></div>
            <div className="space-y-2"><Label>Purpose</Label><Input placeholder="Purpose of loan" value={newAppForm.purpose || ''} onChange={e => setNewAppForm({...newAppForm, purpose: e.target.value})} /></div>
            <div className="space-y-2"><Label>ऋणको उद्देश्य</Label><Input placeholder="नेपालीमा" value={newAppForm.purposeNepali || ''} onChange={e => setNewAppForm({...newAppForm, purposeNepali: e.target.value})} /></div>
            <div className="space-y-2">
              <Label>Guarantor</Label>
              <Select value={newAppForm.guarantorId || ''} onValueChange={v => setNewAppForm({...newAppForm, guarantorId: v})}>
                <SelectTrigger><SelectValue placeholder="Select guarantor" /></SelectTrigger>
                <SelectContent>
                  {data.members.filter(m => m.id !== newAppForm.memberId).map(m => <SelectItem key={m.id} value={m.id}>{m.memberNo} - {m.firstName} {m.lastName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Collateral Type</Label>
              <Select value={newAppForm.collateralType || ''} onValueChange={v => setNewAppForm({...newAppForm, collateralType: v})}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {['LAND', 'BUILDING', 'GOLD', 'VEHICLE', 'FIXED_DEPOSIT', 'SHARE_CERTIFICATE', 'PERSONAL_GUARANTEE'].map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Collateral Value (NPR)</Label><Input type="number" value={newAppForm.collateralValue || ''} onChange={e => setNewAppForm({...newAppForm, collateralValue: e.target.value})} /></div>
            <div className="space-y-2"><Label>Collateral Description</Label><Input placeholder="Details" value={newAppForm.collateralDesc || ''} onChange={e => setNewAppForm({...newAppForm, collateralDesc: e.target.value})} /></div>
            <div className="sm:col-span-2"><BSDatePicker label="Application Date (BS)" value={newAppForm.applicationDate || getTodayBS()} onChange={v => setNewAppForm({...newAppForm, applicationDate: v})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewAppOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleNewApplication} disabled={saving || !newAppForm.memberId || !newAppForm.productId || !newAppForm.requestedAmount || !newAppForm.term}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Submit Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EMI Schedule Dialog */}
      <Dialog open={!!emiLoanId} onOpenChange={() => setEmiLoanId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>EMI Schedule / किस्ता तालिका</DialogTitle>
            <DialogDescription>Estimated EMI repayment schedule</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {emiSchedule.length > 0 && (
              <div className="p-3 bg-emerald-50 rounded-lg">
                <p className="text-sm text-emerald-700">Monthly EMI: <span className="font-bold">{formatNPR(emiSchedule[0].emi)}</span></p>
              </div>
            )}
            <Card className="border shadow-none"><CardContent className="p-0"><div className="overflow-x-auto max-h-96 overflow-y-auto">
              <Table><TableHeader><TableRow className="bg-gray-50">
                <TableHead className="font-semibold">Month</TableHead>
                <TableHead className="font-semibold">EMI</TableHead>
                <TableHead className="font-semibold">Principal</TableHead>
                <TableHead className="font-semibold">Interest</TableHead>
                <TableHead className="font-semibold">Balance</TableHead>
              </TableRow></TableHeader><TableBody>
                {emiSchedule.map((row: any) => (
                  <TableRow key={row.month} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{row.month}</TableCell>
                    <TableCell>{formatNPR(row.emi)}</TableCell>
                    <TableCell>{formatNPR(row.principal)}</TableCell>
                    <TableCell>{formatNPR(row.interest)}</TableCell>
                    <TableCell>{formatNPR(row.balance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody></Table>
            </div></CardContent></Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================
// ACCOUNTING MODULE (COMPLETE OVERHAUL)
// ============================================================
function AccountingModule({ data, onRefresh }: { data: DashboardData; onRefresh: () => void }) {
  const [tab, setTab] = useState('journal')
  const [newEntryOpen, setNewEntryOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Journal entry form state
  const [entryForm, setEntryForm] = useState({
    entryType: 'JOURNAL',
    date: getTodayBS(),
    narration: '',
    narrationNep: '',
    items: [
      { accountId: '', debit: 0, credit: 0, description: '' },
      { accountId: '', debit: 0, credit: 0, description: '' },
    ],
  })

  // Ledger state
  const [ledgerAccountId, setLedgerAccountId] = useState('')
  const [ledgerFromDate, setLedgerFromDate] = useState('')
  const [ledgerToDate, setLedgerToDate] = useState('')
  const [ledgerData, setLedgerData] = useState<any>(null)
  const [ledgerLoading, setLedgerLoading] = useState(false)

  // Trial Balance state
  const [trialBalanceData, setTrialBalanceData] = useState<any>(null)
  const [trialBalanceLoading, setTrialBalanceLoading] = useState(false)

  // Day Book state
  const [dayBookDate, setDayBookDate] = useState(getTodayBS())
  const [dayBookData, setDayBookData] = useState<any>(null)
  const [dayBookLoading, setDayBookLoading] = useState(false)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  // Voucher quick-create state
  const [voucherType, setVoucherType] = useState<string>('PAYMENT')

  const accounts = data.accounts || []
  const nonHeaderAccounts = accounts.filter((a: any) => a.subType !== 'HEADER')

  const totalDebit = entryForm.items.reduce((s, i) => s + (i.debit || 0), 0)
  const totalCredit = entryForm.items.reduce((s, i) => s + (i.credit || 0), 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01

  // Reset form and open dialog
  const openNewEntry = (preType?: string) => {
    setEntryForm({
      entryType: preType || 'JOURNAL',
      date: getTodayBS(),
      narration: '',
      narrationNep: '',
      items: [
        { accountId: '', debit: 0, credit: 0, description: '' },
        { accountId: '', debit: 0, credit: 0, description: '' },
      ],
    })
    setNewEntryOpen(true)
  }

  // Open voucher quick-create with pre-populated accounts
  const openVoucherCreate = (type: string) => {
    const cashAccounts = nonHeaderAccounts.filter((a: any) => a.subType === 'CASH' || a.name.toLowerCase().includes('cash'))
    const bankAccounts = nonHeaderAccounts.filter((a: any) => a.subType === 'BANK' || a.name.toLowerCase().includes('bank'))
    const cashOrBankId = (cashAccounts[0] || bankAccounts[0])?.id || ''

    let items = [
      { accountId: '', debit: 0, credit: 0, description: '' },
      { accountId: '', debit: 0, credit: 0, description: '' },
    ]

    if (type === 'PAYMENT') {
      // Payment: Debit = expense/asset, Credit = Cash/Bank
      items = [
        { accountId: '', debit: 0, credit: 0, description: '' },
        { accountId: cashOrBankId, debit: 0, credit: 0, description: '' },
      ]
    } else if (type === 'RECEIPT') {
      // Receipt: Debit = Cash/Bank, Credit = income/liability
      items = [
        { accountId: cashOrBankId, debit: 0, credit: 0, description: '' },
        { accountId: '', debit: 0, credit: 0, description: '' },
      ]
    } else if (type === 'CONTRA') {
      // Contra: Both accounts = Cash/Bank
      const bankId = bankAccounts[0]?.id || cashOrBankId
      items = [
        { accountId: cashOrBankId, debit: 0, credit: 0, description: '' },
        { accountId: bankId, debit: 0, credit: 0, description: '' },
      ]
    }

    setEntryForm({
      entryType: type,
      date: getTodayBS(),
      narration: '',
      narrationNep: '',
      items,
    })
    setVoucherType(type)
    setNewEntryOpen(true)
  }

  const addItem = () => {
    setEntryForm({...entryForm, items: [...entryForm.items, { accountId: '', debit: 0, credit: 0, description: '' }]})
  }

  const removeItem = (idx: number) => {
    if (entryForm.items.length <= 2) return
    const newItems = entryForm.items.filter((_, i) => i !== idx)
    setEntryForm({...entryForm, items: newItems})
  }

  const updateItem = (idx: number, field: string, value: any) => {
    const newItems = [...entryForm.items]
    newItems[idx] = { ...newItems[idx], [field]: value }
    setEntryForm({...entryForm, items: newItems})
  }

  const handleSubmitEntry = async () => {
    if (!isBalanced) {
      toast.error('Total debits must equal total credits / कुल डेबिट कुल क्रेडिट सँग बराबर हुनुपर्छ')
      return
    }
    if (entryForm.items.some(i => !i.accountId)) {
      toast.error('All line items must have an account selected / सबै लाइन आइटममा खाता छान्नुहोस्')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/accounting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: entryForm.date,
          narration: entryForm.narration,
          narrationNep: entryForm.narrationNep || undefined,
          entryType: entryForm.entryType,
          items: entryForm.items.map(i => ({
            accountId: i.accountId,
            debit: i.debit || 0,
            credit: i.credit || 0,
            description: i.description || undefined,
          })),
        }),
      })
      if (res.ok) {
        toast.success('Journal entry created! / जर्नल प्रविष्टि सिर्जना भयो!')
        setNewEntryOpen(false)
        onRefresh()
      } else {
        const d = await res.json()
        toast.error(d.error || 'Failed to create entry')
      }
    } catch { toast.error('Network error') }
    setSaving(false)
  }

  // Post/Cancel entry
  const handleEntryAction = async (entryId: string, action: 'POSTED' | 'CANCELLED') => {
    try {
      const res = await fetch(`/api/journal-entries/${entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action, postedBy: 'ADMIN' }),
      })
      if (res.ok) {
        toast.success(`Entry ${action === 'POSTED' ? 'posted' : 'cancelled'}! / प्रविष्टि ${action === 'POSTED' ? 'पोस्ट' : 'रद्द'} भयो!`)
        onRefresh()
      } else { toast.error('Action failed') }
    } catch { toast.error('Network error') }
  }

  // Fetch Ledger
  const fetchLedger = async () => {
    if (!ledgerAccountId) { toast.error('Please select an account'); return }
    setLedgerLoading(true)
    try {
      const params = new URLSearchParams({ type: 'ledger', accountId: ledgerAccountId })
      if (ledgerFromDate) params.set('fromDate', ledgerFromDate)
      if (ledgerToDate) params.set('toDate', ledgerToDate)
      const res = await fetch(`/api/accounting/reports?${params}`)
      const d = await res.json()
      setLedgerData(d)
      toast.success('Ledger loaded! / खाता विवरण लोड भयो!')
    } catch { toast.error('Failed to load ledger') }
    setLedgerLoading(false)
  }

  // Fetch Trial Balance
  const fetchTrialBalance = async () => {
    setTrialBalanceLoading(true)
    try {
      const res = await fetch('/api/accounting/reports?type=trial-balance')
      const d = await res.json()
      setTrialBalanceData(d)
      toast.success('Trial Balance generated! / तल्ला परीक्षण तयार भयो!')
    } catch { toast.error('Failed to generate trial balance') }
    setTrialBalanceLoading(false)
  }

  // Fetch Day Book
  const fetchDayBook = async () => {
    setDayBookLoading(true)
    try {
      const res = await fetch(`/api/accounting/reports?type=day-book&date=${dayBookDate}`)
      const d = await res.json()
      setDayBookData(d)
      toast.success('Day Book loaded! / दैनिक पुस्तक लोड भयो!')
    } catch { toast.error('Failed to load day book') }
    setDayBookLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Accounting</h2>
          <p className="text-gray-500 text-sm">लेखा व्यवस्थापन - Double Entry System</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => openNewEntry()}>
          <Plus className="w-4 h-4 mr-2" /> New Entry
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="journal">Journal Entries</TabsTrigger>
          <TabsTrigger value="vouchers">Vouchers</TabsTrigger>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
          <TabsTrigger value="trial-balance">Trial Balance</TabsTrigger>
          <TabsTrigger value="day-book">Day Book</TabsTrigger>
        </TabsList>

        {/* ===== JOURNAL ENTRIES TAB ===== */}
        <TabsContent value="journal" className="mt-4 space-y-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Voucher</TableHead>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Narration</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold">Debit</TableHead>
                    <TableHead className="font-semibold">Credit</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {data.journalEntries.map((je: any) => (
                      <TableRow key={je.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium text-purple-600">{je.voucherNo}</TableCell>
                        <TableCell className="text-sm">{je.date}</TableCell>
                        <TableCell className="max-w-xs truncate">{je.narration}</TableCell>
                        <TableCell><Badge variant="outline">{je.entryType}</Badge></TableCell>
                        <TableCell className="text-emerald-600">{formatNPR(je.items?.reduce((s:any,i:any)=>s+i.debit,0) || 0)}</TableCell>
                        <TableCell className="text-rose-600">{formatNPR(je.items?.reduce((s:any,i:any)=>s+i.credit,0) || 0)}</TableCell>
                        <TableCell><Badge className={statusColor(je.status)}>{je.status}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {je.status === 'DRAFT' && (
                              <>
                                <Button variant="ghost" size="sm" className="text-emerald-600" title="Post" onClick={() => handleEntryAction(je.id, 'POSTED')}><CheckCircle2 className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="sm" className="text-red-600" title="Cancel" onClick={() => handleEntryAction(je.id, 'CANCELLED')}><X className="w-4 h-4" /></Button>
                              </>
                            )}
                            <Button variant="ghost" size="sm" title="View"><Eye className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== VOUCHERS TAB ===== */}
        <TabsContent value="vouchers" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group" onClick={() => openVoucherCreate('PAYMENT')}>
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 rounded-xl bg-rose-100 text-rose-600 mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform"><ArrowUpRight className="w-7 h-7" /></div>
                <h3 className="font-semibold text-gray-900">Payment Voucher</h3>
                <p className="text-xs text-gray-500">भुक्तानी भौचर (PV)</p>
                <p className="text-xs text-gray-400 mt-1">Cash/Bank going OUT</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group" onClick={() => openVoucherCreate('RECEIPT')}>
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 rounded-xl bg-emerald-100 text-emerald-600 mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform"><ArrowDownRight className="w-7 h-7" /></div>
                <h3 className="font-semibold text-gray-900">Receipt Voucher</h3>
                <p className="text-xs text-gray-500">प्राप्ति भौचर (RV)</p>
                <p className="text-xs text-gray-400 mt-1">Cash/Bank coming IN</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group" onClick={() => openVoucherCreate('JOURNAL')}>
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 rounded-xl bg-blue-100 text-blue-600 mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform"><BookOpen className="w-7 h-7" /></div>
                <h3 className="font-semibold text-gray-900">Journal Voucher</h3>
                <p className="text-xs text-gray-500">जर्नल भौचर (JV)</p>
                <p className="text-xs text-gray-400 mt-1">General adjustment</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group" onClick={() => openVoucherCreate('CONTRA')}>
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 rounded-xl bg-purple-100 text-purple-600 mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform"><RefreshCw className="w-7 h-7" /></div>
                <h3 className="font-semibold text-gray-900">Contra Voucher</h3>
                <p className="text-xs text-gray-500">कन्ट्रा भौचर (CV)</p>
                <p className="text-xs text-gray-400 mt-1">Bank-to-Bank/Cash transfer</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== LEDGER TAB ===== */}
        <TabsContent value="ledger" className="mt-4 space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">General Ledger / खाता विवरण</CardTitle>
              <CardDescription>Select an account and date range to view ledger entries</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
                <div className="space-y-2">
                  <Label>Account</Label>
                  <Select value={ledgerAccountId} onValueChange={setLedgerAccountId}>
                    <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                    <SelectContent>
                      {nonHeaderAccounts.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <BSDatePicker label="From Date" value={ledgerFromDate} onChange={setLedgerFromDate} />
                <BSDatePicker label="To Date" value={ledgerToDate} onChange={setLedgerToDate} />
                <div className="flex items-end">
                  <Button className="bg-emerald-600 hover:bg-emerald-700 w-full" onClick={fetchLedger} disabled={ledgerLoading}>
                    {ledgerLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Eye className="w-4 h-4 mr-2" />} View Ledger
                  </Button>
                </div>
              </div>

              {ledgerData && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-900">{ledgerData.account?.code} - {ledgerData.account?.name}</p>
                      <p className="text-xs text-gray-500">{ledgerData.account?.nameNepali} | {ledgerData.account?.type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Closing Balance</p>
                      <p className={`font-bold text-lg ${ledgerData.closingBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatNPR(Math.abs(ledgerData.closingBalance))} {ledgerData.closingBalance >= 0 ? 'Dr' : 'Cr'}</p>
                    </div>
                  </div>
                  <Card className="border shadow-none"><CardContent className="p-0"><div className="overflow-x-auto">
                    <Table><TableHeader><TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Voucher</TableHead>
                      <TableHead className="font-semibold">Particulars</TableHead>
                      <TableHead className="font-semibold text-right">Debit</TableHead>
                      <TableHead className="font-semibold text-right">Credit</TableHead>
                      <TableHead className="font-semibold text-right">Balance</TableHead>
                    </TableRow></TableHeader><TableBody>
                      {ledgerData.rows?.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-400">No entries found</TableCell></TableRow>
                      ) : (
                        ledgerData.rows?.map((row: any, i: number) => (
                          <TableRow key={i} className="hover:bg-gray-50">
                            <TableCell className="text-sm">{row.date}</TableCell>
                            <TableCell className="font-medium text-purple-600">{row.voucherNo}</TableCell>
                            <TableCell className="text-sm">{row.narration}{row.description ? ` - ${row.description}` : ''}</TableCell>
                            <TableCell className="text-right text-emerald-600">{row.debit > 0 ? formatNPR(row.debit) : ''}</TableCell>
                            <TableCell className="text-right text-rose-600">{row.credit > 0 ? formatNPR(row.credit) : ''}</TableCell>
                            <TableCell className={`text-right font-medium ${row.balance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{formatNPR(Math.abs(row.balance))} {row.balance >= 0 ? 'Dr' : 'Cr'}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody></Table>
                  </div></CardContent></Card>
                </div>
              )}
              {!ledgerData && (
                <div className="text-center py-12 text-gray-400"><BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>Select an account to view ledger entries</p><p className="text-sm">खाता विवरण हेर्न खाता छान्नुहोस्</p></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== TRIAL BALANCE TAB ===== */}
        <TabsContent value="trial-balance" className="mt-4 space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Trial Balance / तल्ला परीक्षण</CardTitle>
                  <CardDescription>Verify total debits equal total credits</CardDescription>
                </div>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={fetchTrialBalance} disabled={trialBalanceLoading}>
                  {trialBalanceLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />} Generate
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {trialBalanceData && (
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                    <p className="text-sm text-gray-500">As of: {trialBalanceData.asOfDate}</p>
                    <Badge className={trialBalanceData.isBalanced ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}>
                      {trialBalanceData.isBalanced ? '✓ Balanced / सन्तुलित' : '✗ Not Balanced / असन्तुलित'}
                    </Badge>
                  </div>
                  <Card className="border shadow-none"><CardContent className="p-0"><div className="overflow-x-auto">
                    <Table><TableHeader><TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Account Code</TableHead>
                      <TableHead className="font-semibold">Account Name</TableHead>
                      <TableHead className="font-semibold hidden sm:table-cell">Type</TableHead>
                      <TableHead className="font-semibold text-right">Debit (NPR)</TableHead>
                      <TableHead className="font-semibold text-right">Credit (NPR)</TableHead>
                    </TableRow></TableHeader><TableBody>
                      {trialBalanceData.rows?.map((row: any, i: number) => (
                        <TableRow key={i} className="hover:bg-gray-50">
                          <TableCell className="font-mono text-sm">{row.code}</TableCell>
                          <TableCell><div>{row.name}</div>{row.nameNepali && <div className="text-xs text-gray-400">{row.nameNepali}</div>}</TableCell>
                          <TableCell className="hidden sm:table-cell"><Badge variant="outline" className={row.type === 'ASSET' ? 'border-emerald-300 text-emerald-700' : row.type === 'LIABILITY' ? 'border-rose-300 text-rose-700' : row.type === 'INCOME' ? 'border-blue-300 text-blue-700' : row.type === 'EXPENSE' ? 'border-amber-300 text-amber-700' : 'border-purple-300 text-purple-700'}>{row.type}</Badge></TableCell>
                          <TableCell className="text-right font-medium text-emerald-600">{row.debit > 0 ? formatNPR(row.debit) : ''}</TableCell>
                          <TableCell className="text-right font-medium text-rose-600">{row.credit > 0 ? formatNPR(row.credit) : ''}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-gray-100 font-bold">
                        <TableCell colSpan={3} className="text-right">Total / जम्मा</TableCell>
                        <TableCell className="text-right text-emerald-700">{formatNPR(trialBalanceData.totalDebit)}</TableCell>
                        <TableCell className="text-right text-rose-700">{formatNPR(trialBalanceData.totalCredit)}</TableCell>
                      </TableRow>
                    </TableBody></Table>
                  </div></CardContent></Card>
                </div>
              )}
              {!trialBalanceData && (
                <div className="text-center py-12 text-gray-400"><BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>Click Generate to create Trial Balance</p><p className="text-sm">तल्ला परीक्षण उत्पन्न गर्न बटन क्लिक गर्नुहोस्</p></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== DAY BOOK TAB ===== */}
        <TabsContent value="day-book" className="mt-4 space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Day Book / दैनिक पुस्तक</CardTitle>
                  <CardDescription>All entries for a specific date</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <BSDatePicker label="Date" value={dayBookDate} onChange={setDayBookDate} />
                  <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={fetchDayBook} disabled={dayBookLoading}>
                    {dayBookLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Eye className="w-4 h-4 mr-2" />} View
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {dayBookData && (
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                    <p className="text-sm text-gray-500">Date: {dayBookData.date} | {dayBookData.rows?.length || 0} entries</p>
                    <div className="text-right">
                      <span className="text-sm text-emerald-600 mr-4">Total Debit: {formatNPR(dayBookData.rows?.reduce((s: number, r: any) => s + r.totalDebit, 0) || 0)}</span>
                      <span className="text-sm text-rose-600">Total Credit: {formatNPR(dayBookData.rows?.reduce((s: number, r: any) => s + r.totalCredit, 0) || 0)}</span>
                    </div>
                  </div>
                  {dayBookData.rows?.length === 0 ? (
                    <div className="text-center py-8 text-gray-400"><FileText className="w-8 h-8 mx-auto mb-2 opacity-50" /><p>No entries for this date</p></div>
                  ) : (
                    dayBookData.rows?.map((row: any) => (
                      <Card key={row.id} className="border shadow-none">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedRow(expandedRow === row.id ? null : row.id)}>
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                row.entryType === 'PAYMENT' ? 'bg-rose-100 text-rose-600' :
                                row.entryType === 'RECEIPT' ? 'bg-emerald-100 text-emerald-600' :
                                row.entryType === 'CONTRA' ? 'bg-purple-100 text-purple-600' :
                                'bg-blue-100 text-blue-600'
                              }`}>
                                {row.entryType === 'PAYMENT' ? <ArrowUpRight className="w-4 h-4" /> :
                                 row.entryType === 'RECEIPT' ? <ArrowDownRight className="w-4 h-4" /> :
                                 row.entryType === 'CONTRA' ? <RefreshCw className="w-4 h-4" /> :
                                 <BookOpen className="w-4 h-4" />}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{row.voucherNo} - {row.narration}</p>
                                <p className="text-xs text-gray-500">{row.entryType} | {row.date}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge className={statusColor(row.status)}>{row.status}</Badge>
                              <span className="text-sm text-emerald-600">Dr: {formatNPR(row.totalDebit)}</span>
                              <span className="text-sm text-rose-600">Cr: {formatNPR(row.totalCredit)}</span>
                              {expandedRow === row.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                            </div>
                          </div>
                          {expandedRow === row.id && (
                            <div className="mt-3 pt-3 border-t">
                              <Table><TableHeader><TableRow className="bg-gray-50">
                                <TableHead className="font-semibold">Account</TableHead>
                                <TableHead className="font-semibold text-right">Debit</TableHead>
                                <TableHead className="font-semibold text-right">Credit</TableHead>
                                <TableHead className="font-semibold hidden sm:table-cell">Description</TableHead>
                              </TableRow></TableHeader><TableBody>
                                {row.items?.map((item: any, idx: number) => (
                                  <TableRow key={idx} className="hover:bg-gray-50">
                                    <TableCell>{item.accountCode} - {item.accountName}</TableCell>
                                    <TableCell className="text-right text-emerald-600">{item.debit > 0 ? formatNPR(item.debit) : ''}</TableCell>
                                    <TableCell className="text-right text-rose-600">{item.credit > 0 ? formatNPR(item.credit) : ''}</TableCell>
                                    <TableCell className="hidden sm:table-cell text-sm text-gray-500">{item.description || '—'}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody></Table>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}
              {!dayBookData && (
                <div className="text-center py-12 text-gray-400"><FileText className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>Select a date and click View to see day book</p><p className="text-sm">दैनिक पुस्तक हेर्न मिति छान्नुहोस्</p></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ===== NEW JOURNAL ENTRY / VOUCHER DIALOG ===== */}
      <Dialog open={newEntryOpen} onOpenChange={setNewEntryOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {entryForm.entryType === 'PAYMENT' ? 'Payment Voucher / भुक्तानी भौचर' :
               entryForm.entryType === 'RECEIPT' ? 'Receipt Voucher / प्राप्ति भौचर' :
               entryForm.entryType === 'CONTRA' ? 'Contra Voucher / कन्ट्रा भौचर' :
               'Journal Entry / जर्नल प्रविष्टि'}
            </DialogTitle>
            <DialogDescription>Create a new {entryForm.entryType.toLowerCase()} entry</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Voucher Type</Label>
                <Select value={entryForm.entryType} onValueChange={v => setEntryForm({...entryForm, entryType: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="JOURNAL">Journal (JV)</SelectItem>
                    <SelectItem value="PAYMENT">Payment (PV)</SelectItem>
                    <SelectItem value="RECEIPT">Receipt (RV)</SelectItem>
                    <SelectItem value="CONTRA">Contra (CV)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <BSDatePicker label="Date (BS)" value={entryForm.date} onChange={v => setEntryForm({...entryForm, date: v})} />
              <div className="space-y-2">
                <Label>Narration *</Label>
                <Input placeholder="Description of entry" value={entryForm.narration} onChange={e => setEntryForm({...entryForm, narration: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Narration (नेपाली)</Label>
              <Input placeholder="नेपालीमा विवरण" value={entryForm.narrationNep} onChange={e => setEntryForm({...entryForm, narrationNep: e.target.value})} />
            </div>

            {/* Line Items Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-semibold">Line Items / लाइन आइटम</Label>
                <Button variant="outline" size="sm" onClick={addItem}><Plus className="w-3 h-3 mr-1" /> Add Row</Button>
              </div>
              <Card className="border shadow-none"><CardContent className="p-0"><div className="overflow-x-auto">
                <Table><TableHeader><TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">Account</TableHead>
                  <TableHead className="font-semibold text-right">Debit (NPR)</TableHead>
                  <TableHead className="font-semibold text-right">Credit (NPR)</TableHead>
                  <TableHead className="font-semibold hidden sm:table-cell">Description</TableHead>
                  <TableHead className="font-semibold w-10"></TableHead>
                </TableRow></TableHeader><TableBody>
                  {entryForm.items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Select value={item.accountId} onValueChange={v => updateItem(idx, 'accountId', v)}>
                          <SelectTrigger className="w-48"><SelectValue placeholder="Select account" /></SelectTrigger>
                          <SelectContent>
                            {nonHeaderAccounts.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Input type="number" className="w-28 text-right" value={item.debit || ''} onChange={e => updateItem(idx, 'debit', parseFloat(e.target.value) || 0)} /></TableCell>
                      <TableCell><Input type="number" className="w-28 text-right" value={item.credit || ''} onChange={e => updateItem(idx, 'credit', parseFloat(e.target.value) || 0)} /></TableCell>
                      <TableCell className="hidden sm:table-cell"><Input className="w-40" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Details" /></TableCell>
                      <TableCell>
                        {entryForm.items.length > 2 && (
                          <Button variant="ghost" size="sm" className="text-red-500" onClick={() => removeItem(idx)}><Trash2 className="w-4 h-4" /></Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody></Table>
              </div></CardContent></Card>
            </div>

            {/* Totals */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex gap-6">
                <div><span className="text-sm text-gray-500">Total Debit: </span><span className="font-bold text-emerald-600">{formatNPR(totalDebit)}</span></div>
                <div><span className="text-sm text-gray-500">Total Credit: </span><span className="font-bold text-rose-600">{formatNPR(totalCredit)}</span></div>
              </div>
              <Badge className={isBalanced ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}>
                {isBalanced ? '✓ Balanced' : `✗ Difference: ${formatNPR(Math.abs(totalDebit - totalCredit))}`}
              </Badge>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewEntryOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSubmitEntry} disabled={saving || !isBalanced || !entryForm.narration || entryForm.items.some(i => !i.accountId)}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Submit Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================
// HR MODULE
// ============================================================
function HRModule({ data, onRefresh }: { data: DashboardData; onRefresh: () => void }) {
  const [tab, setTab] = useState('employees')
  const [addOpen, setAddOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const totalSalary = data.employees.reduce((s, e) => s + e.salary, 0)

  const handleAdd = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/hr', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (res.ok) { toast.success('Employee added! / कर्मचारी थपियो!'); setAddOpen(false); setForm({}); onRefresh() }
      else toast.error('Failed to add employee')
    } catch { toast.error('Network error') }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h2 className="text-2xl font-bold text-gray-900">HR & Payroll</h2><p className="text-gray-500 text-sm">मानव संसाधन तथा तलब व्यवस्थापन</p></div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild><Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-2" /> Add Employee</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add Employee / कर्मचारी थप्नुहोस्</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2"><Label>First Name *</Label><Input value={form.firstName||''} onChange={e=>setForm({...form,firstName:e.target.value})} /></div>
              <div className="space-y-2"><Label>Last Name *</Label><Input value={form.lastName||''} onChange={e=>setForm({...form,lastName:e.target.value})} /></div>
              <div className="space-y-2"><Label>Position</Label><Input value={form.position||''} onChange={e=>setForm({...form,position:e.target.value})} /></div>
              <div className="space-y-2"><Label>Department</Label><Input value={form.department||''} onChange={e=>setForm({...form,department:e.target.value})} /></div>
              <div className="space-y-2"><Label>Salary (NPR)</Label><Input type="number" value={form.salary||''} onChange={e=>setForm({...form,salary:e.target.value})} /></div>
              <div className="space-y-2"><Label>Phone</Label><Input value={form.phone||''} onChange={e=>setForm({...form,phone:e.target.value})} /></div>
              <div className="col-span-2"><BSDatePicker label="Join Date (BS)" value={form.joinDate||getTodayBS()} onChange={v=>setForm({...form,joinDate:v})} /></div>
            </div>
            <DialogFooter><Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleAdd} disabled={saving||!form.firstName}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Add</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-teal-600">{data.employees.length}</p><p className="text-xs text-gray-500">Employees</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-emerald-600">{data.employees.filter(e=>e.status==='ACTIVE').length}</p><p className="text-xs text-gray-500">Active</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">{formatNPR(totalSalary)}</p><p className="text-xs text-gray-500">Monthly Salary</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-purple-600">{new Set(data.employees.map(e=>e.department)).size}</p><p className="text-xs text-gray-500">Departments</p></CardContent></Card>
      </div>
      <Card className="border-0 shadow-sm"><CardContent className="p-0"><div className="overflow-x-auto">
        <Table><TableHeader><TableRow className="bg-gray-50">
          <TableHead className="font-semibold">Emp ID</TableHead><TableHead className="font-semibold">Name</TableHead>
          <TableHead className="font-semibold hidden sm:table-cell">Position</TableHead><TableHead className="font-semibold hidden md:table-cell">Department</TableHead>
          <TableHead className="font-semibold">Salary</TableHead><TableHead className="font-semibold">Status</TableHead>
        </TableRow></TableHeader><TableBody>
          {data.employees.map(emp => (
            <TableRow key={emp.id} className="hover:bg-gray-50">
              <TableCell className="font-medium text-teal-600">{emp.employeeId}</TableCell>
              <TableCell>{emp.firstName} {emp.lastName}</TableCell>
              <TableCell className="hidden sm:table-cell">{emp.position}</TableCell>
              <TableCell className="hidden md:table-cell">{emp.department}</TableCell>
              <TableCell>{formatNPR(emp.salary)}</TableCell>
              <TableCell><Badge className={statusColor(emp.status)}>{emp.status}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody></Table>
      </div></CardContent></Card>
    </div>
  )
}

// ============================================================
// INVENTORY MODULE
// ============================================================
function InventoryModule({ data, onRefresh }: { data: DashboardData; onRefresh: () => void }) {
  const totalValue = data.inventoryItems.reduce((s, i) => s + i.totalValue, 0)
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h2 className="text-2xl font-bold text-gray-900">Inventory</h2><p className="text-gray-500 text-sm">सूची व्यवस्थापन</p></div>
        <Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-2" /> Add Item</Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-orange-600">{data.inventoryItems.length}</p><p className="text-xs text-gray-500">Items</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-emerald-600">{formatNPR(totalValue)}</p><p className="text-xs text-gray-500">Total Value</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-red-600">{data.inventoryItems.filter(i=>i.quantity<=i.minStockLevel).length}</p><p className="text-xs text-gray-500">Low Stock</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">{new Set(data.inventoryItems.map(i=>i.category)).size}</p><p className="text-xs text-gray-500">Categories</p></CardContent></Card>
      </div>
      <Card className="border-0 shadow-sm"><CardContent className="p-0"><div className="overflow-x-auto">
        <Table><TableHeader><TableRow className="bg-gray-50">
          <TableHead className="font-semibold">Code</TableHead><TableHead className="font-semibold">Item</TableHead>
          <TableHead className="font-semibold hidden sm:table-cell">Category</TableHead><TableHead className="font-semibold">Qty</TableHead>
          <TableHead className="font-semibold hidden md:table-cell">Unit Price</TableHead><TableHead className="font-semibold">Value</TableHead>
          <TableHead className="font-semibold">Stock</TableHead>
        </TableRow></TableHeader><TableBody>
          {data.inventoryItems.map(item => (
            <TableRow key={item.id} className="hover:bg-gray-50">
              <TableCell className="font-medium text-orange-600">{item.code}</TableCell>
              <TableCell><div>{item.name}</div><div className="text-xs text-gray-400">{item.nameNepali}</div></TableCell>
              <TableCell className="hidden sm:table-cell">{item.category}</TableCell>
              <TableCell>{item.quantity} {item.unit}</TableCell>
              <TableCell className="hidden md:table-cell">{formatNPR(item.unitPrice)}</TableCell>
              <TableCell className="font-medium">{formatNPR(item.totalValue)}</TableCell>
              <TableCell><div className="flex items-center gap-2"><Progress value={(item.quantity/(item.minStockLevel*3))*100} className="w-16 h-2" /><span className={`text-xs ${item.quantity<=item.minStockLevel?'text-red-600 font-medium':'text-gray-500'}`}>{item.quantity<=item.minStockLevel?'Low':'OK'}</span></div></TableCell>
            </TableRow>
          ))}
        </TableBody></Table>
      </div></CardContent></Card>
    </div>
  )
}

// ============================================================
// ASSETS MODULE
// ============================================================
function AssetsModule({ data, onRefresh }: { data: DashboardData; onRefresh: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h2 className="text-2xl font-bold text-gray-900">Assets</h2><p className="text-gray-500 text-sm">सम्पत्ति व्यवस्थापन</p></div>
        <Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-2" /> Add Asset</Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-cyan-600">{data.assets.length}</p><p className="text-xs text-gray-500">Total Assets</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-emerald-600">{formatNPR(data.assets.reduce((s,a)=>s+a.currentValue,0))}</p><p className="text-xs text-gray-500">Current Value</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-amber-600">{formatNPR(data.assets.reduce((s,a)=>s+a.purchasePrice,0))}</p><p className="text-xs text-gray-500">Purchase Value</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-red-600">{formatNPR(data.assets.reduce((s,a)=>s+a.accumulatedDep,0))}</p><p className="text-xs text-gray-500">Depreciation</p></CardContent></Card>
      </div>
      <Card className="border-0 shadow-sm"><CardContent className="p-0"><div className="overflow-x-auto">
        <Table><TableHeader><TableRow className="bg-gray-50">
          <TableHead className="font-semibold">Code</TableHead><TableHead className="font-semibold">Name</TableHead>
          <TableHead className="font-semibold hidden sm:table-cell">Category</TableHead><TableHead className="font-semibold hidden md:table-cell">Purchase</TableHead>
          <TableHead className="font-semibold">Current</TableHead><TableHead className="font-semibold hidden md:table-cell">Dep. Rate</TableHead><TableHead className="font-semibold">Status</TableHead>
        </TableRow></TableHeader><TableBody>
          {data.assets.map(a => (
            <TableRow key={a.id} className="hover:bg-gray-50">
              <TableCell className="font-medium text-cyan-600">{a.code}</TableCell>
              <TableCell><div>{a.name}</div><div className="text-xs text-gray-400">{a.nameNepali}</div></TableCell>
              <TableCell className="hidden sm:table-cell"><Badge variant="outline">{a.category}</Badge></TableCell>
              <TableCell className="hidden md:table-cell">{formatNPR(a.purchasePrice)}</TableCell>
              <TableCell className="font-medium">{formatNPR(a.currentValue)}</TableCell>
              <TableCell className="hidden md:table-cell">{a.depreciationRate}%</TableCell>
              <TableCell><Badge className={statusColor(a.status)}>{a.status}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody></Table>
      </div></CardContent></Card>
    </div>
  )
}

// ============================================================
// SHARES MODULE
// ============================================================
function SharesModule({ data, onRefresh }: { data: DashboardData; onRefresh: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h2 className="text-2xl font-bold text-gray-900">Share Management</h2><p className="text-gray-500 text-sm">शेयर व्यवस्थापन</p></div>
        <Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-2" /> Issue Shares</Button>
      </div>
      <Card className="border-0 shadow-sm"><CardHeader><CardTitle className="text-base">Ordinary Share / साधारण शेयर</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div><p className="text-sm text-gray-500">Face Value</p><p className="text-lg font-bold">NPR 100</p></div>
          <div><p className="text-sm text-gray-500">Total</p><p className="text-lg font-bold">{toNepaliDigits(10000)}</p></div>
          <div><p className="text-sm text-gray-500">Issued</p><p className="text-lg font-bold text-emerald-600">{toNepaliDigits(3200)}</p></div>
          <div><p className="text-sm text-gray-500">Available</p><p className="text-lg font-bold text-amber-600">{toNepaliDigits(6800)}</p></div>
        </div>
        <Progress value={32} className="mt-4 h-3" /><p className="text-xs text-gray-500 mt-1">{toNepaliDigits(32)}% issued</p>
      </CardContent></Card>
      <Card className="border-0 shadow-sm"><CardContent className="p-0"><div className="overflow-x-auto">
        <Table><TableHeader><TableRow className="bg-gray-50">
          <TableHead className="font-semibold">Member</TableHead><TableHead className="font-semibold">Shares</TableHead>
          <TableHead className="font-semibold">Value</TableHead><TableHead className="font-semibold hidden sm:table-cell">Date</TableHead><TableHead className="font-semibold">Status</TableHead>
        </TableRow></TableHeader><TableBody>
          {data.shareHoldings.map(sh => (
            <TableRow key={sh.id} className="hover:bg-gray-50">
              <TableCell className="font-medium text-indigo-600">{sh.member ? `${sh.member.firstName} ${sh.member.lastName} (${sh.member.memberNo})` : '—'}</TableCell>
              <TableCell>{toNepaliDigits(sh.shareCount)}</TableCell>
              <TableCell className="font-medium">{formatNPR(sh.shareValue)}</TableCell>
              <TableCell className="hidden sm:table-cell">{formatBSDate(sh.purchaseDate).nep}</TableCell>
              <TableCell><Badge className={statusColor(sh.status)}>{sh.status}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody></Table>
      </div></CardContent></Card>
    </div>
  )
}

// ============================================================
// MEETINGS MODULE
// ============================================================
function MeetingsModule({ data, onRefresh }: { data: DashboardData; onRefresh: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h2 className="text-2xl font-bold text-gray-900">Meetings</h2><p className="text-gray-500 text-sm">बैठक व्यवस्थापन</p></div>
        <Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-2" /> Schedule Meeting</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.meetings.map(mt => (
          <Card key={mt.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div><CardTitle className="text-base">{mt.title}</CardTitle><CardDescription className="mt-1">{mt.titleNepali}</CardDescription></div>
                <Badge className={statusColor(mt.status)}>{mt.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600"><CalendarDays className="w-4 h-4" /><span>{formatBSDate(mt.date).nep} {mt.time}</span></div>
                <div className="flex items-center gap-2 text-sm text-gray-600"><Globe className="w-4 h-4" /><span>{mt.venue}</span></div>
                {mt.agenda && <div className="mt-3 p-3 bg-gray-50 rounded-lg"><p className="text-xs font-medium text-gray-700 mb-1">Agenda</p><p className="text-sm text-gray-600">{mt.agenda}</p></div>}
                {mt.decisions && <div className="mt-2 p-3 bg-emerald-50 rounded-lg"><p className="text-xs font-medium text-emerald-700 mb-1">Decisions</p><p className="text-sm text-emerald-600">{mt.decisions}</p></div>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// REPORTS MODULE (Enhanced - with new accounting reports)
// ============================================================
function ReportsModule({ data }: { data: DashboardData }) {
  const [reportData, setReportData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [accountingReportData, setAccountingReportData] = useState<any>(null)
  const [accountingLoading, setAccountingLoading] = useState(false)

  const generateReport = async (type: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports?type=${type}`)
      const d = await res.json()
      setReportData({ ...d, reportType: type })
      toast.success('Report generated! / प्रतिवेदन तयार भयो!')
    } catch { toast.error('Failed to generate report') }
    setLoading(false)
  }

  const generateNRBReport = async (type: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/nrb?type=${type}`)
      const d = await res.json()
      setReportData({ ...d, reportType: 'nrb-detail', nrbType: type })
      toast.success('NRB Report generated! / नरब प्रतिवेदन तयार भयो!')
    } catch { toast.error('Failed to generate NRB report') }
    setLoading(false)
  }

  const generateAccountingReport = async (type: string) => {
    setAccountingLoading(true)
    try {
      const res = await fetch(`/api/accounting/reports?type=${type}`)
      const d = await res.json()
      setAccountingReportData({ ...d, _reportType: type })
      toast.success('Accounting report generated! / लेखा प्रतिवेदन तयार भयो!')
    } catch { toast.error('Failed to generate accounting report') }
    setAccountingLoading(false)
  }

  const downloadReport = async (type: string) => {
    try {
      const res = await fetch(`/api/reports/nrb?type=${type}`)
      const data = await res.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `NRB-${type}-${getTodayBS()}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Report downloaded! / प्रतिवेदन डाउनलोड भयो!')
    } catch { toast.error('Download failed') }
  }

  const reports = [
    { name: 'Balance Sheet', nameNep: 'तल्ला पत्र', icon: FileText, color: 'bg-emerald-100 text-emerald-600', type: 'balance' },
    { name: 'Income Statement', nameNep: 'आम्दानी खर्च', icon: TrendingUp, color: 'bg-blue-100 text-blue-600', type: 'income' },
    { name: 'NRB Return', nameNep: 'नरब रिटर्न', icon: Shield, color: 'bg-red-100 text-red-600', type: 'nrb' },
    { name: 'Loan Portfolio', nameNep: 'ऋण पोर्टफोलियो', icon: HandCoins, color: 'bg-rose-100 text-rose-600', type: 'loan' },
    { name: 'Member Directory', nameNep: 'सदस्य निर्देशिका', icon: Users, color: 'bg-indigo-100 text-indigo-600', type: 'members' },
    { name: 'Cash Flow', nameNep: 'नगद प्रवाह', icon: DollarSign, color: 'bg-teal-100 text-teal-600', type: 'cashflow' },
    { name: 'Savings Report', nameNep: 'बचत प्रतिवेदन', icon: PiggyBank, color: 'bg-amber-100 text-amber-600', type: 'savings' },
    { name: 'Asset Register', nameNep: 'सम्पत्ति दर्ता', icon: Building2, color: 'bg-cyan-100 text-cyan-600', type: 'assets' },
    { name: 'HR Report', nameNep: 'मानव संसाधन', icon: UserCog, color: 'bg-orange-100 text-orange-600', type: 'hr' },
    { name: 'Audit Trail', nameNep: 'अडिट ट्रेल', icon: BookOpen, color: 'bg-slate-100 text-slate-600', type: 'audit' },
  ]

  // NEW: Accounting-specific reports
  const accountingReports = [
    { name: 'Trial Balance', nameNep: 'तल्ला परीक्षण', icon: BarChart3, color: 'bg-purple-100 text-purple-600', type: 'trial-balance' },
    { name: 'Day Book', nameNep: 'दैनिक पुस्तक', icon: FileText, color: 'bg-blue-100 text-blue-600', type: 'day-book' },
    { name: 'Ledger Report', nameNep: 'खाता विवरण', icon: BookOpen, color: 'bg-emerald-100 text-emerald-600', type: 'ledger' },
    { name: 'Cash Book', nameNep: 'नगद पुस्तक', icon: Banknote, color: 'bg-amber-100 text-amber-600', type: 'cash-book' },
    { name: 'Bank Book', nameNep: 'बैंक पुस्तक', icon: Building2, color: 'bg-cyan-100 text-cyan-600', type: 'bank-book' },
    { name: 'Voucher Report', nameNep: 'भौचर प्रतिवेदन', icon: Receipt, color: 'bg-rose-100 text-rose-600', type: 'voucher' },
  ]

  const nrbReports = [
    { name: 'Balance Sheet (NRB)', nameNep: 'निश्शेष जानकारी', icon: FileText, color: 'bg-red-100 text-red-600', type: 'balance-sheet' },
    { name: 'Income Statement (NRB)', nameNep: 'आय-व्यय जानकारी', icon: TrendingUp, color: 'bg-red-100 text-red-600', type: 'income-statement' },
    { name: 'NRB Quarterly Return', nameNep: 'नरब त्रैमासिक रिटर्न', icon: Shield, color: 'bg-red-100 text-red-600', type: 'nrb-return' },
    { name: 'Capital Adequacy', nameNep: 'पूँजी पर्याप्तता', icon: Shield, color: 'bg-red-100 text-red-600', type: 'capital-adequacy' },
    { name: 'Loan Portfolio (NRB)', nameNep: 'ऋण विवरण', icon: HandCoins, color: 'bg-red-100 text-red-600', type: 'loan-portfolio' },
    { name: 'Savings Report (NRB)', nameNep: 'बचत विवरण', icon: PiggyBank, color: 'bg-red-100 text-red-600', type: 'savings-report' },
    { name: 'Member Directory (NRB)', nameNep: 'सदस्य विवरण', icon: Users, color: 'bg-red-100 text-red-600', type: 'member-directory' },
    { name: 'Cash Flow (NRB)', nameNep: 'नगद प्रवाह विवरण', icon: DollarSign, color: 'bg-red-100 text-red-600', type: 'cash-flow' },
  ]

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold text-gray-900">Reports & Analytics</h2><p className="text-gray-500 text-sm">प्रतिवेदन र विश्लेषण</p></div>

      {/* General Reports */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {reports.map((r, i) => (
          <Card key={i} className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group" onClick={() => generateReport(r.type)}>
            <CardContent className="p-4">
              <div className={`w-10 h-10 rounded-lg ${r.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}><r.icon className="w-5 h-5" /></div>
              <h3 className="font-medium text-gray-900 text-sm">{r.name}</h3>
              <p className="text-xs text-gray-400">{r.nameNep}</p>
              <Button variant="ghost" size="sm" className="mt-2 text-xs h-7" disabled={loading}>
                {loading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Download className="w-3 h-3 mr-1" />} Generate
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Accounting Reports (NEW) */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-bold text-gray-900">Accounting Reports / लेखा प्रतिवेदन</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {accountingReports.map((r, i) => (
            <Card key={i} className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group" onClick={() => generateAccountingReport(r.type)}>
              <CardContent className="p-4">
                <div className={`w-10 h-10 rounded-lg ${r.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}><r.icon className="w-5 h-5" /></div>
                <h3 className="font-medium text-gray-900 text-sm">{r.name}</h3>
                <p className="text-xs text-gray-400">{r.nameNep}</p>
                <Button variant="ghost" size="sm" className="mt-2 text-xs h-7" disabled={accountingLoading}>
                  {accountingLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Eye className="w-3 h-3 mr-1" />} Generate
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Accounting Report Display */}
      {accountingReportData && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  {accountingReportData._reportType === 'trial-balance' ? 'Trial Balance / तल्ला परीक्षण' :
                   accountingReportData._reportType === 'day-book' ? 'Day Book / दैनिक पुस्तक' :
                   accountingReportData._reportType === 'cash-book' ? 'Cash Book / नगद पुस्तक' :
                   accountingReportData._reportType === 'bank-book' ? 'Bank Book / बैंक पुस्तक' :
                   accountingReportData._reportType === 'ledger' ? 'Ledger Report / खाता विवरण' :
                   'Voucher Report / भौचर प्रतिवेदन'}
                </CardTitle>
                <CardDescription>FY 2082/83 | Generated: {formatBSDate(getTodayBS()).nep}</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setAccountingReportData(null)}><X className="w-4 h-4" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Trial Balance */}
            {accountingReportData._reportType === 'trial-balance' && accountingReportData.rows && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-500">As of: {accountingReportData.asOfDate}</span>
                  <Badge className={accountingReportData.isBalanced ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}>
                    {accountingReportData.isBalanced ? '✓ Balanced' : '✗ Not Balanced'}
                  </Badge>
                </div>
                <Card className="border shadow-none"><CardContent className="p-0"><div className="overflow-x-auto">
                  <Table><TableHeader><TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Code</TableHead><TableHead className="font-semibold">Account Name</TableHead>
                    <TableHead className="font-semibold text-right">Debit</TableHead><TableHead className="font-semibold text-right">Credit</TableHead>
                  </TableRow></TableHeader><TableBody>
                    {accountingReportData.rows.map((row: any, i: number) => (
                      <TableRow key={i} className="hover:bg-gray-50">
                        <TableCell className="font-mono text-sm">{row.code}</TableCell>
                        <TableCell>{row.name}</TableCell>
                        <TableCell className="text-right text-emerald-600">{row.debit > 0 ? formatNPR(row.debit) : ''}</TableCell>
                        <TableCell className="text-right text-rose-600">{row.credit > 0 ? formatNPR(row.credit) : ''}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-gray-100 font-bold">
                      <TableCell colSpan={2} className="text-right">Total</TableCell>
                      <TableCell className="text-right text-emerald-700">{formatNPR(accountingReportData.totalDebit)}</TableCell>
                      <TableCell className="text-right text-rose-700">{formatNPR(accountingReportData.totalCredit)}</TableCell>
                    </TableRow>
                  </TableBody></Table>
                </div></CardContent></Card>
              </div>
            )}
            {/* Day Book */}
            {accountingReportData._reportType === 'day-book' && (
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg"><span className="text-sm text-gray-500">Date: {accountingReportData.date} | {accountingReportData.rows?.length || 0} entries</span></div>
                {accountingReportData.rows?.length === 0 ? (
                  <div className="text-center py-8 text-gray-400"><p>No entries for this date</p></div>
                ) : (
                  <Card className="border shadow-none"><CardContent className="p-0"><div className="overflow-x-auto">
                    <Table><TableHeader><TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Voucher</TableHead><TableHead className="font-semibold">Narration</TableHead>
                      <TableHead className="font-semibold">Type</TableHead><TableHead className="font-semibold text-right">Debit</TableHead>
                      <TableHead className="font-semibold text-right">Credit</TableHead><TableHead className="font-semibold">Status</TableHead>
                    </TableRow></TableHeader><TableBody>
                      {accountingReportData.rows.map((row: any, i: number) => (
                        <TableRow key={i} className="hover:bg-gray-50">
                          <TableCell className="font-medium text-purple-600">{row.voucherNo}</TableCell>
                          <TableCell className="max-w-xs truncate">{row.narration}</TableCell>
                          <TableCell><Badge variant="outline">{row.entryType}</Badge></TableCell>
                          <TableCell className="text-right text-emerald-600">{formatNPR(row.totalDebit)}</TableCell>
                          <TableCell className="text-right text-rose-600">{formatNPR(row.totalCredit)}</TableCell>
                          <TableCell><Badge className={statusColor(row.status)}>{row.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody></Table>
                  </div></CardContent></Card>
                )}
              </div>
            )}
            {/* Cash/Bank Book */}
            {(accountingReportData._reportType === 'cash-book' || accountingReportData._reportType === 'bank-book') && (
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                  <span className="text-sm text-gray-500">Account: {accountingReportData.accountName}</span>
                  <span className="text-sm font-medium">Closing Balance: <span className="text-emerald-600">{formatNPR(accountingReportData.closingBalance)}</span></span>
                </div>
                {accountingReportData.rows?.length === 0 ? (
                  <div className="text-center py-8 text-gray-400"><p>No entries found</p></div>
                ) : (
                  <Card className="border shadow-none"><CardContent className="p-0"><div className="overflow-x-auto">
                    <Table><TableHeader><TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Date</TableHead><TableHead className="font-semibold">Voucher</TableHead>
                      <TableHead className="font-semibold">Particulars</TableHead>
                      <TableHead className="font-semibold text-right">Debit</TableHead><TableHead className="font-semibold text-right">Credit</TableHead>
                      <TableHead className="font-semibold text-right">Balance</TableHead>
                    </TableRow></TableHeader><TableBody>
                      {accountingReportData.rows.map((row: any, i: number) => (
                        <TableRow key={i} className="hover:bg-gray-50">
                          <TableCell className="text-sm">{row.date}</TableCell>
                          <TableCell className="font-medium text-purple-600">{row.voucherNo}</TableCell>
                          <TableCell className="text-sm">{row.narration}</TableCell>
                          <TableCell className="text-right text-emerald-600">{row.debit > 0 ? formatNPR(row.debit) : ''}</TableCell>
                          <TableCell className="text-right text-rose-600">{row.credit > 0 ? formatNPR(row.credit) : ''}</TableCell>
                          <TableCell className="text-right font-medium">{formatNPR(row.balance)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody></Table>
                  </div></CardContent></Card>
                )}
              </div>
            )}
            {/* Ledger Report */}
            {accountingReportData._reportType === 'ledger' && (
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">{accountingReportData.account?.code} - {accountingReportData.account?.name}</span>
                    <span className="text-xs text-gray-500 ml-2">({accountingReportData.account?.type})</span>
                  </div>
                  <span className="text-sm font-medium">Closing: <span className="text-emerald-600">{formatNPR(Math.abs(accountingReportData.closingBalance))} {accountingReportData.closingBalance >= 0 ? 'Dr' : 'Cr'}</span></span>
                </div>
                {accountingReportData.rows?.length === 0 ? (
                  <div className="text-center py-8 text-gray-400"><p>No entries found</p></div>
                ) : (
                  <Card className="border shadow-none"><CardContent className="p-0"><div className="overflow-x-auto">
                    <Table><TableHeader><TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Date</TableHead><TableHead className="font-semibold">Voucher</TableHead>
                      <TableHead className="font-semibold">Particulars</TableHead>
                      <TableHead className="font-semibold text-right">Debit</TableHead><TableHead className="font-semibold text-right">Credit</TableHead>
                      <TableHead className="font-semibold text-right">Balance</TableHead>
                    </TableRow></TableHeader><TableBody>
                      {accountingReportData.rows.map((row: any, i: number) => (
                        <TableRow key={i} className="hover:bg-gray-50">
                          <TableCell className="text-sm">{row.date}</TableCell>
                          <TableCell className="font-medium text-purple-600">{row.voucherNo}</TableCell>
                          <TableCell className="text-sm">{row.narration}</TableCell>
                          <TableCell className="text-right text-emerald-600">{row.debit > 0 ? formatNPR(row.debit) : ''}</TableCell>
                          <TableCell className="text-right text-rose-600">{row.credit > 0 ? formatNPR(row.credit) : ''}</TableCell>
                          <TableCell className="text-right font-medium">{formatNPR(Math.abs(row.balance))} {row.balance >= 0 ? 'Dr' : 'Cr'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody></Table>
                  </div></CardContent></Card>
                )}
              </div>
            )}
            {/* Voucher Report (placeholder) */}
            {accountingReportData._reportType === 'voucher' && (
              <div className="text-center py-8 text-gray-400"><FileText className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>Voucher report - Navigate to Accounting module for detailed voucher view</p></div>
            )}
          </CardContent>
        </Card>
      )}

      {/* NRB Regulatory Reports Section */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-red-600" />
          <h3 className="text-lg font-bold text-gray-900">NRB Regulatory Reports / नेपाल राष्ट्र बैंक नियामक प्रतिवेदन</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {nrbReports.map((r, i) => (
            <Card key={i} className="border border-red-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group" onClick={() => generateNRBReport(r.type)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg ${r.color} flex items-center justify-center`}><r.icon className="w-4 h-4" /></div>
                  <div>
                    <h3 className="font-medium text-gray-900 text-sm">{r.name}</h3>
                    <p className="text-xs text-gray-400">{r.nameNep}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <Button variant="ghost" size="sm" className="text-xs h-7 flex-1" disabled={loading} onClick={(e) => { e.stopPropagation(); generateNRBReport(r.type) }}>
                    <Eye className="w-3 h-3 mr-1" /> View
                  </Button>
                  <Button variant="ghost" size="sm" className="text-xs h-7 flex-1" onClick={(e) => { e.stopPropagation(); downloadReport(r.type) }}>
                    <Download className="w-3 h-3 mr-1" /> Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* General Report Display */}
      {reportData && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  {reportData.reportType === 'nrb' ? 'NRB Regulatory Report / नरब नियामक प्रतिवेदन' :
                   reportData.reportType === 'balance' ? 'Balance Sheet / तल्ला पत्र' :
                   reportData.reportType === 'income' ? 'Income Statement / आम्दानी खर्च विवरण' :
                   reportData.reportType === 'cashflow' ? 'Cash Flow Statement / नगद प्रवाह विवरण' :
                   reportData.reportType === 'loan' ? 'Loan Portfolio Report / ऋण पोर्टफोलियो' :
                   reportData.reportType === 'savings' ? 'Savings Report / बचत प्रतिवेदन' :
                   reportData.reportType === 'hr' ? 'HR Report / मानव संसाधन प्रतिवेदन' :
                   reportData.reportType === 'audit' ? 'Audit Trail / अडिट ट्रेल' :
                   reportData.reportType === 'assets' ? 'Asset Register / सम्पत्ति दर्ता' :
                   reportData.reportType === 'members' ? 'Member Directory / सदस्य निर्देशिका' : 'Report'}
                </CardTitle>
                <CardDescription>FY 2082/83 | Generated: {formatBSDate(getTodayBS()).nep}</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setReportData(null)}><X className="w-4 h-4" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            {reportData.reportType === 'nrb' && reportData.nrbReturn && (
              <div className="space-y-6">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h3 className="font-semibold text-red-800 mb-1">Nepal Rastra Bank Regulatory Return</h3>
                  <p className="text-sm text-red-600">नेपाल राष्ट्र बैंक नियामक रिटर्न - {reportData.nrbReturn.institutionName}</p>
                  <p className="text-xs text-red-500 mt-1">PAN: {reportData.nrbReturn.panNo} | District: {reportData.nrbReturn.district} | Province: {reportData.nrbReturn.province}</p>
                </div>
                {[
                  { title: 'Capital Adequacy / पूँजी पर्याप्तता', data: reportData.nrbReturn.capitalAdequacy },
                  { title: 'Asset Quality / सम्पत्ति गुणस्तर', data: reportData.nrbReturn.assetQuality },
                  { title: 'Liquidity / तरलता', data: reportData.nrbReturn.liquidity },
                  { title: 'Earnings / आम्दानी', data: reportData.nrbReturn.earnings },
                  { title: 'Membership / सदस्यता', data: reportData.nrbReturn.membership },
                ].map((section, i) => (
                  <div key={i} className="border rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">{section.title}</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(section.data).map(([key, value]) => (
                        <div key={key} className="flex justify-between py-1.5 border-b border-gray-100">
                          <span className="text-sm text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                          <span className="text-sm font-medium">{typeof value === 'number' ? formatNPR(value) : String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {reportData.reportType === 'balance' && reportData.balanceSheet && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold text-emerald-700 mb-3">Assets / सम्पत्ति</h4>
                  {Object.entries(reportData.balanceSheet.assets).map(([k, v]) => (
                    <div key={k} className={`flex justify-between py-2 ${k === 'totalAssets' ? 'border-t-2 font-bold text-emerald-700' : 'border-b border-gray-100'}`}>
                      <span className="text-sm capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                      <span className="text-sm">{typeof v === 'number' ? formatNPR(v) : String(v)}</span>
                    </div>
                  ))}
                </div>
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold text-rose-700 mb-3">Liabilities & Equity / दायित्व</h4>
                  {Object.entries(reportData.balanceSheet.liabilities).map(([k, v]) => (
                    <div key={k} className={`flex justify-between py-2 ${k === 'totalLiabilities' ? 'border-t-2 font-bold text-rose-700' : 'border-b border-gray-100'}`}>
                      <span className="text-sm capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                      <span className="text-sm">{typeof v === 'number' ? formatNPR(v) : String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {reportData.reportType === 'income' && reportData.incomeStatement && (
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold text-blue-700 mb-3">Income / आम्दानी</h4>
                  {Object.entries(reportData.incomeStatement.income).map(([k, v]) => (
                    <div key={k} className={`flex justify-between py-2 ${k === 'totalIncome' ? 'border-t-2 font-bold text-blue-700' : 'border-b border-gray-100'}`}>
                      <span className="text-sm capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                      <span className="text-sm">{typeof v === 'number' ? formatNPR(v) : String(v)}</span>
                    </div>
                  ))}
                </div>
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold text-amber-700 mb-3">Expenses / खर्च</h4>
                  {Object.entries(reportData.incomeStatement.expenses).map(([k, v]) => (
                    <div key={k} className={`flex justify-between py-2 ${k === 'totalExpenses' ? 'border-t-2 font-bold text-amber-700' : 'border-b border-gray-100'}`}>
                      <span className="text-sm capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                      <span className="text-sm">{typeof v === 'number' ? formatNPR(v) : String(v)}</span>
                    </div>
                  ))}
                </div>
                <div className={`p-4 rounded-lg font-bold text-lg text-center ${reportData.incomeStatement.netIncome >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  Net Income: {formatNPR(reportData.incomeStatement.netIncome)}
                </div>
              </div>
            )}
            {reportData.reportType === 'cashflow' && reportData.cashFlow && (
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold text-emerald-700 mb-3">Inflows / नगद प्रवाह</h4>
                  {Object.entries(reportData.cashFlow.inflows).map(([k, v]) => (
                    <div key={k} className={`flex justify-between py-2 ${k === 'totalInflows' ? 'border-t-2 font-bold' : 'border-b border-gray-100'}`}>
                      <span className="text-sm capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                      <span className="text-sm">{typeof v === 'number' ? formatNPR(v) : String(v)}</span>
                    </div>
                  ))}
                </div>
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold text-rose-700 mb-3">Outflows / नगद बहिर्वाह</h4>
                  {Object.entries(reportData.cashFlow.outflows).map(([k, v]) => (
                    <div key={k} className={`flex justify-between py-2 ${k === 'totalOutflows' ? 'border-t-2 font-bold' : 'border-b border-gray-100'}`}>
                      <span className="text-sm capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                      <span className="text-sm">{typeof v === 'number' ? formatNPR(v) : String(v)}</span>
                    </div>
                  ))}
                </div>
                <div className={`p-4 rounded-lg font-bold text-lg text-center ${reportData.cashFlow.netCashFlow >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  Net Cash Flow: {formatNPR(reportData.cashFlow.netCashFlow)}
                </div>
              </div>
            )}
            {reportData.reportType === 'loan' && reportData.loanPortfolio && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Card className="border shadow-none"><CardContent className="p-3 text-center"><p className="text-lg font-bold text-rose-600">{formatNPR(reportData.loanPortfolio.totalDisbursed)}</p><p className="text-xs text-gray-500">Disbursed</p></CardContent></Card>
                  <Card className="border shadow-none"><CardContent className="p-3 text-center"><p className="text-lg font-bold text-amber-600">{formatNPR(reportData.loanPortfolio.totalOutstanding)}</p><p className="text-xs text-gray-500">Outstanding</p></CardContent></Card>
                  <Card className="border shadow-none"><CardContent className="p-3 text-center"><p className="text-lg font-bold text-emerald-600">{formatNPR(reportData.loanPortfolio.totalCollected)}</p><p className="text-xs text-gray-500">Collected</p></CardContent></Card>
                  <Card className="border shadow-none"><CardContent className="p-3 text-center"><p className="text-lg font-bold text-blue-600">{reportData.loanPortfolio.collectionRate}</p><p className="text-xs text-gray-500">Collection Rate</p></CardContent></Card>
                </div>
                {Object.entries(reportData.loanPortfolio.byProduct).map(([name, data]: [string, any]) => (
                  <div key={name} className="border rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">{name}</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div><span className="text-gray-500">Count:</span> <span className="font-medium">{data.count}</span></div>
                      <div><span className="text-gray-500">Amount:</span> <span className="font-medium">{formatNPR(data.amount)}</span></div>
                      <div><span className="text-gray-500">Outstanding:</span> <span className="font-medium">{formatNPR(data.outstanding)}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {reportData.reportType === 'members' && reportData.memberDirectory && (
              <Card className="border shadow-none"><CardContent className="p-0"><div className="overflow-x-auto">
                <Table><TableHeader><TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">No.</TableHead><TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="font-semibold hidden sm:table-cell">Phone</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">Savings</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">Loans</TableHead><TableHead className="font-semibold">Shares</TableHead>
                </TableRow></TableHeader><TableBody>
                  {reportData.memberDirectory.map((m: any, i: number) => (
                    <TableRow key={i} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{m.memberNo}</TableCell>
                      <TableCell><div>{m.name}</div>{m.nameNep && <div className="text-xs text-gray-400">{m.nameNep}</div>}</TableCell>
                      <TableCell className="hidden sm:table-cell">{m.phone}</TableCell>
                      <TableCell className="hidden md:table-cell">{formatNPR(m.savings)}</TableCell>
                      <TableCell className="hidden md:table-cell">{formatNPR(m.loans)}</TableCell>
                      <TableCell>{toNepaliDigits(m.shares)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody></Table>
              </div></CardContent></Card>
            )}
            {!['nrb', 'balance', 'income', 'cashflow', 'loan', 'members'].includes(reportData.reportType) && (
              <div className="text-center py-8 text-gray-400"><FileText className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>Report data generated. View in detail coming soon.</p></div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ============================================================
// SETTINGS MODULE
// ============================================================
function SettingsModule({ data }: { data: DashboardData }) {
  const [tab, setTab] = useState('organization')
  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold text-gray-900">Settings</h2><p className="text-gray-500 text-sm">सेटिङ र कन्फिगरेसन</p></div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="branches">Branches</TabsTrigger>
          <TabsTrigger value="fiscal">Fiscal Year</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>
        <TabsContent value="organization" className="mt-4">
          <Card className="border-0 shadow-sm"><CardHeader><CardTitle className="text-base">Organization Details</CardTitle><CardDescription>Manage your cooperative organization information</CardDescription></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Organization Name</Label><Input defaultValue="Janata Sahakari Sanstha Ltd." /></div>
              <div className="space-y-2"><Label>संस्थाको नाम</Label><Input defaultValue="जनता सहकारी संस्था लि." /></div>
              <div className="space-y-2"><Label>Code</Label><Input defaultValue="JSS-001" /></div>
              <div className="space-y-2"><Label>PAN No.</Label><Input defaultValue="301234567" /></div>
              <div className="space-y-2"><Label>Province</Label>
                <Select defaultValue="Bagmati"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['Koshi','Madhesh','Bagmati','Gandaki','Lumbini','Karnali','Sudurpashchim'].map(p=><SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-2"><Label>District</Label><Input defaultValue="Kathmandu" /></div>
            </div>
            <Button className="mt-6 bg-emerald-600 hover:bg-emerald-700">Save Changes</Button>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="fiscal" className="mt-4">
          <Card className="border-0 shadow-sm"><CardHeader><CardTitle className="text-base">Fiscal Year / आर्थिक वर्ष</CardTitle><CardDescription>Bikram Sambat fiscal year management</CardDescription></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <div><p className="font-medium text-emerald-800">Fiscal Year 2082/83</p><p className="text-sm text-emerald-600">बैशाख १ - चैत्र ३०</p></div>
                <Badge className="bg-emerald-100 text-emerald-800">Active</Badge>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div><p className="font-medium">Fiscal Year 2081/82</p><p className="text-sm text-gray-500">बैशाख १ - चैत्र ३०</p></div>
                <Badge className="bg-gray-100 text-gray-800">Closed</Badge>
              </div>
            </div>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="system" className="mt-4">
          <Card className="border-0 shadow-sm"><CardHeader><CardTitle className="text-base">System Information</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b"><span className="text-gray-500">Version</span><span className="font-medium">1.0.0</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-gray-500">Framework</span><span className="font-medium">Next.js 16</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-gray-500">Database</span><span className="font-medium">SQLite / Prisma</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-gray-500">Currency</span><span className="font-medium">NPR (Nepalese Rupee)</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-gray-500">Calendar</span><span className="font-medium">Bikram Sambat (BS)</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-gray-500">Compliance</span><span className="font-medium">Cooperative Act 2047 & NRB</span></div>
              <div className="flex justify-between py-2"><span className="text-gray-500">PWA</span><span className="font-medium text-emerald-600">Enabled</span></div>
            </div>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="branches" className="mt-4">
          <Card className="border-0 shadow-sm"><CardHeader><CardTitle className="text-base">Branches / शाखा</CardTitle></CardHeader>
          <CardContent><div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"><div><p className="font-medium">Main Branch - Putalisadak</p><p className="text-sm text-gray-500">BR-MAIN | Kathmandu</p></div><Badge className="bg-emerald-100 text-emerald-800">Active</Badge></div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"><div><p className="font-medium">West Branch - Kalanki</p><p className="text-sm text-gray-500">BR-WEST | Kathmandu</p></div><Badge className="bg-emerald-100 text-emerald-800">Active</Badge></div>
          </div></CardContent></Card>
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          <Card className="border-0 shadow-sm"><CardHeader><CardTitle className="text-base">Users / प्रयोगकर्ता</CardTitle></CardHeader>
          <CardContent><div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center"><span className="text-emerald-700 font-medium">RS</span></div>
            <div><p className="font-medium">Ram Bahadur Shrestha</p><p className="text-sm text-gray-500">admin@janatasahakari.org.np</p></div></div>
            <Badge className="bg-amber-100 text-amber-800">Admin</Badge>
          </div></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
