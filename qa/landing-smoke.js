(async () => {
  const checks = [];
  const assert = (name, ok) => { checks.push({ name, pass: Boolean(ok) }); if (!ok) throw new Error(name); };
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const $ = selector => document.querySelector(selector);
  assert('Landing has a single main heading and all six product sections', document.querySelectorAll('h1').length === 1 && ['features', 'inside', 'how', 'privacy', 'questions'].every(id => document.getElementById(id)));
  assert('Primary actions lead to app onboarding', [...document.querySelectorAll('.button')].every(a => a.getAttribute('href') === '/app'));
  assert('All section links resolve', [...document.querySelectorAll('a[href^="#"]')].every(a => document.querySelector(a.getAttribute('href'))));
  assert('Gallery links open the corresponding app screens', [...document.querySelectorAll('.showcase-card')].map(a => a.getAttribute('href')).join() === '/app#vault,/app#ask,/app#import,/app#devices');
  assert('No horizontal page overflow', document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
  const mobile = getComputedStyle($('.menu-toggle')).display !== 'none';
  if (mobile) {
    $('.menu-toggle').click();
    assert('Mobile menu opens with expanded state', !$('#mobile-menu').hidden && $('.menu-toggle').getAttribute('aria-expanded') === 'true');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert('Escape closes menu and restores focus', $('#mobile-menu').hidden && document.activeElement === $('.menu-toggle'));
    $('.menu-toggle').click();
    $('#mobile-menu a').click();
    assert('Selecting a section closes the menu', $('#mobile-menu').hidden);
  }
  const question = $('.faq-list details');
  question.querySelector('summary').click();
  assert('FAQ expands to reveal an answer', question.open);
  question.querySelector('summary').click();
  assert('FAQ closes', !question.open);
  const gallery = $('#showcase-track');
  $('#inside').scrollIntoView({behavior:'instant'});
  gallery.scrollTo({left:0, behavior:'instant'});
  await wait(100);
  assert('Previous gallery control starts disabled', $('#gallery-prev').disabled);
  if (gallery.scrollWidth > gallery.clientWidth + 2) {
    $('#gallery-next').click();
    await wait(700);
    assert('Next gallery control advances to another screen', gallery.scrollLeft > 100 && !$('#gallery-prev').disabled);
    $('#gallery-prev').click();
    await wait(700);
    assert('Previous gallery control returns to the start', gallery.scrollLeft < 2 && $('#gallery-prev').disabled);
    gallery.scrollTo({left:gallery.scrollWidth, behavior:'instant'});
    await wait(100);
    assert('Next gallery control disables at the end', $('#gallery-next').disabled);
  } else assert('Both gallery controls disable when all screens fit', $('#gallery-next').disabled);
  gallery.scrollTo({left:0, behavior:'instant'});
  await Promise.all([...document.images].map(async image => { image.loading = 'eager'; await image.decode(); }));
  assert('All illustrations and real app previews load', [...document.images].every(image => image.complete && image.naturalWidth));
  const app = await fetch('/app');
  assert('App route serves the onboarding application', app.ok && (await app.text()).includes('id="content"'));
  const nestedApp = await fetch('/app/');
  assert('Trailing slash resolves to canonical app route', nestedApp.ok && new URL(nestedApp.url).pathname === '/app');
  scrollTo({top:0, behavior:'instant'});
  return JSON.stringify({ width:innerWidth, passed:checks.length, checks });
})()
