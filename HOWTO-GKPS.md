# How to Use GKP and GKPS Protocols in Gekko Browser

<p align="center">
  <img src="assets/icons/128x128.png" alt="Gekko Browser Logo" width="64" height="64">
</p>

The Gekko Protocol (GKP) and its secure variant (GKPS) are specialized protocols for accessing internal browser resources. This guide explains how to use them effectively within Gekko Browser.

## Basic URL Structure

GKP URLs follow this format:
```
gkp://<domain>.gekko/[path][file][parameters]
```

For secure connections, use GKPS:
```
gkps://<domain>.gekko/[path][file][parameters]
```

## Available Internal Domains

Gekko Browser comes with several built-in domains:

1. `home.gekko` - Browser home page with search and shortcuts
2. `about.gekko` - Information about the browser
3. `bookmarks.gekko` - Bookmark management interface
4. `history.gekko` - Browsing history viewer
5. `settings.gekko` - Browser settings and configuration
6. `secure.gekko` - Example of secure content (accessible via GKPS)
7. `shared.gekko` - Shared resources used by internal pages
8. `protocols.gekko` - Information about supported protocols

## Content Types

The protocol automatically detects and serves content with appropriate MIME types:

- `.html` - HTML content (text/html)
- `.js` - JavaScript files (text/javascript)
- `.css` - Stylesheets (text/css)
- `.json` - JSON data (application/json)
- `.png`, `.jpg`, `.gif`, `.svg` - Images (image/*)
- `.woff`, `.woff2`, `.ttf`, `.eot`, `.otf` - Fonts (font/*)
- `.md` - Markdown content (text/markdown)

## Usage Examples

### Basic Navigation
```
gkp://home.gekko/         # Browser home page
gkp://about.gekko/        # About page
gkp://bookmarks.gekko/    # Bookmarks manager
gkp://history.gekko/      # History viewer
gkp://settings.gekko/     # Settings page
```

### Secure Resources
```
gkps://secure.gekko/      # Example secure content
```

### Shared Resources
```
gkp://shared.gekko/styles.css           # Common stylesheet
gkp://shared.gekko/theme-utils.js       # Theme utilities
gkp://shared.gekko/bookmark-handler.js  # Bookmark handling functions
```

## Security Features

The GKPS protocol provides:

1. **Transport Security** - Communications are handled internally without network exposure
2. **Content Isolation** - Content is isolated from regular web content
3. **Resource Restrictions** - Only approved resources can be loaded
4. **CSP Enforcement** - Content Security Policy controls what can be loaded and executed

## Extending with Custom Pages

You can create custom pages by adding HTML files to the appropriate directories:

1. Create a new folder under `src/demo_sites/` with a `.gekko` extension
2. Add an `index.html` file with your content
3. Include any required JavaScript and CSS files
4. Access your page via `gkp://yourfolder.gekko/`

## Troubleshooting

If you encounter issues with GKP or GKPS protocols:

1. Check the URL format to ensure it follows the required structure
2. Verify that the domain and path exist in the browser's internal pages
3. Check browser console for any error messages
4. Ensure the content type is supported by the protocol handlers

## Additional Resources

For more information about the internal structure and functionality of the Gekko Browser, refer to the source code or the [main README](README.md).

When using GKPS:
- Connections are encrypted
- Domain certificates are verified
- Responses include a security fingerprint
- Data is encoded with additional security measures

## Common Use Cases

1. **Public Content Access**
   ```
   gkp://news.kewl/latest.html
   ```

2. **Secure Data Transfer**
   ```
   gkps://vault.rust/sensitive/data.json
   ```

3. **API Endpoints**
   ```
   gkp://api.gekko/v1/status.json
   ```

4. **Documentation**
   ```
   gkp://docs.rust/tutorial/intro.md
   ```

## Error Cases to Watch For

1. Invalid URL format
2. Unsupported TLD
3. Missing or invalid certificates (for GKPS)
4. Security validation failures

## Best Practices

1. Use GKPS for any sensitive data
2. Include proper file extensions for correct content type handling
3. Keep URLs clean and descriptive
4. Use query parameters when needed for dynamic content
5. Verify certificate validity for secure domains

## Testing Your URLs

You can test GKP and GKPS URLs using the protocol tester at: [This will work in the Future, not at this moment as the GKP:// and GKPS:// protocols are internal only for now.]
```
http://localhost:3000
```

The tester will show you the full response including:
- Content type
- Data payload
- Encryption status
- Any error messages
