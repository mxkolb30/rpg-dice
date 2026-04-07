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
                subResults: t.subResults.map(sr => ({ formula: sr.formula, total: sr.total, terms: sr.terms.map(st => ({ type: st.type, rolls: st.rolls, desc: st.desc, sign: st.sign, exploded: st.exploded })) })),
                keptIdx: t.keptIdx, droppedIdx: t.droppedIdx,
            };
            return {
                type: t.type, rolls: t.rolls, kept: t.kept, dropped: t.dropped,
                sign: t.sign, desc: t.desc, sides: t.sides, isFate: t.isFate, count: t.count,
                exploded: t.exploded
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
            const parts = h.rolls.map((t, ti) => {
                const sign = t.sign === -1 ? '<span class="roll-operator"> − </span>' : (ti > 0 ? '<span class="roll-operator"> + </span>' : '');

                if (t.type === 'constant') {
                    return `${sign}<span class="roll-constant">${t.desc}</span>`;
                }

                if (t.type === 'group') {
                    const droppedSet = new Set(t.droppedIdx);
                    const inner = t.subResults.map((sr, i) => {
                        const mark = droppedSet.has(i) ? ' <span class="roll-dropped">(dropped)</span>' : '';
                        const subParts = sr.terms.map(st => {
                            if (st.type === 'constant') return `<span class="roll-kept">${st.sign === -1 ? '-' : ''}${st.desc}</span>`;
                            const explodedSet = new Set(st.exploded || []);
                            const rolls = st.rolls.map((v, idx) => {
                                const bang = explodedSet.has(idx) ? '!' : '';
                                return `<span class="roll-kept">${v}${bang}</span>`;
                            });
                            return `<span class="roll-pill">${rolls.join('<span class="separator">,</span> ')}</span>`;
                        }).join(' ');
                        return `<span class="group-sub-label">${sr.formula}:</span>${subParts}<span class="group-sub-total">= ${sr.total}</span>${mark}`;
                    }).join(' vs ');
                    return `${sign}${inner}`;
                }

                // Dice term — build pill with crit/fumble coloring
                const allRolls = t.rolls || [];
                const explodedSet = new Set(t.exploded || []);
                const droppedSet = new Set();
                if (t.dropped) {
                    for (const d of t.dropped) {
                        for (let i = 0; i < allRolls.length; i++) {
                            if (allRolls[i] === d && !droppedSet.has(i)) {
                                droppedSet.add(i);
                                break;
                            }
                        }
                    }
                }
                const rollSpans = allRolls.map((v, i) => {
                    let cls = 'roll-kept';
                    if (droppedSet.has(i)) cls = 'roll-dropped';
                    else if (t.count !== undefined && i >= t.count) cls = 'roll-added';
                    else if (!t.isFate && v === t.sides) cls = 'roll-crit';
                    else if (!t.isFate && v === 1) cls = 'roll-fumble';
                    const bang = explodedSet.has(i) ? '!' : '';
                    const display = t.isFate ? ['-', '0', '+'][v + 1] : v;
                    return `<span class="${cls}">${display}${bang}</span>`;
                });
                const pill = `<span class="roll-pill">${rollSpans.join('<span class="separator">,</span> ')}</span>`;
                return `${sign}${pill}`;
            });
            details = `<span class="rolls hist-rolls">${parts.join('')}</span>`;
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

    if (isMultiPanel()) {
        closeHistoryOverlay();
    } else {
        $$('.tab').forEach(t => t.classList.remove('active'));
        $$('.tab-content').forEach(t => t.classList.remove('active'));
        $$('.tab')[0].classList.add('active');
        $('#dice').classList.add('active');
    }

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
