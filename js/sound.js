// Audio
const audioCache = {};
function playSound(name) {
    if (state.settings.mute || name === 'none') return;
    if (!audioCache[name]) audioCache[name] = new Audio(`sounds/${name}.mp3`);
    const a = audioCache[name];
    a.currentTime = 0;
    a.play().catch(() => {});
}

// Wake lock
let wakeLockSentinel = null;

function applyWakeLock() {
    if (state.settings.keepAwake && navigator.wakeLock) {
        navigator.wakeLock.request('screen')
            .then(s => { wakeLockSentinel = s; })
            .catch(() => {});
    } else if (wakeLockSentinel) {
        wakeLockSentinel.release().catch(() => {});
        wakeLockSentinel = null;
    }
}

applyWakeLock();
