# Part 4: Complete REST API Routes Design

**Date**: November 27, 2025  
**Status**: ✅ Completed  
**Version**: 0.4.0

---

## Overview

Part 4 provides complete REST API route specifications for the Stock Trade Tracking Application:

1. Authentication Routes (register, login, refresh, logout)
2. Trade Routes (CRUD + fetch + filter)
3. Broker Sync Routes (connect, sync, status)
4. Analytics Routes (overview, monthly, category, heatmap)
5. Market Data Routes (index, stock, candle, gainers, losers, WebSocket)

**Base URL**: `https://api.stocktracker.com/v1`  
**Authentication**: JWT Bearer Token (except public endpoints)  
**Content-Type**: `application/json`

---

## API Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2025-11-27T10:30:00.000Z",
    "requestId": "req_abc123"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": [ ... ]
  },
  "meta": {
    "timestamp": "2025-11-27T10:30:00.000Z",
    "requestId": "req_abc123"
  }
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  },
  "meta": { ... }
}
```

---

## HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Validation Error |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

---

## 1. Authentication Routes

**Base Path**: `/auth`

### 1.1 Register User

**Endpoint**: `POST /auth/register`  
**Authentication**: None (Public)  
**Rate Limit**: 5 requests/minute/IP

**Description**: Create a new user account

**Request Body**:
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+919876543210",
  "acceptTerms": true
}
```

**Request Schema**:
```typescript
{
  email: string;          // Required, valid email format
  username: string;       // Required, 3-30 chars, alphanumeric + underscore
  password: string;       // Required, min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special
  confirmPassword: string; // Required, must match password
  firstName?: string;     // Optional, 1-50 chars
  lastName?: string;      // Optional, 1-50 chars
  phone?: string;         // Optional, valid phone format
  acceptTerms: boolean;   // Required, must be true
}
```

**Success Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "username": "johndoe",
      "firstName": "John",
      "lastName": "Doe",
      "verified": false,
      "createdAt": "2025-11-27T10:30:00.000Z"
    },
    "message": "Registration successful. Please verify your email."
  },
  "meta": {
    "timestamp": "2025-11-27T10:30:00.000Z",
    "requestId": "req_abc123"
  }
}
```

**Error Responses**:

*409 Conflict* (Email/Username exists):
```json
{
  "success": false,
  "error": {
    "code": "USER_EXISTS",
    "message": "A user with this email already exists",
    "details": [
      { "field": "email", "message": "Email already registered" }
    ]
  }
}
```

*422 Validation Error*:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "password", "message": "Password must be at least 8 characters" },
      { "field": "confirmPassword", "message": "Passwords do not match" }
    ]
  }
}
```

---

### 1.2 Login

**Endpoint**: `POST /auth/login`  
**Authentication**: None (Public)  
**Rate Limit**: 10 requests/minute/IP

**Description**: Authenticate user and get tokens

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "rememberMe": true
}
```

**Request Schema**:
```typescript
{
  email: string;          // Required, valid email
  password: string;       // Required
  rememberMe?: boolean;   // Optional, extends refresh token expiry
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "username": "johndoe",
      "firstName": "John",
      "lastName": "Doe",
      "roles": ["user"],
      "verified": true,
      "subscription": {
        "plan": "premium",
        "status": "active",
        "endDate": "2026-11-27T00:00:00.000Z"
      }
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "accessTokenExpiresAt": "2025-11-27T10:45:00.000Z",
      "refreshTokenExpiresAt": "2025-12-04T10:30:00.000Z"
    }
  },
  "meta": {
    "timestamp": "2025-11-27T10:30:00.000Z",
    "requestId": "req_abc123"
  }
}
```

**Error Responses**:

*401 Unauthorized* (Invalid credentials):
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

*403 Forbidden* (Account not verified):
```json
{
  "success": false,
  "error": {
    "code": "EMAIL_NOT_VERIFIED",
    "message": "Please verify your email before logging in"
  }
}
```

*429 Too Many Requests* (Locked out):
```json
{
  "success": false,
  "error": {
    "code": "ACCOUNT_LOCKED",
    "message": "Too many failed attempts. Account locked for 15 minutes.",
    "details": {
      "lockoutEndsAt": "2025-11-27T10:45:00.000Z"
    }
  }
}
```

---

### 1.3 Refresh Token

**Endpoint**: `POST /auth/refresh`  
**Authentication**: None (uses refresh token)  
**Rate Limit**: 30 requests/hour/user

**Description**: Get new access token using refresh token

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Request Schema**:
```typescript
{
  refreshToken: string;   // Required, valid JWT refresh token
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "accessTokenExpiresAt": "2025-11-27T11:00:00.000Z",
      "refreshTokenExpiresAt": "2025-12-04T10:45:00.000Z"
    }
  },
  "meta": {
    "timestamp": "2025-11-27T10:45:00.000Z",
    "requestId": "req_def456"
  }
}
```

**Error Responses**:

*401 Unauthorized* (Invalid/expired token):
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REFRESH_TOKEN",
    "message": "Refresh token is invalid or expired"
  }
}
```

---

### 1.4 Logout

**Endpoint**: `POST /auth/logout`  
**Authentication**: Bearer Token  
**Rate Limit**: 30 requests/minute/user

**Description**: Invalidate current session and refresh token

**Request Headers**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Request Body** (optional):
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "allDevices": false
}
```

**Request Schema**:
```typescript
{
  refreshToken?: string;  // Optional, if not provided uses header token
  allDevices?: boolean;   // Optional, logout from all devices
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "message": "Successfully logged out"
  },
  "meta": {
    "timestamp": "2025-11-27T10:30:00.000Z",
    "requestId": "req_ghi789"
  }
}
```

---

### 1.5 Get Current User

**Endpoint**: `GET /auth/me`  
**Authentication**: Bearer Token  
**Rate Limit**: 60 requests/minute/user

**Description**: Get current authenticated user profile

**Request Headers**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "username": "johndoe",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+919876543210",
      "avatar": "https://cdn.stocktracker.com/avatars/507f1f77bcf86cd799439011.jpg",
      "roles": ["user"],
      "verified": true,
      "preferences": {
        "theme": "dark",
        "currency": "INR",
        "timezone": "Asia/Kolkata",
        "notifications": {
          "email": true,
          "push": true,
          "sms": false,
          "priceAlerts": true,
          "tradeAlerts": true
        }
      },
      "subscription": {
        "plan": "premium",
        "status": "active",
        "startDate": "2025-01-01T00:00:00.000Z",
        "endDate": "2026-01-01T00:00:00.000Z"
      },
      "brokerAccounts": [
        {
          "brokerId": "507f1f77bcf86cd799439012",
          "broker": "zerodha",
          "isActive": true,
          "isPrimary": true,
          "lastSyncAt": "2025-11-27T09:00:00.000Z"
        }
      ],
      "createdAt": "2024-11-27T10:30:00.000Z",
      "lastLoginAt": "2025-11-27T10:30:00.000Z"
    }
  },
  "meta": {
    "timestamp": "2025-11-27T10:30:00.000Z",
    "requestId": "req_jkl012"
  }
}
```

---

### 1.6 Update Profile

**Endpoint**: `PATCH /auth/me`  
**Authentication**: Bearer Token  
**Rate Limit**: 30 requests/minute/user

**Description**: Update current user profile

**Request Body**:
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "phone": "+919876543211",
  "avatar": "https://cdn.stocktracker.com/avatars/new-avatar.jpg",
  "preferences": {
    "theme": "light",
    "notifications": {
      "sms": true
    }
  }
}
```

**Request Schema**:
```typescript
{
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  preferences?: {
    theme?: 'light' | 'dark';
    currency?: string;
    timezone?: string;
    notifications?: {
      email?: boolean;
      push?: boolean;
      sms?: boolean;
      priceAlerts?: boolean;
      tradeAlerts?: boolean;
    };
    defaultBroker?: string;
  };
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "firstName": "John",
      "lastName": "Smith",
      "phone": "+919876543211",
      "preferences": {
        "theme": "light",
        "notifications": {
          "sms": true
        }
      },
      "updatedAt": "2025-11-27T10:35:00.000Z"
    },
    "message": "Profile updated successfully"
  },
  "meta": {
    "timestamp": "2025-11-27T10:35:00.000Z",
    "requestId": "req_mno345"
  }
}
```

---

### 1.7 Change Password

**Endpoint**: `POST /auth/change-password`  
**Authentication**: Bearer Token  
**Rate Limit**: 5 requests/hour/user

**Description**: Change user password

**Request Body**:
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewSecurePass456!",
  "confirmNewPassword": "NewSecurePass456!"
}
```

**Request Schema**:
```typescript
{
  currentPassword: string;    // Required
  newPassword: string;        // Required, min 8 chars, complexity rules
  confirmNewPassword: string; // Required, must match newPassword
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "message": "Password changed successfully. Please login again."
  }
}
```

---

### 1.8 Forgot Password

**Endpoint**: `POST /auth/forgot-password`  
**Authentication**: None (Public)  
**Rate Limit**: 3 requests/hour/email

**Description**: Request password reset email

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "message": "If an account exists with this email, you will receive a password reset link."
  }
}
```

---

### 1.9 Reset Password

**Endpoint**: `POST /auth/reset-password`  
**Authentication**: None (uses reset token)  
**Rate Limit**: 5 requests/hour/token

**Description**: Reset password using token from email

**Request Body**:
```json
{
  "token": "reset_token_from_email",
  "newPassword": "NewSecurePass789!",
  "confirmNewPassword": "NewSecurePass789!"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "message": "Password reset successfully. Please login with your new password."
  }
}
```

---

### 1.10 Verify Email

**Endpoint**: `POST /auth/verify-email`  
**Authentication**: None (uses verification token)  
**Rate Limit**: 10 requests/hour/token

**Description**: Verify email address using token

**Request Body**:
```json
{
  "token": "verification_token_from_email"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "message": "Email verified successfully. You can now login."
  }
}
```

---

### 1.11 Resend Verification Email

**Endpoint**: `POST /auth/resend-verification`  
**Authentication**: None (Public)  
**Rate Limit**: 3 requests/hour/email

**Description**: Resend email verification link

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "message": "If an unverified account exists, a new verification email has been sent."
  }
}
```

---

### Authentication Routes Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | ❌ | Register new user |
| POST | `/auth/login` | ❌ | Login and get tokens |
| POST | `/auth/refresh` | ❌ | Refresh access token |
| POST | `/auth/logout` | ✅ | Logout user |
| GET | `/auth/me` | ✅ | Get current user |
| PATCH | `/auth/me` | ✅ | Update profile |
| POST | `/auth/change-password` | ✅ | Change password |
| POST | `/auth/forgot-password` | ❌ | Request password reset |
| POST | `/auth/reset-password` | ❌ | Reset password with token |
| POST | `/auth/verify-email` | ❌ | Verify email |
| POST | `/auth/resend-verification` | ❌ | Resend verification email |

---

## 2. Trade Routes

**Base Path**: `/trades`

### 2.1 Create Trade

**Endpoint**: `POST /trades`  
**Authentication**: Bearer Token  
**Rate Limit**: 100 requests/minute/user

**Description**: Create a new trade record

**Request Body**:
```json
{
  "symbol": "RELIANCE",
  "exchange": "NSE",
  "segment": "equity",
  "instrumentType": "stock",
  "tradeType": "intraday",
  "position": "long",
  "entry": {
    "price": 2450.50,
    "quantity": 100,
    "timestamp": "2025-11-27T09:30:00.000Z",
    "orderType": "limit",
    "brokerage": 20.00,
    "taxes": {
      "stt": 24.51,
      "stampDuty": 3.68,
      "gst": 3.60,
      "sebiTurnover": 0.25,
      "exchangeTxn": 0.80
    }
  },
  "stopLoss": 2400.00,
  "target": 2550.00,
  "strategy": "breakout",
  "tags": ["momentum", "high-volume"],
  "notes": "Breakout above resistance with strong volume"
}
```

**Request Schema**:
```typescript
{
  symbol: string;                    // Required, 1-20 chars
  exchange: 'NSE' | 'BSE' | 'MCX' | 'NFO';  // Required
  segment: 'equity' | 'futures' | 'options' | 'commodity';  // Required
  instrumentType: 'stock' | 'future' | 'call' | 'put' | 'commodity';  // Required
  tradeType: 'intraday' | 'delivery' | 'swing';  // Required
  position: 'long' | 'short';        // Required
  entry: {
    price: number;                   // Required, > 0
    quantity: number;                // Required, > 0, integer
    timestamp: string;               // Required, ISO 8601
    orderType: 'market' | 'limit' | 'stop_loss';  // Required
    brokerage?: number;              // Optional, >= 0
    taxes?: {
      stt?: number;
      stampDuty?: number;
      gst?: number;
      sebiTurnover?: number;
      exchangeTxn?: number;
    };
  };
  stopLoss?: number;                 // Optional, > 0
  target?: number;                   // Optional, > 0
  strategy?: string;                 // Optional, max 50 chars
  tags?: string[];                   // Optional, max 10 tags
  notes?: string;                    // Optional, max 500 chars
  brokerId?: string;                 // Optional, broker account ID
}
```

**Success Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "trade": {
      "id": "507f1f77bcf86cd799439020",
      "userId": "507f1f77bcf86cd799439011",
      "symbol": "RELIANCE",
      "exchange": "NSE",
      "segment": "equity",
      "instrumentType": "stock",
      "tradeType": "intraday",
      "position": "long",
      "entry": {
        "price": 2450.50,
        "quantity": 100,
        "timestamp": "2025-11-27T09:30:00.000Z",
        "orderType": "limit",
        "brokerage": 20.00,
        "taxes": {
          "stt": 24.51,
          "stampDuty": 3.68,
          "gst": 3.60,
          "sebiTurnover": 0.25,
          "exchangeTxn": 0.80
        }
      },
      "exit": null,
      "status": "open",
      "pnl": {
        "gross": 0,
        "net": -52.84,
        "percentage": -0.02,
        "charges": 52.84
      },
      "stopLoss": 2400.00,
      "target": 2550.00,
      "strategy": "breakout",
      "tags": ["momentum", "high-volume"],
      "notes": "Breakout above resistance with strong volume",
      "riskRewardRatio": 1.98,
      "metadata": {
        "syncSource": "manual",
        "modifiedManually": false
      },
      "createdAt": "2025-11-27T09:31:00.000Z",
      "updatedAt": "2025-11-27T09:31:00.000Z"
    }
  },
  "meta": {
    "timestamp": "2025-11-27T09:31:00.000Z",
    "requestId": "req_trade001"
  }
}
```

---

### 2.2 Get All Trades (with Filters)

**Endpoint**: `GET /trades`  
**Authentication**: Bearer Token  
**Rate Limit**: 120 requests/minute/user

**Description**: Get paginated list of trades with filters

**Query Parameters**:
```
?page=1
&limit=20
&sortBy=entry.timestamp
&sortOrder=desc
&status=open,closed
&symbol=RELIANCE,TCS
&exchange=NSE
&segment=equity
&tradeType=intraday
&position=long
&strategy=breakout
&tags=momentum
&startDate=2025-11-01T00:00:00.000Z
&endDate=2025-11-30T23:59:59.000Z
&minPnl=-1000
&maxPnl=5000
&search=breakout
```

**Query Schema**:
```typescript
{
  // Pagination
  page?: number;           // Default: 1, min: 1
  limit?: number;          // Default: 20, min: 1, max: 100
  
  // Sorting
  sortBy?: string;         // Default: 'entry.timestamp'
                           // Options: entry.timestamp, exit.timestamp, symbol, 
                           //          pnl.net, pnl.percentage, status
  sortOrder?: 'asc' | 'desc';  // Default: 'desc'
  
  // Filters
  status?: string;         // Comma-separated: open,closed,partial
  symbol?: string;         // Comma-separated symbols
  exchange?: string;       // Comma-separated: NSE,BSE,MCX,NFO
  segment?: string;        // Comma-separated: equity,futures,options,commodity
  tradeType?: string;      // Comma-separated: intraday,delivery,swing
  position?: string;       // Comma-separated: long,short
  strategy?: string;       // Single strategy name
  tags?: string;           // Comma-separated tags
  brokerId?: string;       // Broker account ID
  
  // Date range
  startDate?: string;      // ISO 8601 format
  endDate?: string;        // ISO 8601 format
  
  // P&L range
  minPnl?: number;         // Minimum net P&L
  maxPnl?: number;         // Maximum net P&L
  
  // Search
  search?: string;         // Search in symbol, notes, strategy
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "trades": [
      {
        "id": "507f1f77bcf86cd799439020",
        "symbol": "RELIANCE",
        "exchange": "NSE",
        "segment": "equity",
        "tradeType": "intraday",
        "position": "long",
        "entry": {
          "price": 2450.50,
          "quantity": 100,
          "timestamp": "2025-11-27T09:30:00.000Z"
        },
        "exit": {
          "price": 2485.00,
          "quantity": 100,
          "timestamp": "2025-11-27T14:30:00.000Z"
        },
        "status": "closed",
        "pnl": {
          "gross": 3450.00,
          "net": 3344.32,
          "percentage": 1.41,
          "charges": 105.68
        },
        "strategy": "breakout",
        "tags": ["momentum"],
        "holdingPeriod": 300
      }
    ],
    "summary": {
      "totalTrades": 150,
      "openTrades": 5,
      "closedTrades": 145,
      "totalPnl": 45230.50,
      "winRate": 62.5
    }
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  },
  "meta": {
    "timestamp": "2025-11-27T10:30:00.000Z",
    "requestId": "req_trade002"
  }
}
```

---

### 2.3 Get Single Trade

**Endpoint**: `GET /trades/:id`  
**Authentication**: Bearer Token  
**Rate Limit**: 120 requests/minute/user

**Description**: Get detailed information about a specific trade

**Path Parameters**:
- `id` (string, required): Trade ID

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "trade": {
      "id": "507f1f77bcf86cd799439020",
      "userId": "507f1f77bcf86cd799439011",
      "brokerId": "507f1f77bcf86cd799439012",
      "brokerTradeId": "ZER123456789",
      "symbol": "RELIANCE",
      "exchange": "NSE",
      "segment": "equity",
      "instrumentType": "stock",
      "tradeType": "intraday",
      "position": "long",
      "entry": {
        "price": 2450.50,
        "quantity": 100,
        "timestamp": "2025-11-27T09:30:00.000Z",
        "orderType": "limit",
        "brokerage": 20.00,
        "taxes": {
          "stt": 24.51,
          "stampDuty": 3.68,
          "gst": 3.60,
          "sebiTurnover": 0.25,
          "exchangeTxn": 0.80
        }
      },
      "exit": {
        "price": 2485.00,
        "quantity": 100,
        "timestamp": "2025-11-27T14:30:00.000Z",
        "orderType": "market",
        "brokerage": 20.00,
        "taxes": {
          "stt": 24.85,
          "stampDuty": 3.73,
          "gst": 3.60,
          "sebiTurnover": 0.25,
          "exchangeTxn": 0.81
        }
      },
      "status": "closed",
      "pnl": {
        "gross": 3450.00,
        "net": 3344.32,
        "percentage": 1.41,
        "charges": 105.68
      },
      "stopLoss": 2400.00,
      "target": 2550.00,
      "strategy": "breakout",
      "tags": ["momentum", "high-volume"],
      "notes": "Breakout above resistance with strong volume",
      "riskRewardRatio": 1.98,
      "holdingPeriod": 300,
      "metadata": {
        "syncedAt": "2025-11-27T14:35:00.000Z",
        "syncSource": "broker_api",
        "importBatch": null,
        "modifiedManually": false
      },
      "createdAt": "2025-11-27T09:31:00.000Z",
      "updatedAt": "2025-11-27T14:35:00.000Z"
    }
  },
  "meta": {
    "timestamp": "2025-11-27T15:00:00.000Z",
    "requestId": "req_trade003"
  }
}
```

**Error Response** (404 Not Found):
```json
{
  "success": false,
  "error": {
    "code": "TRADE_NOT_FOUND",
    "message": "Trade with ID '507f1f77bcf86cd799439099' not found"
  }
}
```

---

### 2.4 Update Trade

**Endpoint**: `PUT /trades/:id`  
**Authentication**: Bearer Token  
**Rate Limit**: 60 requests/minute/user

**Description**: Update an existing trade (full update)

**Path Parameters**:
- `id` (string, required): Trade ID

**Request Body**:
```json
{
  "symbol": "RELIANCE",
  "exchange": "NSE",
  "segment": "equity",
  "instrumentType": "stock",
  "tradeType": "intraday",
  "position": "long",
  "entry": {
    "price": 2450.50,
    "quantity": 100,
    "timestamp": "2025-11-27T09:30:00.000Z",
    "orderType": "limit",
    "brokerage": 20.00
  },
  "exit": {
    "price": 2485.00,
    "quantity": 100,
    "timestamp": "2025-11-27T14:30:00.000Z",
    "orderType": "market",
    "brokerage": 20.00
  },
  "stopLoss": 2400.00,
  "target": 2550.00,
  "strategy": "breakout",
  "tags": ["momentum", "high-volume", "nifty50"],
  "notes": "Updated notes with more details"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "trade": {
      "id": "507f1f77bcf86cd799439020",
      "status": "closed",
      "pnl": {
        "gross": 3450.00,
        "net": 3344.32,
        "percentage": 1.41,
        "charges": 105.68
      },
      "metadata": {
        "modifiedManually": true
      },
      "updatedAt": "2025-11-27T15:10:00.000Z"
    },
    "message": "Trade updated successfully"
  }
}
```

---

### 2.5 Partial Update Trade

**Endpoint**: `PATCH /trades/:id`  
**Authentication**: Bearer Token  
**Rate Limit**: 60 requests/minute/user

**Description**: Partially update a trade (only specified fields)

**Path Parameters**:
- `id` (string, required): Trade ID

**Request Body**:
```json
{
  "exit": {
    "price": 2490.00,
    "quantity": 100,
    "timestamp": "2025-11-27T15:00:00.000Z",
    "orderType": "limit",
    "brokerage": 20.00
  },
  "notes": "Exit at higher price - revised target hit"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "trade": {
      "id": "507f1f77bcf86cd799439020",
      "status": "closed",
      "pnl": {
        "gross": 3950.00,
        "net": 3841.48,
        "percentage": 1.61,
        "charges": 108.52
      },
      "updatedAt": "2025-11-27T15:05:00.000Z"
    },
    "message": "Trade updated successfully"
  }
}
```

---

### 2.6 Close Trade

**Endpoint**: `POST /trades/:id/close`  
**Authentication**: Bearer Token  
**Rate Limit**: 60 requests/minute/user

**Description**: Close an open trade with exit details

**Path Parameters**:
- `id` (string, required): Trade ID

**Request Body**:
```json
{
  "exitPrice": 2485.00,
  "exitQuantity": 100,
  "exitTimestamp": "2025-11-27T14:30:00.000Z",
  "orderType": "market",
  "brokerage": 20.00,
  "taxes": {
    "stt": 24.85,
    "stampDuty": 3.73,
    "gst": 3.60
  }
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "trade": {
      "id": "507f1f77bcf86cd799439020",
      "status": "closed",
      "pnl": {
        "gross": 3450.00,
        "net": 3344.32,
        "percentage": 1.41,
        "charges": 105.68
      },
      "holdingPeriod": 300
    },
    "message": "Trade closed successfully"
  }
}
```

**Error Response** (400 Bad Request):
```json
{
  "success": false,
  "error": {
    "code": "TRADE_ALREADY_CLOSED",
    "message": "This trade is already closed"
  }
}
```

---

### 2.7 Delete Trade

**Endpoint**: `DELETE /trades/:id`  
**Authentication**: Bearer Token  
**Rate Limit**: 30 requests/minute/user

**Description**: Delete a trade (soft delete)

**Path Parameters**:
- `id` (string, required): Trade ID

**Query Parameters**:
```
?permanent=false
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "message": "Trade deleted successfully",
    "tradeId": "507f1f77bcf86cd799439020"
  }
}
```

---

### 2.8 Bulk Create Trades

**Endpoint**: `POST /trades/bulk`  
**Authentication**: Bearer Token  
**Rate Limit**: 10 requests/minute/user

**Description**: Create multiple trades at once (import)

**Request Body**:
```json
{
  "trades": [
    {
      "symbol": "RELIANCE",
      "exchange": "NSE",
      "segment": "equity",
      "tradeType": "intraday",
      "position": "long",
      "entry": {
        "price": 2450.50,
        "quantity": 100,
        "timestamp": "2025-11-27T09:30:00.000Z",
        "orderType": "limit"
      }
    },
    {
      "symbol": "TCS",
      "exchange": "NSE",
      "segment": "equity",
      "tradeType": "intraday",
      "position": "short",
      "entry": {
        "price": 3580.00,
        "quantity": 50,
        "timestamp": "2025-11-27T10:00:00.000Z",
        "orderType": "market"
      }
    }
  ],
  "options": {
    "skipDuplicates": true,
    "validateOnly": false
  }
}
```

**Success Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "created": 2,
    "skipped": 0,
    "failed": 0,
    "trades": [
      { "id": "507f1f77bcf86cd799439021", "symbol": "RELIANCE", "status": "created" },
      { "id": "507f1f77bcf86cd799439022", "symbol": "TCS", "status": "created" }
    ],
    "errors": []
  }
}
```

---

### 2.9 Get Trade Statistics

**Endpoint**: `GET /trades/stats`  
**Authentication**: Bearer Token  
**Rate Limit**: 60 requests/minute/user

**Description**: Get trade statistics summary

**Query Parameters**:
```
?startDate=2025-11-01T00:00:00.000Z
&endDate=2025-11-30T23:59:59.000Z
&segment=equity
&tradeType=intraday
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalTrades": 150,
      "openTrades": 5,
      "closedTrades": 145,
      "winningTrades": 90,
      "losingTrades": 50,
      "breakEvenTrades": 5,
      "winRate": 62.07,
      "lossRate": 34.48,
      "profitFactor": 2.35,
      "averageWin": 2500.00,
      "averageLoss": -1200.00,
      "largestWin": 15000.00,
      "largestLoss": -8500.00,
      "averageHoldingPeriod": 180,
      "pnl": {
        "gross": 52500.00,
        "net": 45230.50,
        "charges": 7269.50,
        "realized": 44500.00,
        "unrealized": 730.50
      },
      "bySegment": {
        "equity": { "trades": 100, "pnl": 35000.00, "winRate": 65.0 },
        "futures": { "trades": 30, "pnl": 8000.00, "winRate": 55.0 },
        "options": { "trades": 20, "pnl": 2230.50, "winRate": 60.0 }
      },
      "byTradeType": {
        "intraday": { "trades": 80, "pnl": 25000.00, "winRate": 60.0 },
        "delivery": { "trades": 40, "pnl": 15000.00, "winRate": 70.0 },
        "swing": { "trades": 30, "pnl": 5230.50, "winRate": 55.0 }
      },
      "topSymbols": [
        { "symbol": "RELIANCE", "trades": 25, "pnl": 12500.00, "winRate": 72.0 },
        { "symbol": "TCS", "trades": 20, "pnl": 8500.00, "winRate": 65.0 },
        { "symbol": "INFY", "trades": 18, "pnl": 6200.00, "winRate": 61.0 }
      ],
      "topStrategies": [
        { "strategy": "breakout", "trades": 40, "pnl": 18000.00, "winRate": 68.0 },
        { "strategy": "momentum", "trades": 35, "pnl": 12000.00, "winRate": 60.0 }
      ]
    }
  },
  "meta": {
    "timestamp": "2025-11-27T10:30:00.000Z",
    "requestId": "req_trade004"
  }
}
```

---

### 2.10 Export Trades

**Endpoint**: `GET /trades/export`  
**Authentication**: Bearer Token  
**Rate Limit**: 5 requests/hour/user

**Description**: Export trades to CSV/Excel

**Query Parameters**:
```
?format=csv
&startDate=2025-11-01T00:00:00.000Z
&endDate=2025-11-30T23:59:59.000Z
&status=closed
```

**Success Response** (200 OK):
Headers:
```
Content-Type: text/csv
Content-Disposition: attachment; filename="trades_2025-11-27.csv"
```

Body: CSV file content

---

### Trade Routes Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/trades` | ✅ | Create trade |
| GET | `/trades` | ✅ | Get all trades (filtered) |
| GET | `/trades/:id` | ✅ | Get single trade |
| PUT | `/trades/:id` | ✅ | Full update trade |
| PATCH | `/trades/:id` | ✅ | Partial update trade |
| POST | `/trades/:id/close` | ✅ | Close open trade |
| DELETE | `/trades/:id` | ✅ | Delete trade |
| POST | `/trades/bulk` | ✅ | Bulk create trades |
| GET | `/trades/stats` | ✅ | Get trade statistics |
| GET | `/trades/export` | ✅ | Export trades |

---

## 3. Broker Sync Routes

**Base Path**: `/brokers`

### 3.1 Get Available Brokers

**Endpoint**: `GET /brokers`  
**Authentication**: Bearer Token  
**Rate Limit**: 60 requests/minute/user

**Description**: Get list of supported brokers

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "brokers": [
      {
        "id": "zerodha",
        "name": "Zerodha",
        "displayName": "Zerodha Kite",
        "logo": "https://cdn.stocktracker.com/brokers/zerodha.png",
        "supported": true,
        "features": ["trades", "positions", "holdings", "orders", "margins"],
        "authType": "oauth2",
        "authUrl": "https://kite.zerodha.com/connect/login",
        "documentation": "https://kite.trade/docs/connect/v3/"
      },
      {
        "id": "upstox",
        "name": "Upstox",
        "displayName": "Upstox Pro",
        "logo": "https://cdn.stocktracker.com/brokers/upstox.png",
        "supported": true,
        "features": ["trades", "positions", "holdings", "orders"],
        "authType": "oauth2",
        "authUrl": "https://api.upstox.com/login/authorization/dialog",
        "documentation": "https://upstox.com/developer/api-documentation/"
      },
      {
        "id": "angelone",
        "name": "Angel One",
        "displayName": "Angel One",
        "logo": "https://cdn.stocktracker.com/brokers/angelone.png",
        "supported": false,
        "comingSoon": true
      }
    ]
  },
  "meta": {
    "timestamp": "2025-11-27T10:30:00.000Z",
    "requestId": "req_broker001"
  }
}
```

---

### 3.2 Get User's Connected Brokers

**Endpoint**: `GET /brokers/connected`  
**Authentication**: Bearer Token  
**Rate Limit**: 60 requests/minute/user

**Description**: Get list of user's connected broker accounts

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "accounts": [
      {
        "id": "507f1f77bcf86cd799439012",
        "broker": "zerodha",
        "brokerName": "Zerodha Kite",
        "brokerId": "ZB1234",
        "clientId": "ABC123",
        "isActive": true,
        "isPrimary": true,
        "permissions": ["trades", "positions", "holdings"],
        "lastSyncAt": "2025-11-27T09:00:00.000Z",
        "nextSyncAt": "2025-11-27T09:05:00.000Z",
        "syncStatus": "success",
        "syncStats": {
          "tradesImported": 1250,
          "lastTradeDate": "2025-11-27T00:00:00.000Z",
          "syncFrequency": "5m"
        },
        "tokenExpiresAt": "2025-11-27T23:59:59.000Z",
        "createdAt": "2024-01-15T10:30:00.000Z"
      },
      {
        "id": "507f1f77bcf86cd799439013",
        "broker": "upstox",
        "brokerName": "Upstox Pro",
        "brokerId": "UP5678",
        "clientId": "XYZ789",
        "isActive": true,
        "isPrimary": false,
        "permissions": ["trades", "positions"],
        "lastSyncAt": "2025-11-27T08:55:00.000Z",
        "nextSyncAt": "2025-11-27T09:00:00.000Z",
        "syncStatus": "success",
        "syncStats": {
          "tradesImported": 450,
          "lastTradeDate": "2025-11-26T00:00:00.000Z",
          "syncFrequency": "5m"
        },
        "tokenExpiresAt": "2025-11-27T23:59:59.000Z",
        "createdAt": "2024-06-20T14:00:00.000Z"
      }
    ]
  },
  "meta": {
    "timestamp": "2025-11-27T10:30:00.000Z",
    "requestId": "req_broker002"
  }
}
```

---

### 3.3 Connect Broker (Initiate OAuth)

**Endpoint**: `POST /brokers/connect`  
**Authentication**: Bearer Token  
**Rate Limit**: 10 requests/hour/user

**Description**: Initiate broker connection via OAuth

**Request Body**:
```json
{
  "broker": "zerodha",
  "redirectUrl": "https://app.stocktracker.com/callback/zerodha",
  "permissions": ["trades", "positions", "holdings"]
}
```

**Request Schema**:
```typescript
{
  broker: 'zerodha' | 'upstox';   // Required
  redirectUrl?: string;           // Optional, default from config
  permissions?: string[];         // Optional, default all available
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "authUrl": "https://kite.zerodha.com/connect/login?api_key=xxx&v=3&redirect_params=state%3Dabc123",
    "state": "abc123def456",
    "expiresAt": "2025-11-27T10:45:00.000Z"
  },
  "meta": {
    "timestamp": "2025-11-27T10:30:00.000Z",
    "requestId": "req_broker003"
  }
}
```

---

### 3.4 Complete Broker Connection (OAuth Callback)

**Endpoint**: `POST /brokers/callback`  
**Authentication**: Bearer Token  
**Rate Limit**: 10 requests/hour/user

**Description**: Complete broker OAuth flow with callback data

**Request Body**:
```json
{
  "broker": "zerodha",
  "requestToken": "xxxxxxxx",
  "state": "abc123def456"
}
```

**Request Schema**:
```typescript
{
  broker: 'zerodha' | 'upstox';   // Required
  requestToken: string;           // Required, from OAuth callback
  state: string;                  // Required, must match original state
  code?: string;                  // For some brokers
}
```

**Success Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "account": {
      "id": "507f1f77bcf86cd799439012",
      "broker": "zerodha",
      "brokerName": "Zerodha Kite",
      "clientId": "ABC123",
      "isActive": true,
      "isPrimary": true,
      "permissions": ["trades", "positions", "holdings"],
      "tokenExpiresAt": "2025-11-27T23:59:59.000Z",
      "createdAt": "2025-11-27T10:35:00.000Z"
    },
    "message": "Broker connected successfully. Initial sync will start shortly."
  },
  "meta": {
    "timestamp": "2025-11-27T10:35:00.000Z",
    "requestId": "req_broker004"
  }
}
```

**Error Responses**:

*400 Bad Request* (Invalid state):
```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATE",
    "message": "OAuth state mismatch or expired"
  }
}
```

*409 Conflict* (Already connected):
```json
{
  "success": false,
  "error": {
    "code": "BROKER_ALREADY_CONNECTED",
    "message": "This broker account is already connected"
  }
}
```

---

### 3.5 Disconnect Broker

**Endpoint**: `DELETE /brokers/:brokerId`  
**Authentication**: Bearer Token  
**Rate Limit**: 10 requests/hour/user

**Description**: Disconnect a broker account

**Path Parameters**:
- `brokerId` (string, required): Broker account ID

**Query Parameters**:
```
?deleteTrades=false
&revokeToken=true
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "message": "Broker disconnected successfully",
    "tradesAffected": 1250,
    "tokenRevoked": true
  },
  "meta": {
    "timestamp": "2025-11-27T10:40:00.000Z",
    "requestId": "req_broker005"
  }
}
```

---

### 3.6 Trigger Manual Sync

**Endpoint**: `POST /brokers/:brokerId/sync`  
**Authentication**: Bearer Token  
**Rate Limit**: 10 requests/hour/user

**Description**: Trigger manual sync for a broker account

**Path Parameters**:
- `brokerId` (string, required): Broker account ID

**Request Body**:
```json
{
  "syncType": "full",
  "dateRange": {
    "startDate": "2025-11-01T00:00:00.000Z",
    "endDate": "2025-11-27T23:59:59.000Z"
  },
  "includePositions": true,
  "includeHoldings": true
}
```

**Request Schema**:
```typescript
{
  syncType?: 'full' | 'incremental';  // Default: 'incremental'
  dateRange?: {
    startDate: string;               // ISO 8601
    endDate: string;                 // ISO 8601
  };
  includePositions?: boolean;        // Default: true
  includeHoldings?: boolean;         // Default: true
  force?: boolean;                   // Force sync even if recently synced
}
```

**Success Response** (202 Accepted):
```json
{
  "success": true,
  "data": {
    "syncId": "sync_abc123def456",
    "status": "queued",
    "message": "Sync job queued successfully",
    "estimatedTime": 30,
    "position": 1,
    "webhookUrl": "wss://api.stocktracker.com/sync/sync_abc123def456"
  },
  "meta": {
    "timestamp": "2025-11-27T10:45:00.000Z",
    "requestId": "req_broker006"
  }
}
```

**Error Responses**:

*429 Too Many Requests*:
```json
{
  "success": false,
  "error": {
    "code": "SYNC_RATE_LIMITED",
    "message": "Please wait before triggering another sync",
    "details": {
      "nextSyncAvailable": "2025-11-27T10:50:00.000Z",
      "waitSeconds": 300
    }
  }
}
```

*401 Unauthorized* (Token expired):
```json
{
  "success": false,
  "error": {
    "code": "BROKER_TOKEN_EXPIRED",
    "message": "Broker access token has expired. Please reconnect.",
    "action": "reconnect"
  }
}
```

---

### 3.7 Get Sync Status

**Endpoint**: `GET /brokers/:brokerId/sync/status`  
**Authentication**: Bearer Token  
**Rate Limit**: 120 requests/minute/user

**Description**: Get current sync status for a broker

**Path Parameters**:
- `brokerId` (string, required): Broker account ID

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "syncStatus": {
      "currentSync": {
        "syncId": "sync_abc123def456",
        "status": "in_progress",
        "progress": 65,
        "startedAt": "2025-11-27T10:45:00.000Z",
        "estimatedCompletion": "2025-11-27T10:46:30.000Z",
        "currentStep": "Importing trades",
        "steps": [
          { "name": "Authenticating", "status": "completed" },
          { "name": "Fetching trades", "status": "completed" },
          { "name": "Importing trades", "status": "in_progress", "progress": 65 },
          { "name": "Fetching positions", "status": "pending" },
          { "name": "Reconciliation", "status": "pending" }
        ]
      },
      "lastSync": {
        "syncId": "sync_xyz789abc123",
        "status": "success",
        "completedAt": "2025-11-27T09:00:00.000Z",
        "duration": 45,
        "stats": {
          "tradesImported": 25,
          "tradesUpdated": 5,
          "tradesSkipped": 3,
          "positionsUpdated": 12,
          "errors": 0
        }
      },
      "nextScheduledSync": "2025-11-27T10:50:00.000Z",
      "syncFrequency": "5m"
    }
  },
  "meta": {
    "timestamp": "2025-11-27T10:45:30.000Z",
    "requestId": "req_broker007"
  }
}
```

---

### 3.8 Get Sync History

**Endpoint**: `GET /brokers/:brokerId/sync/history`  
**Authentication**: Bearer Token  
**Rate Limit**: 60 requests/minute/user

**Description**: Get sync history for a broker

**Path Parameters**:
- `brokerId` (string, required): Broker account ID

**Query Parameters**:
```
?page=1
&limit=20
&status=success,failed
&startDate=2025-11-01T00:00:00.000Z
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "syncHistory": [
      {
        "syncId": "sync_abc123def456",
        "status": "success",
        "syncType": "incremental",
        "startedAt": "2025-11-27T09:00:00.000Z",
        "completedAt": "2025-11-27T09:00:45.000Z",
        "duration": 45,
        "stats": {
          "tradesImported": 25,
          "tradesUpdated": 5,
          "tradesSkipped": 3,
          "positionsUpdated": 12,
          "errors": 0
        }
      },
      {
        "syncId": "sync_xyz789abc123",
        "status": "failed",
        "syncType": "full",
        "startedAt": "2025-11-26T15:00:00.000Z",
        "completedAt": "2025-11-26T15:02:30.000Z",
        "duration": 150,
        "error": {
          "code": "BROKER_API_ERROR",
          "message": "Rate limit exceeded",
          "retryable": true
        },
        "stats": {
          "tradesImported": 100,
          "tradesUpdated": 0,
          "tradesSkipped": 0,
          "errors": 1
        }
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

### 3.9 Update Broker Settings

**Endpoint**: `PATCH /brokers/:brokerId`  
**Authentication**: Bearer Token  
**Rate Limit**: 30 requests/minute/user

**Description**: Update broker account settings

**Path Parameters**:
- `brokerId` (string, required): Broker account ID

**Request Body**:
```json
{
  "isPrimary": true,
  "isActive": true,
  "syncFrequency": "5m",
  "autoSync": true,
  "syncSettings": {
    "includePositions": true,
    "includeHoldings": true,
    "autoClosePositions": false
  }
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "account": {
      "id": "507f1f77bcf86cd799439012",
      "isPrimary": true,
      "syncFrequency": "5m",
      "autoSync": true,
      "updatedAt": "2025-11-27T10:50:00.000Z"
    },
    "message": "Broker settings updated successfully"
  }
}
```

---

### 3.10 Refresh Broker Token

**Endpoint**: `POST /brokers/:brokerId/refresh-token`  
**Authentication**: Bearer Token  
**Rate Limit**: 10 requests/hour/user

**Description**: Refresh broker access token

**Path Parameters**:
- `brokerId` (string, required): Broker account ID

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "tokenRefreshed": true,
    "tokenExpiresAt": "2025-11-28T23:59:59.000Z",
    "message": "Token refreshed successfully"
  }
}
```

---

### Broker Routes Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/brokers` | ✅ | Get available brokers |
| GET | `/brokers/connected` | ✅ | Get connected brokers |
| POST | `/brokers/connect` | ✅ | Initiate OAuth |
| POST | `/brokers/callback` | ✅ | Complete OAuth |
| DELETE | `/brokers/:brokerId` | ✅ | Disconnect broker |
| POST | `/brokers/:brokerId/sync` | ✅ | Trigger sync |
| GET | `/brokers/:brokerId/sync/status` | ✅ | Get sync status |
| GET | `/brokers/:brokerId/sync/history` | ✅ | Get sync history |
| PATCH | `/brokers/:brokerId` | ✅ | Update settings |
| POST | `/brokers/:brokerId/refresh-token` | ✅ | Refresh token |

---

## 4. Analytics Routes

**Base Path**: `/analytics`

### 4.1 Get Dashboard Overview

**Endpoint**: `GET /analytics/overview`  
**Authentication**: Bearer Token  
**Rate Limit**: 120 requests/minute/user

**Description**: Get comprehensive dashboard overview with key metrics

**Query Parameters**:
```
?period=month
&startDate=2025-11-01T00:00:00.000Z
&endDate=2025-11-30T23:59:59.000Z
&compareWith=previous
```

**Query Schema**:
```typescript
{
  period?: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all' | 'custom';
  startDate?: string;       // Required if period = 'custom'
  endDate?: string;         // Required if period = 'custom'
  compareWith?: 'previous' | 'none';  // Compare with previous period
  segment?: 'equity' | 'futures' | 'options' | 'all';
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "overview": {
      "period": {
        "start": "2025-11-01T00:00:00.000Z",
        "end": "2025-11-30T23:59:59.000Z",
        "label": "November 2025"
      },
      "summary": {
        "totalPnl": {
          "value": 125430.50,
          "change": 15.2,
          "changeType": "increase"
        },
        "totalTrades": {
          "value": 285,
          "change": 12.5,
          "changeType": "increase"
        },
        "winRate": {
          "value": 62.5,
          "change": 3.2,
          "changeType": "increase"
        },
        "profitFactor": {
          "value": 2.35,
          "change": 0.15,
          "changeType": "increase"
        },
        "averageWin": {
          "value": 3500.00,
          "change": -2.1,
          "changeType": "decrease"
        },
        "averageLoss": {
          "value": -1500.00,
          "change": 5.0,
          "changeType": "improvement"
        },
        "largestWin": {
          "value": 25000.00,
          "symbol": "RELIANCE",
          "date": "2025-11-15"
        },
        "largestLoss": {
          "value": -12000.00,
          "symbol": "TCS",
          "date": "2025-11-08"
        },
        "maxDrawdown": {
          "value": -35000.00,
          "percentage": -8.5,
          "startDate": "2025-11-05",
          "endDate": "2025-11-12"
        },
        "consecutiveWins": {
          "current": 5,
          "max": 12
        },
        "consecutiveLosses": {
          "current": 0,
          "max": 4
        }
      },
      "capital": {
        "starting": 500000.00,
        "current": 625430.50,
        "growth": 25.09,
        "peak": 645000.00,
        "peakDate": "2025-11-22"
      },
      "charges": {
        "brokerage": 5680.00,
        "stt": 12540.00,
        "gst": 1022.00,
        "stampDuty": 1890.00,
        "other": 456.00,
        "total": 21588.00
      },
      "riskMetrics": {
        "sharpeRatio": 1.85,
        "sortinoRatio": 2.15,
        "calmarRatio": 2.95,
        "volatility": 12.5,
        "beta": 0.85,
        "valueAtRisk": -15000.00
      }
    }
  },
  "meta": {
    "timestamp": "2025-11-27T10:30:00.000Z",
    "requestId": "req_analytics001",
    "cached": false,
    "cacheExpiry": "2025-11-27T10:35:00.000Z"
  }
}
```

---

### 4.2 Get Monthly Analytics

**Endpoint**: `GET /analytics/monthly`  
**Authentication**: Bearer Token  
**Rate Limit**: 60 requests/minute/user

**Description**: Get monthly P&L breakdown and performance trends

**Query Parameters**:
```
?year=2025
&months=12
&segment=all
```

**Query Schema**:
```typescript
{
  year?: number;            // Default: current year
  months?: number;          // Number of months to fetch, default: 12
  segment?: 'equity' | 'futures' | 'options' | 'all';
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "monthlyData": [
      {
        "month": "2025-11",
        "monthName": "November 2025",
        "trades": {
          "total": 285,
          "winning": 178,
          "losing": 100,
          "breakeven": 7
        },
        "pnl": {
          "gross": 147018.50,
          "net": 125430.50,
          "charges": 21588.00
        },
        "winRate": 62.5,
        "profitFactor": 2.35,
        "averageWin": 3500.00,
        "averageLoss": -1500.00,
        "roi": 25.09,
        "maxDrawdown": -8.5,
        "tradingDays": 20,
        "averageTradesPerDay": 14.25
      },
      {
        "month": "2025-10",
        "monthName": "October 2025",
        "trades": {
          "total": 253,
          "winning": 150,
          "losing": 95,
          "breakeven": 8
        },
        "pnl": {
          "gross": 115000.00,
          "net": 98500.00,
          "charges": 16500.00
        },
        "winRate": 59.3,
        "profitFactor": 2.10,
        "averageWin": 3200.00,
        "averageLoss": -1600.00,
        "roi": 19.7,
        "maxDrawdown": -12.3,
        "tradingDays": 22,
        "averageTradesPerDay": 11.5
      }
    ],
    "yearToDate": {
      "totalPnl": 485230.50,
      "totalTrades": 2850,
      "avgMonthlyPnl": 44111.86,
      "avgWinRate": 60.2,
      "bestMonth": {
        "month": "2025-11",
        "pnl": 125430.50
      },
      "worstMonth": {
        "month": "2025-03",
        "pnl": -15230.00
      },
      "profitableMonths": 9,
      "losingMonths": 2
    },
    "trend": {
      "direction": "up",
      "momentum": "strong",
      "forecast": {
        "nextMonth": 130000.00,
        "confidence": 72
      }
    }
  },
  "meta": {
    "timestamp": "2025-11-27T10:30:00.000Z",
    "requestId": "req_analytics002"
  }
}
```

---

### 4.3 Get Weekly Analytics

**Endpoint**: `GET /analytics/weekly`  
**Authentication**: Bearer Token  
**Rate Limit**: 60 requests/minute/user

**Description**: Get weekly performance breakdown

**Query Parameters**:
```
?weeks=12
&startDate=2025-09-01T00:00:00.000Z
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "weeklyData": [
      {
        "week": 48,
        "year": 2025,
        "weekStart": "2025-11-25",
        "weekEnd": "2025-11-29",
        "trades": 58,
        "pnl": {
          "gross": 32500.00,
          "net": 28450.00,
          "charges": 4050.00
        },
        "winRate": 65.5,
        "profitFactor": 2.8,
        "tradingDays": 4,
        "bestDay": {
          "date": "2025-11-27",
          "pnl": 12500.00
        },
        "worstDay": {
          "date": "2025-11-25",
          "pnl": -2500.00
        }
      },
      {
        "week": 47,
        "year": 2025,
        "weekStart": "2025-11-18",
        "weekEnd": "2025-11-22",
        "trades": 72,
        "pnl": {
          "gross": 45000.00,
          "net": 39200.00,
          "charges": 5800.00
        },
        "winRate": 63.9,
        "profitFactor": 2.5,
        "tradingDays": 5,
        "bestDay": {
          "date": "2025-11-20",
          "pnl": 18000.00
        },
        "worstDay": {
          "date": "2025-11-18",
          "pnl": -4500.00
        }
      }
    ],
    "weekdayPerformance": {
      "monday": { "avgPnl": 2500.00, "winRate": 58.0, "trades": 45 },
      "tuesday": { "avgPnl": 3200.00, "winRate": 62.0, "trades": 52 },
      "wednesday": { "avgPnl": 4100.00, "winRate": 68.0, "trades": 48 },
      "thursday": { "avgPnl": 2800.00, "winRate": 60.0, "trades": 55 },
      "friday": { "avgPnl": 1500.00, "winRate": 55.0, "trades": 42 }
    }
  }
}
```

---

### 4.4 Get Category Analytics

**Endpoint**: `GET /analytics/category`  
**Authentication**: Bearer Token  
**Rate Limit**: 60 requests/minute/user

**Description**: Get performance analytics by category (segment, strategy, symbol, etc.)

**Query Parameters**:
```
?category=segment
&period=month
&startDate=2025-11-01T00:00:00.000Z
&endDate=2025-11-30T23:59:59.000Z
&limit=20
&sortBy=pnl
```

**Query Schema**:
```typescript
{
  category: 'segment' | 'strategy' | 'symbol' | 'tradeType' | 'exchange' | 'broker' | 'tag';
  period?: 'week' | 'month' | 'quarter' | 'year' | 'custom';
  startDate?: string;
  endDate?: string;
  limit?: number;           // Default: 20
  sortBy?: 'pnl' | 'trades' | 'winRate' | 'profitFactor';
  sortOrder?: 'asc' | 'desc';  // Default: 'desc'
}
```

**Success Response** (200 OK) - By Segment:
```json
{
  "success": true,
  "data": {
    "category": "segment",
    "period": {
      "start": "2025-11-01T00:00:00.000Z",
      "end": "2025-11-30T23:59:59.000Z"
    },
    "breakdown": [
      {
        "name": "equity",
        "displayName": "Equity",
        "trades": {
          "total": 180,
          "winning": 115,
          "losing": 60,
          "breakeven": 5
        },
        "pnl": {
          "gross": 85000.00,
          "net": 72500.00,
          "charges": 12500.00
        },
        "winRate": 63.9,
        "profitFactor": 2.45,
        "averageWin": 3200.00,
        "averageLoss": -1400.00,
        "roi": 18.5,
        "contribution": 57.8,
        "avgHoldingPeriod": 240
      },
      {
        "name": "futures",
        "displayName": "Futures & Options",
        "trades": {
          "total": 75,
          "winning": 45,
          "losing": 28,
          "breakeven": 2
        },
        "pnl": {
          "gross": 42000.00,
          "net": 35430.50,
          "charges": 6569.50
        },
        "winRate": 60.0,
        "profitFactor": 2.15,
        "averageWin": 4500.00,
        "averageLoss": -2200.00,
        "roi": 28.3,
        "contribution": 28.3,
        "avgHoldingPeriod": 120
      },
      {
        "name": "options",
        "displayName": "Options",
        "trades": {
          "total": 30,
          "winning": 18,
          "losing": 12,
          "breakeven": 0
        },
        "pnl": {
          "gross": 22000.00,
          "net": 17500.00,
          "charges": 4500.00
        },
        "winRate": 60.0,
        "profitFactor": 2.0,
        "averageWin": 5500.00,
        "averageLoss": -3800.00,
        "roi": 35.0,
        "contribution": 13.9,
        "avgHoldingPeriod": 45
      }
    ],
    "totals": {
      "trades": 285,
      "pnl": 125430.50,
      "avgWinRate": 61.4
    }
  },
  "meta": {
    "timestamp": "2025-11-27T10:30:00.000Z",
    "requestId": "req_analytics003"
  }
}
```

**Success Response** - By Strategy:
```json
{
  "success": true,
  "data": {
    "category": "strategy",
    "breakdown": [
      {
        "name": "breakout",
        "displayName": "Breakout Trading",
        "trades": { "total": 85, "winning": 58, "losing": 25, "breakeven": 2 },
        "pnl": { "gross": 52000.00, "net": 45500.00, "charges": 6500.00 },
        "winRate": 68.2,
        "profitFactor": 3.1,
        "contribution": 36.3
      },
      {
        "name": "momentum",
        "displayName": "Momentum Trading",
        "trades": { "total": 65, "winning": 38, "losing": 25, "breakeven": 2 },
        "pnl": { "gross": 35000.00, "net": 30200.00, "charges": 4800.00 },
        "winRate": 58.5,
        "profitFactor": 2.2,
        "contribution": 24.1
      },
      {
        "name": "reversal",
        "displayName": "Mean Reversion",
        "trades": { "total": 45, "winning": 26, "losing": 18, "breakeven": 1 },
        "pnl": { "gross": 22000.00, "net": 18730.50, "charges": 3269.50 },
        "winRate": 57.8,
        "profitFactor": 1.95,
        "contribution": 14.9
      }
    ]
  }
}
```

**Success Response** - By Symbol (Top Performers):
```json
{
  "success": true,
  "data": {
    "category": "symbol",
    "breakdown": [
      {
        "name": "RELIANCE",
        "displayName": "Reliance Industries",
        "exchange": "NSE",
        "sector": "Energy",
        "trades": { "total": 35, "winning": 25, "losing": 9, "breakeven": 1 },
        "pnl": { "gross": 28500.00, "net": 25200.00, "charges": 3300.00 },
        "winRate": 71.4,
        "profitFactor": 3.5,
        "avgTrade": 720.00,
        "contribution": 20.1
      },
      {
        "name": "TCS",
        "displayName": "Tata Consultancy Services",
        "exchange": "NSE",
        "sector": "IT",
        "trades": { "total": 28, "winning": 18, "losing": 9, "breakeven": 1 },
        "pnl": { "gross": 22000.00, "net": 18500.00, "charges": 3500.00 },
        "winRate": 64.3,
        "profitFactor": 2.6,
        "avgTrade": 660.71,
        "contribution": 14.8
      },
      {
        "name": "INFY",
        "displayName": "Infosys",
        "exchange": "NSE",
        "sector": "IT",
        "trades": { "total": 22, "winning": 14, "losing": 7, "breakeven": 1 },
        "pnl": { "gross": 16500.00, "net": 14200.00, "charges": 2300.00 },
        "winRate": 63.6,
        "profitFactor": 2.4,
        "avgTrade": 645.45,
        "contribution": 11.3
      }
    ]
  }
}
```

---

### 4.5 Get Trading Heatmap

**Endpoint**: `GET /analytics/heatmap`  
**Authentication**: Bearer Token  
**Rate Limit**: 60 requests/minute/user

**Description**: Get trading activity and P&L heatmap data

**Query Parameters**:
```
?type=pnl
&period=year
&year=2025
```

**Query Schema**:
```typescript
{
  type: 'pnl' | 'trades' | 'winRate';  // What to visualize
  period?: 'month' | 'quarter' | 'year';  // Default: 'year'
  year?: number;                       // Default: current year
  month?: number;                      // 1-12, for monthly view
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "heatmap": {
      "type": "pnl",
      "year": 2025,
      "data": [
        {
          "date": "2025-01-02",
          "value": 5200.00,
          "trades": 12,
          "winRate": 75.0,
          "intensity": 0.65
        },
        {
          "date": "2025-01-03",
          "value": -2100.00,
          "trades": 8,
          "winRate": 37.5,
          "intensity": -0.35
        },
        {
          "date": "2025-01-06",
          "value": 8500.00,
          "trades": 15,
          "winRate": 80.0,
          "intensity": 0.85
        }
      ],
      "statistics": {
        "tradingDays": 230,
        "profitableDays": 145,
        "losingDays": 75,
        "breakevenDays": 10,
        "bestDay": {
          "date": "2025-11-15",
          "pnl": 28500.00
        },
        "worstDay": {
          "date": "2025-03-12",
          "pnl": -18200.00
        },
        "avgDailyPnl": 2110.13,
        "avgDailyTrades": 12.4,
        "streaks": {
          "currentWinStreak": 5,
          "longestWinStreak": 14,
          "currentLossStreak": 0,
          "longestLossStreak": 5
        }
      },
      "monthSummary": [
        { "month": 1, "name": "Jan", "pnl": 32500.00, "days": 22, "avgDaily": 1477.27 },
        { "month": 2, "name": "Feb", "pnl": 28000.00, "days": 19, "avgDaily": 1473.68 },
        { "month": 3, "name": "Mar", "pnl": -15230.00, "days": 21, "avgDaily": -725.24 },
        { "month": 4, "name": "Apr", "pnl": 42000.00, "days": 20, "avgDaily": 2100.00 },
        { "month": 5, "name": "May", "pnl": 38500.00, "days": 21, "avgDaily": 1833.33 },
        { "month": 6, "name": "Jun", "pnl": 52000.00, "days": 21, "avgDaily": 2476.19 },
        { "month": 7, "name": "Jul", "pnl": 35000.00, "days": 22, "avgDaily": 1590.91 },
        { "month": 8, "name": "Aug", "pnl": 45500.00, "days": 21, "avgDaily": 2166.67 },
        { "month": 9, "name": "Sep", "pnl": 28960.00, "days": 20, "avgDaily": 1448.00 },
        { "month": 10, "name": "Oct", "pnl": 98500.00, "days": 22, "avgDaily": 4477.27 },
        { "month": 11, "name": "Nov", "pnl": 125430.50, "days": 20, "avgDaily": 6271.53 }
      ],
      "weekdayAverage": {
        "monday": { "avgPnl": 1850.00, "avgTrades": 11, "profitablePercent": 58 },
        "tuesday": { "avgPnl": 2200.00, "avgTrades": 13, "profitablePercent": 62 },
        "wednesday": { "avgPnl": 2650.00, "avgTrades": 14, "profitablePercent": 68 },
        "thursday": { "avgPnl": 2100.00, "avgTrades": 12, "profitablePercent": 60 },
        "friday": { "avgPnl": 1200.00, "avgTrades": 10, "profitablePercent": 52 }
      }
    }
  },
  "meta": {
    "timestamp": "2025-11-27T10:30:00.000Z",
    "requestId": "req_analytics004"
  }
}
```

---

### 4.6 Get Time-Based Analytics

**Endpoint**: `GET /analytics/time-analysis`  
**Authentication**: Bearer Token  
**Rate Limit**: 60 requests/minute/user

**Description**: Get performance analytics based on time of day

**Query Parameters**:
```
?period=month
&timezone=Asia/Kolkata
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "timeAnalysis": {
      "timezone": "Asia/Kolkata",
      "hourlyBreakdown": [
        {
          "hour": 9,
          "label": "09:00 - 10:00",
          "trades": 85,
          "pnl": 18500.00,
          "winRate": 55.3,
          "avgTrade": 217.65,
          "notes": "Market open volatility"
        },
        {
          "hour": 10,
          "label": "10:00 - 11:00",
          "trades": 62,
          "pnl": 25200.00,
          "winRate": 67.7,
          "avgTrade": 406.45,
          "notes": "Best performing hour"
        },
        {
          "hour": 11,
          "label": "11:00 - 12:00",
          "trades": 45,
          "pnl": 12500.00,
          "winRate": 62.2,
          "avgTrade": 277.78
        },
        {
          "hour": 12,
          "label": "12:00 - 13:00",
          "trades": 28,
          "pnl": 5200.00,
          "winRate": 57.1,
          "avgTrade": 185.71,
          "notes": "Lunch hour - lower volume"
        },
        {
          "hour": 13,
          "label": "13:00 - 14:00",
          "trades": 35,
          "pnl": 8500.00,
          "winRate": 60.0,
          "avgTrade": 242.86
        },
        {
          "hour": 14,
          "label": "14:00 - 15:00",
          "trades": 42,
          "pnl": 15800.00,
          "winRate": 64.3,
          "avgTrade": 376.19
        },
        {
          "hour": 15,
          "label": "15:00 - 15:30",
          "trades": 38,
          "pnl": 8230.50,
          "winRate": 52.6,
          "avgTrade": 216.59,
          "notes": "Market close - increased volatility"
        }
      ],
      "bestTradingHours": [
        { "hour": 10, "avgPnl": 25200.00, "winRate": 67.7 },
        { "hour": 14, "avgPnl": 15800.00, "winRate": 64.3 }
      ],
      "worstTradingHours": [
        { "hour": 12, "avgPnl": 5200.00, "winRate": 57.1 },
        { "hour": 15, "avgPnl": 8230.50, "winRate": 52.6 }
      ],
      "recommendations": [
        "Focus trading during 10:00-11:00 for best returns",
        "Consider reducing position size during lunch hours (12:00-13:00)",
        "Be cautious during market close volatility (15:00-15:30)"
      ]
    }
  }
}
```

---

### 4.7 Get Risk Analytics

**Endpoint**: `GET /analytics/risk`  
**Authentication**: Bearer Token  
**Rate Limit**: 60 requests/minute/user

**Description**: Get comprehensive risk analysis metrics

**Query Parameters**:
```
?period=month
&riskFreeRate=0.06
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "riskAnalytics": {
      "period": {
        "start": "2025-11-01T00:00:00.000Z",
        "end": "2025-11-30T23:59:59.000Z"
      },
      "metrics": {
        "sharpeRatio": {
          "value": 1.85,
          "interpretation": "Good risk-adjusted returns",
          "benchmark": 1.0
        },
        "sortinoRatio": {
          "value": 2.15,
          "interpretation": "Excellent downside risk management",
          "benchmark": 1.5
        },
        "calmarRatio": {
          "value": 2.95,
          "interpretation": "Strong return vs drawdown",
          "benchmark": 1.0
        },
        "maxDrawdown": {
          "value": -35000.00,
          "percentage": -8.5,
          "duration": 7,
          "recoveryDays": 12,
          "startDate": "2025-11-05",
          "endDate": "2025-11-12",
          "recoveryDate": "2025-11-24"
        },
        "volatility": {
          "daily": 2.5,
          "weekly": 5.8,
          "monthly": 12.5,
          "annualized": 43.3
        },
        "beta": {
          "value": 0.85,
          "benchmark": "NIFTY50",
          "interpretation": "Lower volatility than market"
        },
        "alpha": {
          "value": 12.5,
          "interpretation": "Significant excess returns"
        },
        "valueAtRisk": {
          "daily95": -8500.00,
          "daily99": -15000.00,
          "weekly95": -19500.00,
          "interpretation": "95% confidence: max daily loss ₹8,500"
        },
        "expectedShortfall": {
          "daily95": -12500.00,
          "interpretation": "When losses exceed VaR, expect ₹12,500 avg loss"
        }
      },
      "drawdowns": [
        {
          "startDate": "2025-11-05",
          "endDate": "2025-11-12",
          "amount": -35000.00,
          "percentage": -8.5,
          "duration": 7,
          "recovered": true,
          "recoveryDays": 12
        },
        {
          "startDate": "2025-10-15",
          "endDate": "2025-10-18",
          "amount": -22000.00,
          "percentage": -5.2,
          "duration": 3,
          "recovered": true,
          "recoveryDays": 5
        }
      ],
      "positionSizing": {
        "avgPositionSize": 125000.00,
        "maxPositionSize": 250000.00,
        "avgRiskPerTrade": 2500.00,
        "maxRiskPerTrade": 5000.00,
        "avgRiskPercentage": 2.0,
        "recommendation": "Consider reducing max position size to 15% of capital"
      },
      "riskScore": {
        "overall": 72,
        "interpretation": "Moderate-Low Risk",
        "factors": [
          { "name": "Drawdown Management", "score": 75, "weight": 0.25 },
          { "name": "Position Sizing", "score": 70, "weight": 0.20 },
          { "name": "Win Rate Consistency", "score": 78, "weight": 0.20 },
          { "name": "Volatility Control", "score": 68, "weight": 0.15 },
          { "name": "Risk-Reward Ratio", "score": 72, "weight": 0.20 }
        ]
      }
    }
  }
}
```

---

### 4.8 Get Comparison Analytics

**Endpoint**: `GET /analytics/compare`  
**Authentication**: Bearer Token  
**Rate Limit**: 30 requests/minute/user

**Description**: Compare performance across different periods or segments

**Query Parameters**:
```
?type=period
&period1Start=2025-10-01T00:00:00.000Z
&period1End=2025-10-31T23:59:59.000Z
&period2Start=2025-11-01T00:00:00.000Z
&period2End=2025-11-30T23:59:59.000Z
```

**Query Schema**:
```typescript
{
  type: 'period' | 'segment' | 'strategy' | 'broker';
  // For period comparison
  period1Start?: string;
  period1End?: string;
  period2Start?: string;
  period2End?: string;
  // For segment/strategy/broker comparison
  compare1?: string;
  compare2?: string;
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "comparison": {
      "type": "period",
      "period1": {
        "label": "October 2025",
        "start": "2025-10-01T00:00:00.000Z",
        "end": "2025-10-31T23:59:59.000Z",
        "trades": 253,
        "pnl": 98500.00,
        "winRate": 59.3,
        "profitFactor": 2.10,
        "avgTrade": 389.33,
        "maxDrawdown": -12.3
      },
      "period2": {
        "label": "November 2025",
        "start": "2025-11-01T00:00:00.000Z",
        "end": "2025-11-30T23:59:59.000Z",
        "trades": 285,
        "pnl": 125430.50,
        "winRate": 62.5,
        "profitFactor": 2.35,
        "avgTrade": 440.11,
        "maxDrawdown": -8.5
      },
      "changes": {
        "trades": { "absolute": 32, "percentage": 12.6 },
        "pnl": { "absolute": 26930.50, "percentage": 27.3 },
        "winRate": { "absolute": 3.2, "percentage": 5.4 },
        "profitFactor": { "absolute": 0.25, "percentage": 11.9 },
        "avgTrade": { "absolute": 50.78, "percentage": 13.0 },
        "maxDrawdown": { "absolute": 3.8, "percentage": 30.9 }
      },
      "insights": [
        "P&L improved by 27.3% compared to previous period",
        "Win rate increased by 3.2 percentage points",
        "Drawdown reduced significantly - better risk management",
        "Higher trading frequency with maintained quality"
      ]
    }
  }
}
```

---

### Analytics Routes Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/analytics/overview` | ✅ | Dashboard overview |
| GET | `/analytics/monthly` | ✅ | Monthly breakdown |
| GET | `/analytics/weekly` | ✅ | Weekly breakdown |
| GET | `/analytics/category` | ✅ | Category analysis |
| GET | `/analytics/heatmap` | ✅ | Trading heatmap |
| GET | `/analytics/time-analysis` | ✅ | Time-based analysis |
| GET | `/analytics/risk` | ✅ | Risk metrics |
| GET | `/analytics/compare` | ✅ | Period comparison |

---

## 5. Market Data Routes

**Base Path**: `/market`

### 5.1 Get Market Indices

**Endpoint**: `GET /market/indices`  
**Authentication**: Bearer Token  
**Rate Limit**: 120 requests/minute/user

**Description**: Get current market indices data (NIFTY, SENSEX, BANKNIFTY, etc.)

**Query Parameters**:
```
?indices=NIFTY50,SENSEX,BANKNIFTY
&includeHistory=true
```

**Query Schema**:
```typescript
{
  indices?: string;           // Comma-separated index names
  includeHistory?: boolean;   // Include intraday OHLC
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "indices": [
      {
        "symbol": "NIFTY50",
        "name": "NIFTY 50",
        "exchange": "NSE",
        "lastPrice": 19850.25,
        "change": 125.50,
        "changePercent": 0.64,
        "open": 19724.75,
        "high": 19875.00,
        "low": 19700.00,
        "previousClose": 19724.75,
        "volume": 285000000,
        "value": 12500000000,
        "timestamp": "2025-11-27T15:30:00.000Z",
        "status": "closed",
        "advanceDecline": {
          "advances": 32,
          "declines": 16,
          "unchanged": 2
        },
        "history": [
          { "time": "09:15", "open": 19724.75, "high": 19730.00, "low": 19710.00, "close": 19725.50 },
          { "time": "09:30", "open": 19725.50, "high": 19760.00, "low": 19720.00, "close": 19755.25 }
        ]
      },
      {
        "symbol": "SENSEX",
        "name": "S&P BSE SENSEX",
        "exchange": "BSE",
        "lastPrice": 66250.75,
        "change": 420.25,
        "changePercent": 0.64,
        "open": 65830.50,
        "high": 66320.00,
        "low": 65780.00,
        "previousClose": 65830.50,
        "timestamp": "2025-11-27T15:30:00.000Z",
        "status": "closed"
      },
      {
        "symbol": "BANKNIFTY",
        "name": "NIFTY BANK",
        "exchange": "NSE",
        "lastPrice": 44520.50,
        "change": 280.75,
        "changePercent": 0.63,
        "open": 44239.75,
        "high": 44600.00,
        "low": 44150.00,
        "previousClose": 44239.75,
        "timestamp": "2025-11-27T15:30:00.000Z",
        "status": "closed"
      }
    ],
    "marketStatus": {
      "nse": "closed",
      "bse": "closed",
      "nextOpen": "2025-11-28T09:15:00.000Z",
      "holiday": false
    }
  },
  "meta": {
    "timestamp": "2025-11-27T15:35:00.000Z",
    "requestId": "req_market001",
    "dataDelay": "15min"
  }
}
```

---

### 5.2 Get Stock Quote

**Endpoint**: `GET /market/stock/:symbol`  
**Authentication**: Bearer Token  
**Rate Limit**: 120 requests/minute/user

**Description**: Get detailed quote for a specific stock

**Path Parameters**:
- `symbol` (string, required): Stock symbol (e.g., RELIANCE, TCS)

**Query Parameters**:
```
?exchange=NSE
&includeDepth=true
&includeFundamentals=true
```

**Query Schema**:
```typescript
{
  exchange?: 'NSE' | 'BSE';   // Default: 'NSE'
  includeDepth?: boolean;     // Include order book depth
  includeFundamentals?: boolean; // Include P/E, market cap, etc.
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "stock": {
      "symbol": "RELIANCE",
      "name": "Reliance Industries Ltd",
      "isin": "INE002A01018",
      "exchange": "NSE",
      "segment": "equity",
      "series": "EQ",
      "lotSize": 1,
      "tickSize": 0.05,
      "quote": {
        "lastPrice": 2485.50,
        "change": 35.25,
        "changePercent": 1.44,
        "open": 2450.25,
        "high": 2492.00,
        "low": 2445.00,
        "close": 2485.50,
        "previousClose": 2450.25,
        "volume": 8500000,
        "value": 21125750000,
        "avgPrice": 2485.38,
        "lastTradeTime": "2025-11-27T15:29:55.000Z",
        "timestamp": "2025-11-27T15:30:00.000Z"
      },
      "ohlc": {
        "open": 2450.25,
        "high": 2492.00,
        "low": 2445.00,
        "close": 2485.50
      },
      "priceRange": {
        "week52High": 2856.15,
        "week52Low": 2180.00,
        "week52HighDate": "2025-07-15",
        "week52LowDate": "2025-01-20"
      },
      "depth": {
        "buy": [
          { "price": 2485.45, "quantity": 1500, "orders": 12 },
          { "price": 2485.40, "quantity": 2200, "orders": 18 },
          { "price": 2485.35, "quantity": 3500, "orders": 25 },
          { "price": 2485.30, "quantity": 4000, "orders": 30 },
          { "price": 2485.25, "quantity": 5500, "orders": 42 }
        ],
        "sell": [
          { "price": 2485.55, "quantity": 1200, "orders": 10 },
          { "price": 2485.60, "quantity": 1800, "orders": 15 },
          { "price": 2485.65, "quantity": 2500, "orders": 20 },
          { "price": 2485.70, "quantity": 3200, "orders": 28 },
          { "price": 2485.75, "quantity": 4500, "orders": 35 }
        ],
        "totalBuyQty": 16700,
        "totalSellQty": 13200
      },
      "fundamentals": {
        "marketCap": 1680500000000,
        "marketCapCategory": "Large Cap",
        "peRatio": 28.5,
        "pbRatio": 2.8,
        "dividendYield": 0.35,
        "eps": 87.21,
        "bookValue": 887.68,
        "faceValue": 10,
        "sector": "Energy",
        "industry": "Oil & Gas Refining & Marketing"
      },
      "indices": ["NIFTY50", "NIFTY100", "NIFTY200"],
      "status": "active"
    }
  },
  "meta": {
    "timestamp": "2025-11-27T15:30:00.000Z",
    "requestId": "req_market002",
    "cached": true,
    "cacheExpiry": "2025-11-27T15:30:05.000Z"
  }
}
```

**Error Response** (404 Not Found):
```json
{
  "success": false,
  "error": {
    "code": "STOCK_NOT_FOUND",
    "message": "Stock 'INVALID' not found on NSE"
  }
}
```

---

### 5.3 Get Multiple Stock Quotes

**Endpoint**: `GET /market/stocks`  
**Authentication**: Bearer Token  
**Rate Limit**: 60 requests/minute/user

**Description**: Get quotes for multiple stocks at once

**Query Parameters**:
```
?symbols=RELIANCE,TCS,INFY,HDFC,ICICIBANK
&exchange=NSE
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "stocks": [
      {
        "symbol": "RELIANCE",
        "lastPrice": 2485.50,
        "change": 35.25,
        "changePercent": 1.44,
        "volume": 8500000
      },
      {
        "symbol": "TCS",
        "lastPrice": 3580.25,
        "change": -25.50,
        "changePercent": -0.71,
        "volume": 2500000
      },
      {
        "symbol": "INFY",
        "lastPrice": 1450.75,
        "change": 12.25,
        "changePercent": 0.85,
        "volume": 5200000
      }
    ],
    "totalRequested": 5,
    "found": 5,
    "notFound": []
  }
}
```

---

### 5.4 Get OHLC Candles

**Endpoint**: `GET /market/candles/:symbol`  
**Authentication**: Bearer Token  
**Rate Limit**: 60 requests/minute/user

**Description**: Get historical OHLC candle data for a stock

**Path Parameters**:
- `symbol` (string, required): Stock symbol

**Query Parameters**:
```
?interval=1d
&from=2025-10-01T00:00:00.000Z
&to=2025-11-27T23:59:59.000Z
&exchange=NSE
```

**Query Schema**:
```typescript
{
  interval: '1m' | '5m' | '15m' | '30m' | '1h' | '1d' | '1w' | '1M';
  from: string;              // ISO 8601, required
  to: string;                // ISO 8601, required
  exchange?: 'NSE' | 'BSE';  // Default: 'NSE'
  adjustments?: boolean;     // Adjust for splits/bonus, default: true
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "symbol": "RELIANCE",
    "exchange": "NSE",
    "interval": "1d",
    "candles": [
      {
        "timestamp": "2025-11-27T00:00:00.000Z",
        "open": 2450.25,
        "high": 2492.00,
        "low": 2445.00,
        "close": 2485.50,
        "volume": 8500000,
        "value": 21125750000
      },
      {
        "timestamp": "2025-11-26T00:00:00.000Z",
        "open": 2440.00,
        "high": 2458.00,
        "low": 2425.00,
        "close": 2450.25,
        "volume": 7200000,
        "value": 17641800000
      },
      {
        "timestamp": "2025-11-25T00:00:00.000Z",
        "open": 2465.00,
        "high": 2470.00,
        "low": 2435.00,
        "close": 2440.00,
        "volume": 6800000,
        "value": 16592000000
      }
    ],
    "totalCandles": 40,
    "adjustedFor": ["splits", "bonus"]
  },
  "meta": {
    "timestamp": "2025-11-27T15:30:00.000Z",
    "requestId": "req_market003"
  }
}
```

**Error Responses**:

*400 Bad Request* (Invalid date range):
```json
{
  "success": false,
  "error": {
    "code": "INVALID_DATE_RANGE",
    "message": "Date range exceeds maximum allowed (1 year for daily, 30 days for intraday)"
  }
}
```

---

### 5.5 Get Top Gainers

**Endpoint**: `GET /market/top-gainers`  
**Authentication**: Bearer Token  
**Rate Limit**: 60 requests/minute/user

**Description**: Get top gaining stocks

**Query Parameters**:
```
?exchange=NSE
&index=NIFTY50
&limit=10
```

**Query Schema**:
```typescript
{
  exchange?: 'NSE' | 'BSE';      // Default: 'NSE'
  index?: string;                // Filter by index (NIFTY50, NIFTY100, etc.)
  segment?: 'equity' | 'futures' | 'options';
  limit?: number;                // Default: 10, max: 50
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "gainers": [
      {
        "rank": 1,
        "symbol": "TATAMOTORS",
        "name": "Tata Motors Ltd",
        "exchange": "NSE",
        "lastPrice": 685.50,
        "change": 42.75,
        "changePercent": 6.65,
        "open": 642.75,
        "high": 690.00,
        "low": 640.00,
        "previousClose": 642.75,
        "volume": 25000000,
        "value": 17137500000
      },
      {
        "rank": 2,
        "symbol": "BAJFINANCE",
        "name": "Bajaj Finance Ltd",
        "exchange": "NSE",
        "lastPrice": 7250.00,
        "change": 350.25,
        "changePercent": 5.08,
        "open": 6899.75,
        "high": 7280.00,
        "low": 6875.00,
        "previousClose": 6899.75,
        "volume": 3500000,
        "value": 25375000000
      },
      {
        "rank": 3,
        "symbol": "ADANIENT",
        "name": "Adani Enterprises Ltd",
        "exchange": "NSE",
        "lastPrice": 2850.00,
        "change": 125.50,
        "changePercent": 4.61,
        "open": 2724.50,
        "high": 2865.00,
        "low": 2710.00,
        "previousClose": 2724.50,
        "volume": 8500000,
        "value": 24225000000
      }
    ],
    "asOf": "2025-11-27T15:30:00.000Z",
    "index": "NIFTY50",
    "totalGainers": 32
  },
  "meta": {
    "timestamp": "2025-11-27T15:30:00.000Z",
    "requestId": "req_market004"
  }
}
```

---

### 5.6 Get Top Losers

**Endpoint**: `GET /market/top-losers`  
**Authentication**: Bearer Token  
**Rate Limit**: 60 requests/minute/user

**Description**: Get top losing stocks

**Query Parameters**:
```
?exchange=NSE
&index=NIFTY50
&limit=10
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "losers": [
      {
        "rank": 1,
        "symbol": "COALINDIA",
        "name": "Coal India Ltd",
        "exchange": "NSE",
        "lastPrice": 245.50,
        "change": -12.75,
        "changePercent": -4.94,
        "open": 258.25,
        "high": 259.00,
        "low": 244.00,
        "previousClose": 258.25,
        "volume": 18000000,
        "value": 4419000000
      },
      {
        "rank": 2,
        "symbol": "ONGC",
        "name": "Oil & Natural Gas Corp",
        "exchange": "NSE",
        "lastPrice": 185.25,
        "change": -8.50,
        "changePercent": -4.39,
        "open": 193.75,
        "high": 194.00,
        "low": 184.00,
        "previousClose": 193.75,
        "volume": 22000000,
        "value": 4075500000
      }
    ],
    "asOf": "2025-11-27T15:30:00.000Z",
    "index": "NIFTY50",
    "totalLosers": 16
  }
}
```

---

### 5.7 Get Most Active Stocks

**Endpoint**: `GET /market/most-active`  
**Authentication**: Bearer Token  
**Rate Limit**: 60 requests/minute/user

**Description**: Get most actively traded stocks by volume/value

**Query Parameters**:
```
?exchange=NSE
&sortBy=volume
&limit=10
```

**Query Schema**:
```typescript
{
  exchange?: 'NSE' | 'BSE';
  sortBy?: 'volume' | 'value' | 'trades';  // Default: 'volume'
  index?: string;
  limit?: number;  // Default: 10, max: 50
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "mostActive": [
      {
        "rank": 1,
        "symbol": "TATAMOTORS",
        "name": "Tata Motors Ltd",
        "lastPrice": 685.50,
        "change": 42.75,
        "changePercent": 6.65,
        "volume": 85000000,
        "value": 58267500000,
        "trades": 425000,
        "avgTradeSize": 200
      },
      {
        "rank": 2,
        "symbol": "SBIN",
        "name": "State Bank of India",
        "lastPrice": 625.25,
        "change": 8.50,
        "changePercent": 1.38,
        "volume": 72000000,
        "value": 45018000000,
        "trades": 380000,
        "avgTradeSize": 189
      }
    ],
    "sortedBy": "volume",
    "asOf": "2025-11-27T15:30:00.000Z"
  }
}
```

---

### 5.8 Search Stocks

**Endpoint**: `GET /market/search`  
**Authentication**: Bearer Token  
**Rate Limit**: 120 requests/minute/user

**Description**: Search for stocks by name or symbol

**Query Parameters**:
```
?q=reliance
&exchange=NSE,BSE
&segment=equity
&limit=20
```

**Query Schema**:
```typescript
{
  q: string;                    // Search query, min 2 chars
  exchange?: string;            // Comma-separated exchanges
  segment?: 'equity' | 'futures' | 'options' | 'all';
  limit?: number;               // Default: 20, max: 50
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "symbol": "RELIANCE",
        "name": "Reliance Industries Ltd",
        "exchange": "NSE",
        "segment": "equity",
        "isin": "INE002A01018",
        "lastPrice": 2485.50,
        "changePercent": 1.44,
        "matchType": "symbol"
      },
      {
        "symbol": "RELIANCE",
        "name": "Reliance Industries Ltd",
        "exchange": "BSE",
        "segment": "equity",
        "isin": "INE002A01018",
        "lastPrice": 2485.25,
        "changePercent": 1.43,
        "matchType": "symbol"
      },
      {
        "symbol": "RELIANCEPP",
        "name": "Reliance Power Ltd",
        "exchange": "NSE",
        "segment": "equity",
        "isin": "INE614G01033",
        "lastPrice": 15.25,
        "changePercent": -2.55,
        "matchType": "name"
      }
    ],
    "totalResults": 8,
    "query": "reliance"
  }
}
```

---

### 5.9 Get Market Status

**Endpoint**: `GET /market/status`  
**Authentication**: Bearer Token  
**Rate Limit**: 120 requests/minute/user

**Description**: Get current market status and trading hours

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "status": {
      "nse": {
        "exchange": "NSE",
        "status": "closed",
        "session": "post-market",
        "lastUpdate": "2025-11-27T15:30:00.000Z",
        "tradingHours": {
          "preMarket": { "start": "09:00", "end": "09:15" },
          "regular": { "start": "09:15", "end": "15:30" },
          "postMarket": { "start": "15:40", "end": "16:00" }
        },
        "nextSession": {
          "type": "pre-market",
          "starts": "2025-11-28T09:00:00.000Z"
        }
      },
      "bse": {
        "exchange": "BSE",
        "status": "closed",
        "session": "post-market",
        "lastUpdate": "2025-11-27T15:30:00.000Z"
      },
      "mcx": {
        "exchange": "MCX",
        "status": "open",
        "session": "evening",
        "lastUpdate": "2025-11-27T18:30:00.000Z"
      }
    },
    "holidays": {
      "upcoming": [
        { "date": "2025-12-25", "name": "Christmas", "exchanges": ["NSE", "BSE", "MCX"] }
      ]
    },
    "serverTime": "2025-11-27T18:30:00.000Z",
    "timezone": "Asia/Kolkata"
  }
}
```

---

### 5.10 Get Watchlist Prices

**Endpoint**: `GET /market/watchlist/:watchlistId/prices`  
**Authentication**: Bearer Token  
**Rate Limit**: 120 requests/minute/user

**Description**: Get live prices for all stocks in a watchlist

**Path Parameters**:
- `watchlistId` (string, required): Watchlist ID

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "watchlist": {
      "id": "507f1f77bcf86cd799439050",
      "name": "My Portfolio",
      "stocks": [
        {
          "symbol": "RELIANCE",
          "exchange": "NSE",
          "lastPrice": 2485.50,
          "change": 35.25,
          "changePercent": 1.44,
          "alertTriggered": false
        },
        {
          "symbol": "TCS",
          "exchange": "NSE",
          "lastPrice": 3580.25,
          "change": -25.50,
          "changePercent": -0.71,
          "alertTriggered": true,
          "alertType": "price_below",
          "alertValue": 3600.00
        }
      ],
      "lastUpdated": "2025-11-27T15:30:00.000Z"
    }
  }
}
```

---

## 6. WebSocket Real-Time Data

**Base URL**: `wss://ws.stocktracker.com/v1`

### 6.1 Connection & Authentication

**Connection URL**:
```
wss://ws.stocktracker.com/v1?token=<jwt_access_token>
```

**Connection Headers**:
```
Authorization: Bearer <jwt_access_token>
X-Client-Id: <unique_client_id>
```

**Connection Response**:
```json
{
  "type": "connection",
  "status": "connected",
  "connectionId": "ws_abc123def456",
  "serverTime": "2025-11-27T15:30:00.000Z",
  "heartbeatInterval": 30000,
  "maxSubscriptions": 100
}
```

**Heartbeat**:
```json
// Client sends every 30 seconds
{ "type": "ping", "timestamp": 1732722600000 }

// Server responds
{ "type": "pong", "timestamp": 1732722600005 }
```

---

### 6.2 Subscribe to Ticker

**Subscribe Request**:
```json
{
  "type": "subscribe",
  "channel": "ticker",
  "symbols": ["RELIANCE", "TCS", "INFY"],
  "exchange": "NSE",
  "mode": "full"
}
```

**Subscribe Schema**:
```typescript
{
  type: 'subscribe';
  channel: 'ticker' | 'depth' | 'trades' | 'candles' | 'indices';
  symbols: string[];           // Max 100 symbols per subscription
  exchange?: 'NSE' | 'BSE';    // Default: 'NSE'
  mode?: 'ltp' | 'quote' | 'full';  // ltp=price only, quote=OHLC, full=with depth
}
```

**Subscribe Response**:
```json
{
  "type": "subscribed",
  "channel": "ticker",
  "symbols": ["RELIANCE", "TCS", "INFY"],
  "exchange": "NSE",
  "mode": "full",
  "subscriptionId": "sub_ticker_001"
}
```

---

### 6.3 Ticker Data Events

**LTP Mode** (Lightweight):
```json
{
  "type": "ticker",
  "mode": "ltp",
  "symbol": "RELIANCE",
  "exchange": "NSE",
  "ltp": 2485.50,
  "timestamp": 1732722600000
}
```

**Quote Mode**:
```json
{
  "type": "ticker",
  "mode": "quote",
  "symbol": "RELIANCE",
  "exchange": "NSE",
  "ltp": 2485.50,
  "change": 35.25,
  "changePercent": 1.44,
  "open": 2450.25,
  "high": 2492.00,
  "low": 2445.00,
  "close": 2450.25,
  "volume": 8500000,
  "timestamp": 1732722600000
}
```

**Full Mode** (with Market Depth):
```json
{
  "type": "ticker",
  "mode": "full",
  "symbol": "RELIANCE",
  "exchange": "NSE",
  "ltp": 2485.50,
  "change": 35.25,
  "changePercent": 1.44,
  "open": 2450.25,
  "high": 2492.00,
  "low": 2445.00,
  "close": 2450.25,
  "volume": 8500000,
  "averagePrice": 2470.35,
  "lastTradeQty": 150,
  "lastTradeTime": 1732722599850,
  "oi": 0,
  "oiChange": 0,
  "depth": {
    "buy": [
      { "price": 2485.45, "quantity": 1500, "orders": 12 },
      { "price": 2485.40, "quantity": 2200, "orders": 18 },
      { "price": 2485.35, "quantity": 3500, "orders": 25 },
      { "price": 2485.30, "quantity": 4000, "orders": 30 },
      { "price": 2485.25, "quantity": 5500, "orders": 42 }
    ],
    "sell": [
      { "price": 2485.55, "quantity": 1200, "orders": 10 },
      { "price": 2485.60, "quantity": 1800, "orders": 15 },
      { "price": 2485.65, "quantity": 2500, "orders": 20 },
      { "price": 2485.70, "quantity": 3200, "orders": 28 },
      { "price": 2485.75, "quantity": 4500, "orders": 35 }
    ]
  },
  "timestamp": 1732722600000
}
```

---

### 6.4 Subscribe to Index Data

**Subscribe Request**:
```json
{
  "type": "subscribe",
  "channel": "indices",
  "indices": ["NIFTY50", "SENSEX", "BANKNIFTY"]
}
```

**Index Data Event**:
```json
{
  "type": "index",
  "symbol": "NIFTY50",
  "lastPrice": 19850.25,
  "change": 125.50,
  "changePercent": 0.64,
  "open": 19724.75,
  "high": 19875.00,
  "low": 19700.00,
  "previousClose": 19724.75,
  "timestamp": 1732722600000
}
```

---

### 6.5 Subscribe to Trade Alerts

**Subscribe Request**:
```json
{
  "type": "subscribe",
  "channel": "alerts",
  "alertTypes": ["price", "volume", "trade"]
}
```

**Price Alert Event**:
```json
{
  "type": "alert",
  "alertType": "price",
  "alertId": "alert_abc123",
  "symbol": "RELIANCE",
  "exchange": "NSE",
  "condition": "price_above",
  "threshold": 2480.00,
  "currentPrice": 2485.50,
  "message": "RELIANCE crossed above ₹2,480",
  "timestamp": 1732722600000
}
```

**Trade Sync Event**:
```json
{
  "type": "alert",
  "alertType": "trade",
  "event": "new_trade",
  "trade": {
    "id": "507f1f77bcf86cd799439020",
    "symbol": "RELIANCE",
    "position": "long",
    "status": "open",
    "entryPrice": 2480.00,
    "quantity": 100
  },
  "source": "broker_sync",
  "broker": "zerodha",
  "timestamp": 1732722600000
}
```

---

### 6.6 Subscribe to Candle Data

**Subscribe Request**:
```json
{
  "type": "subscribe",
  "channel": "candles",
  "symbols": ["RELIANCE", "TCS"],
  "exchange": "NSE",
  "interval": "1m"
}
```

**Candle Schema**:
```typescript
{
  type: 'subscribe';
  channel: 'candles';
  symbols: string[];
  exchange?: 'NSE' | 'BSE';
  interval: '1m' | '5m' | '15m' | '30m' | '1h';
}
```

**Candle Update Event**:
```json
{
  "type": "candle",
  "symbol": "RELIANCE",
  "exchange": "NSE",
  "interval": "1m",
  "candle": {
    "timestamp": 1732722600000,
    "open": 2485.00,
    "high": 2486.50,
    "low": 2484.00,
    "close": 2485.50,
    "volume": 125000,
    "complete": false
  }
}
```

---

### 6.7 Unsubscribe

**Unsubscribe Request**:
```json
{
  "type": "unsubscribe",
  "channel": "ticker",
  "symbols": ["RELIANCE"],
  "subscriptionId": "sub_ticker_001"
}
```

**Unsubscribe Response**:
```json
{
  "type": "unsubscribed",
  "channel": "ticker",
  "symbols": ["RELIANCE"],
  "subscriptionId": "sub_ticker_001"
}
```

**Unsubscribe All**:
```json
{
  "type": "unsubscribe_all"
}
```

---

### 6.8 Error Events

**Subscription Error**:
```json
{
  "type": "error",
  "code": "SUBSCRIPTION_LIMIT_EXCEEDED",
  "message": "Maximum subscription limit (100 symbols) exceeded",
  "subscriptionId": "sub_ticker_001"
}
```

**Connection Error**:
```json
{
  "type": "error",
  "code": "TOKEN_EXPIRED",
  "message": "Access token has expired. Please reconnect with a valid token.",
  "action": "reconnect"
}
```

**Symbol Error**:
```json
{
  "type": "error",
  "code": "INVALID_SYMBOL",
  "message": "Symbol 'INVALID' not found on NSE",
  "symbol": "INVALID"
}
```

---

### Market Data Routes Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/market/indices` | ✅ | Get market indices |
| GET | `/market/stock/:symbol` | ✅ | Get stock quote |
| GET | `/market/stocks` | ✅ | Get multiple quotes |
| GET | `/market/candles/:symbol` | ✅ | Get OHLC candles |
| GET | `/market/top-gainers` | ✅ | Get top gainers |
| GET | `/market/top-losers` | ✅ | Get top losers |
| GET | `/market/most-active` | ✅ | Get most active |
| GET | `/market/search` | ✅ | Search stocks |
| GET | `/market/status` | ✅ | Get market status |
| GET | `/market/watchlist/:id/prices` | ✅ | Get watchlist prices |

### WebSocket Channels

| Channel | Events | Description |
|---------|--------|-------------|
| `ticker` | ltp, quote, full | Real-time stock prices |
| `indices` | index | Real-time index data |
| `candles` | candle | Live OHLC candles |
| `alerts` | price, volume, trade | Trading alerts |
| `depth` | depth | Order book updates |

---

## API Versioning & Deprecation

### Version Headers
```
X-API-Version: 2025-11-27
X-Deprecation-Notice: This endpoint will be deprecated on 2026-06-01
```

### Sunset Header
```
Sunset: Sat, 01 Jun 2026 00:00:00 GMT
```

---

## Rate Limiting Headers

All responses include rate limit headers:
```
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 118
X-RateLimit-Reset: 1732722660
X-RateLimit-RetryAfter: 60
```

---

## Compression

All API responses support compression:
- Request: `Accept-Encoding: gzip, deflate, br`
- Response: `Content-Encoding: gzip`

---

## Complete API Summary

| Section | Routes | Endpoints | Description |
|---------|--------|-----------|-------------|
| Authentication | 11 | `/auth/*` | User auth, tokens, profile |
| Trades | 10 | `/trades/*` | CRUD, bulk, stats, export |
| Broker Sync | 10 | `/brokers/*` | OAuth, sync, status |
| Analytics | 8 | `/analytics/*` | Dashboard, reports, risk |
| Market Data | 10 | `/market/*` | Quotes, candles, search |
| WebSocket | 6 | `wss://` | Real-time ticker, alerts |

**Total: 55 REST Endpoints + 6 WebSocket Channels**

---

## Next Steps

After Part 4 (API Routes), the following parts remain:

- **Part 5**: Frontend Pages & Components
- **Part 6**: State Management (Redux)
- **Part 7**: Authentication Flow
- **Part 8**: Chart Components
- **Part 9**: Testing Strategy
- **Part 10**: Deployment & CI/CD

---

**Part 4 Complete** ✅

*Document Version: 0.4.0*  
*Last Updated: November 27, 2025*

