// Initialize theme handling
initThemeHandling();

// Make links work
document.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const url = link.getAttribute('href');
    window.parent.postMessage({ type: 'navigate', url: url }, '*');
  });
});
