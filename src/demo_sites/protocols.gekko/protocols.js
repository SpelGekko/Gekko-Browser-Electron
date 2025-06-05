// Initialize theme handling
initThemeHandling();

// Make links work if any are added in the future
document.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const url = link.getAttribute('href');
    window.parent.postMessage({ type: 'navigate', url: url }, '*');
  });
});
