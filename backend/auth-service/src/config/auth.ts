/**
 * JWT Configuration
 */

// Validate required secrets in production
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('CRITICAL: JWT_SECRET environment variable is required in production');
}

export const jwtConfig = {
  accessSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production-2024',
  accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  refreshExpiryRemember: process.env.JWT_REFRESH_EXPIRY_REMEMBER || '30d',
  issuer: 'stock-tracker',
  audience: 'stock-tracker-users',
};

export const passwordConfig = {
  saltRounds: 12,
  minLength: 8,
  maxLength: 128,
};

export const sessionConfig = {
  maxSessions: 5,
  sessionTTL: 60 * 60 * 24 * 7, // 7 days in seconds
};
