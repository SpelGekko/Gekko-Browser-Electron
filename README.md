
# Gekko Browser

<p align="center">
  <img src="assets/icons/256x256.png" alt="Gekko Browser Logo" width="128" height="128">
</p>

A modern, sleek web browser built with Electron, featuring custom GKP and GKPS protocols.

## Features

- Custom GKP and GKPS protocols for secure internal browsing
- Full HTTP/HTTPS support for web browsing
- Tab-based browsing with dynamic tab management
- Persistent browsing history (file-based, incognito mode supported)
- Bookmarks management with drag-and-drop reordering
- Customizable themes (dark, light, purple, blue, red)
- Settings persistence between sessions
- Downloads manager with progress and history
- Built-in extension support (uBlock Origin included)
- Multiple search engines (Google, Bing, DuckDuckGo, Yahoo)
- Internal pages for settings, bookmarks, history, downloads, and more

## Getting Started

### Prerequisites

- Node.js (latest LTS version)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/SpelGekko/Gekko-Browser-Electron.git

# Navigate to the project directory
cd Gekko-Browser-Electron

# Install dependencies
npm install
```

### Running

```bash
npm start
```

### Building

```bash
# Package the application
npm run package

# Make distributable
npm run make
```

## Usage

- **Address Bar**: Enter URLs to navigate (supports http://, https://, gkp://, and gkps:// protocols)
- **Navigation Controls**: Back, Forward, Refresh, Home
- **Tab Management**: New tab, close tab, switch between tabs
- **Bookmarks**: Save, organize, and reorder your favorite websites
- **History**: View, search, and clear browsing history; incognito mode disables history
- **Downloads**: Track download progress, show in folder, clear history
- **Settings**: Customize browser behavior, search engine, and appearance
- **Themes**: Instantly switch between multiple color themes
- **Extensions**: uBlock Origin included by default (see `extensions/ublock/`)

## Internal Pages

- `gkp://home.gekko/` - Home page with search and shortcuts
- `gkp://about.gekko/` - About page with browser information
- `gkp://bookmarks.gekko/` - Manage your bookmarks
- `gkp://history.gekko/` - View your browsing history
- `gkp://settings.gekko/` - Configure browser settings
- `gkp://downloads.gekko/` - Downloads manager
- `gkp://protocols.gekko/` - Protocol documentation
- `gkps://secure.gekko/` - Secure content demo
- `gkp://update.gekko/` - Update status and controls

## Custom Protocols

- **GKP**: Internal protocol for demo and browser pages (`gkp://<domain>.<tld>/`)
- **GKPS**: Secure variant with additional security headers (`gkps://<domain>.<tld>/`)
- Supported TLDs: `.gekko`, `.rust`, `.kewl`
- Protocol handlers enforce strict CSP and serve only whitelisted content

## Technical Stack

- **Electron** - Cross-platform desktop application framework
- **Node.js** - JavaScript runtime
- **HTML/CSS/JavaScript** - Frontend technologies
- **electron-forge** - Application packaging and distribution
- **electron-store** - Settings and data persistence
- **uBlock Origin** - Built-in ad blocker extension

## Project Structure

- `src/index.js` - Main process: app lifecycle, IPC, window creation, updater, storage
- `src/preload.js` - Secure context bridge for renderer API
- `src/renderer.js` - UI rendering and interactions
- `src/protocol-handlers.js` - Custom protocol implementation (GKP/GKPS)
- `src/history-storage.js`, `src/settings-storage.js`, `src/bookmarks-storage.js`, `src/downloads-storage.js` - File-based persistent storage modules
- `src/themes.js` - Theme definitions and utilities
- `src/demo_sites/` - Internal browser pages (home, about, bookmarks, history, settings, downloads, update, etc.)
- `extensions/ublock/` - uBlock Origin extension files
- `assets/` - Icons and other resources

## Security & Privacy

- Context isolation and no node integration in renderer
- Strict Content Security Policy (CSP) for all internal pages
- Incognito mode disables history recording
- Secure protocol (GKPS) enforces HSTS and additional headers
- All persistent data stored locally in user profile

## Recent Updates

- Improved history and downloads storage with file-based persistence
- Enhanced theme system with better synchronization and more themes
- Added downloads manager and uBlock Origin extension support
- Improved error handling and security for protocol handlers

## License

This project is licensed under the GNU General Public License v3.0 or later (GPL-3.0-or-later).
