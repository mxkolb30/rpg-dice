// Settings
$('#settingsBtn').addEventListener('click', () => {
    $('#langSelect').value = state.settings.lang || 'en';
    $('#themeSelect').value = state.settings.theme || 'auto';
    $('#muteSounds').checked = !!state.settings.mute;
    $('#keepAwake').checked = !!state.settings.keepAwake;
    $('#rollSound').value = state.settings.rollSound || 'roll_dice_1';
    $('#critSound').value = state.settings.critSound || 'tada';
    $('#fumbleSound').value = state.settings.fumbleSound || 'sad_trombone';
    $('#settingsModal').classList.remove('hidden');
});

$('#closeSettings').addEventListener('click', saveAndCloseSettings);

$('#settingsModal').addEventListener('click', (e) => {
    if (e.target === $('#settingsModal')) saveAndCloseSettings();
});

$('#favModal').addEventListener('click', (e) => {
    if (e.target === $('#favModal')) $('#favModal').classList.add('hidden');
});

$('#resultModal').addEventListener('click', () => {
    $('#resultModal').classList.add('hidden');
});

function saveAndCloseSettings() {
    state.settings.lang = $('#langSelect').value;
    state.settings.theme = $('#themeSelect').value;
    state.settings.mute = $('#muteSounds').checked;
    state.settings.keepAwake = $('#keepAwake').checked;
    state.settings.rollSound = $('#rollSound').value;
    state.settings.critSound = $('#critSound').value;
    state.settings.fumbleSound = $('#fumbleSound').value;
    localStorage.setItem('critdice_settings', JSON.stringify(state.settings));

    setLanguage(state.settings.lang);
    renderFavorites();
    applyTheme(state.settings.theme);

    applyWakeLock();

    $('#settingsModal').classList.add('hidden');
}

// PWA update
let refreshing = false;
navigator.serviceWorker?.addEventListener('controllerchange', () => {
    if (!refreshing) { refreshing = true; window.location.reload(); }
});

$('#updateApp').addEventListener('click', async () => {
    const btn = $('#updateApp');
    btn.textContent = t('update.checking');
    btn.disabled = true;
    try {
        const reg = await navigator.serviceWorker?.getRegistration();
        if (reg) {
            await reg.update();
            await new Promise(r => setTimeout(r, 1000));
        }
        if (!refreshing) {
            btn.textContent = t('update.upToDate');
        }
    } catch {
        btn.textContent = t('update.failed');
    }
    if (!refreshing) {
        setTimeout(() => {
            btn.textContent = t('btn.update');
            btn.disabled = false;
        }, 2000);
    }
});
