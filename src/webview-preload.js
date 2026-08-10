const { contextBridge, ipcRenderer, webFrame } = require("electron");

// Inject critical overrides into the main world BEFORE any page scripts run.
try {
  webFrame.executeJavaScript(`(function(){
    // Hide Node.js/Electron globals — Google checks window.process to detect Electron
    try { Object.defineProperty(window,"process",{value:undefined,writable:false,configurable:false}); } catch(_){}
    try { Object.defineProperty(window,"require",{value:undefined,writable:false,configurable:false}); } catch(_){}
    try { Object.defineProperty(window,"global",{value:undefined,writable:false,configurable:false}); } catch(_){}
    // Fix navigator.userAgentData — uaFullVersion must be the REAL full version, not "X.0.0.0"
    try {
      var _ua=navigator.userAgent,_ci=_ua.indexOf("Chrome/"),_fv=_ci>=0?_ua.slice(_ci+7).split(" ")[0]:"136.0.7103.115";
      var _mv=_fv.split(".")[0];
      var _b=[{brand:"Google Chrome",version:_mv},{brand:"Not)A;Brand",version:"8"},{brand:"Chromium",version:_mv}];
      var _fb=[{brand:"Google Chrome",version:_fv},{brand:"Not)A;Brand",version:"8.0.0.0"},{brand:"Chromium",version:_fv}];
      var _ud={brands:_b,mobile:false,platform:"Windows",
        getHighEntropyValues:function(h){
          var r={brands:_b,mobile:false,platform:"Windows"};
          if(h.indexOf("architecture")!==-1)r.architecture="x86";
          if(h.indexOf("bitness")!==-1)r.bitness="64";
          if(h.indexOf("platformVersion")!==-1)r.platformVersion="15.0.0";
          if(h.indexOf("uaFullVersion")!==-1)r.uaFullVersion=_fv;
          if(h.indexOf("fullVersionList")!==-1)r.fullVersionList=_fb;
          if(h.indexOf("wow64")!==-1)r.wow64=false;
          if(h.indexOf("model")!==-1)r.model="";
          return Promise.resolve(r);
        },
        toJSON:function(){return{brands:_b,mobile:false,platform:"Windows"};}
      };
      Object.defineProperty(Navigator.prototype,"userAgentData",{get:function(){return _ud;},configurable:true});
    } catch(_){}
    // Spoof window outer dimensions — in a real browser outerHeight = innerHeight + chrome (~140px).
    // In a WCV the content IS the window so outerHeight === innerHeight, which is a strong signal.
    try {
      Object.defineProperty(window,"outerHeight",{get:function(){return window.innerHeight+140;},configurable:true});
      Object.defineProperty(window,"outerWidth",{get:function(){return window.innerWidth;},configurable:true});
    } catch(_){}
    // screenX/screenY should reflect a real browser window position on screen
    try {
      Object.defineProperty(window,"screenX",{get:function(){return 0;},configurable:true});
      Object.defineProperty(window,"screenY",{get:function(){return 0;},configurable:true});
      Object.defineProperty(window,"screenLeft",{get:function(){return 0;},configurable:true});
      Object.defineProperty(window,"screenTop",{get:function(){return 0;},configurable:true});
    } catch(_){}
    // Hide webdriver
    try { Object.defineProperty(navigator,"webdriver",{get:()=>false,configurable:true}); } catch(_){}
    // Reject passkey (publicKey) credential requests — keeps PublicKeyCredential defined but prevents OS dialogs
    try {
      var _cg = navigator.credentials&&navigator.credentials.get?navigator.credentials.get.bind(navigator.credentials):null;
      if (_cg) Object.defineProperty(navigator.credentials,"get",{value:function(o){
        if(o&&o.publicKey) return Promise.reject(new DOMException("Not supported","NotSupportedError"));
        return _cg(o);
      },configurable:true});
    } catch(_){}
    // Spoof navigator.plugins — empty plugins array is a strong Electron signal
    try {
      if(navigator.plugins.length===0){
        var fp=[
          {name:"PDF Viewer",filename:"internal-pdf-viewer",description:"Portable Document Format"},
          {name:"Chrome PDF Viewer",filename:"internal-pdf-viewer",description:"Portable Document Format"},
          {name:"Chromium PDF Viewer",filename:"internal-pdf-viewer",description:"Portable Document Format"},
          {name:"Microsoft Edge PDF Viewer",filename:"internal-pdf-viewer",description:"Portable Document Format"},
          {name:"WebKit built-in PDF",filename:"internal-pdf-viewer",description:"Portable Document Format"}
        ];
        Object.defineProperty(Navigator.prototype,"plugins",{get:function(){
          var a=Object.assign([],fp);a.item=function(i){return fp[i]||null;};
          a.namedItem=function(n){return fp.find(function(p){return p.name===n;})||null;};
          a.refresh=function(){};return a;
        },configurable:true});
      }
    } catch(_){}
  })()`);
} catch (_) {}

const buildContextMenuPayload = (event) => {
  const target = event.target;
  const tagName = target?.tagName || "";
  const tagNameLower = tagName ? tagName.toLowerCase() : "";
  const linkElement = target?.closest ? target.closest("a[href]") : null;
  const imageElement = target?.closest ? target.closest("img") : null;
  const imageSrc = imageElement?.currentSrc || imageElement?.src || "";

  return {
    context: "page",
    x: event.x,
    y: event.y,
    target: {
      tagName,
      src: target?.src || "",
      href: target?.href || "",
      text: target?.innerText || ""
    },
    page: {
      url: window.location.href || "",
      title: document.title || ""
    },
    selectionText: window.getSelection ? window.getSelection().toString() : "",
    isEditable: Boolean(target?.isContentEditable) || tagNameLower === "input" || tagNameLower === "textarea",
    link: linkElement ? { href: linkElement.href, text: (linkElement.textContent || "").trim() } : null,
    image: imageSrc ? { src: imageSrc, alt: (imageElement?.alt || "").trim() } : null
  };
};

// Log that the preload script is running
console.log("Webview preload script executing");

// Navigation API
const navigationAPI = {
  navigate: (url) => {
    console.log('Navigation requested via API to:', url);
    ipcRenderer.send('navigate', url);
  },
  handleNavigation: (url) => {
    console.log('Navigation handled via API:', url);
    ipcRenderer.send('navigate', url);
  }
};

// Expose navigation API to renderer
contextBridge.exposeInMainWorld('navigationAPI', navigationAPI);

// Log which file is being loaded in the webview
console.log('Preload: Loading webview for URL:', window.location.href);

// API exposed to webviews
contextBridge.exposeInMainWorld("api", {
  // Theme
  getThemes: () => {
    try {
      return ipcRenderer.sendSync('get-themes');
    } catch (error) {
      console.error('Error getting themes:', error);
      return {};
    }
  },

  // Settings
  getSettings: () => {
    console.group('Get Settings');
    try {
      const settings = ipcRenderer.sendSync("get-settings");
      console.log('Got settings:', settings);
      if (!settings || settings._error) {
        console.log('Using default settings');
        console.groupEnd();
        return { theme: 'dark' };
      }
      console.groupEnd();
      return settings;
    } catch (error) {
      console.error("Error getting settings:", error);
      console.groupEnd();
      return { theme: "dark" };
    }
  },
  onSettingsUpdated: (callback) => {
    ipcRenderer.on('settings-updated', (event, settings) => {
      callback(settings);
    });
  },

  // History management
  getHistory: () => {
    try {
      return ipcRenderer.sendSync('get-history');
    } catch (error) {
      console.error('Error getting history:', error);
      return [];
    }
  },
  
  clearHistory: () => {
    ipcRenderer.send('clear-history');
  },
  
  getIncognitoMode: () => {
    try {
      return ipcRenderer.sendSync('get-incognito-mode');
    } catch (error) {
      console.error('Error getting incognito mode:', error);
      return false;
    }
  },
  
  // Bookmarks management
  getBookmarks: () => {
    try {
      return ipcRenderer.sendSync('get-bookmarks');
    } catch (error) {
      console.error('Error getting bookmarks:', error);
      return [];
    }
  },
  
  addBookmark: (url, title, favicon) => {
    ipcRenderer.send('add-bookmark', url, title, favicon);
  },
  
  removeBookmark: (url) => {
    ipcRenderer.send('remove-bookmark', url);
  },
  
  isBookmarked: (url) => {
    try {
      return ipcRenderer.sendSync('is-bookmarked', url);
    } catch (error) {
      console.error('Error checking bookmark status:', error);
      return false;
    }
  },

  onBookmarksUpdated: (callback) => {
    ipcRenderer.on('bookmarks-updated', (event, bookmarks) => {
      callback(bookmarks);
    });
  },

  // Clippings management
  getClippings: () => {
    try {
      return ipcRenderer.sendSync('get-clippings');
    } catch (error) {
      console.error('Error getting clippings:', error);
      return [];
    }
  },

  addClipping: (clipping) => {
    ipcRenderer.send('add-clipping', clipping);
  },

  removeClipping: (clipId) => {
    ipcRenderer.send('remove-clipping', clipId);
  },

  clearClippings: () => {
    ipcRenderer.send('clear-clippings');
  },

  onClippingsUpdated: (callback) => {
    ipcRenderer.on('clippings-updated', (event, clippings) => {
      callback(clippings);
    });
  },

  // Workspaces management
  getWorkspaces: () => {
    try {
      return ipcRenderer.sendSync('get-workspaces');
    } catch (error) {
      console.error('Error getting workspaces:', error);
      return [];
    }
  },

  addWorkspace: (workspace) => {
    ipcRenderer.send('add-workspace', workspace);
  },

  removeWorkspace: (workspaceId) => {
    ipcRenderer.send('remove-workspace', workspaceId);
  },

  clearWorkspaces: () => {
    ipcRenderer.send('clear-workspaces');
  },

  openWorkspace: (workspaceId) => {
    ipcRenderer.send('open-workspace', workspaceId);
  },

  onWorkspacesUpdated: (callback) => {
    ipcRenderer.on('workspaces-updated', (event, workspaces) => {
      callback(workspaces);
    });
  },

  onWorkspaceOpen: (callback) => {
    ipcRenderer.on('open-workspace', (event, workspace) => {
      callback(workspace);
    });
  },

  setSetting: (key, value) => {
    console.group('Set Setting');
    console.log("Setting", key, "to:", value);
    try {
      // Send to main process first
      ipcRenderer.send("set-setting", key, value);
      
      // Then apply locally if it's a theme
      if (key === "theme") {
        document.documentElement.setAttribute('data-theme', value);
        document.body.setAttribute('data-theme', value);
        
        // Notify parent window
        window.parent.postMessage({ type: 'themeChange', theme: value }, '*');
      }
      
      console.log('Setting updated successfully');
      console.groupEnd();
      return true;
    } catch (error) {
      console.error("Error setting setting:", error);
      console.groupEnd();
      return false;
    }
  },

  // Theme management
  applyTheme: (theme) => {
    console.group('Apply Theme');
    console.log('Applying theme:', theme);
    try {
      // First save the setting
      const success = ipcRenderer.sendSync('set-setting', 'theme', theme);
      console.log('Theme saved:', success);
      
      // Then apply locally
      document.documentElement.setAttribute('data-theme', theme);
      document.body.setAttribute('data-theme', theme);
      
      // Send the theme change to main process
      ipcRenderer.send('apply-theme', theme);
      console.log('Theme change sent to main process');
      
      // Notify parent window
      window.parent.postMessage({ type: 'themeChange', theme: theme }, '*');
      console.log('Theme change notified to parent');
      
      console.log('Theme applied successfully');
      console.groupEnd();
      return true;
    } catch (error) {
      console.error('Error applying theme:', error);
      console.groupEnd();
      return false;
    }
  },
  
  // Updates management
  getAppVersion: () => {
    try {
      return ipcRenderer.sendSync('get-app-version');
    } catch (error) {
      console.error('Error getting app version:', error);
      return 'Unknown';
    }
  },
  
  checkForUpdates: () => {
    ipcRenderer.send('check-for-updates');
  },
  
  downloadUpdate: () => {
    ipcRenderer.send('download-update');
  },
  
  installUpdate: () => {
    ipcRenderer.send('install-update');
  },
  
  getUpdateStatus: () => {
    try {
      return ipcRenderer.invoke('get-update-status');
    } catch (error) {
      console.error('Error getting update status:', error);
      return { status: 'error', info: { message: 'Failed to get update status' } };
    }
  },
  
  onUpdateStatus: (callback) => {
    ipcRenderer.on('update-status', (event, status, info) => {
      callback(status, info);
    });
  },
  getSetting: (key) => {
    console.log('Calling getSetting with key:', key);
    return ipcRenderer.invoke('get-setting', key);
  },
  
  setSetting: (key, value) => {
    console.log('Calling setSetting with key:', key, 'and value:', value);
    try {
      ipcRenderer.send('set-setting', key, value);
      return true;
    } catch (error) {
      console.error('Error in setSetting:', error);
      return false;
    }
  },

  pickHomeBackground: () => ipcRenderer.invoke('pick-home-background'),
  
  // Additional debug method to see what API methods are available
  getAvailableMethods: () => {
    return {
      apiMethods: [
        'getSettings', 'getThemes', 'applyTheme', 
        'getHistory', 'getBookmarks', 'addBookmark', 'removeBookmark', 'isBookmarked',
        'getClippings', 'addClipping', 'removeClipping', 'clearClippings',
        'getWorkspaces', 'addWorkspace', 'removeWorkspace', 'clearWorkspaces',
        'getAppVersion', 'checkForUpdates', 'downloadUpdate', 'installUpdate', 
        'getUpdateStatus', 'onUpdateStatus', 'getSetting', 'setSetting'
      ],
      hasGetSettings: typeof ipcRenderer.sendSync === 'function',
      hasSetSetting: typeof ipcRenderer.send === 'function',
      hasGetSetting: typeof ipcRenderer.invoke === 'function'
    };
  },
  
  // Downloads
  onDownloadUpdate: (callback) => ipcRenderer.on('download-update', (event, item) => callback(item)),
  getDownloads: () => ipcRenderer.sendSync('get-downloads'),
  clearDownloads: () => ipcRenderer.send('clear-downloads'),
  cancelDownload: (startTime) => ipcRenderer.send('cancel-download', startTime),
  showDownloadInFolder: (startTime) => ipcRenderer.send('show-download-in-folder', startTime),

  // Google auth popup (called by renderer when /rejected is detected)
  openGoogleAuthPopup: (url) => ipcRenderer.send('open-google-auth-popup', url),

  // Credentials (used by passwords.gekko manager page)
  credentialsGetAll: () => ipcRenderer.invoke('credentials-get-all'),
  credentialsDelete: (id) => ipcRenderer.invoke('credentials-delete', id),
  credentialsUpdate: (id, data) => ipcRenderer.invoke('credentials-update', id, data),
  credentialsGetDecrypted: (id) => ipcRenderer.invoke('credentials-get-decrypted', id),
});

// ── Credentials: autofill + capture ──────────────────────────────────────────

(function initCredentials() {
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

  // Method 2a: button/link click with a filled password present.
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

  // Method 3: SPA navigation with a filled login form.
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

  // ── MutationObserver — re-detect when SPA injects a login form ───────────
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

// ─────────────────────────────────────────────────────────────────────────────

// Listen for context menu requests
window.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  const payload = buildContextMenuPayload ? buildContextMenuPayload(event) : null;
  if (payload) {
    ipcRenderer.send('show-context-menu', payload);
  }
});

// Forward theme change notifications from the host/main process into the page
try {
  ipcRenderer.on('webview-theme-changed', (event, theme) => {
    try {
      window.postMessage({ type: 'themeChange', theme }, '*');
    } catch (e) {
      console.warn('Failed to forward webview-theme-changed to page', e);
    }
  });

  ipcRenderer.on('theme-changed', (event, theme) => {
    try {
      window.postMessage({ type: 'themeChange', theme }, '*');
    } catch (e) {
      console.warn('Failed to forward theme-changed to page', e);
    }
  });
} catch (e) {
  console.warn('Error setting up theme forwarding in webview preload:', e);
}

