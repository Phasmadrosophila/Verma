import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveMasterKey,
  generateSalt,
  encryptPayload,
  decryptPayload,
  encryptJson,
  decryptJson,
  zeroizeBuffer,
  checkPasswordStrength,
  checkPasswordReuse,
} from '../src/crypto/index.js';
import type { LoginEntry, NoteEntry } from '../src/types/entry.js';

describe('Crypto Module', () => {
  it('should derive consistent master key from password and salt', () => {
    const salt = generateSalt(32);
    const password = 'TestMasterPassword123!';

    const key1 = deriveMasterKey(password, salt);
    const key2 = deriveMasterKey(password, salt);

    assert.equal(key1.length, 32);
    assert.deepEqual(key1, key2);

    // Different salt produces different key
    const differentSalt = generateSalt(32);
    const key3 = deriveMasterKey(password, differentSalt);
    assert.notDeepEqual(key1, key3);
  });

  it('should encrypt and decrypt binary / string payloads using AES-256-GCM', () => {
    const key = deriveMasterKey('test-pass', generateSalt());
    const plaintext = 'Secret payload to encrypt';

    const payload = encryptPayload(plaintext, key);
    assert.ok(payload.iv);
    assert.ok(payload.authTag);
    assert.ok(payload.ciphertext);
    assert.notEqual(payload.ciphertext, plaintext);

    const decryptedBuf = decryptPayload(payload, key);
    assert.equal(decryptedBuf.toString('utf8'), plaintext);
  });

  it('should encrypt and decrypt JSON objects', () => {
    const key = deriveMasterKey('test-pass', generateSalt());
    const data = { foo: 'bar', count: 42, nested: { secret: 'xyz' } };

    const payload = encryptJson(data, key);
    const decrypted = decryptJson<typeof data>(payload, key);

    assert.deepEqual(decrypted, data);
  });

  it('should fail decryption when auth tag or ciphertext is tampered with', () => {
    const key = deriveMasterKey('test-pass', generateSalt());
    const payload = encryptPayload('Hello World', key);

    // Tamper ciphertext
    const tamperedCiphertext = payload.ciphertext.slice(0, -2) + (payload.ciphertext.slice(-2) === 'aa' ? 'bb' : 'aa');
    const tamperedPayload = { ...payload, ciphertext: tamperedCiphertext };

    assert.throws(() => {
      decryptPayload(tamperedPayload, key);
    });
  });

  it('should zeroize buffer securely in memory', () => {
    const buf = Buffer.from('sensitive_in_memory_data');
    assert.ok(buf.some((b) => b !== 0));
    zeroizeBuffer(buf);
    assert.ok(buf.every((b) => b === 0));
  });

  it('should deterministically evaluate password strength', () => {
    const weak1 = checkPasswordStrength('123456');
    assert.equal(weak1.isWeak, true);

    const weak2 = checkPasswordStrength('password');
    assert.equal(weak2.isWeak, true);

    const weak3 = checkPasswordStrength('abc');
    assert.equal(weak3.isWeak, true);

    const strong = checkPasswordStrength('Kx9#mQ2$vLp8!zRw');
    assert.equal(strong.isWeak, false);
    assert.ok(strong.score >= 3);
  });

  it('should deterministically detect password reuse across entries', () => {
    const entries: (LoginEntry | NoteEntry)[] = [
      {
        id: '1',
        type: 'login',
        title: 'Entry 1',
        username: 'user1',
        password: 'SharedPassword123!',
        tags: [],
        createdAt: 0,
        updatedAt: 0,
      },
      {
        id: '2',
        type: 'login',
        title: 'Entry 2',
        username: 'user2',
        password: 'SharedPassword123!', // Reused
        tags: [],
        createdAt: 0,
        updatedAt: 0,
      },
      {
        id: '3',
        type: 'login',
        title: 'Entry 3',
        username: 'user3',
        password: 'UniquePassword999$',
        tags: [],
        createdAt: 0,
        updatedAt: 0,
      },
      {
        id: '4',
        type: 'note',
        title: 'Note 4',
        content: 'Not a login',
        tags: [],
        createdAt: 0,
        updatedAt: 0,
      },
    ];

    const reuseMap = checkPasswordReuse(entries);
    assert.equal(reuseMap.get('1'), true);
    assert.equal(reuseMap.get('2'), true);
    assert.equal(reuseMap.get('3'), false);
    assert.equal(reuseMap.get('4'), false);
  });
});
