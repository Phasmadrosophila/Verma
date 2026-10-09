import type { VaultEntry } from './types.ts';

/**
 * Sanitized mock CSV representing a messy browser password export.
 * Contains duplicate records, inconsistent column formats, and messy notes.
 * Strictly synthetic mock data — zero real credentials.
 */
export const MESSY_BROWSER_CSV_FIXTURE = `name,url,username,password,note,grouping
Google Work,https://accounts.google.com/signin,dev-lead@company-x.com,mock-pass-google-work-01,Company X corporate GSuite login,Work
Company X Google Account,https://google.com,dev-lead@company-x.com,mock-pass-google-work-dup,Duplicate entry for company google,
GitHub Main,https://github.com/login,lyraphasma,mock-pass-github-secure-42,Primary dev repo account,Dev
GitHub Personal,https://github.com,lyraphasma-personal,mock-pass-gh-personal-99,Personal experiments,Personal
AWS Production Console,https://aws.amazon.com/console,infra-admin@company-x.com,mock-pass-aws-prod-88,Root production console login,Work/Infra
AWS Staging,https://aws.amazon.com/console,infra-admin@company-x.com,mock-pass-aws-prod-88,Staging console same credentials,Work/Infra
Figma Team,https://figma.com/login,design-lead@company-x.com,mock-pass-figma-team-77,Design team shared account,Design
Slack Workspace,https://company-x.slack.com,dev-lead@company-x.com,mock-pass-slack-55,Internal engineering chat,Work
`;

/**
 * Mock 24-word recovery phrase for testing setup/recovery boundary.
 * Strictly synthetic BIP39 mock words.
 */
export const MOCK_RECOVERY_PHRASE_24_WORDS =
  'abandon ability able about above absent absorb abstract absurd abuse access accident account accuse achieve acid acoustic acquire across act action actor actress actual';

/**
 * Baseline synthetic vault entries for testing redaction and synchronization.
 */
export const MOCK_VAULT_ENTRIES: VaultEntry[] = [
  {
    id: 'entry-google-work',
    type: 'login',
    title: 'Google Work (Company X)',
    domain: 'accounts.google.com',
    username: 'dev-lead@company-x.com',
    tags: ['work', 'google', 'company-x'],
    createdAt: 1775700000000,
    updatedAt: 1775700000000,
    isReused: true,
    isWeak: false,
    fieldLabels: ['username', 'password', 'note'],
    secrets: {
      password: 'mock-pass-google-work-01',
      noteBody: 'Company X corporate GSuite login',
      totpSeed: 'JBSWY3DPEHPK3PXP',
      recoveryCodes: ['mock-recov-001', 'mock-recov-002']
    }
  },
  {
    id: 'entry-google-work-dup',
    type: 'login',
    title: 'Company X Google Account',
    domain: 'google.com',
    username: 'dev-lead@company-x.com',
    tags: ['work', 'google'],
    createdAt: 1775701000000,
    updatedAt: 1775701000000,
    isReused: true,
    isWeak: false,
    fieldLabels: ['username', 'password'],
    secrets: {
      password: 'mock-pass-google-work-01'
    }
  },
  {
    id: 'entry-github-dev',
    type: 'login',
    title: 'GitHub Work Organization',
    domain: 'github.com',
    username: 'lyraphasma',
    tags: ['work', 'dev', 'infrastructure'],
    createdAt: 1775702000000,
    updatedAt: 1775702000000,
    isReused: false,
    isWeak: false,
    fieldLabels: ['username', 'password', 'note'],
    secrets: {
      password: 'mock-pass-github-secure-42',
      noteBody: 'Primary dev repo account with 2FA enabled',
      totpSeed: 'HXDMVJECJJWSRB3H'
    }
  },
  {
    id: 'entry-aws-api-key',
    type: 'api_key',
    title: 'AWS Production Deployment Key',
    domain: 'aws.amazon.com',
    tags: ['infrastructure', 'cloud', 'work'],
    createdAt: 1775703000000,
    updatedAt: 1775703000000,
    isReused: false,
    isWeak: false,
    fieldLabels: ['key_id', 'secret_key'],
    secrets: {
      secretValue: 'mock-aws-secret-key-prod-99887766'
    }
  },
  {
    id: 'entry-infrastructure-note',
    type: 'note',
    title: 'PostgreSQL Migration Master Secret Note',
    tags: ['database', 'infrastructure', 'internal'],
    createdAt: 1775704000000,
    updatedAt: 1775704000000,
    isReused: false,
    isWeak: false,
    fieldLabels: ['note_body'],
    secrets: {
      noteBody: 'DB Connection: postgres://admin:secret12345@10.0.0.5:5432/vault'
    }
  },
  // Crypto wallet entry — MUST BE 100% EXCLUDED FROM AI
  {
    id: 'entry-crypto-cold-wallet',
    type: 'crypto_wallet',
    title: 'Ethereum Hardware Cold Wallet Seed',
    domain: 'ledger.com',
    tags: ['crypto', 'ethereum', 'cold-storage'],
    createdAt: 1775705000000,
    updatedAt: 1775705000000,
    isReused: false,
    isWeak: false,
    fieldLabels: ['seed_phrase', 'eth_address'],
    secrets: {
      seedPhrase: 'witch collapse practice feed shame open despair creek road again ice least',
      privateKey: '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
    }
  }
];
