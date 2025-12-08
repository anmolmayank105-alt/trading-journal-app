// Run the server with full error logging
const { spawn } = require('child_process');
const path = require('path');

const serverPath = path.join(__dirname, 'services', 'auth-service');
const server = spawn('node', ['-r', 'ts-node/register', 'src/index.ts'], {
  cwd: serverPath,
  stdio: 'inherit'
});

server.on('error', (error) => {
  console.error('Failed to start server:', error);
});

server.on('exit', (code, signal) => {
  console.log(`Server exited with code ${code} and signal ${signal}`);
});

process.on('SIGINT', () => {
  server.kill('SIGINT');
  process.exit();
});
