// Sketch pages: arrow keys step through the sketches, Escape goes home.
(() => {
  const prev = document.querySelector('a[rel="prev"]');
  const next = document.querySelector('a[rel="next"]');
  const home = document.querySelector('.sk-home');

  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'ArrowLeft' && prev) location.href = prev.href;
    else if (e.key === 'ArrowRight' && next) location.href = next.href;
    else if (e.key === 'Escape' && home) location.href = home.href;
  });
})();
