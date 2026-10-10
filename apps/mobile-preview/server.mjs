import { previewPort } from '../../scripts/preview-options.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};
const allowed = new Set(['/index.html', '/styles.css', '/theme-b.css', '/app.js', '/vault.js', '/preview-storage.js']);
const port = previewPort(5128);
const backendUrl = process.env.BACKEND_URL || (process.env.API_PORT ? `http://127.0.0.1:${process.env.API_PORT}` : 'http://127.0.0.1:3000');

async function handleBackendProxy(req, res, targetUrl) {
  try {
    const isBodyMethod = ['POST', 'PUT', 'PATCH'].includes(req.method || '');
    let bodyBuffer = null;
    if (isBodyMethod) {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      bodyBuffer = Buffer.concat(chunks);
    }

    const backendRes = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Accept': req.headers['accept'] || 'application/json',
        'Content-Type': req.headers['content-type'] || 'application/json',
      },
      body: bodyBuffer,
    });

    const data = await backendRes.arrayBuffer();
    res.writeHead(backendRes.status, {
      'Content-Type': backendRes.headers.get('content-type') || 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Cache-Control': 'no-cache',
    });
    res.end(Buffer.from(data));
  } catch {
    res.writeHead(503, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify({
      error: 'Verma local backend service is offline',
      isOffline: true,
      hint: 'Start local Hono backend API via: pnpm dev'
    }));
  }
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }).end();
      return;
    }

    if (pathname === '/health') {
      let backendState = 'offline';
      try {
        const ping = await fetch(`${backendUrl}/health`, { signal: AbortSignal.timeout(600) });
        if (ping.ok) backendState = 'online';
      } catch {}
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
      res.end(JSON.stringify({ status: 'ok', service: 'verma-mobile-preview', backend: backendState }));
      return;
    }

    if (pathname.startsWith('/api/')) {
      await handleBackendProxy(req, res, `${backendUrl}${pathname}${url.search}`);
      return;
    }

    const route = pathname === '/' ? '/index.html' : pathname;
    const assetRoot = route.startsWith('/assets/fonts/') ? resolve(root, '../..') : root;
    const path = resolve(assetRoot, '.' + route);
    if ((!allowed.has(route) && !route.startsWith('/assets/')) || !path.startsWith(assetRoot + sep)) {
      res.writeHead(404).end('Not found');
      return;
    }
    const data = await readFile(path);
    res.writeHead(200, {
      'Content-Type': types[extname(path)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(data);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(port, '0.0.0.0', () => console.log(`Verma Mobile UI is ready at http://localhost:${port}`));
