// Preload for the Google sign-in popup (contextIsolation: false).
// Runs in the page's main world BEFORE any page scripts.
//
// Key problem: with contextIsolation disabled, Node.js globals available in
// the preload (process, require, Buffer, module) are also visible to page
// scripts via the shared V8 context.  Google's sign-in risk-assessment script
// checks window.process to detect Electron/Node — if it's truthy, Google
// blocks the sign-in at the email-submission step.  We hide those globals
// first, then spoof the chrome runtime object and UA client-hints API.

(function () {
  'use strict';

  // ── 1. Hide Node.js / Electron globals ───────────────────────────────────
  // process is non-configurable on some Electron versions — shadow it.
  try {
    Object.defineProperty(window, 'process', {
      value: undefined,
      writable: false,
      configurable: false,
    });
  } catch (e) {}

  try {
    Object.defineProperty(window, 'global', {
      value: undefined,
      writable: false,
      configurable: false,
    });
  } catch (e) {}

  ['require', 'module', 'exports', 'Buffer', '__dirname', '__filename'].forEach(function (name) {
    try { delete window[name]; } catch (e) {}
    try {
      Object.defineProperty(window, name, { value: undefined, writable: false, configurable: false });
    } catch (e) {}
  });

  // ── 2. navigator.webdriver → false ───────────────────────────────────────
  try {
    Object.defineProperty(Navigator.prototype, 'webdriver', {
      get: function () { return false; },
      configurable: true,
    });
  } catch (e) {}

  // ── 3. window.chrome ─────────────────────────────────────────────────────
  // Real Chrome always exposes window.chrome with runtime, app, csi, and
  // loadTimes.  Its absence (or presence of window.process) is the primary
  // signal Google's risk-assessment script uses to detect Electron.
  var chromeMatch = navigator.userAgent.match(/Chrome\/([\d.]+)/);
  var fullVer = chromeMatch ? chromeMatch[1] : '136.0.7103.115';
  var majorVer = fullVer.split('.')[0];

  if (!window.chrome || !window.chrome.runtime) {
    var startTime = Date.now();
    var fakeChrome = {
      app: {
        isInstalled: false,
        InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
        RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' },
        getDetails: function () { return null; },
        getIsInstalled: function () { return false; },
        installState: function (cb) { cb('not_installed'); },
        runningState: function () { return 'cannot_run'; },
      },
      runtime: {
        // Absence of id signals a non-extension page (correct for Google sign-in).
        OnInstalledReason: { CHROME_UPDATE: 'chrome_update', INSTALL: 'install', SHARED_MODULE_UPDATE: 'shared_module_update', UPDATE: 'update' },
        OnRestartRequiredReason: { APP_UPDATE: 'app_update', OS_UPDATE: 'os_update', PERIODIC: 'periodic' },
        PlatformArch: { ARM: 'arm', ARM64: 'arm64', MIPS: 'mips', MIPS64: 'mips64', X86_32: 'x86-32', X86_64: 'x86-64' },
        PlatformOs: { ANDROID: 'android', CROS: 'cros', LINUX: 'linux', MAC: 'mac', OPENBSD: 'openbsd', WIN: 'win' },
        RequestUpdateCheckStatus: { NO_UPDATE: 'no_update', THROTTLED: 'throttled', UPDATE_AVAILABLE: 'update_available' },
        connect: function () {},
        sendMessage: function () {},
      },
      csi: function () {
        return {
          startE: startTime,
          onloadT: startTime + Math.floor(Math.random() * 200 + 50),
          pageT: Date.now() - startTime,
          tran: 15,
        };
      },
      loadTimes: function () {
        return {
          commitLoadTime: startTime / 1000,
          connectionInfo: 'h2',
          finishDocumentLoadTime: (startTime + 300) / 1000,
          finishLoadTime: (startTime + 400) / 1000,
          firstPaintAfterLoadTime: 0,
          firstPaintTime: (startTime + 250) / 1000,
          navigationType: 'Other',
          npnNegotiatedProtocol: 'h2',
          requestTime: startTime / 1000,
          startLoadTime: (startTime + 10) / 1000,
          wasAlternateProtocolAvailable: false,
          wasFetchedViaSpdy: true,
          wasNpnNegotiated: true,
        };
      },
    };

    try {
      Object.defineProperty(window, 'chrome', {
        value: fakeChrome,
        writable: false,
        configurable: false,
        enumerable: true,
      });
    } catch (e) {
      window.chrome = fakeChrome;
    }
  }

  // ── 4. navigator.userAgentData ───────────────────────────────────────────
  var brands = [
    { brand: 'Not)A;Brand', version: '8' },
    { brand: 'Chromium', version: majorVer },
    { brand: 'Google Chrome', version: majorVer },
  ];

  var uaData = {
    brands: brands,
    mobile: false,
    platform: 'Windows',
    getHighEntropyValues: function (hints) {
      var result = { brands: brands, mobile: false, platform: 'Windows' };
      if (hints.indexOf('architecture') !== -1) result.architecture = 'x86';
      if (hints.indexOf('bitness') !== -1) result.bitness = '64';
      if (hints.indexOf('platformVersion') !== -1) result.platformVersion = '15.0.0';
      if (hints.indexOf('uaFullVersion') !== -1) result.uaFullVersion = fullVer;
      if (hints.indexOf('fullVersionList') !== -1) result.fullVersionList = brands;
      if (hints.indexOf('model') !== -1) result.model = '';
      if (hints.indexOf('wow64') !== -1) result.wow64 = false;
      return Promise.resolve(result);
    },
    toJSON: function () {
      return { brands: brands, mobile: false, platform: 'Windows' };
    },
  };

  try {
    Object.defineProperty(Navigator.prototype, 'userAgentData', {
      get: function () { return uaData; },
      configurable: true,
    });
  } catch (e) {
    console.error('[GKP] userAgentData override FAILED:', e);
  }

  // ── 5. Diagnostics ───────────────────────────────────────────────────────
  console.log('[GKP] process:', typeof window.process,
              '| require:', typeof window.require,
              '| webdriver:', navigator.webdriver,
              '| chrome.runtime:', !!(window.chrome && window.chrome.runtime));
  console.log('[GKP] userAgentData brands:', JSON.stringify(navigator.userAgentData.brands));
})();
