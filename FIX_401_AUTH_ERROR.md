# Fix 401 Unauthorized Error

## Problem
The app is getting 401 (Unauthorized) errors when accessing:
```
https://trade-service-60gz.onrender.com/api/v1/trades
```

## Root Causes

### 1. **Authentication Token Missing or Invalid**
The trade service requires a valid JWT token in the Authorization header, but:
- User might not be logged in (no token in localStorage)
- Token might have expired
- Token might be invalid

### 2. **JWT Secret Mismatch**
All services (auth-service, trade-service, etc.) must use the **SAME** `JWT_SECRET` environment variable. If they differ, tokens issued by auth-service will be rejected by trade-service.

### 3. **CORS Configuration**
The trade service needs to allow requests from your Vercel frontend domain.

## Solutions

### ✅ Solution 1: Ensure JWT_SECRET Matches Across Services

**On Render.com (Trade Service):**
1. Go to https://dashboard.render.com
2. Open your `trade-service-60gz` service
3. Go to **Environment** tab
4. Add/Update environment variable:
   - Key: `JWT_SECRET`
   - Value: `<SAME_VALUE_AS_AUTH_SERVICE>`

**On Render.com (Auth Service):**
1. Open your `authentication-fwdq` service
2. Go to **Environment** tab
3. Check the `JWT_SECRET` value
4. **Copy this exact value** and use it for trade-service

### ✅ Solution 2: Update CORS Configuration

**On Render.com (Trade Service):**
Add/Update environment variable:
- Key: `CORS_ORIGIN`
- Value: `https://your-app.vercel.app,http://localhost:3000`

Replace `your-app.vercel.app` with your actual Vercel domain.

### ✅ Solution 3: Verify User Authentication Flow

The app requires users to be logged in. Make sure:

1. **User must login first**:
   - Visit `/login` page
   - Enter credentials
   - Get access token

2. **Token is stored**:
   - Check browser localStorage for `trading_app_access_token`
   - Open DevTools → Application → Local Storage

3. **Token is sent with requests**:
   - Check Network tab in DevTools
   - Look for Authorization header: `Bearer <token>`

### ✅ Solution 4: Check Render Service Status

1. Go to https://dashboard.render.com
2. Check both services are **running** (not sleeping/building)
3. Free tier services sleep after 15 minutes of inactivity
4. First request will take 30-60 seconds to wake up

### ✅ Solution 5: Test API Directly

Test if the trade service is working:

```bash
# Get an auth token first
curl -X POST https://authentication-fwdq.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}'

# Use the token to test trades endpoint
curl https://trade-service-60gz.onrender.com/api/v1/trades \
  -H "Authorization: Bearer <YOUR_TOKEN_HERE>"
```

## Quick Fix Checklist

- [ ] Verify JWT_SECRET is the same on both auth-service and trade-service
- [ ] Add CORS_ORIGIN with your Vercel domain to trade-service
- [ ] Ensure user is logged in on the frontend
- [ ] Check browser localStorage has `trading_app_access_token`
- [ ] Verify services are running on Render dashboard
- [ ] Test API endpoints with curl/Postman

## Environment Variables Summary

### Auth Service (authentication-fwdq)
```bash
JWT_SECRET=your-secret-key-here
CORS_ORIGIN=https://your-app.vercel.app
MONGODB_URI=your-mongodb-connection-string
NODE_ENV=production
PORT=3001
```

### Trade Service (trade-service-60gz)
```bash
JWT_SECRET=your-secret-key-here  # MUST MATCH AUTH SERVICE
CORS_ORIGIN=https://your-app.vercel.app
MONGODB_URI=your-mongodb-connection-string
NODE_ENV=production
PORT=3003
```

### Frontend (Vercel)
```bash
NEXT_PUBLIC_API_URL=https://authentication-fwdq.onrender.com/api/v1
NEXT_PUBLIC_TRADE_API_URL=https://trade-service-60gz.onrender.com/api/v1
NODE_ENV=production
```

## Testing After Fix

1. **Clear browser cache and localStorage**:
   - DevTools → Application → Clear site data

2. **Login again**:
   - Go to `/login`
   - Enter credentials
   - Should redirect to dashboard

3. **Check dashboard loads**:
   - Should see trades loading
   - No 401 errors in console

4. **Check Network tab**:
   - All API calls should have `Authorization: Bearer ...` header
   - Status codes should be 200 (not 401)

## Common Errors

### "Access token is required"
- User not logged in
- Token not in localStorage
- **Fix**: Login again

### "Invalid access token"
- JWT_SECRET mismatch between services
- **Fix**: Update JWT_SECRET on all services to match

### "Access token expired"
- Token has expired (usually 24h)
- **Fix**: Implement token refresh or login again

### CORS Error
- Frontend domain not in CORS_ORIGIN
- **Fix**: Add Vercel domain to CORS_ORIGIN

## Need Help?

If the issue persists:
1. Check Render logs for both services
2. Check browser console for detailed error messages
3. Verify all environment variables are set correctly
4. Try logging in with a fresh account
