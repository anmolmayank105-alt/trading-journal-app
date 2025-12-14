# Production Deployment - Quick Start

## 🚀 Recommended: Railway.app (Free Tier)

Railway is the easiest platform to deploy Node.js backends with MongoDB.

---

## Step-by-Step Deployment

### 1️⃣ Set Up MongoDB Atlas (Free)

1. Go to https://mongodb.com/atlas
2. Create free account → Create free M0 cluster
3. **Database Access**: Create user with password
4. **Network Access**: Add `0.0.0.0/0` (allow all IPs)
5. **Connect**: Get connection string:
   ```
   mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/trading_analytics
   ```

---

### 2️⃣ Deploy to Railway

1. Go to https://railway.app → Sign up with GitHub
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your repository

#### Deploy Trade Service:
- **Root Directory**: `backend/trade-service`
- **Build Command**: 
  ```
  cd ../shared && npm install && npm run build && cd ../trade-service && npm install && npm run build
  ```
- **Start Command**: `npm start`
- **Environment Variables**:
  ```
  NODE_ENV=production
  PORT=3003
  MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/trading_analytics
  JWT_SECRET=your-32-char-secret-key-here-make-it-long
  CORS_ORIGIN=https://your-app.vercel.app
  ```

#### Deploy Auth Service (Same steps):
- **Root Directory**: `backend/auth-service`
- **Build Command**: 
  ```
  cd ../shared && npm install && npm run build && cd ../auth-service && npm install && npm run build
  ```
- **Start Command**: `npm start`
- **Environment Variables**: Same as above (use same JWT_SECRET!)

---

### 3️⃣ Get Your API URLs

After deployment, Railway provides URLs like:
- Trade: `https://trade-service-production-xxxx.up.railway.app`
- Auth: `https://auth-service-production-xxxx.up.railway.app`

---

### 4️⃣ Update Vercel Frontend

Go to Vercel → Your Project → Settings → Environment Variables

Add these variables:
```
NEXT_PUBLIC_TRADE_API_URL=https://trade-service-xxxx.up.railway.app/api/v1
NEXT_PUBLIC_API_URL=https://auth-service-xxxx.up.railway.app/api/v1
```

Then **Redeploy** your frontend!

---

### 5️⃣ Verify Deployment

Test health endpoints:
- `https://your-trade-service-url/health`
- `https://your-auth-service-url/health`

Both should return `{"status":"healthy"}`

---

## 💡 Alternative Platforms

| Platform | Free Tier | Pros | Cons |
|----------|-----------|------|------|
| **Railway** | $5/month credit | Easiest, great DX | Limited free tier |
| **Render** | Free (sleeps) | Good free tier | Cold starts |
| **Fly.io** | 3 free VMs | Fast globally | More complex |
| **Cyclic** | Free | Simple | Limited |

---

## ⚠️ Important Notes

1. **JWT_SECRET must be identical** on both services
2. **MongoDB Atlas IP whitelist**: Add `0.0.0.0/0` for cloud deployment
3. **CORS_ORIGIN**: Set to your exact Vercel URL
4. After backend deployment, **redeploy frontend** with new API URLs

---

## 🔧 Troubleshooting

**CORS Errors?**
- Check CORS_ORIGIN matches your frontend URL exactly
- Don't include trailing slash

**Auth Not Working?**
- Ensure JWT_SECRET is same on both services

**Database Connection Failed?**
- Check MongoDB Atlas IP whitelist (0.0.0.0/0)
- Verify connection string password is URL-encoded

**Build Failing?**
- Make sure shared package builds first
- Check the build command includes `cd ../shared && npm install && npm run build`
