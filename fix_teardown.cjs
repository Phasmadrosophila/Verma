const fs = require('fs');
let content = fs.readFileSync('tests/e2e/offline-visual-e2e.test.ts', 'utf8');
content = content.replace(
  'await rm(chromeData, { recursive: true, force: true });',
  'await new Promise(r => setTimeout(r, 500));\n    await rm(chromeData, { recursive: true, force: true, maxRetries: 3 }).catch(() => {});'
);
fs.writeFileSync('tests/e2e/offline-visual-e2e.test.ts', content);
