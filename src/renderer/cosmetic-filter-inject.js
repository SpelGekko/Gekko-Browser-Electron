// CSS cosmetic filtering + dynamic ad element hiding for every webview page.
// Selectors are kept unambiguous and specific — broad wildcards like [class*="ad-"]
// cause false positives on sites like YouTube and are avoided here.
// Domain/path blocking handles the heavy lifting; CSS only hides what slips through.

export const COSMETIC_FILTER_CSS = `
/* === Google AdSense — unambiguous class/element === */
.adsbygoogle,
ins.adsbygoogle,
.google-auto-placed,
amp-ad,

/* === Google Publisher Tag (GPT / DFP) — specific id prefix === */
div[id^="div-gpt-ad"],
div[id^="google_ads_iframe"],
iframe[id^="aswift_"],
iframe[id^="google_ads_frame"],

/* === Doubleclick iframes === */
iframe[src*="doubleclick.net"],
iframe[src*="googlesyndication.com"],
iframe[src*="googleadservices.com"],

/* === Taboola — specific class/id names === */
div[id^="taboola-"],
.trc_rbox_div,
.trc_rbox,
.trc_related_container,

/* === Outbrain — specific class names === */
.OUTBRAIN,
div[data-widget-id^="OB_"],

/* === Criteo === */
div[id^="cto_"],
div[class^="cto_"],

/* === AppNexus / Xandr === */
iframe[src*="adnxs.com"],

/* === Rubicon / Magnite === */
iframe[src*="rubiconproject.com"],

/* === OpenX === */
iframe[src*="openx.net"],

/* === Ad measurement iframes (invisible but execute tracking JS) === */
iframe[src*="adsafeprotected.com"],
iframe[src*="moatads.com"],
iframe[src*="doubleverify.com"],
iframe[src*="integral-ad.com"],

/* === YouTube ad overlays (these ARE ad elements, not UI) === */
.ytp-ad-module,
.ytp-ad-overlay-container,
.ytp-ad-image-overlay,
.ytp-ad-text-overlay,
.ytp-ad-player-overlay,
.ytp-ad-skip-button-container,
ytd-action-companion-ad-renderer,
ytd-display-ad-renderer,
ytd-promoted-sparkles-web-renderer,
ytd-promoted-video-renderer,
ytd-search-pyv-renderer,
ytd-banner-promo-renderer,
ytd-statement-banner-renderer,

/* === Specific aria-label for ad containers === */
[aria-label="Advertisements"],
[aria-label="Advertisement"]
{
  display: none !important;
  visibility: hidden !important;
  height: 0 !important;
  min-height: 0 !important;
  max-height: 0 !important;
  overflow: hidden !important;
  pointer-events: none !important;
}
`;

// JavaScript MutationObserver — watches for dynamically inserted ad elements.
// Only uses specific, unambiguous selectors to avoid false positives.
export const COSMETIC_FILTER_JS = [
  '(function() {',
  '  if (window.__gkCosmetic) return;',
  '  window.__gkCosmetic = true;',

  '  var AD_SELECTORS = [',
  '    ".adsbygoogle", "ins.adsbygoogle", "amp-ad",',
  '    "div[id^=\\"div-gpt-ad\\"]", "div[id^=\\"google_ads_iframe\\"]",',
  '    "iframe[id^=\\"aswift_\\"]",',
  '    "iframe[src*=\\"doubleclick.net\\"]",',
  '    "iframe[src*=\\"googlesyndication.com\\"]",',
  '    "div[id^=\\"taboola-\\"]", ".OUTBRAIN",',
  '    ".ytp-ad-module", ".ytp-ad-overlay-container",',
  '    "ytd-display-ad-renderer", "ytd-promoted-video-renderer",',
  '    "ytd-banner-promo-renderer"',
  '  ].join(",");',

  '  function hideAds(root) {',
  '    try {',
  '      var els = root.querySelectorAll(AD_SELECTORS);',
  '      for (var i = 0; i < els.length; i++) {',
  '        els[i].style.setProperty("display", "none", "important");',
  '        els[i].style.setProperty("visibility", "hidden", "important");',
  '        els[i].style.setProperty("height", "0", "important");',
  '      }',
  '    } catch(e) {}',
  '  }',

  '  hideAds(document);',

  '  var observer = new MutationObserver(function(mutations) {',
  '    for (var i = 0; i < mutations.length; i++) {',
  '      var added = mutations[i].addedNodes;',
  '      for (var j = 0; j < added.length; j++) {',
  '        if (added[j].nodeType === 1) hideAds(added[j]);',
  '      }',
  '    }',
  '  });',

  '  observer.observe(document.documentElement, { childList: true, subtree: true });',
  '})();',
].join('\n');
