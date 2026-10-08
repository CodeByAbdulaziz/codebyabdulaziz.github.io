(() => {
  'use strict';

  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('#navigation');
  if (!header || !toggle || !navigation) return;

  const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';

  function closeMenu() {
    toggle.setAttribute('aria-expanded', 'false');
    navigation.classList.remove('is-open');
  }

  toggle.addEventListener('click', () => {
    const open = !isOpen();
    toggle.setAttribute('aria-expanded', String(open));
    navigation.classList.toggle('is-open', open);
  });

  navigation.addEventListener('click', event => {
    if (event.target.closest('a')) closeMenu();
  });

  // Close the mobile menu when the visitor clicks or tabs away from it.
  document.addEventListener('click', event => {
    if (isOpen() && !header.contains(event.target)) closeMenu();
  });
  navigation.addEventListener('focusout', event => {
    if (isOpen() && event.relatedTarget && !header.contains(event.relatedTarget)) closeMenu();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && isOpen()) {
      closeMenu();
      toggle.focus();
    }
  });

  const desktop = window.matchMedia('(min-width: 761px)');
  if (desktop.addEventListener) desktop.addEventListener('change', closeMenu);
  else if (desktop.addListener) desktop.addListener(closeMenu);

  const year = document.querySelector('#year');
  if (year) year.textContent = new Date().getFullYear();

  // Highlight the menu link for the section on screen.
  // At the bottom of the page the last section is active, even when it is too short to reach the top.
  const sections = [...document.querySelectorAll('main section[id]')];
  const links = [...navigation.querySelectorAll('a[href^="#"]')];
  let scheduled = false;

  function updateActiveLink() {
    scheduled = false;
    const line = window.innerHeight * 0.3;
    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    let current = '';
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= line) current = section.id;
    }
    if (atBottom && sections.length) current = sections[sections.length - 1].id;
    for (const link of links) {
      const active = link.getAttribute('href') === '#' + current;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }

  function scheduleUpdate() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(updateActiveLink);
  }

  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate);
  updateActiveLink();
})();
