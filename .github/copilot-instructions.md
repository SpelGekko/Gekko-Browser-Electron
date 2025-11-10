## Gekko Browser — Copilot instructions (concise)

This file contains targeted, actionable guidance to help an AI coding agent be productive in this repository.

1. Quick project summary
   - Electron desktop browser (main: `src/index.js`). Custom protocols (GKP/GKPS) implemented in `src/protocol-handlers.js` and internal demo pages in `src/demo_sites/`.
   - Persistent data lives in small storage modules: `src/history-storage.js`, `src/settings-storage.js`, `src/bookmarks-storage.js`.

2. Big-picture architecture / responsibilities
   - Main process: `src/index.js` — app lifecycle, `ipcMain` handlers, window creation, auto-updater wiring, global broadcasts (settings/theme/bookmarks/navigation).
   - Renderer layer: UI and webviews live under `src/demo_sites/` and `src/renderer.js` + `src/preload.js` (look for `contextIsolation: true` and `webviewTag: true` in `createWindow`).
   - Storage modules: small, focused modules responsible for file-backed persistence; main process calls `ensure*File()` on startup to initialize storage files.

3. Key integration & IPC patterns (use these channels exactly)
   - Settings & theme: `set-setting`, `get-settings`, `get-setting`, `apply-theme`, `get-themes`, `settings-updated`, `theme-changed`, `webview-theme-changed`.
     - Note: `apply-theme` uses an in-memory `lastAppliedTheme`, a `themeChangeLock` and a retry/verify save pattern (3 tries, small delays). Preserve that locking behavior when modifying theme code.
   - Navigation & tabs: `navigate`, `navigate-from-main` (main -> renderer), `get-active-tab-id` (main returns true placeholder).
   - History: `get-history`, `add-history`, `clear-history`, `toggle-incognito-mode`, `get-incognito-mode`.
   - Bookmarks: `get-bookmarks`, `add-bookmark`, `remove-bookmark`, `is-bookmarked`, `update-bookmarks-order`, `bookmarks-updated`.
   - Updates: `check-for-updates`, `download-update`, `install-update`, `open-update-page`, `get-update-status`, `update-status` events.

4. Build / run / package commands (observed in `package.json`)
   - Install deps: `npm install`
   - Run in dev: `npm start` (runs `electron-forge start`). To force devtools, set `NODE_ENV=development` or enable `settings.enableDevTools` in `src/settings-storage.js`.
   - Package: `npm run package`
   - Make installers: `npm run make`
   - Publish (electron-forge): `npm run publish`

5. Project-specific conventions & pitfalls
   - Strict renderer security: windows created with `nodeIntegration: false` and `contextIsolation: true`. Use the `preload.js` to expose safe APIs.
   - Webviews are used (see `webviewTag: true`) — they receive theme broadcasts via `webview-theme-changed`. When touching theme code update both `window.webContents.send('theme-changed', ...)` and `webview-theme-changed` notifications.
   - Auto-updater: configured with `autoDownload = false` and manual flow. Changes to updater behavior should preserve user prompts (dialog boxes are used in `src/index.js`).
   - Settings persistence: settings are cached in-memory (`cachedSettings`). Settings storage operations are synchronous in main handlers (they use returnValue). Preserve sync behavior unless updating all call sites.

6. Files to inspect first for implementation examples
   - `src/index.js` — main process patterns and many channel names (recently edited; primary source of truth for IPC names).
   - `src/preload.js` — bridge API to the renderer (how renderer calls main IPC channels).
   - `src/protocol-handlers.js` — custom protocol registration and routing for `gkp://` and `gkps://`.
   - `src/*-storage.js` — storage APIs and `ensure*File()` patterns.
   - `src/demo_sites/*` — sample pages showing how the renderer listens for the channels above.

7. Example code patterns to follow (copy exact strings)
   - Channel names: `set-setting`, `apply-theme`, `navigate`, `get-history`, `get-bookmarks`, `check-for-updates`, `download-update`.
   - Theme lock constants: `THEME_LOCK_TIMEOUT`, `themeChangeLock`, `lastAppliedTheme` (match semantics when editing theme logic).

8. Tests / CI
   - No tests or CI files discovered — be conservative and run `npm start` locally after edits. If you add tests, pick a lightweight framework and include `npm test` script.

9. When changing behavior in main process
   - Restart the app (stop `npm start`, run again). Inspect logs via the console or `electron-log` (already used for auto-updates).
   - Keep synchronous IPC return behaviors (`event.returnValue = ...`) unchanged unless you update both main and renderer call sites.


10. Renderer API surface (`window.api` from `src/preload.js`)
    - All renderer code should use the `window.api` object for IPC and browser actions. Key methods:
       - Settings & theme:
          - `getSettings()` → returns current settings (sync)
          - `setSetting(key, value)` → update a setting (sync)
          - `onSettingsUpdated(callback)` → listen for settings changes
          - `getThemes()` → returns available themes
          - `applyTheme(themeId)` → request theme change
          - `onThemeChanged(callback)` → listen for theme changes
       - Navigation:
          - `navigate(url)` → request navigation
          - `onNavigate(callback)` → listen for navigation events from main
          - `openUpdatePage()` → open the update page
          - `getActiveTabId()` → returns true (placeholder)
       - History:
          - `getHistory()` → returns browsing history
          - `addToHistory({url, title})` → add entry
          - `clearHistory()` → clear all history
          - `toggleIncognitoMode()` / `getIncognitoMode()` → incognito state
       - Bookmarks:
          - `getBookmarks()` → returns bookmarks
          - `addBookmark(url, title, favicon)` / `removeBookmark(url)`
          - `isBookmarked(url)` → returns boolean
       - Updates:
          - `getAppVersion()` → returns app version
          - `checkForUpdates()`, `downloadUpdate()`, `installUpdate()`
          - `getUpdateStatus()` → returns update status (async)
          - `onUpdateStatus(callback)` → listen for update status events
       - Window controls: `minimize()`, `maximize()`, `close()`
    - Example usage:
       ```js
       // Get settings
       const settings = window.api.getSettings();
       // Listen for theme changes
       window.api.onThemeChanged(theme => { /* ... */ });
       // Navigate to a URL
       window.api.navigate('https://example.com');
       ```

11. Storage module APIs (main process, see `src/*-storage.js`)
    - `settings-storage.js`:
       - `getSettings()`, `setSetting(key, value)`, `ensureSettingsFile()`, `defaultSettings`
       - Settings are cached in-memory; always use `ensureSettingsFile()` on startup.
    - `history-storage.js`:
       - `getHistory()`, `addHistoryEntry(url, title)`, `clearHistory()`, `ensureHistoryFile()`, `toggleIncognitoMode()`, `getIncognitoMode()`
       - Incognito disables history writes; history is capped at 1000 entries.
    - `bookmarks-storage.js`:
       - `getBookmarks()`, `addBookmark(url, title, favicon)`, `removeBookmark(url)`, `isBookmarked(url)`, `updateBookmarksOrder(orderedUrls)`, `ensureBookmarksFile()`
       - Bookmarks are stored as an array of `{url, title, favicon, timestamp}`.
    - Example usage (main process):
       ```js
       // Ensure files exist on startup
       settingsStorage.ensureSettingsFile();
       historyStorage.ensureHistoryFile();
       bookmarksStorage.ensureBookmarksFile();
       // Get and update settings
       const settings = settingsStorage.getSettings();
       settingsStorage.setSetting('theme', 'dark');
       // Add a history entry
       historyStorage.addHistoryEntry('https://example.com', 'Example');
       // Add a bookmark
       bookmarksStorage.addBookmark('https://foo.com', 'Foo', '');
       ```

---

---
Please review and tell me any missing patterns or channels you'd like included.
