/**
 * JWT Configuration for Token Verification
 */

export const jwtConfig = {
  accessSecret: process.env.JWT_SECRET || 'default-secret-change-me',
  issuer: 'stock-tracker',
  audience: 'stock-tracker-users',
};
