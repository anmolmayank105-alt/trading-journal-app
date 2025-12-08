// MongoDB initialization script
// This script runs when the MongoDB container is first created

db = db.getSiblingDB('stock_tracker');

// Create collections
db.createCollection('users');
db.createCollection('trades');
db.createCollection('broker_accounts');
db.createCollection('analytics');
db.createCollection('market_data');
db.createCollection('notifications');
db.createCollection('sync_logs');

// Create indexes for users collection
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ createdAt: 1 });

// Create indexes for trades collection
db.trades.createIndex({ userId: 1 });
db.trades.createIndex({ symbol: 1 });
db.trades.createIndex({ tradeDate: -1 });
db.trades.createIndex({ category: 1 });
db.trades.createIndex({ userId: 1, tradeDate: -1 });
db.trades.createIndex({ userId: 1, symbol: 1 });
db.trades.createIndex({ userId: 1, category: 1 });

// Create indexes for broker_accounts collection
db.broker_accounts.createIndex({ userId: 1 });
db.broker_accounts.createIndex({ broker: 1 });
db.broker_accounts.createIndex({ userId: 1, broker: 1 }, { unique: true });

// Create indexes for analytics collection
db.analytics.createIndex({ userId: 1 });
db.analytics.createIndex({ calculatedAt: -1 });
db.analytics.createIndex({ userId: 1, calculatedAt: -1 });

// Create indexes for market_data collection
db.market_data.createIndex({ symbol: 1 });
db.market_data.createIndex({ timestamp: -1 });
db.market_data.createIndex({ symbol: 1, timestamp: -1 });

// Create indexes for notifications collection
db.notifications.createIndex({ userId: 1 });
db.notifications.createIndex({ createdAt: -1 });
db.notifications.createIndex({ read: 1 });

// Create indexes for sync_logs collection
db.sync_logs.createIndex({ userId: 1 });
db.sync_logs.createIndex({ broker: 1 });
db.sync_logs.createIndex({ syncedAt: -1 });

// Insert sample data (optional, for testing)
print('MongoDB initialized successfully');
print('Collections created: users, trades, broker_accounts, analytics, market_data, notifications, sync_logs');
print('Indexes created for all collections');
