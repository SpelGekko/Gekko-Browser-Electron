// Initialize theme handling
initThemeHandling();

// Make links work
document.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const url = link.getAttribute('href');
    navigateToPage(url);
  });
});

// Add back to settings button handler
document.getElementById('back-to-settings')?.addEventListener('click', () => {
  navigateToPage('gkp://settings.gekko/');
});

// Helper function to navigate to a page with multiple fallback methods
function navigateToPage(url) {
  console.group('Navigation');
  console.log('Navigating to:', url);
  
  try {
    let navigationSucceeded = false;
    
    // Try method 1: window.api.navigate (most reliable for Electron)
    if (window.api && typeof window.api.navigate === 'function') {
      console.log('Using window.api.navigate');
      window.api.navigate(url);
      console.log('Navigation initiated via window.api.navigate');
      navigationSucceeded = true;
    }
    
    // Try method 2: navigation API (standard web API)
    else if (window.navigation && typeof window.navigation.navigate === 'function') {
      console.log('Using window.navigation.navigate');
      window.navigation.navigate(url);
      console.log('Navigation initiated via window.navigation.navigate');
      navigationSucceeded = true;
    }
    
    // Try method 3: navigationAPI (webview specific)
    else if (window.navigationAPI && typeof window.navigationAPI.navigate === 'function') {
      console.log('Using window.navigationAPI.navigate');
      window.navigationAPI.navigate(url);
      console.log('Navigation initiated via window.navigationAPI.navigate');
      navigationSucceeded = true;
    }
    
    // Try method 4: postMessage to parent (works for iframe scenarios)
    else if (window.parent && typeof window.parent.postMessage === 'function') {
      console.log('Using window.parent.postMessage');
      window.parent.postMessage({ 
        type: 'navigate', 
        url: url, 
        target: '_blank'  // Match history.js by including target
      }, '*');
      console.log('Navigation message sent to parent');
      navigationSucceeded = true;
    }
    
    // Last resort: Direct location change
    else {
      console.log('Using direct location change as last resort');
      window.location.href = url;
      navigationSucceeded = true;
    }
    
    if (!navigationSucceeded) {
      console.error('All navigation methods failed');
    }
  } catch (error) {
    console.error('Error during navigation attempt:', error);
    
    // Final fallback if all else fails
    try {
      console.log('Attempting final fallback via location.href');
      window.location.href = url;
    } catch (e) {
      console.error('Final fallback navigation failed:', e);
    }
  }
  
  console.groupEnd();
}
