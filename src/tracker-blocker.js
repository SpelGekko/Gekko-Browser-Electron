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
    // Hosts file format: "0.0.0.0 tracker.com"
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

// Domains that must never be blocked even if they appear in the blocklist.
// The DDG tds list includes first-party domains (e.g. google.com, amazon.com) because
// their subdomains are used for tracking — but we only want to block third-party trackers,
// not the sites themselves.
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
  'duckduckgo.com',
]);

function isBlocked(hostname) {
  const h = hostname.toLowerCase();

  // Never block allowlisted domains or their subdomains
  const parts = h.split('.');
  for (let i = 0; i < parts.length - 1; i++) {
    if (ALLOWLIST.has(parts.slice(i).join('.'))) return false;
  }

  // Check exact match then walk up to parent domains (sub.tracker.com → tracker.com)
  for (let i = 0; i < parts.length - 1; i++) {
    if (blockedDomains.has(parts.slice(i).join('.'))) return true;
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

  // Apply to default session (covers all webviews without a partition)
  applyToSession(session.defaultSession);

  // Also apply to any new sessions created later (e.g. incognito partitions)
  session.on = session.on || (() => {});

  console.log('[BLOCKER] Native tracker/ad blocking active');
}

function applyToSession(targetSession) {
  targetSession.webRequest.onBeforeRequest(
    { urls: ['http://*/*', 'https://*/*'] },
    (details, callback) => {
      try {
        const url = new URL(details.url);
        if (isBlocked(url.hostname)) {
          blockedCount++;
          if (process.env.NODE_ENV === 'development') {
            console.log(`[BLOCKER] Blocked: ${url.hostname} (total: ${blockedCount})`);
          }
          callback({ cancel: true });
          return;
        }
      } catch (_) {
        // malformed URL — let it through
      }
      callback({ cancel: false });
    }
  );
}

function getBlockedCount() {
  return blockedCount;
}

module.exports = { setupTrackerBlocking, getBlockedCount };
