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
  '.woff2': 'font/woff2'
};
const allowed = new Set(['/index.html', '/landing.css', '/landing.js', '/cloud.html', '/cloud.css', '/download.html', '/download.css']);
const port = Number(process.env.PORT || 3000);

createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname === '/app' || pathname === '/app/') {
      res.writeHead(302, { Location: '/#inside' }).end();
      return;
    }
    let route = pathname;
    if (pathname === '/') route = '/index.html';
    else if (pathname === '/cloud' || pathname === '/cloud/') route = '/cloud.html';
    else if (pathname === '/download' || pathname === '/download/') route = '/download.html';
    const path = resolve(root, '.' + route);
    if ((!allowed.has(route) && !route.startsWith('/assets/')) || !path.startsWith(root + sep)) {
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
}).listen(port, '0.0.0.0', () => console.log(`Verma Landing Page is ready at http://localhost:${port}`));
