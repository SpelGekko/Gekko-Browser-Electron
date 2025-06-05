const { protocol } = require('electron');
const path = require('path');
const fs = require('fs');

// Helper function to get MIME type
function getMimeType(extension) {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'font/otf',
    '.md': 'text/markdown',
  };
  return mimeTypes[extension] || 'application/octet-stream';
}

// Helper function to serve static files
function serveFile(filePath, callback, extraHeaders = {}) {
  try {
    const extension = path.extname(filePath);
    const isFontFile = ['.woff', '.woff2', '.ttf', '.eot', '.otf'].includes(extension);
      if (!fs.existsSync(filePath)) {
      callback({ error: -2 }); // File not found
      return;
    }

    const stream = fs.createReadStream(filePath);
    const headers = {
      'Content-Type': getMimeType(extension),
      'Access-Control-Allow-Origin': '*',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Cache-Control': isFontFile ? 'public, max-age=31536000' : 'no-cache',
      ...extraHeaders
    };

    // Add specific headers for fonts
    if (isFontFile) {
      headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
      headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept';
      headers['Cross-Origin-Embedder-Policy'] = 'require-corp';
      headers['Cross-Origin-Opener-Policy'] = 'same-origin';
    }

    callback({
      statusCode: 200,
      headers: headers,
      data: stream
    });
  } catch (error) {
    console.error('Error serving file:', error);
    callback({ error: -2 });
  }
}

// Register custom protocol handlers for GKP and GKPS
function registerProtocolHandlers() {
  const CSP_HEADER = {
    'Content-Security-Policy': [
      "default-src 'self' gkp: gkps: blob: data:",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' gkp: gkps:",
      "style-src 'self' 'unsafe-inline' gkp: gkps:",
      "img-src 'self' data: gkp: gkps: https: blob:",
      "font-src 'self' gkp: gkps: data: blob:",
      "connect-src 'self' gkp: gkps:",
      "frame-src 'self' gkp: gkps:",
      "media-src 'self' gkp: gkps: blob:",
      "object-src 'none'",
      "base-uri 'self'"
    ].join('; ')
  };

  // GKP Protocol Handler
  protocol.registerStreamProtocol('gkp', (request, callback) => {
    try {
      const url = new URL(request.url);
      const domain = url.hostname;
      const urlPath = url.pathname === '/' ? '/index.html' : url.pathname;
      
      // Check for supported TLDs
      const tld = domain.split('.').pop();
      if (!['rust', 'gekko', 'kewl'].includes(tld)) {
        serveFile(path.join(__dirname, 'pages/error.html'), callback, CSP_HEADER);
        return;
      }

      // Handle shared resources
      if (domain === 'shared.gekko') {
        const filePath = path.join(__dirname, 'demo_sites', 'shared', urlPath);
        if (fs.existsSync(filePath)) {
          serveFile(filePath, callback, CSP_HEADER);
          return;
        }
      }

      // Try regular path
      let filePath = path.join(__dirname, 'demo_sites', domain, urlPath);
      if (fs.existsSync(filePath)) {
        serveFile(filePath, callback, CSP_HEADER);
      } else {
        // Try shared folder as fallback
        const sharedPath = path.join(__dirname, 'demo_sites', 'shared', urlPath);
        if (fs.existsSync(sharedPath)) {
          serveFile(sharedPath, callback, CSP_HEADER);
        } else {
          serveFile(path.join(__dirname, 'pages/404.html'), callback, CSP_HEADER);
        }
      }
    } catch (error) {
      console.error('GKP Protocol Error:', error);
      serveFile(path.join(__dirname, 'pages/error.html'), callback, CSP_HEADER);
    }
  });

  // GKPS Protocol Handler (secure version)
  protocol.registerStreamProtocol('gkps', (request, callback) => {
    // Add HSTS header for secure protocol
    const secureHeaders = {
      ...CSP_HEADER,
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    };

    try {
      const url = new URL(request.url);
      const domain = url.hostname;
      const urlPath = url.pathname === '/' ? '/index.html' : url.pathname;

      // Check for supported TLDs
      const tld = domain.split('.').pop();
      if (!['rust', 'gekko', 'kewl'].includes(tld)) {
        serveFile(path.join(__dirname, 'pages/error.html'), callback, secureHeaders);
        return;
      }

      // Handle shared resources
      if (domain === 'shared.gekko') {
        const filePath = path.join(__dirname, 'demo_sites', 'shared', urlPath);
        if (fs.existsSync(filePath)) {
          serveFile(filePath, callback, secureHeaders);
          return;
        }
      }

      // Try secure directory
      const filePath = path.join(__dirname, 'demo_sites', 'secure', domain, urlPath);
      if (fs.existsSync(filePath)) {
        serveFile(filePath, callback, secureHeaders);
      } else {
        serveFile(path.join(__dirname, 'pages/404.html'), callback, secureHeaders);
      }
    } catch (error) {
      console.error('GKPS Protocol Error:', error);
      serveFile(path.join(__dirname, 'pages/error.html'), callback, secureHeaders);
    }
  });
}

module.exports = registerProtocolHandlers;
