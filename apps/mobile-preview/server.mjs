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
const allowed = new Set(['/index.html', '/styles.css', '/theme-b.css', '/app.js', '/vault.js']);
const port = Number(process.env.PORT || 3000);

createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const route = pathname === '/' ? '/index.html' : pathname;
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
}).listen(port, '0.0.0.0', () => console.log(`Verma Mobile UI is ready at http://localhost:${port}`));
