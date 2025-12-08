/**
 * User Types - Authentication and User Management
 */

import { ObjectId } from 'mongodb';
import { Timestamps, SoftDelete } from './common.types';

// ============= User Roles =============

export type UserRole = 'user' | 'admin' | 'premium' | 'analyst';

export const USER_ROLES = {
  USER: 'user' as const,
  ADMIN: 'admin' as const,
  PREMIUM: 'premium' as const,
  ANALYST: 'analyst' as const,
};

// ============= Subscription =============

export type SubscriptionPlan = 'free' | 'basic' | 'premium';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'trial';

export interface Subscription {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startDate: Date;
  endDate: Date;
  trialEndsAt?: Date;
  cancelledAt?: Date;
  features?: string[];
}

// ============= Notifications =============

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  priceAlerts: boolean;
  tradeAlerts: boolean;
  syncAlerts: boolean;
  weeklyReport: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  email: true,
  push: true,
  sms: false,
  priceAlerts: true,
  tradeAlerts: true,
  syncAlerts: true,
  weeklyReport: true,
};

// ============= User Preferences =============

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  currency: string;
  timezone: string;
  language: string;
  dateFormat: string;
  notifications: NotificationPreferences;
  defaultBroker?: ObjectId;
  defaultExchange?: string;
  dashboardLayout?: Record<string, unknown>;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: 'system',
  currency: 'INR',
  timezone: 'Asia/Kolkata',
  language: 'en',
  dateFormat: 'DD/MM/YYYY',
  notifications: DEFAULT_NOTIFICATION_PREFERENCES,
};

// ============= Broker Account Reference =============

export interface BrokerAccountRef {
  brokerId: ObjectId;
  isPrimary: boolean;
}

// ============= User Entity =============

export interface User extends Timestamps, SoftDelete {
  _id: ObjectId;
  email: string;
  username: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  roles: UserRole[];
  verified: boolean;
  verificationToken?: string;
  verificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  preferences: UserPreferences;
  subscription: Subscription;
  brokerAccounts: BrokerAccountRef[];
  lastLoginAt?: Date;
  lastLoginIP?: string;
  isActive: boolean;
  failedLoginAttempts?: number;
  lockUntil?: Date;
}

// ============= User DTOs =============

export interface CreateUserDTO {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface UpdateUserDTO {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  preferences?: Partial<UserPreferences>;
}

export interface UserResponseDTO {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  roles: UserRole[];
  verified: boolean;
  preferences: UserPreferences;
  subscription: Subscription;
  createdAt: Date;
  lastLoginAt?: Date;
}

// ============= Auth DTOs =============

export interface RegisterDTO {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  firstName?: string;
  lastName?: string;
  acceptTerms: boolean;
}

export interface LoginDTO {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResult {
  user: UserResponseDTO;
  tokens: TokenPair;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface TokenPayload {
  userId: string;
  email: string;
  username: string;
  roles: UserRole[];
  sessionId: string;
  iat: number;
  exp: number;
}

export interface RefreshTokenDTO {
  refreshToken: string;
}

export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ForgotPasswordDTO {
  email: string;
}

export interface ResetPasswordDTO {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface VerifyEmailDTO {
  token: string;
}

// ============= Session =============

export interface Session {
  id: string;
  userId: string;
  userAgent: string;
  ip: string;
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

// ============= Password Validation =============

export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'fair' | 'good' | 'strong';
}

export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};
