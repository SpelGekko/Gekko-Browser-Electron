const { session } = require('electron');

const BROWSER_PARTITION = 'persist:browser';

function getBrowserSession() {
  return session.fromPartition(BROWSER_PARTITION);
}

function applyFingerprintToSession(ses, chromeVersion) {
  const majorVersion = chromeVersion.split('.')[0];
  const brandHeader = `"Google Chrome";v="${majorVersion}", "Not)A;Brand";v="8", "Chromium";v="${majorVersion}"`;
  const fullVersionList = `"Google Chrome";v="${chromeVersion}", "Not)A;Brand";v="8.0.0.0", "Chromium";v="${chromeVersion}"`;

  ses.webRequest.onBeforeSendHeaders({ urls: ['<all_urls>'] }, (details, callback) => {
    const headers = details.requestHeaders;

    // Remove Electron-identifying headers unconditionally
    delete headers['X-Electron-Version'];
    delete headers['x-electron-version'];

    // Low-entropy hints (sec-ch-ua, sec-ch-ua-mobile, sec-ch-ua-platform) are sent by real
    // Chrome on ALL navigation requests without needing Accept-CH opt-in.
    // High-entropy hints (sec-ch-ua-full-version-list) are only sent when the server opted-in.
    const secFetchMode = (headers['Sec-Fetch-Mode'] || headers['sec-fetch-mode'] || '').toLowerCase();
    const isNavigation = secFetchMode === 'navigate';
    const hasFullVersionList = Object.keys(headers).some(k => k.toLowerCase() === 'sec-ch-ua-full-version-list');

    // Remove all existing sec-ch-ua variants (may have Electron brand or wrong values)
    Object.keys(headers).forEach(key => {
      const lower = key.toLowerCase();
      if (lower.startsWith('sec-ch-ua')) delete headers[key];
    });

    // Always add low-entropy hints on navigations; also add them when already present on other requests
    if (isNavigation || Object.keys(headers).some(k => k.toLowerCase() === 'sec-ch-ua')) {
      headers['sec-ch-ua'] = brandHeader;
      headers['sec-ch-ua-mobile'] = '?0';
      headers['sec-ch-ua-platform'] = '"Windows"';
    } else {
      // For non-navigation requests, still replace if they were present before we removed them
      // (the server opted-in). Re-check via a flag set before deletion.
      const hadHints = hasFullVersionList || Object.keys(headers).some(k => k.toLowerCase() === 'sec-ch-ua');
      if (hadHints) {
        headers['sec-ch-ua'] = brandHeader;
        headers['sec-ch-ua-mobile'] = '?0';
        headers['sec-ch-ua-platform'] = '"Windows"';
      }
    }

    // Full-version-list is high-entropy — only send it when server previously opted in
    if (hasFullVersionList) {
      headers['sec-ch-ua-full-version-list'] = fullVersionList;
    }

    // Always force English — Chromium always sends Accept-Language so the
    // "if absent" check never fires. Delete both casings then set canonical.
    Object.keys(headers).forEach(k => { if (k.toLowerCase() === 'accept-language') delete headers[k]; });
    headers['Accept-Language'] = 'en-US,en;q=0.9';

    if (details.url && details.url.includes('accounts.google.com')) {
      console.log('[FINGERPRINT] accounts.google.com header keys:', Object.keys(headers).join(', '));
    }
    callback({ requestHeaders: headers });
  });

  // Strip SameSite=Strict from Google cookies so they survive cross-origin redirect chains.
  // Google's sign-in flow goes google.com → accounts.google.com via HTTP redirect; without
  // this the GAPS/state cookie set in step 1 is withheld on step 2 → /CookieMismatch.
  ses.webRequest.onHeadersReceived(
    { urls: ['https://*.google.com/*', 'https://accounts.google.com/*'] },
    (details, callback) => {
      const headers = details.responseHeaders;
      const key = Object.keys(headers).find(k => k.toLowerCase() === 'set-cookie');
      if (key) {
        headers[key] = headers[key].map(cookie =>
          cookie.replace(/;\s*SameSite=Strict/gi, '; SameSite=Lax')
        );
      }
      callback({ responseHeaders: headers });
    }
  );
}

function setupFingerprintProtection() {
  const defaultUA = session.defaultSession.getUserAgent();
  const chromeMatch = defaultUA.match(/Chrome\/([\d.]+)/);
  const chromeVersion = chromeMatch ? chromeMatch[1] : '136.0.7103.115';
  const normalizedUA = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;

  // Apply to default session (chrome UI)
  session.defaultSession.setUserAgent(normalizedUA, 'en-US,en;q=0.9');
  applyFingerprintToSession(session.defaultSession, chromeVersion);

  // Apply to browser tab session (fresh, never flagged by Google)
  const browserSes = getBrowserSession();
  browserSes.setUserAgent(normalizedUA, 'en-US,en;q=0.9');
  applyFingerprintToSession(browserSes, chromeVersion);

  console.log(`[FINGERPRINT] User Agent normalized: ${normalizedUA}`);
  console.log(`[FINGERPRINT] Client hints normalized (Chrome ${chromeVersion.split('.')[0]})`);
  console.log('[FINGERPRINT] Main-process fingerprint protection active');
}

module.exports = { setupFingerprintProtection, getBrowserSession, BROWSER_PARTITION };
