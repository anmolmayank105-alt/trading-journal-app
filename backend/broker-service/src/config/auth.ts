/**
 * JWT Configuration
 */

export const jwtConfig = {
  accessSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production-2024',
  issuer: 'stock-tracker',
  audience: 'stock-tracker-users',
};
