const fs = require('fs');
let content = fs.readFileSync('tests/e2e/offline-visual-e2e.test.ts', 'utf8');
content = content.replace(
  'const query = "input[placeholder*=\\"" + placeholder + "\\"]"; const input = document.querySelector(query);',
  'const query = "input[placeholder*=\\"" + " + JSON.stringify(placeholder) + " + "\\"]"; const input = document.querySelector(query);'
);
fs.writeFileSync('tests/e2e/offline-visual-e2e.test.ts', content);
