const { MongoMemoryServer } = require('mongodb-memory-server');

async function start() {
  const mongod = await MongoMemoryServer.create({
    instance: {
      port: 27017,
      dbName: 'trading_analytics',
      ip: '127.0.0.1',
    },
  });

  const uri = mongod.getUri();
  console.log('Mongo Memory Server started');
  console.log('URI:', uri);

  const shutdown = async () => {
    console.log('Stopping Mongo Memory Server...');
    await mongod.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((error) => {
  console.error('Failed to start Mongo Memory Server:', error);
  process.exit(1);
});
