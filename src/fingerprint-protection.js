const { session } = require('electron');

// Normalize the User Agent to look like a standard Chrome browser.
// The default Electron UA exposes "GekkoBrowser/1.1.0 Electron/36.3.2" which
// is 1-in-174,000 identifying. A generic Chrome UA blends in with millions of users.
function normalizeUserAgent() {
  const defaultUA = session.defaultSession.getUserAgent();

  // Extract the Chrome version from the current UA so we stay in sync with Electron's Chromium
  const chromeMatch = defaultUA.match(/Chrome\/([\d.]+)/);
  const chromeVersion = chromeMatch ? chromeMatch[1] : '136.0.7103.115';

  const normalizedUA = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;

  session.defaultSession.setUserAgent(normalizedUA);
  console.log(`[FINGERPRINT] User Agent normalized: ${normalizedUA}`);
  return chromeVersion;
}

// Rewrite Sec-Ch-Ua client hint headers so Electron's brand is never sent to servers.
// Google (and others) use these headers to detect non-standard browsers and block OAuth flows.
function normalizeClientHints(chromeVersion) {
  const majorVersion = chromeVersion.split('.')[0];

  // Mirrors what real Chrome sends
  const brandHeader = `"Not)A;Brand";v="8", "Chromium";v="${majorVersion}", "Google Chrome";v="${majorVersion}"`;
  const mobileHeader = '?0';
  const platformHeader = '"Windows"';

  // The filter { urls: ['<all_urls>'] } is required for the listener to fire for
  // requests originating from <webview> tags and popup BrowserWindows.
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['<all_urls>'] },
    (details, callback) => {
      const headers = details.requestHeaders;

      // Remove every case variant of the UA client hint headers so we don't end
      // up with both the original Electron-branded lowercase header AND our
      // Chrome-branded replacement. HTTP/2 headers are lowercase; Electron's
      // webRequest object may use mixed case — delete all variants first.
      Object.keys(headers).forEach(key => {
        const lower = key.toLowerCase();
        if (
          lower === 'sec-ch-ua' ||
          lower === 'sec-ch-ua-mobile' ||
          lower === 'sec-ch-ua-platform' ||
          lower === 'sec-ch-ua-full-version-list'
        ) {
          delete headers[key];
        }
      });

      // Set lowercase keys (HTTP/2 canonical form) with Chrome brand values.
      headers['sec-ch-ua'] = brandHeader;
      headers['sec-ch-ua-mobile'] = mobileHeader;
      headers['sec-ch-ua-platform'] = platformHeader;

      // Diagnostic: log header names for accounts.google.com (values may be sensitive)
      if (details.url && details.url.includes('accounts.google.com')) {
        console.log('[FINGERPRINT] accounts.google.com header keys:', Object.keys(headers).join(', '));
      }

      // Remove any header that leaks the Electron or app name
      delete headers['X-Electron-Version'];
      delete headers['x-electron-version'];

      callback({ requestHeaders: headers });
    }
  );

  console.log(`[FINGERPRINT] Client hints normalized (Chrome ${majorVersion})`);
}

function setupFingerprintProtection() {
  const chromeVersion = normalizeUserAgent();
  normalizeClientHints(chromeVersion);
  console.log('[FINGERPRINT] Main-process fingerprint protection active');
}

module.exports = { setupFingerprintProtection };
