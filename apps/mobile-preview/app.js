import { seedEntries, typeLabels, escapeHtml as esc, filterEntries, findMetadata, generatePassword, sampleImport, prepareImport } from './vault.js';

const paths = {
  vault:'<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="12" cy="12" r="3"/><path d="M12 9v6M9 12h6M4 9H2M4 15H2"/>',
  spark:'<path d="m12 3 2.7 6.3L21 12l-6.3 2.7L12 21l-2.7-6.3L3 12l6.3-2.7L12 3ZM20 2v4M18 4h4"/>',
  import:'<path d="M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4"/>',
  devices:'<rect x="3" y="4" width="14" height="11" rx="2"/><path d="M5 20h9M9 15v5"/><rect x="16" y="10" width="5" height="10" rx="1.5"/>',
  lock:'<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
  shield:'<path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6z"/><path d="m8.5 11.5 2.5 2.5 4.5-5"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
  chevron:'<path d="m9 5 7 7-7 7"/>',
  down:'<path d="m6 9 6 6 6-6"/>',
  back:'<path d="M20 12H4m6-6-6 6 6 6"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
  star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z"/>',
  key:'<circle cx="8" cy="9" r="5"/><path d="m11.5 12.5 8.5 8.5M16 17l3-3M18 19l3-3"/>',
  note:'<path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h4"/>',
  api:'<path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
  eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff:'<path d="m3 3 18 18M10 5.3A11 11 0 0 1 12 5c6 0 10 7 10 7a22 22 0 0 1-3 3.8M6.5 6.5C3.6 8.6 2 12 2 12s4 7 10 7a12 12 0 0 0 5-1.2M10 10a3 3 0 0 0 4 4"/>',
  copy:'<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M15 8V3H3v13h5"/>',
  check:'<path d="m5 12 4.5 4.5L20 6"/>',
  sync:'<path d="M4 9a8 8 0 0 1 14-4l2 3M20 3v5h-5M20 15a8 8 0 0 1-14 4l-2-3M4 21v-5h5"/>',
  phone:'<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 5h4M10 19h4"/>',
  laptop:'<rect x="4" y="4" width="16" height="12" rx="2"/><path d="m4 16-2 4h20l-2-4"/>',
  wifi:'<path d="M2 8a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8 16a5 5 0 0 1 8 0M12 20h.01"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  globe:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  sort:'<path d="M7 4v16m-3-3 3 3 3-3M15 4h6M15 9h4M15 14h2"/>',
  edit:'<path d="m15 4 5 5M4 20l5-1L21 7a2.1 2.1 0 0 0-4-4L5 15l-1 5Z"/>',
  trash:'<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/>',
  pause:'<circle cx="12" cy="12" r="9"/><path d="M9 8v8M15 8v8"/>',
  print:'<path d="M7 8V3h10v5M7 17H3V8h18v9h-4"/><rect x="7" y="13" width="10" height="8"/><path d="M17 11h.01"/>',
  heart:'<path d="M12 21 3.5 12.5a5.3 5.3 0 0 1 7.5-7.5l1 1 1-1a5.3 5.3 0 0 1 7.5 7.5Z"/>'
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.key}</svg>`;
const brandMark = '<span class="brand-mark"><img src="assets/verma-logo.png" alt=""></span>';
function brand(e) {
  const b = e.brand || 'generic';
  let mark;
  if (b === 'google') mark = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.5a4.7 4.7 0 0 1-2.1 3.1v2.6h3.3c1.9-1.8 3.1-4.4 3.1-7.6Z"/><path fill="#34A853" d="M12 22c2.7 0 5-1 6.7-2.5l-3.3-2.6a6 6 0 0 1-9-3.1H3v2.7A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.8a6 6 0 0 1 0-3.6V7.5H3a10 10 0 0 0 0 9Z"/><path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.9 1.5l2.9-2.9A10 10 0 0 0 3 7.5l3.4 2.7A6 6 0 0 1 12 6Z"/></svg>';
  else if (b === 'github') mark = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.9c-2.8.6-3.4-1.2-3.4-1.2-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.3-1.1.6-1.4-2.2-.3-4.5-1.1-4.5-4.9 0-1.1.4-2 1-2.7-.1-.3-.5-1.3.1-2.7 0 0 .8-.3 2.7 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .6 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.8-2.3 4.6-4.5 4.9.4.3.7 1 .7 1.9v2.9c0 .3.2.6.7.5A10 10 0 0 0 12 2Z"/></svg>';
  else if (b === 'netflix') mark = 'N';
  else if (b === 'ocean') mark = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 3a8 8 0 1 1 0 16v-4a4 4 0 1 0-4-4H3a8 8 0 0 1 8-8Z" fill="currentColor"/><path d="M6 15h5v5H6zM2 19h4v4H2zM1 15h3v3H1z" fill="currentColor"/></svg>';
  else if (b === 'spotify') mark = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><g fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"><path d="M6 9c5-2 9-1 12 1M7 12c4-1.5 7-1 10 1M8 15c3-1 5-.5 8 1"/></g></svg>';
  else if (b === 'figma') mark = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3H8a4 4 0 0 0 0 8h4" fill="#f24e1e"/><path d="M12 3h4a4 4 0 0 1 0 8h-4" fill="#ff7262"/><path d="M12 11H8a4 4 0 0 0 0 8h4" fill="#a259ff"/><circle cx="16" cy="15" r="4" fill="#1abcfe"/><path d="M12 19H8a4 4 0 1 0 4 4Z" fill="#0acf83"/></svg>';
  else if (b === 'wifi') mark = icon('wifi');
  else if (b === 'notion') mark = 'N';
  else if (b === 'slack') mark = '#';
  else if (b === 'linear') mark = '◒';
  else mark = icon(e.type === 'note' ? 'note' : e.type === 'api' ? 'api' : 'key');
  return `<span class="brand-icon ${b}" aria-hidden="true">${mark}</span>`;
}

const $ = s => document.querySelector(s);
const content = $('#content');
const state = { tab: 'vault', screen: 'welcome', query: '', filter: 'all', sorted: false, assistant: true, locked: false, passphrase: 'verma-demo', askQuery: '', importStep: 0, importRows: [], duplicate: '', importedIds: [], source: 'browser', intro: 0, setup: 1, paused: false, devices: [] };
let entries = structuredClone(seedEntries);
let nextId = 100;
let sheetTrigger;
let toastTimer;
const tabs = [['vault', 'My vault', 'vault'], ['ask', 'Ask Verma', 'spark'], ['import', 'Import', 'import'], ['devices', 'Devices', 'devices']];
const heroArt = `<svg class="vault-art" viewBox="0 0 145 155" aria-hidden="true"><ellipse class="orbit" cx="83" cy="76" rx="53" ry="62" transform="rotate(25 83 76)"/><circle cx="93" cy="68" r="40" fill="#ffad60"/><g transform="rotate(21 85 79)"><path class="key-shadow" d="M91 35a22 22 0 0 0-13 40v45l11 8 11-8v-10h-9v-9h9V75a22 22 0 0 0-9-40Z"/><path d="M84 30a22 22 0 0 0-11 41v45l11 8 11-8v-10h-9v-9h9V71a22 22 0 0 0-11-41Z" fill="#fff7e9" stroke="#292621" stroke-width="1.5"/><circle cx="84" cy="51" r="8" fill="#fe820e" stroke="#292621" stroke-width="1.5"/><path d="M79 79v29" stroke="#c6a47f" stroke-width="1.5" stroke-linecap="round"/></g><path class="spark" d="m32 40 2 7 7 2-7 2-2 7-2-7-7-2 7-2zM118 113l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/><circle cx="122" cy="29" r="2" fill="#fff7e9"/><circle cx="41" cy="112" r="2.5" fill="#fff7e9"/></svg>`;

function toast(message) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3300);
}
function navTo(tab) {
  closeSheet(false); state.tab = tab; state.screen = 'main'; render(true);
}
function render(focus = false) {
  renderChrome();
  if (state.locked) renderLocked();
  else if (state.screen === 'welcome') renderWelcome();
  else if (state.screen === 'setup') renderSetup();
  else ({ vault: renderVault, ask: renderAsk, import: renderImport, devices: renderDevices })[state.tab]();
  content.scrollTop = 0;
  if (focus) content.querySelector('h1')?.focus({ preventScroll: true });
}
function renderChrome() {
  const onboarding = state.screen !== 'main' && !state.locked;
  document.querySelector('meta[name="theme-color"]').content = state.screen === 'welcome' && !state.locked ? ['#FFFCF8', '#607FF3', '#FE820E'][state.intro] : '#FE820E';
  $('#app-header').hidden = onboarding;
  $('#bottom-nav').hidden = onboarding || state.locked;
  $('#app-header').innerHTML = `<button class="app-brand" aria-label="Verma profile and settings" data-action="profile">${brandMark}<span class="wordmark">Verma<span class="brand-period">.</span></span></button><button class="device-status" data-action="privacy" aria-label="Privacy and assistant settings">${icon(state.locked ? 'lock' : 'shield')}${state.locked ? 'Vault locked' : 'On your device'}</button><button class="icon-button" data-action="lock" aria-label="${state.locked ? 'Unlock demo vault' : 'Lock vault'}">${icon('lock')}</button>`;
  const nav = tabs.map(([tab, label, name]) => `<button class="nav-button" data-tab="${tab}" ${tab === state.tab ? 'aria-current="page"' : ''}><span class="nav-icon">${icon(name)}</span><span>${label}</span></button>`);
  nav.splice(2, 0, `<button class="nav-button add" data-action="add" aria-label="Add new item"><span class="nav-icon">${icon('plus')}</span><span>New item</span></button>`);
  $('#bottom-nav').innerHTML = nav.join('');
  $('.preview-nav').innerHTML = tabs.map(([tab, label], i) => `<button data-tab="${tab}" ${tab === state.tab && state.screen === 'main' ? 'aria-current="page"' : ''}><span>0${i + 1}</span>${label}${icon('arrow')}</button>`).join('');
}
function row(e, subtitle = e.subtitle) {
  return `<button class="entry-row" data-open="${e.id}" aria-label="Open ${esc(e.title)}, ${esc(e.subtitle)}">${brand(e)}<span class="grow"><strong>${esc(e.title)}</strong><small>${esc(subtitle)}</small></span>${e.tags[0] ? `<span class="tag">${esc(e.tags[0])}</span>` : ''}${icon('chevron')}</button>`;
}
function renderVault() {
  const favorites = entries.filter(e => e.favorite).slice(0, 3);
  content.innerHTML = `<section><div class="vault-hero"><p class="eyebrow">YOUR PERSONAL SPACE</p><h1 tabindex="-1">A little less worry.<br>A lot more living.</h1><p class="hero-meta">${icon('shield')}${entries.length} little things. Safely tucked away.</p>${heroArt}</div>
    <div class="search-field">${icon('search')}<input id="vault-search" type="search" aria-label="Search your vault" placeholder="Find something in your vault..." value="${esc(state.query)}" autocomplete="off" autocapitalize="none" enterkeyhint="search"><span class="shortcut" aria-hidden="true">⌕</span></div>
    <button class="ask-banner" data-tab="ask">${icon('spark')}<span class="grow"><strong>It’s on the tip of your tongue.</strong><p>Describe it. Let Verma find it.</p></span><span class="circle-arrow">${icon('arrow')}</span></button>
    <div id="favorites-section" ${state.query || state.filter !== 'all' ? 'hidden' : ''}><div class="section-label"><h2>Your go-tos ${icon('star','sr-only')}</h2><button class="small-action" id="all-favorites">All favorites ${icon('chevron')}</button></div><div class="favorite-grid">${favorites.length ? favorites.map(e => `<button class="favorite-card" data-open="${e.id}" aria-label="Open favorite ${esc(e.title)}, ${esc(e.subtitle)}">${brand(e)}${icon('star','star-mini')}<strong>${esc(e.title)}</strong><small>${esc(e.id === 1 ? 'Work account' : e.type === 'login' ? e.user.includes('family') ? 'Family account' : 'Personal space' : typeLabels[e.type])}</small></button>`).join('') : '<p class="small muted">Star an item to keep it close.</p>'}</div></div>
    <div class="section-label"><h2 id="list-heading">All your things <span>${entries.length}</span></h2><button class="small-action" id="sort-items" aria-label="${state.sorted ? 'Sort by recent' : 'Sort alphabetically'}">${icon('sort')} ${state.sorted ? 'A–Z' : 'Recent'}</button></div>
    <div class="filters" role="group" aria-label="Filter vault items">${[['all','Everything',''],['login','Logins','key'],['note','Notes','note'],['api','API keys','api']].map(([key,label,name]) => `<button class="filter" data-filter="${key}" aria-pressed="${state.filter === key}">${name ? icon(name) : ''}${label}</button>`).join('')}${state.filter === 'favorite' ? '<button class="filter" data-filter="favorite" aria-pressed="true">Favorites</button>' : ''}</div>
    <div id="vault-list"></div><p class="vault-footer">${icon('heart')}A space that’s just yours.</p></section>`;
  $('#vault-search').addEventListener('input', e => { state.query = e.target.value; drawVaultList(); });
  $('#all-favorites').onclick = () => { state.filter = 'favorite'; renderVault(); $('#list-heading').scrollIntoView({ block: 'nearest' }); };
  $('#sort-items').onclick = () => { state.sorted = !state.sorted; renderVault(); };
  content.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => { state.filter = b.dataset.filter; renderVault(); });
  drawVaultList();
}
function drawVaultList() {
  let list = filterEntries(entries, state.query, state.filter);
  if (state.sorted) list.sort((a,b) => a.title.localeCompare(b.title));
  $('#favorites-section').hidden = !!state.query || state.filter !== 'all';
  $('#list-heading').innerHTML = `${state.query ? 'Search results' : state.filter === 'favorite' ? 'Your favorites' : 'All your things'} <span>${list.length}</span>`;
  $('#vault-list').innerHTML = list.length ? `<div class="item-list">${list.map(e => row(e)).join('')}</div>` : `<div class="empty">${icon('search')}<strong>Nothing here just yet.</strong><p>${state.query ? 'Try another name, website, or tag.' : 'Add an item to give it a home here.'}</p><button class="text-button" data-action="${state.query ? 'reset-search' : 'add'}">${state.query ? 'Clear search & filters' : 'Add your first item'}</button></div>`;
}

function openSheet(title, body, bind, description = '') {
  if ($('#sheet').hidden) sheetTrigger = document.activeElement;
  $('#sheet').innerHTML = `<div class="sheet-handle" aria-hidden="true"></div><div class="sheet-head"><div class="grow"><h2 id="sheet-title" tabindex="-1">${esc(title)}</h2>${description ? `<p>${esc(description)}</p>` : ''}</div><button class="icon-button" data-action="close" aria-label="Close dialog">${icon('close')}</button></div>${body}`;
  $('#sheet-overlay').hidden = false; $('#sheet').hidden = false;
  [content, $('#app-header'), $('#bottom-nav'), $('.intro-panel')].forEach(el => el.inert = true);
  $('#sheet-title').focus({ preventScroll: true });
  $('#sheet').scrollTop = 0;
  bind?.();
  const handle = $('.sheet-handle');
  let start;
  handle.onpointerdown = e => { if (e.isPrimary) { start = e.clientY; handle.setPointerCapture(e.pointerId); } };
  handle.onpointerup = e => { if (start !== undefined && e.clientY - start > 65) closeSheet(); start = undefined; };
  handle.onpointercancel = () => { start = undefined; };
}
function closeSheet(restore = true) {
  if ($('#sheet').hidden) return;
  $('#sheet').hidden = true; $('#sheet-overlay').hidden = true;
  $('#sheet').innerHTML = '';
  [content, $('#app-header'), $('#bottom-nav'), $('.intro-panel')].forEach(el => el.inert = false);
  if (restore) (sheetTrigger?.isConnected ? sheetTrigger : content).focus({ preventScroll: true });
}
$('#sheet-overlay').onclick = () => closeSheet();
document.addEventListener('keydown', e => {
  if (!$('#sheet').hidden) {
    if (e.key === 'Escape') { e.preventDefault(); closeSheet(); }
    if (e.key === 'Tab') {
      const focusable = [...$('#sheet').querySelectorAll('button:not([disabled]), input:not([disabled]), select, textarea, a[href]')].filter(el => !el.hidden);
      const first = focusable[0], last = focusable.at(-1);
      if (e.shiftKey && (document.activeElement === first || document.activeElement === $('#sheet-title'))) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }
  } else if ((e.ctrlKey || e.metaKey) && e.key === 'k' && !state.locked) {
    e.preventDefault(); state.query = ''; navTo('vault'); $('#vault-search').focus();
  }
});

async function copyText(text, label) {
  try { await navigator.clipboard.writeText(text); toast(`${label} copied`); }
  catch { toast('Clipboard unavailable. Select and copy the text.'); }
}
function entrySheet(id) {
  if (state.locked) return;
  const e = entries.find(item => item.id === id);
  if (!e) return;
  const secretLabel = e.type === 'note' ? 'Note contents' : e.type === 'api' ? 'API key' : 'Password';
  openSheet(e.title, `<div class="detail-brand">${brand(e)}<button class="icon-button ${e.favorite ? 'is-favorite' : ''}" id="favorite-item" aria-label="${e.favorite ? 'Remove from' : 'Add to'} favorites" aria-pressed="${e.favorite}">${icon('star')}</button></div>
    <span class="pill blue">${typeLabels[e.type]}</span><div class="tag-list">${e.tags.map(tag => `<span class="pill">${esc(tag)}</span>`).join('')}</div>
    <div class="detail-field"><div class="field-label">${e.type === 'login' ? 'Username / email' : 'Name'}</div><div class="row"><div class="detail-value grow">${esc(e.user || 'Not added')}</div><button class="icon-button" id="copy-user" aria-label="Copy username">${icon('copy')}</button></div></div>
    <div class="detail-field"><div class="field-label">${secretLabel}</div><div class="row"><code class="detail-value grow" id="secret-value" aria-label="Secret hidden">••••••••••••••</code><button class="icon-button" id="reveal-secret" aria-label="Show ${secretLabel.toLowerCase()}" aria-pressed="false">${icon('eye')}</button><button class="icon-button" id="copy-secret" aria-label="Copy ${secretLabel.toLowerCase()}">${icon('copy')}</button></div></div>
    <div class="detail-field"><div class="field-label">Website</div><div class="detail-value">${esc(e.domain || 'Not added')}</div></div>
    <div class="detail-bottom"><span class="small muted">Updated ${esc(e.updated)}</span><span class="pill">Sample item</span></div><div class="sheet-actions"><button class="button primary" id="edit-item">${icon('edit')}Edit item</button><button class="button ghost" data-action="close">Done for now</button></div>`, () => {
      let revealed = false;
      $('#reveal-secret').onclick = () => {
        revealed = !revealed;
        $('#secret-value').textContent = revealed ? e.secret || 'No value saved' : '••••••••••••••';
        $('#secret-value').setAttribute('aria-label', revealed ? secretLabel : 'Secret hidden');
        $('#reveal-secret').innerHTML = icon(revealed ? 'eyeoff' : 'eye');
        $('#reveal-secret').setAttribute('aria-label', `${revealed ? 'Hide' : 'Show'} ${secretLabel.toLowerCase()}`);
        $('#reveal-secret').setAttribute('aria-pressed', String(revealed));
      };
      $('#copy-user').onclick = () => copyText(e.user, 'Username');
      $('#copy-secret').onclick = () => copyText(e.secret, secretLabel);
      $('#favorite-item').onclick = () => { e.favorite = !e.favorite; render(); entrySheet(id); toast(e.favorite ? 'Added to your go-tos' : 'Removed from favorites'); $('#favorite-item').focus(); };
      $('#edit-item').onclick = () => editSheet(e);
    }, e.subtitle);
}
function editSheet(item = null) {
  if (state.locked) return;
  const e = item || { type: 'login', title: '', subtitle: '', domain: '', user: '', secret: '', tags: [] };
  openSheet(item ? 'Make it your own.' : 'A new little thing.', `<form id="item-form" class="stack"><div class="input-group"><label for="item-type">Item type</label><select class="input" id="item-type">${Object.entries(typeLabels).map(([type, label]) => `<option value="${type}" ${e.type === type ? 'selected' : ''}>${label}</option>`).join('')}</select></div>
    <div class="input-group"><label for="item-title">Name <span class="muted">(required)</span></label><input class="input" id="item-title" required maxlength="120" placeholder="e.g. Your favorite streaming app" value="${esc(e.title)}"></div>
    <div class="form-grid"><div class="input-group full"><label for="item-user">Username / email / label</label><input class="input" id="item-user" value="${esc(e.user)}" autocapitalize="none" autocomplete="off" maxlength="254" placeholder="you@example.com"></div><div class="input-group full"><label for="item-domain">Website</label><input class="input" id="item-domain" value="${esc(e.domain)}" autocapitalize="none" inputmode="url" autocomplete="off" maxlength="300" placeholder="example.com"></div></div>
    <div class="input-group"><label id="secret-label" for="item-secret">${e.type === 'note' ? 'Note contents' : e.type === 'api' ? 'API key' : 'Password'}</label><div class="input-action" id="secret-editor"></div><button class="text-button" id="generate" type="button">${icon('spark')} Generate a password</button></div>
    <div class="input-group"><label for="item-tag">Tag <span class="muted">(optional)</span></label><input class="input" id="item-tag" value="${esc(e.tags.join(', '))}" maxlength="180" placeholder="Personal, Work, or something you like"></div>
    <p class="field-hint">This is a design demo. Use sample details; items stay in memory until you refresh.</p><p class="error-text" id="item-error" role="alert"></p><button class="button primary" type="submit">${icon('check')}${item ? 'Save changes' : 'Add to my vault'}</button>${item ? '<button class="button ghost" id="delete-item" type="button">Delete this item</button>' : '<button class="button ghost" type="button" data-action="close">Maybe later</button>'}</form>`, () => {
      $('#generate').style.display = 'flex'; $('#generate').style.gap = '7px'; $('#generate').style.alignItems = 'center'; $('#generate').style.justifyContent = 'flex-start';
      const syncType = () => {
        const type = $('#item-type').value;
        const value = $('#item-secret')?.value ?? e.secret;
        $('#secret-label').textContent = type === 'note' ? 'Note contents' : type === 'api' ? 'API key' : 'Password';
        $('#generate').hidden = type !== 'login';
        $('#secret-editor').innerHTML = type === 'note' ? `<textarea class="input" id="item-secret" placeholder="A sample note, just for you">${esc(value)}</textarea>` : `<input class="input" id="item-secret" type="password" autocomplete="new-password" value="${esc(value)}" placeholder="Use a sample value"><button type="button" id="toggle-input" aria-label="Show entered secret">${icon('eye')}</button>`;
        if ($('#toggle-input')) $('#toggle-input').onclick = () => { const show = $('#item-secret').type === 'password'; $('#item-secret').type = show ? 'text' : 'password'; $('#toggle-input').innerHTML = icon(show ? 'eyeoff' : 'eye'); $('#toggle-input').setAttribute('aria-label', show ? 'Hide entered secret' : 'Show entered secret'); };
      };
      $('#item-type').onchange = syncType; syncType();
      $('#generate').onclick = () => { $('#item-secret').value = generatePassword(); toast('A fresh password, generated on this device'); };
      $('#item-form').onsubmit = event => {
        event.preventDefault();
        const title = $('#item-title').value.trim();
        if (!title) { $('#item-error').textContent = 'Give this item a name first.'; $('#item-title').focus(); return; }
        const updated = { id: item?.id || nextId++, type: $('#item-type').value, title, user: $('#item-user').value.trim(), domain: $('#item-domain').value.trim(), secret: $('#item-secret').value, tags: $('#item-tag').value.split(',').map(tag => tag.trim()).filter(Boolean), subtitle: item?.subtitle || 'Your new item', favorite: item?.favorite || false, brand: item?.brand || 'generic', updated: 'Just now' };
        if (item) entries[entries.findIndex(entry => entry.id === item.id)] = updated; else entries.unshift(updated);
        state.query = ''; state.filter = 'all'; closeSheet(false); navTo('vault'); toast(item ? 'Changes tucked away' : 'A new little thing, saved');
      };
      if (item) $('#delete-item').onclick = () => openSheet('Let this one go?', `<p class="small muted">${esc(item.title)} will be removed from this demo vault. You can add it again.</p><div class="sheet-actions"><button class="button primary" id="confirm-delete">Delete item</button><button class="button ghost" id="keep-item">Keep it</button></div>`, () => { $('#keep-item').onclick = () => entrySheet(item.id); $('#confirm-delete').onclick = () => { entries = entries.filter(entry => entry.id !== item.id); closeSheet(false); render(); toast('Item removed'); }; });
    });
}

function privacySheet() {
  if (state.locked) { toast('Unlock your vault to see settings'); return; }
  openSheet('Your space. Your rules.', `<div class="notice">${icon('shield')}<div><strong>Good boundaries feel good.</strong><p>Verma’s assistant only searches item names, websites, and tags. Your secret fields stay out of the conversation.</p></div></div><div class="card mt"><div class="field-label">CAN LOOK AT</div><div class="tag-list">${['Names','Websites','Tags'].map(t => `<span class="pill blue">${t}</span>`).join('')}</div><div class="field-label mt">ALWAYS PRIVATE</div><p>Passwords · API keys · Note contents · Recovery words</p></div><div class="card mt"><label class="toggle"><span class="grow"><strong>Local assistant</strong><small>Switch off whenever you like.</small></span><input type="checkbox" id="assistant-toggle" ${state.assistant ? 'checked' : ''}><span class="toggle-track" aria-hidden="true"></span></label></div><p class="small muted mt">In this prototype, the assistant uses a local metadata matcher. Import and ordinary search work with it switched off.</p><div class="sheet-actions"><button class="button primary" data-action="close">Sounds good</button></div>`, () => {
    $('#assistant-toggle').onchange = e => { state.assistant = e.target.checked; if (state.tab === 'ask') renderAsk(); toast(state.assistant ? 'Local assistant is on' : 'Assistant off. Your vault is still here.'); };
  });
}
function profileSheet() {
  if (state.locked) return;
  openSheet('Hey, Sam.', `<div class="row"><div class="menu-avatar">S</div><div><strong>Your personal space</strong><p class="small muted">A little peace of mind.</p></div></div><div class="mt"><button class="setting-row" data-action="privacy">${icon('shield')}<span class="grow">Privacy & assistant</span>${icon('chevron')}</button><button class="setting-row" data-action="welcome">${icon('heart')}<span class="grow">Meet Verma again</span>${icon('chevron')}</button><button class="setting-row" data-action="lock">${icon('lock')}<span class="grow">Lock my vault</span>${icon('chevron')}</button></div><div class="notice neutral mt">${icon('info')}<div><strong>You’re exploring a design concept.</strong><p>Items exist only for this session. Encryption, biometric unlock, recovery, and device sync are not implemented. Use sample data.</p></div></div><div class="sheet-actions"><button class="button primary" data-action="close">Back to my space</button></div>`);
}

function renderAsk() {
  content.innerHTML = `<section class="ask-page"><div class="ask-art"><span class="sparklet" aria-hidden="true">✧</span><div class="assistant-orb">${icon('spark')}</div><span class="sparklet" aria-hidden="true">✳</span></div><div class="page-head"><div class="eyebrow">A LITTLE HELP, RIGHT HERE</div><h1 tabindex="-1">You know the one.<br>Let’s find it.</h1><p>A name, a memory, a few words.<br>Tell Verma what you’re looking for.</p></div>
    ${state.assistant ? `<form class="ask-form" id="ask-form"><label class="sr-only" for="ask-query">Describe the item you are looking for</label><textarea id="ask-query" placeholder="That Google account I use for work..." maxlength="300" enterkeyhint="search">${esc(state.askQuery)}</textarea><div class="ask-form-bottom"><span class="row" style="gap:5px">${icon('shield')}Just on this device</span><button class="button secondary" type="submit">Find it ${icon('arrow')}</button></div></form><div id="ask-results" class="ask-results" aria-live="polite"></div><div id="prompt-block"><div class="section-label"><h2>A little inspiration</h2></div><div class="prompt-list">${['My work Google account','That cloud token for my side project','Our family streaming account'].map(q => `<button data-prompt="${esc(q)}">${esc(q)}${icon('arrow')}</button>`).join('')}</div></div>` : `<div class="notice warm">${icon('pause')}<div><strong>Your assistant is taking a break.</strong><p>Your items are still here. Search your vault, or switch the assistant back on.</p></div></div><div class="stack mt"><button class="button primary" data-tab="vault">Search my vault</button><button class="button" data-action="privacy">Assistant settings</button></div>`}
    <div class="privacy-footnote"><button data-action="privacy">${icon('lock')}Your secrets are never part of the search.</button></div></section>`;
  if (state.assistant) {
    $('#ask-query').oninput = e => { state.askQuery = e.target.value; };
    $('#ask-form').onsubmit = e => { e.preventDefault(); runAsk($('#ask-query').value); };
    content.querySelectorAll('[data-prompt]').forEach(b => b.onclick = () => { $('#ask-query').value = b.dataset.prompt; runAsk(b.dataset.prompt); });
    if (state.askQuery) showAskResults();
  }
}
function runAsk(query) {
  if (!query.trim()) { $('#ask-query').focus(); toast('A few words will do. What are you looking for?'); return; }
  state.askQuery = query.trim(); showAskResults(); $('#ask-query').blur();
}
function showAskResults() {
  if (state.locked || !state.assistant || !$('#ask-results')) return;
  const results = findMetadata(entries, state.askQuery);
  $('#prompt-block').hidden = true;
  $('#ask-results').innerHTML = `<div class="section-label"><h2>${results.length ? `This might be your ${results.length === 1 ? 'one' : 'match'}.` : 'Not quite ringing a bell.'}</h2><button class="small-action" id="reset-ask">Start over</button></div>${results.length ? results.map(({entry,matched},i) => `<div class="result-card">${row(entry)}<p class="match-explanation">${i === 0 ? 'Best match' : 'Also found'} · ${esc(matched.join(', '))}</p></div>`).join('') : '<div class="empty"><strong>Try a different little clue.</strong><p>A website, a tag, or part of its name usually helps.</p><button class="text-button" data-tab="vault">Look through my vault</button></div>'}`;
  $('#reset-ask').onclick = () => { state.askQuery = ''; renderAsk(); $('#ask-query').focus(); };
}

function steps(step) { return `<div class="steps" aria-label="Step ${step} of 3">${[1,2,3].map(i => `<span class="${i <= step ? 'active' : ''}"></span>`).join('')}</div>`; }
function renderImport() {
  if (state.importStep === 1) return renderReview();
  if (state.importStep === 2) return renderImportComplete();
  content.innerHTML = `<section>${steps(1)}<div class="page-head"><div class="eyebrow">MAKE YOURSELF AT HOME</div><h1 tabindex="-1">Bring your little<br>universe with you.</h1><p>Moving in should feel easy. Let’s give your passwords a new place to call home.</p></div><div class="import-illustration" aria-hidden="true"><div class="mini-file">${icon('note')}<span>.CSV</span></div>${icon('arrow')}<div class="mini-file">${icon('vault')}</div></div><div class="field-label">Where are you moving from?</div><div class="source-options"><button class="source-option" data-source="browser" aria-pressed="${state.source === 'browser'}">${icon('globe')}<span>My browser<small>Chrome, Safari…</small></span></button><button class="source-option" data-source="manager" aria-pressed="${state.source === 'manager'}">${icon('key')}<span>Another app<small>Password manager</small></span></button></div><div class="notice mt">${icon('shield')}<div><strong>You get the final say.</strong><p>Review your items and suggested tags before anything is added to your vault.</p></div></div><button class="button primary mt" id="load-import">Try a sample import ${icon('arrow')}</button><p class="field-hint center mt-sm">8 sample rows · no personal file needed</p><details class="how-to"><summary>How will importing work?${icon('down')}</summary><p>Export a CSV from your browser or password manager, choose the file, and review it here. This prototype uses sample data so you can explore the flow without sharing real passwords.</p></details></section>`;
  content.querySelectorAll('[data-source]').forEach(b => b.onclick = () => { state.source = b.dataset.source; renderImport(); });
  $('#load-import').onclick = () => { state.importRows = sampleImport.map(r => ({ ...r, accepted: state.assistant })); state.duplicate = ''; state.importStep = 1; render(true); };
}
function renderReview() {
  const rows = state.importRows;
  const count = rows.filter(r => !r.duplicate || state.duplicate !== 'skip').length;
  content.innerHTML = `<section>${steps(2)}<div class="page-head"><div class="eyebrow">A QUICK LOOK TOGETHER</div><h1 tabindex="-1">Everything in its place?</h1><p>A little tidying before we move in. You decide what stays and how it’s labeled.</p></div><div class="review-summary"><div><strong>7</strong><small>Items found</small></div><div><strong>1</strong><small>Possible duplicate</small></div><div><strong>1</strong><small>Unreadable row</small></div></div><div class="notice warm">${icon('info')}<div><strong>Row 8 needs a little attention.</strong><p>It has no name or website, so it won’t be imported.</p></div></div><div class="section-label"><h2>Your items & tags</h2><button class="small-action" id="toggle-all-tags">${rows.every(r => r.accepted) ? 'Skip all tags' : 'Accept all tags'}</button></div><p class="field-hint" style="margin-bottom:12px">Edit a tag or tap its checkmark. Unchecked tags won’t be saved.</p><div class="stack">${rows.map((r,i) => `<div class="review-row"><div class="row">${brand(r)}<div class="grow"><strong>${esc(r.title)}</strong><small>${esc(r.subtitle)}</small></div>${r.duplicate ? '<span class="pill">Duplicate?</span>' : ''}</div><div class="review-tag"><label for="tag-${i}">TAG</label><input id="tag-${i}" data-tag="${i}" value="${esc(r.tag)}" maxlength="60" aria-label="Tag for ${esc(r.title)}"><button data-accept="${i}" aria-label="Include tag for ${esc(r.title)}" aria-pressed="${r.accepted}">${icon(r.accepted ? 'check' : 'plus')}</button></div></div>`).join('')}</div><div class="notice warm mt"><div class="grow"><strong>A familiar face: Google work.</strong><p>A login with this website and username is already in your vault. Keep the imported copy too?</p><div class="choice-row"><button data-duplicate="keep" aria-pressed="${state.duplicate === 'keep'}">Keep both</button><button data-duplicate="skip" aria-pressed="${state.duplicate === 'skip'}">Skip this copy</button></div></div></div><div class="sticky-action"><button class="button primary" id="save-import" ${!state.duplicate ? 'disabled' : ''}>Add ${count} items to my vault ${icon('arrow')}</button><p>${state.duplicate ? 'Only checked tags come along. Nothing saved yet.' : 'Choose what to do with the duplicate first.'}</p><button class="button ghost" id="discard-import">Cancel import</button></div></section>`;
  content.querySelectorAll('[data-tag]').forEach(input => input.oninput = e => { rows[Number(input.dataset.tag)].tag = e.target.value; });
  content.querySelectorAll('[data-accept]').forEach(button => button.onclick = () => { const r = rows[Number(button.dataset.accept)]; r.accepted = !r.accepted; button.setAttribute('aria-pressed', String(r.accepted)); button.innerHTML = icon(r.accepted ? 'check' : 'plus'); $('#toggle-all-tags').textContent = rows.every(row => row.accepted) ? 'Skip all tags' : 'Accept all tags'; });
  $('#toggle-all-tags').onclick = () => { const accept = !rows.every(row => row.accepted); rows.forEach(r => r.accepted = accept); const top = content.scrollTop; renderReview(); content.scrollTop = top; $('#toggle-all-tags').focus({ preventScroll: true }); };
  content.querySelectorAll('[data-duplicate]').forEach(button => button.onclick = () => { state.duplicate = button.dataset.duplicate; const top = content.scrollTop; renderReview(); content.scrollTop = top; content.querySelector(`[data-duplicate="${state.duplicate}"]`).focus({ preventScroll: true }); });
  $('#save-import').onclick = confirmImport;
  $('#discard-import').onclick = () => openSheet('Leave this move for later?', '<p class="small muted">Your review choices will be cleared. No items have been added.</p><div class="sheet-actions"><button class="button primary" id="confirm-discard">Discard import</button><button class="button ghost" data-action="close">Keep reviewing</button></div>', () => { $('#confirm-discard').onclick = () => { state.importStep = 0; state.importRows = []; closeSheet(false); render(true); }; });
}
function confirmImport() {
  const prepared = prepareImport(state.importRows, state.duplicate, nextId);
  openSheet('Ready to settle in?', `<div class="notice">${icon('vault')}<div><strong>${prepared.length} items, a new home.</strong><p>${prepared.filter(r => r.tags.length).length} items include your accepted tags. The unreadable row is left out.</p></div></div><p class="small muted mt">You can undo this import during this session.</p><div class="sheet-actions"><button class="button primary" id="confirm-import">Add ${prepared.length} items</button><button class="button ghost" data-action="close">One more look</button></div>`, () => {
    $('#confirm-import').onclick = () => { entries.unshift(...prepared); state.importedIds = prepared.map(r => r.id); nextId += prepared.length; state.importStep = 2; closeSheet(false); render(true); };
  });
}
function renderImportComplete() {
  content.innerHTML = `<section>${steps(3)}<div class="completion"><div class="success-emblem">${icon('check')}</div><div class="eyebrow">ALL SETTLED IN</div><h1 tabindex="-1" class="mt">${state.importedIds.length} little things.<br>One happy home.</h1><p>Your items are in your vault, with the tags you chose. One unreadable row was left behind.</p><button class="button primary" id="see-imported">Take me to my vault ${icon('arrow')}</button><button class="text-button" id="import-again">Bring in more items</button><div class="divider"></div><button class="text-button" id="undo-import">Undo this import</button></div></section>`;
  $('#see-imported').onclick = () => { state.filter = 'all'; state.query = ''; navTo('vault'); };
  $('#import-again').onclick = () => { state.importStep = 0; render(true); };
  $('#undo-import').onclick = () => { entries = entries.filter(e => !state.importedIds.includes(e.id)); state.importedIds = []; state.importStep = 0; render(true); toast('Import undone. Your other items are right here.'); };
}

function renderDevices() {
  content.innerHTML = `<section><div class="page-head"><div class="eyebrow">YOUR WORLD, CONNECTED</div><h1 tabindex="-1">Close, even when<br>you’re somewhere else.</h1><p>One personal space, across your devices.<br>Always a little piece of home.</p></div><div class="connected-art" aria-hidden="true"><div class="device-illustration">${icon('shield')}</div>${icon(state.paused ? 'pause' : 'sync')}<div class="device-illustration laptop">${icon('shield')}</div></div><div class="section-label"><h2>Your trusted circle <span>${2 + state.devices.length}</span></h2><span class="pill blue">Demo</span></div><div class="device-card"><div class="row"><span class="device-icon">${icon('phone')}</span><div class="grow"><h3>This phone</h3><small>Right here with you</small></div><span class="pill">This device</span></div></div><div class="device-card"><div class="row"><span class="device-icon">${icon('laptop')}</span><div class="grow"><h3>Studio desktop</h3><small>${state.paused ? 'Taking a little break' : 'Everything is up to date'}</small></div>${icon(state.paused ? 'pause' : 'check')}</div><div class="device-footer"><span>${state.paused ? 'Sync paused' : 'Last synced just now'}</span><button id="toggle-sync">${state.paused ? 'Resume demo sync' : 'Pause demo sync'}</button></div></div>${state.devices.map(name => `<div class="device-card"><div class="row"><span class="device-icon">${icon('laptop')}</span><div class="grow"><h3>${esc(name)}</h3><small>Added in this demo session</small></div><span class="pill blue">Paired</span></div></div>`).join('')}${state.paused ? `<div class="notice warm mt">${icon('pause')}<div><strong>Your phone is still good to go.</strong><p>Everything here stays available while the desktop is away.</p></div></div>` : ''}<button class="button primary mt" id="pair-device">${icon('plus')}Welcome another device</button><div class="notice neutral mt">${icon('info')}<div><strong>A preview of a closer connection.</strong><p>Pairing and sync are simulated in this concept. No data is sent to another device.</p></div></div></section>`;
  $('#toggle-sync').onclick = () => { state.paused = !state.paused; renderDevices(); toast(state.paused ? 'Demo sync paused' : 'Demo devices are up to date'); $('#toggle-sync').focus(); };
  $('#pair-device').onclick = pairSheet;
}
function pairSheet() {
  openSheet('A new member of your circle.', `<p class="small muted">In the full app, you’ll check that both devices show the same number and words.</p><div class="card center mt" style="background:var(--assist);border:0"><div class="eyebrow">SAMPLE PAIRING CODE</div><div class="pair-code">482 915</div><div class="pair-words">maple · harbor · quiet · lantern</div></div><div class="input-group mt"><label for="device-name">Give this demo device a name</label><input class="input" id="device-name" maxlength="50" value="My laptop"></div><div class="sheet-actions"><button class="button primary" id="pair-confirm">The details match</button><button class="button ghost" data-action="close">Maybe later</button></div>`, () => {
    $('#pair-confirm').onclick = () => { const name = $('#device-name').value.trim(); if (!name) { $('#device-name').focus(); toast('Give your device a name'); return; } state.devices.push(name); closeSheet(false); render(true); toast(`${name} joined your demo circle`); };
  });
}

function lockVault() {
  if (state.locked) { $('#unlock-passphrase')?.focus(); return; }
  closeSheet(false); state.locked = true; state.askQuery = ''; state.query = ''; render(true); toast('Your space is locked. Take a little breather.');
}
function renderLocked() {
  content.innerHTML = `<section class="lock-page"><div class="lock-art">${icon('lock')}<span class="little-star" aria-hidden="true">✳</span></div><div class="eyebrow">A MOMENT JUST FOR YOU</div><h1 tabindex="-1" class="mt-sm">Welcome back.</h1><p>Your little universe is right here.<br>Unlock it when you’re ready.</p><form id="unlock-form" style="width:100%"><div class="input-group"><label for="unlock-passphrase">Demo passphrase</label><input class="input" id="unlock-passphrase" type="password" autocomplete="off" required placeholder="Your demo passphrase"><p class="field-hint">${state.passphrase === 'verma-demo' ? 'For this preview, use: verma-demo' : 'Use the demo passphrase you chose during setup.'}</p><p class="error-text" id="unlock-error" role="alert"></p></div><button class="button primary" type="submit">${icon('lock')}Unlock my space</button></form><button class="text-button mt-sm" id="recovery-help">A little help getting in?</button></section>`;
  $('#unlock-form').onsubmit = e => { e.preventDefault(); if ($('#unlock-passphrase').value !== state.passphrase) { $('#unlock-error').textContent = 'That doesn’t match your demo passphrase. Try again.'; $('#unlock-passphrase').focus(); return; } state.locked = false; state.screen = 'main'; render(true); toast('Good to have you back.'); };
  $('#recovery-help').onclick = () => openSheet('Let’s get you back home.', '<p class="small muted">This prototype does not implement recovery. Refreshing the page resets the sample vault and restores the default demo passphrase: <strong>verma-demo</strong>.</p><div class="notice warm mt"><div><strong>A refresh clears your session changes.</strong><p>New items, edits, imports, and paired demo devices will be reset.</p></div></div><div class="sheet-actions"><button class="button primary" data-action="close">Got it</button></div>');
}

const welcomeSlides = [
  ['Your digital life.\nA little lighter.', 'A home for your passwords, notes, and little digital things. Everything that matters, close to you.', 'A SPACE OF YOUR OWN', 'welcome-vault.svg'],
  ['A place for\nevery little thing.', 'Bring your passwords along. A few helpful tags, a little tidying, and everything feels right at home.', 'LESS MESS. MORE YES.', 'welcome-organize.svg'],
  ['You know the one.\nLet’s find it.', 'A name, a memory, a few words. Find what you need with a helper that never sees your secrets.', 'A LITTLE HELP, RIGHT HERE', 'welcome-find.svg']
];
function renderWelcome() {
  const [title, description, tag, art] = welcomeSlides[state.intro];
  content.innerHTML = `<section class="welcome-page" data-slide="${state.intro}"><div class="welcome-top"><div class="welcome-brand">${brandMark}<span class="wordmark">Verma<span class="brand-period">.</span></span></div><button id="skip-welcome">Explore demo ${icon('arrow')}</button></div><div class="welcome-illustration" aria-hidden="true"><img src="assets/${art}" alt=""></div><div class="welcome-copy"><div class="eyebrow">${tag}</div><h1 tabindex="-1">${title.split('\n').join('<br>')}</h1><p>${description}</p></div><div class="welcome-controls"><div class="welcome-progress"><span class="progress-number">0${state.intro + 1}<span> / 03</span></span><div class="dots" aria-label="Introduction ${state.intro + 1} of 3">${welcomeSlides.map((_,i) => `<i class="${i === state.intro ? 'active' : ''}"></i>`).join('')}</div>${state.intro ? `<button class="welcome-back" id="back-welcome" aria-label="Previous introduction">${icon('back')}</button>` : '<span class="welcome-back-space" aria-hidden="true"></span>'}</div><button class="button primary" id="next-welcome">${state.intro === 2 ? 'Create my demo vault' : 'Get to know Verma'} ${icon('arrow')}</button><p class="field-hint center">${state.intro === 2 ? 'Your space. Your rules. Your Verma.' : 'Interactive concept · use sample details only'}</p></div></section>`;
  $('#skip-welcome').onclick = () => navTo('vault');
  $('#next-welcome').onclick = () => { if (state.intro < 2) state.intro++; else { state.screen = 'setup'; state.setup = 1; } render(true); };
  if ($('#back-welcome')) $('#back-welcome').onclick = () => { state.intro--; render(true); };
}
const demoWords = 'maple harbor quiet lantern ember river cobalt meadow thistle orbit saffron willow pebble canyon mosaic juniper tundra velvet anchor biscuit comet driftwood fable gentle'.split(' ');
function renderSetup() {
  if (state.setup === 1) {
    content.innerHTML = `<section>${steps(1)}<div class="setup-heading"><div class="eyebrow">LET’S MAKE THIS YOURS</div><h1 tabindex="-1" class="mt-sm">Every little universe<br>needs a key.</h1><p>Choose a demo passphrase to try the lock and unlock flow.</p></div><form id="setup-form" class="stack"><div class="input-group"><label for="setup-pass">Demo passphrase</label><input class="input" id="setup-pass" type="password" required minlength="8" autocomplete="new-password"><p class="field-hint">Use at least 8 characters and a sample phrase, never a real password.</p></div><div class="input-group"><label for="confirm-pass">Once more, to be sure</label><input class="input" id="confirm-pass" type="password" required autocomplete="new-password"></div><p id="setup-error" class="error-text" role="alert"></p><button class="button primary" type="submit">Keep going ${icon('arrow')}</button><button class="button ghost" type="button" data-tab="vault">Back to the demo</button></form></section>`;
    $('#setup-form').onsubmit = e => { e.preventDefault(); const value = $('#setup-pass').value; if (value !== $('#confirm-pass').value) { $('#setup-error').textContent = 'Those phrases don’t quite match. Try once more.'; $('#confirm-pass').focus(); return; } state.passphrase = value; state.setup = 2; render(true); };
  } else if (state.setup === 2) {
    content.innerHTML = `<section>${steps(2)}<div class="setup-heading"><div class="eyebrow">A SPARE KEY, JUST IN CASE</div><h1 tabindex="-1" class="mt-sm">Some words<br>worth keeping.</h1><p>A preview of your recovery kit. These fixed sample words do not unlock or recover anything.</p></div><div class="notice warm">${icon('note')}<div><strong>For the real thing: write them down.</strong><p>Keep recovery words somewhere safe, away from the device they unlock.</p></div></div><div class="recovery-words">${demoWords.map((w,i) => `<span><small>${i + 1}</small>${w}</span>`).join('')}</div><label class="checkbox-row"><input type="checkbox" id="saved-words"><span>I understand these are sample recovery words for the demo.</span></label><button class="button primary mt" id="finish-setup" disabled>My little universe awaits ${icon('arrow')}</button></section>`;
    $('#saved-words').onchange = e => $('#finish-setup').disabled = !e.target.checked;
    $('#finish-setup').onclick = () => { state.setup = 3; render(true); };
  } else {
    content.innerHTML = `<section>${steps(3)}<div class="completion"><div class="success-emblem">${icon('heart')}</div><div class="eyebrow">MAKE YOURSELF AT HOME</div><h1 tabindex="-1" class="mt">Your space.<br>Your fresh start.</h1><p>Your demo vault is ready. Bring in a few sample passwords or explore what’s already here.</p><button class="button primary" data-tab="import">Try importing ${icon('arrow')}</button><button class="text-button" data-tab="vault">Explore my vault first</button></div></section>`;
  }
}

document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || button.disabled) return;
  if (button.dataset.tab) { if (!state.locked) navTo(button.dataset.tab); else toast('Unlock your space first'); return; }
  if (button.dataset.open) { entrySheet(Number(button.dataset.open)); return; }
  const action = button.dataset.action;
  if (action === 'close') closeSheet();
  if (action === 'add') editSheet();
  if (action === 'privacy') privacySheet();
  if (action === 'profile') profileSheet();
  if (action === 'lock') lockVault();
  if (action === 'welcome') { closeSheet(false); state.screen = 'welcome'; state.intro = 0; render(true); }
  if (action === 'reset-search') { state.query = ''; state.filter = 'all'; renderVault(); $('#vault-search').focus(); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden && !$('#sheet').hidden) closeSheet(false); });
function readPreviewRoute() {
  if (location.hash === '#welcome') { state.screen = 'welcome'; state.intro = 0; }
  else if (tabs.some(([name]) => location.hash === `#${name}`)) { state.tab = location.hash.slice(1); state.screen = 'main'; }
}
window.addEventListener('hashchange', () => { if (state.locked) return; closeSheet(false); readPreviewRoute(); render(true); });
readPreviewRoute();
render();
