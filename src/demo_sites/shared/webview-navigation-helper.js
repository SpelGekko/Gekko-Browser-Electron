/**
 * Improved WebView Navigation Helper
 * 
 * This script helps debug and resolve navigation issues in the webview
 */

// Navigation function
export function navigateToUrl(url) {
  console.log('Navigation requested to:', url);
  
  if (!url) {
    console.error('No URL provided for navigation');
    return;
  }

  try {
    if (window.navigationAPI && typeof window.navigationAPI.navigate === 'function') {
      console.log('Using navigationAPI to navigate');
      window.navigationAPI.navigate(url);
    } else if (window.parent && window.parent !== window) {
      console.log('Using postMessage to navigate');
      window.parent.postMessage({ type: 'navigate', url: url }, '*');
    } else {
      console.log('Direct navigation');
      window.location.href = url;
    }
  } catch (error) {
    console.error('Navigation error:', error);
    // Final fallback - try direct navigation
    window.location.href = url;
  }
}

// Setup function to be called after DOM is loaded
export function setupNavigation() {
  console.log('WebView navigation helper loaded');
  
  // Listen for navigation messages from parent
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'navigate' && event.data.url) {
      navigateToUrl(event.data.url);
    }
  });
}
