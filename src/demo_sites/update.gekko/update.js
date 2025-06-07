// Update page functionality
console.log('Update page script loaded');
console.log('Window API available:', typeof window.api !== 'undefined');
console.log('Navigation API available:', typeof window.navigationAPI !== 'undefined');
// Debug available API functions
if (window.api) {
  console.log('API functions available:', Object.keys(window.api).join(', '));
  console.log('setSetting available:', typeof window.api.setSetting === 'function');
  console.log('getSetting available:', typeof window.api.getSetting === 'function');
  console.log('getAppVersion available:', typeof window.api.getAppVersion === 'function');
  
  if (typeof window.api.getAvailableMethods === 'function') {
    const methods = window.api.getAvailableMethods();
    console.log('Available API methods (detailed):', methods);
  }
  
  // Test setSetting directly
  try {
    const result = window.api.setSetting('updatePageTest', 'test-value-' + Date.now());
    console.log('Test setSetting result:', result);
  } catch (error) {
    console.error('Error testing setSetting:', error);
  }
}

// Create a connection helper for more reliable communication
function triggerNavigation(url) {
  console.group('Navigation from Update Page');
  console.log('Trying to navigate to:', url);
  
  let success = false;
  
  // Try all navigation methods
  if (window.api && typeof window.api.navigate === 'function') {
    try {
      console.log('Using window.api.navigate');
      window.api.navigate(url);
      success = true;
    } catch (e) {
      console.error('window.api.navigate failed:', e);
    }
  }
  
  if (!success && window.navigationAPI && typeof window.navigationAPI.navigate === 'function') {
    try {
      console.log('Using window.navigationAPI.navigate');
      window.navigationAPI.navigate(url);
      success = true;
    } catch (e) {
      console.error('window.navigationAPI.navigate failed:', e);
    }
  }
  
  if (!success && window.parent && window.parent !== window) {
    try {
      console.log('Using postMessage');
      window.parent.postMessage({ type: 'navigate', url: url }, '*');
      success = true;
    } catch (e) {
      console.error('postMessage navigation failed:', e);
    }
  }
  
  if (!success) {
    console.log('Direct navigation as last resort');
    try {
      window.location.href = url;
    } catch (e) {
      console.error('Direct navigation failed:', e);
    }
  }
  
  console.groupEnd();
  return success;
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('Update page DOM loaded');
  
  try {
    // Check if API is available
    if (!window.api) {
      console.error('API not available in update page!');
      document.body.innerHTML = '<div class="error-message">Error: Browser API not available. Please restart the browser.</div>';
      return;
    }
    
    // Validate required API functions
    const requiredFunctions = ['getAppVersion', 'checkForUpdates', 'downloadUpdate', 'installUpdate', 'getUpdateStatus', 'onUpdateStatus'];
    const missingFunctions = requiredFunctions.filter(func => typeof window.api[func] !== 'function');
    
    if (missingFunctions.length > 0) {
      console.error('Missing required API functions:', missingFunctions.join(', '));
      document.body.innerHTML = `<div class="error-message">Error: Some update functions are not available. Missing: ${missingFunctions.join(', ')}. Please restart the browser.</div>`;
      return;
    }
  
  // DOM Elements
  const updateStatusTitle = document.getElementById('update-status-title');
  const updateStatusMessage = document.getElementById('update-status-message');
  const updateIcon = document.getElementById('update-icon');
  const releaseNotesContainer = document.getElementById('release-notes-container');
  const releaseNotes = document.getElementById('release-notes');
  const currentVersionElement = document.getElementById('current-version');
  const latestVersionElement = document.getElementById('latest-version');
  const lastCheckedElement = document.getElementById('last-checked');
  const progressContainer = document.getElementById('update-progress-container');
  const progressBar = document.getElementById('update-progress-bar');
  const progressText = document.getElementById('update-progress-text');
  
  // Buttons
  const checkForUpdatesBtn = document.getElementById('check-for-updates-btn');
  const downloadUpdateBtn = document.getElementById('download-update-btn');
  const installUpdateBtn = document.getElementById('install-update-btn');
  
  // Icons
  const iconChecking = document.getElementById('icon-checking');
  const iconAvailable = document.getElementById('icon-available');
  const iconDownloading = document.getElementById('icon-downloading');
  const iconDownloaded = document.getElementById('icon-downloaded');
  const iconUpToDate = document.getElementById('icon-up-to-date');
  const iconError = document.getElementById('icon-error');
  
  // State variables
  let updateInfo = null;
  let currentStatus = 'checking';
  
  // Get app version
  currentVersionElement.textContent = window.api.getAppVersion();
  
  // Format date
  function formatDate(date) {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  }
    // Set last checked time
  function updateLastChecked() {
    const now = new Date();
    lastCheckedElement.textContent = formatDate(now);
    
    try {
      if (window.api && typeof window.api.setSetting === 'function') {
        window.api.setSetting('lastUpdateCheck', now.toISOString());
        console.log('Last update check time saved successfully');
      } else {
        console.error('setSetting function not available');
      }
    } catch (error) {
      console.error('Error saving last update check time:', error);
    }
  }
  
  // Load last checked time from settings
  function loadLastChecked() {
    try {
      if (window.api && typeof window.api.getSetting === 'function') {
        window.api.getSetting('lastUpdateCheck').then(lastCheck => {
          if (lastCheck) {
            lastCheckedElement.textContent = formatDate(lastCheck);
            console.log('Loaded last update check time:', lastCheck);
          } else {
            console.log('No previous update check time found');
          }
        }).catch(err => {
          console.error('Error retrieving last update check time:', err);
        });
      } else {
        console.error('getSetting function not available');
      }
    } catch (error) {
      console.error('Error loading last update check time:', error);
    }
  }
  
  // Update the UI based on update status
  function updateUI(status, info = null) {
    currentStatus = status;
    
    // Hide all icons first
    iconChecking.style.display = 'none';
    iconAvailable.style.display = 'none';
    iconDownloading.style.display = 'none';
    iconDownloaded.style.display = 'none';
    iconUpToDate.style.display = 'none';
    iconError.style.display = 'none';
    
    // Hide all buttons by default
    checkForUpdatesBtn.style.display = 'inline-block';
    downloadUpdateBtn.style.display = 'none';
    installUpdateBtn.style.display = 'none';
    
    // Reset progress bar
    progressContainer.style.display = 'none';
    
    // Remove existing status classes
    updateIcon.className = 'update-icon';
    
    switch (status) {
      case 'checking':
        updateStatusTitle.textContent = 'Checking for updates...';
        updateStatusMessage.textContent = 'Please wait while we check for available updates.';
        iconChecking.style.display = 'block';
        updateIcon.classList.add('update-icon-checking');
        checkForUpdatesBtn.disabled = true;
        break;
        
      case 'available':
        updateInfo = info;
        updateStatusTitle.textContent = 'Update Available';
        updateStatusMessage.textContent = `Version ${info.version} is available to download.`;
        iconAvailable.style.display = 'block';
        downloadUpdateBtn.style.display = 'inline-block';
        latestVersionElement.textContent = info.version;
        
        // Show release notes if available
        if (info.releaseNotes) {
          releaseNotesContainer.style.display = 'block';
          releaseNotes.innerHTML = typeof info.releaseNotes === 'string' 
            ? info.releaseNotes 
            : info.releaseNotes.replace(/\\n/g, '<br>');
        }
        break;
        
      case 'not-available':
        updateStatusTitle.textContent = 'Up to Date';
        updateStatusMessage.textContent = 'You are running the latest version of Gekko Browser.';
        iconUpToDate.style.display = 'block';
        latestVersionElement.textContent = currentVersionElement.textContent;
        releaseNotesContainer.style.display = 'none';
        break;
        
      case 'downloading':
        updateStatusTitle.textContent = 'Downloading Update...';
        updateStatusMessage.textContent = 'Please wait while the update is being downloaded.';
        iconDownloading.style.display = 'block';
        progressContainer.style.display = 'block';
        checkForUpdatesBtn.disabled = true;
        break;
        
      case 'progress':
        if (info && typeof info.percent === 'number') {
          const percent = Math.round(info.percent);
          progressBar.style.width = `${percent}%`;
          progressText.textContent = `${percent}%`;
          updateStatusMessage.textContent = `Downloading: ${percent}% (${Math.round(info.transferred / 1024 / 1024 * 100) / 100} MB / ${Math.round(info.total / 1024 / 1024 * 100) / 100} MB)`;
        }
        break;
        
      case 'downloaded':
        updateStatusTitle.textContent = 'Update Ready to Install';
        updateStatusMessage.textContent = `Version ${updateInfo ? updateInfo.version : 'latest'} has been downloaded and is ready to install.`;
        iconDownloaded.style.display = 'block';
        installUpdateBtn.style.display = 'inline-block';
        progressContainer.style.display = 'none';
        break;
        
      case 'error':
        updateStatusTitle.textContent = 'Update Error';
        updateStatusMessage.textContent = info ? `Error: ${info.message || 'Unknown error'}` : 'An error occurred while checking for updates.';
        iconError.style.display = 'block';
        break;
    }
    
    // Enable check button if not checking or downloading
    if (status !== 'checking' && status !== 'downloading') {
      checkForUpdatesBtn.disabled = false;
    }
  }
  
  // Initialize UI
  loadLastChecked();
  updateUI('checking');
  
  // Listen for update status events from main process
  window.api.onUpdateStatus((status, info) => {
    console.log('Update status:', status, info);
    updateUI(status, info);
    
    if (status === 'checking') {
      updateLastChecked();
    }
  });
  
  // Get initial update status
  window.api.getUpdateStatus().then(({status, info}) => {
    updateUI(status, info);
  });
  
  // Button event listeners
  checkForUpdatesBtn.addEventListener('click', () => {
    updateUI('checking');
    window.api.checkForUpdates();
  });
  
  downloadUpdateBtn.addEventListener('click', () => {
    updateUI('downloading');
    window.api.downloadUpdate();
  });
  installUpdateBtn.addEventListener('click', () => {
    window.api.installUpdate();
  });
  
  // Add back to settings button handler
  document.getElementById('back-to-settings')?.addEventListener('click', () => {
    triggerNavigation('gkp://settings.gekko/');
  });
  
  } catch (error) {
    console.error('Error during update page initialization:', error);
    document.body.innerHTML = '<div class="error-message">Error initializing update page. Please restart the browser.</div>';
  }
});
