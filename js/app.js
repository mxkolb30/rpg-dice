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
        $$('.tab-content').forEach(t => {
            t.classList.add('active');
            t.style.visibility = 'visible';
        });
        backdrop.classList.add('hidden');
        $('.panels').style.transform = '';
    } else if (isMultiPanel()) {
        // Dice + Favorites always visible; history starts closed
        $('#dice').classList.add('active');
        $('#dice').style.visibility = 'visible';
        $('#favorites').classList.add('active');
        $('#favorites').style.visibility = 'visible';
        $('#history').classList.remove('active');
        $('#history').style.visibility = '';
        backdrop.classList.add('hidden');
        $('.panels').style.transform = '';
    } else {
        // Single column: restore single-tab behavior
        backdrop.classList.add('hidden');
        const activeTab = $('.tab.active')?.dataset.tab || 'dice';
        switchToTab(activeTab);
    }
}

function closeHistoryOverlay() {
    $('#history').classList.remove('active');
    $('#historyBackdrop').classList.add('hidden');
}

// Tab navigation
const tabsOrder = ['dice', 'favorites', 'history'];

function switchToTab(tabId) {
    if (isMultiPanel()) return;
    const tab = $(`.tab[data-tab="${tabId}"]`);
    if (!tab) return;

    $$('.tab').forEach(t => t.classList.remove('active'));
    $$('.tab-content').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const targetContent = $(`#${tabId}`);
    targetContent.classList.add('active');

    const index = tabsOrder.indexOf(tabId);
    $('.panels').style.transform = `translateX(-${(index * 100) / tabsOrder.length}%)`;
}

function switchTabRelative(offset) {
    const currentTab = $('.tab.active')?.dataset.tab || 'dice';
    let index = tabsOrder.indexOf(currentTab);
    index += offset;

    if (index >= 0 && index < tabsOrder.length) {
        switchToTab(tabsOrder[index]);
    }
}

$$('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        switchToTab(tab.dataset.tab);
    });
});

// Swipe support
let touchStartX = 0;
let touchStartY = 0;
const SWIPE_THRESHOLD = 50;

$('.panels').addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}, { passive: true });

$('.panels').addEventListener('touchend', (e) => {
    if (isMultiPanel()) return;

    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;

    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    // Must be horizontal swipe and exceed threshold
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > SWIPE_THRESHOLD) {
        if (deltaX > 0) {
            switchTabRelative(-1); // Swipe right -> previous
        } else {
            switchTabRelative(1);  // Swipe left -> next
        }
    }
}, { passive: true });

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
