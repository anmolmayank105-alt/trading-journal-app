const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Test server running');
});

server.listen(3003, () => {
  console.log('Test server on 3003');
});

setInterval(() => console.log('Alive'), 5000);
