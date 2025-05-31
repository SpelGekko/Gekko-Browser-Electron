const { protocol } = require('electron');
const path = require('path');
const fs = require('fs');

// Register custom protocol handlers for GKP and GKPS
function registerProtocolHandlers() {
  // GKP Protocol Handler
  protocol.registerFileProtocol('gkp', (request, callback) => {
    try {
      // Parse the URL
      const url = new URL(request.url);
      const domain = url.hostname;
      const urlPath = url.pathname === '/' ? '/index.html' : url.pathname;
      
      // Determine content type based on file extension
      const extension = urlPath.split('.').pop().toLowerCase();
      const mimeTypes = {
        'html': 'text/html',
        'json': 'application/json',
        'md': 'text/markdown',
        'txt': 'text/plain',
        'css': 'text/css',
        'js': 'text/javascript',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'svg': 'image/svg+xml'
      };
      
      // Check for supported TLDs
      const tld = domain.split('.').pop();
      if (!['rust', 'gekko', 'kewl'].includes(tld)) {
        callback({
          path: path.join(__dirname, 'pages/error.html'),
          mimeType: 'text/html'
        });
        return;
      }
      
      // Map the request to a local file in the demo_sites directory
      let filePath = path.join(__dirname, 'demo_sites', domain, urlPath);
      
      // Check if the file exists
      if (fs.existsSync(filePath)) {
        callback({
          path: filePath,
          mimeType: mimeTypes[extension] || 'application/octet-stream'
        });
      } else {
        // Return a 404 page if the file doesn't exist
        callback({
          path: path.join(__dirname, 'pages/404.html'),
          mimeType: 'text/html'
        });
      }
    } catch (error) {
      console.error('GKP Protocol Error:', error);
      callback({
        path: path.join(__dirname, 'pages/error.html'),
        mimeType: 'text/html'
      });
    }
  });
  
  // GKPS Protocol Handler (Secure version)
  protocol.registerFileProtocol('gkps', (request, callback) => {
    try {
      // Parse the URL
      const url = new URL(request.url);
      const domain = url.hostname;
      const urlPath = url.pathname === '/' ? '/index.html' : url.pathname;
      
      // Determine content type based on file extension
      const extension = urlPath.split('.').pop().toLowerCase();
      const mimeTypes = {
        'html': 'text/html',
        'json': 'application/json',
        'md': 'text/markdown',
        'txt': 'text/plain',
        'css': 'text/css',
        'js': 'text/javascript',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'svg': 'image/svg+xml'
      };
      
      // Check for supported TLDs
      const tld = domain.split('.').pop();
      if (!['rust', 'gekko', 'kewl'].includes(tld)) {
        callback({
          path: path.join(__dirname, 'pages/error.html'),
          mimeType: 'text/html'
        });
        return;
      }
      
      // Map the request to a local file in the secure demo_sites directory
      let filePath = path.join(__dirname, 'demo_sites', 'secure', domain, urlPath);
      
      // Check if the file exists
      if (fs.existsSync(filePath)) {
        callback({
          path: filePath,
          mimeType: mimeTypes[extension] || 'application/octet-stream'
        });
      } else {
        // Return a 404 page if the file doesn't exist
        callback({
          path: path.join(__dirname, 'pages/404.html'),
          mimeType: 'text/html'
        });
      }
    } catch (error) {
      console.error('GKPS Protocol Error:', error);
      callback({
        path: path.join(__dirname, 'pages/error.html'),
        mimeType: 'text/html'
      });
    }
  });
}

module.exports = registerProtocolHandlers;
