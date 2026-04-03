// Tab navigation
$$('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        $$('.tab').forEach(t => t.classList.remove('active'));
        $$('.tab-content').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        $(`#${tab.dataset.tab}`).classList.add('active');
    });
});

// Keyboard support
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 'Enter') {
        const activeTab = $('.tab.active').dataset.tab;
        if (activeTab === 'dice') doRoll(state.input);
    }
});

// i18n init
setLanguage(state.settings.lang);

// Service worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}

// Init
updateDisplay();
renderHistory();
renderFavorites();
