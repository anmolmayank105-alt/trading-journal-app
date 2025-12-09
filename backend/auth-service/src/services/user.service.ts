/**
 * User Service - User Management
 */

import { UserModel, UserDocument } from '../models';
import { UpdateUserDTO, UserResponseDTO } from '../../../shared/dist/types';
import { NotFoundError, logger } from '../../../shared/dist/utils';

export class UserService {
  
  // ============= Get User Profile =============
  
  async getProfile(userId: string): Promise<UserResponseDTO> {
    const user = await UserModel.findOne({ _id: userId, isDeleted: false });
    
    if (!user) {
      throw new NotFoundError('User', userId);
    }
    
    return this.toUserResponse(user);
  }
  
  // ============= Update Profile =============
  
  async updateProfile(userId: string, dto: UpdateUserDTO): Promise<UserResponseDTO> {
    const user = await UserModel.findOne({ _id: userId, isDeleted: false });
    
    if (!user) {
      throw new NotFoundError('User', userId);
    }
    
    // Update fields
    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.avatar !== undefined) user.avatar = dto.avatar;
    
    // Update preferences
    if (dto.preferences) {
      user.preferences = {
        ...user.preferences,
        ...dto.preferences,
        notifications: {
          ...user.preferences.notifications,
          ...(dto.preferences.notifications || {}),
        },
      };
    }
    
    await user.save();
    
    logger.info({ userId }, 'Profile updated');
    
    return this.toUserResponse(user);
  }
  
  // ============= Delete Account (Soft Delete) =============
  
  async deleteAccount(userId: string): Promise<void> {
    const user = await UserModel.findOne({ _id: userId, isDeleted: false });
    
    if (!user) {
      throw new NotFoundError('User', userId);
    }
    
    user.isDeleted = true;
    user.deletedAt = new Date();
    user.isActive = false;
    
    // Anonymize PII for GDPR compliance
    user.email = `deleted_${user._id}@deleted.local`;
    user.username = `deleted_${user._id}`;
    user.firstName = undefined;
    user.lastName = undefined;
    user.phone = undefined;
    user.avatar = undefined;
    
    await user.save();
    
    logger.info({ userId }, 'Account deleted');
  }
  
  // ============= Get User by ID =============
  
  async getUserById(userId: string): Promise<UserResponseDTO | null> {
    const user = await UserModel.findOne({ _id: userId, isDeleted: false });
    
    if (!user) {
      return null;
    }
    
    return this.toUserResponse(user);
  }
  
  // ============= Helper Methods =============
  
  private toUserResponse(user: UserDocument): UserResponseDTO {
    return {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatar: user.avatar,
      roles: user.roles,
      verified: user.verified,
      preferences: user.preferences || {},
      subscription: user.subscription || { plan: 'free', status: 'active', startDate: new Date() },
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  }
}

export const userService = new UserService();
