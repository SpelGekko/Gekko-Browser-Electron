const { app, BrowserWindow, WebContentsView, ipcMain, dialog, session, globalShortcut, nativeTheme } = require('electron');
const path = require('path');

// Remove Electron/automation fingerprints before any window opens
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');
// Prevent third-party cookie blocking — without this, popups opened from a gkp:// context
// treat all google.com cookies as third-party and Google shows a "cookies disabled" error.
app.commandLine.appendSwitch('disable-features', 'ThirdPartyCookieDeprecation,BlockThirdPartyCookies');

const registerProtocolHandlers = require('./protocol-handlers');
const { setupTrackerBlocking } = require('./tracker-blocker');
const { setupFingerprintProtection, getBrowserSession } = require('./fingerprint-protection');
const historyStorage = require('./history-storage');
const settingsStorage = require('./settings-storage');
const bookmarksStorage = require('./bookmarks-storage');
const downloadsStorage = require('./downloads-storage');
const clippingsStorage = require('./clippings');
const workspacesStorage = require('./workspaces');
const sessionStorage = require('./session-storage');
const credentialsStorage = require('./credentials-storage');
const buildContextMenu = require('./context-menu/build-context-menu');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// Configure logging for updater
log.transports.file.level = 'info';
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

// Configure auto-updater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.allowDowngrade = false;
autoUpdater.logger = log;

// Cache settings in memory
let cachedSettings = null;

// Theme change lock to prevent multiple simultaneous saves
let themeChangeLock = false;
let lastAppliedTheme = null;
const THEME_LOCK_TIMEOUT = 500;

// Load settings on startup
function loadSettings() {
  if (!cachedSettings) {
    cachedSettings = settingsStorage.getSettings();
  }
  return cachedSettings;
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Get initial settings and ensure they exist
let settings;
try {
  settings = settingsStorage.getSettings();
  if (!settings) {
    console.warn('No settings found, using defaults');
    settings = { ...settingsStorage.defaultSettings };
  }
} catch (error) {
  console.error('Error loading settings:', error);
  settings = { ...settingsStorage.defaultSettings };
}

// ── WebContentsView tab management ───────────────────────────────────────────
// mainWindow   – BrowserWindow (loads index.html = browser chrome UI directly)
// tabViews     – Map<tabId, WebContentsView> for browsing tabs, added ON TOP of chrome
// wcIdToTabId  – Map<webContentsId, tabId> for reverse lookup from IPC sender
// injectCodes  – scripts sent from renderer for dom-ready injection
let mainWindow = null;
// chromeView is now the BrowserWindow's own webContents (no separate WCV needed)
const chromeView = { get webContents() { return mainWindow?.webContents; } };
const tabViews = new Map();
const wcIdToTabId = new Map();
let currentChromeHeight = 200; // updated via 'wcv-set-chrome-height' from renderer; start large to avoid clipping
const injectCodes = {};        // populated via 'wcv-set-inject-code' from renderer

// Open Google sign-in in a dedicated BrowserWindow with a clean, unmodified session.
// persist:browser has header/JS modifications that trigger Google's embedded-browser detection.
// This uses a separate 'persist:google-auth' partition with only a clean Chrome UA set.
function openGoogleSignInWindow(url) {
  const existing = BrowserWindow.getAllWindows().find(w => w._isGoogleSignIn);
  if (existing && !existing.isDestroyed()) {
    existing.loadURL(url);
    existing.focus();
    return;
  }

  // Fresh session — no onBeforeSendHeaders hooks, no JS injection, no Electron fingerprints
  const gSes = session.fromPartition('persist:google-auth');
  const defaultUA = session.defaultSession.getUserAgent();
  const chromeMatch = defaultUA.match(/Chrome\/([\d.]+)/);
  const chromeVersion = chromeMatch ? chromeMatch[1] : '136.0.7103.115';
  gSes.setUserAgent(`Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`);

  // Register gkp:// protocol on this session so any internal links don't break
  try { registerProtocolHandlers([gSes]); } catch (_) {}

  // Fix sec-ch-ua: Electron sends "Not.A/Brand" + "Chromium" but no "Google Chrome".
  // Google's sign-in blocks Chromium builds that lack the Google Chrome brand.
  const majorVersion = chromeVersion.split('.')[0];
  const brandHeader = `"Google Chrome";v="${majorVersion}", "Not)A;Brand";v="8", "Chromium";v="${majorVersion}"`;
  const fullVersionList = `"Google Chrome";v="${chromeVersion}", "Not)A;Brand";v="8.0.0.0", "Chromium";v="${chromeVersion}"`;
  gSes.webRequest.onBeforeSendHeaders({ urls: ['<all_urls>'] }, (details, callback) => {
    const headers = details.requestHeaders;
    delete headers['X-Electron-Version'];
    delete headers['x-electron-version'];
    const hasFullVL = Object.keys(headers).some(k => k.toLowerCase() === 'sec-ch-ua-full-version-list');
    // Always strip Electron's native sec-ch-ua brands and replace with Chrome brands.
    // The initial popup navigation has no Sec-Fetch-Mode so we can't gate on isNav.
    Object.keys(headers).forEach(k => { if (k.toLowerCase().startsWith('sec-ch-ua')) delete headers[k]; });
    headers['sec-ch-ua'] = brandHeader;
    headers['sec-ch-ua-mobile'] = '?0';
    headers['sec-ch-ua-platform'] = '"Windows"';
    if (hasFullVL) headers['sec-ch-ua-full-version-list'] = fullVersionList;
    callback({ requestHeaders: headers });
  });

  const popup = new BrowserWindow({
    width: 500,
    height: 650,
    minWidth: 400,
    minHeight: 500,
    title: 'Sign in - Google Accounts',
    webPreferences: {
      session: gSes,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: path.join(__dirname, 'google-popup-preload.js'),
    },
    parent: mainWindow,
    autoHideMenuBar: true,
  });
  popup._isGoogleSignIn = true;
  popup.loadURL(url);

  // When sign-in completes, copy Google cookies into persist:browser so all tabs are signed in.
  // When Google rejects (/rejected path), show a helpful message instead of a broken page.
  popup.webContents.on('did-navigate', async (_, navUrl) => {
    if (navUrl.includes('/signin/rejected') || navUrl.includes('browser_not_supported')) {
      popup.webContents.executeJavaScript(`
        document.body.innerHTML = '<div style="font-family:sans-serif;padding:40px;text-align:center;max-width:400px;margin:0 auto">' +
          '<h2 style="color:#333">Google Sign-In Unavailable</h2>' +
          '<p style="color:#666;line-height:1.6">Google blocks sign-in from custom browsers for security reasons. ' +
          'This is a Google policy limitation that affects all Electron-based browsers.</p>' +
          '<p style="color:#666;line-height:1.6"><strong>Workaround:</strong> Sign in to Google in your system browser (Chrome/Firefox). ' +
          'You can still use Gmail and YouTube while browsing in Gekko — just open them after signing in elsewhere.</p>' +
          '<button onclick="window.close()" style="margin-top:20px;padding:10px 24px;background:#4285f4;color:white;border:none;border-radius:4px;cursor:pointer;font-size:14px">Close</button>' +
          '</div>';
      `).catch(() => {});
      return;
    }
    if (!navUrl.includes('accounts.google.com')) {
      try {
        const cookies = await gSes.cookies.get({ domain: '.google.com' });
        const bSes = getBrowserSession();
        for (const cookie of cookies) {
          await bSes.cookies.set({
            url: `https://${cookie.domain.replace(/^\./, '')}`,
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path,
            secure: cookie.secure,
            httpOnly: cookie.httpOnly,
            expirationDate: cookie.expirationDate,
          }).catch(() => {});
        }
      } catch (_) {}
      broadcastToChrome('google-signin-complete', navUrl);
      setTimeout(() => { if (!popup.isDestroyed()) popup.close(); }, 800);
    }
  });
}

function broadcastToChrome(channel, ...args) {
  try {
    if (chromeView && !chromeView.webContents.isDestroyed()) {
      chromeView.webContents.send(channel, ...args);
    }
  } catch (_) {}
}

const STATUS_BAR_HEIGHT = 24;

function getTabContentBounds(windowWidth, windowHeight, pane) {
  const y = currentChromeHeight;
  const h = Math.max(0, windowHeight - currentChromeHeight - STATUS_BAR_HEIGHT);
  if (pane === 'left')  return { x: 0,                        y, width: Math.floor(windowWidth / 2),            height: h };
  if (pane === 'right') return { x: Math.floor(windowWidth / 2), y, width: windowWidth - Math.floor(windowWidth / 2), height: h };
  return { x: 0, y, width: windowWidth, height: h };
}

// IPC handlers
// Handle settings updates
ipcMain.on('set-setting', (event, key, value) => {
  console.group('Set Setting');
  console.log(`Setting ${key} to:`, value);

  if (key === 'theme') {
    if (lastAppliedTheme === value) {
      console.log('Theme already applied, skipping save');
      event.returnValue = true;
      console.groupEnd();
      return;
    }
    if (themeChangeLock) {
      console.log('Theme change locked, skipping save');
      event.returnValue = true;
      console.groupEnd();
      return;
    }
    themeChangeLock = true;
    setTimeout(() => { themeChangeLock = false; }, THEME_LOCK_TIMEOUT);
    lastAppliedTheme = value;
  }

  const result = settingsStorage.setSetting(key, value);
  if (result === true) {
    cachedSettings = settingsStorage.getSettings();
    broadcastToChrome('settings-updated', cachedSettings);
    if (key === 'theme') broadcastToChrome('theme-changed', value);
  }

  event.returnValue = result === true;
  console.log('Setting update complete');
  console.groupEnd();
});

ipcMain.on('get-settings', (event) => {
  event.returnValue = loadSettings();
});

ipcMain.on('get-themes', (event) => {
  try {
    const { themes } = require('./themes.js');
    event.returnValue = themes;
  } catch (error) {
    console.error('Failed to load themes for IPC:', error);
    event.returnValue = {};
  }
});

// Handle theme changes
ipcMain.on('apply-theme', async (event, themeId) => {
  console.group('Theme Change Request');
  console.log('Theme change requested:', themeId);

  if (!themeId || typeof themeId !== 'string') {
    console.error('Invalid theme ID, using default');
    themeId = 'dark';
  }

  const allowedThemes = ['dark', 'light', 'purple', 'blue', 'red', 'gekko'];
  if (!allowedThemes.includes(themeId)) {
    console.error('Theme not in allowed list, using default');
    themeId = 'dark';
    event.returnValue = false;
    console.groupEnd();
    return;
  }

  if (lastAppliedTheme === themeId) {
    console.log('Theme already applied, skipping save');
    event.returnValue = true;
    console.groupEnd();
    return;
  }

  if (themeChangeLock) {
    console.log('Theme change locked, deferring application');
    event.returnValue = true;
    console.groupEnd();
    return;
  }

  themeChangeLock = true;
  setTimeout(() => { themeChangeLock = false; }, THEME_LOCK_TIMEOUT);

  try {
    let saveSuccess = false;
    const tryThemeSave = async () => {
      const saveResult = settingsStorage.setSetting('theme', themeId);
      if (saveResult !== true) return false;
      await new Promise(resolve => setTimeout(resolve, 50));
      const verifySettings = settingsStorage.getSettings();
      return verifySettings.theme === themeId;
    };

    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`Theme save attempt ${attempt}/3`);
      saveSuccess = await tryThemeSave();
      if (saveSuccess) { console.log('Theme saved and verified successfully'); break; }
      if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt - 1)));
    }

    if (!saveSuccess) throw new Error('All theme save attempts failed');

    settings.theme = themeId;
    lastAppliedTheme = themeId;
    cachedSettings = {...settings};

    broadcastToChrome('settings-updated', settings);
    broadcastToChrome('theme-changed', themeId);
    broadcastToChrome('webview-theme-changed', themeId);

    console.log('Theme change broadcast complete');
  } catch (error) {
    console.error('Theme change error:', error);
    try {
      const { theme: previousTheme } = settingsStorage.getSettings();
      if (previousTheme && previousTheme !== themeId) {
        broadcastToChrome('revert-theme', previousTheme);
      }
    } catch (revertError) {
      console.error('Error reverting theme:', revertError);
    }
  }

  console.groupEnd();
});

ipcMain.on('get-history', (event) => {
  event.returnValue = historyStorage.getHistory();
});

ipcMain.on('add-history', (event, url, title) => {
  historyStorage.addHistoryEntry(url, title);
});

ipcMain.on('clear-history', () => {
  historyStorage.clearHistory();
});

ipcMain.handle('clear-browsing-data', async (event, options = {}) => {
  const ses = getBrowserSession();
  const storages = [];
  if (options.cookies)  storages.push('cookies');
  if (options.cache)    storages.push('cachestorage', 'shadercache', 'serviceworkers');
  if (options.history)  historyStorage.clearHistory();
  if (options.storage)  storages.push('localstorage', 'indexdb', 'websql', 'filesystem');

  if (storages.length > 0) {
    await ses.clearStorageData({ storages });
  }
  if (options.cache) {
    await ses.clearCache();
  }
  return { success: true };
});

// Incognito mode handlers
ipcMain.on('toggle-incognito-mode', (event) => {
  const isIncognito = historyStorage.toggleIncognitoMode();
  event.returnValue = isIncognito;
});

ipcMain.on('get-incognito-mode', (event) => {
  event.returnValue = historyStorage.getIncognitoMode();
});

// Update handlers
ipcMain.on('check-for-updates', (event) => {
  log.info('Manual update check requested');
  autoUpdater.checkForUpdates().catch(err => {
    log.error('Error checking for updates:', err);
  });
});

ipcMain.on('download-update', (event) => {
  log.info('Update download requested');
  autoUpdater.downloadUpdate().catch(err => {
    log.error('Error downloading update:', err);
  });
});

ipcMain.on('install-update', (event) => {
  log.info('Update installation requested');
  autoUpdater.quitAndInstall();
});

ipcMain.on('update-bookmarks-order', (event, orderedUrls) => {
  console.log('Updating bookmark order');
  bookmarksStorage.updateBookmarksOrder(orderedUrls);
  broadcastToChrome('bookmarks-updated', bookmarksStorage.getBookmarks());
});

// Bookmarks handlers
ipcMain.on('get-bookmarks', (event) => {
  event.returnValue = bookmarksStorage.getBookmarks();
});

ipcMain.on('add-bookmark', (event, url, title, favicon) => {
  bookmarksStorage.addBookmark(url, title, favicon);
  broadcastToChrome('bookmarks-updated', bookmarksStorage.getBookmarks());
});

ipcMain.on('remove-bookmark', (event, url) => {
  bookmarksStorage.removeBookmark(url);
  broadcastToChrome('bookmarks-updated', bookmarksStorage.getBookmarks());
});

ipcMain.on('is-bookmarked', (event, url) => {
  event.returnValue = bookmarksStorage.isBookmarked(url);
});

// Clippings handlers
ipcMain.on('get-clippings', (event) => {
  event.returnValue = clippingsStorage.getClippings();
});

ipcMain.on('add-clipping', (event, clipping) => {
  const result = clippingsStorage.addClipping(clipping);
  if (result) clippingsStorage.broadcastClippings();
});

ipcMain.on('remove-clipping', (event, clipId) => {
  const result = clippingsStorage.removeClipping(clipId);
  if (result) clippingsStorage.broadcastClippings();
});

ipcMain.on('clear-clippings', () => {
  const result = clippingsStorage.clearClippings();
  if (result) clippingsStorage.broadcastClippings();
});

// Workspaces handlers
ipcMain.on('get-workspaces', (event) => {
  event.returnValue = workspacesStorage.getWorkspaces();
});

ipcMain.on('add-workspace', (event, workspace) => {
  const result = workspacesStorage.addWorkspace(workspace);
  if (result) workspacesStorage.broadcastWorkspaces();
});

ipcMain.on('remove-workspace', (event, workspaceId) => {
  const result = workspacesStorage.removeWorkspace(workspaceId);
  if (result) workspacesStorage.broadcastWorkspaces();
});

ipcMain.on('clear-workspaces', () => {
  const result = workspacesStorage.clearWorkspaces();
  if (result) workspacesStorage.broadcastWorkspaces();
});

ipcMain.on('open-workspace', (event, workspaceId) => {
  const workspaces = workspacesStorage.getWorkspaces();
  const workspace = workspaces.find((item) => item.id === workspaceId);
  if (!workspace) return;
  broadcastToChrome('open-workspace', workspace);
});

ipcMain.on('get-session-state', (event) => {
  event.returnValue = sessionStorage.getSessionState();
});

ipcMain.on('save-session-state', (event, sessionState) => {
  sessionStorage.saveSessionState(sessionState);
});

ipcMain.on('save-session-state-sync', (event, sessionState) => {
  event.returnValue = sessionStorage.saveSessionState(sessionState);
});

ipcMain.on('mark-session-clean-exit', (event, isClean) => {
  event.returnValue = sessionStorage.markCleanExit(Boolean(isClean));
});

ipcMain.on('get-app-version', (event) => {
  event.returnValue = app.getVersion();
});

ipcMain.handle('get-update-status', async () => {
  if (autoUpdater.getStatus) return autoUpdater.getStatus();
  if (autoUpdater.currentVersion) {
    return { status: 'downloaded', info: { version: autoUpdater.currentVersion.version, releaseNotes: autoUpdater.currentVersion.releaseNotes } };
  }
  return { status: 'unknown' };
});

ipcMain.on('open-update-page', () => {
  log.info('Opening update page requested');
  broadcastToChrome('navigate-from-main', 'gkp://update.gekko/');
});

ipcMain.handle('get-setting', async (event, key) => {
  return (settingsStorage.getSettings() || {})[key];
});

ipcMain.handle('pick-home-background', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Home Screen Background',
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] }]
  });

  if (result.canceled || !result.filePaths?.length) return null;

  const filePath = result.filePaths[0];
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
  const mimeType = mimeMap[ext] || 'application/octet-stream';

  try {
    const data = require('fs').readFileSync(filePath);
    return { dataUrl: `data:${mimeType};base64,${data.toString('base64')}`, fileName: path.basename(filePath) };
  } catch (error) {
    console.error('Failed to read home background file:', error);
    return null;
  }
});

// Credentials handlers
ipcMain.handle('credentials-save', (event, origin, username, password) => {
  return credentialsStorage.saveCredential(origin, username, password);
});

ipcMain.handle('credentials-get-for-origin', (event, origin) => {
  return credentialsStorage.getCredentialsForOrigin(origin);
});

ipcMain.handle('credentials-get-all', () => {
  return credentialsStorage.getAllCredentials();
});

ipcMain.handle('credentials-delete', (event, id) => {
  return credentialsStorage.deleteCredential(id);
});

ipcMain.handle('credentials-update', (event, id, data) => {
  return credentialsStorage.updateCredential(id, data);
});

ipcMain.handle('credentials-get-decrypted', (event, id) => {
  return credentialsStorage.getDecryptedCredential(id);
});

ipcMain.handle('credentials-add-never-save', (event, origin) => {
  credentialsStorage.addNeverSave(origin);
  return true;
});

ipcMain.handle('credentials-is-never-save', (event, origin) => {
  return credentialsStorage.isNeverSave(origin);
});

// Called from webview-preload when a login form is submitted in a tab view
ipcMain.on('credentials-capture', (event, { origin, username, password }) => {
  if (!origin || !username || !password) return;
  if (credentialsStorage.isNeverSave(origin)) return;

  // Check if we already have this exact credential saved — no prompt needed.
  const existing = credentialsStorage.getCredentialsForOrigin(origin)
    .find(c => c.username === username);
  if (existing && existing.password === password) return;

  // New credential or password changed — ask the user.
  const isUpdate = !!existing;
  broadcastToChrome('show-save-password-prompt', { origin, username, password, isUpdate });
});

// Google Auth popup (fallback for sites that still need a real BrowserWindow)
function openGoogleAuthPopup(url) {
  const { BrowserWindow } = require('electron');
  const googleSession = session.fromPartition('persist:google-auth');

  const normalizedUA = session.defaultSession.getUserAgent();
  googleSession.setUserAgent(normalizedUA);

  googleSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const ua = normalizedUA;
    const chromeMatch = ua.match(/Chrome\/([\d.]+)/);
    const chromeVer = chromeMatch ? chromeMatch[1] : '136.0.7103.115';
    const majorVer = chromeVer.split('.')[0];
    const headers = { ...details.requestHeaders };
    headers['Sec-Ch-Ua'] = `"Not)A;Brand";v="8", "Chromium";v="${majorVer}", "Google Chrome";v="${majorVer}"`;
    headers['Sec-Ch-Ua-Mobile'] = '?0';
    headers['Sec-Ch-Ua-Platform'] = '"Windows"';
    callback({ requestHeaders: headers });
  });

  const popup = new BrowserWindow({
    width: 500, height: 650, show: false,
    webPreferences: {
      preload: path.join(__dirname, 'google-auth-preload.js'),
      contextIsolation: false, nodeIntegration: false, sandbox: false,
      session: googleSession,
    }
  });

  popup.webContents.setWindowOpenHandler(({ url: newUrl }) => {
    try {
      const { hostname } = new URL(newUrl);
      if (hostname.endsWith('google.com') || hostname.endsWith('googleapis.com')) {
        return { action: 'allow', overrideBrowserWindowOptions: {
          webPreferences: { session: googleSession, contextIsolation: false, nodeIntegration: false, sandbox: false, preload: path.join(__dirname, 'google-auth-preload.js') }
        }};
      }
    } catch (_) {}
    return { action: 'deny' };
  });

  popup.once('ready-to-show', () => popup.show());
  popup.webContents.loadURL(url || 'https://accounts.google.com/');

  popup.webContents.on('did-navigate', (_, navUrl) => {
    if (navUrl.startsWith('https://myaccount.google.com') || navUrl.startsWith('https://www.google.com')) {
      const cookies = googleSession.cookies;
      cookies.get({ domain: '.google.com' }).then(cookieList => {
        cookieList.forEach(c => {
          session.defaultSession.cookies.set({ url: `https://${c.domain}${c.path}`, name: c.name, value: c.value, domain: c.domain, path: c.path, secure: c.secure, httpOnly: c.httpOnly }).catch(() => {});
        });
        console.log(`[GoogleAuth] Sign-in complete, ${cookieList.length} cookies copied to main session`);
      });
      setTimeout(() => { if (!popup.isDestroyed()) popup.close(); }, 2000);
    }
  });
}

ipcMain.on('open-google-auth-popup', (event, url) => {
  openGoogleAuthPopup(url || 'https://accounts.google.com/');
});

// Navigation from webview-preload (e.g. SPA navigateTo call)
ipcMain.on('navigate', (event, url) => {
  if (!url) return;
  broadcastToChrome('navigate-from-main', url);
});

// Handle context menu from any WebContents (chrome or tab views)
ipcMain.on('show-context-menu', (event, params) => {
  const menu = buildContextMenu(event, params);
  const isTabSender = wcIdToTabId.has(event.sender.id);
  const x = Number.isFinite(params?.x) ? Math.round(params.x) : undefined;
  // Tab views start at y=currentChromeHeight in window coordinates
  const y = Number.isFinite(params?.y)
    ? Math.round(params.y) + (isTabSender ? currentChromeHeight : 0)
    : undefined;
  menu.popup({ window: mainWindow, x, y });
});

ipcMain.on('get-downloads', (event) => {
  event.returnValue = downloadsStorage.getDownloads();
});

ipcMain.on('clear-downloads', () => {
  downloadsStorage.clearDownloads();
});

ipcMain.on('show-download-in-folder', (event, downloadId) => {
  const idAsNumber = parseInt(downloadId, 10);
  const download = downloadsStorage.getDownloads().find(d => d.startTime === idAsNumber);
  if (download?.path) {
    require('electron').shell.showItemInFolder(download.path);
  }
});

ipcMain.on('cancel-download', (event, startTime) => {
  console.log(`Cancellation for ${startTime} requested, but not implemented yet.`);
});

ipcMain.on('get-normalized-user-agent', (event) => {
  event.returnValue = session.defaultSession.getUserAgent();
});

ipcMain.on('get-active-tab-id', (event) => {
  event.returnValue = true;
});

ipcMain.on('get-extensions', (event) => {
  event.returnValue = [];
});

ipcMain.on('set-extension-state', (event, id, enabled) => {
  event.returnValue = true;
});

// ── WebContentsView management IPC ───────────────────────────────────────────

// Renderer registers inject code strings once at startup
ipcMain.on('wcv-set-inject-code', (event, name, code) => {
  injectCodes[name] = code;
});

// Create a new tab WebContentsView and add it behind the chrome view
ipcMain.on('wcv-create', (event, tabId, url) => {
  if (tabViews.has(tabId)) return;

  const wcv = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, 'webview-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      session: getBrowserSession(),
    }
  });

  // Match the normalized UA so Google and other sites see real Chrome
  wcv.webContents.setUserAgent(session.defaultSession.getUserAgent());

  // Suppress Electron's built-in context-menu (which tries to open devtools
  // without a BrowserWindow).  Our webview-preload.js handles it via IPC.
  wcv.webContents.on('context-menu', (e) => e.preventDefault());

  // Add on top (no index) so tab renders above the BrowserWindow's chrome content
  mainWindow.contentView.addChildView(wcv);
  wcv.setVisible(false);

  const [w, h] = mainWindow.getContentSize();
  wcv.setBounds(getTabContentBounds(w, h));

  // Keep reverse map for IPC sender identification
  wcIdToTabId.set(wcv.webContents.id, tabId);

  // Intercept navigation to Google sign-in — trigger window.open() from within the WCV
  // so Chromium creates a native popup (window.opener set, proper context) rather than
  // an Electron main-process BrowserWindow which Google detects as an embedded app.
  // Auth providers that detect embedded browsers and need a native Chromium popup.
  // Pattern is matched against the full URL.
  const AUTH_URL_PATTERNS = [
    'accounts.google.com',
    'login.microsoftonline.com', 'login.live.com', 'login.microsoft.com',
    'appleid.apple.com', 'idmsa.apple.com',
    'github.com/login', 'github.com/session',
    'facebook.com/login', 'www.facebook.com/login',
    'twitter.com/i/oauth', 'x.com/i/oauth',
    'discord.com/login',
    'accounts.spotify.com',
    'linkedin.com/checkpoint', 'linkedin.com/login',
    'login.yahoo.com',
  ];

  const _seenAuthUrl = new Set();
  let _authReturnUrl = null;

  wcv.webContents.on('did-start-navigation', (details) => {
    const url = details.url || '';
    if (!details.isMainFrame) return;
    if (/logout|signout|sign-out/i.test(url)) return;
    if (!AUTH_URL_PATTERNS.some(p => url.includes(p))) return;
    // Dedup — same URL within 8s is already being handled
    if (_seenAuthUrl.has(url)) return;
    _seenAuthUrl.add(url);
    setTimeout(() => _seenAuthUrl.delete(url), 8000);

    // Save current page before we blank the tab
    const currentUrl = wcv.webContents.getURL();
    _authReturnUrl = (currentUrl && currentUrl !== 'about:blank') ? currentUrl : null;

    // Apply dark/light theme so the sign-in page matches the browser theme
    const darkThemes = ['dark', 'purple', 'blue', 'red', 'gekko'];
    const currentTheme = (settingsStorage.getSettings() || {}).theme || 'dark';
    nativeTheme.themeSource = darkThemes.includes(currentTheme) ? 'dark' : 'light';

    console.log('[AUTH-POPUP] intercepted', url.slice(0, 60), '— opening popup');

    // NEVER call stop()/loadURL() synchronously inside did-start-navigation — crashes Electron.
    setImmediate(() => {
      const safeUrl = url;
      wcv.webContents.loadURL('about:blank')
        .then(() => wcv.webContents.executeJavaScript(
          `window.open(${JSON.stringify(safeUrl)}, '_blank', 'width=520,height=680,resizable=yes')`
        ))
        .catch(e => console.log('[AUTH-POPUP] open error:', e.message));
    });
  });

  // ── Event forwarding to chrome renderer ──────────────────────────────────
  wcv.webContents.on('page-title-updated', (_, title) => {
    broadcastToChrome('wcv-title-updated', tabId, title);
  });

  wcv.webContents.on('page-favicon-updated', (_, favicons) => {
    broadcastToChrome('wcv-favicon-updated', tabId, favicons);
  });

  wcv.webContents.on('did-start-loading', () => {
    const pageUrl = wcv.webContents.getURL();
    if (pageUrl.includes('youtube.com') && injectCodes.youtube) {
      wcv.webContents.executeJavaScript(injectCodes.youtube).catch(() => {});
    }
    broadcastToChrome('wcv-loading-start', tabId);
  });

  wcv.webContents.on('did-stop-loading', () => {
    broadcastToChrome('wcv-loading-stop', tabId);
    broadcastToChrome('wcv-nav-state', tabId, {
      canGoBack: wcv.webContents.navigationHistory?.canGoBack() ?? wcv.webContents.canGoBack(),
      canGoForward: wcv.webContents.navigationHistory?.canGoForward() ?? wcv.webContents.canGoForward(),
    });
  });

  wcv.webContents.on('did-navigate', (_, navUrl) => {
    broadcastToChrome('wcv-navigated', tabId, navUrl);
    broadcastToChrome('wcv-nav-state', tabId, {
      canGoBack: wcv.webContents.navigationHistory?.canGoBack() ?? wcv.webContents.canGoBack(),
      canGoForward: wcv.webContents.navigationHistory?.canGoForward() ?? wcv.webContents.canGoForward(),
    });
  });

  wcv.webContents.on('did-navigate-in-page', (_, navUrl, isMainFrame) => {
    broadcastToChrome('wcv-navigated-in-page', tabId, navUrl, isMainFrame);
  });

  wcv.webContents.on('did-fail-load', (_, errCode, errDesc) => {
    if (errCode === -3) return; // Aborted (user navigated away)
    broadcastToChrome('wcv-fail-load', tabId, errCode, errDesc);
  });

  wcv.webContents.on('dom-ready', () => {
    if (injectCodes.fingerprint) {
      wcv.webContents.executeJavaScript(injectCodes.fingerprint).catch(() => {});
    }
    if (injectCodes.cosmeticJs) {
      wcv.webContents.executeJavaScript(injectCodes.cosmeticJs).catch(() => {});
    }
    if (injectCodes.cosmeticCss) {
      wcv.webContents.insertCSS(injectCodes.cosmeticCss).catch(() => {});
    }
    const pageUrl = wcv.webContents.getURL();
    if (pageUrl.includes('youtube.com') && injectCodes.youtube) {
      wcv.webContents.executeJavaScript(injectCodes.youtube).catch(() => {});
    }
    broadcastToChrome('wcv-dom-ready', tabId);
  });

  // New window requests — auth providers get a native Chromium popup, everything else
  // opens as a new tab in the browser chrome.
  wcv.webContents.setWindowOpenHandler(({ url: newUrl }) => {
    if (AUTH_URL_PATTERNS.some(p => newUrl.includes(p))) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 520,
          height: 680,
          autoHideMenuBar: true,
          webPreferences: {
            partition: 'persist:browser',
            preload: path.join(__dirname, 'google-popup-preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
          },
        },
      };
    }
    broadcastToChrome('wcv-new-window', tabId, newUrl);
    return { action: 'deny' };
  });

  // Auth popup lifecycle — works for Google, Microsoft, GitHub, etc.
  wcv.webContents.on('did-create-window', (popup, details) => {
    const isAuthPopup = AUTH_URL_PATTERNS.some(p => (details.url || '').includes(p));
    if (!isAuthPopup) return;

    // Track the auth domain so we know when the popup has left it (= sign-in done)
    const authDomain = new URL(details.url).hostname;

    popup.webContents.on('did-navigate', (_, navUrl) => {
      let navHost = '';
      try { navHost = new URL(navUrl).hostname; } catch (_) {}

      // Detect completion: popup navigated away from the auth domain
      if (navHost && navHost !== authDomain && !AUTH_URL_PATTERNS.some(p => navUrl.includes(p))) {
        const destination = navUrl || _authReturnUrl || 'gkp://home.gekko/';
        setTimeout(() => {
          nativeTheme.themeSource = 'system';
          if (!popup.isDestroyed()) popup.close();
          wcv.webContents.loadURL(destination).catch(() => {});
          _authReturnUrl = null;
        }, 500);
      }
    });

    popup.on('closed', () => {
      nativeTheme.themeSource = 'system';
      if (_authReturnUrl) {
        wcv.webContents.loadURL(_authReturnUrl).catch(() => {});
        _authReturnUrl = null;
      }
    });
  });

  tabViews.set(tabId, wcv);

  if (url) wcv.webContents.loadURL(url);
});

// Destroy a tab WebContentsView
ipcMain.on('wcv-destroy', (event, tabId) => {
  const wcv = tabViews.get(tabId);
  if (!wcv) return;
  wcIdToTabId.delete(wcv.webContents.id);
  try { mainWindow.contentView.removeChildView(wcv); } catch (_) {}
  try { wcv.webContents.close(); } catch (_) {}
  tabViews.delete(tabId);
});

// Load a URL in a tab — clear Google rejection cookies when navigating to accounts.google.com
ipcMain.on('wcv-navigate', (event, tabId, url) => {
  console.log('[WCV] navigate:', url);
  // Auth URLs typed directly in the address bar — the did-start-navigation handler
  // will intercept and open a popup once the WCV starts loading the URL.
  tabViews.get(tabId)?.webContents.loadURL(url);
});

ipcMain.on('wcv-go-back', (event, tabId) => {
  const wc = tabViews.get(tabId)?.webContents;
  if (!wc) return;
  const canGo = wc.navigationHistory?.canGoBack() ?? wc.canGoBack();
  if (canGo) wc.goBack();
});

ipcMain.on('wcv-go-forward', (event, tabId) => {
  const wc = tabViews.get(tabId)?.webContents;
  if (!wc) return;
  const canGo = wc.navigationHistory?.canGoForward() ?? wc.canGoForward();
  if (canGo) wc.goForward();
});

ipcMain.on('wcv-reload', (event, tabId) => {
  tabViews.get(tabId)?.webContents.reload();
});

ipcMain.on('wcv-stop', (event, tabId) => {
  tabViews.get(tabId)?.webContents.stop();
});

// Show one tab, hide all others
ipcMain.on('wcv-set-active', (event, tabId) => {
  const [w, h] = mainWindow.getContentSize();
  const bounds = getTabContentBounds(w, h);
  console.log('[WCV] set-active bounds:', JSON.stringify(bounds), 'currentChromeHeight:', currentChromeHeight);
  tabViews.forEach((wcv, id) => {
    const visible = id === tabId;
    wcv.setVisible(visible);
    if (visible) {
      wcv.setBounds(bounds);
      console.log('[WCV] tab actual bounds after set:', JSON.stringify(wcv.getBounds()));
    }
  });
});

// Split view: show two tabs side-by-side
ipcMain.on('wcv-set-split-view', (event, leftTabId, rightTabId) => {
  const [w, h] = mainWindow.getContentSize();
  tabViews.forEach((wcv, id) => {
    if (id === leftTabId) {
      wcv.setVisible(true);
      wcv.setBounds(getTabContentBounds(w, h, 'left'));
    } else if (id === rightTabId) {
      wcv.setVisible(true);
      wcv.setBounds(getTabContentBounds(w, h, 'right'));
    } else {
      wcv.setVisible(false);
    }
  });
});

// Renderer tells us how tall the chrome UI is so we position views below it
ipcMain.on('wcv-set-chrome-height', (event, height) => {
  currentChromeHeight = Math.max(0, Math.ceil(height));
  console.log('[WCV] chrome height set to', currentChromeHeight);
  const [w, h] = mainWindow.getContentSize();
  // Reposition any visible tab views to start below the chrome header
  tabViews.forEach((wcv) => {
    if (wcv.getVisible()) wcv.setBounds(getTabContentBounds(w, h));
  });
});

// Execute arbitrary JS in a tab (for theme injection, fingerprint etc.)
ipcMain.on('wcv-execute-js', (event, tabId, code) => {
  tabViews.get(tabId)?.webContents.executeJavaScript(code).catch(() => {});
});

// Insert CSS in a tab (cosmetic filters)
ipcMain.on('wcv-insert-css', (event, tabId, css) => {
  tabViews.get(tabId)?.webContents.insertCSS(css).catch(() => {});
});

// Synchronous queries
ipcMain.handle('wcv-get-url', (event, tabId) => {
  return tabViews.get(tabId)?.webContents.getURL() || null;
});

ipcMain.handle('wcv-can-go-back', (event, tabId) => {
  const wc = tabViews.get(tabId)?.webContents;
  if (!wc) return false;
  return wc.navigationHistory?.canGoBack() ?? wc.canGoBack();
});

ipcMain.handle('wcv-can-go-forward', (event, tabId) => {
  const wc = tabViews.get(tabId)?.webContents;
  if (!wc) return false;
  return wc.navigationHistory?.canGoForward() ?? wc.canGoForward();
});

// ── Window creation ───────────────────────────────────────────────────────────
const createWindow = () => {
  // BrowserWindow loads index.html (chrome UI) directly as its primary content.
  // Tab WebContentsViews are added ON TOP of it, positioned below the chrome height.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    show: false,
    icon: path.join(__dirname, 'assets/icons/icon.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // New-window from chrome UI → new tab
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    broadcastToChrome('open-new-tab', url);
    return { action: 'deny' };
  });

  // Prevent chrome DevTools from docking inside the window — always detach.
  let devToolsDetaching = false;
  mainWindow.webContents.on('devtools-opened', () => {
    if (devToolsDetaching) return;
    devToolsDetaching = true;
    mainWindow.webContents.closeDevTools();
    mainWindow.webContents.openDevTools({ mode: 'detach' });
    setTimeout(() => { devToolsDetaching = false; }, 500);
  });

  // On resize: reposition any visible tab views
  mainWindow.on('resize', () => {
    const [w, h] = mainWindow.getContentSize();
    tabViews.forEach((wcv) => {
      if (wcv.getVisible()) wcv.setBounds(getTabContentBounds(w, h));
    });
  });

  // Open DevTools for the currently visible tab WCV (detached window)
  ipcMain.on('open-tab-devtools', () => {
    tabViews.forEach((wcv) => {
      if (wcv.getVisible()) wcv.webContents.openDevTools({ mode: 'detach' });
    });
  });

  // Global shortcut: Ctrl+Shift+J → tab DevTools (works even when tab has focus)
  globalShortcut.register('CommandOrControl+Shift+J', () => {
    tabViews.forEach((wcv) => {
      if (wcv.getVisible()) wcv.webContents.openDevTools({ mode: 'detach' });
    });
  });

  // Window controls
  ipcMain.on('window-minimize',  () => mainWindow.minimize());
  ipcMain.on('window-maximize',  () => mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize());
  ipcMain.on('window-close',     () => mainWindow.close());
  ipcMain.on('window:minimize',  () => mainWindow.minimize());
  ipcMain.on('window:maximize',  () => mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize());
  ipcMain.on('window:close',     () => mainWindow.close());

  // Download handling — send updates to chrome UI
  session.defaultSession.on('will-download', (event, item) => {
    const isDev = process.env.NODE_ENV === 'development';
    const startTime = Date.now();
    const downloadPath = path.join(app.getPath('downloads'), item.getFilename());
    item.setSavePath(downloadPath);

    const sendUpdate = (stateOverride = null) => {
      const payload = {
        startTime,
        filename: item.getFilename(),
        state: stateOverride || item.getState(),
        receivedBytes: item.getReceivedBytes(),
        totalBytes: item.getTotalBytes(),
        path: downloadPath,
        url: item.getURL(),
        mimeType: item.getMimeType(),
      };
      if (isDev) console.log('[DOWNLOAD] update:', payload.state);
      broadcastToChrome('download-update', payload);
    };

    sendUpdate();
    item.on('updated', () => sendUpdate());
    item.on('done', (_, state) => {
      sendUpdate(state);
      downloadsStorage.addDownload({
        startTime,
        filename: item.getFilename(),
        totalBytes: item.getTotalBytes(),
        mimeType: item.getMimeType(),
        url: item.getURL(),
        path: downloadPath,
        state,
      });
    });
  });
};

// Load uBlock Origin browser extension before any windows are created
async function loadExtensions() {
  try {
    const ublockPath = path.join(__dirname, 'extensions', 'ublock');
    console.log(`[EXTENSIONS] Loading uBlock Origin from: ${ublockPath}`);
    const ext = await session.defaultSession.loadExtension(ublockPath, { allowFileAccess: true, keepAlive: true });
    console.log(`[EXTENSIONS] uBlock Origin loaded:`, ext ? ext.name : 'Unknown');
  } catch (error) {
    console.error('[EXTENSIONS] Failed to load uBlock Origin:', error);
  }
}

app.whenReady().then(async () => {
  const { screen } = require('electron');
  const display = screen.getPrimaryDisplay();
  console.log('[WCV] display scaleFactor:', display.scaleFactor, 'bounds:', JSON.stringify(display.bounds), 'workAreaSize:', JSON.stringify(display.workAreaSize));
  await loadExtensions();
  setupTrackerBlocking();
  setupFingerprintProtection();
  registerProtocolHandlers([getBrowserSession()]);

  historyStorage.ensureHistoryFile();
  settingsStorage.ensureSettingsFile();
  bookmarksStorage.ensureBookmarksFile();
  downloadsStorage.ensureDownloadsFile();
  clippingsStorage.ensureClippingsFile();
  workspacesStorage.ensureWorkspacesFile();
  sessionStorage.ensureSessionFile();
  credentialsStorage.ensureFile();

  createWindow();
  setupAutoUpdater();

  app.on('activate', () => {
    if (BaseWindow.getAllWindows().length === 0) createWindow();
  });

  setTimeout(() => {
    log.info('Checking for updates...');
    autoUpdater.checkForUpdates();
  }, 3000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

function setupAutoUpdater() {
  let updateStatus = { status: 'unknown', info: null };

  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for update...');
    updateStatus = { status: 'checking', info: null };
    broadcastToChrome('update-status', 'checking');
  });

  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info.version);
    updateStatus = { status: 'available', info };
    broadcastToChrome('update-status', 'available', info);
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      buttons: ['Download Now', 'Later'],
      title: 'Update Available',
      message: `A new version (${info.version}) of Gekko Browser is available!`,
      detail: 'Would you like to download it now?'
    }).then((r) => { if (r.response === 0) autoUpdater.downloadUpdate(); });
  });

  autoUpdater.on('update-not-available', (info) => {
    log.info('No updates available');
    updateStatus = { status: 'not-available', info };
    broadcastToChrome('update-status', 'not-available');
    if (info.explicitCheck) {
      dialog.showMessageBox(mainWindow, {
        type: 'info', title: 'No Updates Available',
        message: 'You are already running the latest version of Gekko Browser.',
        buttons: ['OK']
      });
    }
  });

  autoUpdater.on('error', (err) => {
    log.error('Error in auto-updater:', err);
    updateStatus = { status: 'error', info: err };
    broadcastToChrome('update-status', 'error', err);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    log.info(`Download progress: ${progressObj.percent}%`);
    updateStatus = { status: 'progress', info: progressObj };
    broadcastToChrome('update-status', 'progress', progressObj);
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded:', info.version);
    updateStatus = { status: 'downloaded', info };
    broadcastToChrome('update-status', 'downloaded', info);
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      buttons: ['Restart Now', 'Later'],
      title: 'Update Ready',
      message: `A new version (${info.version}) has been downloaded`,
      detail: 'Restart the app to apply the updates.'
    }).then((r) => { if (r.response === 0) autoUpdater.quitAndInstall(); });
  });

  autoUpdater.getStatus = () => updateStatus;
}
