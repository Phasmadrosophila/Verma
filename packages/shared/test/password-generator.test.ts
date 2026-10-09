import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generatePassword } from '../src/crypto/password-generator.js';

describe('Password Generator (Non-AI CSPRNG)', () => {
  it('should generate password of requested length', () => {
    const p16 = generatePassword({ length: 16 });
    assert.equal(p16.length, 16);

    const p32 = generatePassword({ length: 32 });
    assert.equal(p32.length, 32);

    const p64 = generatePassword({ length: 64 });
    assert.equal(p64.length, 64);
  });

  it('should respect character set options', () => {
    // Digits only
    const digitsOnly = generatePassword({
      length: 20,
      lowercase: false,
      uppercase: false,
      numbers: true,
      symbols: false,
    });
    assert.match(digitsOnly, /^[0-9]+$/);

    // Alpha only
    const alphaOnly = generatePassword({
      length: 20,
      lowercase: true,
      uppercase: true,
      numbers: false,
      symbols: false,
    });
    assert.match(alphaOnly, /^[a-zA-Z]+$/);
  });

  it('should avoid ambiguous characters when requested', () => {
    const password = generatePassword({
      length: 100,
      avoidAmbiguous: true,
    });

    const ambiguousChars = ['l', '1', 'I', 'O', '0'];
    for (const ch of ambiguousChars) {
      assert.ok(!password.includes(ch), `Password should not contain ambiguous character: ${ch}`);
    }
  });

  it('should throw if no character sets are selected', () => {
    assert.throws(() => {
      generatePassword({
        lowercase: false,
        uppercase: false,
        numbers: false,
        symbols: false,
      });
    });
  });
});
