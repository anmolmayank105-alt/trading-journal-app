# Trading Journal App 📈

A comprehensive trading journal and analytics application for tracking your trades.

## 📁 Project Structure

```
share market app/
│
├── 📂 frontend/          # Next.js Frontend App (Port 3002)
│   ├── src/
│   │   ├── app/          # Pages (dashboard, trades, analytics, etc.)
│   │   ├── components/   # Reusable UI components
│   │   ├── contexts/     # React contexts (Auth, Theme)
│   │   ├── data/         # Static data (Indian stocks list)
│   │   ├── lib/          # Utilities, storage, API functions
│   │   └── types/        # TypeScript types
│   └── public/           # Static assets
│
├── 📂 backend/           # Backend Services
│   ├── auth-service/     # Authentication API (Port 3001)
│   ├── trade-service/    # Trade management API
│   ├── analytics-service/# Analytics calculations
│   ├── broker-service/   # Broker integrations
│   ├── market-data-service/ # Market data APIs
│   └── shared/           # Shared utilities & types
│
├── 📂 docs/              # Documentation
│   ├── INDEX.md          # Documentation index
│   ├── ARCHITECTURE.md   # System architecture
│   └── PART_*.md         # Detailed design documents
│
├── 📂 config/            # Configuration Files
│   ├── docker-compose.yml
│   ├── mongo-init.js
│   ├── tsconfig.json
│   └── .env.example
│
├── 🚀 START.bat          # Quick launcher (Windows)
├── 📄 package.json       # Root dependencies
└── 📄 README.md          # This file
```

---

## 🚀 Quick Start

### Option 1: Use the Launcher (Windows)
Double-click **`START.bat`** and choose an option from the menu.

### Option 2: Manual Start

**Start Frontend:**
```bash
cd frontend
npm run dev
```
Then open 👉 http://localhost:3002

**Start Auth Service (optional, for MongoDB features):**
```bash
cd backend/auth-service
npm start
```
Runs on 👉 http://localhost:3001

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📊 **Dashboard** | Overview with P&L charts and stats |
| 📝 **Trade Journal** | Log trades with entry/exit, stop loss, target |
| 📈 **Analytics** | Win rate, profit factor, symbol analysis |
| 🔍 **Symbol Search** | Search 300+ Indian stocks by name |
| 🌙 **Dark/Light Mode** | Theme support |
| 💾 **Offline First** | Works with localStorage, no backend required |

---

## 📱 Pages

| Page | URL | Description |
|------|-----|-------------|
| Dashboard | `/dashboard` | Stats & charts overview |
| Trades | `/trades` | Add/edit/view all trades |
| Analytics | `/analytics` | Detailed performance analysis |
| Market | `/market` | Market indices & watchlist |
| Settings | `/settings` | Profile, theme, preferences |

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Charts**: Recharts
- **Storage**: localStorage (offline), MongoDB (optional)
- **Backend**: Express.js, Node.js

---

## 📖 Documentation

See the `docs/` folder for detailed documentation:
- `INDEX.md` - Start here
- `ARCHITECTURE.md` - System overview
- `PART_9_FRONTEND_DESIGN.md` - Frontend details

---

Made with ❤️ for traders
