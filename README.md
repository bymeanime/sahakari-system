# सहकारी Sahakari System Management

A comprehensive cooperative banking management system built for Nepal, featuring multi-level organization hierarchy, double-entry accounting, and full Nepal-specific localization.

## 🏗️ Architecture

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **UI**: shadcn/ui + Tailwind CSS + Recharts
- **Auth**: NextAuth.js with JWT sessions
- **State**: Zustand
- **Mobile**: React Native (Expo)

## 📦 Modules

| Module | Description |
|--------|-------------|
| 📊 Dashboard | KPIs, charts, and overview |
| 👥 Members | Member management with Nepali details |
| 💰 Savings | Savings products, accounts, transactions |
| 🏦 Loans | Loan products, applications, repayments, EMI |
| 📒 Accounting | Double-entry bookkeeping, chart of accounts, journal entries |
| 🏢 HR | Employees, attendance, payroll, leave |
| 📦 Inventory | Stock management, transactions |
| 🏗️ Assets | Fixed assets, depreciation tracking |
| 📈 Shares | Share products, holdings, certificates |
| 📅 Meetings | AGM, board meetings, minutes |
| 📋 Reports | NRB regulatory reports, financial statements |
| ⚙️ Settings | Organization, branches, users |

## 🇳🇵 Nepal-Specific Features

- **Bikram Sambat** calendar integration
- **नेपाली** language support throughout
- **NPR** currency formatting
- **7 Provinces** hierarchy
- **Cooperative Act** compliance
- **PAN/VAT** support
- **NRB** regulatory report generation

## 🏛️ Organization Hierarchy

```
National → Provincial → District → Primary → Branch
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database

### Setup

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/sahakari-system.git
cd sahakari-system

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your DATABASE_URL and NEXTAUTH_SECRET

# Set up database
npx prisma migrate dev --name init
npx prisma db seed

# Run development server
npm run dev
```

### Default Login

- **Email**: admin@janatasahakari.org.np
- **Password**: admin123

## 📱 Mobile App

The React Native mobile app is in `/sahakari-mobile`:

```bash
cd sahakari-mobile
npm install
npx expo start
```

## 🚢 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect repo on [Vercel](https://vercel.com)
3. Add a Vercel Postgres database
4. Set environment variables:
   - `DATABASE_URL` (from Vercel Postgres)
   - `NEXTAUTH_SECRET` (generate with `openssl rand -base64 32`)
5. Deploy!

### Post-Deployment

```bash
# Run migrations
npx prisma migrate deploy

# Seed the database
npx prisma db seed
```

## 📄 License

This is a hobby project for educational purposes.
