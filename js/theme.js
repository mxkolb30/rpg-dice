// Theme
function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'light') {
        root.setAttribute('data-theme', 'light');
    } else if (theme === 'dark') {
        root.setAttribute('data-theme', 'dark');
    } else {
        root.removeAttribute('data-theme');
    }
    // Update meta theme-color to match header
    const metas = document.querySelectorAll('meta[name="theme-color"]');
    if (theme === 'auto') {
        if (metas.length === 2) {
            metas[0].setAttribute('media', '(prefers-color-scheme: dark)');
            metas[0].content = '#1e1e1e';
            metas[1].setAttribute('media', '(prefers-color-scheme: light)');
            metas[1].content = '#ffffff';
        }
    } else {
        const color = theme === 'dark' ? '#1e1e1e' : '#ffffff';
        metas.forEach(m => {
            m.removeAttribute('media');
            m.content = color;
        });
    }
}

applyTheme(state.settings.theme);

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (state.settings.theme === 'auto') applyTheme('auto');
});
