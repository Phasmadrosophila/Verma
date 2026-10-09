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

// --- Hero Phone Live Flow Demo ---
const heroPhone = document.querySelector('#hero-demo-phone');
if (heroPhone) {
  const screens = [...heroPhone.querySelectorAll('.demo-screen')];
  const segments = [...heroPhone.querySelectorAll('.demo-progress-segment')];
  const cursor = heroPhone.querySelector('#demo-cursor');
  const badgeText = heroPhone.querySelector('#demo-flow-text');
  const tabTargets = [...heroPhone.querySelectorAll('.demo-tab-target')];

  // User flow sequence:
  // Step 0: Vault -> Tap 'Ask Verma' tab (x: 31.3%, y: 95.4%)
  // Step 1: Ask Verma -> Tap 'Import' tab (x: 68.7%, y: 95.4%)
  // Step 2: Smart Import -> Tap 'Devices' tab (x: 87.9%, y: 95.4%)
  // Step 3: Direct Sync -> Tap 'My Vault' tab (x: 12.0%, y: 95.4%)
  const steps = [
    {
      label: '1/4 · Your Vault',
      rest: { x: 50, y: 52 },
      target: { x: 31.3, y: 95.4 },
      next: 1
    },
    {
      label: '2/4 · Ask Verma',
      rest: { x: 78, y: 65 },
      target: { x: 68.7, y: 95.4 },
      next: 2
    },
    {
      label: '3/4 · Smart Import',
      rest: { x: 50, y: 86 },
      target: { x: 87.9, y: 95.4 },
      next: 3
    },
    {
      label: '4/4 · Direct Sync',
      rest: { x: 50, y: 72 },
      target: { x: 12.0, y: 95.4 },
      next: 0
    }
  ];

  let currentStep = 0;
  let isHovered = false;
  let timerId = null;

  function setCursorPos(x, y) {
    if (!cursor) return;
    cursor.style.left = `${x}%`;
    cursor.style.top = `${y}%`;
  }

  function renderStep(index) {
    currentStep = index;
    screens.forEach((s, i) => s.classList.toggle('active', i === currentStep));
    segments.forEach((seg, i) => {
      seg.classList.toggle('active', i === currentStep);
      seg.classList.toggle('completed', i < currentStep);
      const fill = seg.querySelector('.demo-progress-fill');
      if (fill) {
        fill.style.transition = 'none';
        fill.style.width = i < currentStep ? '100%' : '0%';
      }
    });
    if (badgeText) {
      badgeText.textContent = steps[currentStep].label;
    }
  }

  function startStep() {
    clearTimeout(timerId);
    if (reducedMotion.matches) return;

    const step = steps[currentStep];
    const activeSeg = segments[currentStep];
    const fill = activeSeg ? activeSeg.querySelector('.demo-progress-fill') : null;

    if (cursor) {
      cursor.classList.remove('is-tapping');
      cursor.classList.add('visible');
      setCursorPos(step.rest.x, step.rest.y);
    }

    if (fill && !isHovered) {
      fill.style.transition = 'none';
      fill.style.width = '0%';
      void fill.offsetWidth;
      fill.style.transition = 'width 3000ms linear';
      fill.style.width = '100%';
    }

    if (isHovered) return;

    timerId = setTimeout(() => {
      if (isHovered) return;
      setCursorPos(step.target.x, step.target.y);

      timerId = setTimeout(() => {
        if (isHovered) return;
        if (cursor) cursor.classList.add('is-tapping');

        timerId = setTimeout(() => {
          if (isHovered) return;
          if (cursor) cursor.classList.remove('is-tapping');
          renderStep(step.next);
          startStep();
        }, 300);
      }, 600);
    }, 2200);
  }

  function pause() {
    clearTimeout(timerId);
    const activeSeg = segments[currentStep];
    const fill = activeSeg ? activeSeg.querySelector('.demo-progress-fill') : null;
    if (fill) {
      const computedWidth = getComputedStyle(fill).width;
      fill.style.transition = 'none';
      fill.style.width = computedWidth;
    }
    if (cursor) {
      cursor.classList.remove('is-tapping');
    }
  }

  function resume() {
    if (reducedMotion.matches) return;
    const step = steps[currentStep];
    setCursorPos(step.target.x, step.target.y);
    timerId = setTimeout(() => {
      if (cursor) cursor.classList.add('is-tapping');
      timerId = setTimeout(() => {
        if (cursor) cursor.classList.remove('is-tapping');
        renderStep(step.next);
        startStep();
      }, 280);
    }, 800);
  }

  heroPhone.addEventListener('mouseenter', () => {
    isHovered = true;
    pause();
  });

  heroPhone.addEventListener('mouseleave', () => {
    isHovered = false;
    resume();
  });

  tabTargets.forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const target = Number(btn.getAttribute('data-target'));
      clearTimeout(timerId);
      renderStep(target);
      if (!isHovered && !reducedMotion.matches) {
        startStep();
      }
    });
  });

  const stage = heroPhone.querySelector('.demo-screen-stage');
  if (stage) {
    stage.addEventListener('click', e => {
      if (e.target.closest('.demo-tab-target')) return;
      clearTimeout(timerId);
      const nextIndex = (currentStep + 1) % steps.length;
      renderStep(nextIndex);
      if (!isHovered && !reducedMotion.matches) {
        startStep();
      }
    });
  }

  renderStep(0);
  if (!reducedMotion.matches) {
    setTimeout(startStep, 800);
  }
}

// --- Bidirectional Scroll-Driven Chat Pop Animations ---
function initScrollPopAnimations() {
  if (reducedMotion.matches) return;

  const popElements = [...document.querySelectorAll('.scroll-pop')];
  if (!popElements.length) return;

  document.documentElement.classList.add('js-scroll-animations');

  if (!('IntersectionObserver' in window)) {
    popElements.forEach(el => el.classList.add('is-popped'));
    return;
  }

  let lastScrollY = window.scrollY;
  let scrollDirection = 'down';

  window.addEventListener('scroll', () => {
    const currentScrollY = window.scrollY;
    if (Math.abs(currentScrollY - lastScrollY) > 2) {
      scrollDirection = currentScrollY > lastScrollY ? 'down' : 'up';
      lastScrollY = currentScrollY;
    }
  }, { passive: true });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const el = entry.target;
      const rect = entry.boundingClientRect;

      if (entry.isIntersecting) {
        if (scrollDirection === 'up' || rect.top < 0) {
          el.classList.add('from-above');
          el.classList.remove('from-below');
        } else {
          el.classList.add('from-below');
          el.classList.remove('from-above');
        }
        requestAnimationFrame(() => {
          el.classList.add('is-popped');
        });
      } else {
        if (rect.bottom < -30) {
          el.classList.remove('is-popped');
          el.classList.remove('from-below');
          el.classList.add('from-above');
        } else if (rect.top > window.innerHeight + 30) {
          el.classList.remove('is-popped');
          el.classList.remove('from-above');
          el.classList.add('from-below');
        }
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '20px 0px -20px 0px'
  });

  popElements.forEach(el => observer.observe(el));
}
initScrollPopAnimations();
