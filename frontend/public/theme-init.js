// Applies the saved light/dark theme before the page paints, so dark mode
// users don't see a white flash. Kept as a file because the CSP blocks inline scripts.
(function () {
    var theme = null;
    try { theme = localStorage.getItem('ecoconnect_theme'); } catch (e) { /* storage blocked */ }
    if (theme !== 'light' && theme !== 'dark') {
        theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    if (theme === 'dark') document.documentElement.classList.add('dark');
})();
