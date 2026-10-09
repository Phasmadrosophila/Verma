const fs = require('fs');
const file = 'tests/e2e/offline-visual-e2e.test.ts';
let content = fs.readFileSync(file, 'utf8');

// Update clickText to use PointerEvents and click
content = content.replace(
  `const clicked = await this.evaluate<boolean>(\`(() => { const match = [...document.querySelectorAll('button,a,div')].find((node) => node.textContent?.trim() === \${JSON.stringify(text)}); if (!match) return false; match.click(); return true; })()\`);`,
  `const clicked = await this.evaluate<boolean>(\`(() => { const match = [...document.querySelectorAll('button,a,div')].find((node) => node.textContent?.trim() === \${JSON.stringify(text)}); if (!match) return false; match.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); match.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); match.click(); return true; })()\`);`
);

// Add setInputByPlaceholder method
const setInputByLabelEnd = content.indexOf(`  async screenshot(`);
content = content.substring(0, setInputByLabelEnd) + 
  `  async setInputByPlaceholder(placeholder: string, value: string) {\n` +
  `    const set = await this.evaluate<boolean>(\`(() => { const input = document.querySelector('input[placeholder*="' + placeholder + '"]'); if (!input) return false; const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value'); descriptor?.set?.call(input, \${JSON.stringify(value)}); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); return true; })()\`);\n` +
  `    assert.equal(set, true, \\\`Missing input with placeholder: \${placeholder}\\\`);\n` +
  `  }\n\n` + content.substring(setInputByLabelEnd);

// Replace the main test block
const testStart = content.indexOf(`  page = await CdpPage.open`);
const testEnd = content.indexOf(`});\n`, testStart) + 4;

const newTestBlock = `  page = await CdpPage.open(debugPort, \`http://127.0.0.1:\${webPort}/\`);
  await page.resize(390, 844);

  // 1. Skip Onboarding
  await page.waitForText('Skip');
  await page.screenshot('01-loading-mobile.png', 'Skip');
  await page.clickText('Skip');

  // 2. Vault View (mock data)
  await page.waitForText('GitHub');
  await page.screenshot('02-vault-mobile.png', 'GitHub');

  // 3. Lock Vault
  await page.clickText('🔒');
  await page.waitForText('Vault is Locked');
  await page.screenshot('03-locked-mobile.png', 'Vault is Locked');

  // 4. Try wrong password
  await page.setInputByPlaceholder('demo: verma-demo', 'wrongpassword');
  await page.clickText('Unlock Vault');
  await page.waitForText('Please enter your master passphrase');
  await page.screenshot('04-unlock-error-mobile.png');

  // 5. Unlock Vault
  await page.setInputByPlaceholder('demo: verma-demo', 'verma-demo');
  await page.clickText('Unlock Vault');
  await page.waitForText('GitHub');
  await page.screenshot('05-unlocked-mobile.png', 'GitHub');

  const artifactNames = (await Promise.all([
    '01-loading-mobile.png', '02-vault-mobile.png', '03-locked-mobile.png',
    '04-unlock-error-mobile.png', '05-unlocked-mobile.png'
  ].map(async (name) => ({ name, bytes: (await readFile(resolve(artifactRoot, name))).byteLength }))));
  await writeFile(resolve(artifactRoot, 'summary.json'), JSON.stringify({ syntheticOnly: true, screenshots: artifactNames }, null, 2));
});
`;

content = content.substring(0, testStart) + newTestBlock;
fs.writeFileSync(file, content);
console.log('Patch applied.');
