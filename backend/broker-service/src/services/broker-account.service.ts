/**
 * Broker Account Service
 */

import { Types } from 'mongoose';
import { 
  BrokerAccountModel, 
  BrokerAccountDocument, 
  BrokerType, 
  AccountStatus 
} from '../models';
import { NotFoundError, AlreadyExistsError, logger } from '@stock-tracker/shared/utils';
import { brokerConfig } from '../config';
import CryptoJS from 'crypto-js';

export interface CreateBrokerAccountDTO {
  broker: BrokerType;
  brokerId: string;
  displayName: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiry: Date;
  metadata?: {
    clientId?: string;
    userName?: string;
    email?: string;
    phone?: string;
    broker_specific?: Record<string, unknown>;
  };
}

export interface UpdateBrokerAccountDTO {
  displayName?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: Date;
  status?: AccountStatus;
  metadata?: Record<string, unknown>;
}

export class BrokerAccountService {
  
  private encryptToken(token: string): string {
    return CryptoJS.AES.encrypt(token, brokerConfig.encryptionKey).toString();
  }
  
  private decryptToken(encryptedToken: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedToken, brokerConfig.encryptionKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
  
  // ============= Create Broker Account =============
  
  async create(userId: string, dto: CreateBrokerAccountDTO): Promise<BrokerAccountDocument> {
    // Check if account already exists for this broker
    const existing = await BrokerAccountModel.findByBroker(userId, dto.broker);
    if (existing) {
      throw new AlreadyExistsError('BrokerAccount', 'broker', dto.broker);
    }
    
    const account = new BrokerAccountModel({
      userId: new Types.ObjectId(userId),
      broker: dto.broker,
      brokerId: dto.brokerId,
      displayName: dto.displayName,
      accessToken: this.encryptToken(dto.accessToken),
      refreshToken: dto.refreshToken ? this.encryptToken(dto.refreshToken) : undefined,
      tokenExpiry: dto.tokenExpiry,
      status: 'active',
      metadata: dto.metadata || {},
    });
    
    await account.save();
    
    logger.info({ 
      accountId: account._id, 
      broker: dto.broker, 
      userId 
    }, 'Broker account created');
    
    return account;
  }
  
  // ============= Get Account by ID =============
  
  async getById(userId: string, accountId: string): Promise<BrokerAccountDocument> {
    const account = await BrokerAccountModel.findOne({
      _id: accountId,
      userId,
      isActive: true,
    });
    
    if (!account) {
      throw new NotFoundError('BrokerAccount', accountId);
    }
    
    return account;
  }
  
  // ============= Get User Accounts =============
  
  async getUserAccounts(userId: string): Promise<BrokerAccountDocument[]> {
    return BrokerAccountModel.findByUser(userId);
  }
  
  // ============= Get Active Accounts =============
  
  async getActiveAccounts(userId: string): Promise<BrokerAccountDocument[]> {
    return BrokerAccountModel.findActiveByUser(userId);
  }
  
  // ============= Get by Broker =============
  
  async getByBroker(userId: string, broker: BrokerType): Promise<BrokerAccountDocument | null> {
    return BrokerAccountModel.findByBroker(userId, broker);
  }
  
  // ============= Update Account =============
  
  async update(
    userId: string, 
    accountId: string, 
    dto: UpdateBrokerAccountDTO
  ): Promise<BrokerAccountDocument> {
    const account = await this.getById(userId, accountId);
    
    if (dto.displayName) account.displayName = dto.displayName;
    if (dto.accessToken) account.accessToken = this.encryptToken(dto.accessToken);
    if (dto.refreshToken) account.refreshToken = this.encryptToken(dto.refreshToken);
    if (dto.tokenExpiry) account.tokenExpiry = dto.tokenExpiry;
    if (dto.status) account.status = dto.status;
    if (dto.metadata) {
      account.metadata = { ...account.metadata, ...dto.metadata };
    }
    
    await account.save();
    
    logger.info({ accountId, userId }, 'Broker account updated');
    return account;
  }
  
  // ============= Update Tokens =============
  
  async updateTokens(
    userId: string,
    accountId: string,
    accessToken: string,
    refreshToken?: string,
    tokenExpiry?: Date
  ): Promise<BrokerAccountDocument> {
    const account = await this.getById(userId, accountId);
    
    account.accessToken = this.encryptToken(accessToken);
    if (refreshToken) {
      account.refreshToken = this.encryptToken(refreshToken);
    }
    if (tokenExpiry) {
      account.tokenExpiry = tokenExpiry;
    }
    account.status = 'active';
    
    await account.save();
    
    logger.info({ accountId, userId }, 'Broker tokens updated');
    return account;
  }
  
  // ============= Update Sync Status =============
  
  async updateSyncStatus(
    accountId: string,
    lastSync: Date,
    error?: string
  ): Promise<void> {
    await BrokerAccountModel.findByIdAndUpdate(accountId, {
      lastSync,
      syncError: error || null,
      status: error ? 'error' : 'active',
    });
  }
  
  // ============= Deactivate Account =============
  
  async deactivate(userId: string, accountId: string): Promise<void> {
    const account = await this.getById(userId, accountId);
    
    account.isActive = false;
    account.status = 'revoked';
    await account.save();
    
    logger.info({ accountId, userId }, 'Broker account deactivated');
  }
  
  // ============= Get Decrypted Token =============
  
  async getAccessToken(userId: string, accountId: string): Promise<string> {
    const account = await this.getById(userId, accountId);
    
    if (account.isTokenExpired()) {
      throw new Error('Token has expired. Please reconnect your account.');
    }
    
    return this.decryptToken(account.accessToken);
  }
  
  // ============= Check Token Expiry =============
  
  async checkTokenExpiry(accountId: string): Promise<boolean> {
    const account = await BrokerAccountModel.findById(accountId);
    return account ? account.isTokenExpired() : true;
  }
  
  // ============= Get Expired Accounts =============
  
  async getExpiredAccounts(): Promise<BrokerAccountDocument[]> {
    return BrokerAccountModel.find({
      isActive: true,
      tokenExpiry: { $lt: new Date() },
      status: 'active',
    });
  }
}

export const brokerAccountService = new BrokerAccountService();
