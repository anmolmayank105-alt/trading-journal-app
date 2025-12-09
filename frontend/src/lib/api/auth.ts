// Auth API service - connects to backend auth-service
import apiClient, { 
  parseApiError, 
  setAccessToken, 
  setRefreshToken, 
  clearTokens,
  getAccessToken,
  checkApiHealth,
  ApiError 
} from './client';
import { User } from '@/types';
import * as localAuth from '../storage/auth';

// Check if we should use local storage
const USE_LOCAL_STORAGE = process.env.NEXT_PUBLIC_USE_LOCAL_STORAGE === 'true';

// Current user cache
let currentUserCache: User | null = null;

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
}

interface ApiUser {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  roles: string[];
  verified: boolean;
  preferences?: any;
  subscription?: any;
  createdAt: string;
  lastLoginAt?: string;
}

interface LoginApiResponse {
  success: boolean;
  data: {
    user: ApiUser;
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
  };
}

interface RegisterApiResponse {
  success: boolean;
  message: string;
  data: {
    user: ApiUser;
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
  };
}

// Map API user to frontend User type
function mapApiUserToUser(apiUser: ApiUser): User {
  return {
    id: apiUser.id,
    name: apiUser.firstName ? `${apiUser.firstName} ${apiUser.lastName || ''}`.trim() : apiUser.username,
    email: apiUser.email,
    createdAt: apiUser.createdAt,
    preferences: apiUser.preferences || {
      theme: 'dark',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      notifications: {
        email: true,
        push: true,
        tradeAlerts: true,
        dailyReport: true,
      },
    },
  };
}

// Check if backend is available (with caching)
let backendAvailable: boolean | null = null;
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

async function isBackendAvailable(): Promise<boolean> {
  if (USE_LOCAL_STORAGE) return false;
  
  const now = Date.now();
  if (backendAvailable !== null && now - lastHealthCheck < HEALTH_CHECK_INTERVAL) {
    return backendAvailable;
  }
  
  backendAvailable = await checkApiHealth();
  lastHealthCheck = now;
  return backendAvailable;
}

// Register user
export async function register(
  name: string,
  email: string,
  password: string
): Promise<AuthResponse> {
  // Try backend first
  if (await isBackendAvailable()) {
    try {
      // Generate a valid username from email or name
      // Username must start with letter, be 3-30 chars, only alphanumeric and underscore
      let username = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
      // Ensure it starts with a letter
      if (!/^[a-zA-Z]/.test(username)) {
        username = 'user_' + username;
      }
      // Ensure minimum 3 characters
      if (username.length < 3) {
        username = username + '_user';
      }
      // Truncate to max 30 characters
      username = username.substring(0, 30);
      
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0] || 'User';
      const lastName = nameParts.slice(1).join(' ');
      
      const requestBody: any = {
        username,
        email,
        password,
        confirmPassword: password,
        firstName,
        acceptTerms: true,
      };
      
      // Only include lastName if it's not empty
      if (lastName) {
        requestBody.lastName = lastName;
      }
      
      console.log('Register request:', { ...requestBody, password: '[HIDDEN]', confirmPassword: '[HIDDEN]' });
      
      const response = await apiClient.post<RegisterApiResponse>('/auth/register', requestBody);
      
      const { user: apiUser, tokens } = response.data.data;
      const user = mapApiUserToUser(apiUser);
      
      // Store tokens
      setAccessToken(tokens.accessToken);
      setRefreshToken(tokens.refreshToken);
      
      // Cache user
      currentUserCache = user;
      
      // Also store in localStorage for session persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('trading_app_current_user', JSON.stringify(user));
      }
      
      return { success: true, user };
    } catch (error: any) {
      console.error('Register error:', error);
      console.error('Register error response:', error?.response?.data);
      const apiError = parseApiError(error);
      return { success: false, error: apiError.message };
    }
  }
  
  // Fallback to localStorage
  return localAuth.registerUser(name, email, password);
}

// Migrate trades from old user ID to new user ID
function migrateUserTrades(oldUserId: string | null, newUserId: string, email: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const tradesJson = localStorage.getItem('trading_app_trades');
    if (!tradesJson) return;
    
    const trades = JSON.parse(tradesJson);
    let migrated = false;
    
    // Find trades that belong to a localStorage user with same email pattern
    const updatedTrades = trades.map((trade: any) => {
      // Migrate if trade belongs to old user ID OR if trade's userId starts with 'user_' (localStorage generated)
      if (oldUserId && trade.userId === oldUserId) {
        migrated = true;
        return { ...trade, userId: newUserId };
      }
      return trade;
    });
    
    if (migrated) {
      localStorage.setItem('trading_app_trades', JSON.stringify(updatedTrades));
    }
  } catch (error) {
    // Silently fail migration
  }
}

// Login user
export async function login(
  email: string,
  password: string,
  rememberMe: boolean = false
): Promise<AuthResponse> {
  // Get old user ID before login (for migration)
  const oldUser = localAuth.getCurrentUser();
  const oldUserId = oldUser?.id || null;
  
  // Try backend first
  if (await isBackendAvailable()) {
    try {
      const response = await apiClient.post<LoginApiResponse>('/auth/login', {
        email,
        password,
        rememberMe,
      });
      
      const { user: apiUser, tokens } = response.data.data;
      const user = mapApiUserToUser(apiUser);
      
      // Store tokens
      setAccessToken(tokens.accessToken);
      setRefreshToken(tokens.refreshToken);
      
      // Migrate trades from localStorage user to backend user
      if (oldUserId && oldUserId !== user.id) {
        migrateUserTrades(oldUserId, user.id, email);
      }
      
      // Cache user
      currentUserCache = user;
      
      // Also store in localStorage for session persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('trading_app_current_user', JSON.stringify(user));
      }
      
      return { success: true, user };
    } catch (error) {
      const apiError = parseApiError(error);
      return { success: false, error: apiError.message };
    }
  }
  
  // Fallback to localStorage
  return localAuth.loginUser(email, password);
}

// Logout user
export async function logout(): Promise<void> {
  // Try backend first
  if (await isBackendAvailable()) {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.warn('Backend logout failed:', parseApiError(error).message);
    }
  }
  
  // Always clear local state
  clearTokens();
  currentUserCache = null;
  
  // Clear cached user data from localStorage
  if (typeof window !== 'undefined') {
    localStorage.removeItem('trading_app_current_user');
  }
  
  localAuth.logoutUser();
}

// Get current user
export async function getCurrentUser(): Promise<User | null> {
  // Only try backend if we have a token
  const token = getAccessToken();
  if (token && await isBackendAvailable()) {
    try {
      const response = await apiClient.get<{ success: boolean; data: ApiUser }>('/users/profile');
      const user = mapApiUserToUser(response.data.data);
      currentUserCache = user;
      
      // Update localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('trading_app_current_user', JSON.stringify(currentUserCache));
      }
      
      return currentUserCache;
    } catch {
      // Token might be invalid - clear it
      clearTokens();
      currentUserCache = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('trading_app_current_user');
      }
    }
  }
  
  // Return cached user if available (only if no token, meaning localStorage mode)
  if (!token && currentUserCache) {
    return currentUserCache;
  }
  
  // Check localStorage only if no token (localStorage auth mode)
  if (!token && typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('trading_app_current_user');
      if (stored) {
        currentUserCache = JSON.parse(stored);
        return currentUserCache;
      }
    } catch {
      // Ignore parse errors
    }
  }
  
  // Fallback to localStorage auth
  return localAuth.getCurrentUser();
}

// Check if authenticated
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

// Update profile
export async function updateProfile(updates: Partial<User>): Promise<AuthResponse> {
  if (await isBackendAvailable()) {
    try {
      const response = await apiClient.patch<{ success: boolean; data: ApiUser }>('/users/profile', updates);
      const user = mapApiUserToUser(response.data.data);
      currentUserCache = user;
      
      // Update localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('trading_app_current_user', JSON.stringify(currentUserCache));
      }
      
      return { success: true, user: currentUserCache };
    } catch (error) {
      return { success: false, error: parseApiError(error).message };
    }
  }
  
  // Fallback to localStorage
  return localAuth.updateUserProfile(updates);
}

// Change password
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<AuthResponse> {
  if (await isBackendAvailable()) {
    try {
      await apiClient.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      
      return { success: true };
    } catch (error) {
      return { success: false, error: parseApiError(error).message };
    }
  }
  
  // Fallback to localStorage
  return localAuth.changePassword(currentPassword, newPassword);
}

// Forgot password
export async function forgotPassword(email: string): Promise<AuthResponse> {
  if (await isBackendAvailable()) {
    try {
      await apiClient.post('/auth/forgot-password', { email });
      return { success: true };
    } catch (error) {
      return { success: false, error: parseApiError(error).message };
    }
  }
  
  // Can't do forgot password with localStorage
  return { success: false, error: 'Password reset requires server connection' };
}

// Reset password
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<AuthResponse> {
  if (await isBackendAvailable()) {
    try {
      await apiClient.post('/auth/reset-password', {
        token,
        newPassword,
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: parseApiError(error).message };
    }
  }
  
  return { success: false, error: 'Password reset requires server connection' };
}

// Clear user cache (useful when data changes)
export function clearUserCache(): void {
  currentUserCache = null;
}
