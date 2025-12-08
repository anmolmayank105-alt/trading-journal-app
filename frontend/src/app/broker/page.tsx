'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { 
  getBrokerConnections, 
  connectBroker, 
  disconnectBroker, 
  syncBrokerTrades,
  AVAILABLE_BROKERS,
  getSyncHistory
} from '@/lib/storage/broker';
import { BrokerConnection } from '@/types';
import {
  Link2,
  RefreshCw,
  Check,
  X,
  Loader2,
  Clock,
  AlertTriangle,
  Zap,
  Shield,
} from 'lucide-react';

// Broker Card Component
const BrokerCard = React.memo(({ 
  broker, 
  connection,
  onConnect,
  onDisconnect,
  onSync,
  syncing
}: { 
  broker: typeof AVAILABLE_BROKERS[0];
  connection: BrokerConnection | null;
  onConnect: () => void;
  onDisconnect: () => void;
  onSync: () => void;
  syncing: boolean;
}) => {
  const isConnected = connection?.status === 'active';
  
  return (
    <div className={`card transition-all duration-300 ${isConnected ? 'border-emerald-500/30' : ''}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-600/20 to-purple-600/20 flex items-center justify-center text-2xl font-bold text-white">
            {broker.name.charAt(0)}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{broker.name}</h3>
            <p className="text-sm text-slate-400">{broker.description}</p>
          </div>
        </div>
        {isConnected && (
          <div className="badge badge-success flex items-center gap-1">
            <Check className="w-3 h-3" />
            Connected
          </div>
        )}
      </div>
      
      {/* Features */}
      <div className="flex flex-wrap gap-2 mb-4">
        {broker.features.map(feature => (
          <span key={feature} className="px-2 py-1 rounded-lg bg-white/5 text-xs text-slate-400">
            {feature}
          </span>
        ))}
      </div>
      
      {/* Connection Info */}
      {isConnected && connection && (
        <div className="p-4 rounded-xl bg-white/5 mb-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Connected since</span>
            <span className="text-white">
              {new Date(connection.connectedAt).toLocaleDateString('en-IN')}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Trades imported</span>
            <span className="text-white">{connection.tradesImported}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Last sync</span>
            <span className="text-white">
              {connection.lastSync 
                ? new Date(connection.lastSync).toLocaleString('en-IN')
                : 'Never'}
            </span>
          </div>
        </div>
      )}
      
      {/* Actions */}
      <div className="flex gap-3">
        {isConnected ? (
          <>
            <button
              onClick={onSync}
              disabled={syncing}
              className="flex-1 btn-primary flex items-center justify-center gap-2"
            >
              {syncing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Sync Trades
                </>
              )}
            </button>
            <button
              onClick={onDisconnect}
              className="px-4 btn-secondary text-red-400 hover:bg-red-500/10"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (
          <button
            onClick={onConnect}
            className="flex-1 btn-primary flex items-center justify-center gap-2"
          >
            <Link2 className="w-4 h-4" />
            Connect
          </button>
        )}
      </div>
    </div>
  );
});
BrokerCard.displayName = 'BrokerCard';

// Connect Modal
const ConnectModal = React.memo(({ 
  broker, 
  isOpen, 
  onClose, 
  onConnect 
}: { 
  broker: typeof AVAILABLE_BROKERS[0] | null;
  isOpen: boolean;
  onClose: () => void;
  onConnect: (apiKey: string) => void;
}) => {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  
  if (!isOpen || !broker) return null;
  
  const handleConnect = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    onConnect(apiKey);
    setLoading(false);
    setApiKey('');
    onClose();
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">Connect {broker.name}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-200">
              <p className="font-medium mb-1">Demo Mode</p>
              <p className="text-amber-200/80">
                This is a simulated connection. In production, you would enter your broker API credentials.
              </p>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              API Key (optional for demo)
            </label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="input"
              placeholder="Enter API key..."
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <button onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
            <button 
              onClick={handleConnect} 
              disabled={loading}
              className="flex-1 btn-primary flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4" />
                  Connect
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
ConnectModal.displayName = 'ConnectModal';

export default function BrokerPage() {
  const [mounted, setMounted] = useState(false);
  const [connections, setConnections] = useState<BrokerConnection[]>([]);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState<typeof AVAILABLE_BROKERS[0] | null>(null);
  const [syncingBroker, setSyncingBroker] = useState<string | null>(null);

  const loadConnections = useCallback(() => {
    setConnections(getBrokerConnections());
  }, []);

  useEffect(() => {
    setMounted(true);
    loadConnections();
  }, [loadConnections]);

  const handleConnect = (brokerId: string) => {
    const broker = AVAILABLE_BROKERS.find(b => b.id === brokerId);
    if (broker) {
      setSelectedBroker(broker);
      setShowConnectModal(true);
    }
  };

  const handleConfirmConnect = (apiKey: string) => {
    if (selectedBroker) {
      connectBroker(selectedBroker.id, { apiKey });
      loadConnections();
    }
  };

  const handleDisconnect = (brokerId: string) => {
    disconnectBroker(brokerId);
    loadConnections();
  };

  const handleSync = async (brokerId: string) => {
    setSyncingBroker(brokerId);
    await new Promise(resolve => setTimeout(resolve, 1500));
    syncBrokerTrades(brokerId);
    loadConnections();
    setSyncingBroker(null);
  };

  const getConnectionForBroker = (brokerId: string) => {
    return connections.find(c => c.brokerId === brokerId) || null;
  };

  if (!mounted) {
    return (
      <AppLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-800 rounded w-48" />
          <div className="grid grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-slate-800 rounded-2xl" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Broker Connections</h1>
          <p className="text-slate-400 mt-1">Connect your broker accounts to auto-sync trades</p>
        </div>

        {/* Features Banner */}
        <div className="card bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border-indigo-500/30">
          <div className="flex flex-wrap gap-8">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-indigo-500/20">
                <Zap className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <p className="font-medium text-white">Auto Sync</p>
                <p className="text-sm text-slate-400">Trades import automatically</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-500/20">
                <Shield className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="font-medium text-white">Secure</p>
                <p className="text-sm text-slate-400">Read-only API access</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-purple-500/20">
                <Clock className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="font-medium text-white">Real-time</p>
                <p className="text-sm text-slate-400">Instant updates</p>
              </div>
            </div>
          </div>
        </div>

        {/* Broker Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {AVAILABLE_BROKERS.map(broker => (
            <BrokerCard
              key={broker.id}
              broker={broker}
              connection={getConnectionForBroker(broker.id)}
              onConnect={() => handleConnect(broker.id)}
              onDisconnect={() => handleDisconnect(broker.id)}
              onSync={() => handleSync(broker.id)}
              syncing={syncingBroker === broker.id}
            />
          ))}
        </div>

        {/* Sync History */}
        {connections.length > 0 && (
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Sync Activity</h3>
            <div className="space-y-3">
              {connections.slice(0, 3).map(conn => {
                const history = getSyncHistory(conn.brokerId);
                return history.slice(0, 2).map((sync) => (
                  <div key={sync.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center text-sm font-bold text-white">
                        {conn.brokerName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-white font-medium">{conn.brokerName}</p>
                        <p className="text-sm text-slate-400">
                          {new Date(sync.date).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-emerald-400 font-medium">+{sync.tradesImported} trades</p>
                      <p className="text-sm text-slate-400">{sync.status}</p>
                    </div>
                  </div>
                ));
              })}
            </div>
          </div>
        )}
      </div>

      {/* Connect Modal */}
      <ConnectModal
        broker={selectedBroker}
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        onConnect={handleConfirmConnect}
      />
    </AppLayout>
  );
}
