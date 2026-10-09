import type { RedactedEntryMetadata } from '../types/index.js';

export interface AskVaultEvaluationFixture {
  id: string;
  query: string;
  metadata: RedactedEntryMetadata[];
  expectedRelevantIds: string[];
  expectedAnswerSubstring: string;
}

export interface ImportMappingEvaluationFixture {
  id: string;
  rawHeaders: string[];
  sampleRow: Record<string, string>;
  expectedMappings: Record<string, 'username' | 'password' | 'url' | 'title' | 'notes' | 'tags' | 'ignored'>;
}

export interface TagSuggestionEvaluationFixture {
  id: string;
  serviceDomain: string;
  entryTitle: string;
  existingTags: string[];
  suggestedTags: string[];
}

export interface HealthExplanationEvaluationFixture {
  id: string;
  title: string;
  domain: string;
  isWeak: boolean;
  isReused: boolean;
  reusedWithCount: number;
  expectedUrgency: 'low' | 'medium' | 'high';
  expectedKeywordInExplanation: string;
}

export const SYNTHETIC_ASK_VAULT_FIXTURES: AskVaultEvaluationFixture[] = [
  {
    id: 'ask-01-work-github',
    query: 'Show me my developer tools and work code repository logins',
    metadata: [
      {
        id: 'entry-eval-01',
        type: 'login',
        title: 'GitHub Enterprise',
        domain: 'github.enterprise.corp',
        tags: ['work', 'dev', 'vcs'],
        fieldLabels: ['username', 'password'],
        isWeak: false,
        isReused: false,
        createdAt: 1710000000000,
        updatedAt: 1710000000000,
      },
      {
        id: 'entry-eval-02',
        type: 'login',
        title: 'Netflix Personal',
        domain: 'netflix.com',
        tags: ['entertainment', 'streaming'],
        fieldLabels: ['username', 'password'],
        isWeak: false,
        isReused: false,
        createdAt: 1710000100000,
        updatedAt: 1710000100000,
      },
    ],
    expectedRelevantIds: ['entry-eval-01'],
    expectedAnswerSubstring: 'GitHub Enterprise',
  },
  {
    id: 'ask-02-api-keys',
    query: 'Which API keys do I have for cloud hosting or databases?',
    metadata: [
      {
        id: 'entry-eval-03',
        type: 'api_key',
        title: 'AWS Production ReadOnly',
        domain: 'aws.amazon.com',
        tags: ['cloud', 'production', 'infra'],
        fieldLabels: ['apiKey', 'apiSecret'],
        isWeak: false,
        isReused: false,
        createdAt: 1710000200000,
        updatedAt: 1710000200000,
      },
      {
        id: 'entry-eval-04',
        type: 'note',
        title: 'WiFi Router Access Instructions',
        tags: ['home', 'networking'],
        fieldLabels: ['noteBody'],
        isWeak: false,
        isReused: false,
        createdAt: 1710000300000,
        updatedAt: 1710000300000,
      },
    ],
    expectedRelevantIds: ['entry-eval-03'],
    expectedAnswerSubstring: 'AWS Production ReadOnly',
  },
];

export const SYNTHETIC_IMPORT_MAPPING_FIXTURES: ImportMappingEvaluationFixture[] = [
  {
    id: 'import-chrome-messy',
    rawHeaders: ['name', 'url', 'login_id', 'pass', 'extra_notes'],
    sampleRow: {
      name: 'GitLab Corp',
      url: 'https://gitlab.example.com',
      login_id: 'alice_dev',
      pass: 'REDACTED_CSV_VALUE',
      extra_notes: 'Server access token notes',
    },
    expectedMappings: {
      name: 'title',
      url: 'url',
      login_id: 'username',
      pass: 'password',
      extra_notes: 'notes',
    },
  },
  {
    id: 'import-bitwarden-export',
    rawHeaders: ['folder', 'favorite', 'type', 'name', 'notes', 'fields', 'login_uri', 'login_username', 'login_password', 'login_totp'],
    sampleRow: {
      folder: 'Work',
      favorite: '1',
      type: 'login',
      name: 'Stripe Dashboard',
      notes: 'Finance dashboard',
      fields: '',
      login_uri: 'https://dashboard.stripe.com',
      login_username: 'finance@startup.corp',
      login_password: 'REDACTED_CSV_VALUE',
      login_totp: 'REDACTED_CSV_VALUE',
    },
    expectedMappings: {
      name: 'title',
      login_uri: 'url',
      login_username: 'username',
      login_password: 'password',
      notes: 'notes',
      folder: 'tags',
      favorite: 'ignored',
      type: 'ignored',
      fields: 'ignored',
      login_totp: 'ignored',
    },
  },
];

export const SYNTHETIC_TAG_SUGGESTION_FIXTURES: TagSuggestionEvaluationFixture[] = [
  {
    id: 'tag-01-gitlab',
    serviceDomain: 'gitlab.com',
    entryTitle: 'GitLab SaaS',
    existingTags: ['work'],
    suggestedTags: ['dev', 'vcs', 'git'],
  },
  {
    id: 'tag-02-digitalocean',
    serviceDomain: 'cloud.digitalocean.com',
    entryTitle: 'DigitalOcean Droplets',
    existingTags: [],
    suggestedTags: ['cloud', 'infra', 'hosting'],
  },
];

export const SYNTHETIC_HEALTH_EXPLANATION_FIXTURES: HealthExplanationEvaluationFixture[] = [
  {
    id: 'health-01-reused-weak',
    title: 'Old Forum Login',
    domain: 'forum.vintage-hardware.org',
    isWeak: true,
    isReused: true,
    reusedWithCount: 3,
    expectedUrgency: 'high',
    expectedKeywordInExplanation: 'reused',
  },
  {
    id: 'health-02-reused-only',
    title: 'Secondary Email',
    domain: 'mail.provider.net',
    isWeak: false,
    isReused: true,
    reusedWithCount: 2,
    expectedUrgency: 'medium',
    expectedKeywordInExplanation: 'shared',
  },
  {
    id: 'health-03-healthy',
    title: 'Primary Bank',
    domain: 'chase.com',
    isWeak: false,
    isReused: false,
    reusedWithCount: 0,
    expectedUrgency: 'low',
    expectedKeywordInExplanation: 'strong',
  },
];
