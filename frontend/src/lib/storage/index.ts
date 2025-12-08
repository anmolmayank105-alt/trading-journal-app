// localStorage-based data persistence layer
// This provides real working functionality when backend is unavailable

const STORAGE_KEYS = {
  USERS: 'trading_app_users',
  CURRENT_USER: 'trading_app_current_user',
  TRADES: 'trading_app_trades',
  WATCHLISTS: 'trading_app_watchlists',
  SETTINGS: 'trading_app_settings',
  BROKER_CONNECTIONS: 'trading_app_brokers',
} as const;

// In-memory cache to reduce localStorage reads
const memoryCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5000; // 5 seconds cache

// Generic storage utilities with caching
export function getFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  
  // Check memory cache first
  const cached = memoryCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }
  
  try {
    const item = localStorage.getItem(key);
    const data = item ? JSON.parse(item) : defaultValue;
    memoryCache.set(key, { data, timestamp: Date.now() });
    return data;
  } catch {
    return defaultValue;
  }
}

// Debounced write to reduce localStorage writes
const writeQueue = new Map<string, { value: unknown; timeout: NodeJS.Timeout }>();

export function setToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  
  // Update memory cache immediately
  memoryCache.set(key, { data: value, timestamp: Date.now() });
  
  // Debounce localStorage writes
  const existing = writeQueue.get(key);
  if (existing) {
    clearTimeout(existing.timeout);
  }
  
  const timeout = setTimeout(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      writeQueue.delete(key);
    } catch (error) {
      console.error('Storage error:', error);
    }
  }, 100);
  
  writeQueue.set(key, { value, timeout });
}

// Force immediate write (for critical data like auth)
export function setToStorageImmediate<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  memoryCache.set(key, { data: value, timestamp: Date.now() });
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Storage error:', error);
  }
}

// Clear cache for a key
export function invalidateCache(key: string): void {
  memoryCache.delete(key);
}

export function removeFromStorage(key: string): void {
  if (typeof window === 'undefined') return;
  // Clear from memory cache first
  memoryCache.delete(key);
  // Then remove from localStorage
  localStorage.removeItem(key);
}

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export { STORAGE_KEYS };
