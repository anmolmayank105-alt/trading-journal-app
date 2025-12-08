// API client configuration for connecting to backend services
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// Fallback API URL for easy deployment without backend
const API_URL = process.env.NEXT_PUBLIC_API_URL || 
                (typeof window !== 'undefined' && window.location.hostname === 'localhost' 
                  ? 'http://localhost:3001/api/v1' 
                  : '');

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000, // Increased timeout for deployment
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  validateStatus: (status) => status < 500, // Don't throw on 4xx errors
});

// Token storage keys
const ACCESS_TOKEN_KEY = 'trading_app_access_token';
const REFRESH_TOKEN_KEY = 'trading_app_refresh_token';

// Token management
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    // If 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
          });
          
          const { accessToken, refreshToken: newRefreshToken } = response.data;
          setAccessToken(accessToken);
          setRefreshToken(newRefreshToken);
          
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }
          return apiClient(originalRequest);
        } catch (refreshError) {
          // Refresh failed - clear tokens and redirect to login
          clearTokens();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// API Error type
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

// Parse API errors
export function parseApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ 
      message?: string; 
      error?: string | { code?: string; message?: string; details?: any };
    }>;
    
    // Handle nested error object from backend: { success: false, error: { code, message, details } }
    const errorData = axiosError.response?.data?.error;
    if (errorData && typeof errorData === 'object' && 'message' in errorData) {
      // If there are validation details, include them in the message
      let message = errorData.message || 'An error occurred';
      if (errorData.details) {
        if (Array.isArray(errorData.details)) {
          message = errorData.details.map((d: any) => d.message || d).join(', ');
        } else if (typeof errorData.details === 'string') {
          message = errorData.details;
        }
      }
      return {
        message,
        code: errorData.code,
        status: axiosError.response?.status,
      };
    }
    
    // Handle flat error format
    return {
      message: axiosError.response?.data?.message || 
               (typeof errorData === 'string' ? errorData : null) ||
               axiosError.message || 
               'An error occurred',
      status: axiosError.response?.status,
    };
  }
  
  if (error instanceof Error) {
    return { message: error.message };
  }
  
  return { message: 'An unknown error occurred' };
}

// Check if API is available
export async function checkApiHealth(): Promise<boolean> {
  try {
    const baseUrl = API_URL.replace('/api/v1', '');
    const response = await axios.get(`${baseUrl}/health`, { timeout: 3000 });
    return response.status === 200;
  } catch {
    return false;
  }
}

export default apiClient;
