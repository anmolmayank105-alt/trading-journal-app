# Part 9: Frontend UI/UX Design

**Date**: November 29, 2025  
**Status**: ✅ Complete  
**Version**: 1.0.0

---

## Overview

Complete frontend design for the Trading Analytics Web Application covering all pages, components, layouts, API integrations, and responsive design rules.

### Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI Library**: Material-UI (MUI) v5
- **State Management**: Redux Toolkit + RTK Query
- **Charts**: Recharts (primary) + TradingView Lightweight Charts (candlesticks)
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **WebSocket**: Socket.IO Client

### Design System

**Color Palette**:
```
Primary:     #1976D2 (Blue)
Secondary:   #9C27B0 (Purple)
Success:     #2E7D32 (Green) - Profit/Win
Error:       #D32F2F (Red) - Loss
Warning:     #ED6C02 (Orange)
Info:        #0288D1 (Light Blue)
Background:  #F5F5F5 (Light) / #121212 (Dark)
Surface:     #FFFFFF (Light) / #1E1E1E (Dark)
```

**Typography**:
```
Font Family: 'Inter', 'Roboto', sans-serif
H1: 2.5rem (40px) - Page titles
H2: 2rem (32px) - Section headers
H3: 1.5rem (24px) - Card titles
H4: 1.25rem (20px) - Subsections
Body1: 1rem (16px) - Primary text
Body2: 0.875rem (14px) - Secondary text
Caption: 0.75rem (12px) - Labels, timestamps
```

**Spacing**: 8px grid system (8, 16, 24, 32, 48, 64)

**Breakpoints**:
```
xs: 0px      - Mobile portrait
sm: 600px    - Mobile landscape / Small tablet
md: 900px    - Tablet
lg: 1200px   - Desktop
xl: 1536px   - Large desktop
```

---

## Project Structure

```
frontend/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   ├── reset-password/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Dashboard
│   │   ├── trades/
│   │   │   ├── page.tsx                # Trade list
│   │   │   ├── [id]/page.tsx           # Trade detail
│   │   │   └── new/page.tsx            # Add trade
│   │   ├── analytics/page.tsx
│   │   ├── market/page.tsx
│   │   ├── broker/page.tsx
│   │   └── settings/page.tsx
│   ├── layout.tsx
│   ├── providers.tsx
│   └── globals.css
├── components/
│   ├── ui/                             # Reusable UI
│   ├── charts/                         # Chart components
│   ├── forms/                          # Form components
│   ├── layout/                         # Layout components
│   └── common/                         # Shared components
├── features/
│   ├── auth/
│   ├── trades/
│   ├── analytics/
│   ├── market/
│   ├── broker/
│   └── settings/
├── hooks/
├── lib/
├── store/
├── types/
└── utils/
```

---

## Page 1: Login Page

### Route: `/login`

### Layout
```
┌──────────────────────────────────────────────────────────────┐
│                    FULL WIDTH CONTAINER                       │
├────────────────────────┬─────────────────────────────────────┤
│                        │                                      │
│                        │         ┌─────────────────────┐     │
│    BRANDING PANEL      │         │       LOGO          │     │
│    (50% - Desktop)     │         └─────────────────────┘     │
│                        │                                      │
│    - App Logo          │         Welcome Back                 │
│    - Tagline           │         Sign in to continue          │
│    - Feature Bullets   │                                      │
│    - Gradient BG       │         ┌─────────────────────┐     │
│                        │         │ Email               │     │
│                        │         └─────────────────────┘     │
│                        │         ┌─────────────────────┐     │
│                        │         │ Password         👁  │     │
│                        │         └─────────────────────┘     │
│                        │                                      │
│                        │         □ Remember me                │
│                        │         Forgot password?             │
│                        │                                      │
│                        │         ┌─────────────────────┐     │
│                        │         │     SIGN IN         │     │
│                        │         └─────────────────────┘     │
│                        │                                      │
│                        │         ──── OR ────                 │
│                        │                                      │
│                        │         [G] Continue with Google     │
│                        │                                      │
│                        │         Don't have account? Sign up  │
│                        │                                      │
└────────────────────────┴─────────────────────────────────────┘
```

### Components
```typescript
// components/auth/LoginForm.tsx
interface LoginFormProps {
  onSubmit: (data: LoginDTO) => Promise<void>;
  isLoading: boolean;
  error?: string;
}

// Components Used:
// - TextField (email, password)
// - Checkbox (remember me)
// - Button (submit)
// - Link (forgot password, register)
// - Alert (error messages)
// - CircularProgress (loading)
```

### Data & API Calls
```typescript
// API: POST /api/v1/auth/login
interface LoginDTO {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface LoginResponse {
  user: UserDTO;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

// RTK Query
const [login, { isLoading, error }] = useLoginMutation();
```

### Form Validation (Zod)
```typescript
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  rememberMe: z.boolean().optional(),
});
```

### Responsive Rules
| Breakpoint | Layout |
|------------|--------|
| xs-sm | Single column, branding panel hidden |
| md+ | Two columns (50/50), branding panel visible |

---

## Page 2: Register Page

### Route: `/register`

### Layout
```
┌──────────────────────────────────────────────────────────────┐
│                    FULL WIDTH CONTAINER                       │
├────────────────────────┬─────────────────────────────────────┤
│                        │                                      │
│    BRANDING PANEL      │         Create Account               │
│    (Same as Login)     │         Start tracking your trades   │
│                        │                                      │
│                        │         ┌──────────┬──────────┐     │
│                        │         │FirstName │ LastName │     │
│                        │         └──────────┴──────────┘     │
│                        │         ┌─────────────────────┐     │
│                        │         │ Username            │     │
│                        │         └─────────────────────┘     │
│                        │         ┌─────────────────────┐     │
│                        │         │ Email               │     │
│                        │         └─────────────────────┘     │
│                        │         ┌─────────────────────┐     │
│                        │         │ Password         👁  │     │
│                        │         └─────────────────────┘     │
│                        │         Password strength: ████░░   │
│                        │         ┌─────────────────────┐     │
│                        │         │ Confirm Password 👁  │     │
│                        │         └─────────────────────┘     │
│                        │                                      │
│                        │         □ I agree to Terms & Privacy │
│                        │                                      │
│                        │         ┌─────────────────────┐     │
│                        │         │   CREATE ACCOUNT    │     │
│                        │         └─────────────────────┘     │
│                        │                                      │
│                        │         Already have account? Login  │
│                        │                                      │
└────────────────────────┴─────────────────────────────────────┘
```

### Components
```typescript
// components/auth/RegisterForm.tsx
// - TextField (firstName, lastName, username, email, password, confirmPassword)
// - PasswordStrengthIndicator
// - Checkbox (terms agreement)
// - Button (submit)
// - Alert (errors, success)
```

### Data & API Calls
```typescript
// API: POST /api/v1/auth/register
interface RegisterDTO {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
}

// RTK Query
const [register, { isLoading, error, isSuccess }] = useRegisterMutation();
```

### Form Validation
```typescript
const registerSchema = z.object({
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  password: z.string()
    .min(8)
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[a-z]/, 'Must contain lowercase')
    .regex(/[0-9]/, 'Must contain number')
    .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
  confirmPassword: z.string(),
  agreeTerms: z.literal(true, { errorMap: () => ({ message: 'You must agree to terms' }) }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});
```

---

## Page 3: Forgot Password / Reset Password

### Route: `/forgot-password`, `/reset-password`

### Layout (Forgot Password)
```
┌─────────────────────────────────────────┐
│              CENTERED CARD              │
│                                         │
│              [LOGO]                     │
│                                         │
│         Forgot Password?                │
│    Enter email to receive reset link    │
│                                         │
│    ┌─────────────────────────────┐     │
│    │ Email                       │     │
│    └─────────────────────────────┘     │
│                                         │
│    ┌─────────────────────────────┐     │
│    │     SEND RESET LINK         │     │
│    └─────────────────────────────┘     │
│                                         │
│           Back to Login                 │
│                                         │
└─────────────────────────────────────────┘
```

### Layout (Reset Password)
```
┌─────────────────────────────────────────┐
│              CENTERED CARD              │
│                                         │
│              [LOGO]                     │
│                                         │
│         Reset Password                  │
│      Enter your new password            │
│                                         │
│    ┌─────────────────────────────┐     │
│    │ New Password            👁   │     │
│    └─────────────────────────────┘     │
│    ┌─────────────────────────────┐     │
│    │ Confirm Password        👁   │     │
│    └─────────────────────────────┘     │
│                                         │
│    ┌─────────────────────────────┐     │
│    │     RESET PASSWORD          │     │
│    └─────────────────────────────┘     │
│                                         │
└─────────────────────────────────────────┘
```

### API Calls
```typescript
// Forgot Password
// API: POST /api/v1/auth/forgot-password
interface ForgotPasswordDTO { email: string; }

// Reset Password
// API: POST /api/v1/auth/reset-password
interface ResetPasswordDTO {
  token: string;
  password: string;
}
```

---

## Page 4: Dashboard (Main)

### Route: `/` (authenticated)

### Layout
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ HEADER                                                                        │
│ ┌─────────┬──────────────────────────────────────────────┬──────────────────┐│
│ │ [LOGO]  │  🔍 Search trades, symbols...                │ 🔔 👤 User ▼    ││
│ └─────────┴──────────────────────────────────────────────┴──────────────────┘│
├────────────┬─────────────────────────────────────────────────────────────────┤
│            │                                                                  │
│  SIDEBAR   │  MAIN CONTENT AREA                                              │
│            │                                                                  │
│  📊 Dashboard│  ┌─────────────────────────────────────────────────────────┐  │
│  📈 Trades   │  │ Welcome back, {firstName}!         Today: Nov 29, 2025 │  │
│  📉 Analytics│  └─────────────────────────────────────────────────────────┘  │
│  💹 Market   │                                                                │
│  🔗 Broker   │  SUMMARY CARDS (4 columns)                                    │
│  ⚙️ Settings │  ┌────────────┬────────────┬────────────┬────────────┐       │
│            │  │ Total P&L  │ Today P&L  │ Win Rate   │ Open Trades│       │
│            │  │ ₹1,25,430  │ ₹3,240     │ 67.5%      │ 5          │       │
│            │  │ ↑ 12.5%    │ ↑ ₹1,200   │ ↑ 2.3%     │ ₹45,000    │       │
│            │  └────────────┴────────────┴────────────┴────────────┘       │
│            │                                                                │
│            │  ┌─────────────────────────────┬─────────────────────────┐    │
│            │  │ P&L TREND CHART             │ CATEGORY BREAKDOWN      │    │
│            │  │ (Area/Line Chart)           │ (Donut Chart)           │    │
│            │  │                             │                         │    │
│            │  │   ╱╲    ╱╲                  │     ┌───┐               │    │
│            │  │  ╱  ╲  ╱  ╲                 │   ╱     ╲              │    │
│            │  │ ╱    ╲╱    ╲────            │  │Intraday│             │    │
│            │  │                             │   ╲     ╱              │    │
│            │  │ [1D] [1W] [1M] [3M] [1Y]   │     └───┘               │    │
│            │  └─────────────────────────────┴─────────────────────────┘    │
│            │                                                                │
│            │  ┌─────────────────────────────┬─────────────────────────┐    │
│            │  │ RECENT TRADES               │ MARKET OVERVIEW         │    │
│            │  │                             │                         │    │
│            │  │ RELIANCE  BUY  +₹1,200     │ NIFTY 50   19,425.50   │    │
│            │  │ TCS       SELL -₹450       │ ↑ 0.45%                 │    │
│            │  │ INFY      BUY  +₹890       │                         │    │
│            │  │ HDFCBANK  SELL +₹2,100     │ SENSEX     64,112.30   │    │
│            │  │                             │ ↑ 0.38%                 │    │
│            │  │ [View All Trades →]        │                         │    │
│            │  └─────────────────────────────┴─────────────────────────┘    │
│            │                                                                │
└────────────┴─────────────────────────────────────────────────────────────────┘
```

### Components

```typescript
// components/dashboard/SummaryCard.tsx
interface SummaryCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  color?: 'success' | 'error' | 'warning' | 'info';
  loading?: boolean;
}

// components/dashboard/PnLTrendChart.tsx
interface PnLTrendChartProps {
  data: { date: string; pnl: number }[];
  timeRange: '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL';
  onTimeRangeChange: (range: string) => void;
}

// components/dashboard/CategoryBreakdown.tsx
interface CategoryBreakdownProps {
  data: { category: string; value: number; percentage: number }[];
}

// components/dashboard/RecentTradesTable.tsx
interface RecentTradesTableProps {
  trades: Trade[];
  limit?: number;
  onViewAll: () => void;
}

// components/dashboard/MarketOverview.tsx
interface MarketOverviewProps {
  indices: { name: string; value: number; change: number }[];
}
```

### Data & API Calls

```typescript
// Dashboard Data Fetching
// API: GET /api/v1/analytics/dashboard
interface DashboardResponse {
  today: {
    totalTrades: number;
    netPnL: number;
    winRate: number;
    topSymbol?: string;
  };
  thisMonth: {
    totalTrades: number;
    netPnL: number;
    winRate: number;
    tradingDays: number;
    averageDailyPnL: number;
  };
  allTime: {
    totalTrades: number;
    netPnL: number;
    winRate: number;
    profitFactor: number;
  };
  recentPerformance: { date: string; pnl: number }[];
  topSymbols: { symbol: string; netPnL: number; totalTrades: number }[];
  worstSymbols: { symbol: string; netPnL: number; totalTrades: number }[];
}

// API: GET /api/v1/trades?limit=5&sort=-createdAt
// API: GET /api/v1/market/indices

// RTK Query Hooks
const { data: dashboard, isLoading } = useGetDashboardQuery();
const { data: recentTrades } = useGetTradesQuery({ limit: 5, sort: '-createdAt' });
const { data: indices } = useGetIndicesQuery();
```

### Charts Configuration (Recharts)

```typescript
// P&L Trend - Area Chart
<ResponsiveContainer width="100%" height={300}>
  <AreaChart data={pnlData}>
    <defs>
      <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#2E7D32" stopOpacity={0.3}/>
        <stop offset="95%" stopColor="#2E7D32" stopOpacity={0}/>
      </linearGradient>
    </defs>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="date" />
    <YAxis tickFormatter={(v) => `₹${v/1000}K`} />
    <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} />
    <Area 
      type="monotone" 
      dataKey="pnl" 
      stroke="#2E7D32" 
      fill="url(#pnlGradient)" 
    />
  </AreaChart>
</ResponsiveContainer>

// Category Breakdown - Pie Chart
<ResponsiveContainer width="100%" height={250}>
  <PieChart>
    <Pie
      data={categoryData}
      cx="50%"
      cy="50%"
      innerRadius={60}
      outerRadius={100}
      dataKey="value"
      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
    >
      {categoryData.map((entry, index) => (
        <Cell key={index} fill={COLORS[index % COLORS.length]} />
      ))}
    </Pie>
    <Legend />
    <Tooltip />
  </PieChart>
</ResponsiveContainer>
```

### Responsive Rules

| Breakpoint | Layout Changes |
|------------|----------------|
| xs | Sidebar collapsed (hamburger), 1 column cards, stacked charts |
| sm | Sidebar collapsed, 2 column cards, stacked charts |
| md | Sidebar mini (icons only), 2 column cards, side-by-side charts |
| lg | Sidebar expanded, 4 column cards, side-by-side charts |
| xl | Same as lg with more padding |

---

## Page 5: Trades List Page

### Route: `/trades`

### Layout
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ HEADER + SIDEBAR (same as dashboard)                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Trades                                              [+ Add Trade]           │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ FILTERS BAR                                                              │ │
│  │ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌─────────────┐ │ │
│  │ │Status ▼│ │Symbol ▼│ │Type   ▼│ │Segment▼│ │Date    │ │🔍 Search    │ │ │
│  │ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └─────────────┘ │ │
│  │ Active Filters: [Status: Open ✕] [Type: Intraday ✕]    [Clear All]      │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ TRADES TABLE                                                             │ │
│  │ ┌─────┬────────┬───────┬─────┬─────────┬─────────┬────────┬───────────┐ │ │
│  │ │ □   │ Symbol │ Type  │ Pos │ Entry   │ Exit    │ P&L    │ Status    │ │ │
│  │ ├─────┼────────┼───────┼─────┼─────────┼─────────┼────────┼───────────┤ │ │
│  │ │ □   │RELIANCE│Intra  │Long │₹2,450.50│₹2,485.00│+₹3,450 │ ● Closed  │ │ │
│  │ │     │NSE     │       │10qty│Nov 28   │Nov 28   │+1.4%   │           │ │ │
│  │ ├─────┼────────┼───────┼─────┼─────────┼─────────┼────────┼───────────┤ │ │
│  │ │ □   │TCS     │Swing  │Short│₹3,650.00│    -    │-₹1,200 │ ○ Open    │ │ │
│  │ │     │NSE     │       │5qty │Nov 25   │    -    │-0.65%  │           │ │ │
│  │ ├─────┼────────┼───────┼─────┼─────────┼─────────┼────────┼───────────┤ │ │
│  │ │ □   │INFY    │Deliv  │Long │₹1,450.25│₹1,520.00│+₹6,975 │ ● Closed  │ │ │
│  │ │     │NSE     │       │100  │Nov 20   │Nov 27   │+4.8%   │           │ │ │
│  │ └─────┴────────┴───────┴─────┴─────────┴─────────┴────────┴───────────┘ │ │
│  │                                                                          │ │
│  │ Showing 1-20 of 156 trades      [◀ Prev] [1] [2] [3] ... [8] [Next ▶]   │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  BULK ACTIONS (when rows selected):                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ 3 trades selected    [Export CSV] [Add Tags] [Delete]                   │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Components

```typescript
// components/trades/TradeFilters.tsx
interface TradeFiltersProps {
  filters: TradeQueryOptions;
  onFilterChange: (filters: TradeQueryOptions) => void;
  onClearFilters: () => void;
}

// components/trades/TradesTable.tsx
interface TradesTableProps {
  trades: Trade[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onSort: (field: string, order: 'asc' | 'desc') => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onRowClick: (trade: Trade) => void;
}

// components/trades/TradeRow.tsx
interface TradeRowProps {
  trade: Trade;
  selected: boolean;
  onSelect: (id: string) => void;
  onClick: () => void;
}

// components/trades/BulkActions.tsx
interface BulkActionsProps {
  selectedCount: number;
  onExport: () => void;
  onAddTags: () => void;
  onDelete: () => void;
}

// components/common/Pagination.tsx
interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}
```

### Data & API Calls

```typescript
// API: GET /api/v1/trades
interface TradeQueryParams {
  page?: number;
  limit?: number;
  status?: 'open' | 'closed' | 'partial' | 'cancelled';
  symbol?: string | string[];
  tradeType?: 'intraday' | 'delivery' | 'swing';
  segment?: 'equity' | 'futures' | 'options';
  position?: 'long' | 'short';
  from?: string;  // ISO date
  to?: string;    // ISO date
  minPnL?: number;
  maxPnL?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface TradesResponse {
  data: Trade[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// RTK Query
const { data, isLoading, isFetching } = useGetTradesQuery(queryParams);
```

### Responsive Rules

| Breakpoint | Changes |
|------------|---------|
| xs | Card layout instead of table, single column |
| sm | Card layout, 2 columns |
| md | Table with horizontal scroll, fewer columns |
| lg+ | Full table with all columns |

---

## Page 6: Trade Detail Page

### Route: `/trades/[id]`

### Layout
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ HEADER + SIDEBAR                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ← Back to Trades                           [Edit] [Close Trade] [Delete]    │
│                                                                               │
│  ┌───────────────────────────────────────────────────────────────────────┐   │
│  │ TRADE HEADER                                                           │   │
│  │ ┌──────────────────────────────────────────────────────────────────┐  │   │
│  │ │ RELIANCE                                            ● CLOSED     │  │   │
│  │ │ Reliance Industries Ltd                                          │  │   │
│  │ │ NSE • Equity • Intraday                                         │  │   │
│  │ └──────────────────────────────────────────────────────────────────┘  │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌──────────────────────────┬──────────────────────────┬─────────────────┐   │
│  │ ENTRY                    │ EXIT                     │ P&L SUMMARY     │   │
│  │                          │                          │                 │   │
│  │ Price: ₹2,450.50        │ Price: ₹2,485.00        │ Gross: +₹3,450  │   │
│  │ Qty: 100                 │ Qty: 100                │ Charges: -₹45   │   │
│  │ Value: ₹2,45,050        │ Value: ₹2,48,500        │ Net: +₹3,405    │   │
│  │ Date: Nov 28, 09:15     │ Date: Nov 28, 14:30     │ ROI: +1.39%     │   │
│  │ Order: Market            │ Order: Limit             │                 │   │
│  │ Brokerage: ₹20          │ Brokerage: ₹20          │ ▲ PROFIT        │   │
│  └──────────────────────────┴──────────────────────────┴─────────────────┘   │
│                                                                               │
│  ┌───────────────────────────────────────────────────────────────────────┐   │
│  │ PRICE CHART (TradingView Lightweight)                                  │   │
│  │                                                                        │   │
│  │   ╭──╮                      Entry: ──── Exit: ────                    │   │
│  │  ╱    ╲    ╭────╮                                                     │   │
│  │ ╱      ╲──╱      ╲                                                    │   │
│  │╱                   ╲──────                                            │   │
│  │                                                                        │   │
│  │ [1m] [5m] [15m] [1H] [1D]                                             │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌────────────────────────────┬──────────────────────────────────────────┐   │
│  │ TRADE INFO                 │ NOTES                                     │   │
│  │                            │                                           │   │
│  │ Strategy: Breakout         │ Entered on support breakout              │   │
│  │ Position: Long             │ with good volume. Target hit.            │   │
│  │ Stop Loss: ₹2,420         │                                           │   │
│  │ Target: ₹2,500            │ [Edit Notes]                              │   │
│  │ RRR: 1:1.5                │                                           │   │
│  │ Holding: 5h 15m           │                                           │   │
│  │                            │                                           │   │
│  │ Tags: #breakout #nse      │                                           │   │
│  └────────────────────────────┴──────────────────────────────────────────┘   │
│                                                                               │
│  ┌───────────────────────────────────────────────────────────────────────┐   │
│  │ CHARGES BREAKDOWN                                                      │   │
│  │ Brokerage: ₹40 | STT: ₹25 | Stamp: ₹5 | GST: ₹7 | SEBI: ₹1 | Total: ₹78│  │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Components

```typescript
// components/trades/TradeHeader.tsx
// components/trades/TradeEntryExit.tsx
// components/trades/TradePnLCard.tsx
// components/trades/TradePriceChart.tsx
// components/trades/TradeInfo.tsx
// components/trades/TradeNotes.tsx
// components/trades/ChargesBreakdown.tsx

// Chart: TradingView Lightweight Charts
import { createChart, IChartApi } from 'lightweight-charts';
```

### API Calls

```typescript
// API: GET /api/v1/trades/:id
// API: GET /api/v1/market/history?symbol=RELIANCE&exchange=NSE&interval=5m
// API: PUT /api/v1/trades/:id (update notes/tags)
// API: POST /api/v1/trades/:id/exit (close trade)
// API: DELETE /api/v1/trades/:id
```

---

## Page 7: Add/Edit Trade Page

### Route: `/trades/new`, `/trades/[id]/edit`

### Layout
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ HEADER + SIDEBAR                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ← Back            Add New Trade                                             │
│                                                                               │
│  ┌───────────────────────────────────────────────────────────────────────┐   │
│  │ TRADE FORM                                                             │   │
│  │                                                                        │   │
│  │ INSTRUMENT DETAILS                                                     │   │
│  │ ┌─────────────────────────┐ ┌──────────────┐ ┌──────────────────────┐ │   │
│  │ │ Symbol 🔍               │ │ Exchange ▼   │ │ Segment ▼            │ │   │
│  │ │ RELIANCE               │ │ NSE          │ │ Equity               │ │   │
│  │ └─────────────────────────┘ └──────────────┘ └──────────────────────┘ │   │
│  │                                                                        │   │
│  │ TRADE DETAILS                                                          │   │
│  │ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────────┐│   │
│  │ │ Trade Type ▼     │ │ Position ▼       │ │ Order Type ▼            ││   │
│  │ │ Intraday         │ │ Long             │ │ Market                  ││   │
│  │ └──────────────────┘ └──────────────────┘ └──────────────────────────┘│   │
│  │                                                                        │   │
│  │ ENTRY DETAILS                                                          │   │
│  │ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌──────────┐ │   │
│  │ │ Entry Price    │ │ Quantity       │ │ Entry Date     │ │Entry Time│ │   │
│  │ │ ₹ 2,450.50    │ │ 100            │ │ 📅 Nov 28, 2025│ │ 09:15    │ │   │
│  │ └────────────────┘ └────────────────┘ └────────────────┘ └──────────┘ │   │
│  │                                                                        │   │
│  │ ┌────────────────────────────────────────────────────────────────────┐│   │
│  │ │ □ Trade is closed (fill exit details)                              ││   │
│  │ └────────────────────────────────────────────────────────────────────┘│   │
│  │                                                                        │   │
│  │ EXIT DETAILS (if checked)                                              │   │
│  │ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌──────────┐ │   │
│  │ │ Exit Price     │ │ Exit Quantity  │ │ Exit Date      │ │Exit Time │ │   │
│  │ │ ₹ 2,485.00    │ │ 100            │ │ 📅 Nov 28, 2025│ │ 14:30    │ │   │
│  │ └────────────────┘ └────────────────┘ └────────────────┘ └──────────┘ │   │
│  │                                                                        │   │
│  │ RISK MANAGEMENT                                                        │   │
│  │ ┌────────────────────┐ ┌────────────────────┐ ┌──────────────────────┐│   │
│  │ │ Stop Loss          │ │ Target             │ │ Strategy ▼           ││   │
│  │ │ ₹ 2,420           │ │ ₹ 2,500           │ │ Breakout             ││   │
│  │ └────────────────────┘ └────────────────────┘ └──────────────────────┘│   │
│  │                                                                        │   │
│  │ CHARGES                                                                │   │
│  │ ┌────────────┐ ┌───────┐ ┌───────┐ ┌─────┐ ┌──────┐ ┌────────────────┐│   │
│  │ │ Brokerage  │ │ STT   │ │ Stamp │ │ GST │ │ SEBI │ │ [Auto-calc] ☑  ││   │
│  │ │ ₹ 40      │ │ ₹ 25 │ │ ₹ 5  │ │ ₹ 7│ │ ₹ 1 │ │                 ││   │
│  │ └────────────┘ └───────┘ └───────┘ └─────┘ └──────┘ └────────────────┘│   │
│  │                                                                        │   │
│  │ ADDITIONAL                                                             │   │
│  │ ┌────────────────────────────────────────────────────────────────────┐│   │
│  │ │ Tags: [breakout] [nse] [+]                                         ││   │
│  │ └────────────────────────────────────────────────────────────────────┘│   │
│  │ ┌────────────────────────────────────────────────────────────────────┐│   │
│  │ │ Notes                                                               ││   │
│  │ │ Entered on support breakout with good volume...                    ││   │
│  │ └────────────────────────────────────────────────────────────────────┘│   │
│  │                                                                        │   │
│  │ ┌─────────────┐                              ┌────────────────────────┐│   │
│  │ │   Cancel    │                              │      Save Trade        ││   │
│  │ └─────────────┘                              └────────────────────────┘│   │
│  │                                                                        │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Form Schema

```typescript
const tradeFormSchema = z.object({
  // Instrument
  symbol: z.string().min(1, 'Symbol is required'),
  exchange: z.enum(['NSE', 'BSE', 'MCX', 'NFO']),
  segment: z.enum(['equity', 'futures', 'options', 'commodity']),
  instrumentType: z.enum(['stock', 'future', 'call', 'put']).optional(),
  
  // Trade details
  tradeType: z.enum(['intraday', 'delivery', 'swing']),
  position: z.enum(['long', 'short']),
  orderType: z.enum(['market', 'limit', 'stop_loss']).optional(),
  
  // Entry
  entryPrice: z.number().positive('Entry price must be positive'),
  quantity: z.number().int().positive('Quantity must be positive'),
  entryDate: z.date(),
  entryTime: z.string().optional(),
  entryBrokerage: z.number().min(0).optional(),
  
  // Exit (optional)
  isClosed: z.boolean(),
  exitPrice: z.number().positive().optional(),
  exitQuantity: z.number().int().positive().optional(),
  exitDate: z.date().optional(),
  exitTime: z.string().optional(),
  exitBrokerage: z.number().min(0).optional(),
  
  // Risk management
  stopLoss: z.number().positive().optional(),
  target: z.number().positive().optional(),
  strategy: z.string().max(100).optional(),
  
  // Taxes
  taxes: z.object({
    stt: z.number().min(0).optional(),
    stampDuty: z.number().min(0).optional(),
    gst: z.number().min(0).optional(),
    sebiTurnover: z.number().min(0).optional(),
    exchangeTxn: z.number().min(0).optional(),
  }).optional(),
  
  // Additional
  tags: z.array(z.string()).optional(),
  notes: z.string().max(2000).optional(),
}).refine(data => {
  if (data.isClosed) {
    return data.exitPrice && data.exitQuantity && data.exitDate;
  }
  return true;
}, { message: 'Exit details required for closed trades', path: ['exitPrice'] });
```

### API Calls

```typescript
// Create: POST /api/v1/trades
// Update: PUT /api/v1/trades/:id
// Symbol search: GET /api/v1/market/search?q={query}
```

---

## Page 8: Analytics Page

### Route: `/analytics`

### Layout
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ HEADER + SIDEBAR                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Analytics                              Date Range: [Nov 1] - [Nov 29] 📅     │
│                                                                               │
│  PERFORMANCE METRICS (6 cards)                                                │
│  ┌────────────┬────────────┬────────────┬────────────┬────────────┬────────┐ │
│  │ Total P&L  │ Win Rate   │ Profit     │ Sharpe     │ Max        │ Avg    │ │
│  │ ₹1,25,430  │ 67.5%      │ Factor     │ Ratio      │ Drawdown   │ Trade  │ │
│  │ ↑ 12.5%    │ 54/80      │ 2.3        │ 1.85       │ -₹15,000   │ ₹1,568 │ │
│  └────────────┴────────────┴────────────┴────────────┴────────────┴────────┘ │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ EQUITY CURVE (Area Chart)                                               │ │
│  │                                                     [1W] [1M] [3M] [1Y] │ │
│  │     ╱╲                                                                  │ │
│  │    ╱  ╲    ╱╲                    ╱────────                              │ │
│  │   ╱    ╲  ╱  ╲    ╱╲           ╱                                       │ │
│  │  ╱      ╲╱    ╲  ╱  ╲    ╱╲  ╱                                        │ │
│  │ ╱              ╲╱    ╲──╱  ╲╱                                          │ │
│  │╱                                                                        │ │
│  │ Nov 1    Nov 8    Nov 15    Nov 22    Nov 29                           │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌─────────────────────────────┬───────────────────────────────────────────┐ │
│  │ MONTHLY P&L (Bar Chart)     │ P&L BY SEGMENT (Donut)                    │ │
│  │                             │                                           │ │
│  │   ▓▓▓         ▓▓▓          │        ╭────╮                             │ │
│  │   ▓▓▓   ░░░   ▓▓▓   ▓▓▓    │      ╱      ╲  Equity: 65%               │ │
│  │   ▓▓▓   ░░░   ▓▓▓   ▓▓▓    │     │ Futures │  F&O: 25%                │ │
│  │   ▓▓▓   ░░░   ▓▓▓   ▓▓▓    │      ╲      ╱  Options: 10%              │ │
│  │   Aug   Sep   Oct   Nov    │        ╰────╯                             │ │
│  │ ▓ Profit  ░ Loss           │                                           │ │
│  └─────────────────────────────┴───────────────────────────────────────────┘ │
│                                                                               │
│  ┌─────────────────────────────┬───────────────────────────────────────────┐ │
│  │ P&L BY TRADE TYPE           │ LONG VS SHORT                             │ │
│  │ (Horizontal Bar)            │ (Comparison Bar)                          │ │
│  │                             │                                           │ │
│  │ Intraday  ████████░░ 62%   │ Long   ████████████  ₹85,000              │ │
│  │ Swing     ██████░░░░ 28%   │ Short  ██████░░░░░░  ₹40,430              │ │
│  │ Delivery  ██░░░░░░░░ 10%   │                                           │ │
│  │                             │ Win%:  68%    vs    65%                   │ │
│  └─────────────────────────────┴───────────────────────────────────────────┘ │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ TRADING HEATMAP (Day of Week × Hour)                                    │ │
│  │                                                                          │ │
│  │        9AM  10AM  11AM  12PM  1PM  2PM  3PM                              │ │
│  │   Mon  ███   ██   ░░░   ░░   ░░   ██   ███                              │ │
│  │   Tue  ██    ███  ░░    ██   ░░   ███  ██                               │ │
│  │   Wed  ░░    ██   ███   ░░   ██   ░░   ███                              │ │
│  │   Thu  ███   ░░   ██    ███  ░░   ██   ░░                               │ │
│  │   Fri  ██    ███  ░░    ░░   ███  ░░   ██                               │ │
│  │                                                                          │ │
│  │   Legend: ███ Profit  ░░░ Loss  (intensity = amount)                    │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌─────────────────────────────┬───────────────────────────────────────────┐ │
│  │ TOP PERFORMERS              │ WORST PERFORMERS                          │ │
│  │ (Symbol Table)              │ (Symbol Table)                            │ │
│  │                             │                                           │ │
│  │ 1. RELIANCE  +₹25,400 68%  │ 1. TATAMOTORS  -₹8,200  35%              │ │
│  │ 2. TCS       +₹18,200 72%  │ 2. BHARTIARTL  -₹5,600  42%              │ │
│  │ 3. INFY      +₹15,800 65%  │ 3. SBIN        -₹4,100  38%              │ │
│  │ 4. HDFCBANK  +₹12,400 70%  │ 4. ITC         -₹2,800  45%              │ │
│  │ 5. ICICIBANK +₹10,200 64%  │ 5. WIPRO       -₹1,500  48%              │ │
│  └─────────────────────────────┴───────────────────────────────────────────┘ │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ WIN/LOSS DISTRIBUTION (Histogram)                   STREAK ANALYSIS     │ │
│  │                                                                          │ │
│  │         ▓▓▓                                         Current: 3 wins     │ │
│  │       ▓▓▓▓▓                                         Best Win: 8 trades  │ │
│  │     ▓▓▓▓▓▓▓▓▓                                       Worst Loss: 5 trades│ │
│  │   ▓▓▓▓▓▓▓▓▓▓▓▓▓                                                         │ │
│  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                                                       │ │
│  │ -5K  -2K   0   2K   5K   10K                                            │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Components

```typescript
// components/analytics/MetricCard.tsx
interface MetricCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  change?: number;
  icon?: React.ReactNode;
  tooltip?: string;
}

// components/analytics/EquityCurve.tsx
interface EquityCurveProps {
  data: { date: string; equity: number; drawdown: number }[];
  timeRange: '1W' | '1M' | '3M' | '1Y' | 'ALL';
  showDrawdown?: boolean;
}

// components/analytics/MonthlyPnLChart.tsx
interface MonthlyPnLChartProps {
  data: { month: string; profit: number; loss: number; net: number }[];
}

// components/analytics/SegmentBreakdown.tsx
interface SegmentBreakdownProps {
  data: { segment: string; value: number; percentage: number; trades: number }[];
}

// components/analytics/TradingHeatmap.tsx
interface TradingHeatmapProps {
  data: { day: number; hour: number; pnl: number; trades: number }[];
}

// components/analytics/SymbolRanking.tsx
interface SymbolRankingProps {
  symbols: { symbol: string; pnl: number; winRate: number; trades: number }[];
  type: 'best' | 'worst';
}

// components/analytics/PnLDistribution.tsx
interface PnLDistributionProps {
  data: { range: string; count: number }[];
  avgWin: number;
  avgLoss: number;
}
```

### Charts Configuration

```typescript
// Equity Curve - Area Chart with Drawdown
<ResponsiveContainer width="100%" height={350}>
  <ComposedChart data={equityData}>
    <defs>
      <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#2E7D32" stopOpacity={0.4}/>
        <stop offset="95%" stopColor="#2E7D32" stopOpacity={0}/>
      </linearGradient>
    </defs>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="date" />
    <YAxis yAxisId="left" tickFormatter={(v) => `₹${v/1000}K`} />
    <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} />
    <Tooltip />
    <Area yAxisId="left" type="monotone" dataKey="equity" stroke="#2E7D32" fill="url(#equityGradient)" />
    <Line yAxisId="right" type="monotone" dataKey="drawdown" stroke="#D32F2F" strokeDasharray="3 3" />
  </ComposedChart>
</ResponsiveContainer>

// Monthly P&L - Grouped Bar Chart
<ResponsiveContainer width="100%" height={250}>
  <BarChart data={monthlyData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="month" />
    <YAxis tickFormatter={(v) => `₹${v/1000}K`} />
    <Tooltip />
    <Legend />
    <Bar dataKey="profit" fill="#2E7D32" name="Profit" />
    <Bar dataKey="loss" fill="#D32F2F" name="Loss" />
  </BarChart>
</ResponsiveContainer>

// Heatmap - Custom SVG or use recharts-heatmap
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const HOURS = ['9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM'];

// Color scale based on P&L
const getHeatmapColor = (pnl: number) => {
  if (pnl > 1000) return '#1B5E20';
  if (pnl > 0) return '#4CAF50';
  if (pnl > -500) return '#FFCDD2';
  return '#C62828';
};
```

### API Calls

```typescript
// API: GET /api/v1/analytics/dashboard
// API: GET /api/v1/analytics/metrics?from=&to=
interface PerformanceMetrics {
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  maxDrawdownDate?: Date;
  recoveryFactor: number;
  calmarRatio: number;
  averageRRR: number;
  expectancy: number;
  consistency: number;
}

// API: GET /api/v1/analytics/pnl/breakdown?dimension=segment
// API: GET /api/v1/analytics/trends/monthly?months=12
// API: GET /api/v1/analytics/trends/weekly?weeks=12
// API: GET /api/v1/analytics/symbols?sort=-netPnL&limit=5
// API: GET /api/v1/analytics/symbols?sort=netPnL&limit=5

// RTK Query
const { data: metrics } = useGetMetricsQuery({ from, to });
const { data: breakdown } = useGetPnLBreakdownQuery({ dimension: 'segment' });
const { data: monthly } = useGetMonthlyTrendQuery({ months: 12 });
```

### Responsive Rules

| Breakpoint | Changes |
|------------|---------|
| xs | Single column, stacked charts, smaller heatmap |
| sm | 2-column grid for small charts |
| md | 3-column metrics, 2-column charts |
| lg+ | 6-column metrics, 2-column charts, full heatmap |

---

## Page 9: Market Dashboard

### Route: `/market`

### Layout
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ HEADER + SIDEBAR                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Market Dashboard                                    🔴 Live  Last: 10:45 AM │
│                                                                               │
│  MARKET INDICES                                                               │
│  ┌────────────────┬────────────────┬────────────────┬────────────────┐       │
│  │ NIFTY 50       │ SENSEX         │ BANKNIFTY      │ NIFTY IT       │       │
│  │ 19,425.35      │ 64,832.45      │ 43,215.60      │ 32,145.80      │       │
│  │ ↑ +125.40      │ ↑ +412.30      │ ↓ -85.20       │ ↑ +215.60      │       │
│  │ (+0.65%)       │ (+0.64%)       │ (-0.20%)       │ (+0.67%)       │       │
│  │ ▁▂▃▄▅▆▇█▆▇     │ ▁▂▃▄▅▆▇█▆▇     │ ▇▆▅▄▃▂▁▂▃▂     │ ▁▂▃▄▅▆▇█▆▇     │       │
│  └────────────────┴────────────────┴────────────────┴────────────────┘       │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ WATCHLIST                                              [+] Add Symbol   │ │
│  │ ─────────────────────────────────────────────────────────────────────── │ │
│  │ Tabs: [All] [Favorites] [Nifty 50] [Bank Nifty] [My Stocks] [Create +] │ │
│  │ ─────────────────────────────────────────────────────────────────────── │ │
│  │                                                                          │ │
│  │ Symbol    Exchange   LTP       Change    %Chg    High     Low     Vol   │ │
│  │ ───────────────────────────────────────────────────────────────────────  │ │
│  │ ★ RELIANCE  NSE    2,485.60   +32.40   +1.32%  2,498.00  2,445.00  2.5M │ │
│  │ ★ TCS       NSE    3,625.80   -18.20   -0.50%  3,650.00  3,600.00  1.2M │ │
│  │ ★ INFY      NSE    1,545.30   +12.80   +0.84%  1,552.00  1,528.00  3.1M │ │
│  │   HDFCBANK  NSE    1,652.40   +8.60    +0.52%  1,665.00  1,640.00  2.8M │ │
│  │   ICICIBANK NSE    948.75     -4.25    -0.45%  955.00    942.00    1.9M │ │
│  │   SBIN      NSE    582.30     +11.20   +1.96%  586.00    570.00    8.5M │ │
│  │   TATAMOTORS NSE   645.80     +22.40   +3.59%  652.00    622.00    12M  │ │
│  │   BHARTIARTL NSE   985.40     -8.60    -0.87%  995.00    980.00    1.4M │ │
│  │   ...                                                                    │ │
│  │                                                                          │ │
│  │ ◀ 1 2 3 4 5 ▶                                                           │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ SYMBOL DETAIL PANEL (Expandable on row click)                           │ │
│  │ ─────────────────────────────────────────────────────────────────────── │ │
│  │ RELIANCE INDUSTRIES LTD                               [Chart] [Trade]   │ │
│  │                                                                          │ │
│  │ ┌─────────────────────────────────┬─────────────────────────────────┐   │ │
│  │ │ INTRADAY CHART (Candlestick)    │ Key Stats                       │   │ │
│  │ │                                 │                                  │   │ │
│  │ │    ┃                            │ Open:     ₹2,456.00             │   │ │
│  │ │   ┃┃┃   ┃                       │ High:     ₹2,498.00             │   │ │
│  │ │  ┃┃┃┃┃ ┃┃┃                      │ Low:      ₹2,445.00             │   │ │
│  │ │ ┃┃┃┃┃┃┃┃┃┃┃                     │ Close:    ₹2,485.60             │   │ │
│  │ │                                 │ Volume:   2.5M                   │   │ │
│  │ │ 9:15  10:00  11:00  12:00      │ Avg Vol:  1.8M                   │   │ │
│  │ │                                 │ 52W High: ₹2,856.00             │   │ │
│  │ │ [1D] [1W] [1M] [3M] [1Y]       │ 52W Low:  ₹2,180.00             │   │ │
│  │ └─────────────────────────────────┴─────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  PRICE ALERTS                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ Active Alerts (3)                                          [+ New Alert]│ │
│  │                                                                          │ │
│  │ RELIANCE above ₹2,500  │ 🔔 Active  │ Created: Nov 28  │ [Edit] [🗑]    │ │
│  │ TCS below ₹3,500       │ 🔔 Active  │ Created: Nov 25  │ [Edit] [🗑]    │ │
│  │ NIFTY above 19,500     │ ✅ Triggered│ Nov 29, 10:30 AM│ [Clear]        │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌─────────────────────────────────────┬───────────────────────────────────┐ │
│  │ SECTOR HEATMAP                      │ MARKET BREADTH                    │ │
│  │                                     │                                   │ │
│  │ ┌──────┬──────┬──────┬──────┐      │ Advances:  1,245  ████████████   │ │
│  │ │ IT   │ Bank │ Auto │ FMCG │      │ Declines:    890  ████████       │ │
│  │ │ +1.2%│ -0.3%│ +2.1%│ +0.5%│      │ Unchanged:   165  ██              │ │
│  │ ├──────┼──────┼──────┼──────┤      │                                   │ │
│  │ │Pharma│Metal │Energy│Realty│      │ A/D Ratio: 1.40                   │ │
│  │ │ +0.8%│ +1.5%│ -0.6%│ +1.8%│      │ 52W High: 245  52W Low: 89       │ │
│  │ └──────┴──────┴──────┴──────┘      │                                   │ │
│  └─────────────────────────────────────┴───────────────────────────────────┘ │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Components

```typescript
// components/market/IndexCard.tsx
interface IndexCardProps {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  sparklineData: number[];
  isLive?: boolean;
}

// components/market/WatchlistTable.tsx
interface WatchlistTableProps {
  watchlistId?: string;
  symbols: MarketQuote[];
  onSymbolClick: (symbol: string) => void;
  onToggleFavorite: (symbol: string) => void;
  favorites: Set<string>;
}

// components/market/SymbolDetailPanel.tsx
interface SymbolDetailPanelProps {
  symbol: string;
  exchange: string;
  quote: MarketQuote;
  onClose: () => void;
  onTradeClick: () => void;
}

// components/market/CandlestickChart.tsx
interface CandlestickChartProps {
  symbol: string;
  exchange: string;
  interval: '1m' | '5m' | '15m' | '1h' | '1d' | '1w';
  height?: number;
}

// components/market/PriceAlertCard.tsx
interface PriceAlertCardProps {
  alert: PriceAlert;
  onEdit: () => void;
  onDelete: () => void;
  onClear?: () => void;
}

// components/market/SectorHeatmap.tsx
interface SectorHeatmapProps {
  sectors: { name: string; change: number; stocks: number }[];
}

// components/market/MarketBreadth.tsx
interface MarketBreadthProps {
  advances: number;
  declines: number;
  unchanged: number;
  high52w: number;
  low52w: number;
}

// components/market/AddSymbolDialog.tsx
interface AddSymbolDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (symbol: string, exchange: string) => void;
  watchlistId: string;
}

// components/market/CreateWatchlistDialog.tsx
interface CreateWatchlistDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, symbols?: string[]) => void;
}
```

### WebSocket Integration

```typescript
// hooks/useMarketData.ts
import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface MarketQuote {
  symbol: string;
  exchange: string;
  ltp: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: Date;
}

export function useMarketData(symbols: string[]) {
  const [quotes, setQuotes] = useState<Map<string, MarketQuote>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3006', {
      auth: { token: getAccessToken() },
    });

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    
    socket.on('quote', (quote: MarketQuote) => {
      setQuotes(prev => new Map(prev).set(`${quote.exchange}:${quote.symbol}`, quote));
    });

    socketRef.current = socket;
    return () => { socket.disconnect(); };
  }, []);

  useEffect(() => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('subscribe', symbols);
      return () => socketRef.current?.emit('unsubscribe', symbols);
    }
  }, [symbols, isConnected]);

  return { quotes, isConnected };
}

// hooks/usePriceAlerts.ts
export function usePriceAlerts() {
  const [triggeredAlert, setTriggeredAlert] = useState<PriceAlert | null>(null);

  useEffect(() => {
    const socket = getSocket();
    socket?.on('alert:triggered', (alert: PriceAlert) => {
      setTriggeredAlert(alert);
      // Show notification
      if (Notification.permission === 'granted') {
        new Notification('Price Alert Triggered', {
          body: `${alert.symbol} ${alert.condition} ₹${alert.price}`,
          icon: '/icons/alert.png',
        });
      }
    });
  }, []);

  return { triggeredAlert, clearAlert: () => setTriggeredAlert(null) };
}
```

### TradingView Lightweight Charts

```typescript
// components/market/TradingViewChart.tsx
import { createChart, IChartApi, CandlestickSeries } from 'lightweight-charts';

export function TradingViewChart({ 
  symbol, 
  exchange, 
  interval = '1d',
  height = 400 
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#333',
      },
      grid: {
        vertLines: { color: '#f0f0f0' },
        horzLines: { color: '#f0f0f0' },
      },
      rightPriceScale: { borderColor: '#e0e0e0' },
      timeScale: { borderColor: '#e0e0e0' },
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#2E7D32',
      downColor: '#D32F2F',
      borderUpColor: '#2E7D32',
      borderDownColor: '#D32F2F',
      wickUpColor: '#2E7D32',
      wickDownColor: '#D32F2F',
    });

    // Fetch historical data
    fetchCandles(symbol, exchange, interval).then(data => {
      candlestickSeries.setData(data);
    });

    // Subscribe to real-time updates
    const socket = getSocket();
    socket?.on('candle', (candle) => {
      if (candle.symbol === symbol) {
        candlestickSeries.update(candle);
      }
    });

    chartRef.current = chart;
    return () => chart.remove();
  }, [symbol, exchange, interval, height]);

  return <div ref={containerRef} />;
}
```

### API Calls

```typescript
// Market Data APIs
// GET /api/v1/market/indices
// GET /api/v1/market/quotes?symbols=RELIANCE,TCS,INFY
// GET /api/v1/market/candles?symbol=RELIANCE&exchange=NSE&interval=1d&from=&to=
// GET /api/v1/market/search?q=REL

// Watchlist APIs  
// GET /api/v1/watchlists
// POST /api/v1/watchlists
// PUT /api/v1/watchlists/:id
// DELETE /api/v1/watchlists/:id
// POST /api/v1/watchlists/:id/symbols
// DELETE /api/v1/watchlists/:id/symbols/:symbol

// Alerts APIs
// GET /api/v1/alerts
// POST /api/v1/alerts
// PUT /api/v1/alerts/:id
// DELETE /api/v1/alerts/:id

// RTK Query
export const marketApi = createApi({
  reducerPath: 'marketApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/v1/market' }),
  tagTypes: ['Watchlist', 'Alert'],
  endpoints: (builder) => ({
    getIndices: builder.query<Index[], void>({
      query: () => '/indices',
    }),
    getQuotes: builder.query<MarketQuote[], string[]>({
      query: (symbols) => `/quotes?symbols=${symbols.join(',')}`,
    }),
    searchSymbols: builder.query<SearchResult[], string>({
      query: (q) => `/search?q=${q}`,
    }),
    getCandles: builder.query<Candle[], CandleParams>({
      query: ({ symbol, exchange, interval, from, to }) => 
        `/candles?symbol=${symbol}&exchange=${exchange}&interval=${interval}&from=${from}&to=${to}`,
    }),
  }),
});
```

### Responsive Rules

| Breakpoint | Changes |
|------------|---------|
| xs | 2 indices visible, horizontal scroll, simplified table columns |
| sm | 2x2 indices grid, watchlist as cards instead of table |
| md | 4 indices, full table, collapsible detail panel |
| lg+ | Full layout, side-by-side panels, sector heatmap visible |

### Real-time Updates Optimization

```typescript
// Throttle UI updates for performance
const throttledSetQuotes = useMemo(
  () => throttle((newQuotes: Map<string, MarketQuote>) => {
    setQuotes(newQuotes);
  }, 100), // Update UI max 10 times/second
  []
);

// Virtual scrolling for large watchlists
import { FixedSizeList as List } from 'react-window';

<List
  height={500}
  itemCount={symbols.length}
  itemSize={48}
  width="100%"
>
  {({ index, style }) => (
    <WatchlistRow 
      key={symbols[index].symbol}
      data={symbols[index]}
      style={style}
    />
  )}
</List>
```

---

## Page 10: Broker Connect

### Route: `/broker`

### Layout
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ HEADER + SIDEBAR                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Broker Integration                                                           │
│                                                                               │
│  CONNECTED BROKERS                                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ ┌─────────────────────────────────┐  ┌─────────────────────────────────┐ │ │
│  │ │  🟢 Zerodha (Kite Connect)      │  │  ⚪ Angel One                   │ │ │
│  │ │                                 │  │                                 │ │ │
│  │ │  Status: Connected              │  │  Status: Not Connected          │ │ │
│  │ │  Client ID: AB1234              │  │                                 │ │ │
│  │ │  Connected: Nov 15, 2024        │  │  [Connect with Angel One]       │ │ │
│  │ │  Last Sync: Nov 29, 10:30 AM    │  │                                 │ │ │
│  │ │                                 │  │                                 │ │ │
│  │ │  [Sync Now] [Disconnect]        │  └─────────────────────────────────┘ │ │
│  │ └─────────────────────────────────┘                                      │ │
│  │ ┌─────────────────────────────────┐  ┌─────────────────────────────────┐ │ │
│  │ │  ⚪ Upstox                       │  │  ⚪ Groww                        │ │ │
│  │ │                                 │  │                                 │ │ │
│  │ │  Status: Not Connected          │  │  Status: Not Connected          │ │ │
│  │ │                                 │  │                                 │ │ │
│  │ │  [Connect with Upstox]          │  │  [Connect with Groww]           │ │ │
│  │ │                                 │  │                                 │ │ │
│  │ └─────────────────────────────────┘  └─────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  SYNC SETTINGS (For Connected Broker)                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                          │ │
│  │  Auto-Sync Trades        [✓] Enabled                                    │ │
│  │  Sync Frequency          [Every 15 minutes ▼]                           │ │
│  │  Sync Start Date         [📅 Nov 1, 2024]                               │ │
│  │                                                                          │ │
│  │  Include Segments:                                                       │ │
│  │  [✓] Equity    [✓] F&O    [✓] Commodity    [ ] Currency                 │ │
│  │                                                                          │ │
│  │  Conflict Resolution     [Keep Manual Entry ▼]                          │ │
│  │                           Options: Keep Manual / Override / Ask Each    │ │
│  │                                                                          │ │
│  │  [Save Settings]                                                         │ │
│  │                                                                          │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  SYNC HISTORY                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                          │ │
│  │  Date/Time           Broker    Trades    Status     Duration             │ │
│  │  ───────────────────────────────────────────────────────────────────────  │ │
│  │  Nov 29, 10:30 AM    Zerodha   +12       ✅ Success   2.3s               │ │
│  │  Nov 29, 10:15 AM    Zerodha   +8        ✅ Success   1.8s               │ │
│  │  Nov 29, 10:00 AM    Zerodha   +5        ✅ Success   1.5s               │ │
│  │  Nov 28, 03:30 PM    Zerodha   +45       ✅ Success   8.2s               │ │
│  │  Nov 28, 03:15 PM    Zerodha   0         ⚠️ Warning   0.8s  [View]       │ │
│  │  Nov 28, 03:00 PM    Zerodha   +23       ❌ Failed    ---   [Retry]      │ │
│  │                                                                          │ │
│  │  ◀ 1 2 3 ▶                                           [Export Log]       │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  PENDING TRADE IMPORTS (Conflicts)                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                          │ │
│  │  3 trades need your attention                                            │ │
│  │                                                                          │ │
│  │  ┌───────────────────────────────────────────────────────────────────┐   │ │
│  │  │ RELIANCE Buy @ ₹2,450 x 50                Nov 28, 2024            │   │ │
│  │  │                                                                    │   │ │
│  │  │ Existing: Entry ₹2,448, Qty 50 (Manual)                           │   │ │
│  │  │ Imported: Entry ₹2,450, Qty 50 (Zerodha)                          │   │ │
│  │  │                                                                    │   │ │
│  │  │ [Keep Existing] [Use Imported] [Merge] [Skip]                     │   │ │
│  │  └───────────────────────────────────────────────────────────────────┘   │ │
│  │                                                                          │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Components

```typescript
// components/broker/BrokerCard.tsx
interface BrokerCardProps {
  broker: {
    id: string;
    name: string;
    logo: string;
    connected: boolean;
    clientId?: string;
    connectedAt?: Date;
    lastSyncAt?: Date;
  };
  onConnect: () => void;
  onDisconnect: () => void;
  onSync: () => void;
}

// components/broker/SyncSettingsForm.tsx
interface SyncSettingsFormProps {
  settings: BrokerSyncSettings;
  onSave: (settings: BrokerSyncSettings) => void;
}

interface BrokerSyncSettings {
  autoSync: boolean;
  frequency: '5m' | '15m' | '30m' | '1h' | 'manual';
  startDate: Date;
  segments: ('equity' | 'futures' | 'options' | 'commodity' | 'currency')[];
  conflictResolution: 'keep_manual' | 'override' | 'ask';
}

// components/broker/SyncHistoryTable.tsx
interface SyncHistoryTableProps {
  history: SyncLog[];
  onRetry: (logId: string) => void;
  onViewDetails: (logId: string) => void;
}

// components/broker/TradeConflictCard.tsx
interface TradeConflictCardProps {
  conflict: {
    existingTrade: Trade;
    importedTrade: Trade;
    broker: string;
  };
  onResolve: (resolution: 'keep' | 'override' | 'merge' | 'skip') => void;
}

// components/broker/OAuthDialog.tsx
interface OAuthDialogProps {
  broker: string;
  authUrl: string;
  onSuccess: (code: string) => void;
  onCancel: () => void;
}
```

### OAuth Flow

```typescript
// OAuth connection flow
const connectBroker = async (broker: string) => {
  // 1. Get authorization URL
  const { authUrl, state } = await brokerApi.getAuthUrl(broker);
  
  // 2. Store state in sessionStorage for verification
  sessionStorage.setItem('oauth_state', state);
  
  // 3. Open popup window
  const popup = window.open(
    authUrl,
    'broker_auth',
    'width=600,height=700,menubar=no,toolbar=no'
  );
  
  // 4. Listen for callback
  window.addEventListener('message', async (event) => {
    if (event.origin !== window.location.origin) return;
    
    const { code, state: returnedState, error } = event.data;
    
    if (error) {
      toast.error(`Connection failed: ${error}`);
      return;
    }
    
    if (returnedState !== sessionStorage.getItem('oauth_state')) {
      toast.error('Invalid state parameter');
      return;
    }
    
    // 5. Exchange code for token (backend handles this)
    await brokerApi.connect({ broker, code });
    toast.success(`Connected to ${broker}!`);
    refetchBrokers();
  });
};

// OAuth callback page: /api/auth/callback/[broker]
export default function BrokerCallback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');
    
    window.opener?.postMessage({ code, state, error }, window.location.origin);
    window.close();
  }, []);
  
  return <div>Connecting...</div>;
}
```

### API Calls

```typescript
// Broker APIs
// GET /api/v1/broker/supported - List supported brokers
// GET /api/v1/broker/connections - Get user's connected brokers
// GET /api/v1/broker/auth-url/:broker - Get OAuth URL
// POST /api/v1/broker/connect - Complete OAuth flow
// DELETE /api/v1/broker/disconnect/:broker - Disconnect broker

// Sync APIs
// POST /api/v1/sync/trigger - Trigger manual sync
// GET /api/v1/sync/status - Get current sync status
// GET /api/v1/sync/history - Get sync history
// GET /api/v1/sync/conflicts - Get pending conflicts
// POST /api/v1/sync/resolve - Resolve conflict

// Settings APIs
// GET /api/v1/broker/settings/:broker
// PUT /api/v1/broker/settings/:broker

// RTK Query
export const brokerApi = createApi({
  reducerPath: 'brokerApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/v1/broker' }),
  tagTypes: ['Broker', 'SyncHistory', 'Conflicts'],
  endpoints: (builder) => ({
    getConnections: builder.query<BrokerConnection[], void>({
      query: () => '/connections',
      providesTags: ['Broker'],
    }),
    getAuthUrl: builder.mutation<{ authUrl: string; state: string }, string>({
      query: (broker) => ({ url: `/auth-url/${broker}`, method: 'GET' }),
    }),
    connect: builder.mutation<void, { broker: string; code: string }>({
      query: (body) => ({ url: '/connect', method: 'POST', body }),
      invalidatesTags: ['Broker'],
    }),
    disconnect: builder.mutation<void, string>({
      query: (broker) => ({ url: `/disconnect/${broker}`, method: 'DELETE' }),
      invalidatesTags: ['Broker'],
    }),
    triggerSync: builder.mutation<SyncResult, string>({
      query: (broker) => ({ url: '/sync/trigger', method: 'POST', body: { broker } }),
      invalidatesTags: ['SyncHistory'],
    }),
    getSyncHistory: builder.query<SyncLog[], { broker?: string; page?: number }>({
      query: ({ broker, page = 1 }) => `/sync/history?broker=${broker}&page=${page}`,
      providesTags: ['SyncHistory'],
    }),
    getConflicts: builder.query<TradeConflict[], void>({
      query: () => '/sync/conflicts',
      providesTags: ['Conflicts'],
    }),
    resolveConflict: builder.mutation<void, { conflictId: string; resolution: string }>({
      query: (body) => ({ url: '/sync/resolve', method: 'POST', body }),
      invalidatesTags: ['Conflicts'],
    }),
  }),
});
```

### Responsive Rules

| Breakpoint | Changes |
|------------|---------|
| xs | Single column broker cards, simplified sync history |
| sm | 2-column broker grid |
| md | Full layout with side-by-side settings and history |
| lg+ | Full layout, expanded conflict view |

---

## Page 11: Settings

### Route: `/settings`

### Layout
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ HEADER + SIDEBAR                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Settings                                                                     │
│                                                                               │
│  ┌─────────────────┬───────────────────────────────────────────────────────┐ │
│  │ SETTINGS NAV    │  PROFILE                                              │ │
│  │                 │                                                        │ │
│  │ ▶ Profile      │  ┌─────────────────────────────────────────────────┐   │ │
│  │   Preferences  │  │  👤 Profile Picture                             │   │ │
│  │   Trading      │  │  ┌────┐                                         │   │ │
│  │   Notifications│  │  │    │  [Upload New] [Remove]                  │   │ │
│  │   Security     │  │  └────┘                                         │   │ │
│  │   Data & Export│  └─────────────────────────────────────────────────┘   │ │
│  │   Danger Zone  │                                                        │ │
│  │                 │  Full Name                                            │ │
│  │                 │  ┌─────────────────────────────────────────────────┐   │ │
│  │                 │  │ Rahul Sharma                                    │   │ │
│  │                 │  └─────────────────────────────────────────────────┘   │ │
│  │                 │                                                        │ │
│  │                 │  Email                                                 │ │
│  │                 │  ┌─────────────────────────────────────────────────┐   │ │
│  │                 │  │ rahul@example.com                    ✓ Verified │   │ │
│  │                 │  └─────────────────────────────────────────────────┘   │ │
│  │                 │                                                        │ │
│  │                 │  Phone                                                 │ │
│  │                 │  ┌─────────────────────────────────────────────────┐   │ │
│  │                 │  │ +91 98765 43210                      [Verify]   │   │ │
│  │                 │  └─────────────────────────────────────────────────┘   │ │
│  │                 │                                                        │ │
│  │                 │  [Save Changes]                                        │ │
│  │                 │                                                        │ │
│  └─────────────────┴───────────────────────────────────────────────────────┘ │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│  PREFERENCES                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                          │ │
│  │  Appearance                                                              │ │
│  │  ───────────────────────────────────────────────────────────────────────  │ │
│  │  Theme              [○ Light   ● Dark   ○ System]                       │ │
│  │  Accent Color       [🔵 Blue ▼]                                         │ │
│  │                                                                          │ │
│  │  Regional                                                                │ │
│  │  ───────────────────────────────────────────────────────────────────────  │ │
│  │  Language           [English (India) ▼]                                 │ │
│  │  Currency           [₹ INR ▼]                                           │ │
│  │  Date Format        [DD/MM/YYYY ▼]                                      │ │
│  │  Time Format        [12-hour ▼]                                         │ │
│  │  Timezone           [Asia/Kolkata (IST) ▼]                              │ │
│  │                                                                          │ │
│  │  Numbers                                                                 │ │
│  │  ───────────────────────────────────────────────────────────────────────  │ │
│  │  Number Format      [Indian (1,00,000) ▼]                               │ │
│  │  Decimal Places     [2 ▼]                                               │ │
│  │                                                                          │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│  TRADING SETTINGS                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                          │ │
│  │  Defaults                                                                │ │
│  │  ───────────────────────────────────────────────────────────────────────  │ │
│  │  Default Exchange      [NSE ▼]                                          │ │
│  │  Default Segment       [Equity ▼]                                       │ │
│  │  Default Trade Type    [Intraday ▼]                                     │ │
│  │  Default Position      [Long ▼]                                         │ │
│  │                                                                          │ │
│  │  Brokerage Calculation                                                   │ │
│  │  ───────────────────────────────────────────────────────────────────────  │ │
│  │  [✓] Auto-calculate brokerage                                           │ │
│  │                                                                          │ │
│  │  Brokerage Rates (per trade)                                            │ │
│  │  Equity Intraday:    [₹ 20    ] or [0.03%], whichever is lower          │ │
│  │  Equity Delivery:    [₹ 0     ] (Free)                                  │ │
│  │  F&O:                [₹ 20    ] per lot                                 │ │
│  │                                                                          │ │
│  │  Tax Rates                                                               │ │
│  │  ───────────────────────────────────────────────────────────────────────  │ │
│  │  STT (Equity):       [0.1%   ] (Sell side)                              │ │
│  │  STT (F&O):          [0.05%  ]                                          │ │
│  │  GST:                [18%    ] (on brokerage)                           │ │
│  │  Stamp Duty:         [0.003% ] (Buy side)                               │ │
│  │  Exchange Txn:       [0.00325%]                                         │ │
│  │  SEBI Charges:       [0.0001%]                                          │ │
│  │                                                                          │ │
│  │  Risk Management                                                         │ │
│  │  ───────────────────────────────────────────────────────────────────────  │ │
│  │  Default Risk %:     [2%    ] per trade                                 │ │
│  │  Max Daily Loss:     [₹ 10,000 ]                                        │ │
│  │  Daily Trade Limit:  [20    ] trades                                    │ │
│  │                                                                          │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│  NOTIFICATIONS                                                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                          │ │
│  │  Email Notifications                                                     │ │
│  │  ───────────────────────────────────────────────────────────────────────  │ │
│  │  [✓] Daily P&L Summary              (Sent at 4:00 PM)                   │ │
│  │  [✓] Weekly Performance Report      (Sent every Sunday)                 │ │
│  │  [ ] Trade Confirmations            (Each trade)                        │ │
│  │  [✓] Price Alerts                   (When triggered)                    │ │
│  │  [✓] Broker Sync Issues             (On failure)                        │ │
│  │                                                                          │ │
│  │  Push Notifications                                                      │ │
│  │  ───────────────────────────────────────────────────────────────────────  │ │
│  │  [✓] Price Alerts                                                       │ │
│  │  [✓] Target/Stop Loss Hit                                               │ │
│  │  [✓] Daily Limit Warnings                                               │ │
│  │  [ ] Market Open/Close                                                  │ │
│  │                                                                          │ │
│  │  [Request Permission] (if not granted)                                  │ │
│  │                                                                          │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│  SECURITY                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                          │ │
│  │  Change Password                                                         │ │
│  │  ───────────────────────────────────────────────────────────────────────  │ │
│  │  Current Password    [••••••••••••]                                     │ │
│  │  New Password        [••••••••••••]   Strength: ████░░░░ Good           │ │
│  │  Confirm Password    [••••••••••••]                                     │ │
│  │  [Update Password]                                                       │ │
│  │                                                                          │ │
│  │  Two-Factor Authentication                                               │ │
│  │  ───────────────────────────────────────────────────────────────────────  │ │
│  │  Status: ✅ Enabled                                                      │ │
│  │  Method: Authenticator App                                               │ │
│  │  [Disable 2FA] [Generate Backup Codes]                                  │ │
│  │                                                                          │ │
│  │  Active Sessions                                                         │ │
│  │  ───────────────────────────────────────────────────────────────────────  │ │
│  │  🖥️ Windows 11 - Chrome (Current)   Mumbai, IN   Nov 29, 10:30 AM       │ │
│  │  📱 iPhone 14 - Safari               Mumbai, IN   Nov 28, 8:15 PM  [✕]   │ │
│  │  💻 MacBook Pro - Firefox            Delhi, IN    Nov 25, 2:30 PM  [✕]   │ │
│  │                                                                          │ │
│  │  [Revoke All Other Sessions]                                             │ │
│  │                                                                          │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│  DATA & EXPORT                                                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                          │ │
│  │  Export Data                                                             │ │
│  │  ───────────────────────────────────────────────────────────────────────  │ │
│  │  Export Format:      [CSV ▼]  (CSV, Excel, JSON)                        │ │
│  │  Date Range:         [All Time ▼]                                       │ │
│  │                                                                          │ │
│  │  Include:                                                                │ │
│  │  [✓] Trades          [✓] Analytics     [ ] Settings                     │ │
│  │  [✓] Watchlists      [ ] Alerts                                         │ │
│  │                                                                          │ │
│  │  [Download Export]                                                       │ │
│  │                                                                          │ │
│  │  Import Data                                                             │ │
│  │  ───────────────────────────────────────────────────────────────────────  │ │
│  │  Supported formats: CSV (Zerodha, Angel One, Custom)                    │ │
│  │  [Choose File] or drag & drop                                           │ │
│  │                                                                          │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│  DANGER ZONE                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                          │ │
│  │  ⚠️ These actions are irreversible                                       │ │
│  │                                                                          │ │
│  │  Delete All Trades                                                       │ │
│  │  Permanently delete all trade records. Analytics will be reset.         │ │
│  │  [Delete All Trades]                                                     │ │
│  │                                                                          │ │
│  │  Delete Account                                                          │ │
│  │  Permanently delete your account and all associated data.               │ │
│  │  [Delete Account]                                                        │ │
│  │                                                                          │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Components

```typescript
// components/settings/SettingsNav.tsx
interface SettingsNavProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const sections = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'preferences', label: 'Preferences', icon: Palette },
  { id: 'trading', label: 'Trading', icon: TrendingUp },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'data', label: 'Data & Export', icon: Download },
  { id: 'danger', label: 'Danger Zone', icon: AlertTriangle },
];

// components/settings/ProfileForm.tsx
interface ProfileFormProps {
  user: User;
  onSave: (data: ProfileData) => void;
}

// components/settings/PreferencesForm.tsx
interface PreferencesFormProps {
  preferences: UserPreferences;
  onSave: (preferences: UserPreferences) => void;
}

// components/settings/TradingSettingsForm.tsx
interface TradingSettingsFormProps {
  settings: TradingSettings;
  onSave: (settings: TradingSettings) => void;
}

// components/settings/NotificationSettings.tsx
interface NotificationSettingsProps {
  settings: NotificationSettings;
  onSave: (settings: NotificationSettings) => void;
  onRequestPermission: () => void;
}

// components/settings/SecuritySettings.tsx
interface SecuritySettingsProps {
  user: User;
  sessions: Session[];
  onChangePassword: (data: PasswordChangeData) => void;
  onToggle2FA: () => void;
  onRevokeSession: (sessionId: string) => void;
  onRevokeAll: () => void;
}

// components/settings/DataExport.tsx
interface DataExportProps {
  onExport: (options: ExportOptions) => void;
  onImport: (file: File) => void;
}

// components/settings/DangerZone.tsx
interface DangerZoneProps {
  onDeleteTrades: () => void;
  onDeleteAccount: () => void;
}

// components/settings/ConfirmDialog.tsx
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText: string;
  confirmColor?: 'error' | 'warning' | 'primary';
  requireTyping?: string; // "DELETE" to confirm
  onConfirm: () => void;
  onCancel: () => void;
}
```

### API Calls

```typescript
// Profile APIs
// GET /api/v1/users/profile
// PUT /api/v1/users/profile
// POST /api/v1/users/upload-avatar
// DELETE /api/v1/users/avatar

// Preferences APIs
// GET /api/v1/users/preferences
// PUT /api/v1/users/preferences

// Security APIs
// POST /api/v1/auth/change-password
// POST /api/v1/auth/enable-2fa
// POST /api/v1/auth/disable-2fa
// GET /api/v1/auth/sessions
// DELETE /api/v1/auth/sessions/:id
// DELETE /api/v1/auth/sessions (revoke all)

// Data APIs
// POST /api/v1/data/export
// POST /api/v1/data/import
// DELETE /api/v1/trades (delete all)
// DELETE /api/v1/users/account

// RTK Query
export const settingsApi = createApi({
  reducerPath: 'settingsApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/v1' }),
  tagTypes: ['Profile', 'Preferences', 'Sessions'],
  endpoints: (builder) => ({
    getProfile: builder.query<User, void>({
      query: () => '/users/profile',
      providesTags: ['Profile'],
    }),
    updateProfile: builder.mutation<User, Partial<User>>({
      query: (body) => ({ url: '/users/profile', method: 'PUT', body }),
      invalidatesTags: ['Profile'],
    }),
    getPreferences: builder.query<UserPreferences, void>({
      query: () => '/users/preferences',
      providesTags: ['Preferences'],
    }),
    updatePreferences: builder.mutation<UserPreferences, Partial<UserPreferences>>({
      query: (body) => ({ url: '/users/preferences', method: 'PUT', body }),
      invalidatesTags: ['Preferences'],
    }),
    getSessions: builder.query<Session[], void>({
      query: () => '/auth/sessions',
      providesTags: ['Sessions'],
    }),
    revokeSession: builder.mutation<void, string>({
      query: (id) => ({ url: `/auth/sessions/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Sessions'],
    }),
    changePassword: builder.mutation<void, PasswordChangeData>({
      query: (body) => ({ url: '/auth/change-password', method: 'POST', body }),
    }),
    exportData: builder.mutation<Blob, ExportOptions>({
      query: (options) => ({
        url: '/data/export',
        method: 'POST',
        body: options,
        responseHandler: (response) => response.blob(),
      }),
    }),
  }),
});
```

### Form Schemas

```typescript
// Profile Form
const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  phone: z.string().regex(/^\+91\d{10}$/, 'Invalid phone number').optional(),
});

// Preferences Form
const preferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  accentColor: z.string(),
  language: z.string(),
  currency: z.string(),
  dateFormat: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']),
  timeFormat: z.enum(['12', '24']),
  timezone: z.string(),
  numberFormat: z.enum(['indian', 'international']),
  decimalPlaces: z.number().min(0).max(4),
});

// Trading Settings Form
const tradingSettingsSchema = z.object({
  defaultExchange: z.enum(['NSE', 'BSE', 'MCX', 'NFO']),
  defaultSegment: z.enum(['equity', 'futures', 'options', 'commodity']),
  defaultTradeType: z.enum(['intraday', 'delivery', 'swing']),
  defaultPosition: z.enum(['long', 'short']),
  autoCalculateBrokerage: z.boolean(),
  brokerageRates: z.object({
    equityIntraday: z.number(),
    equityDelivery: z.number(),
    fno: z.number(),
  }),
  taxRates: z.object({
    stt: z.number(),
    gst: z.number(),
    stampDuty: z.number(),
    exchangeTxn: z.number(),
    sebi: z.number(),
  }),
  riskManagement: z.object({
    defaultRiskPercent: z.number().min(0).max(100),
    maxDailyLoss: z.number().min(0),
    dailyTradeLimit: z.number().min(1),
  }),
});

// Password Change Form
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/[0-9]/, 'Must contain number')
    .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});
```

### Responsive Rules

| Breakpoint | Changes |
|------------|---------|
| xs | Stacked layout, nav becomes top tabs, smaller forms |
| sm | Side nav visible but narrow, full-width forms |
| md | Full side nav, two-column layout for some sections |
| lg+ | Full layout, spacious forms with help text |

---

## Common Components Library

### Layout Components

```typescript
// components/layout/Header.tsx
interface HeaderProps {
  user: User;
  onMenuToggle: () => void;
  onNotificationClick: () => void;
  onProfileClick: () => void;
}

// Features:
// - App logo/name
// - Search bar (global symbol search)
// - Notification bell with badge
// - User avatar with dropdown menu
// - Theme toggle

// components/layout/Sidebar.tsx
interface SidebarProps {
  isOpen: boolean;
  currentPath: string;
  onClose: () => void;
}

const menuItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/trades', label: 'Trades', icon: LineChart },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/market', label: 'Market', icon: TrendingUp },
  { path: '/broker', label: 'Broker', icon: Link2 },
  { path: '/settings', label: 'Settings', icon: Settings },
];

// components/layout/PageHeader.tsx
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}
```

### UI Components

```typescript
// components/ui/StatCard.tsx
interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  color?: 'primary' | 'success' | 'error' | 'warning';
  loading?: boolean;
  onClick?: () => void;
}

// components/ui/DataTable.tsx
interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  sorting?: {
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    onSort: (column: string) => void;
  };
  selection?: {
    selected: string[];
    onSelect: (ids: string[]) => void;
  };
  rowActions?: (row: T) => React.ReactNode;
  emptyState?: React.ReactNode;
}

// components/ui/FilterBar.tsx
interface FilterBarProps {
  filters: FilterConfig[];
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  onReset: () => void;
}

// components/ui/DateRangePicker.tsx
interface DateRangePickerProps {
  value: { from: Date; to: Date };
  onChange: (range: { from: Date; to: Date }) => void;
  presets?: { label: string; value: { from: Date; to: Date } }[];
}

// components/ui/ConfirmDialog.tsx
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'info' | 'warning' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

// components/ui/EmptyState.tsx
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// components/ui/LoadingState.tsx
interface LoadingStateProps {
  variant?: 'spinner' | 'skeleton' | 'pulse';
  text?: string;
}

// components/ui/ErrorState.tsx
interface ErrorStateProps {
  error: Error | string;
  onRetry?: () => void;
}
```

### Form Components

```typescript
// components/form/FormField.tsx
interface FormFieldProps {
  name: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'password' | 'select' | 'date' | 'checkbox';
  placeholder?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  options?: { value: string; label: string }[]; // for select
}

// components/form/SymbolAutocomplete.tsx
interface SymbolAutocompleteProps {
  value: string;
  onChange: (symbol: string, exchange?: string) => void;
  placeholder?: string;
  exchanges?: string[];
}

// Features:
// - Debounced search API call
// - Show symbol, name, exchange
// - Recent searches
// - Keyboard navigation

// components/form/PriceInput.tsx
interface PriceInputProps {
  value: number;
  onChange: (value: number) => void;
  currency?: string;
  decimalPlaces?: number;
}
```

### Chart Components

```typescript
// components/charts/MiniSparkline.tsx
interface MiniSparklineProps {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
}

// components/charts/PnLChart.tsx
interface PnLChartProps {
  data: { date: string; pnl: number; cumulative: number }[];
  height?: number;
  showCumulative?: boolean;
}

// components/charts/DonutChart.tsx
interface DonutChartProps {
  data: { name: string; value: number; color?: string }[];
  centerLabel?: string;
  centerValue?: string;
}

// components/charts/BarChart.tsx
interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  orientation?: 'horizontal' | 'vertical';
  showLabels?: boolean;
}
```

---

## Navigation & Routing

### Route Structure

```
/                       → Dashboard (protected)
/login                  → Login Page
/register               → Registration Page
/forgot-password        → Forgot Password
/reset-password/:token  → Reset Password

/trades                 → Trade List (protected)
/trades/new             → Add New Trade (protected)
/trades/:id             → Trade Detail (protected)
/trades/:id/edit        → Edit Trade (protected)

/analytics              → Analytics Dashboard (protected)

/market                 → Market Dashboard (protected)

/broker                 → Broker Integration (protected)

/settings               → Settings (protected)
/settings/profile       → Profile Settings
/settings/preferences   → Preferences
/settings/trading       → Trading Settings
/settings/notifications → Notification Settings
/settings/security      → Security Settings
/settings/data          → Data & Export
```

### Protected Routes

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password'];

export function middleware(request: NextRequest) {
  const token = request.cookies.get('accessToken')?.value;
  const { pathname } = request.nextUrl;
  
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
  
  if (!token && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  if (token && isPublicPath) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

### Navigation State

```typescript
// store/slices/navigationSlice.ts
interface NavigationState {
  sidebarOpen: boolean;
  currentPath: string;
  breadcrumbs: { label: string; href?: string }[];
  recentPages: string[];
}

const navigationSlice = createSlice({
  name: 'navigation',
  initialState: {
    sidebarOpen: true,
    currentPath: '/',
    breadcrumbs: [],
    recentPages: [],
  },
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action) => {
      state.sidebarOpen = action.payload;
    },
    setCurrentPath: (state, action) => {
      state.currentPath = action.payload;
      // Add to recent pages
      if (!state.recentPages.includes(action.payload)) {
        state.recentPages = [action.payload, ...state.recentPages.slice(0, 4)];
      }
    },
    setBreadcrumbs: (state, action) => {
      state.breadcrumbs = action.payload;
    },
  },
});
```

---

## State Management

### Redux Store Structure

```typescript
// store/store.ts
import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';

// API slices
import { authApi } from '@/features/auth/authApi';
import { tradeApi } from '@/features/trades/tradeApi';
import { analyticsApi } from '@/features/analytics/analyticsApi';
import { marketApi } from '@/features/market/marketApi';
import { brokerApi } from '@/features/broker/brokerApi';
import { settingsApi } from '@/features/settings/settingsApi';

// Regular slices
import authReducer from '@/features/auth/authSlice';
import navigationReducer from '@/store/slices/navigationSlice';
import marketDataReducer from '@/features/market/marketDataSlice';

export const store = configureStore({
  reducer: {
    // API reducers
    [authApi.reducerPath]: authApi.reducer,
    [tradeApi.reducerPath]: tradeApi.reducer,
    [analyticsApi.reducerPath]: analyticsApi.reducer,
    [marketApi.reducerPath]: marketApi.reducer,
    [brokerApi.reducerPath]: brokerApi.reducer,
    [settingsApi.reducerPath]: settingsApi.reducer,
    
    // Regular reducers
    auth: authReducer,
    navigation: navigationReducer,
    marketData: marketDataReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(authApi.middleware)
      .concat(tradeApi.middleware)
      .concat(analyticsApi.middleware)
      .concat(marketApi.middleware)
      .concat(brokerApi.middleware)
      .concat(settingsApi.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### Auth State

```typescript
// features/auth/authSlice.ts
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  },
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      state.isLoading = false;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
  },
});
```

### Market Data State (Real-time)

```typescript
// features/market/marketDataSlice.ts
interface MarketDataState {
  quotes: Record<string, MarketQuote>;
  indices: Record<string, IndexData>;
  isConnected: boolean;
  lastUpdate: string | null;
}

const marketDataSlice = createSlice({
  name: 'marketData',
  initialState: {
    quotes: {},
    indices: {},
    isConnected: false,
    lastUpdate: null,
  },
  reducers: {
    setConnected: (state, action) => {
      state.isConnected = action.payload;
    },
    updateQuote: (state, action) => {
      const quote = action.payload;
      state.quotes[`${quote.exchange}:${quote.symbol}`] = quote;
      state.lastUpdate = new Date().toISOString();
    },
    updateQuotes: (state, action) => {
      action.payload.forEach((quote: MarketQuote) => {
        state.quotes[`${quote.exchange}:${quote.symbol}`] = quote;
      });
      state.lastUpdate = new Date().toISOString();
    },
    updateIndex: (state, action) => {
      const index = action.payload;
      state.indices[index.symbol] = index;
    },
  },
});
```

---

## Summary

### Pages Covered

| # | Page | Route | Key Features |
|---|------|-------|--------------|
| 1 | Login | `/login` | Email/password auth, Google OAuth, Remember me |
| 2 | Register | `/register` | Multi-step form, email verification |
| 3 | Forgot Password | `/forgot-password` | Email-based password reset |
| 4 | Dashboard | `/` | Summary cards, P&L chart, recent trades |
| 5 | Trade List | `/trades` | DataTable, filters, bulk actions |
| 6 | Add/Edit Trade | `/trades/new`, `/trades/:id/edit` | Multi-step form, symbol search |
| 7 | Trade Detail | `/trades/:id` | Full trade view, P&L breakdown |
| 8 | Analytics | `/analytics` | Performance metrics, charts, heatmaps |
| 9 | Market Dashboard | `/market` | Live prices, watchlists, alerts |
| 10 | Broker Connect | `/broker` | OAuth integration, sync management |
| 11 | Settings | `/settings` | Profile, preferences, security |

### API Integration Summary

| Service | Port | Key Endpoints Used |
|---------|------|-------------------|
| Auth Service | 3001 | Login, register, tokens, sessions |
| Trade Service | 3002 | CRUD trades, summaries, filters |
| Broker Service | 3003 | OAuth, sync, connections |
| Analytics Service | 3004 | Metrics, P&L, trends, breakdown |
| Market Data Service | 3005 | Quotes, candles, search, watchlists |
| WebSocket | 3006 | Real-time quotes, alerts |

### Chart Library Usage

| Chart Type | Library | Usage |
|------------|---------|-------|
| Area Chart | Recharts | Equity curve, P&L trend |
| Bar Chart | Recharts | Monthly P&L, distribution |
| Line Chart | Recharts | Performance trends |
| Pie/Donut | Recharts | Segment breakdown |
| Candlestick | TradingView LWC | Price charts |
| Heatmap | Custom SVG | Trading patterns |
| Sparkline | Recharts | Inline trends |

### Responsive Design Summary

- **Mobile First**: All layouts designed mobile-first
- **Breakpoints**: 5 breakpoints (xs, sm, md, lg, xl)
- **Navigation**: Collapsible sidebar, bottom nav on mobile
- **Tables**: Horizontal scroll on mobile, card view option
- **Charts**: Responsive containers, simplified on mobile
- **Forms**: Full-width inputs, stacked layout on mobile

### Accessibility Considerations

- Semantic HTML elements
- ARIA labels for interactive elements
- Keyboard navigation support
- Color contrast ratios (WCAG AA)
- Focus indicators
- Screen reader friendly charts (data tables fallback)

### Performance Optimizations

- Route-based code splitting
- Image optimization with next/image
- Virtual scrolling for large lists
- Debounced API calls
- WebSocket connection pooling
- Client-side caching with RTK Query

---

## Next Steps

1. **Set up Next.js project** with TypeScript and MUI
2. **Implement authentication** flow and protected routes
3. **Build common components** library
4. **Create feature modules** for each page
5. **Integrate with backend APIs** using RTK Query
6. **Add WebSocket integration** for real-time data
7. **Implement charting** components
8. **Add responsive styling** and dark mode
9. **Write tests** (unit, integration, e2e)
10. **Deploy** with CI/CD pipeline

---

*End of Part 9: Frontend UI/UX Design*
