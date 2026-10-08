(() => {
  'use strict';

  const measurementId = 'G-9LQK4BXMCC';
  const choiceKey = 'az-analytics-choice-v1';
  const liveSite = location.protocol === 'https:' && location.hostname === 'codebyabdulaziz.github.io';
  const banner = document.querySelector('#analytics-choice');
  const status = document.querySelector('#analytics-status');
  const accept = document.querySelector('[data-analytics-accept]');
  const decline = document.querySelector('[data-analytics-decline]');
  const close = document.querySelector('[data-analytics-close]');
  const preferences = [...document.querySelectorAll('[data-analytics-preferences]')];
  if (!banner || !status || !accept || !decline || !close) return;

  let started = false;
  let returnFocus = null;
  let choice = readChoice();

  function readChoice() {
    try {
      const value = localStorage.getItem(choiceKey);
      return value === 'accepted' || value === 'declined' ? value : null;
    } catch {
      return null;
    }
  }

  function saveChoice(value) {
    choice = value;
    try {
      localStorage.setItem(choiceKey, value);
    } catch {
      // The choice still applies to this page when browser storage is blocked.
    }
  }

  function startAnalytics() {
    if (started || !liveSite || !/^G-[A-Z0-9]+$/.test(measurementId)) return;
    started = true;
    window['ga-disable-' + measurementId] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    window.gtag('consent', 'update', { analytics_storage: 'granted' });
    window.gtag('js', new Date());
    window.gtag('config', measurementId, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
    const tag = document.createElement('script');
    tag.async = true;
    tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
    document.head.appendChild(tag);
  }

  function clearAnalyticsCookies() {
    for (const cookie of document.cookie.split(';')) {
      const name = cookie.trim().split('=')[0];
      if (name !== '_ga' && !name.startsWith('_ga_')) continue;
      const expired = name + '=; Max-Age=0; Path=/; SameSite=Lax';
      document.cookie = expired;
      document.cookie = expired + '; Domain=' + location.hostname;
      document.cookie = expired + '; Domain=.' + location.hostname;
    }
  }

  function stopAnalytics() {
    window['ga-disable-' + measurementId] = true;
    if (started && typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied'
      });
    }
    if (liveSite) clearAnalyticsCookies();
    // A fresh page removes the loaded tag and its automatic event listeners.
    if (started) location.reload();
  }

  function showBanner(focusChoice = false) {
    banner.hidden = false;
    close.hidden = choice === null;
    status.textContent = choice === 'accepted' ? 'Your current choice: analytics on.'
      : choice === 'declined' ? 'Your current choice: analytics off.'
        : 'Analytics is off until you choose.';
    for (const button of preferences) button.setAttribute('aria-expanded', 'true');
    if (focusChoice) accept.focus({ preventScroll: true });
  }

  function hideBanner() {
    const focusInside = banner.contains(document.activeElement);
    banner.hidden = true;
    for (const button of preferences) button.setAttribute('aria-expanded', 'false');
    if (focusInside) (returnFocus || preferences[0])?.focus({ preventScroll: true });
    returnFocus = null;
  }

  for (const button of preferences) {
    button.hidden = false;
    button.addEventListener('click', () => {
      returnFocus = button;
      showBanner(true);
    });
  }
  accept.addEventListener('click', () => {
    saveChoice('accepted');
    hideBanner();
    startAnalytics();
  });
  decline.addEventListener('click', () => {
    saveChoice('declined');
    hideBanner();
    stopAnalytics();
  });
  close.addEventListener('click', hideBanner);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !banner.hidden && choice !== null) hideBanner();
  });
  window.addEventListener('storage', event => {
    if (event.key !== choiceKey && event.key !== null) return;
    choice = readChoice();
    if (choice === 'accepted') {
      hideBanner();
      startAnalytics();
    } else {
      if (choice === null) showBanner();
      else hideBanner();
      stopAnalytics();
    }
  });

  if (choice === 'accepted') startAnalytics();
  else if (choice === null) showBanner();
})();
