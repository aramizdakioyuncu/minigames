import { createApp } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const server = createApp(config).listen(config.port, config.host, () => {
  console.log(`minigames_backend: http://${config.host}:${config.port}`);
  if (!config.configured) console.warn('PHATSA_URL and PHATSA_API_KEY are required to enable authentication.');
});
server.requestTimeout = 15000;
server.headersTimeout = 10000;
server.on('error', error => { console.error(`Auth server failed: ${error.code || 'unknown'}`); process.exitCode = 1; });
let stopping = false;
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  if (stopping) return;
  stopping = true;
  server.close(() => process.exit(0));
  setTimeout(() => { server.closeAllConnections(); process.exit(1); }, 10000).unref();
});
