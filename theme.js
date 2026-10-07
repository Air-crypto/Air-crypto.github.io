(() => {
    const root = document.documentElement;
    const preference = window.matchMedia('(prefers-color-scheme: dark)');
    let saved;
    try { saved = localStorage.getItem('workbench-theme'); } catch (_) { /* Storage is optional. */ }
    let chosen = saved === 'dark' || saved === 'light' ? saved : null;
    function apply(theme) {
        root.dataset.theme = theme;
        const dark = theme === 'dark';
        document.querySelectorAll('.theme-toggle').forEach(button => {
            button.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} mode`);
            button.setAttribute('aria-pressed', String(dark));
            button.querySelector('.theme-name').textContent = dark ? 'Light' : 'Dark';
        });
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#171916' : '#e9e6de');
    }
    apply(chosen || (preference.matches ? 'dark' : 'light'));
    document.addEventListener('DOMContentLoaded', () => {
        apply(root.dataset.theme);
        document.querySelectorAll('.theme-toggle').forEach(button => button.addEventListener('click', () => {
            chosen = root.dataset.theme === 'dark' ? 'light' : 'dark';
            try { localStorage.setItem('workbench-theme', chosen); } catch (_) { /* Keep working without storage. */ }
            apply(chosen);
        }));
    });
    preference.addEventListener('change', event => {
        if (!chosen) apply(event.matches ? 'dark' : 'light');
    });
})();
