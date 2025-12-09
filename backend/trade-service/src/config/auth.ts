/**
 * JWT Configuration for Token Verification
 */

// Validate required secrets in production
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('CRITICAL: JWT_SECRET environment variable is required in production');
}

export const jwtConfig = {
  accessSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production-2024',
  issuer: 'stock-tracker',
  audience: 'stock-tracker-users',
};
