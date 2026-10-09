import type { VaultEntry, LoginEntry } from '../types/entry.js';

export interface PasswordStrengthResult {
  isWeak: boolean;
  score: number; // 0 to 4
  reasons: string[];
}

const COMMON_WEAK_PASSWORDS = new Set([
  '123456',
  'password',
  '12345678',
  'qwerty',
  '123456789',
  '12345',
  '1234',
  '111111',
  '1234567',
  'dragon',
  'welcome',
  'admin',
  'default',
  'password123',
  'admin123',
]);

export function checkPasswordStrength(password: string): PasswordStrengthResult {
  if (!password || password.length === 0) {
    return {
      isWeak: true,
      score: 0,
      reasons: ['Password is empty'],
    };
  }

  const reasons: string[] = [];
  let score = 0;

  if (COMMON_WEAK_PASSWORDS.has(password.toLowerCase())) {
    return {
      isWeak: true,
      score: 0,
      reasons: ['Password is a commonly breached password'],
    };
  }

  if (password.length < 8) {
    reasons.push('Password length is under 8 characters');
  } else if (password.length < 12) {
    reasons.push('Password length is under 12 characters');
    score += 1;
  } else if (password.length < 16) {
    score += 2;
  } else {
    score += 3;
  }

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);

  const diversity = [hasLower, hasUpper, hasNumber, hasSymbol].filter(Boolean).length;

  if (diversity <= 1) {
    reasons.push('Password uses only one character class');
  } else if (diversity >= 3) {
    score += 1;
  }

  // Check repeating characters (e.g. "aaaaa")
  if (/(.)\1{3,}/.test(password)) {
    reasons.push('Password contains repeating sequences');
    score = Math.max(0, score - 1);
  }

  // Score capped at 4
  const finalScore = Math.min(4, Math.max(0, score));
  const isWeak = finalScore < 2 || password.length < 10;

  return {
    isWeak,
    score: finalScore,
    reasons,
  };
}

export function checkPasswordReuse(entries: VaultEntry[]): Map<string, boolean> {
  const reuseMap = new Map<string, boolean>();
  const passwordToEntryIds = new Map<string, string[]>();

  for (const entry of entries) {
    if (entry.type === 'login') {
      const login = entry as LoginEntry;
      if (login.password) {
        const existing = passwordToEntryIds.get(login.password) ?? [];
        existing.push(login.id);
        passwordToEntryIds.set(login.password, existing);
      }
    }
  }

  for (const entry of entries) {
    if (entry.type === 'login') {
      const login = entry as LoginEntry;
      const matchingIds = passwordToEntryIds.get(login.password) ?? [];
      reuseMap.set(entry.id, matchingIds.length > 1);
    } else {
      reuseMap.set(entry.id, false);
    }
  }

  return reuseMap;
}
