const { protocol } = require('electron');
const path = require('path');
const fs = require('fs');

// Helper function to handle font files
function serveFont(filePath, extension, callback) {
  try {
    const data = fs.readFileSync(filePath);
    
    // Use more specific MIME types for fonts with proper binary data handling
    const mimeType = extension === 'woff2' ? 'font/woff2' : 
                     extension === 'woff' ? 'font/woff' : 
                     extension === 'ttf' ? 'font/ttf' :
                     extension === 'otf' ? 'font/otf' : 'application/octet-stream';
    
    // Return binary data directly instead of converting to string
    callback({
      mimeType: mimeType,
      data: Buffer.from(data)  // Ensure proper binary handling
    });
  } catch (error) {
    console.error('Font loading error:', error, filePath);
    callback({ error: -2 });
  }
}

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
        'svg': 'image/svg+xml',
        'woff': 'font/woff',
        'woff2': 'font/woff2',
        'ttf': 'font/ttf',
        'eot': 'application/vnd.ms-fontobject',
        'otf': 'font/otf'
      };
        // Handle shared resources (fonts, styles, etc.)
      if (domain === 'shared.gekko') {
        const sharedPath = path.join(__dirname, 'demo_sites', 'shared', urlPath);
        if (fs.existsSync(sharedPath)) {
          // Special handling for font files
          if (['woff', 'woff2', 'ttf', 'otf', 'eot'].includes(extension)) {
            serveFont(sharedPath, extension, callback);
            return;
          }
          
          callback({
            path: sharedPath,
            mimeType: mimeTypes[extension] || 'application/octet-stream'
          });
          return;
        }
      }
      
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
        // If file doesn't exist, check in shared directory
      if (!fs.existsSync(filePath) && domain !== 'shared.gekko') {
        const sharedPath = path.join(__dirname, 'demo_sites', 'shared', urlPath);
        if (fs.existsSync(sharedPath)) {
          filePath = sharedPath;
        }
      }
      
      // Check if the file exists
      if (fs.existsSync(filePath)) {
        // Special handling for font files
        if (['woff', 'woff2', 'ttf', 'otf', 'eot'].includes(extension)) {
          serveFont(filePath, extension, callback);
          return;
        }
        
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
        'svg': 'image/svg+xml',
        'woff': 'font/woff',
        'woff2': 'font/woff2',
        'ttf': 'font/ttf',
        'eot': 'application/vnd.ms-fontobject',
        'otf': 'font/otf'
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
      
      // Handle shared resources for GKPS too
      if (domain === 'shared.gekko') {
        const sharedPath = path.join(__dirname, 'demo_sites', 'shared', urlPath);
        if (fs.existsSync(sharedPath)) {
          // Special handling for font files
          if (['woff', 'woff2', 'ttf', 'otf', 'eot'].includes(extension)) {
            serveFont(sharedPath, extension, callback);
            return;
          }
          
          callback({
            path: sharedPath,
            mimeType: mimeTypes[extension] || 'application/octet-stream'
          });
          return;
        }
      }
      
      // Map the request to a local file in the secure demo_sites directory
      let filePath = path.join(__dirname, 'demo_sites', 'secure', domain, urlPath);
        // Check if the file exists
      if (fs.existsSync(filePath)) {
        // Special handling for font files
        if (['woff', 'woff2', 'ttf', 'otf', 'eot'].includes(extension)) {
          serveFont(filePath, extension, callback);
          return;
        }
        
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
