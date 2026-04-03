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
