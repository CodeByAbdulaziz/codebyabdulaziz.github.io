const toggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');

function closeMenu() {
  toggle.setAttribute('aria-expanded', 'false');
  navigation.classList.remove('is-open');
}

toggle.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') !== 'true';
  toggle.setAttribute('aria-expanded', String(open));
  navigation.classList.toggle('is-open', open);
});

navigation.addEventListener('click', event => {
  if (event.target.closest('a')) closeMenu();
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
    closeMenu();
    toggle.focus();
  }
});

window.matchMedia('(min-width: 761px)').addEventListener('change', closeMenu);
document.querySelector('#year').textContent = new Date().getFullYear();

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      for (const link of navigation.querySelectorAll('a')) {
        const active = link.getAttribute('href') === '#' + entry.target.id;
        link.classList.toggle('active', active);
        if (active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      }
    }
  }, { rootMargin: '-15% 0px -55% 0px', threshold: 0 });
  for (const section of document.querySelectorAll('main section[id]')) observer.observe(section);
}
