// YouTube ad blocking.
// Primary: intercept /youtubei/v1/player POST responses and strip adPlacements
// before YouTube's player sees them — no ad data = no ads queued.
// Fallback: skip-button click + speed-through for any ads that slip through
// (e.g. cached player config from previous navigation).

export const YOUTUBE_ADBLOCK_CODE = [
  '(function() {',
  '  if (window.__gkYTAdBlock) return;',
  '  window.__gkYTAdBlock = true;',

  // ── Fetch interception ─────────────────────────────────────────────────
  // Only intercepts POST requests to /youtubei/v1/player.
  // Strips the three ad fields and returns a clean Response with
  // only Content-Type set — avoids Content-Length mismatch bugs.
  '  var _fetch = window.fetch;',
  '  window.fetch = function(resource, options) {',
  '    var url = typeof resource === "string" ? resource : (resource && resource.url || "");',
  '    var method = (options && options.method || "GET").toUpperCase();',
  '    if (url.indexOf("/youtubei/v1/player") !== -1 && method === "POST") {',
  '      return _fetch.call(window, resource, options).then(function(res) {',
  '        var status = res.status;',
  '        var statusText = res.statusText;',
  '        return res.text().then(function(text) {',
  '          try {',
  '            var json = JSON.parse(text);',
  '            delete json.adPlacements;',
  '            delete json.playerAds;',
  '            delete json.adSlots;',
  '            if (json.playerConfig) delete json.playerConfig.adConfig;',
  '            return new Response(JSON.stringify(json), {',
  '              status: status,',
  '              statusText: statusText,',
  '              headers: { "Content-Type": "application/json; charset=UTF-8" }',
  '            });',
  '          } catch(e) {',
  // JSON parsing failed — return unmodified text so video still works
  '            return new Response(text, {',
  '              status: status,',
  '              statusText: statusText,',
  '              headers: { "Content-Type": "application/json; charset=UTF-8" }',
  '            });',
  '          }',
  '        });',
  '      });',
  '    }',
  '    return _fetch.apply(window, arguments);',
  '  };',

  // ── Skip-button / speed fallback ───────────────────────────────────────
  // Handles cached ad configs and mid-rolls that bypass the fetch intercept.
  '  var _adMuted = false;',
  '  var _prevMuted = false;',
  '  var _prevRate = 1;',

  '  function handleAd() {',
  '    try {',
  // 1. Click skip button the instant it appears
  '      var skipBtn = document.querySelector(".ytp-skip-ad-button,.ytp-ad-skip-button,.ytp-ad-skip-button-modern,button.ytp-ad-skip-button-modern,.ytp-ad-skip-button-slot button");',
  '      if (skipBtn) { skipBtn.click(); }',

  // 2. Jump currentTime to end of ad (works for skippable + unskippable)
  //    YouTube may reset it — we just keep setting it every 100ms until ad ends
  '      var adPlaying = document.querySelector(".ad-showing, .ad-interrupting");',
  '      var video = document.querySelector("video");',
  '      if (adPlaying && video) {',
  '        video.muted = true;',
  '        video.playbackRate = 16;',
  '        if (isFinite(video.duration) && video.duration > 0) {',
  '          video.currentTime = video.duration - 0.01;',
  '        }',
  '        _adMuted = true;',
  '        _prevMuted = false;',
  '        _prevRate  = 1;',
  '      } else if (_adMuted) {',
  '        if (video) { video.muted = _prevMuted; video.playbackRate = _prevRate; }',
  '        _adMuted = false;',
  '      }',
  '    } catch(e) {}',
  '  }',

  // ── Ad UI hiding ────────────────────────────────────────────────────────
  '  var AD_UI =',
  '    ".ytp-ad-module,.ytp-ad-overlay-container,.ytp-ad-image-overlay," +',
  '    ".ytp-ad-text-overlay,.ytp-ad-player-overlay-instream-info," +',
  '    "ytd-action-companion-ad-renderer,ytd-display-ad-renderer," +',
  '    "ytd-promoted-sparkles-web-renderer,ytd-promoted-video-renderer," +',
  '    "ytd-search-pyv-renderer,ytd-banner-promo-renderer," +',
  '    "ytd-statement-banner-renderer,ytd-in-feed-ad-layout-renderer," +',
  '    "#masthead-ad";',

  '  function hideAdUI() {',
  '    try {',
  '      var els = document.querySelectorAll(AD_UI);',
  '      for (var i = 0; i < els.length; i++) {',
  '        els[i].style.setProperty("display","none","important");',
  '        els[i].style.setProperty("height","0","important");',
  '      }',
  '    } catch(e) {}',
  '  }',

  // ── SPA navigation — YouTube doesn't reload the page between videos ────
  // Re-run on each navigation so mid-roll interception stays active.
  '  document.addEventListener("yt-navigate-finish", function() {',
  '    hideAdUI(); handleAd();',
  '  });',

  '  setInterval(function() { handleAd(); }, 100);',

  '  var obs = new MutationObserver(function() { hideAdUI(); handleAd(); });',
  '  obs.observe(document.documentElement, { childList: true, subtree: true });',

  '  hideAdUI(); handleAd();',
  '})();',
].join('\n');
