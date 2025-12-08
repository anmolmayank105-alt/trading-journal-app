/**
 * Zerodha Integration Service
 */

import axios, { AxiosInstance } from 'axios';
import CryptoJS from 'crypto-js';
import { brokerConfig } from '../config';
import { logger } from '@stock-tracker/shared/utils';

export interface ZerodhaToken {
  accessToken: string;
  refreshToken?: string;
  userId: string;
  userName: string;
  email: string;
  expiresAt: Date;
}

export interface ZerodhaTrade {
  trade_id: string;
  order_id: string;
  exchange: string;
  tradingsymbol: string;
  instrument_token: number;
  product: string;
  average_price: number;
  quantity: number;
  transaction_type: 'BUY' | 'SELL';
  order_timestamp: string;
  exchange_timestamp: string;
  filled_quantity: number;
}

export interface ZerodhaPosition {
  tradingsymbol: string;
  exchange: string;
  instrument_token: number;
  product: string;
  quantity: number;
  overnight_quantity: number;
  multiplier: number;
  average_price: number;
  close_price: number;
  last_price: number;
  value: number;
  pnl: number;
  m2m: number;
  unrealised: number;
  realised: number;
  buy_quantity: number;
  buy_price: number;
  buy_value: number;
  buy_m2m: number;
  sell_quantity: number;
  sell_price: number;
  sell_value: number;
  sell_m2m: number;
  day_buy_quantity: number;
  day_buy_price: number;
  day_buy_value: number;
  day_sell_quantity: number;
  day_sell_price: number;
  day_sell_value: number;
}

export class ZerodhaService {
  private config = brokerConfig.zerodha;
  private client: AxiosInstance;
  
  constructor() {
    this.client = axios.create({
      baseURL: this.config.apiBaseUrl,
      timeout: 30000,
    });
  }
  
  // ============= Generate Login URL =============
  
  getLoginUrl(): string {
    return `${this.config.loginUrl}?v=3&api_key=${this.config.apiKey}`;
  }
  
  // ============= Exchange Request Token for Access Token =============
  
  async exchangeToken(requestToken: string): Promise<ZerodhaToken> {
    try {
      const checksum = CryptoJS.SHA256(
        this.config.apiKey + requestToken + this.config.apiSecret
      ).toString();
      
      const response = await axios.post(this.config.tokenUrl, {
        api_key: this.config.apiKey,
        request_token: requestToken,
        checksum,
      });
      
      const { data } = response.data;
      
      // Zerodha tokens expire at 6 AM next day
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 1);
      expiresAt.setHours(6, 0, 0, 0);
      
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        userId: data.user_id,
        userName: data.user_name || data.user_shortname,
        email: data.email,
        expiresAt,
      };
    } catch (error: any) {
      logger.error({ error: error.response?.data || error.message }, 'Zerodha token exchange failed');
      throw new Error('Failed to exchange token with Zerodha');
    }
  }
  
  // ============= Get Profile =============
  
  async getProfile(accessToken: string): Promise<any> {
    try {
      const response = await this.client.get('/user/profile', {
        headers: this.getHeaders(accessToken),
      });
      return response.data.data;
    } catch (error: any) {
      logger.error({ error: error.response?.data || error.message }, 'Zerodha profile fetch failed');
      throw error;
    }
  }
  
  // ============= Get Positions =============
  
  async getPositions(accessToken: string): Promise<{ net: ZerodhaPosition[]; day: ZerodhaPosition[] }> {
    try {
      const response = await this.client.get('/portfolio/positions', {
        headers: this.getHeaders(accessToken),
      });
      return response.data.data;
    } catch (error: any) {
      logger.error({ error: error.response?.data || error.message }, 'Zerodha positions fetch failed');
      throw error;
    }
  }
  
  // ============= Get Holdings =============
  
  async getHoldings(accessToken: string): Promise<any[]> {
    try {
      const response = await this.client.get('/portfolio/holdings', {
        headers: this.getHeaders(accessToken),
      });
      return response.data.data;
    } catch (error: any) {
      logger.error({ error: error.response?.data || error.message }, 'Zerodha holdings fetch failed');
      throw error;
    }
  }
  
  // ============= Get Trades =============
  
  async getTrades(accessToken: string, date?: string): Promise<ZerodhaTrade[]> {
    try {
      const endpoint = date ? `/trades?date=${date}` : '/trades';
      const response = await this.client.get(endpoint, {
        headers: this.getHeaders(accessToken),
      });
      return response.data.data || [];
    } catch (error: any) {
      logger.error({ error: error.response?.data || error.message }, 'Zerodha trades fetch failed');
      throw error;
    }
  }
  
  // ============= Get Orders =============
  
  async getOrders(accessToken: string): Promise<any[]> {
    try {
      const response = await this.client.get('/orders', {
        headers: this.getHeaders(accessToken),
      });
      return response.data.data || [];
    } catch (error: any) {
      logger.error({ error: error.response?.data || error.message }, 'Zerodha orders fetch failed');
      throw error;
    }
  }
  
  // ============= Get Historical Trades =============
  
  async getHistoricalTrades(
    accessToken: string,
    fromDate: Date,
    toDate: Date
  ): Promise<ZerodhaTrade[]> {
    const allTrades: ZerodhaTrade[] = [];
    const currentDate = new Date(fromDate);
    
    while (currentDate <= toDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      try {
        const trades = await this.getTrades(accessToken, dateStr);
        allTrades.push(...trades);
      } catch (error) {
        logger.warn({ date: dateStr }, 'Failed to fetch trades for date');
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return allTrades;
  }
  
  // ============= Validate Token =============
  
  async validateToken(accessToken: string): Promise<boolean> {
    try {
      await this.getProfile(accessToken);
      return true;
    } catch {
      return false;
    }
  }
  
  // ============= Private Helper =============
  
  private getHeaders(accessToken: string) {
    return {
      'X-Kite-Version': '3',
      'Authorization': `token ${this.config.apiKey}:${accessToken}`,
    };
  }
}

export const zerodhaService = new ZerodhaService();
