// Responsive layout
const mqMedium = window.matchMedia('(min-width: 768px)');
const mqLarge = window.matchMedia('(min-width: 1200px)');

function isMultiPanel() {
    return mqMedium.matches;
}

function isThreePanel() {
    return mqLarge.matches;
}

function applyResponsiveLayout() {
    const backdrop = $('#historyBackdrop');

    if (isThreePanel()) {
        // All panels visible, no tabs needed
        $('#dice').classList.add('active');
        $('#favorites').classList.add('active');
        $('#history').classList.add('active');
        backdrop.classList.add('hidden');
    } else if (isMultiPanel()) {
        // Dice + Favorites always visible; history starts closed
        $('#dice').classList.add('active');
        $('#favorites').classList.add('active');
        $('#history').classList.remove('active');
        backdrop.classList.add('hidden');
    } else {
        // Single column: restore single-tab behavior
        backdrop.classList.add('hidden');
        // Ensure exactly one tab is active
        const activeTab = $('.tab.active');
        if (!activeTab) {
            $$('.tab')[0].classList.add('active');
            $('#dice').classList.add('active');
        }
    }
}

function closeHistoryOverlay() {
    $('#history').classList.remove('active');
    $('#historyBackdrop').classList.add('hidden');
}

// Tab navigation
$$('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        if (isMultiPanel()) return; // Tabs hidden on medium+, but just in case

        const target = tab.dataset.tab;
        $$('.tab').forEach(t => t.classList.remove('active'));
        $$('.tab-content').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        $(`#${target}`).classList.add('active');
    });
});

// Backdrop and close button close history overlay
$('#historyBackdrop').addEventListener('click', closeHistoryOverlay);
$('#closeHistoryOverlay').addEventListener('click', closeHistoryOverlay);

// Header history toggle (medium screens)
$('#historyToggleBtn').addEventListener('click', () => {
    const histPanel = $('#history');
    const backdrop = $('#historyBackdrop');
    if (histPanel.classList.contains('active')) {
        closeHistoryOverlay();
    } else {
        histPanel.classList.add('active');
        backdrop.classList.remove('hidden');
    }
});

// Listen for breakpoint changes
mqMedium.addEventListener('change', applyResponsiveLayout);
mqLarge.addEventListener('change', applyResponsiveLayout);

// Keyboard support
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 'Enter') {
        if (isMultiPanel() || $('.tab.active')?.dataset?.tab === 'dice') {
            doRoll(state.input);
        }
    }
    if (e.key === 'Escape') {
        closeHistoryOverlay();
    }
});

// i18n init
setLanguage(state.settings.lang);

// Service worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}

// Init
applyResponsiveLayout();
updateDisplay();
renderHistory();
renderFavorites();
