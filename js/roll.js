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

    const termHtmls = [];
    for (let ti = 0; ti < result.terms.length; ti++) {
        const term = result.terms[ti];
        const sign = term.sign === -1 ? '-' : '+';

        if (term.type === 'constant') {
            if (ti > 0) termHtmls.push(`<span class="roll-operator">${sign}</span>`);
            else if (sign === '-') termHtmls.push(`<span class="roll-operator">-</span>`);
            termHtmls.push(`<span class="roll-constant">${term.desc}</span>`);
        } else if (term.type === 'group') {
            if (ti > 0) termHtmls.push(`<span class="roll-operator">${sign}</span>`);
            const droppedSet = new Set(term.droppedIdx);
            const groupHtml = term.subResults.map((sub, i) => {
                const isDropped = droppedSet.has(i);
                const cls = isDropped ? 'group-sub dropped' : 'group-sub';
                let subParts = [];
                for (const t of sub.terms) {
                    if (t.type === 'constant') {
                        subParts.push(`<span class="roll-kept">${t.sign === -1 ? '-' : ''}${t.desc}</span>`);
                    } else {
                        const explodedSet = new Set(t.exploded || []);
                        const rolls = t.rolls.map((v, idx) => {
                            const bang = explodedSet.has(idx) ? '!' : '';
                            return `<span class="roll-kept">${v}${bang}</span>`;
                        });
                        subParts.push(`<span class="roll-pill">${rolls.join('<span class="separator">,</span> ')}</span>`);
                    }
                }
                return `<div class="${cls}"><span class="group-sub-label">${sub.formula}:</span>${subParts.join(' ')}<span class="group-sub-total">= ${sub.total}</span></div>`;
            }).join('');
            termHtmls.push(`<div class="roll-term"><span class="roll-term-label">${esc(term.desc)}</span><div class="group-rolls">${groupHtml}</div></div>`);
        } else {
            if (ti > 0) termHtmls.push(`<span class="roll-operator">${sign}</span>`);
            else if (sign === '-') termHtmls.push(`<span class="roll-operator">-</span>`);

            const allRolls = term.rolls;
            const explodedSet = new Set(term.exploded || []);
            const droppedSet = new Set();
            for (const d of term.dropped) {
                for (let i = 0; i < allRolls.length; i++) {
                    if (allRolls[i] === d && !droppedSet.has(i)) {
                        droppedSet.add(i);
                        break;
                    }
                }
            }

            const parts = [];
            for (let i = 0; i < allRolls.length; i++) {
                const v = allRolls[i];
                let cls = 'roll-kept';
                if (droppedSet.has(i)) cls = 'roll-dropped';
                else if (i >= term.count) cls = 'roll-added';
                else if (!term.isFate && v === term.sides) cls = 'roll-crit';
                else if (!term.isFate && v === 1) cls = 'roll-fumble';

                const bang = explodedSet.has(i) ? '!' : '';
                const display = term.isFate ? ['-', '0', '+'][v + 1] : v;
                parts.push(`<span class="${cls}">${display}${bang}</span>`);
            }

            const pillContent = parts.join('<span class="separator">,</span> ');
            const label = `<span class="roll-term-label">${esc(term.desc)}</span>`;
            termHtmls.push(`<span class="roll-term">${label}<span class="roll-pill">${pillContent}</span></span>`);
        }
    }

    el.innerHTML = `
        <div class="result-card">
            <div class="result-total${critClass} animate" style="background-color: ${theme.bg}; color: ${theme.text}">${result.total}</div>
            <div class="result-details">
                <div class="formula">${result.formula}</div>
                <div class="rolls">${termHtmls.join('')}</div>
            </div>
        </div>
    `;
}
