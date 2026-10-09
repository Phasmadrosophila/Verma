import { randomInt } from 'node:crypto';

export interface PasswordGeneratorOptions {
  length?: number;
  lowercase?: boolean;
  uppercase?: boolean;
  numbers?: boolean;
  symbols?: boolean;
  avoidAmbiguous?: boolean;
}

const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';
const AMBIGUOUS = 'l1IO0';

export function generatePassword(options: PasswordGeneratorOptions = {}): string {
  const {
    length = 20,
    lowercase = true,
    uppercase = true,
    numbers = true,
    symbols = true,
    avoidAmbiguous = false,
  } = options;

  let lowercaseChars = lowercase ? LOWERCASE : '';
  let uppercaseChars = uppercase ? UPPERCASE : '';
  let numberChars = numbers ? NUMBERS : '';
  let symbolChars = symbols ? SYMBOLS : '';

  if (avoidAmbiguous) {
    const filterAmbiguous = (s: string) =>
      s.split('').filter((c) => !AMBIGUOUS.includes(c)).join('');
    lowercaseChars = filterAmbiguous(lowercaseChars);
    uppercaseChars = filterAmbiguous(uppercaseChars);
    numberChars = filterAmbiguous(numberChars);
    symbolChars = filterAmbiguous(symbolChars);
  }

  const pool = lowercaseChars + uppercaseChars + numberChars + symbolChars;
  if (!pool) {
    throw new Error('At least one character set must be selected for password generation');
  }

  // Ensure at least one character from each selected set is included
  const requiredChars: string[] = [];
  if (lowercaseChars) requiredChars.push(lowercaseChars[randomInt(lowercaseChars.length)]);
  if (uppercaseChars) requiredChars.push(uppercaseChars[randomInt(uppercaseChars.length)]);
  if (numberChars) requiredChars.push(numberChars[randomInt(numberChars.length)]);
  if (symbolChars) requiredChars.push(symbolChars[randomInt(symbolChars.length)]);

  const remainingLength = Math.max(0, length - requiredChars.length);
  const resultChars = [...requiredChars];

  for (let i = 0; i < remainingLength; i++) {
    resultChars.push(pool[randomInt(pool.length)]);
  }

  // Fisher-Yates shuffle using CSPRNG
  for (let i = resultChars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    const temp = resultChars[i];
    resultChars[i] = resultChars[j];
    resultChars[j] = temp;
  }

  return resultChars.join('');
}
