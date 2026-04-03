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

    $$('.tab').forEach(t => t.classList.remove('active'));
    $$('.tab-content').forEach(t => t.classList.remove('active'));
    $$('.tab')[0].classList.add('active');
    $('#dice').classList.add('active');

    state.input = h.formula;
    updateDisplay();
    doRoll(h.formula);
};

$('#clearHistory').addEventListener('click', () => {
    if (confirm(t('hist.clear.confirm'))) {
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
