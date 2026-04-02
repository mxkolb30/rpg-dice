// Dice expression parser and roller

function rollDie(sides) {
    return Math.floor(Math.random() * sides) + 1;
}

function rollFateDie() {
    return Math.floor(Math.random() * 3) - 1; // -1, 0, 1
}

function tokenize(formula) {
    const tokens = [];
    const re = /(\d*d[F\d]+|[+\-]|\d+|[KkXxRr!]{1,2}p?|[≤≥]|f)/g;
    let m;
    while ((m = re.exec(formula)) !== null) {
        tokens.push(m[0]);
    }
    return tokens;
}

function parseDiceExpr(formula) {
    // Split into additive terms: "2d6+3+1d8-2" -> [{sign:1,expr:"2d6"},{sign:1,expr:"3"},{sign:1,expr:"1d8"},{sign:-1,expr:"2"}]
    const terms = [];
    let current = '';
    let sign = 1;

    // Normalize: trim whitespace
    formula = formula.trim();
    if (!formula) throw new Error('Empty formula');

    for (let i = 0; i < formula.length; i++) {
        const ch = formula[i];
        if ((ch === '+' || ch === '-') && current.length > 0 && !current.match(/[KkXxRr!≤≥f]$/)) {
            terms.push({ sign, expr: current.trim() });
            sign = ch === '+' ? 1 : -1;
            current = '';
        } else {
            current += ch;
        }
    }
    if (current.trim()) {
        terms.push({ sign, expr: current.trim() });
    }

    return terms;
}

function evaluateDiceTerm(expr) {
    // Check if it's a plain number
    if (/^\d+$/.test(expr)) {
        return { total: parseInt(expr), rolls: [], kept: [], dropped: [], type: 'constant', desc: expr };
    }

    // Parse dice expression: NdS[modifiers]
    const diceMatch = expr.match(/^(\d*)d(F|\d+)(.*)/i);
    if (!diceMatch) throw new Error(`Invalid term: ${expr}`);

    const count = diceMatch[1] ? parseInt(diceMatch[1]) : 1;
    const sidesStr = diceMatch[2];
    const isFate = sidesStr === 'F' || sidesStr === 'f';
    const sides = isFate ? 3 : parseInt(sidesStr);
    let modifiers = diceMatch[3] || '';

    if (count > 999) throw new Error('Please roll fewer than 1,000 dice at a time.');
    if (!isFate && sides < 1) throw new Error('Dice must have at least 1 side.');

    // Parse modifiers
    let explode = null, compound = null, penetrate = null;
    let reroll = null, rerollOnce = null;
    let keepHigh = null, keepLow = null, dropHigh = null, dropLow = null;
    let successThreshold = null, failureThreshold = null;

    const modRe = /(!!|!p|!|K|k|X(?!$)|x|R|r|f|≥|≤)(\d*)/g;
    let mm;
    // We need to parse modifiers more carefully
    let modStr = modifiers;
    while (modStr.length > 0) {
        let matched = false;

        // Compound !!
        if (modStr.startsWith('!!')) {
            let rest = modStr.slice(2);
            let cmp = null, val = null;
            if (rest.startsWith('≥') || rest.startsWith('≤')) {
                cmp = rest[0]; rest = rest.slice(1);
                const nm = rest.match(/^(\d+)/);
                if (nm) { val = parseInt(nm[1]); rest = rest.slice(nm[1].length); }
            } else {
                const nm = rest.match(/^(\d+)/);
                if (nm) { val = parseInt(nm[1]); rest = rest.slice(nm[1].length); }
            }
            compound = { cmp: cmp || '=', val: val || sides };
            modStr = rest; matched = true;
        }
        // Penetrate !p
        else if (modStr.startsWith('!p')) {
            let rest = modStr.slice(2);
            let cmp = null, val = null;
            if (rest.startsWith('≥') || rest.startsWith('≤')) {
                cmp = rest[0]; rest = rest.slice(1);
                const nm = rest.match(/^(\d+)/);
                if (nm) { val = parseInt(nm[1]); rest = rest.slice(nm[1].length); }
            } else {
                const nm = rest.match(/^(\d+)/);
                if (nm) { val = parseInt(nm[1]); rest = rest.slice(nm[1].length); }
            }
            penetrate = { cmp: cmp || '=', val: val || sides };
            modStr = rest; matched = true;
        }
        // Explode !
        else if (modStr.startsWith('!')) {
            let rest = modStr.slice(1);
            let cmp = null, val = null;
            if (rest.startsWith('≥') || rest.startsWith('≤')) {
                cmp = rest[0]; rest = rest.slice(1);
                const nm = rest.match(/^(\d+)/);
                if (nm) { val = parseInt(nm[1]); rest = rest.slice(nm[1].length); }
            } else {
                const nm = rest.match(/^(\d+)/);
                if (nm) { val = parseInt(nm[1]); rest = rest.slice(nm[1].length); }
            }
            explode = { cmp: cmp || '=', val: val || sides };
            modStr = rest; matched = true;
        }
        // Keep Highest K
        else if (modStr[0] === 'K') {
            let rest = modStr.slice(1);
            const nm = rest.match(/^(\d+)/);
            keepHigh = nm ? parseInt(nm[1]) : 1;
            if (nm) rest = rest.slice(nm[1].length);
            modStr = rest; matched = true;
        }
        // Keep Lowest k
        else if (modStr[0] === 'k') {
            let rest = modStr.slice(1);
            const nm = rest.match(/^(\d+)/);
            keepLow = nm ? parseInt(nm[1]) : 1;
            if (nm) rest = rest.slice(nm[1].length);
            modStr = rest; matched = true;
        }
        // Drop Highest X
        else if (modStr[0] === 'X') {
            let rest = modStr.slice(1);
            const nm = rest.match(/^(\d+)/);
            dropHigh = nm ? parseInt(nm[1]) : 1;
            if (nm) rest = rest.slice(nm[1].length);
            modStr = rest; matched = true;
        }
        // Drop Lowest x
        else if (modStr[0] === 'x') {
            let rest = modStr.slice(1);
            const nm = rest.match(/^(\d+)/);
            dropLow = nm ? parseInt(nm[1]) : 1;
            if (nm) rest = rest.slice(nm[1].length);
            modStr = rest; matched = true;
        }
        // Reroll R
        else if (modStr[0] === 'R') {
            let rest = modStr.slice(1);
            let cmp = null, val = null;
            if (rest.startsWith('≥') || rest.startsWith('≤')) {
                cmp = rest[0]; rest = rest.slice(1);
            }
            const nm = rest.match(/^(\d+)/);
            if (nm) { val = parseInt(nm[1]); rest = rest.slice(nm[1].length); }
            reroll = { cmp: cmp || '=', val: val || 1 };
            modStr = rest; matched = true;
        }
        // Reroll once r
        else if (modStr[0] === 'r') {
            let rest = modStr.slice(1);
            let cmp = null, val = null;
            if (rest.startsWith('≥') || rest.startsWith('≤')) {
                cmp = rest[0]; rest = rest.slice(1);
            }
            const nm = rest.match(/^(\d+)/);
            if (nm) { val = parseInt(nm[1]); rest = rest.slice(nm[1].length); }
            rerollOnce = { cmp: cmp || '=', val: val || 1 };
            modStr = rest; matched = true;
        }
        // Success ≥
        else if (modStr.startsWith('≥')) {
            let rest = modStr.slice(1);
            const nm = rest.match(/^(\d+)/);
            if (nm) {
                successThreshold = { cmp: '≥', val: parseInt(nm[1]) };
                rest = rest.slice(nm[1].length);
            }
            modStr = rest; matched = true;
        }
        // Success ≤
        else if (modStr.startsWith('≤')) {
            let rest = modStr.slice(1);
            const nm = rest.match(/^(\d+)/);
            if (nm) {
                successThreshold = { cmp: '≤', val: parseInt(nm[1]) };
                rest = rest.slice(nm[1].length);
            }
            modStr = rest; matched = true;
        }
        // Count failures f
        else if (modStr[0] === 'f') {
            let rest = modStr.slice(1);
            let cmp = null, val = null;
            if (rest.startsWith('≥') || rest.startsWith('≤')) {
                cmp = rest[0]; rest = rest.slice(1);
            }
            const nm = rest.match(/^(\d+)/);
            if (nm) { val = parseInt(nm[1]); rest = rest.slice(nm[1].length); }
            failureThreshold = { cmp: cmp || '≤', val: val || 1 };
            modStr = rest; matched = true;
        }

        if (!matched) {
            modStr = modStr.slice(1); // skip unknown char
        }
    }

    // Roll the dice
    let rolls = [];
    for (let i = 0; i < count; i++) {
        rolls.push(isFate ? rollFateDie() : rollDie(sides));
    }

    // Reroll (infinite until condition not met)
    if (reroll) {
        const maxIter = 1000;
        for (let i = 0; i < rolls.length; i++) {
            let iter = 0;
            while (matchesCondition(rolls[i], reroll) && iter < maxIter) {
                rolls[i] = isFate ? rollFateDie() : rollDie(sides);
                iter++;
            }
        }
    }

    // Reroll once
    if (rerollOnce) {
        for (let i = 0; i < rolls.length; i++) {
            if (matchesCondition(rolls[i], rerollOnce)) {
                rolls[i] = isFate ? rollFateDie() : rollDie(sides);
            }
        }
    }

    // Explode
    let extraRolls = [];
    if (explode) {
        for (let i = 0; i < rolls.length; i++) {
            let val = rolls[i];
            let iter = 0;
            while (matchesCondition(val, explode) && iter < 100) {
                val = rollDie(sides);
                extraRolls.push(val);
                iter++;
            }
        }
    }

    // Compound
    if (compound) {
        for (let i = 0; i < rolls.length; i++) {
            let val = rolls[i];
            let iter = 0;
            while (matchesCondition(val, compound) && iter < 100) {
                val = rollDie(sides);
                rolls[i] += val;
                iter++;
            }
        }
    }

    // Penetrate (like explode but -1 per extra roll)
    if (penetrate) {
        for (let i = 0; i < rolls.length; i++) {
            let val = rolls[i];
            let iter = 0;
            while (matchesCondition(val, penetrate) && iter < 100) {
                val = rollDie(sides);
                extraRolls.push(val - 1);
                iter++;
            }
        }
    }

    let allRolls = [...rolls, ...extraRolls];

    // Keep/Drop
    let kept = [...allRolls];
    let dropped = [];

    if (keepHigh !== null) {
        const sorted = [...kept].sort((a, b) => b - a);
        const keepSet = sorted.slice(0, keepHigh);
        dropped = [];
        kept = [];
        const usedIndices = new Set();
        for (const val of keepSet) {
            const idx = allRolls.findIndex((v, i) => v === val && !usedIndices.has(i));
            if (idx !== -1) usedIndices.add(idx);
        }
        allRolls.forEach((v, i) => {
            if (usedIndices.has(i)) kept.push(v);
            else dropped.push(v);
        });
    } else if (keepLow !== null) {
        const sorted = [...kept].sort((a, b) => a - b);
        const keepSet = sorted.slice(0, keepLow);
        dropped = [];
        kept = [];
        const usedIndices = new Set();
        for (const val of keepSet) {
            const idx = allRolls.findIndex((v, i) => v === val && !usedIndices.has(i));
            if (idx !== -1) usedIndices.add(idx);
        }
        allRolls.forEach((v, i) => {
            if (usedIndices.has(i)) kept.push(v);
            else dropped.push(v);
        });
    } else if (dropHigh !== null) {
        const sorted = [...kept].sort((a, b) => b - a);
        const dropSet = sorted.slice(0, dropHigh);
        dropped = [];
        kept = [];
        const usedIndices = new Set();
        for (const val of dropSet) {
            const idx = allRolls.findIndex((v, i) => v === val && !usedIndices.has(i));
            if (idx !== -1) usedIndices.add(idx);
        }
        allRolls.forEach((v, i) => {
            if (usedIndices.has(i)) dropped.push(v);
            else kept.push(v);
        });
    } else if (dropLow !== null) {
        const sorted = [...kept].sort((a, b) => a - b);
        const dropSet = sorted.slice(0, dropLow);
        dropped = [];
        kept = [];
        const usedIndices = new Set();
        for (const val of dropSet) {
            const idx = allRolls.findIndex((v, i) => v === val && !usedIndices.has(i));
            if (idx !== -1) usedIndices.add(idx);
        }
        allRolls.forEach((v, i) => {
            if (usedIndices.has(i)) dropped.push(v);
            else kept.push(v);
        });
    }

    // Calculate total
    let total;
    if (successThreshold) {
        // Count successes
        total = kept.filter(v => matchesCondition(v, successThreshold)).length;
        if (failureThreshold) {
            total -= kept.filter(v => matchesCondition(v, failureThreshold)).length;
        }
    } else {
        total = kept.reduce((s, v) => s + v, 0);
    }

    // Determine crits/fumbles for d20
    let isCrit = false, isFumble = false;
    if (sides === 20 && count === 1 && !successThreshold) {
        if (rolls[0] === 20) isCrit = true;
        if (rolls[0] === 1) isFumble = true;
    }

    return {
        total,
        rolls: allRolls,
        kept,
        dropped,
        isCrit,
        isFumble,
        sides,
        isFate,
        count,
        type: 'dice',
        desc: expr
    };
}

function matchesCondition(val, cond) {
    if (cond.cmp === '≥') return val >= cond.val;
    if (cond.cmp === '≤') return val <= cond.val;
    return val === cond.val; // '='
}

function rollFormula(formula) {
    if (!formula || !formula.trim()) throw new Error('Enter a dice formula');

    const terms = parseDiceExpr(formula);
    if (terms.length === 0) throw new Error('Invalid formula');

    let grandTotal = 0;
    const results = [];
    let hasCrit = false, hasFumble = false;

    for (const term of terms) {
        const result = evaluateDiceTerm(term.expr);
        result.sign = term.sign;
        grandTotal += term.sign * result.total;
        if (result.isCrit) hasCrit = true;
        if (result.isFumble) hasFumble = true;
        results.push(result);
    }

    return {
        formula,
        total: grandTotal,
        terms: results,
        isCrit: hasCrit,
        isFumble: hasFumble
    };
}

function describeFormula(formula) {
    try {
        const terms = parseDiceExpr(formula);
        const parts = [];
        for (const term of terms) {
            const prefix = term.sign === -1 ? '- ' : (parts.length > 0 ? '+ ' : '');
            if (/^\d+$/.test(term.expr)) {
                parts.push(prefix + term.expr);
            } else {
                const m = term.expr.match(/^(\d*)d(F|\d+)(.*)/i);
                if (!m) { parts.push(prefix + term.expr); continue; }

                const n = m[1] || '1';
                const s = m[2];
                const sides = s === 'F' ? 3 : parseInt(s);
                const mod = m[3] || '';
                let desc = `${prefix}${n}d${s}`;
                const descs = [];

                // Keep/Drop
                const keepHighM = mod.match(/K(\d*)/);
                const keepLowM = mod.match(/k(\d*)/);
                const dropHighM = mod.match(/X(\d*)/);
                const dropLowM = mod.match(/x(\d*)/);
                if (keepHighM) descs.push(`keep the highest ${keepHighM[1] || '1'}`);
                else if (keepLowM) descs.push(`keep the lowest ${keepLowM[1] || '1'}`);
                else if (dropHighM) descs.push(`drop the highest ${dropHighM[1] || '1'}`);
                else if (dropLowM) descs.push(`drop the lowest ${dropLowM[1] || '1'}`);

                // Explode/Compound/Penetrate
                if (mod.includes('!!')) {
                    const cm = mod.match(/!!([≥≤]?)(\d*)/);
                    const cmp = cm && cm[1];
                    const val = cm && cm[2] ? cm[2] : sides;
                    if (cmp === '≥') descs.push(`compound every time a ${val} or higher is rolled`);
                    else if (cmp === '≤') descs.push(`compound every time a ${val} or lower is rolled`);
                    else descs.push(`compound every time a ${val} is rolled`);
                } else if (mod.includes('!p')) {
                    const pm = mod.match(/!p([≥≤]?)(\d*)/);
                    const cmp = pm && pm[1];
                    const val = pm && pm[2] ? pm[2] : sides;
                    if (cmp === '≥') descs.push(`explode with -1 every time a ${val} or higher is rolled`);
                    else if (cmp === '≤') descs.push(`explode with -1 every time a ${val} or lower is rolled`);
                    else descs.push(`explode with -1 every time a ${val} is rolled`);
                } else if (mod.includes('!')) {
                    const em = mod.match(/!([≥≤]?)(\d*)/);
                    const cmp = em && em[1];
                    const val = em && em[2] ? em[2] : sides;
                    if (cmp === '≥') descs.push(`explode every time a ${val} or higher is rolled`);
                    else if (cmp === '≤') descs.push(`explode every time a ${val} or lower is rolled`);
                    else descs.push(`explode every time a ${val} is rolled`);
                }

                // Reroll
                if (mod.includes('R') && !mod.match(/[a-z]R/i)) {
                    const rm = mod.match(/R([≥≤]?)(\d*)/);
                    const cmp = rm && rm[1];
                    const val = rm && rm[2] ? rm[2] : '1';
                    if (cmp === '≥') descs.push(`reroll every time a ${val} or higher is rolled`);
                    else if (cmp === '≤') descs.push(`reroll every time a ${val} or lower is rolled`);
                    else descs.push(`reroll every time a ${val} is rolled`);
                } else if (mod.includes('r')) {
                    const rm = mod.match(/r([≥≤]?)(\d*)/);
                    const cmp = rm && rm[1];
                    const val = rm && rm[2] ? rm[2] : '1';
                    if (cmp === '≥') descs.push(`reroll once per die if a ${val} or higher is rolled`);
                    else if (cmp === '≤') descs.push(`reroll once per die if a ${val} or lower is rolled`);
                    else descs.push(`reroll once per die if a ${val} is rolled`);
                }

                // Success/Failure counting
                const succM = mod.match(/≥(\d+)/);
                const succLM = mod.match(/≤(\d+)/);
                if (succM && !mod.match(/[!Rr]≥/)) {
                    descs.push(`count one success for each roll of ${succM[1]} or higher`);
                } else if (succLM && !mod.match(/[!Rr]≤/)) {
                    descs.push(`count one success for each roll of ${succLM[1]} or lower`);
                }

                if (mod.includes('f')) {
                    const fm = mod.match(/f([≥≤]?)(\d*)/);
                    const cmp = fm && fm[1];
                    const val = fm && fm[2] ? fm[2] : '1';
                    if (cmp === '≥') descs.push(`subtract failures of ${val} or higher`);
                    else if (cmp === '≤') descs.push(`subtract failures of ${val} or lower`);
                    else descs.push(`subtract failures of ${val} or lower`);
                }

                if (descs.length > 0) desc += ` (${descs.join(', ')})`;
                parts.push(desc);
            }
        }
        return parts.join(' ');
    } catch {
        return '';
    }
}
