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
}

function setupFingerprintProtection() {
  normalizeUserAgent();
  console.log('[FINGERPRINT] Main-process fingerprint protection active');
}

module.exports = { setupFingerprintProtection };
