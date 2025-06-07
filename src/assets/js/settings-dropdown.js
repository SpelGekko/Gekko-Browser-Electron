// Settings dropdown menu functionality
document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const settingsButton = document.getElementById('settings-button');
  const settingsDropdown = document.getElementById('settings-dropdown');
  const settingsItem = document.getElementById('settings-item');

  if (!settingsButton || !settingsDropdown) {
    console.error('Settings dropdown elements not found');
    return;
  }

  // Toggle dropdown when settings button is clicked
  settingsButton.addEventListener('click', (event) => {
    event.stopPropagation(); // Prevent event from bubbling up
    settingsDropdown.classList.toggle('show');
  });

  // Hide dropdown when clicking elsewhere
  document.addEventListener('click', (event) => {
    if (settingsDropdown.classList.contains('show') && 
        !settingsButton.contains(event.target) && 
        !settingsDropdown.contains(event.target)) {
      settingsDropdown.classList.remove('show');
    }
  });  // Menu item event listeners
  if (settingsItem) {
    settingsItem.addEventListener('click', () => {
      console.group('Settings Navigation');
      console.log('Settings clicked');
      const url = 'gkp://settings.gekko/';
      
      // Use multiple navigation methods to ensure success
      let navigationSucceeded = false;
      
      // Method 1: Browser API (preferred)
      if (window.api && typeof window.api.navigate === 'function') {
        console.log('Using window.api.navigate');
        try {
          window.api.navigate(url);
          navigationSucceeded = true;
        } catch (error) {
          console.error('window.api.navigate failed:', error);
        }
      }
      
      // Method 2: navigationAPI (webview)
      if (!navigationSucceeded && window.navigationAPI && typeof window.navigationAPI.navigate === 'function') {
        console.log('Using window.navigationAPI.navigate');
        try {
          window.navigationAPI.navigate(url);
          navigationSucceeded = true;
        } catch (error) {
          console.error('window.navigationAPI.navigate failed:', error);
        }
      }
      
      // Method 3: postMessage to parent
      if (!navigationSucceeded && window.parent && window.parent !== window) {
        console.log('Using postMessage');
        try {
          window.parent.postMessage({ type: 'navigate', url: url }, '*');
          navigationSucceeded = true;
        } catch (error) {
          console.error('postMessage navigation failed:', error);
        }
      }
      
      // Method 4: Direct location change (last resort)
      if (!navigationSucceeded) {
        console.log('Using direct location change as last resort');
        try {
          window.location.href = url;
        } catch (error) {
          console.error('Direct navigation failed:', error);
        }
      }
        console.groupEnd();
      settingsDropdown.classList.remove('show');
    });
  }
});
