# Authentication Flow Debug Report

## Issues Found:

### 🔴 CRITICAL ISSUE 1: User Data Caching Problem
**Location:** `frontend/src/lib/api/auth.ts`
**Problem:** The `getCurrentUser()` function was using stale localStorage cache before validating with backend
**Status:** ✅ FIXED - Now validates token with backend first

### 🔴 CRITICAL ISSUE 2: Logout Not Clearing Cache
**Location:** `frontend/src/lib/api/auth.ts` - `logout()` function
**Problem:** Not clearing `trading_app_current_user` from localStorage
**Status:** ✅ FIXED - Now clears localStorage on logout

### 🟡 POTENTIAL ISSUE 3: Token Payload Structure
**Location:** `backend/auth-service/src/services/auth.service.ts` line 186-192
**Token Payload Contains:**
```typescript
{
  userId: user._id.toString(),  // MongoDB ObjectId as string
  email: user.email,
  username: user.username,
  roles: user.roles,
  sessionId: string
}
```
**Verification Needed:** Check if `req.user.userId` is correctly extracted in trade-service

### 🟡 POTENTIAL ISSUE 4: Trade Service Auth Middleware
**Location:** `backend/trade-service/src/middleware/auth.middleware.ts`
**Verifies:** JWT token and extracts payload
**Sets:** `req.user` = TokenPayload object
**Needs Check:** Verify payload.userId is correct

### 🟡 POTENTIAL ISSUE 5: MongoDB Query Filter
**Location:** `backend/trade-service/src/services/trade.service.ts` line 173
**Query:** `{ userId: new Types.ObjectId(userId), isDeleted: false }`
**Needs Check:** Verify userId string is valid MongoDB ObjectId

## Verification Steps:

### Step 1: Check Token Payload in Browser
1. Open browser DevTools → Application → Local Storage
2. Look for `trading_app_access_token`
3. Decode JWT at jwt.io
4. Verify `userId` field matches logged-in user

### Step 2: Check Backend Logs
1. Look in auth-service terminal for login success
2. Verify userId in token generation
3. Check trade-service for incoming requests with userId

### Step 3: Check Database
1. Connect to MongoDB
2. Run: `db.users.find({}, {_id: 1, email: 1})`
3. Run: `db.trades.find({}, {userId: 1, symbol: 1})`
4. Verify userId in trades matches logged-in user's _id

## Quick Test Commands:

```bash
# Test 1: Login and get token
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Test 2: Get user profile with token
curl -X GET http://localhost:3001/api/v1/users/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Test 3: Get trades with token
curl -X GET http://localhost:3003/api/v1/trades \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Root Cause Analysis:

The issue is likely caused by:
1. ✅ **Stale cache** - Fixed by validating token first
2. ✅ **Incomplete logout** - Fixed by clearing localStorage
3. ⚠️ **Possible remaining issue:** Browser might still have old token stored

## Action Required:

**IMMEDIATE FIX:**
1. ✅ Code changes applied
2. ⚠️ **User must hard refresh browser (Ctrl+Shift+R or Ctrl+F5)**
3. ⚠️ **User must clear browser cache/localStorage**
4. ⚠️ **User must logout and login again**

**To Clear Browser Data:**
1. Open DevTools (F12)
2. Go to Application tab
3. Click "Clear storage"
4. Check all boxes
5. Click "Clear site data"
6. Close and reopen browser
7. Go to http://localhost:3002
8. Login with new account

## Expected Behavior After Fix:

1. User logs in → Token generated with correct userId
2. Frontend stores token in localStorage
3. Every API call includes token in Authorization header
4. Backend verifies token and extracts userId
5. Database query filters by extracted userId
6. Only that user's data is returned

## If Issue Persists:

Add console logging to trace userId through the flow:
1. Frontend: Log token payload after login
2. Frontend: Log userId in API calls
3. Backend: Log req.user.userId in middleware
4. Backend: Log MongoDB query userId
5. Backend: Log returned trades count and userIds
