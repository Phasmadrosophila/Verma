const fs = require('fs');
let content = fs.readFileSync('tests/e2e/offline-visual-e2e.test.ts', 'utf8');
content = content.replace(
  'const input = document.querySelector(`input[placeholder*="${placeholder}"]`);',
  'const query = "input[placeholder*=\\"" + placeholder + "\\"]"; const input = document.querySelector(query);'
);
fs.writeFileSync('tests/e2e/offline-visual-e2e.test.ts', content);
