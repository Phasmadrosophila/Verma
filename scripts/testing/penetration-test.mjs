#!/usr/bin/env node
/**
 * Verma Penetration Testing Suite Runner
 */

import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const ROOT_DIR = resolve(__dirname, '../..');

console.log('🛡️  Starting Phase 2E Penetration Testing Suite...');
console.log('Target: Local Engine & Protocol Security Boundaries\n');

const pentestScript = resolve(ROOT_DIR, 'tests/penetration/pentest.test.mjs');

const child = spawn('node', ['--test', pentestScript], {
  cwd: ROOT_DIR,
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'test' }
});

child.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Penetration testing PASSED. Zero regressions detected.');
    process.exit(0);
  } else {
    console.error('\n❌ Penetration testing FAILED. Vulnerabilities or regressions found.');
    process.exit(code || 1);
  }
});
