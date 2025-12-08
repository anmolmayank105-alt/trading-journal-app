/**
 * WebSocket Service
 * Handles real-time market data streaming
 */

import WebSocket, { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config';
import { marketDataService, Quote } from './market-data.service';
import { logger } from '@stock-tracker/shared/utils';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  subscriptions: Set<string>;
  isAlive: boolean;
}

interface WSMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping';
  symbols?: string[];
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Set<AuthenticatedWebSocket>> = new Map();
  private priceInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize WebSocket server
   */
  initialize(port: number): void {
    this.wss = new WebSocketServer({ port });

    this.wss.on('connection', (ws: WebSocket, req) => {
      const authWs = ws as AuthenticatedWebSocket;
      authWs.subscriptions = new Set();
      authWs.isAlive = true;

      // Authenticate
      const token = this.extractToken(req.url || '');
      if (!token) {
        authWs.send(JSON.stringify({ type: 'error', message: 'Authentication required' }));
        authWs.close();
        return;
      }

      try {
        const payload = jwt.verify(token, jwtConfig.accessSecret, {
          issuer: jwtConfig.issuer,
          audience: jwtConfig.audience,
        }) as { userId: string };
        
        authWs.userId = payload.userId;
        
        authWs.send(JSON.stringify({ type: 'connected', userId: payload.userId }));
        logger.info({ userId: payload.userId }, 'WebSocket client connected');
      } catch (error) {
        authWs.send(JSON.stringify({ type: 'error', message: 'Invalid token' }));
        authWs.close();
        return;
      }

      // Handle pong for heartbeat
      authWs.on('pong', () => {
        authWs.isAlive = true;
      });

      // Handle messages
      authWs.on('message', (data) => {
        try {
          const message: WSMessage = JSON.parse(data.toString());
          this.handleMessage(authWs, message);
        } catch (error) {
          authWs.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
        }
      });

      // Handle close
      authWs.on('close', () => {
        this.unsubscribeAll(authWs);
        logger.info({ userId: authWs.userId }, 'WebSocket client disconnected');
      });

      // Handle error
      authWs.on('error', (error) => {
        logger.error({ error: error.message, userId: authWs.userId }, 'WebSocket error');
      });
    });

    // Heartbeat interval
    setInterval(() => {
      if (this.wss) {
        this.wss.clients.forEach((ws) => {
          const authWs = ws as AuthenticatedWebSocket;
          if (!authWs.isAlive) {
            return authWs.terminate();
          }
          authWs.isAlive = false;
          authWs.ping();
        });
      }
    }, 30000);

    // Start price update interval
    this.startPriceUpdates();

    logger.info({ port }, 'WebSocket server started');
  }

  /**
   * Extract token from URL
   */
  private extractToken(url: string): string | null {
    const match = url.match(/token=([^&]+)/);
    return match ? match[1] : null;
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(ws: AuthenticatedWebSocket, message: WSMessage): void {
    switch (message.type) {
      case 'subscribe':
        if (message.symbols) {
          message.symbols.forEach((symbol) => {
            this.subscribe(ws, symbol);
          });
        }
        break;

      case 'unsubscribe':
        if (message.symbols) {
          message.symbols.forEach((symbol) => {
            this.unsubscribe(ws, symbol);
          });
        }
        break;

      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        break;
    }
  }

  /**
   * Subscribe to a symbol
   */
  private subscribe(ws: AuthenticatedWebSocket, symbol: string): void {
    ws.subscriptions.add(symbol);

    if (!this.clients.has(symbol)) {
      this.clients.set(symbol, new Set());
    }
    this.clients.get(symbol)!.add(ws);

    ws.send(JSON.stringify({ type: 'subscribed', symbol }));
    logger.debug({ userId: ws.userId, symbol }, 'Subscribed to symbol');
  }

  /**
   * Unsubscribe from a symbol
   */
  private unsubscribe(ws: AuthenticatedWebSocket, symbol: string): void {
    ws.subscriptions.delete(symbol);

    const symbolClients = this.clients.get(symbol);
    if (symbolClients) {
      symbolClients.delete(ws);
      if (symbolClients.size === 0) {
        this.clients.delete(symbol);
      }
    }

    ws.send(JSON.stringify({ type: 'unsubscribed', symbol }));
    logger.debug({ userId: ws.userId, symbol }, 'Unsubscribed from symbol');
  }

  /**
   * Unsubscribe from all symbols
   */
  private unsubscribeAll(ws: AuthenticatedWebSocket): void {
    ws.subscriptions.forEach((symbol) => {
      const symbolClients = this.clients.get(symbol);
      if (symbolClients) {
        symbolClients.delete(ws);
        if (symbolClients.size === 0) {
          this.clients.delete(symbol);
        }
      }
    });
    ws.subscriptions.clear();
  }

  /**
   * Start periodic price updates
   */
  private startPriceUpdates(): void {
    this.priceInterval = setInterval(async () => {
      const symbols = Array.from(this.clients.keys());
      
      for (const symbolKey of symbols) {
        const [symbol, exchange] = symbolKey.split(':');
        const quote = await marketDataService.getQuote(symbol, exchange || 'NSE');
        
        if (quote) {
          this.broadcast(symbolKey, {
            type: 'quote',
            data: quote,
          });
        }
      }
    }, 1000); // Update every second
  }

  /**
   * Broadcast message to all subscribers of a symbol
   */
  private broadcast(symbol: string, message: any): void {
    const clients = this.clients.get(symbol);
    if (!clients) return;

    const data = JSON.stringify(message);
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  /**
   * Send message to a specific user
   */
  sendToUser(userId: string, message: any): void {
    if (!this.wss) return;

    this.wss.clients.forEach((ws) => {
      const authWs = ws as AuthenticatedWebSocket;
      if (authWs.userId === userId && authWs.readyState === WebSocket.OPEN) {
        authWs.send(JSON.stringify(message));
      }
    });
  }

  /**
   * Stop WebSocket server
   */
  stop(): void {
    if (this.priceInterval) {
      clearInterval(this.priceInterval);
    }

    if (this.wss) {
      this.wss.close();
      logger.info('WebSocket server stopped');
    }
  }

  /**
   * Get connection stats
   */
  getStats(): { totalConnections: number; subscriptions: { symbol: string; count: number }[] } {
    const subscriptions = Array.from(this.clients.entries()).map(([symbol, clients]) => ({
      symbol,
      count: clients.size,
    }));

    return {
      totalConnections: this.wss?.clients.size || 0,
      subscriptions,
    };
  }
}

export const webSocketService = new WebSocketService();
