# Gekko Browser

A lightweight, experimental web browser built with Rust.

## Features

- Custom GKP and GKPS protocols for demo browsing
- HTTP/HTTPS support for real web browsing
- Tab-based browsing
- Navigation history (back/forward)
- Hyperlink support
- Basic HTML rendering

## Getting Started

### Prerequisites

- Rust and Cargo (latest stable)

### Building

```
cargo build
```

For release version:

```
cargo build --release
```

### Running

```
cargo run
```

## Usage

- Address Bar: Enter URLs to navigate (supports http://, https://, gkp://, and gkps:// protocols)
- Navigation Controls:
  - Back button (←)
  - Forward button (→)
  - Refresh button (🔄)
- Tab Management:
  - Click "+" to create a new tab
  - Click "✕" on a tab to close it
- Clickable Links: Click on blue underlined text to follow hyperlinks

## Demo Pages

- `gkp://home.gekko/` - Home page
- `gkp://about.gekko/` - About page
- `gkps://secure.gekko/` - Secure content demo

## Technical Stack

- Rust - Core programming language
- egui - Immediate mode GUI framework
- tl - HTML parsing library
- tokio - Asynchronous runtime
- reqwest - HTTP client

## Project Structure

- `src/main.rs` - Main application and UI
- `src/browser.rs` - HTML rendering
- `src/protocol.rs` - URL fetching and protocol handling
- `demo_sites/` - Demo HTML files

## Known Limitations

- Basic HTML rendering without CSS support
- Limited JavaScript support
- Simple tab management
- No developer tools
- Limited caching

## License

This project is open-source software.
