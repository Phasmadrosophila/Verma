import type { LoginEntry, NoteEntry, ApiKeyEntry, VaultEntry } from '../types/entry.js';

export const SYNTHETIC_LOGINS: LoginEntry[] = [
  {
    id: 'syn-login-001',
    type: 'login',
    title: 'GitHub (Work Account)',
    username: 'synth.developer@example.test',
    password: 'Syn-Pass-Gh-982#alpha',
    url: 'https://github.com/login',
    domain: 'github.com',
    tags: ['development', 'work', 'code'],
    totpSecret: 'JBSWY3DPEHPK3PXP',
    recoveryCodes: ['SYN-REC-001', 'SYN-REC-002', 'SYN-REC-003'],
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },
  {
    id: 'syn-login-002',
    type: 'login',
    title: 'Google Workspace (Corporate)',
    username: 'synth.developer@example.test',
    password: 'Syn-Pass-Gg-441!corp',
    url: 'https://accounts.google.com',
    domain: 'google.com',
    tags: ['work', 'email', 'productivity'],
    createdAt: 1700000100000,
    updatedAt: 1700000100000,
  },
  {
    id: 'syn-login-003',
    type: 'login',
    title: 'AWS Management Console',
    username: 'synth.cloud-admin@example.test',
    password: 'Syn-Pass-Aws-773$infra',
    url: 'https://console.aws.amazon.com',
    domain: 'aws.amazon.com',
    tags: ['cloud', 'infra', 'admin'],
    totpSecret: 'HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ',
    createdAt: 1700000200000,
    updatedAt: 1700000200000,
  },
  {
    id: 'syn-login-004',
    type: 'login',
    title: 'Slack Workspace',
    username: 'synth.developer@example.test',
    password: 'Syn-Pass-Gg-441!corp', // Reused password for deterministic testing
    url: 'https://phasmateam.slack.com',
    domain: 'slack.com',
    tags: ['chat', 'work', 'communication'],
    createdAt: 1700000300000,
    updatedAt: 1700000300000,
  },
  {
    id: 'syn-login-005',
    type: 'login',
    title: 'Legacy Internal Portal',
    username: 'legacy_user',
    password: '123', // Deliberately weak password for deterministic testing
    url: 'http://internal.local/login',
    domain: 'internal.local',
    tags: ['legacy', 'internal'],
    createdAt: 1700000400000,
    updatedAt: 1700000400000,
  },
];

export const SYNTHETIC_NOTES: NoteEntry[] = [
  {
    id: 'syn-note-001',
    type: 'note',
    title: 'SSH Bastion Host Configuration',
    content: 'Host bastion.internal.example.test\nUser synth-admin\nPort 2222\nIdentityFile ~/.ssh/id_synthetic',
    category: 'infrastructure',
    tags: ['infra', 'ssh', 'servers'],
    createdAt: 1700000500000,
    updatedAt: 1700000500000,
  },
  {
    id: 'syn-note-002',
    type: 'note',
    title: 'Guest Wi-Fi Security Details',
    content: 'SSID: VermaDemoGuest\nWPA3 Key: SynthGuestPass2026!\nSubnet: 192.168.100.0/24',
    category: 'office',
    tags: ['wifi', 'network', 'office'],
    createdAt: 1700000600000,
    updatedAt: 1700000600000,
  },
  {
    id: 'syn-note-003',
    type: 'note',
    title: 'HomeLab Disaster Recovery Runbook',
    content: '1. Power on main node\n2. Verify ZFS pool status: zpool status\n3. Start local Docker daemon\n4. Re-sync QUIC peer',
    category: 'homelab',
    tags: ['homelab', 'recovery', 'runbook'],
    createdAt: 1700000700000,
    updatedAt: 1700000700000,
  },
];

export const SYNTHETIC_API_KEYS: ApiKeyEntry[] = [
  {
    id: 'syn-api-001',
    type: 'api_key',
    title: 'Stripe Test Secret Key',
    service: 'stripe',
    apiKey: 'sk_test_synthetic_51AbCdEfGhIjKlMnOpQrStUvWxYz0123456789',
    apiSecret: 'whsec_synthetic_webhook_signing_secret_99999',
    keyId: 'key_test_stripe_001',
    tags: ['billing', 'payments', 'dev'],
    createdAt: 1700000800000,
    updatedAt: 1700000800000,
  },
  {
    id: 'syn-api-002',
    type: 'api_key',
    title: 'OpenAI Mock Sandbox API Key',
    service: 'openai',
    apiKey: 'sk-proj-synthetic-mock-key-do-not-use-in-production-abc123xyz',
    keyId: 'org-synthetic-demo',
    tags: ['ai', 'testing', 'mock'],
    createdAt: 1700000900000,
    updatedAt: 1700000900000,
  },
  {
    id: 'syn-api-003',
    type: 'api_key',
    title: 'Resend Transactional Mailer Key',
    service: 'resend',
    apiKey: 're_synthetic_mailer_key_998877665544332211',
    tags: ['email', 'notifications', 'prod'],
    expiresAt: 1735689600000,
    createdAt: 1700001000000,
    updatedAt: 1700001000000,
  },
];

export const ALL_SYNTHETIC_ENTRIES: VaultEntry[] = [
  ...SYNTHETIC_LOGINS,
  ...SYNTHETIC_NOTES,
  ...SYNTHETIC_API_KEYS,
];

export const SYNTHETIC_PASSWORD_FOR_VAULT = 'SyntheticMasterPassword2026!';
export const SYNTHETIC_RECOVERY_PHRASE =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art';

export const SYNTHETIC_MESSY_BROWSER_CSV = `name,url,username,password,note,folder
"GitHub (Work Account)","https://github.com/login","synth.developer@example.test","Syn-Pass-Gh-982#alpha","Work dev account","Development"
"Google Workspace","https://accounts.google.com","synth.developer@example.test","Syn-Pass-Gg-441!corp","Company mail","Productivity"
"AWS Console","https://console.aws.amazon.com","synth.cloud-admin@example.test","Syn-Pass-Aws-773$infra","Infra cloud","Cloud"
"Slack Workspace","https://phasmateam.slack.com","synth.developer@example.test","Syn-Pass-Gg-441!corp","Team chat","Communication"
"GitHub (Duplicate Work)","https://github.com/login","synth.developer@example.test","Syn-Pass-Gh-982#alpha","Duplicate entry test","Development"
"Legacy Internal","http://internal.local/login","synth.legacy_user@example.test","Syn-Pass-123","Old portal","Internal"`;

export const SYNTHETIC_CLEAN_BROWSER_CSV = `Title,URL,Username,Password,Notes
"GitHub Clean","https://github.com/login","synth.dev@example.test","Syn-Pass-Clean-1","Dev account"
"Stripe Dashboard","https://dashboard.stripe.com","synth.billing@example.test","Syn-Pass-Clean-2","Billing portal"`;
