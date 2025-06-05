// Return to home functionality for error pages
document.getElementById('go-home').addEventListener('click', () => {
  window.parent.postMessage({ type: 'navigate', url: 'gkp://home.gekko/' }, '*');
});
