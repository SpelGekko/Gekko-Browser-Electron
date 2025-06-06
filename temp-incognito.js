/**
 * This is a temporary file for holding a single function definition.
 * It will be used to update the renderer.js file.
 */

function toggleIncognitoMode() {
  isIncognito = window.api.toggleIncognitoMode();
  
  const incognitoButton = document.getElementById('incognito-button');
  const statusText = document.getElementById('status-text');
  
  if (isIncognito) {
    // Update UI to indicate incognito mode is active
    incognitoButton.classList.add('incognito-active');
    incognitoButton.setAttribute('title', 'Incognito Mode: ON - Browsing history is not being saved');
    statusText.textContent = 'Incognito Mode: ON';
    
    // Add visual indicator to address bar
    document.querySelector('.address-bar-container').classList.add('incognito-mode');
    
    setTimeout(() => {
      if (isIncognito) {
        statusText.textContent = 'Ready (Incognito)';
      }
    }, 2000);
  } else {
    // Update UI to indicate incognito mode is disabled
    incognitoButton.classList.remove('incognito-active');
    incognitoButton.setAttribute('title', 'Incognito Mode: OFF - Browsing history is being saved');
    statusText.textContent = 'Incognito Mode: OFF';
    
    // Remove visual indicator from address bar
    document.querySelector('.address-bar-container').classList.remove('incognito-mode');
    
    setTimeout(() => {
      if (!isIncognito) {
        statusText.textContent = 'Ready';
      }
    }, 2000);
  }
}
