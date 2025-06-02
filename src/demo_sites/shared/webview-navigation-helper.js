/**
 * Improved WebView Navigation Helper
 * 
 * This script helps debug and resolve navigation issues in the webview
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log('WebView navigation helper loaded');
  
  // Check if we're inside a webview
  const isInWebView = window !== window.parent;
  
  if (isInWebView) {
    console.log('Running inside a webview, setting up navigation handlers');
    
    // Expose this function globally for navigation
    window.navigateToUrl = (url) => {
      console.log('Navigation requested to:', url);
      
      if (window.parent && typeof window.parent.handleNavigation === 'function') {
        console.log('Using parent handleNavigation');
        window.parent.handleNavigation(url);
        return;
      }
      
      // Fallback to postMessage
      console.log('Using postMessage fallback');
      window.parent.postMessage({ type: 'navigate', url: url }, '*');
    };
    
    // Add event listeners to all links
    document.querySelectorAll('a[href]').forEach(link => {
      link.addEventListener('click', (e) => {
        const url = link.getAttribute('href');
        console.log('Link clicked:', url);
        
        // Don't intercept hash links (in-page navigation)
        if (url.startsWith('#')) return;
        
        // Don't intercept javascript: links
        if (url.startsWith('javascript:')) return;
        
        // Intercept and handle navigation
        e.preventDefault();
        window.navigateToUrl(url);
      });
    });
    
    // Listen for font loading errors and try to fix them
    document.fonts.addEventListener('loadingerror', (event) => {
      console.warn('Font loading error detected:', event);
      
      // Try to fix FontAwesome if it failed to load
      fixFontAwesomeIcons();
    });
  }
});

// Helper function to fix FontAwesome icons if they fail to load
function fixFontAwesomeIcons() {
  console.log('Attempting to fix FontAwesome icons');
  
  // Check if FontAwesome is available
  const isFontAwesomeLoaded = Array.from(document.styleSheets)
    .some(sheet => sheet.href && sheet.href.includes('fontawesome'));
  
  if (!isFontAwesomeLoaded) {
    console.log('FontAwesome not loaded, attempting to inject fallback CSS');
    
    // Create a fallback style for icons using SVGs or Unicode characters
    const fallbackStyle = document.createElement('style');
    fallbackStyle.textContent = `
      /* FontAwesome fallback styles */
      .fa-github:before { content: "\\1F5A7"; }
      .fa-google:before { content: "G"; }
      .fa-youtube:before { content: "\\1F3A5"; }
      .fa-twitter:before { content: "\\1F426"; }
      .fa-reddit:before { content: "R"; }
      .fa-linkedin:before { content: "in"; }
      .fa-info-circle:before { content: "i"; }
      .fa-shield:before { content: "\\1F6E1"; }
      .fa-gear:before, .fa-cog:before { content: "\\2699"; }
      .fa-clock-rotate-left:before { content: "\\1F552"; }
      .fa-book:before { content: "\\1F4D6"; }
      .fa-language:before { content: "\\1F310"; }
      .fa-google-drive:before { content: "\\1F4BE"; }
      .fa-map:before { content: "\\1F5FA"; }
      .fa-calendar:before { content: "\\1F4C5"; }
      .fa-solid, .fa-regular, .fa-brands {
        font-family: system-ui, -apple-system, sans-serif;
        font-weight: normal;
        font-style: normal;
      }
    `;
    document.head.appendChild(fallbackStyle);
  }
}
