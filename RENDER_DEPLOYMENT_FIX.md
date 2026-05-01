# 🚀 Render Deployment - Fixed Build Process

## Problem Overview

The auth-service deployment on Render was failing with:
```
Cannot find module '../../../shared/dist/utils' or its corresponding type declarations
```

### Root Causes

1. **Missing Monorepo Configuration**: Root `package.json` only had `frontend` as a workspace, not backend services
2. **Build Order Issue**: The `shared` package must be built before any service can compile
3. **No Build Orchestration**: No scripts to build dependencies in the correct order
4. **Incomplete Package Linking**: Backend services weren't properly linked in npm workspaces

---

## ✅ Solution Implemented

### 1. Updated Root `package.json`

Added all backend services as workspaces and created build orchestration scripts:

```json
{
  "workspaces": [
    "frontend",
    "backend/shared",
    "backend/auth-service",
    "backend/broker-service",
    "backend/trade-service",
    "backend/market-data-service",
    "backend/analytics-service"
  ],
  "scripts": {
    "build": "npm run build:frontend",
    "build:all": "npm run build:backend && npm run build:frontend",
    "build:backend": "npm run build:shared && npm run build:services",
    "build:shared": "cd backend/shared && npm run build",
    "build:services": "cd backend/auth-service && npm run build && ...",
    "build:auth": "npm run build:shared && cd backend/auth-service && npm run build",
    "build:broker": "npm run build:shared && cd backend/broker-service && npm run build",
    ...
  }
}
```

### 2. Created `render.yaml`

Defines service deployments with proper build commands that:
- Build the shared package first
- Then build each service individually
- Set correct environment variables

Example for auth-service:
```yaml
- type: web
  name: auth-service
  env: node
  buildCommand: npm install && npm run build:auth
  startCommand: node backend/auth-service/dist/index.js
  healthCheckPath: /health
  envVars:
    - key: NODE_ENV
      value: production
    - key: MONGODB_URI
      sync: false
    - key: JWT_SECRET
      sync: false
    - key: CORS_ORIGIN
      sync: false
```

---

## 🔧 How to Deploy

### Option A: Deploy via render.yaml (Recommended)

1. Push changes to GitHub
2. Connect your Render account
3. Render automatically detects and deploys the services defined in `render.yaml`

```bash
# Local testing before push
npm run build:auth    # Builds shared + auth-service
npm run build:broker  # Builds shared + broker-service
npm run build:trade   # Builds shared + trade-service
```

### Option B: Deploy Individual Services

If deploying one service at a time:

1. **Go to Render Dashboard** → Create New Service
2. **Select GitHub Repository**
3. **Configure Service:**
   - **Name**: `auth-service`
   - **Environment**: Node
   - **Build Command**: 
     ```bash
     npm run build:auth
     ```
   - **Start Command**: 
     ```bash
     node dist/index.js
     ```
   - **Root Directory**: Leave empty (if root scripts work) OR set to `backend/auth-service`

### Option C: Manual Deployment Script

Create a deployment script that Render can execute:

```bash
#!/bin/bash
set -e

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building shared package..."
npm run build:shared

echo "🔨 Building auth-service..."
npm run build:auth

echo "✅ Build complete!"
```

---

## 📋 Environment Variables Needed

Set these on Render for each service:

### Auth Service
- `NODE_ENV`: `production`
- `PORT`: `3001`
- `MONGODB_URI`: Your MongoDB Atlas connection string
- `JWT_SECRET`: Your JWT signing key
- `REDIS_URL`: Your Redis connection URL (optional)

### Example MongoDB URI
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/trading_app?retryWrites=true&w=majority
```

---

## ✔️ Verification Steps

1. **Check build logs** on Render for:
   - ✅ `shared` package builds successfully
   - ✅ `auth-service` finds shared modules
   - ✅ TypeScript compilation completes
   - ✅ Service starts on port 3001

2. **Test deployment**:
   ```bash
   curl https://auth-service.onrender.com/health
   ```

3. **Monitor logs** on Render dashboard

---

## 🔍 Troubleshooting

### Still getting "Cannot find module" errors?

1. **Clear cache on Render**:
   - Go to Settings → Clear Build Cache
   - Retry Deploy

2. **Verify monorepo setup**:
   ```bash
   npm list @stock-tracker/shared
   ```

3. **Check node_modules linking**:
   ```bash
   ls -la backend/auth-service/node_modules/@stock-tracker/
   ```

### Build timeout?

- Increase timeout in Render settings
- Consider building services in separate deployments

### Port conflicts?

- Each service should have a unique port (auth: 3001, broker: 3002, etc.)
- Update environment variables on Render

---

## 📚 File Structure

```
.
├── package.json (root - NEW: with all workspaces)
├── render.yaml (NEW: deployment config)
├── backend/
│   ├── shared/ (builds first)
│   │   ├── package.json
│   │   ├── src/
│   │   └── dist/ (built here)
│   ├── auth-service/ (depends on shared)
│   ├── broker-service/
│   ├── trade-service/
│   ├── market-data-service/
│   └── analytics-service/
└── frontend/
```

---

## 🚀 Next Steps

1. ✅ Push these changes to GitHub
2. ✅ Connect Render to your repo
3. ✅ Services auto-deploy from `render.yaml`
4. ✅ Monitor deployment status in Render dashboard

---

## 💡 Pro Tips

- **Local testing**: `npm run build:auth` before pushing
- **Faster deployments**: Deploy only the changed service
- **Parallel builds**: Use Railway or Render's parallel deployment for faster setup
- **Database**: Use MongoDB Atlas free tier (recommended by Render)
- **Caching**: Enable npm caching in Render for faster rebuilds

