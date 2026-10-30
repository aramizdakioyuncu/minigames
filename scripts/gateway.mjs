import http from 'node:http';
import net from 'node:net';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
export function createGateway(webRoot, backendPort, socketPort, authPort) {
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
  if (req.url.startsWith('/api/')) {
    const isAuth = /^\/api\/auth(?:[/?]|$)/.test(req.url);
    if (isAuth && !authPort) { res.writeHead(503); res.end('Authentication service unavailable'); return; }
    const headers = isAuth ? { ...req.headers, 'x-forwarded-for': req.socket.remoteAddress, 'x-forwarded-proto': 'http', 'x-forwarded-host': req.headers.host } : req.headers;
    const upstream = http.request({ hostname: '127.0.0.1', port: isAuth ? authPort : backendPort, path: req.url, method: req.method, headers }, response => {
      res.writeHead(response.statusCode, response.headers);
      response.pipe(res);
    });
    upstream.on('error', () => { res.writeHead(502); res.end('Backend unavailable'); });
    req.pipe(upstream);
    return;
  }
  try {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (!['/', '/verify-email', '/index.html', '/style.css'].includes(pathname) && !/^\/(js|assets)\//.test(pathname)) {
      res.writeHead(404); res.end(); return;
    }
    const target = path.resolve(webRoot, '.' + (['/', '/verify-email'].includes(pathname) ? '/index.html' : pathname));
    if (!target.startsWith(webRoot + path.sep) || pathname.split(/[\\/]/).some(p => p.startsWith('.'))) {
      res.writeHead(403); res.end(); return;
    }
    const data = await readFile(target);
    res.setHeader('Content-Type', (mime[path.extname(target)] || 'application/octet-stream') + (['.html', '.js', '.css'].includes(path.extname(target)) ? '; charset=utf-8' : ''));
    res.setHeader('Cache-Control', 'no-store');
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.on('upgrade', (req, client, head) => {
  if (req.url !== '/ws') { client.destroy(); return; }
  const upstream = net.connect(socketPort, '127.0.0.1', () => {
    upstream.write(`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n` +
      Object.entries(req.headers).map(([key, value]) => `${key}: ${value}\r\n`).join('') + '\r\n');
    if (head.length) upstream.write(head);
    client.pipe(upstream).pipe(client);
  });
  upstream.on('error', () => client.destroy());
  client.on('error', () => upstream.destroy());
  client.on('close', () => upstream.destroy());
});
return server;
}
