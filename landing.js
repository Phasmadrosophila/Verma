const menuButton = document.querySelector('.menu-toggle');
const menu = document.querySelector('#mobile-menu');

function setMenu(open) {
  menu.hidden = !open;
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
}

menuButton.addEventListener('click', () => setMenu(menu.hidden));
menu.addEventListener('click', event => {
  if (event.target.closest('a')) setMenu(false);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !menu.hidden) {
    setMenu(false);
    menuButton.focus();
  }
});
document.addEventListener('click', event => {
  if (!menu.hidden && !event.target.closest('.site-header')) setMenu(false);
});
matchMedia('(min-width: 681px)').addEventListener('change', event => {
  if (event.matches) setMenu(false);
});

const gallery = document.querySelector('#showcase-track');
const previous = document.querySelector('#gallery-prev');
const next = document.querySelector('#gallery-next');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

function updateGalleryControls() {
  previous.disabled = gallery.scrollLeft <= 2;
  next.disabled = gallery.scrollLeft + gallery.clientWidth >= gallery.scrollWidth - 2;
}
function moveGallery(direction) {
  const card = gallery.querySelector('.showcase-card');
  const distance = card.getBoundingClientRect().width + parseFloat(getComputedStyle(gallery).gap);
  gallery.scrollBy({ left: direction * distance, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
}
previous.addEventListener('click', () => moveGallery(-1));
next.addEventListener('click', () => moveGallery(1));
gallery.addEventListener('scroll', updateGalleryControls, { passive: true });
new ResizeObserver(updateGalleryControls).observe(gallery);
updateGalleryControls();
