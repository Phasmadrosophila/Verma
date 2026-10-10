import { previewPort } from './scripts/preview-options.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

const allowed = new Set([
  '/index.html',
  '/landing.css',
  '/landing.js',
  '/cloud.html',
  '/cloud.css',
  '/download.html',
  '/download.css',
  '/pricing.html',
  '/pricing.css'
]);

const previewAssets = new Set([
  '/app.js',
  '/vault.js',
  '/preview-storage.js',
  '/styles.css',
  '/theme-b.css'
]);

const port = previewPort(5127);
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
  } catch (proxyErr) {
    const parsedPath = new URL(req.url || '/', 'http://localhost').pathname;
    if (parsedPath === '/health') {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(JSON.stringify({
        status: 'ok',
        service: 'verma-landing-server',
        backend: 'offline',
        mode: 'standalone-sandbox',
        timestamp: Date.now(),
        message: 'Landing server active. Run `pnpm dev` to start local Hono backend API.'
      }));
    } else {
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
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);

    // Handle CORS preflight options
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }).end();
      return;
    }

    // Health check endpoint reporting landing server and backend status
    if (pathname === '/health') {
      let backendState = 'offline';
      let backendMeta = null;
      try {
        const pingRes = await fetch(`${backendUrl}/health`, { signal: AbortSignal.timeout(600) });
        if (pingRes.ok) {
          backendState = 'online';
          backendMeta = await pingRes.json().catch(() => null);
        }
      } catch {
        // Backend not currently reachable
      }

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
      });
      res.end(JSON.stringify({
        status: 'ok',
        service: 'verma-landing-server',
        backend: backendState,
        backendDetails: backendMeta,
        timestamp: Date.now(),
        message: backendState === 'online'
          ? 'Verma local backend is online and connected.'
          : 'Landing server active in local offline mode. Run `pnpm dev` to launch Hono API.'
      }));
      return;
    }

    // Proxy API requests to backend
    if (pathname.startsWith('/api/')) {
      await handleBackendProxy(req, res, `${backendUrl}${pathname}${url.search}`);
      return;
    }

    // Interactive web app routes
    if (['/app/', '/cloud/', '/download/', '/pricing/'].includes(pathname)) {
      res.writeHead(302, { Location: pathname.slice(0, -1) + url.search }).end();
      return;
    }
    if (pathname === '/app') {
      try {
        const appHtml = await readFile(resolve(root, 'apps/mobile-preview/index.html'));
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache',
          'X-Content-Type-Options': 'nosniff'
        });
        res.end(appHtml);
        return;
      } catch {
        res.writeHead(302, { Location: '/#inside' }).end();
        return;
      }
    }

    // Serve interactive mobile preview assets if requested
    if (previewAssets.has(pathname)) {
      try {
        const previewAssetPath = resolve(root, 'apps/mobile-preview', '.' + pathname);
        const assetData = await readFile(previewAssetPath);
        res.writeHead(200, {
          'Content-Type': types[extname(pathname)] || 'application/octet-stream',
          'Cache-Control': 'no-cache',
        });
        res.end(assetData);
        return;
      } catch {
        // Fall through to general static resolution
      }
    }

    // Route normalization
    let route = pathname;
    if (pathname === '/') route = '/index.html';
    else if (pathname === '/cloud' || pathname === '/cloud/') route = '/cloud.html';
    else if (pathname === '/download' || pathname === '/download/') route = '/download.html';
    else if (pathname === '/pricing' || pathname === '/pricing/') route = '/pricing.html';

    const path = resolve(root, '.' + route);
    if ((!allowed.has(route) && !route.startsWith('/assets/') && !route.startsWith('/qa/')) || !path.startsWith(root + sep)) {
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
  } catch (serverErr) {
    console.error('SERVER ERR:', serverErr);
    res.writeHead(404).end('Not found');
  }
}).listen(port, '0.0.0.0', () => console.log(`Verma Landing Page is ready at http://localhost:${port}`));
