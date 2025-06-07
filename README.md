# Gekko Browser

<p align="center">
  <img src="assets/icons/256x256.png" alt="Gekko Browser Logo" width="128" height="128">
</p>

A modern, sleek web browser built with Electron, featuring custom GKP and GKPS protocols.

## Features

- Custom GKP and GKPS protocols for secure internal browsing
- Full HTTP/HTTPS support for web browsing
- Tab-based browsing with easy management
- Persistent browsing history
- Bookmarks management
- Customizable themes
- Settings persistence between sessions
- Support for multiple search engines

## Getting Started

### Prerequisites

- Node.js (latest LTS version)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/gekko-browser.git

# Navigate to the project directory
cd gekko-browser

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
- **Navigation Controls**:
  - Back button
  - Forward button
  - Refresh button
  - Home button
- **Tab Management**:
  - New tab button
  - Close tab button
  - Switch between tabs
- **Bookmarks**: Save and organize your favorite websites
- **Settings**: Customize browser behavior and appearance
- **Themes**: Change the look and feel of your browser

## Demo Pages

- `gkp://home.gekko/` - Home page with search and shortcuts
- `gkp://about.gekko/` - About page with browser information
- `gkp://bookmarks.gekko/` - Manage your bookmarks
- `gkp://history.gekko/` - View your browsing history
- `gkp://settings.gekko/` - Configure browser settings
- `gkps://secure.gekko/` - Secure content demo

## Technical Stack

- **Electron** - Cross-platform desktop application framework
- **Node.js** - JavaScript runtime
- **HTML/CSS/JavaScript** - Frontend technologies
- **electron-forge** - Application packaging and distribution
- **electron-store** - Settings and data persistence

## Project Structure

- `src/index.js` - Main application entry point
- `src/renderer.js` - UI rendering and interactions
- `src/protocol-handlers.js` - Custom protocol implementation
- `src/theme-manager.js` - Theme management
- `src/demo_sites/` - Internal browser pages
- `assets/` - Icons and other resources

## Recent Updates

- Improved history storage with file-based persistence
- Enhanced theme system with better synchronization
- Implemented settings storage for persistence between sessions
- Added better error handling throughout the application

## License

This project is licensed under the MIT License.
