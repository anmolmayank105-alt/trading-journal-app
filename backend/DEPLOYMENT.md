# Backend Deployment Guide

## Recommended Deployment Platforms

### **Option 1: Railway.app (Recommended - Easiest)**
- ✅ Free tier: $5 credit/month
- ✅ Automatic deployments from GitHub
- ✅ Easy environment variables
- ✅ Supports monorepo structure
- ✅ Built-in MongoDB addon (or use MongoDB Atlas)

### **Option 2: Render.com**
- ✅ Free tier available (spins down after inactivity)
- ✅ Easy GitHub integration
- ✅ Good documentation

### **Option 3: Fly.io**
- ✅ Good performance globally
- ✅ Free tier with 3 shared VMs
- ✅ Docker-based deployment

---

## Deployment Steps for Railway.app

### Step 1: Push Backend to GitHub
Make sure your backend code is in a GitHub repository.

### Step 2: Create Railway Account
1. Go to https://railway.app
2. Sign up with GitHub

### Step 3: Deploy Trade Service
1. Click "New Project" → "Deploy from GitHub repo"
2. Select your repository
3. Configure:
   - **Root Directory**: `backend/trade-service`
   - **Build Command**: `cd ../shared && npm install && npm run build && cd ../trade-service && npm install && npm run build`
   - **Start Command**: `npm start`
4. Add Environment Variables:
   ```
   NODE_ENV=production
   PORT=3003
   MONGODB_URI=<your-mongodb-atlas-connection-string>
   JWT_SECRET=<your-secure-secret-key>
   CORS_ORIGIN=https://your-vercel-app.vercel.app
   ```

### Step 4: Deploy Auth Service
1. Click "New Project" → "Deploy from GitHub repo"
2. Select your repository
3. Configure:
   - **Root Directory**: `backend/auth-service`
   - **Build Command**: `cd ../shared && npm install && npm run build && cd ../auth-service && npm install && npm run build`
   - **Start Command**: `npm start`
4. Add Environment Variables:
   ```
   NODE_ENV=production
   PORT=3001
   MONGODB_URI=<your-mongodb-atlas-connection-string>
   JWT_SECRET=<same-secret-as-trade-service>
   CORS_ORIGIN=https://your-vercel-app.vercel.app
   ```

### Step 5: Get Your API URLs
After deployment, Railway gives you URLs like:
- `https://trade-service-xxxxx.up.railway.app`
- `https://auth-service-xxxxx.up.railway.app`

### Step 6: Update Vercel Frontend
Add these environment variables in Vercel:
```
NEXT_PUBLIC_TRADE_API_URL=https://trade-service-xxxxx.up.railway.app
NEXT_PUBLIC_AUTH_API_URL=https://auth-service-xxxxx.up.railway.app
```

---

## Environment Variables Required

### Trade Service
| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `PORT` | Server port | `3003` |
| `MONGODB_URI` | MongoDB connection | `mongodb+srv://user:pass@cluster.mongodb.net/trading_analytics` |
| `JWT_SECRET` | JWT signing key | `your-super-secure-secret-key-min-32-chars` |
| `CORS_ORIGIN` | Frontend URL | `https://your-app.vercel.app` |

### Auth Service
| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `PORT` | Server port | `3001` |
| `MONGODB_URI` | MongoDB connection | Same as trade service |
| `JWT_SECRET` | JWT signing key | Same as trade service |
| `CORS_ORIGIN` | Frontend URL | `https://your-app.vercel.app` |

---

## MongoDB Atlas Setup (Free)

1. Go to https://www.mongodb.com/atlas
2. Create free account
3. Create a free M0 cluster
4. Create database user
5. Whitelist all IPs (0.0.0.0/0) for Railway/Render
6. Get connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/trading_analytics?retryWrites=true&w=majority
   ```

---

## Quick Deploy Scripts

### For Railway CLI
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy Trade Service
cd backend/trade-service
railway init
railway up

# Deploy Auth Service
cd ../auth-service
railway init
railway up
```

---

## Vercel Frontend Update

After deploying backends, update your Vercel environment variables:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   - `NEXT_PUBLIC_API_URL` = `https://your-trade-service.up.railway.app`
   - `NEXT_PUBLIC_AUTH_URL` = `https://your-auth-service.up.railway.app`
3. Redeploy frontend

---

## Health Check URLs

After deployment, verify services are running:
- Trade Service: `https://your-trade-service-url/health`
- Auth Service: `https://your-auth-service-url/health`

Both should return:
```json
{
  "status": "healthy",
  "service": "trade-service",
  "timestamp": "2025-12-14T..."
}
```
