const { session } = require('electron');
const fs = require('fs');
const path = require('path');

const BLOCKLIST_PATH = path.join(__dirname, 'assets/blocklists/trackers.txt');

let blockedDomains = new Set();
let blockedCount = 0;

function parseDomains(text) {
  const domains = new Set();
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('!')) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2 && (parts[0] === '0.0.0.0' || parts[0] === '127.0.0.1')) {
      const domain = parts[1].toLowerCase();
      if (domain !== 'localhost' && domain !== '0.0.0.0') domains.add(domain);
    } else if (parts.length === 1 && trimmed.includes('.') && !trimmed.includes('/')) {
      domains.add(trimmed.toLowerCase());
    }
  }
  return domains;
}

// Domains that must never be blocked — the DDG list includes first-party domains
// (google.com, amazon.com etc.) because their subdomains host trackers, but we
// don't want to block the sites themselves.
const ALLOWLIST = new Set([
  'google.com', 'youtube.com', 'googleapis.com', 'gstatic.com',
  'google.co.uk', 'google.de', 'google.fr', 'google.nl', 'google.es',
  'google.it', 'google.com.au', 'google.co.jp', 'google.ca',
  'accounts.google.com', 'mail.google.com', 'drive.google.com',
  'bing.com', 'microsoft.com', 'microsoftonline.com', 'live.com',
  'office.com', 'sharepoint.com', 'windows.com', 'azure.com',
  'amazon.com', 'amazon.co.uk', 'amazon.de', 'amazon.fr',
  'amazonaws.com', 'cloudfront.net',
  'apple.com', 'icloud.com',
  'github.com', 'githubusercontent.com',
  'wikipedia.org', 'wikimedia.org',
  'cloudflare.com', 'cdnjs.cloudflare.com',
  'reddit.com', 'twitter.com', 'x.com',
  'instagram.com', 'whatsapp.com',
  'netflix.com', 'twitch.tv', 'spotify.com',
  'duckduckgo.com', 'jstor.org', 'medium.com',
  'stackoverflow.com', 'stackexchange.com',
  'jsdelivr.net', 'unpkg.com', 'jquery.com',
]);

// Path-based URL patterns — block requests whose URL path matches these,
// even when the domain itself isn't in the blocklist.
// Based on EasyList filter rules for path/filename keywords.
// Only applied when the domain is NOT on the allowlist.
const AD_PATH_PATTERNS = [
  // Directory segment patterns
  /\/ads?\//i,                      // /ad/ or /ads/ as a path segment
  /\/advert(s|ising)?\//i,          // /advert/, /adverts/, /advertising/
  /\/adserver\//i,                  // /adserver/
  /\/adservice\//i,                 // /adservice/
  /\/banners?\/[^?]*(?:ad|promo|sponsor|advert)/i, // /banners/pr_advertising...

  // Filename patterns for image/media files (strong ad signal with file extension)
  /[/_-]ad[sx]?[/_.-].*\.(gif|jpg|jpeg|png|webp|svg)(\?|$)/i,  // _ads_ in name
  /advertis[ei]ng[^a-z].*\.(gif|jpg|jpeg|png|webp|svg)(\?|$)/i, // advertising*.gif
  /\bsponsored[_-].*\.(gif|jpg|jpeg|png|webp|svg)(\?|$)/i,       // sponsored_*.gif
  /\/[^/]*(?:300x250|728x90|160x600|320x50|468x60|970x250|970x90|300x600)[^/]*\.(gif|jpg|jpeg|png|webp)(\?|$)/i, // standard IAB ad sizes in filename

  // Script patterns
  /\/ads?\.js(\?|$)/i,              // /ad.js or /ads.js
  /\/advertising\.js(\?|$)/i,       // /advertising.js
  /\/adserver\.js(\?|$)/i,          // /adserver.js
  /[/_-]banner[sx]?[/_.-].*\.(gif|jpg|jpeg|png|webp)(\?|$)/i,   // banner*.gif files
];

// YouTube-specific ad endpoint patterns.
// Applied EVEN for youtube.com / googlevideo.com since these are ad delivery paths,
// not general site content. Video playback uses different URL structures.
const YOUTUBE_AD_PATTERNS = [
  /\/pagead\//i,                          // ad serving endpoint (safe to block)
  /\/api\/stats\/ads/i,                   // ad impression stats (safe to block)
];

// Domains where YouTube ad patterns apply (despite being in the allowlist)
const YOUTUBE_DOMAINS = new Set(['youtube.com', 'youtubei.googleapis.com']);

function isYouTubeAdRequest(hostname, pathname, search) {
  const h = hostname.toLowerCase();
  const parts = h.split('.');
  for (let i = 0; i < parts.length - 1; i++) {
    if (YOUTUBE_DOMAINS.has(parts.slice(i).join('.'))) {
      const full = pathname + (search || '');
      for (const pattern of YOUTUBE_AD_PATTERNS) {
        if (pattern.test(full)) return true;
      }
      return false;
    }
  }
  return false;
}

function isAllowlisted(hostname) {
  const parts = hostname.toLowerCase().split('.');
  for (let i = 0; i < parts.length - 1; i++) {
    if (ALLOWLIST.has(parts.slice(i).join('.'))) return true;
  }
  return false;
}

function isDomainBlocked(hostname) {
  const parts = hostname.toLowerCase().split('.');
  for (let i = 0; i < parts.length - 1; i++) {
    if (blockedDomains.has(parts.slice(i).join('.'))) return true;
  }
  return false;
}

function isPathBlocked(urlPath, search) {
  const full = urlPath + (search || '');
  for (const pattern of AD_PATH_PATTERNS) {
    if (pattern.test(full)) return true;
  }
  return false;
}

function setupTrackerBlocking() {
  try {
    const text = fs.readFileSync(BLOCKLIST_PATH, 'utf8');
    blockedDomains = parseDomains(text);
    console.log(`[BLOCKER] Loaded ${blockedDomains.size} blocked domains`);
  } catch (err) {
    console.error('[BLOCKER] Failed to load blocklist:', err.message);
    return;
  }

  applyToSession(session.defaultSession);
  applyToSession(session.fromPartition('persist:browser'));
  console.log('[BLOCKER] Native tracker/ad blocking active');
}

function applyToSession(targetSession) {
  targetSession.webRequest.onBeforeRequest(
    { urls: ['http://*/*', 'https://*/*'] },
    (details, callback) => {
      try {
        const url = new URL(details.url);
        const hostname = url.hostname;

        // Block YouTube ad delivery endpoints before the general allowlist check
        if (isYouTubeAdRequest(hostname, url.pathname, url.search)) {
          blockedCount++;
          callback({ cancel: true });
          return;
        }

        // Allowlisted domains are never blocked (domain or path level)
        if (isAllowlisted(hostname)) {
          callback({ cancel: false });
          return;
        }

        // Domain-level block (fast Set lookup)
        if (isDomainBlocked(hostname)) {
          blockedCount++;
          callback({ cancel: true });
          return;
        }

        // Path-level block — catches locally-hosted ad files (e.g. /banners/pr_advertising_ads_banner.gif)
        // that uBlock Origin catches via EasyList path rules
        if (isPathBlocked(url.pathname, url.search)) {
          blockedCount++;
          if (process.env.NODE_ENV === 'development') {
            console.log(`[BLOCKER] Path-blocked: ${url.href}`);
          }
          callback({ cancel: true });
          return;
        }
      } catch (_) {
        // malformed URL — let through
      }
      callback({ cancel: false });
    }
  );
}

function getBlockedCount() {
  return blockedCount;
}

module.exports = { setupTrackerBlocking, getBlockedCount };
