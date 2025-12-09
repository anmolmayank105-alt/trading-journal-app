/**
 * Auth Service - Business Logic
 * Optimized with session caching and token blacklist for O(1) validation
 */

import jwt from 'jsonwebtoken';
import NodeCache from 'node-cache';
import { UserModel, UserDocument, SessionModel } from '../models';
import { jwtConfig, sessionConfig } from '../config/auth';
import {
  RegisterDTO,
  LoginDTO,
  AuthResult,
  TokenPair,
  TokenPayload,
  UserResponseDTO,
  ChangePasswordDTO,
} from '../../../shared/dist/types';
import {
  InvalidCredentialsError,
  AlreadyExistsError,
  NotFoundError,
  UnauthorizedError,
  TokenExpiredError,
  AccountLockedError,
  ValidationError,
  generateToken,
  verifyPassword,
  logger,
} from '../../../shared/dist/utils';

// ============= Cache Configuration =============
// Session cache: 15 min TTL (match access token expiry)
// Token blacklist: 24 hour TTL (longer than refresh token max)
// User cache: 5 min TTL
const sessionCache = new NodeCache({ stdTTL: 900, checkperiod: 60 });
const tokenBlacklist = new NodeCache({ stdTTL: 86400, checkperiod: 300 });
const userCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// ============= Auth Service Class =============

export class AuthService {
  
  // ============= Registration =============
  
  async register(dto: RegisterDTO): Promise<AuthResult> {
    // Check if email already exists
    const existingEmail = await UserModel.findByEmail(dto.email);
    if (existingEmail) {
      throw new AlreadyExistsError('User', 'email', dto.email);
    }
    
    // Check if username already exists
    const existingUsername = await UserModel.findByUsername(dto.username);
    if (existingUsername) {
      throw new AlreadyExistsError('User', 'username', dto.username);
    }
    
    // Create user
    const user = new UserModel({
      email: dto.email.toLowerCase(),
      username: dto.username,
      passwordHash: dto.password, // Will be hashed by pre-save hook
      firstName: dto.firstName,
      lastName: dto.lastName,
      verified: false,
      verificationToken: generateToken(32),
      verificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });
    
    await user.save();
    
    logger.info({ userId: user._id }, 'User registered successfully');
    
    // Generate tokens
    const tokens = await this.generateTokens(user, false, '', '');
    
    // TODO: Send verification email
    
    return {
      user: this.toUserResponse(user),
      tokens,
    };
  }
  
  // ============= Login =============
  
  async login(dto: LoginDTO, ip: string = '', userAgent: string = ''): Promise<AuthResult> {
    try {
      console.log('Step 1: Login started for', dto.email);
      
      // Find user with password hash
      const user = await UserModel.findOne({ 
        email: dto.email.toLowerCase(), 
        isDeleted: false 
      }).select('+passwordHash');
      
      console.log('Step 2: User found:', !!user);
      
      if (!user) {
        throw new InvalidCredentialsError();
      }
      
      console.log('Step 3: Checking lock status');
      
      // Check if account is locked
      if (user.lockUntil && user.lockUntil > new Date()) {
        const lockMinutes = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
        throw new AccountLockedError(`Account is locked. Try again in ${lockMinutes} minutes.`);
      }
      
      console.log('Step 4: Checking active status');
      
      // Check if account is active
      if (!user.isActive) {
        throw new UnauthorizedError('Account is deactivated');
      }
      
      console.log('Step 5: Verifying password');
      
      // Verify password
      const isPasswordValid = await verifyPassword(dto.password, user.passwordHash);
      
      console.log('Step 6: Password valid:', isPasswordValid);
      
      if (!isPasswordValid) {
        // Increment failed login attempts
        user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
        
        // Lock account after 5 failed attempts
        if (user.failedLoginAttempts >= 5) {
          user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
          await user.save();
          throw new AccountLockedError('Too many failed attempts. Account locked for 30 minutes.');
        }
        
        await user.save();
        throw new InvalidCredentialsError();
      }
      
      console.log('Step 7: Updating user login info');
      
      // Reset failed login attempts
      user.failedLoginAttempts = 0;
      user.lockUntil = undefined;
      user.lastLoginAt = new Date();
      user.lastLoginIP = ip;
      await user.save();
      
      console.log('Step 8: Converting to response');
      
      // Convert user to response DTO
      const userResponse = this.toUserResponse(user);
      
      console.log('Step 9: Caching user');
      
      // Cache user data for faster lookups
      userCache.set(`user:${user._id}`, userResponse);
      
      console.log('Step 10: Generating tokens');
      
      // Generate tokens
      const tokens = await this.generateTokens(user, dto.rememberMe || false, ip, userAgent);
      
      console.log('Step 11: Login complete');
      
      return {
        user: userResponse,
        tokens,
      };
    } catch (error: any) {
      console.log('Login error:', error.message);
      throw error;
    }
  }
  
  // ============= Token Generation =============
  
  async generateTokens(
    user: UserDocument,
    rememberMe: boolean,
    ip: string,
    userAgent: string
  ): Promise<TokenPair> {
    const sessionId = generateToken(16);
    
    const payload: Omit<TokenPayload, 'iat' | 'exp'> = {
      userId: user._id.toString(),
      email: user.email,
      username: user.username,
      roles: user.roles,
      sessionId,
    };
    
    // Generate access token
    const accessToken = jwt.sign(payload, jwtConfig.accessSecret, {
      expiresIn: jwtConfig.accessExpiry,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    } as any) as string;
    
    // Generate refresh token
    const refreshExpiry = rememberMe 
      ? jwtConfig.refreshExpiryRemember 
      : jwtConfig.refreshExpiry;
    
    const refreshToken = jwt.sign(
      { userId: user._id.toString(), sessionId, type: 'refresh' },
      jwtConfig.accessSecret,
      {
        expiresIn: refreshExpiry,
        issuer: jwtConfig.issuer,
      } as any
    ) as string;
    
    // Calculate expiry date
    const expiryMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + expiryMs);
    
    // Store session in database
    await SessionModel.create({
      userId: user._id,
      refreshToken,
      userAgent,
      ip,
      isValid: true,
      expiresAt,
      lastActivityAt: new Date(),
    });
    
    // Enforce max sessions limit
    await this.enforceMaxSessions(user._id.toString());
    
    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
      tokenType: 'Bearer',
    };
  }
  
  // ============= Token Refresh =============
  
  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, jwtConfig.accessSecret) as {
        userId: string;
        sessionId: string;
        type: string;
      };
      
      if (decoded.type !== 'refresh') {
        throw new UnauthorizedError('Invalid token type');
      }
      
      // Find session
      const session = await SessionModel.findOne({
        refreshToken,
        isValid: true,
        expiresAt: { $gt: new Date() },
      });
      
      if (!session) {
        throw new TokenExpiredError('Session expired or invalid');
      }
      
      // Find user
      const user = await UserModel.findById(decoded.userId);
      if (!user || !user.isActive || user.isDeleted) {
        throw new UnauthorizedError('User not found or inactive');
      }
      
      // Invalidate old session
      session.isValid = false;
      await session.save();
      
      // Generate new tokens
      const tokens = await this.generateTokens(user, false, session.ip, session.userAgent);
      
      logger.info({ userId: user._id }, 'Tokens refreshed successfully');
      
      return tokens;
      
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new TokenExpiredError('Refresh token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Invalid refresh token');
      }
      throw error;
    }
  }
  
  // ============= Logout =============
  // O(1) token blacklisting for immediate invalidation
  
  async logout(userId: string, sessionId?: string, allDevices: boolean = false, token?: string): Promise<void> {
    // Add current token to blacklist for immediate invalidation - O(1)
    if (token) {
      tokenBlacklist.set(token, true);
      sessionCache.del(`token:${token.substring(0, 32)}`);
    }
    
    // Clear user cache
    userCache.del(`user:${userId}`);
    
    if (allDevices) {
      // Invalidate all sessions for user
      await SessionModel.updateMany(
        { userId, isValid: true },
        { isValid: false }
      );
      logger.info({ userId }, 'User logged out from all devices');
    } else if (sessionId) {
      // Invalidate specific session
      await SessionModel.updateOne(
        { userId, isValid: true },
        { isValid: false }
      );
      logger.info({ userId, sessionId }, 'User logged out from session');
    }
  }
  
  // ============= Validate Access Token =============
  // O(1) with blacklist check, avoids DB lookup for valid tokens
  
  validateAccessToken(token: string): TokenPayload {
    // Check blacklist first - O(1)
    if (tokenBlacklist.has(token)) {
      throw new UnauthorizedError('Token has been revoked');
    }
    
    // Check session cache for pre-validated token - O(1)
    const cachedPayload = sessionCache.get<TokenPayload>(`token:${token.substring(0, 32)}`);
    if (cachedPayload) {
      return cachedPayload;
    }
    
    try {
      const decoded = jwt.verify(token, jwtConfig.accessSecret, {
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
      }) as TokenPayload;
      
      // Cache the validated payload - reduces JWT verify overhead
      sessionCache.set(`token:${token.substring(0, 32)}`, decoded);
      
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new TokenExpiredError('Access token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Invalid access token');
      }
      throw error;
    }
  }
  
  // ============= Change Password =============
  
  async changePassword(userId: string, dto: ChangePasswordDTO): Promise<void> {
    const user = await UserModel.findById(userId).select('+passwordHash');
    
    if (!user) {
      throw new NotFoundError('User', userId);
    }
    
    // Verify current password
    const isPasswordValid = await verifyPassword(dto.currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new ValidationError([{ field: 'currentPassword', message: 'Current password is incorrect' }]);
    }
    
    // Update password
    user.passwordHash = dto.newPassword; // Will be hashed by pre-save hook
    await user.save();
    
    // Invalidate all sessions except current
    await SessionModel.updateMany(
      { userId: user._id, isValid: true },
      { isValid: false }
    );
    
    logger.info({ userId }, 'Password changed successfully');
  }
  
  // ============= Password Reset Request =============
  
  async requestPasswordReset(email: string): Promise<void> {
    const user = await UserModel.findByEmail(email);
    
    // Always return success to prevent email enumeration
    if (!user) {
      logger.info({ email }, 'Password reset requested for non-existent email');
      return;
    }
    
    // Generate reset token
    user.passwordResetToken = generateToken(32);
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();
    
    // TODO: Send password reset email
    
    logger.info({ userId: user._id }, 'Password reset requested');
  }
  
  // ============= Reset Password =============
  
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await UserModel.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
      isDeleted: false,
    }).select('+passwordResetToken +passwordResetExpires');
    
    if (!user) {
      throw new UnauthorizedError('Invalid or expired reset token');
    }
    
    // Update password
    user.passwordHash = newPassword; // Will be hashed by pre-save hook
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();
    
    // Invalidate all sessions
    await SessionModel.updateMany(
      { userId: user._id, isValid: true },
      { isValid: false }
    );
    
    logger.info({ userId: user._id }, 'Password reset successfully');
  }
  
  // ============= Email Verification =============
  
  async verifyEmail(token: string): Promise<void> {
    const user = await UserModel.findOne({
      verificationToken: token,
      verificationExpires: { $gt: new Date() },
      verified: false,
      isDeleted: false,
    }).select('+verificationToken +verificationExpires');
    
    if (!user) {
      throw new UnauthorizedError('Invalid or expired verification token');
    }
    
    user.verified = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    await user.save();
    
    logger.info({ userId: user._id }, 'Email verified successfully');
  }
  
  // ============= Get Active Sessions =============
  
  async getActiveSessions(userId: string) {
    const sessions = await SessionModel.find({
      userId,
      isValid: true,
      expiresAt: { $gt: new Date() },
    }).sort({ lastActivityAt: -1 });
    
    return sessions.map((session) => ({
      id: session._id.toString(),
      userAgent: session.userAgent,
      ip: session.ip,
      createdAt: session.createdAt,
      lastActivityAt: session.lastActivityAt,
    }));
  }
  
  // ============= Revoke Session =============
  
  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const result = await SessionModel.updateOne(
      { _id: sessionId, userId, isValid: true },
      { isValid: false }
    );
    
    if (result.matchedCount === 0) {
      throw new NotFoundError('Session', sessionId);
    }
    
    logger.info({ userId, sessionId }, 'Session revoked');
  }
  
  // ============= Helper Methods =============
  
  private async enforceMaxSessions(userId: string): Promise<void> {
    const sessions = await SessionModel.find({
      userId,
      isValid: true,
    }).sort({ createdAt: -1 });
    
    if (sessions.length > sessionConfig.maxSessions) {
      const sessionsToRevoke = sessions.slice(sessionConfig.maxSessions);
      const idsToRevoke = sessionsToRevoke.map((s) => s._id);
      
      await SessionModel.updateMany(
        { _id: { $in: idsToRevoke } },
        { isValid: false }
      );
    }
  }
  
  private toUserResponse(user: UserDocument): UserResponseDTO {
    // Safely extract user data with proper null checks
    const userObj = user.toObject ? user.toObject() : user;
    const subscription = userObj.subscription || user.subscription || {
      plan: 'free',
      status: 'active',
      startDate: new Date(),
      features: []
    };
    const preferences = userObj.preferences || user.preferences || {
      theme: 'system',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      language: 'en',
      dateFormat: 'DD/MM/YYYY',
      notifications: {}
    };
    
    return {
      id: (user._id || user.id).toString(),
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatar: user.avatar,
      roles: user.roles || ['user'],
      verified: user.verified || false,
      preferences: {
        theme: preferences.theme || 'system',
        currency: preferences.currency || 'INR',
        timezone: preferences.timezone || 'Asia/Kolkata',
        language: preferences.language || 'en',
        dateFormat: preferences.dateFormat || 'DD/MM/YYYY',
        notifications: preferences.notifications || {},
      },
      subscription: {
        plan: subscription.plan || 'free',
        status: subscription.status || 'active',
        startDate: subscription.startDate || new Date(),
        endDate: subscription.endDate,
        features: subscription.features || [],
      },
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  }
}

export const authService = new AuthService();
