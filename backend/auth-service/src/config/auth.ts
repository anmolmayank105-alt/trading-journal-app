/**
 * JWT Configuration
 */

export const jwtConfig = {
  accessSecret: process.env.JWT_SECRET || 'default-secret-change-me',
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
