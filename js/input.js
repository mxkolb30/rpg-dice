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

    if (lastChar === '+' || lastChar === '-') {
        s.dice = true; s.digits = true; s.openParen = true;
        return s;
    }

    if (lastChar === '(' || lastChar === ',') {
        s.dice = true; s.digits = true;
        return s;
    }

    if (lastChar === ')') {
        s.K = true; s.k = true; s.X = true; s.x = true;
        s.operators = true; s.dice = true; s.digits = true; s.openParen = true;
        return s;
    }

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

    let subExpr = term;
    if (depth > 0) {
        const lastComma = term.lastIndexOf(',');
        const lastParen = term.lastIndexOf('(');
        const splitPos = Math.max(lastComma, lastParen);
        subExpr = splitPos >= 0 ? term.slice(splitPos + 1) : term;
    }

    const dMatch = subExpr.match(/d(F|\d*)(.*)/i);

    if (!dMatch) {
        s.dice = true; s.digits = true; s.operators = true; s.openParen = true;
        if (depth > 0) { s.comma = true; s.closeParen = true; s.operators = false; s.openParen = false; }
        return s;
    }

    const sidesStr = dMatch[1];
    const modifiers = dMatch[2];

    if (!sidesStr) {
        s.digits = true;
        return s;
    }

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

// Dice tab helpers
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
        el.textContent = t('dice.placeholder');
        el.classList.add('placeholder');
        hint.textContent = '';
    }
    applyButtonStates(getButtonStates(state.input));
}

// Die button handlers
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

// Number button handlers
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
    toggle.textContent = open ? t('modifiers.label.open') : t('modifiers.label.closed');
});

// Backspace
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

// Clear
$('#diceClear').addEventListener('click', () => {
    state.input = '';
    state.buildingCustomDie = false;
    $('#diceResult').innerHTML = '';
    updateDisplay();
});

// Roll button
$('#diceRoll').addEventListener('click', () => {
    doRoll(state.input);
});

// Favorite button
$('#diceFav').addEventListener('click', () => {
    if (!state.input) return;
    openFavModal(state.input);
});
