// Broker connection storage service

import { getFromStorage, setToStorage, generateId, STORAGE_KEYS } from './index';
import { getCurrentUser } from './auth';
import { BrokerConnection } from '@/types';

export interface BrokerResult {
  success: boolean;
  connection?: BrokerConnection;
  error?: string;
}

// Available brokers
export const AVAILABLE_BROKERS = [
  {
    id: 'zerodha',
    name: 'Zerodha',
    description: 'Connect via Kite Connect API',
    logo: '/brokers/zerodha.png',
    features: ['Auto sync trades', 'Real-time positions', 'Historical data'],
  },
  {
    id: 'groww',
    name: 'Groww',
    description: 'Connect your Groww account',
    logo: '/brokers/groww.png',
    features: ['Trade sync', 'Portfolio tracking'],
  },
  {
    id: 'angelone',
    name: 'Angel One',
    description: 'Connect via SmartAPI',
    logo: '/brokers/angelone.png',
    features: ['Auto sync', 'Real-time data', 'Order placement'],
  },
  {
    id: 'upstox',
    name: 'Upstox',
    description: 'Connect via Upstox API',
    logo: '/brokers/upstox.png',
    features: ['Trade sync', 'Historical data'],
  },
  {
    id: 'fyers',
    name: 'Fyers',
    description: 'Connect via Fyers API',
    logo: '/brokers/fyers.png',
    features: ['Trade sync', 'Charting data'],
  },
  {
    id: 'dhan',
    name: 'Dhan',
    description: 'Connect via Dhan API',
    logo: '/brokers/dhan.png',
    features: ['Auto sync', 'Real-time positions', 'Order tracking'],
  },
  {
    id: 'exness',
    name: 'Exness',
    description: 'Connect your Exness account',
    logo: '/brokers/exness.png',
    features: ['Forex trading', 'Auto sync', 'MT4/MT5 integration'],
  },
  {
    id: 'deltaexchange',
    name: 'Delta Exchange India',
    description: 'Connect via Delta API',
    logo: '/brokers/delta.png',
    features: ['Derivatives trading', 'Auto sync', 'Real-time data'],
  },
  {
    id: 'vantage',
    name: 'Vantage',
    description: 'Connect your Vantage account',
    logo: '/brokers/vantage.png',
    features: ['Forex & CFDs', 'Trade sync', 'Multi-asset'],
  },
  {
    id: 'xm',
    name: 'XM Broker',
    description: 'Connect via XM API',
    logo: '/brokers/xm.png',
    features: ['Forex trading', 'Auto sync', 'Global markets'],
  },
];

// Get user's broker connections
export function getBrokerConnections(): BrokerConnection[] {
  const user = getCurrentUser();
  if (!user) return [];
  
  const allConnections = getFromStorage<BrokerConnection[]>(STORAGE_KEYS.BROKER_CONNECTIONS, []);
  return allConnections.filter(c => c.userId === user.id);
}

// Get connection for specific broker
export function getBrokerConnection(brokerId: string): BrokerConnection | null {
  const user = getCurrentUser();
  if (!user) return null;
  
  const allConnections = getFromStorage<BrokerConnection[]>(STORAGE_KEYS.BROKER_CONNECTIONS, []);
  return allConnections.find(c => c.userId === user.id && c.brokerId === brokerId) || null;
}

// Connect broker (simulated)
export function connectBroker(
  brokerId: string,
  credentials: { apiKey?: string; apiSecret?: string; clientId?: string }
): BrokerResult {
  const user = getCurrentUser();
  if (!user) {
    return { success: false, error: 'Not logged in' };
  }
  
  const broker = AVAILABLE_BROKERS.find(b => b.id === brokerId);
  if (!broker) {
    return { success: false, error: 'Invalid broker' };
  }
  
  const allConnections = getFromStorage<BrokerConnection[]>(STORAGE_KEYS.BROKER_CONNECTIONS, []);
  
  // Check if already connected
  const existingIndex = allConnections.findIndex(
    c => c.userId === user.id && c.brokerId === brokerId
  );
  
  const connection: BrokerConnection = {
    id: existingIndex >= 0 ? allConnections[existingIndex].id : generateId(),
    userId: user.id,
    brokerId,
    brokerName: broker.name,
    status: 'active',
    lastSync: new Date().toISOString(),
    connectedAt: existingIndex >= 0 
      ? allConnections[existingIndex].connectedAt 
      : new Date().toISOString(),
    tradesImported: existingIndex >= 0 
      ? allConnections[existingIndex].tradesImported 
      : 0,
  };
  
  if (existingIndex >= 0) {
    allConnections[existingIndex] = connection;
  } else {
    allConnections.push(connection);
  }
  
  setToStorage(STORAGE_KEYS.BROKER_CONNECTIONS, allConnections);
  
  return { success: true, connection };
}

// Disconnect broker
export function disconnectBroker(brokerId: string): BrokerResult {
  const user = getCurrentUser();
  if (!user) {
    return { success: false, error: 'Not logged in' };
  }
  
  const allConnections = getFromStorage<BrokerConnection[]>(STORAGE_KEYS.BROKER_CONNECTIONS, []);
  const connectionIndex = allConnections.findIndex(
    c => c.userId === user.id && c.brokerId === brokerId
  );
  
  if (connectionIndex === -1) {
    return { success: false, error: 'Connection not found' };
  }
  
  const deleted = allConnections.splice(connectionIndex, 1)[0];
  setToStorage(STORAGE_KEYS.BROKER_CONNECTIONS, allConnections);
  
  return { success: true, connection: deleted };
}

// Sync trades from broker (simulated)
export function syncBrokerTrades(brokerId: string): BrokerResult {
  const user = getCurrentUser();
  if (!user) {
    return { success: false, error: 'Not logged in' };
  }
  
  const allConnections = getFromStorage<BrokerConnection[]>(STORAGE_KEYS.BROKER_CONNECTIONS, []);
  const connectionIndex = allConnections.findIndex(
    c => c.userId === user.id && c.brokerId === brokerId
  );
  
  if (connectionIndex === -1) {
    return { success: false, error: 'Connection not found' };
  }
  
  // Simulate sync - add random number of trades
  const newTradesCount = Math.floor(Math.random() * 5) + 1;
  allConnections[connectionIndex].tradesImported += newTradesCount;
  allConnections[connectionIndex].lastSync = new Date().toISOString();
  
  setToStorage(STORAGE_KEYS.BROKER_CONNECTIONS, allConnections);
  
  return { success: true, connection: allConnections[connectionIndex] };
}

// Get sync history
export function getSyncHistory(brokerId: string) {
  const connection = getBrokerConnection(brokerId);
  if (!connection) return [];
  
  // Generate mock sync history
  const history = [];
  let date = new Date(connection.connectedAt);
  let totalTrades = connection.tradesImported;
  
  while (totalTrades > 0 && history.length < 10) {
    const tradesInSync = Math.min(totalTrades, Math.floor(Math.random() * 10) + 1);
    history.push({
      id: generateId(),
      date: date.toISOString(),
      tradesImported: tradesInSync,
      status: 'success',
    });
    totalTrades -= tradesInSync;
    date = new Date(date.getTime() + Math.random() * 24 * 60 * 60 * 1000);
  }
  
  return history.reverse();
}
