// API module index - exports all API services
export * from './client';
export * as authApi from './auth';
export * as tradesApi from './trades';

// Re-export common functions
export { 
  checkApiHealth, 
  getAccessToken, 
  setAccessToken,
  clearTokens,
  parseApiError 
} from './client';

export { 
  login, 
  logout, 
  register, 
  getCurrentUser, 
  isAuthenticated,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword 
} from './auth';

export {
  getTrades,
  getTradeById,
  createTrade,
  updateTrade,
  deleteTrade,
  bulkDeleteTrades,
  getTradeStats,
  getPnLCurve,
  getSymbolAnalysis,
  getOpenTrades,
  exitTrade,
  getMonthlyPnL
} from './trades';
