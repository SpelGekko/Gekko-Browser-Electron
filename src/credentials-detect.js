// Credential detection preload — injected into every frame via session.setPreloads().
// No contextBridge calls so it is safe to run in subframes and alongside webview-preload.js.

(function initCredentials() {
  const { ipcRenderer } = require('electron');
  const origin = window.location.origin;
  if (!origin || origin === 'null') return;

  const USER_SELECTOR = [
    'input[type="email"]',
    'input[autocomplete="username"]',
    'input[autocomplete="email"]',
    'input[name="username"]',
    'input[name="email"]',
    'input[name="login"]',
    'input[id*="user" i]',
    'input[id*="email" i]',
    'input[id*="login" i]',
    'input[name*="user" i]',
    'input[name*="email" i]',
    'input[name*="login" i]',
    'input[type="text"]',
  ].join(', ');

  const PW_SELECTOR = 'input[type="password"]:not([autocomplete="new-password"])';
  const findUserField = (scope) => scope.querySelector(USER_SELECTOR);

  const findLoginPair = () => {
    const pw = document.querySelector(PW_SELECTOR);
    if (!pw) return null;
    const scope = pw.closest('form') || document;
    const user = findUserField(scope) || (scope !== document ? findUserField(document) : null);
    return user ? { user, pw } : null;
  };

  // ── Autofill ──────────────────────────────────────────────────────────────
  const tryAutofill = async () => {
    const pair = findLoginPair();
    if (!pair) return;
    try {
      const creds = await ipcRenderer.invoke('credentials-get-for-origin', origin);
      if (!creds || !creds.length) return;
      const best = creds.sort((a, b) => b.updatedAt - a.updatedAt)[0];
      if (!pair.user.value) {
        pair.user.value = best.username;
        pair.user.dispatchEvent(new Event('input', { bubbles: true }));
        pair.user.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (!pair.pw.value) {
        pair.pw.value = best.password;
        pair.pw.dispatchEvent(new Event('input', { bubbles: true }));
        pair.pw.dispatchEvent(new Event('change', { bubbles: true }));
      }
    } catch (err) {
      console.warn('Credentials autofill error:', err);
    }
  };

  // ── Capture ───────────────────────────────────────────────────────────────
  let lastSentKey = null;

  const tryCapture = (username, password) => {
    if (!username || !password) return;
    const key = `${username}\0${password}`;
    if (key === lastSentKey) return;
    lastSentKey = key;
    setTimeout(() => { if (lastSentKey === key) lastSentKey = null; }, 10000);
    ipcRenderer.send('credentials-capture', { origin, username, password });
  };

  // Method 1: native form submit.
  document.addEventListener('submit', (e) => {
    const form = e.target;
    if (!(form instanceof HTMLFormElement)) return;
    const pw = form.querySelector(PW_SELECTOR);
    if (!pw || !pw.value) return;
    const user = findUserField(form) || form.querySelector('input[type="text"]');
    if (!user || !user.value) return;
    tryCapture(user.value, pw.value);
  }, true);

  const captureFromActivePwField = (pw) => {
    if (!pw || !pw.value) return;
    const scope = pw.closest('form') || document;
    const user = findUserField(scope) || (scope !== document ? findUserField(document) : null);
    if (!user || !user.value) return;
    tryCapture(user.value, pw.value);
  };

  // Method 2a: button/link click with a filled password field present.
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button, [type="submit"], [role="button"], a[href="#"], [onclick]');
    if (!btn) return;
    captureFromActivePwField(document.querySelector(PW_SELECTOR));
  }, true);

  // Method 2b: Enter key in a password field.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const active = document.activeElement;
    if (!active || active.type !== 'password') return;
    captureFromActivePwField(active);
  }, true);

  // Method 3: SPA navigation away with a filled login form.
  let trackedPair = null;
  document.addEventListener('input', () => {
    const pair = findLoginPair();
    if (pair && pair.pw.value && pair.user.value) {
      trackedPair = { username: pair.user.value, password: pair.pw.value };
    }
  }, true);
  window.addEventListener('beforeunload', () => {
    if (trackedPair) tryCapture(trackedPair.username, trackedPair.password);
  });

  // ── MutationObserver — re-autofill when SPA injects a login form ──────────
  let autofillDebounce = null;
  const startObserver = () => {
    if (!document.body) return;
    new MutationObserver(() => {
      clearTimeout(autofillDebounce);
      autofillDebounce = setTimeout(tryAutofill, 400);
    }).observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { tryAutofill(); startObserver(); });
  } else {
    tryAutofill();
    startObserver();
  }
})();
