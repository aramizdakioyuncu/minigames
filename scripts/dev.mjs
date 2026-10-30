import { createGateway } from './gateway.mjs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const webRoot = path.join(root, 'web');
const port = Number(process.env.WEB_PORT || 8080);
const backendPort = Number(process.env.BACKEND_PORT || 4000);
const socketPort = Number(process.env.SOCKET_PORT || 5050);
const authPort = Number(process.env.AUTH_PORT || 4100);
const children = [ ['backend', backendPort], ['socket', socketPort], ['minigames_backend', authPort] ].map(([dir, servicePort]) =>
  spawn(process.execPath, dir === 'minigames_backend' ? ['--env-file-if-exists=.env', 'src/server.js'] : ['server.js'], {
    cwd: path.join(root, dir), stdio: 'inherit', windowsHide: true,
    env: { ...process.env, PORT: String(servicePort), HOST: '127.0.0.1', ...(dir === 'socket' ? { AUTH_SERVICE_URL: `http://127.0.0.1:${authPort}` } : {}), ...(dir === 'minigames_backend' ? { AUTH_TRUST_PROXY: '1' } : {}) }
  })
);
const server = createGateway(webRoot, backendPort, socketPort, authPort);
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  children.forEach(child => child.kill());
  server.close();
  process.exit(code);
}
children.forEach(child => { child.on('error', () => stop(1)); child.on('exit', code => { if (!stopping) stop(code || 1); }); });
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
server.on('error', err => { console.error(err.message); stop(1); });
server.listen(port, '127.0.0.1', () => console.log(`PuckArena: http://localhost:${port}`));
