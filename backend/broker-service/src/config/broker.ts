/**
 * Broker API Configuration
 */

export const brokerConfig = {
  zerodha: {
    apiKey: process.env.ZERODHA_API_KEY || '',
    apiSecret: process.env.ZERODHA_API_SECRET || '',
    redirectUri: process.env.ZERODHA_REDIRECT_URI || 'http://localhost:3003/api/v1/brokers/zerodha/callback',
    loginUrl: 'https://kite.zerodha.com/connect/login',
    apiBaseUrl: 'https://api.kite.trade',
    tokenUrl: 'https://api.kite.trade/session/token',
  },
  angel: {
    apiKey: process.env.ANGEL_API_KEY || '',
    apiSecret: process.env.ANGEL_API_SECRET || '',
    redirectUri: process.env.ANGEL_REDIRECT_URI || 'http://localhost:3003/api/v1/brokers/angel/callback',
    loginUrl: 'https://smartapi.angelbroking.com/publisher-login',
    apiBaseUrl: 'https://apiconnect.angelbroking.com',
    tokenUrl: 'https://apiconnect.angelbroking.com/rest/auth/angelbroking/jwt/v1/generateTokens',
  },
  upstox: {
    apiKey: process.env.UPSTOX_API_KEY || '',
    apiSecret: process.env.UPSTOX_API_SECRET || '',
    redirectUri: process.env.UPSTOX_REDIRECT_URI || 'http://localhost:3003/api/v1/brokers/upstox/callback',
    loginUrl: 'https://api.upstox.com/login/authorization/dialog',
    apiBaseUrl: 'https://api-v2.upstox.com',
    tokenUrl: 'https://api-v2.upstox.com/login/authorization/token',
  },
  encryptionKey: process.env.ENCRYPTION_KEY || 'your-32-character-encryption-key!',
};
