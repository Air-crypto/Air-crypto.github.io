(() => {
    const root = document.documentElement;
    const preference = window.matchMedia('(prefers-color-scheme: dark)');
    let saved;
    try { saved = localStorage.getItem('workbench-theme'); } catch (_) { /* Storage is optional. */ }
    const chosen = saved === 'dark' || saved === 'light' ? saved : null;
    function apply(theme) {
        root.dataset.theme = theme;
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#171916' : '#e9e6de');
    }
    apply(chosen || (preference.matches ? 'dark' : 'light'));
    preference.addEventListener('change', event => {
        if (!chosen) apply(event.matches ? 'dark' : 'light');
    });
})();
