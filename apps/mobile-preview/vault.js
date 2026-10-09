export const seedEntries = [
  { id: 1, type: 'login', title: 'Google', subtitle: 'Work account', user: 'sam@companyx.example', domain: 'accounts.google.com', tags: ['Work', 'Company X'], favorite: true, brand: 'google', secret: 'demo-only-work-lantern-4821', updated: 'Today' },
  { id: 2, type: 'login', title: 'GitHub', subtitle: 'A home for your ideas', user: 'sam-dev', domain: 'github.com', tags: ['Development'], favorite: true, brand: 'github', secret: 'demo-only-github-cobalt-7294', updated: 'Yesterday' },
  { id: 3, type: 'login', title: 'Netflix', subtitle: 'Family account', user: 'family@example.com', domain: 'netflix.com', tags: ['Personal', 'Streaming'], favorite: true, brand: 'netflix', secret: 'demo-only-netflix-maple-6153', updated: '3 days ago' },
  { id: 4, type: 'login', title: 'Google', subtitle: 'Personal account', user: 'sam.demo@example.com', domain: 'accounts.google.com', tags: ['Personal'], favorite: false, brand: 'google', secret: 'demo-only-personal-meadow-2381', updated: '3 days ago' },
  { id: 5, type: 'api', title: 'DigitalOcean', subtitle: 'Side project token', user: 'Side project', domain: 'cloud.digitalocean.com', tags: ['Development', 'Cloud'], favorite: false, brand: 'ocean', secret: 'demo-only-api-ocean-9152', updated: '2 weeks ago' },
  { id: 6, type: 'note', title: 'Home Wi-Fi', subtitle: 'The good connection', user: 'Home network', domain: '192.168.1.1', tags: ['Home', 'Network'], favorite: false, brand: 'wifi', secret: 'Demo network: Verma Home\nDemo password: little-universe-4821', updated: '1 month ago' }
];
export const typeLabels = { login: 'Login', note: 'Secure note', api: 'API key' };
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function filterEntries(entries, query = '', filter = 'all') {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return entries.filter(e => (filter === 'all' || e.type === filter || (filter === 'favorite' && e.favorite)) && words.every(word => [e.title, e.subtitle, e.domain, e.user, ...e.tags].join(' ').toLowerCase().includes(word)));
}

export function findMetadata(entries, query) {
  const stop = new Set(['my', 'the', 'for', 'a', 'an', 'of', 'to', 'and', 'account', 'accounts', 'i', 'me', 'that', 'is', 'where', 'what', 'find', 'please']);
  const tokens = [...new Set(query.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 1 && !stop.has(t)))];
  const aliases = { streaming: ['netflix', 'streaming', 'spotify'], code: ['github', 'development'], token: ['api', 'token'], wifi: ['wi-fi', 'network', 'router'], cloud: ['cloud', 'digitalocean'], family: ['family'], work: ['work', 'company'] };
  return entries.map(e => {
    // Only this explicit metadata projection is searched; secrets and note bodies never enter it.
    const hay = [e.title, e.subtitle, e.domain, ...e.tags, typeLabels[e.type]].join(' ').toLowerCase();
    const matched = tokens.filter(t => (aliases[t] || [t]).some(word => hay.includes(word)));
    return { entry: e, matched, score: matched.length };
  }).filter(r => r.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
}

export function generatePassword(length = 20) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#_-';
  const limit = 256 - (256 % chars.length);
  let result = '';
  while (result.length < length) {
    for (const byte of crypto.getRandomValues(new Uint8Array(length))) {
      if (byte < limit && result.length < length) result += chars[byte % chars.length];
    }
  }
  return result;
}

export const sampleImport = [
  { title: 'Slack', subtitle: 'Company X workspace', domain: 'companyx.slack.com', user: 'sam@companyx.example', tag: 'Work', brand: 'slack', type: 'login' },
  { title: 'Spotify', subtitle: 'Family plan', domain: 'spotify.com', user: 'family@example.com', tag: 'Personal', brand: 'spotify', type: 'login' },
  { title: 'Notion', subtitle: 'Your second brain', domain: 'notion.so', user: 'sam.demo@example.com', tag: 'Productivity', brand: 'notion', type: 'login' },
  { title: 'Figma', subtitle: 'A little creative space', domain: 'figma.com', user: 'sam@companyx.example', tag: 'Design', brand: 'figma', type: 'login' },
  { title: 'Linear', subtitle: 'Work projects', domain: 'linear.app', user: 'sam@companyx.example', tag: 'Work', brand: 'linear', type: 'login' },
  { title: 'DigitalOcean', subtitle: 'New project token', domain: 'cloud.digitalocean.com', user: 'New project', tag: 'Development', brand: 'ocean', type: 'api' },
  { title: 'Google', subtitle: 'Work account (old)', domain: 'accounts.google.com', user: 'sam@companyx.example', tag: 'Work', brand: 'google', type: 'login', duplicate: true }
];

export function prepareImport(rows, duplicateChoice, nextId) {
  if (!['keep', 'skip'].includes(duplicateChoice)) throw new Error('Choose how to handle the duplicate first.');
  return rows.filter(row => !row.duplicate || duplicateChoice === 'keep').map((row, index) => ({
    id: nextId + index, title: row.title, subtitle: row.subtitle, domain: row.domain, user: row.user,
    type: row.type, brand: row.brand, tags: row.accepted && row.tag.trim() ? [row.tag.trim()] : [],
    favorite: false, secret: `demo-only-import-${nextId + index}`, updated: 'Just now'
  }));
}
