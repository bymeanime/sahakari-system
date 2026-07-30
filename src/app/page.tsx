'use client'

import { useState, useEffect } from 'react'
import { useNavigationStore, type ModuleKey } from '@/store/navigation-store'
import {
  LayoutDashboard, Users, PiggyBank, HandCoins, BookOpen, UserCog,
  Package, Building2, Share2, CalendarDays, BarChart3, Settings,
  ChevronLeft, ChevronRight, Bell, Search, Menu, X, TrendingUp,
  TrendingDown, DollarSign, CreditCard, UsersRound, ArrowUpRight,
  ArrowDownRight, Eye, Plus, Filter, MoreHorizontal, CheckCircle2,
  Clock, AlertCircle, XCircle, FileText, Download, RefreshCw,
  Home, ChevronDown, Globe, Shield, LogOut, Moon, Sun
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
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts'

// ============================================================
// Types
// ============================================================
interface DashboardData {
  kpis: {
    totalMembers: number
    totalSavings: number
    totalLoansDisbursed: number
    totalOutstanding: number
    totalAssets: number
    totalShareCapital: number
    pendingLoans: number
    totalEmployees: number
    totalDeposits: number
    totalSalaryExpense: number
  }
  monthlyTrend: Array<{ month: string; savings: number; loans: number; income: number }>
  loanStatusDist: Array<{ name: string; value: number; color: string }>
  savingsByProduct: Array<{ name: string; total: number; count: number }>
  recentActivities: Array<{ type: string; description: string; time: string; icon: string }>
  members: Array<any>
  savingsAccounts: Array<any>
  loanApps: Array<any>
  employees: Array<any>
  assets: Array<any>
  inventoryItems: Array<any>
  shareHoldings: Array<any>
  meetings: Array<any>
  journalEntries: Array<any>
  accounts: Array<any>
}

// ============================================================
// Sidebar Navigation Config
// ============================================================
const navItems: Array<{ key: ModuleKey; label: string; labelNep: string; icon: any; color: string }> = [
  { key: 'dashboard', label: 'Dashboard', labelNep: 'ड्यासबोर्ड', icon: LayoutDashboard, color: 'text-emerald-600' },
  { key: 'members', label: 'Members', labelNep: 'सदस्य', icon: Users, color: 'text-blue-600' },
  { key: 'savings', label: 'Savings & Deposits', labelNep: 'बचत तथा निक्षेप', icon: PiggyBank, color: 'text-amber-600' },
  { key: 'loans', label: 'Loan Management', labelNep: 'ऋण व्यवस्थापन', icon: HandCoins, color: 'text-rose-600' },
  { key: 'accounting', label: 'Accounting', labelNep: 'लेखा', icon: BookOpen, color: 'text-purple-600' },
  { key: 'hr', label: 'HR & Payroll', labelNep: 'मानव संसाधन', icon: UserCog, color: 'text-teal-600' },
  { key: 'inventory', label: 'Inventory', labelNep: 'सूची', icon: Package, color: 'text-orange-600' },
  { key: 'assets', label: 'Assets', labelNep: 'सम्पत्ति', icon: Building2, color: 'text-cyan-600' },
  { key: 'shares', label: 'Share Management', labelNep: 'शेयर', icon: Share2, color: 'text-indigo-600' },
  { key: 'meetings', label: 'Meetings', labelNep: 'बैठक', icon: CalendarDays, color: 'text-pink-600' },
  { key: 'reports', label: 'Reports', labelNep: 'प्रतिवेदन', icon: BarChart3, color: 'text-slate-600' },
  { key: 'settings', label: 'Settings', labelNep: 'सेटिङ', icon: Settings, color: 'text-gray-600' },
]

// ============================================================
// Helper
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
// MAIN APP
// ============================================================
export default function SahakariApp() {
  const { activeModule, setActiveModule, sidebarOpen, setSidebarOpen } = useNavigationStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-200"></div>
            <div className="absolute inset-0 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin"></div>
          </div>
          <h2 className="text-2xl font-bold text-emerald-800">Sahakari System</h2>
          <p className="text-emerald-600 mt-2">सहकारी प्रणाली लोड हुँदैछ...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-red-800">Failed to load data</h2>
          <Button className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 flex flex-col transition-all duration-300 fixed h-full z-40 lg:relative ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
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

        {/* Navigation */}
        <ScrollArea className="flex-1 py-3">
          <nav className="space-y-1 px-2">
            {navItems.map(item => (
              <button
                key={item.key}
                onClick={() => { setActiveModule(item.key); setMobileMenuOpen(false) }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                  activeModule === item.key
                    ? 'bg-emerald-50 text-emerald-700 font-medium shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
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

        {/* Sidebar Toggle */}
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 text-sm transition-colors"
          >
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            {sidebarOpen && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Mobile Spacer - pushes content right on desktop when sidebar is relative */}
      <div className="hidden lg:block" />

      {/* Main Content */}
      <main className="flex-1 min-h-screen flex flex-col">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 flex items-center gap-4 sticky top-0 z-20">
          <button className="lg:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <Menu className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search members, accounts, loans..."
                className="pl-10 bg-gray-50 border-gray-200"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-lg hover:bg-gray-100">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-gray-200">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <span className="text-emerald-700 font-medium text-sm">RS</span>
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-900">Ram B. Shrestha</p>
                <p className="text-xs text-gray-500">Admin</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 lg:p-6 overflow-auto">
          {activeModule === 'dashboard' && <DashboardModule data={data} />}
          {activeModule === 'members' && <MembersModule data={data} />}
          {activeModule === 'savings' && <SavingsModule data={data} />}
          {activeModule === 'loans' && <LoansModule data={data} />}
          {activeModule === 'accounting' && <AccountingModule data={data} />}
          {activeModule === 'hr' && <HRModule data={data} />}
          {activeModule === 'inventory' && <InventoryModule data={data} />}
          {activeModule === 'assets' && <AssetsModule data={data} />}
          {activeModule === 'shares' && <SharesModule data={data} />}
          {activeModule === 'meetings' && <MeetingsModule data={data} />}
          {activeModule === 'reports' && <ReportsModule data={data} />}
          {activeModule === 'settings' && <SettingsModule data={data} />}
        </div>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 px-4 py-3 text-center">
          <p className="text-xs text-gray-500">
            Sahakari System v1.0 | Janata Sahakari Sanstha Ltd. | जनता सहकारी संस्था लि. | FY 2082/83
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
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-white/5 rounded-full translate-y-1/2"></div>
        <div className="relative z-10">
          <h2 className="text-2xl font-bold">Welcome to Janata Sahakari Sanstha</h2>
          <p className="text-emerald-100 mt-1">जनता सहकारी संस्था लि. - Putalisadak, Kathmandu</p>
          <div className="flex items-center gap-4 mt-4">
            <Badge className="bg-white/20 text-white border-0">Fiscal Year: 2082/83</Badge>
            <Badge className="bg-white/20 text-white border-0">Branch: Main Branch</Badge>
            <Badge className="bg-amber-400/30 text-amber-100 border-0">{kpis.pendingLoans} Pending Loans</Badge>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
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
                <div className={`p-2 rounded-lg bg-gradient-to-br ${kpi.color} bg-opacity-10`}>
                  <kpi.icon className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2">
                {kpi.up ? (
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-500" />
                )}
                <span className={`text-xs font-medium ${kpi.up ? 'text-emerald-600' : 'text-red-600'}`}>
                  {kpi.change}
                </span>
                <span className="text-xs text-gray-400">vs last month</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Monthly Trend</CardTitle>
            <CardDescription>Savings, Loans & Income over the past 6 months</CardDescription>
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

        {/* Loan Status Pie */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Loan Status</CardTitle>
            <CardDescription>Distribution of loan applications</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={loanStatusDist} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                  {loanStatusDist.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
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

      {/* Second Row: Savings by Product + Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Savings by Product */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Savings by Product</CardTitle>
            <CardDescription>Distribution of savings across products</CardDescription>
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

        {/* Recent Activities */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Activities</CardTitle>
            <CardDescription>Latest transactions and events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((act, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    act.icon === 'deposit' ? 'bg-emerald-100 text-emerald-600' :
                    act.icon === 'loan' ? 'bg-rose-100 text-rose-600' :
                    act.icon === 'member' ? 'bg-blue-100 text-blue-600' :
                    'bg-purple-100 text-purple-600'
                  }`}>
                    {act.icon === 'deposit' ? <PiggyBank className="w-4 h-4" /> :
                     act.icon === 'loan' ? <HandCoins className="w-4 h-4" /> :
                     act.icon === 'member' ? <Users className="w-4 h-4" /> :
                     <CalendarDays className="w-4 h-4" />}
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

      {/* Quick Access Module Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {navItems.slice(1, 6).map(item => (
          <Card
            key={item.key}
            className="cursor-pointer hover:shadow-md transition-all border-0 shadow-sm group"
            onClick={() => useNavigationStore.getState().setActiveModule(item.key)}
          >
            <CardContent className="p-4 text-center">
              <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center bg-gray-50 group-hover:scale-110 transition-transform ${item.color}`}>
                <item.icon className="w-6 h-6" />
              </div>
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
// MEMBERS MODULE
// ============================================================
function MembersModule({ data }: { data: DashboardData }) {
  const [view, setView] = useState<'list' | 'add'>('list')
  const [filter, setFilter] = useState('ALL')

  const filtered = data.members.filter(m => {
    if (filter !== 'ALL' && m.status !== filter) return false
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Member Management</h2>
          <p className="text-gray-500 text-sm">सदस्य व्यवस्थापन - {data.members.length} total members</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" /> Add Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Member / नयाँ सदस्य</DialogTitle>
              <DialogDescription>Register a new cooperative member</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
              <div className="space-y-2"><Label>First Name</Label><Input placeholder="Enter first name" /></div>
              <div className="space-y-2"><Label>Last Name</Label><Input placeholder="Enter last name" /></div>
              <div className="space-y-2"><Label>First Name (नेपाली)</Label><Input placeholder="पहिलो नाम" /></div>
              <div className="space-y-2"><Label>Last Name (नेपाली)</Label><Input placeholder="थर" /></div>
              <div className="space-y-2"><Label>Father&apos;s Name</Label><Input placeholder="बुबाको नाम" /></div>
              <div className="space-y-2"><Label>Grandfather&apos;s Name</Label><Input placeholder="बाजेको नाम" /></div>
              <div className="space-y-2"><Label>Gender</Label>
                <Select><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent><SelectItem value="MALE">Male</SelectItem><SelectItem value="FEMALE">Female</SelectItem><SelectItem value="OTHER">Other</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Phone</Label><Input placeholder="98XXXXXXXX" /></div>
              <div className="space-y-2"><Label>Citizenship No.</Label><Input placeholder="नागरिकता नम्बर" /></div>
              <div className="space-y-2"><Label>Occupation</Label><Input placeholder="पेशा" /></div>
              <div className="space-y-2"><Label>Province</Label>
                <Select><SelectTrigger><SelectValue placeholder="प्रदेश" /></SelectTrigger>
                  <SelectContent>
                    {['Koshi', 'Madhesh', 'Bagmati', 'Gandaki', 'Lumbini', 'Karnali', 'Sudurpashchim'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>District</Label><Input placeholder="जिल्ला" /></div>
              <div className="space-y-2"><Label>Municipality</Label><Input placeholder="नगरपालिका" /></div>
              <div className="space-y-2"><Label>Ward No.</Label><Input placeholder="वडा नम्बर" /></div>
              <div className="space-y-2"><Label>Member Type</Label>
                <Select><SelectTrigger><SelectValue placeholder="सदस्य प्रकार" /></SelectTrigger>
                  <SelectContent><SelectItem value="REGULAR">Regular</SelectItem><SelectItem value="ASSOCIATE">Associate</SelectItem><SelectItem value="HONORARY">Honorary</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Membership Date (BS)</Label><Input placeholder="YYYY-MM-DD" /></div>
            </div>
            <DialogFooter>
              <Button className="bg-emerald-600 hover:bg-emerald-700">Register Member</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">{data.members.length}</p><p className="text-xs text-gray-500">Total Members</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-emerald-600">{data.members.filter(m=>m.status==='ACTIVE').length}</p><p className="text-xs text-gray-500">Active</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-amber-600">{data.members.filter(m=>m.gender==='FEMALE').length}</p><p className="text-xs text-gray-500">Female Members</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-purple-600">{data.members.filter(m=>m.gender==='MALE').length}</p><p className="text-xs text-gray-500">Male Members</p></CardContent></Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {['ALL', 'ACTIVE', 'INACTIVE', 'SUSPENDED'].map(s => (
          <Button key={s} variant={filter === s ? 'default' : 'outline'} size="sm" onClick={() => setFilter(s)}
            className={filter === s ? 'bg-emerald-600 hover:bg-emerald-700' : ''}>
            {s}
          </Button>
        ))}
      </div>

      {/* Members Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">Member No.</TableHead>
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="font-semibold hidden sm:table-cell">Name (नेपाली)</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">Phone</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">Occupation</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(m => (
                  <TableRow key={m.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-emerald-600">{m.memberNo}</TableCell>
                    <TableCell>{m.firstName} {m.lastName}</TableCell>
                    <TableCell className="hidden sm:table-cell">{m.firstNameNep} {m.lastNameNep}</TableCell>
                    <TableCell className="hidden md:table-cell">{m.phone}</TableCell>
                    <TableCell className="hidden md:table-cell">{m.occupation}</TableCell>
                    <TableCell><Badge className={statusColor(m.status)}>{m.status}</Badge></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                    </TableCell>
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
// SAVINGS MODULE
// ============================================================
function SavingsModule({ data }: { data: DashboardData }) {
  const totalBalance = data.savingsAccounts.reduce((s, a) => s + a.balance, 0)
  const totalInterest = data.savingsAccounts.reduce((s, a) => s + a.interestEarned, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Savings & Deposits</h2>
          <p className="text-gray-500 text-sm">बचत तथा निक्षेप व्यवस्थापन</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-2" /> New Account</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-amber-600">{data.savingsAccounts.length}</p><p className="text-xs text-gray-500">Total Accounts</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-emerald-600">{formatNPR(totalBalance)}</p><p className="text-xs text-gray-500">Total Balance</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">{formatNPR(totalInterest)}</p><p className="text-xs text-gray-500">Interest Earned</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-purple-600">{data.savingsAccounts.filter(a=>a.status==='ACTIVE').length}</p><p className="text-xs text-gray-500">Active Accounts</p></CardContent></Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">Account No.</TableHead>
                  <TableHead className="font-semibold">Member</TableHead>
                  <TableHead className="font-semibold hidden sm:table-cell">Product</TableHead>
                  <TableHead className="font-semibold">Balance</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">Interest</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
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
                        <Button variant="ghost" size="sm" title="Deposit"><ArrowUpRight className="w-4 h-4 text-emerald-600" /></Button>
                        <Button variant="ghost" size="sm" title="Withdraw"><ArrowDownRight className="w-4 h-4 text-rose-600" /></Button>
                      </div>
                    </TableCell>
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
// LOANS MODULE
// ============================================================
function LoansModule({ data }: { data: DashboardData }) {
  const [tab, setTab] = useState('all')

  const filtered = data.loanApps.filter(l => {
    if (tab === 'all') return true
    if (tab === 'pending') return l.status === 'PENDING' || l.status === 'UNDER_REVIEW'
    if (tab === 'disbursed') return l.status === 'DISBURSED'
    if (tab === 'approved') return l.status === 'APPROVED'
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Loan Management</h2>
          <p className="text-gray-500 text-sm">ऋण व्यवस्थापन</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-2" /> New Application</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-rose-600">{data.loanApps.length}</p><p className="text-xs text-gray-500">Total Applications</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-emerald-600">{formatNPR(data.loanApps.filter(l=>l.status==='DISBURSED').reduce((s,l)=>s+(l.disbursedAmount||0),0))}</p><p className="text-xs text-gray-500">Disbursed</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-amber-600">{formatNPR(data.loanApps.filter(l=>l.status==='DISBURSED').reduce((s,l)=>s+(l.outstandingAmount||0),0))}</p><p className="text-xs text-gray-500">Outstanding</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">{data.loanApps.filter(l=>l.status==='PENDING'||l.status==='UNDER_REVIEW').length}</p><p className="text-xs text-gray-500">Pending Review</p></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="disbursed">Disbursed</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">App No.</TableHead>
                  <TableHead className="font-semibold">Member</TableHead>
                  <TableHead className="font-semibold hidden sm:table-cell">Product</TableHead>
                  <TableHead className="font-semibold">Amount</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">Term</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">Rate</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(la => (
                  <TableRow key={la.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-rose-600">{la.applicationNo}</TableCell>
                    <TableCell>{la.member ? `${la.member.firstName} ${la.member.lastName}` : '—'}</TableCell>
                    <TableCell className="hidden sm:table-cell">{la.product?.name || '—'}</TableCell>
                    <TableCell className="font-medium">{formatNPR(la.requestedAmount)}</TableCell>
                    <TableCell className="hidden md:table-cell">{la.term} months</TableCell>
                    <TableCell className="hidden md:table-cell">{la.interestRate ? `${la.interestRate}%` : '—'}</TableCell>
                    <TableCell><Badge className={statusColor(la.status)}>{la.status}</Badge></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                    </TableCell>
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
// ACCOUNTING MODULE
// ============================================================
function AccountingModule({ data }: { data: DashboardData }) {
  const [tab, setTab] = useState('journal')

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Accounting</h2>
          <p className="text-gray-500 text-sm">लेखा व्यवस्थापन - Double Entry System</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-2" /> New Entry</Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="journal">Journal Entries</TabsTrigger>
          <TabsTrigger value="chart">Chart of Accounts</TabsTrigger>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="journal" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Voucher No.</TableHead>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Narration</TableHead>
                      <TableHead className="font-semibold">Type</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.journalEntries.map(je => (
                      <TableRow key={je.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium text-purple-600">{je.voucherNo}</TableCell>
                        <TableCell>{je.date}</TableCell>
                        <TableCell className="max-w-xs truncate">{je.narration}</TableCell>
                        <TableCell><Badge variant="outline">{je.entryType}</Badge></TableCell>
                        <TableCell><Badge className={statusColor(je.status)}>{je.status}</Badge></TableCell>
                        <TableCell><Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chart" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Code</TableHead>
                      <TableHead className="font-semibold">Account Name</TableHead>
                      <TableHead className="font-semibold hidden sm:table-cell">नेपाली</TableHead>
                      <TableHead className="font-semibold">Type</TableHead>
                      <TableHead className="font-semibold hidden md:table-cell">Sub-Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.accounts.map(acct => (
                      <TableRow key={acct.id} className="hover:bg-gray-50">
                        <TableCell className="font-mono text-sm">{acct.code}</TableCell>
                        <TableCell className={acct.subType === 'HEADER' ? 'font-semibold' : ''}>{acct.name}</TableCell>
                        <TableCell className="hidden sm:table-cell">{acct.nameNepali}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            acct.type === 'ASSET' ? 'border-emerald-300 text-emerald-700' :
                            acct.type === 'LIABILITY' ? 'border-rose-300 text-rose-700' :
                            acct.type === 'INCOME' ? 'border-blue-300 text-blue-700' :
                            acct.type === 'EXPENSE' ? 'border-amber-300 text-amber-700' :
                            'border-purple-300 text-purple-700'
                          }>{acct.type}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{acct.subType}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">General Ledger</CardTitle>
              <CardDescription>Select an account to view its ledger entries</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                <Select>
                  <SelectTrigger className="w-64"><SelectValue placeholder="Select Account" /></SelectTrigger>
                  <SelectContent>
                    {data.accounts.filter(a => a.subType !== 'HEADER').map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-center py-12 text-gray-400">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Select an account to view ledger entries</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================================
// HR MODULE
// ============================================================
function HRModule({ data }: { data: DashboardData }) {
  const [tab, setTab] = useState('employees')
  const totalSalary = data.employees.reduce((s, e) => s + e.salary, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">HR & Payroll</h2>
          <p className="text-gray-500 text-sm">मानव संसाधन तथा तलब व्यवस्थापन</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-2" /> Add Employee</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-teal-600">{data.employees.length}</p><p className="text-xs text-gray-500">Total Employees</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-emerald-600">{data.employees.filter(e=>e.status==='ACTIVE').length}</p><p className="text-xs text-gray-500">Active</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">{formatNPR(totalSalary)}</p><p className="text-xs text-gray-500">Monthly Salary</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-purple-600">{new Set(data.employees.map(e=>e.department)).size}</p><p className="text-xs text-gray-500">Departments</p></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="leaves">Leave Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Emp ID</TableHead>
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold hidden sm:table-cell">Position</TableHead>
                      <TableHead className="font-semibold hidden md:table-cell">Department</TableHead>
                      <TableHead className="font-semibold">Salary</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
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
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Attendance Tracking</CardTitle>
              <CardDescription>Track daily employee attendance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-400">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Attendance module - mark and track daily attendance</p>
                <Button className="mt-4" variant="outline"><Plus className="w-4 h-4 mr-2" /> Mark Attendance</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Payroll Processing</CardTitle>
              <CardDescription>Process monthly salary with PF, CIT, and tax deductions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-400">
                <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Generate payroll for the current month</p>
                <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700"><FileText className="w-4 h-4 mr-2" /> Process Payroll</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaves" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Leave Management</CardTitle>
              <CardDescription>Manage employee leave requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-400">
                <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No pending leave requests</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================================
// INVENTORY MODULE
// ============================================================
function InventoryModule({ data }: { data: DashboardData }) {
  const totalValue = data.inventoryItems.reduce((s, i) => s + i.totalValue, 0)
  const lowStock = data.inventoryItems.filter(i => i.quantity <= i.minStockLevel)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inventory Management</h2>
          <p className="text-gray-500 text-sm">सूची व्यवस्थापन</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-2" /> Add Item</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-orange-600">{data.inventoryItems.length}</p><p className="text-xs text-gray-500">Total Items</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-emerald-600">{formatNPR(totalValue)}</p><p className="text-xs text-gray-500">Total Value</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-red-600">{lowStock.length}</p><p className="text-xs text-gray-500">Low Stock</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">{new Set(data.inventoryItems.map(i=>i.category)).size}</p><p className="text-xs text-gray-500">Categories</p></CardContent></Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">Code</TableHead>
                  <TableHead className="font-semibold">Item</TableHead>
                  <TableHead className="font-semibold hidden sm:table-cell">Category</TableHead>
                  <TableHead className="font-semibold">Qty</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">Unit Price</TableHead>
                  <TableHead className="font-semibold">Value</TableHead>
                  <TableHead className="font-semibold">Stock Level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.inventoryItems.map(item => (
                  <TableRow key={item.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-orange-600">{item.code}</TableCell>
                    <TableCell><div>{item.name}</div><div className="text-xs text-gray-400">{item.nameNepali}</div></TableCell>
                    <TableCell className="hidden sm:table-cell">{item.category}</TableCell>
                    <TableCell>{item.quantity} {item.unit}</TableCell>
                    <TableCell className="hidden md:table-cell">{formatNPR(item.unitPrice)}</TableCell>
                    <TableCell className="font-medium">{formatNPR(item.totalValue)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={(item.quantity / (item.minStockLevel * 3)) * 100} className="w-16 h-2" />
                        <span className={`text-xs ${item.quantity <= item.minStockLevel ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                          {item.quantity <= item.minStockLevel ? 'Low' : 'OK'}
                        </span>
                      </div>
                    </TableCell>
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
// ASSETS MODULE
// ============================================================
function AssetsModule({ data }: { data: DashboardData }) {
  const totalPurchase = data.assets.reduce((s, a) => s + a.purchasePrice, 0)
  const totalCurrent = data.assets.reduce((s, a) => s + a.currentValue, 0)
  const totalDep = data.assets.reduce((s, a) => s + a.accumulatedDep, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Asset Management</h2>
          <p className="text-gray-500 text-sm">सम्पत्ति व्यवस्थापन</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-2" /> Add Asset</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-cyan-600">{data.assets.length}</p><p className="text-xs text-gray-500">Total Assets</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-emerald-600">{formatNPR(totalCurrent)}</p><p className="text-xs text-gray-500">Current Value</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-amber-600">{formatNPR(totalPurchase)}</p><p className="text-xs text-gray-500">Purchase Value</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-red-600">{formatNPR(totalDep)}</p><p className="text-xs text-gray-500">Total Depreciation</p></CardContent></Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">Code</TableHead>
                  <TableHead className="font-semibold">Asset Name</TableHead>
                  <TableHead className="font-semibold hidden sm:table-cell">Category</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">Purchase Price</TableHead>
                  <TableHead className="font-semibold">Current Value</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">Dep. Rate</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.assets.map(asset => (
                  <TableRow key={asset.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-cyan-600">{asset.code}</TableCell>
                    <TableCell><div>{asset.name}</div><div className="text-xs text-gray-400">{asset.nameNepali}</div></TableCell>
                    <TableCell className="hidden sm:table-cell"><Badge variant="outline">{asset.category}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell">{formatNPR(asset.purchasePrice)}</TableCell>
                    <TableCell className="font-medium">{formatNPR(asset.currentValue)}</TableCell>
                    <TableCell className="hidden md:table-cell">{asset.depreciationRate}%</TableCell>
                    <TableCell><Badge className={statusColor(asset.status)}>{asset.status}</Badge></TableCell>
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
// SHARES MODULE
// ============================================================
function SharesModule({ data }: { data: DashboardData }) {
  const totalShares = data.shareHoldings.reduce((s, sh) => s + sh.shareCount, 0)
  const totalValue = data.shareHoldings.reduce((s, sh) => s + sh.shareValue, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Share Management</h2>
          <p className="text-gray-500 text-sm">शेयर व्यवस्थापन</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-2" /> Issue Shares</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-indigo-600">{totalShares}</p><p className="text-xs text-gray-500">Issued Shares</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-emerald-600">{formatNPR(totalValue)}</p><p className="text-xs text-gray-500">Share Capital</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">{data.shareHoldings.length}</p><p className="text-xs text-gray-500">Shareholders</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-amber-600">6,800</p><p className="text-xs text-gray-500">Available</p></CardContent></Card>
      </div>

      {/* Share Product Info */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Share Product - Ordinary Share / साधारण शेयर</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div><p className="text-sm text-gray-500">Face Value</p><p className="text-lg font-bold">NPR 100</p></div>
            <div><p className="text-sm text-gray-500">Total Shares</p><p className="text-lg font-bold">10,000</p></div>
            <div><p className="text-sm text-gray-500">Issued</p><p className="text-lg font-bold text-emerald-600">3,200</p></div>
            <div><p className="text-sm text-gray-500">Available</p><p className="text-lg font-bold text-amber-600">6,800</p></div>
          </div>
          <Progress value={32} className="mt-4 h-3" />
          <p className="text-xs text-gray-500 mt-1">32% of total shares issued</p>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">Member</TableHead>
                  <TableHead className="font-semibold">Share Count</TableHead>
                  <TableHead className="font-semibold">Share Value</TableHead>
                  <TableHead className="font-semibold hidden sm:table-cell">Purchase Date</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.shareHoldings.map(sh => (
                  <TableRow key={sh.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-indigo-600">{sh.member ? `${sh.member.firstName} ${sh.member.lastName} (${sh.member.memberNo})` : '—'}</TableCell>
                    <TableCell>{sh.shareCount}</TableCell>
                    <TableCell className="font-medium">{formatNPR(sh.shareValue)}</TableCell>
                    <TableCell className="hidden sm:table-cell">{sh.purchaseDate}</TableCell>
                    <TableCell><Badge className={statusColor(sh.status)}>{sh.status}</Badge></TableCell>
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
// MEETINGS MODULE
// ============================================================
function MeetingsModule({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Meeting Management</h2>
          <p className="text-gray-500 text-sm">बैठक व्यवस्थापन</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-2" /> Schedule Meeting</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.meetings.map(mt => (
          <Card key={mt.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{mt.title}</CardTitle>
                  <CardDescription className="mt-1">{mt.titleNepali}</CardDescription>
                </div>
                <Badge className={statusColor(mt.status)}>{mt.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CalendarDays className="w-4 h-4" /><span>{mt.date} {mt.time}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Globe className="w-4 h-4" /><span>{mt.venue}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Shield className="w-4 h-4" /><span>{mt.type}</span>
                </div>
                {mt.agenda && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs font-medium text-gray-700 mb-1">Agenda</p>
                    <p className="text-sm text-gray-600">{mt.agenda}</p>
                  </div>
                )}
                {mt.decisions && (
                  <div className="mt-2 p-3 bg-emerald-50 rounded-lg">
                    <p className="text-xs font-medium text-emerald-700 mb-1">Decisions</p>
                    <p className="text-sm text-emerald-600">{mt.decisions}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// REPORTS MODULE
// ============================================================
function ReportsModule({ data }: { data: DashboardData }) {
  const reports = [
    { name: 'Balance Sheet', nameNep: 'तल्ला पत्र', icon: FileText, description: 'Assets, liabilities, and equity statement', color: 'bg-emerald-100 text-emerald-600' },
    { name: 'Income Statement', nameNep: 'आम्दानी खर्च विवरण', icon: TrendingUp, description: 'Revenue and expenses for the period', color: 'bg-blue-100 text-blue-600' },
    { name: 'Savings Report', nameNep: 'बचत प्रतिवेदन', icon: PiggyBank, description: 'Detailed savings account summary', color: 'bg-amber-100 text-amber-600' },
    { name: 'Loan Portfolio', nameNep: 'ऋण पोर्टफोलियो', icon: HandCoins, description: 'Loan disbursement and collection report', color: 'bg-rose-100 text-rose-600' },
    { name: 'Member Directory', nameNep: 'सदस्य निर्देशिका', icon: Users, description: 'Complete member listing with details', color: 'bg-indigo-100 text-indigo-600' },
    { name: 'Cash Flow', nameNep: 'नगद प्रवाह', icon: DollarSign, description: 'Cash inflow and outflow statement', color: 'bg-teal-100 text-teal-600' },
    { name: 'Share Report', nameNep: 'शेयर प्रतिवेदन', icon: Share2, description: 'Share issuance and holding report', color: 'bg-purple-100 text-purple-600' },
    { name: 'Asset Register', nameNep: 'सम्पत्ति दर्ता', icon: Building2, description: 'Fixed asset register with depreciation', color: 'bg-cyan-100 text-cyan-600' },
    { name: 'HR Report', nameNep: 'मानव संसाधन प्रतिवेदन', icon: UserCog, description: 'Employee and payroll summary', color: 'bg-orange-100 text-orange-600' },
    { name: 'Meeting Minutes', nameNep: 'बैठक मिनेट', icon: CalendarDays, description: 'Record of all meeting minutes', color: 'bg-pink-100 text-pink-600' },
    { name: 'NRB Return', nameNep: 'नरब रिटर्न', icon: Shield, description: 'Nepal Rastra Bank regulatory report', color: 'bg-red-100 text-red-600' },
    { name: 'Audit Trail', nameNep: 'अडिट ट्रेल', icon: BookOpen, description: 'System audit and activity log', color: 'bg-slate-100 text-slate-600' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Reports & Analytics</h2>
        <p className="text-gray-500 text-sm">प्रतिवेदन र विश्लेषण</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <CardContent className="p-4 text-center"><p className="text-2xl font-bold">{formatNPR(data.kpis.totalSavings)}</p><p className="text-xs text-emerald-100">Total Deposits</p></CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-rose-500 to-rose-600 text-white">
          <CardContent className="p-4 text-center"><p className="text-2xl font-bold">{formatNPR(data.kpis.totalOutstanding)}</p><p className="text-xs text-rose-100">Loan Outstanding</p></CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4 text-center"><p className="text-2xl font-bold">{data.kpis.totalMembers}</p><p className="text-xs text-blue-100">Active Members</p></CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <CardContent className="p-4 text-center"><p className="text-2xl font-bold">{formatNPR(data.kpis.totalShareCapital)}</p><p className="text-xs text-amber-100">Share Capital</p></CardContent>
        </Card>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {reports.map((r, i) => (
          <Card key={i} className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
            <CardContent className="p-4">
              <div className={`w-10 h-10 rounded-lg ${r.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <r.icon className="w-5 h-5" />
              </div>
              <h3 className="font-medium text-gray-900">{r.name}</h3>
              <p className="text-xs text-gray-400">{r.nameNep}</p>
              <p className="text-xs text-gray-500 mt-1">{r.description}</p>
              <Button variant="ghost" size="sm" className="mt-3 text-xs"><Download className="w-3 h-3 mr-1" /> Generate</Button>
            </CardContent>
          </Card>
        ))}
      </div>
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
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings & Configuration</h2>
        <p className="text-gray-500 text-sm">सेटिङ र कन्फिगरेसन</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="branches">Branches</TabsTrigger>
          <TabsTrigger value="fiscal">Fiscal Year</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="organization" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Organization Details</CardTitle>
              <CardDescription>Manage your cooperative organization information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Organization Name</Label><Input defaultValue="Janata Sahakari Sanstha Ltd." /></div>
                <div className="space-y-2"><Label>संस्थाको नाम</Label><Input defaultValue="जनता सहकारी संस्था लि." /></div>
                <div className="space-y-2"><Label>Code</Label><Input defaultValue="JSS-001" /></div>
                <div className="space-y-2"><Label>Registration No.</Label><Input defaultValue="REG-2080-1234" /></div>
                <div className="space-y-2"><Label>PAN No.</Label><Input defaultValue="301234567" /></div>
                <div className="space-y-2"><Label>Phone</Label><Input defaultValue="01-4234567" /></div>
                <div className="space-y-2"><Label>Email</Label><Input defaultValue="info@janatasahakari.org.np" /></div>
                <div className="space-y-2"><Label>Province</Label>
                  <Select defaultValue="Bagmati"><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['Koshi', 'Madhesh', 'Bagmati', 'Gandaki', 'Lumbini', 'Karnali', 'Sudurpashchim'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>District</Label><Input defaultValue="Kathmandu" /></div>
                <div className="space-y-2"><Label>Municipality</Label><Input defaultValue="Kathmandu Metropolitan City" /></div>
                <div className="space-y-2"><Label>Ward No.</Label><Input defaultValue="5" /></div>
                <div className="space-y-2"><Label>Level</Label>
                  <Select defaultValue="PRIMARY"><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NATIONAL">National Federation</SelectItem>
                      <SelectItem value="PROVINCIAL">Provincial</SelectItem>
                      <SelectItem value="DISTRICT">District Union</SelectItem>
                      <SelectItem value="PRIMARY">Primary Cooperative</SelectItem>
                      <SelectItem value="BRANCH">Branch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="mt-6 bg-emerald-600 hover:bg-emerald-700">Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branches" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Branch Management</CardTitle>
                  <CardDescription>Manage cooperative branches</CardDescription>
                </div>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1" /> Add Branch</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Main Branch - Putalisadak</p>
                    <p className="text-sm text-gray-500">Code: BR-MAIN | District: Kathmandu</p>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-800">Active</Badge>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">West Branch - Kalanki</p>
                    <p className="text-sm text-gray-500">Code: BR-WEST | District: Kathmandu</p>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-800">Active</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fiscal" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Fiscal Year Management</CardTitle>
              <CardDescription>Manage fiscal years (आर्थिक वर्ष) as per Nepali calendar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div>
                    <p className="font-medium text-emerald-800">Fiscal Year 2082/83</p>
                    <p className="text-sm text-emerald-600">Baisakh 1 - Chaitra 30</p>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-800">Active</Badge>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Fiscal Year 2081/82</p>
                    <p className="text-sm text-gray-500">Baisakh 1 - Chaitra 30</p>
                  </div>
                  <Badge className="bg-gray-100 text-gray-800">Closed</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">User Management</CardTitle>
              <CardDescription>Manage system users and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center"><span className="text-emerald-700 font-medium">RS</span></div>
                    <div>
                      <p className="font-medium">Ram Bahadur Shrestha</p>
                      <p className="text-sm text-gray-500">admin@janatasahakari.org.np</p>
                    </div>
                  </div>
                  <Badge className="bg-amber-100 text-amber-800">Admin</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">System Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b"><span className="text-gray-500">Version</span><span className="font-medium">1.0.0</span></div>
                <div className="flex justify-between py-2 border-b"><span className="text-gray-500">Database</span><span className="font-medium">SQLite</span></div>
                <div className="flex justify-between py-2 border-b"><span className="text-gray-500">Framework</span><span className="font-medium">Next.js 16</span></div>
                <div className="flex justify-between py-2 border-b"><span className="text-gray-500">Currency</span><span className="font-medium">NPR (Nepalese Rupee)</span></div>
                <div className="flex justify-between py-2 border-b"><span className="text-gray-500">Calendar</span><span className="font-medium">Bikram Sambat (BS)</span></div>
                <div className="flex justify-between py-2"><span className="text-gray-500">Compliance</span><span className="font-medium">Cooperative Act 2047 & NRB Guidelines</span></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
