const fs = require('fs');
let content = fs.readFileSync('tests/e2e/offline-visual-e2e.test.ts', 'utf8');
content = content.replace(/\\\`Missing input with placeholder: \${placeholder}\\\`/g, "\`Missing input with placeholder: \${placeholder}\`");
fs.writeFileSync('tests/e2e/offline-visual-e2e.test.ts', content);
