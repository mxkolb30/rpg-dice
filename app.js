// Register service worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}

// State
const state = {
    input: '',
    buildingCustomDie: false,
    history: JSON.parse(localStorage.getItem('critdice_history') || '[]'),
    favorites: JSON.parse(localStorage.getItem('critdice_favorites') || '[]'),
    settings: JSON.parse(localStorage.getItem('critdice_settings') || '{}'),
};

// Defaults
if (state.settings.rollSound === undefined) state.settings.rollSound = 'roll_dice_1';
if (state.settings.critSound === undefined) state.settings.critSound = 'tada';
if (state.settings.fumbleSound === undefined) state.settings.fumbleSound = 'sad_trombone';
if (state.settings.theme === undefined) state.settings.theme = 'auto';

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
    // Update meta theme-color
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
        let isDark;
        if (theme === 'dark') isDark = true;
        else if (theme === 'light') isDark = false;
        else isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        meta.content = isDark ? '#313131' : '#ffffff';
    }
}

applyTheme(state.settings.theme);

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (state.settings.theme === 'auto') applyTheme('auto');
});

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

// Button state machine
function getButtonStates(input) {
    const s = {
        dice: false, digits: false, operators: false,
        K: false, k: false, X: false, x: false,
        R: false, r: false,
        bang: false, bangbang: false, bangp: false,
        compare: false, f: false,
        openParen: false, comma: false, closeParen: false,
    };

    // Track paren depth across full input
    let depth = 0;
    for (const ch of input) {
        if (ch === '(') depth++;
        else if (ch === ')') depth--;
    }

    if (!input) {
        s.dice = true; s.digits = true; s.openParen = true;
        return s;
    }

    const lastChar = input[input.length - 1];

    // After an operator: start a new term
    if (lastChar === '+' || lastChar === '-') {
        s.dice = true; s.digits = true; s.openParen = true;
        return s;
    }

    // After opening paren or comma: start a sub-expression
    if (lastChar === '(' || lastChar === ',') {
        s.dice = true; s.digits = true;
        return s;
    }

    // After closing paren: group-level keep/drop, operators, dice
    if (lastChar === ')') {
        s.K = true; s.k = true; s.X = true; s.x = true;
        s.operators = true; s.dice = true; s.digits = true; s.openParen = true;
        return s;
    }

    // Extract current term (after last +/- separator outside parens)
    let termStart = 0;
    let cur = '';
    let d = 0;
    for (let i = 0; i < input.length; i++) {
        const ch = input[i];
        if (ch === '(') d++;
        else if (ch === ')') d--;
        if ((ch === '+' || ch === '-') && cur.length > 0 && d === 0) {
            termStart = i + 1;
            cur = '';
        } else {
            cur += ch;
        }
    }
    const term = input.slice(termStart);

    // If we're inside a group, analyze the current sub-expression (after last comma)
    let subExpr = term;
    if (depth > 0) {
        const lastComma = term.lastIndexOf(',');
        const lastParen = term.lastIndexOf('(');
        const splitPos = Math.max(lastComma, lastParen);
        subExpr = splitPos >= 0 ? term.slice(splitPos + 1) : term;
    }

    // Check if sub-expression has a die in it
    const dMatch = subExpr.match(/d(F|\d*)(.*)/i);

    if (!dMatch) {
        // Bare constant (e.g. "5", "12")
        s.dice = true; s.digits = true; s.operators = true; s.openParen = true;
        if (depth > 0) { s.comma = true; s.closeParen = true; s.operators = false; s.openParen = false; }
        return s;
    }

    const sidesStr = dMatch[1];
    const modifiers = dMatch[2];

    // Incomplete die: ends with bare "d" (no sides yet)
    if (!sidesStr) {
        s.digits = true;
        return s;
    }

    // Complete die term — determine modifier context
    const hasKeepDrop = /[KkXx]/.test(modifiers);
    const hasExplode = /!!|!p|!/.test(modifiers);
    const hasReroll = /[Rr]/.test(modifiers);
    const hasFailure = /f/.test(modifiers);

    function enableUnusedMods() {
        if (!hasKeepDrop) { s.K = true; s.k = true; s.X = true; s.x = true; }
        if (!hasExplode) { s.bang = true; s.bangbang = true; s.bangp = true; }
        if (!hasReroll) { s.R = true; s.r = true; }
        if (!hasFailure) { s.f = true; }
    }

    // Inside a group: enable comma and close paren alongside modifiers
    function enableGroupNav() {
        if (depth > 0) { s.comma = true; s.closeParen = true; }
        else { s.operators = true; s.dice = true; s.openParen = true; }
    }

    if (!modifiers) {
        s.digits = true; s.compare = true;
        enableUnusedMods();
        enableGroupNav();
        if (depth === 0) { s.dice = true; }
        return s;
    }

    if (lastChar === '≤' || lastChar === '≥') {
        s.digits = true;
        return s;
    }

    if (lastChar === 'K' || lastChar === 'k' || lastChar === 'X' || lastChar === 'x') {
        s.digits = true;
        enableUnusedMods();
        s.K = false; s.k = false; s.X = false; s.x = false;
        enableGroupNav();
        if (depth === 0) { s.dice = true; }
        return s;
    }

    if (lastChar === 'R' || lastChar === 'r') {
        s.digits = true; s.compare = true;
        enableUnusedMods();
        s.R = false; s.r = false;
        enableGroupNav();
        if (depth === 0) { s.dice = true; }
        return s;
    }

    if (modifiers.endsWith('!!') || modifiers.endsWith('!p')) {
        s.digits = true; s.compare = true;
        enableUnusedMods();
        s.bang = false; s.bangbang = false; s.bangp = false;
        enableGroupNav();
        if (depth === 0) { s.dice = true; }
        return s;
    }

    if (lastChar === '!') {
        s.digits = true; s.compare = true;
        enableUnusedMods();
        s.bang = false; s.bangbang = false; s.bangp = false;
        enableGroupNav();
        if (depth === 0) { s.dice = true; }
        return s;
    }

    if (lastChar === 'f') {
        s.digits = true; s.compare = true;
        enableUnusedMods();
        s.f = false;
        enableGroupNav();
        if (depth === 0) { s.dice = true; }
        return s;
    }

    if (/\d/.test(lastChar)) {
        s.digits = true;
        enableUnusedMods();
        enableGroupNav();
        if (depth === 0) { s.operators = true; s.dice = true; s.openParen = true; }
        return s;
    }

    s.dice = true; s.digits = true;
    return s;
}

function applyButtonStates(states) {
    $$('#dice .die-btn').forEach(btn => {
        btn.disabled = !states.dice;
    });
    $$('#dice .num-btn').forEach(btn => {
        const val = btn.dataset.val;
        if (val === '+' || val === '-') {
            btn.disabled = !states.operators;
        } else {
            btn.disabled = !states.digits;
        }
    });
    const modMap = {
        'K': 'K', 'k': 'k', 'X': 'X', 'x': 'x',
        'R': 'R', 'r': 'r',
        '!': 'bang', '!!': 'bangbang', '!p': 'bangp',
        '≤': 'compare', '≥': 'compare',
        'f': 'f',
    };
    $$('#dice .mod-btn').forEach(btn => {
        const key = modMap[btn.dataset.val];
        btn.disabled = key ? !states[key] : true;
    });
    const grpMap = { '(': 'openParen', ',': 'comma', ')': 'closeParen' };
    $$('#dice .grp-btn').forEach(btn => {
        const key = grpMap[btn.dataset.val];
        btn.disabled = key ? !states[key] : true;
    });
}

// Dice tab
function getDieTheme(formula) {
    const match = formula.match(/d[0-9F]+/);
    if (!match) return { bg: 'var(--accent)', text: '#fff' };
    const die = match[0];
    const knownDice = ['d100', 'd20', 'd12', 'd10', 'd8', 'd6', 'd4', 'd3', 'd2', 'dF'];
    const themeDie = knownDice.includes(die) ? die : 'dN';
    return {
        bg: `var(--${themeDie})`,
        text: (themeDie === 'd8') ? '#333' : '#fff'
    };
}

function updateDisplay() {
    const el = $('#diceInput');
    const hint = $('#diceHint');
    const rollBtn = $('#diceRoll');

    const theme = getDieTheme(state.input);
    rollBtn.style.backgroundColor = theme.bg;
    rollBtn.style.color = theme.text;

    if (state.input) {
        el.textContent = state.input;
        el.classList.remove('placeholder');
        hint.textContent = describeFormula(state.input);
    } else {
        el.textContent = 'Tap a die to roll';
        el.classList.add('placeholder');
        hint.textContent = '';
    }
    applyButtonStates(getButtonStates(state.input));
}

$('#dice').querySelectorAll('.die-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (btn.disabled) return;
        const die = btn.dataset.die;
        state.buildingCustomDie = (die === 'd');
        const matchDie = state.input.match(/(\d*)(d[0-9F]+)$/);
        
        if (matchDie && die !== 'd') {
            if (matchDie[2] === die) {
                const count = matchDie[1] ? parseInt(matchDie[1], 10) : 1;
                state.input = state.input.slice(0, -matchDie[0].length) + (count + 1) + die;
            } else {
                state.input += '+' + die;
            }
        } else if (state.input === '' || /[+\-(,]$/.test(state.input) || /(?:^|[+\-(,])\d+$/.test(state.input)) {
            state.input += die;
        } else {
            state.input += '+' + die;
        }
        updateDisplay();
    });
});

$('#dice').querySelectorAll('.num-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (btn.disabled) return;
        const val = btn.dataset.val;
        if (val === '+' || val === '-') {
            state.buildingCustomDie = false;
            state.input += val;
        } else {
            if (!state.buildingCustomDie && /(?:d[0-9F]+|\))$/.test(state.input)) {
                state.input += '+' + val;
            } else {
                state.input += val;
            }
        }
        updateDisplay();
    });
});

// Group buttons
$('#dice').querySelectorAll('.grp-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (btn.disabled) return;
        state.buildingCustomDie = false;
        state.input += btn.dataset.val;
        updateDisplay();
    });
});

// Modifier buttons
$('#dice').querySelectorAll('.mod-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (btn.disabled) return;
        state.buildingCustomDie = false;
        state.input += btn.dataset.val;
        updateDisplay();
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
    btn.addEventListener('touchstart', () => {
        longPressTimer = setTimeout(() => showTooltip(btn), 400);
    }, { passive: true });
    btn.addEventListener('touchend', removeTooltip);
    btn.addEventListener('touchcancel', removeTooltip);
});

// Modifiers toggle
$('#modifiersToggle').addEventListener('click', () => {
    const panel = $('#modifiersPanel');
    const toggle = $('#modifiersToggle');
    panel.classList.toggle('hidden');
    const open = !panel.classList.contains('hidden');
    toggle.classList.toggle('open', open);
    toggle.innerHTML = open ? 'Modifiers &#9650;' : 'Modifiers &#9660;';
});

$('#diceBackspace').addEventListener('click', () => {
    const input = state.input;
    if (!input) return;
    state.buildingCustomDie = false;
    for (const tok of ['d100', '!!', '!p', 'dF']) {
        if (input.endsWith(tok)) {
            state.input = input.slice(0, -tok.length);
            updateDisplay();
            return;
        }
    }
    const m = input.match(/d\d+$/);
    if (m) {
        state.input = input.slice(0, -m[0].length);
    } else {
        state.input = input.slice(0, -1);
    }
    updateDisplay();
});

$('#diceClear').addEventListener('click', () => {
    state.input = '';
    state.buildingCustomDie = false;
    $('#diceResult').innerHTML = '';
    updateDisplay();
});

$('#diceRoll').addEventListener('click', () => {
    doRoll(state.input);
});

$('#diceFav').addEventListener('click', () => {
    if (!state.input) return;
    openFavModal(state.input);
});

// Rolling
function doRoll(formula) {
    if (!formula) return;
    try {
        const result = rollFormula(formula);
        displayResult(result, '#diceResult');
        $('#resultModal').classList.remove('hidden');
        addHistory(result);

        if (result.isCrit) playSound(state.settings.critSound);
        else if (result.isFumble) playSound(state.settings.fumbleSound);
        else playSound(state.settings.rollSound);
    } catch (e) {
        $('#diceResult').innerHTML = `<div class="result-card"><div class="result-details" style="color:#ef5350">${e.message}</div></div>`;
        $('#resultModal').classList.remove('hidden');
    }
}

function displayResult(result, targetSel) {
    const el = $(targetSel);
    let critClass = result.isCrit ? ' crit' : result.isFumble ? ' fumble' : '';

    const theme = getDieTheme(result.formula);

    let rollsHtml = '';
    for (const term of result.terms) {
        if (term.type === 'constant') {
            rollsHtml += `<span class="roll-kept">${term.sign === -1 ? '-' : ''}${term.desc}</span> `;
        } else if (term.type === 'group') {
            const prefix = term.sign === -1 ? '(-) ' : '';
            const droppedSet = new Set(term.droppedIdx);
            rollsHtml += `${prefix}<div class="group-rolls">`;
            term.subResults.forEach((sub, i) => {
                const isDropped = droppedSet.has(i);
                const cls = isDropped ? 'group-sub dropped' : 'group-sub';
                let subRolls = '';
                for (const t of sub.terms) {
                    if (t.type === 'constant') {
                        subRolls += `${t.sign === -1 ? '-' : ''}${t.desc} `;
                    } else {
                        subRolls += `[${t.rolls.join(', ')}] `;
                    }
                }
                rollsHtml += `<div class="${cls}"><span class="group-sub-label">${sub.formula}:</span>${subRolls}<span class="group-sub-total">= ${sub.total}</span></div>`;
            });
            rollsHtml += `</div>`;
        } else {
            const prefix = term.sign === -1 ? '(-) ' : '';
            const parts = [];
            const allRolls = term.rolls;
            const droppedSet = new Set();
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
                else if (i >= term.count) cls = 'roll-added';
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
            <div class="result-total${critClass} animate" style="background-color: ${theme.bg}; color: ${theme.text}">${result.total}</div>
            <div class="result-details">
                <div class="formula">${result.formula}</div>
                <div class="rolls">${rollsHtml}</div>
            </div>
        </div>
    `;
}

// History
function addHistory(result) {
    const theme = getDieTheme(result.formula);
    state.history.unshift({
        formula: result.formula,
        total: result.total,
        theme: theme,
        isCrit: result.isCrit,
        isFumble: result.isFumble,
        rolls: result.terms.map(t => {
            if (t.type === 'group') return {
                type: 'group', sign: t.sign, desc: t.desc,
                subResults: t.subResults.map(sr => ({ formula: sr.formula, total: sr.total, terms: sr.terms.map(st => ({ type: st.type, rolls: st.rolls, desc: st.desc, sign: st.sign })) })),
                keptIdx: t.keptIdx, droppedIdx: t.droppedIdx,
            };
            return {
                type: t.type, rolls: t.rolls, kept: t.kept, dropped: t.dropped,
                sign: t.sign, desc: t.desc, sides: t.sides, isFate: t.isFate, count: t.count,
            };
        }),
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
        const theme = h.theme || getDieTheme(h.formula);
        const ago = timeAgo(h.time);
        let details = '';
        if (h.rolls) {
            details = h.rolls.map(t => {
                if (t.type === 'constant') return `${t.sign === -1 ? '-' : ''}${t.desc}`;
                if (t.type === 'group') {
                    const droppedSet = new Set(t.droppedIdx);
                    return t.subResults.map((sr, i) => {
                        const mark = droppedSet.has(i) ? ' (dropped)' : '';
                        return `${sr.formula}=${sr.total}${mark}`;
                    }).join(' vs ');
                }
                const prefix = t.sign === -1 ? '(-) ' : '';
                return prefix + '[' + t.rolls.join(', ') + ']';
            }).join(' ');
        }
        return `
            <div class="hist-item" onclick="rollHistory(${i})">
                <div class="hist-result${critClass}" style="background-color: ${theme.bg}; color: ${theme.text}">${h.total}</div>
                <div class="hist-info">
                    <div class="hist-formula">${h.formula}</div>
                    <div class="hist-details">${details}</div>
                    <div class="hist-time">${ago}</div>
                </div>
            </div>
        `;
    }).join('');
}

window.rollHistory = function(i) {
    const h = state.history[i];
    if (!h) return;

    // Switch to dice tab and roll
    $$('.tab').forEach(t => t.classList.remove('active'));
    $$('.tab-content').forEach(t => t.classList.remove('active'));
    $$('.tab')[0].classList.add('active');
    $('#dice').classList.add('active');

    state.input = h.formula;
    updateDisplay();
    doRoll(h.formula);
};

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
    const theme = getDieTheme(formula);

    if (!name) { $('#favName').focus(); return; }

    state.favorites.push({ name, formula, category, theme, id: Date.now() });
    saveFavorites();
    renderFavorites();
    $('#favModal').classList.add('hidden');
});

function renderFavorites() {
    const list = $('#favList');
    const empty = $('#favEmpty');
    const header = $('#favoritesHeader');

    if (state.favorites.length === 0) {
        empty.classList.remove('hidden');
        header.style.display = 'none';
        list.innerHTML = '';
        return;
    }
    empty.classList.add('hidden');
    header.style.display = '';

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
                ${items.map(fav => {
                    const theme = fav.theme || getDieTheme(fav.formula);
                    return `
                    <div class="fav-item" data-id="${fav.id}">
                        <div class="fav-result" onclick="rollFavorite(${fav.id})" style="background-color: ${theme.bg}; color: ${theme.text}">Roll</div>
                        <div class="fav-info" onclick="rollFavorite(${fav.id})">
                            <div class="fav-name">${esc(fav.name)}</div>
                            <div class="fav-formula-text">${esc(fav.formula)}</div>
                        </div>
                        <div class="fav-actions">
                            <button class="fav-action-btn delete" onclick="deleteFavorite(${fav.id})" title="Delete">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 20px; height: 20px;">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                    </div>
                `}).join('')}
            </div>
        </div>
    `).join('');
}

window.rollFavorite = function(id) {
    const fav = state.favorites.find(f => f.id === id);
    if (!fav) return;

    // Switch to dice tab and roll
    $$('.tab').forEach(t => t.classList.remove('active'));
    $$('.tab-content').forEach(t => t.classList.remove('active'));
    $$('.tab')[0].classList.add('active');
    $('#dice').classList.add('active');

    state.input = fav.formula;
    updateDisplay();
    doRoll(fav.formula);
};

window.deleteFavorite = function(id) {
    if (!confirm('Delete this favorite?')) return;
    state.favorites = state.favorites.filter(f => f.id !== id);
    saveFavorites();
    renderFavorites();
};

function csvEscapeField(value) {
    const s = String(value);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
}

function exportFavorites() {
    if (state.favorites.length === 0) return;
    const header = 'name,formula,category';
    const rows = state.favorites.map(fav =>
        [fav.name, fav.formula, fav.category || 'Uncategorized']
            .map(csvEscapeField).join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rpgdice-favorites.csv';
    a.click();
    URL.revokeObjectURL(url);
}

function parseCsvLine(line) {
    const fields = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
            if (ch === '"' && line[i + 1] === '"') {
                current += '"';
                i++;
            } else if (ch === '"') {
                inQuotes = false;
            } else {
                current += ch;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
            } else if (ch === ',') {
                fields.push(current);
                current = '';
            } else {
                current += ch;
            }
        }
    }
    fields.push(current);
    return fields;
}

function importFavorites() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,text/csv';
    input.addEventListener('change', () => {
        const file = input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const lines = reader.result.split(/\r?\n/).filter(l => l.trim());
            if (lines.length < 2) { alert('CSV file is empty or has no data rows.'); return; }

            // Skip header row
            const rows = lines.slice(1);
            let added = 0;
            for (const line of rows) {
                const fields = parseCsvLine(line);
                const name = (fields[0] || '').trim();
                const formula = (fields[1] || '').trim();
                const category = (fields[2] || '').trim() || 'Uncategorized';
                if (!name || !formula) continue;

                // Skip duplicates
                const exists = state.favorites.some(f => f.name === name && f.formula === formula);
                if (exists) continue;

                state.favorites.push({
                    name,
                    formula,
                    category,
                    theme: getDieTheme(formula),
                    id: Date.now() + added,
                });
                added++;
            }
            saveFavorites();
            renderFavorites();
            alert(`Imported ${added} favorite(s).`);
        };
        reader.readAsText(file);
    });
    input.click();
}

$('#exportFavBtn').addEventListener('click', exportFavorites);
$('#importFavBtn').addEventListener('click', importFavorites);

function esc(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}

// Settings
$('#settingsBtn').addEventListener('click', () => {
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
    state.settings.theme = $('#themeSelect').value;
    state.settings.mute = $('#muteSounds').checked;
    state.settings.keepAwake = $('#keepAwake').checked;
    state.settings.rollSound = $('#rollSound').value;
    state.settings.critSound = $('#critSound').value;
    state.settings.fumbleSound = $('#fumbleSound').value;
    localStorage.setItem('critdice_settings', JSON.stringify(state.settings));

    applyTheme(state.settings.theme);

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
        if (activeTab === 'dice') doRoll(state.input);
    }
});

// Init
updateDisplay();
renderHistory();
renderFavorites();

// Wake lock
if (state.settings.keepAwake && navigator.wakeLock) {
    navigator.wakeLock.request('screen').catch(() => {});
}
