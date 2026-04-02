// State
const state = {
    basicInput: '',
    advInput: '',
    history: JSON.parse(localStorage.getItem('critdice_history') || '[]'),
    favorites: JSON.parse(localStorage.getItem('critdice_favorites') || '[]'),
    settings: JSON.parse(localStorage.getItem('critdice_settings') || '{}'),
};

// Defaults
if (state.settings.rollSound === undefined) state.settings.rollSound = 'roll_dice_1';
if (state.settings.critSound === undefined) state.settings.critSound = 'tada';
if (state.settings.fumbleSound === undefined) state.settings.fumbleSound = 'sad_trombone';

// Audio cache
const audioCache = {};
function playSound(name) {
    if (state.settings.mute || name === 'none') return;
    if (!audioCache[name]) audioCache[name] = new Audio(`sounds/${name}.mp3`);
    const a = audioCache[name];
    a.currentTime = 0;
    a.play().catch(() => {});
}

// DOM refs
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// Tabs
$$('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        $$('.tab').forEach(t => t.classList.remove('active'));
        $$('.tab-content').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        $(`#${tab.dataset.tab}`).classList.add('active');
    });
});

// Basic dice tab
function updateBasicDisplay() {
    const el = $('#basicInput');
    if (state.basicInput) {
        el.textContent = state.basicInput;
        el.classList.remove('placeholder');
    } else {
        el.textContent = 'Tap a die to roll';
        el.classList.add('placeholder');
    }
}

$('#dice').querySelectorAll('.die-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        state.basicInput += btn.dataset.die;
        updateBasicDisplay();
    });
});

$('#dice').querySelectorAll('.num-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        state.basicInput += btn.dataset.val;
        updateBasicDisplay();
    });
});

$('#basicBackspace').addEventListener('click', () => {
    // Remove last token intelligently
    const input = state.basicInput;
    if (!input) return;
    // Try to remove a dice token like "d100", "d20", etc
    const m = input.match(/(d\d+|dF)$/i);
    if (m) {
        state.basicInput = input.slice(0, -m[0].length);
    } else {
        state.basicInput = input.slice(0, -1);
    }
    updateBasicDisplay();
});

$('#basicClear').addEventListener('click', () => {
    state.basicInput = '';
    $('#basicResult').innerHTML = '';
    updateBasicDisplay();
});

$('#basicRoll').addEventListener('click', () => {
    doRoll(state.basicInput, 'basic');
});

$('#basicFav').addEventListener('click', () => {
    if (!state.basicInput) return;
    openFavModal(state.basicInput);
});

// Advanced dice tab
function updateAdvDisplay() {
    const el = $('#advInput');
    if (state.advInput) {
        el.textContent = state.advInput;
        el.classList.remove('placeholder');
        $('#advHint').textContent = describeFormula(state.advInput);
    } else {
        el.textContent = 'Tap dice & modifiers';
        el.classList.add('placeholder');
        $('#advHint').textContent = '';
    }
}

$('#advanced').querySelectorAll('.die-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        state.advInput += btn.dataset.die;
        updateAdvDisplay();
    });
});

$('#advanced').querySelectorAll('.num-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        state.advInput += btn.dataset.val;
        updateAdvDisplay();
    });
});

$('#advanced').querySelectorAll('.mod-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        state.advInput += btn.dataset.val;
        updateAdvDisplay();
    });

    // Tooltip on hover/long-press
    let tooltip = null;
    let longPressTimer = null;

    function showTooltip(btn) {
        removeTooltip();
        if (!btn.dataset.desc) return;
        tooltip = document.createElement('div');
        tooltip.className = 'mod-tooltip';
        tooltip.textContent = btn.dataset.desc;
        document.body.appendChild(tooltip);
        const rect = btn.getBoundingClientRect();
        tooltip.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - 270)) + 'px';
        tooltip.style.top = (rect.top - tooltip.offsetHeight - 6) + 'px';
    }

    function removeTooltip() {
        if (tooltip) { tooltip.remove(); tooltip = null; }
        clearTimeout(longPressTimer);
    }

    btn.addEventListener('mouseenter', () => showTooltip(btn));
    btn.addEventListener('mouseleave', removeTooltip);
    btn.addEventListener('touchstart', (e) => {
        longPressTimer = setTimeout(() => showTooltip(btn), 400);
    }, { passive: true });
    btn.addEventListener('touchend', removeTooltip);
    btn.addEventListener('touchcancel', removeTooltip);
});

$('#advBackspace').addEventListener('click', () => {
    const input = state.advInput;
    if (!input) return;
    // Try multi-char tokens
    for (const tok of ['d100', '!!', '!p', 'dF']) {
        if (input.endsWith(tok)) {
            state.advInput = input.slice(0, -tok.length);
            updateAdvDisplay();
            return;
        }
    }
    const m = input.match(/d\d+$/);
    if (m) {
        state.advInput = input.slice(0, -m[0].length);
    } else {
        state.advInput = input.slice(0, -1);
    }
    updateAdvDisplay();
});

$('#advClear').addEventListener('click', () => {
    state.advInput = '';
    $('#advResult').innerHTML = '';
    updateAdvDisplay();
});

$('#advRoll').addEventListener('click', () => {
    doRoll(state.advInput, 'advanced');
});

$('#advFav').addEventListener('click', () => {
    if (!state.advInput) return;
    openFavModal(state.advInput);
});

// Rolling
function doRoll(formula, tab) {
    if (!formula) return;
    try {
        const result = rollFormula(formula);
        displayResult(result, tab === 'basic' ? '#basicResult' : '#advResult');
        addHistory(result);

        if (result.isCrit) playSound(state.settings.critSound);
        else if (result.isFumble) playSound(state.settings.fumbleSound);
        else playSound(state.settings.rollSound);
    } catch (e) {
        const target = tab === 'basic' ? '#basicResult' : '#advResult';
        $(target).innerHTML = `<div class="result-card"><div class="result-details" style="color:#ef5350">${e.message}</div></div>`;
    }
}

function displayResult(result, targetSel) {
    const el = $(targetSel);
    let critClass = result.isCrit ? ' crit' : result.isFumble ? ' fumble' : '';

    let rollsHtml = '';
    for (const term of result.terms) {
        if (term.type === 'constant') {
            rollsHtml += `<span class="roll-kept">${term.sign === -1 ? '-' : ''}${term.desc}</span> `;
        } else {
            const prefix = term.sign === -1 ? '(-) ' : '';
            const parts = [];
            const allRolls = term.rolls;
            const droppedSet = new Set();
            // Mark dropped rolls
            for (const d of term.dropped) {
                for (let i = 0; i < allRolls.length; i++) {
                    if (allRolls[i] === d && !droppedSet.has(i)) {
                        droppedSet.add(i);
                        break;
                    }
                }
            }
            for (let i = 0; i < allRolls.length; i++) {
                const v = allRolls[i];
                let cls = 'roll-kept';
                if (droppedSet.has(i)) cls = 'roll-dropped';
                else if (i >= term.count) cls = 'roll-added'; // exploded
                else if (!term.isFate && v === term.sides) cls = 'roll-crit';
                else if (!term.isFate && v === 1) cls = 'roll-fumble';

                const display = term.isFate ? ['-', '0', '+'][v + 1] : v;
                parts.push(`<span class="${cls}">${display}</span>`);
            }
            rollsHtml += `${prefix}[${parts.join(', ')}] `;
        }
    }

    el.innerHTML = `
        <div class="result-card">
            <div class="result-total${critClass} animate">${result.total}</div>
            <div class="result-details">
                <div class="formula">${result.formula}</div>
                <div class="rolls">${rollsHtml}</div>
            </div>
        </div>
    `;
}

// History
function addHistory(result) {
    state.history.unshift({
        formula: result.formula,
        total: result.total,
        isCrit: result.isCrit,
        isFumble: result.isFumble,
        rolls: result.terms.map(t => ({
            type: t.type,
            rolls: t.rolls,
            kept: t.kept,
            dropped: t.dropped,
            sign: t.sign,
            desc: t.desc,
            sides: t.sides,
            isFate: t.isFate,
            count: t.count
        })),
        time: Date.now()
    });
    if (state.history.length > 100) state.history.pop();
    saveHistory();
    renderHistory();
}

function saveHistory() {
    localStorage.setItem('critdice_history', JSON.stringify(state.history));
}

function renderHistory() {
    const list = $('#histList');
    const empty = $('#histEmpty');
    const header = $('#historyHeader');

    if (state.history.length === 0) {
        empty.classList.remove('hidden');
        header.style.display = 'none';
        list.innerHTML = '';
        return;
    }

    empty.classList.add('hidden');
    header.style.display = '';

    list.innerHTML = state.history.map((h, i) => {
        const critClass = h.isCrit ? ' crit' : h.isFumble ? ' fumble' : '';
        const ago = timeAgo(h.time);
        let details = '';
        if (h.rolls) {
            details = h.rolls.map(t => {
                if (t.type === 'constant') return `${t.sign === -1 ? '-' : ''}${t.desc}`;
                const prefix = t.sign === -1 ? '(-) ' : '';
                return prefix + '[' + t.rolls.join(', ') + ']';
            }).join(' ');
        }
        return `
            <div class="hist-item">
                <div class="hist-result${critClass}">${h.total}</div>
                <div class="hist-info">
                    <div class="hist-formula">${h.formula}</div>
                    <div class="hist-details">${details}</div>
                    <div class="hist-time">${ago}</div>
                </div>
            </div>
        `;
    }).join('');
}

$('#clearHistory').addEventListener('click', () => {
    if (confirm('Clear all history?')) {
        state.history = [];
        saveHistory();
        renderHistory();
    }
});

function timeAgo(ts) {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
    return new Date(ts).toLocaleDateString();
}

// Favorites
function saveFavorites() {
    localStorage.setItem('critdice_favorites', JSON.stringify(state.favorites));
}

function openFavModal(formula) {
    $('#favFormula').textContent = formula;
    $('#favName').value = '';
    $('#favCategory').value = '';
    // Populate category datalist
    const cats = [...new Set(state.favorites.map(f => f.category).filter(Boolean))];
    $('#categoryList').innerHTML = cats.map(c => `<option value="${c}">`).join('');
    $('#favModal').classList.remove('hidden');
    setTimeout(() => $('#favName').focus(), 100);
}

$('#closeFavModal').addEventListener('click', () => $('#favModal').classList.add('hidden'));
$('#cancelFav').addEventListener('click', () => $('#favModal').classList.add('hidden'));

$('#saveFav').addEventListener('click', () => {
    const name = $('#favName').value.trim();
    const formula = $('#favFormula').textContent;
    const category = $('#favCategory').value.trim() || 'Uncategorized';

    if (!name) { $('#favName').focus(); return; }

    state.favorites.push({ name, formula, category, id: Date.now() });
    saveFavorites();
    renderFavorites();
    $('#favModal').classList.add('hidden');
});

function renderFavorites() {
    const list = $('#favList');
    const empty = $('#favEmpty');

    if (state.favorites.length === 0) {
        empty.classList.remove('hidden');
        list.innerHTML = '';
        return;
    }
    empty.classList.add('hidden');

    // Group by category
    const groups = {};
    for (const fav of state.favorites) {
        const cat = fav.category || 'Uncategorized';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(fav);
    }

    list.innerHTML = Object.entries(groups).map(([cat, items]) => `
        <div class="fav-category">
            <div class="fav-category-header" onclick="this.classList.toggle('collapsed')">
                <span class="arrow">&#9660;</span> ${cat} (${items.length})
            </div>
            <div class="fav-category-items">
                ${items.map(fav => `
                    <div class="fav-item" data-id="${fav.id}">
                        <div class="fav-result" onclick="rollFavorite(${fav.id})">Roll</div>
                        <div class="fav-info" onclick="rollFavorite(${fav.id})">
                            <div class="fav-name">${esc(fav.name)}</div>
                            <div class="fav-formula-text">${esc(fav.formula)}</div>
                        </div>
                        <div class="fav-actions">
                            <button class="fav-action-btn delete" onclick="deleteFavorite(${fav.id})" title="Delete">&#128465;</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

window.rollFavorite = function(id) {
    const fav = state.favorites.find(f => f.id === id);
    if (!fav) return;

    // Switch to basic tab and roll
    $$('.tab').forEach(t => t.classList.remove('active'));
    $$('.tab-content').forEach(t => t.classList.remove('active'));
    $$('.tab')[0].classList.add('active');
    $('#dice').classList.add('active');

    state.basicInput = fav.formula;
    updateBasicDisplay();
    doRoll(fav.formula, 'basic');
};

window.deleteFavorite = function(id) {
    if (!confirm('Delete this favorite?')) return;
    state.favorites = state.favorites.filter(f => f.id !== id);
    saveFavorites();
    renderFavorites();
};

function esc(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}

// Settings
$('#settingsBtn').addEventListener('click', () => {
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

function saveAndCloseSettings() {
    state.settings.mute = $('#muteSounds').checked;
    state.settings.keepAwake = $('#keepAwake').checked;
    state.settings.rollSound = $('#rollSound').value;
    state.settings.critSound = $('#critSound').value;
    state.settings.fumbleSound = $('#fumbleSound').value;
    localStorage.setItem('critdice_settings', JSON.stringify(state.settings));

    if (state.settings.keepAwake && navigator.wakeLock) {
        navigator.wakeLock.request('screen').catch(() => {});
    }

    $('#settingsModal').classList.add('hidden');
}

// Keyboard support
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 'Enter') {
        const activeTab = $('.tab.active').dataset.tab;
        if (activeTab === 'dice') doRoll(state.basicInput, 'basic');
        else if (activeTab === 'advanced') doRoll(state.advInput, 'advanced');
    }
});

// Init
updateBasicDisplay();
updateAdvDisplay();
renderHistory();
renderFavorites();

// Wake lock
if (state.settings.keepAwake && navigator.wakeLock) {
    navigator.wakeLock.request('screen').catch(() => {});
}
