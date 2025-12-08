// Auth storage service - handles user registration, login, logout with localStorage

import { getFromStorage, setToStorage, setToStorageImmediate, removeFromStorage, invalidateCache, generateId, STORAGE_KEYS } from './index';
import { User } from '@/types';

interface StoredUser extends User {
  password: string;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

// Hash password (simple hash for demo - in production use bcrypt on server)
function simpleHash(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

// Register new user
export function registerUser(
  name: string,
  email: string,
  password: string
): AuthResult {
  // Check if we're in browser
  if (typeof window === 'undefined') {
    return { success: false, error: 'Cannot register during server render' };
  }
  
  // Force fresh read from localStorage
  let users: StoredUser[] = [];
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.USERS);
    users = stored ? JSON.parse(stored) : [];
  } catch {
    users = [];
  }
  
  // Check if email already exists
  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return { success: false, error: 'Email already registered' };
  }
  
  const newUser: StoredUser = {
    id: generateId(),
    name,
    email: email.toLowerCase(),
    password: simpleHash(password),
    createdAt: new Date().toISOString(),
    preferences: {
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
  
  users.push(newUser);
  setToStorageImmediate(STORAGE_KEYS.USERS, users);
  
  // Auto login after register
  const { password: _, ...userWithoutPassword } = newUser;
  setToStorageImmediate(STORAGE_KEYS.CURRENT_USER, userWithoutPassword);
  
  return { success: true, user: userWithoutPassword };
}

// Login user
export function loginUser(email: string, password: string): AuthResult {
  // Check if we're in browser
  if (typeof window === 'undefined') {
    return { success: false, error: 'Cannot login during server render' };
  }
  
  // Force fresh read from localStorage (bypass cache for login)
  let users: StoredUser[] = [];
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.USERS);
    users = stored ? JSON.parse(stored) : [];
  } catch {
    users = [];
  }
  
  const hashedPassword = simpleHash(password);
  const user = users.find(
    u => u.email.toLowerCase() === email.toLowerCase() && 
         u.password === hashedPassword
  );
  
  if (!user) {
    return { success: false, error: 'Invalid email or password' };
  }
  
  const { password: _, ...userWithoutPassword } = user;
  setToStorageImmediate(STORAGE_KEYS.CURRENT_USER, userWithoutPassword);
  
  return { success: true, user: userWithoutPassword };
}

// Get current user (direct localStorage read for consistency)
export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

// Logout user
export function logoutUser(): void {
  removeFromStorage(STORAGE_KEYS.CURRENT_USER);
  // Also invalidate cache for users to ensure fresh data on next login
  invalidateCache(STORAGE_KEYS.USERS);
}

// Update user profile
export function updateUserProfile(updates: Partial<User>): AuthResult {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    return { success: false, error: 'Not logged in' };
  }
  
  const users = getFromStorage<StoredUser[]>(STORAGE_KEYS.USERS, []);
  const userIndex = users.findIndex(u => u.id === currentUser.id);
  
  if (userIndex === -1) {
    return { success: false, error: 'User not found' };
  }
  
  // Update user
  users[userIndex] = { ...users[userIndex], ...updates };
  setToStorage(STORAGE_KEYS.USERS, users);
  
  // Update current user session
  const { password: _, ...userWithoutPassword } = users[userIndex];
  setToStorage(STORAGE_KEYS.CURRENT_USER, userWithoutPassword);
  
  return { success: true, user: userWithoutPassword };
}

// Change password
export function changePassword(
  currentPassword: string,
  newPassword: string
): AuthResult {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    return { success: false, error: 'Not logged in' };
  }
  
  const users = getFromStorage<StoredUser[]>(STORAGE_KEYS.USERS, []);
  const userIndex = users.findIndex(
    u => u.id === currentUser.id && u.password === simpleHash(currentPassword)
  );
  
  if (userIndex === -1) {
    return { success: false, error: 'Current password is incorrect' };
  }
  
  users[userIndex].password = simpleHash(newPassword);
  setToStorage(STORAGE_KEYS.USERS, users);
  
  return { success: true, user: currentUser };
}

// Check if user is logged in
export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}
