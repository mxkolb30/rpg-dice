eval(require('fs').readFileSync('js/dice.js', 'utf8'));

// --- Parser fixes ---

// 1d8!+1d6! should parse as two separate terms
const r1 = rollFormula('1d8!+1d6!');
global.assert(r1.terms.length === 2, '1d8!+1d6! should have 2 terms, got ' + r1.terms.length);
global.assert(r1.terms[0].type === 'dice', '1d8!+1d6! first term should be dice');
global.assert(r1.terms[1].type === 'dice', '1d8!+1d6! second term should be dice');

// 1d6R+1d8 should parse as two terms
const r2 = rollFormula('1d6R+1d8');
global.assert(r2.terms.length === 2, '1d6R+1d8 should have 2 terms, got ' + r2.terms.length);

// 2d6K1+3 should still work
const r3 = rollFormula('2d6K1+3');
global.assert(r3.terms.length === 2, '2d6K1+3 should have 2 terms');
global.assert(r3.terms[1].type === 'constant', '2d6K1+3 second term should be constant');

// --- Group dice ---

// Basic group keep highest
const g1 = rollFormula('(1d8,1d6)K');
global.assert(g1.terms.length === 1, '(1d8,1d6)K should have 1 term');
global.assert(g1.terms[0].type === 'group', '(1d8,1d6)K should be a group term');
global.assert(g1.terms[0].subResults.length === 2, 'Group should have 2 sub-results');
global.assert(g1.terms[0].keptIdx.length === 1, 'Group K should keep 1');
global.assert(g1.terms[0].droppedIdx.length === 1, 'Group K should drop 1');

// Group drop lowest
const g2 = rollFormula('(1d8,1d6)x');
global.assert(g2.terms[0].keptIdx.length === 1, 'Group x should keep 1');
global.assert(g2.terms[0].droppedIdx.length === 1, 'Group x should drop 1');

// Group keep lowest
const g3 = rollFormula('(1d8,1d6)k');
global.assert(g3.terms[0].keptIdx.length === 1, 'Group k should keep 1');

// Group drop highest
const g4 = rollFormula('(1d8,1d6)X');
global.assert(g4.terms[0].keptIdx.length === 1, 'Group X should keep 1');

// Group with modifiers on sub-expressions
const g5 = rollFormula('(1d8!,1d6!)x');
global.assert(g5.terms[0].type === 'group', '(1d8!,1d6!)x should be a group');
global.assert(g5.terms[0].subResults.length === 2, 'Group with modifiers should have 2 subs');

// Group with 3 sub-expressions, keep 2
const g6 = rollFormula('(1d8,1d6,1d4)K2');
global.assert(g6.terms[0].keptIdx.length === 2, '(...)K2 should keep 2');
global.assert(g6.terms[0].droppedIdx.length === 1, '(...)K2 should drop 1');

// Group as part of larger formula
const g7 = rollFormula('(1d8,1d6)K+5');
global.assert(g7.terms.length === 2, '(1d8,1d6)K+5 should have 2 terms');
global.assert(g7.terms[0].type === 'group', 'First term should be group');
global.assert(g7.terms[1].type === 'constant', 'Second term should be constant');

// Group total equals the kept sub-result total
const g8 = rollFormula('(1d8,1d6)K');
const keptTotal = g8.terms[0].subResults[g8.terms[0].keptIdx[0]].total;
global.assert(g8.terms[0].total === keptTotal, 'Group total should equal kept sub-result total');

// Group without modifier sums all
const g9 = rollFormula('(1d4,1d4)');
const sumAll = g9.terms[0].subResults.reduce((s, r) => s + r.total, 0);
global.assert(g9.terms[0].total === sumAll, 'Group without modifier should sum all sub-results');

// --- describeFormula ---

global.assert(describeFormula('(1d8,1d6)K') === '(1d8,1d6) keep the highest 1', 'Describe group K');
global.assert(describeFormula('(1d8,1d6)x') === '(1d8,1d6) drop the lowest 1', 'Describe group x');
global.assert(describeFormula('(1d8!,1d6!)K2') === '(1d8!,1d6!) keep the highest 2', 'Describe group K2');

// --- Error cases ---

let threw = false;
try { rollFormula('(1d8)K'); } catch { threw = true; }
global.assert(threw, 'Group with 1 sub-expression should throw');

threw = false;
try { rollFormula('()K'); } catch { threw = true; }
global.assert(threw, 'Empty group should throw');

// --- General Rolling Tests ---
const diceToTest = [3, 4, 6, 8, 10, 12, 20, 100];

for (const sides of diceToTest) {
    // 1. Bounds Test
    let allValid = true;
    for (let i = 0; i < 1000; i++) {
        const roll = rollFormula(`1d${sides}`);
        if (roll.total < 1 || roll.total > sides) {
            allValid = false;
            break;
        }
    }
    global.assert(allValid, `1d${sides} should always result in a number between 1 and ${sides}`);

    // 2. Average / Mass Roll Test
    const massRoll = rollFormula(`100d${sides}`);
    const expectedAverage = 100 * (sides + 1) / 2;
    // Standard deviation for 1d[sides] is sqrt((sides^2 - 1) / 12)
    // For 100d[sides], stdDev is sqrt(100) * stdDev(1d[sides]) = 10 * sqrt((sides^2 - 1) / 12)
    const stdDev = 10 * Math.sqrt((sides * sides - 1) / 12);
    // 4 standard deviations is a very safe margin (99.99% of rolls will fall within this)
    const margin = 4 * stdDev; 
    
    const isWithinMargin = massRoll.total >= (expectedAverage - margin) && massRoll.total <= (expectedAverage + margin);
    console.log(`100d${sides}: Sum=${massRoll.total.toString().padStart(4)}, Expected=${expectedAverage.toString().padStart(4)}, Margin=±${margin.toFixed(2).padStart(6)} (${isWithinMargin ? 'PASS' : 'FAIL'})`);
    global.assert(isWithinMargin, `100d${sides} sum (${massRoll.total}) should be within ${margin.toFixed(2)} of expected average ${expectedAverage}`);
}

// --- Modifier Tests ---

{
    const originalRollDie = rollDie;
    let rollValues = [];
    let rollIdx = 0;
    // Mock rollDie to return specific values
    rollDie = (sides) => {
        const val = rollValues[rollIdx++];
        return val;
    };

    // 1. Explode (!)
    rollValues = [6, 2]; rollIdx = 0;
    let res = rollFormula('1d6!');
    global.assert(res.total === 8, '1d6! (6, 2) should total 8');
    global.assert(res.terms[0].rolls.length === 2, '1d6! (6, 2) should have 2 rolls');

    // 2. Compound (!!)
    rollValues = [6, 2]; rollIdx = 0;
    res = rollFormula('1d6!!');
    global.assert(res.total === 8, '1d6!! (6, 2) should total 8');
    global.assert(res.terms[0].rolls.length === 1, '1d6!! (6, 2) should have 1 consolidated roll');

    // 3. Penetrate (!p)
    rollValues = [6, 2]; rollIdx = 0;
    res = rollFormula('1d6!p');
    global.assert(res.total === 7, '1d6!p (6, 2) should total 7 (6 + (2-1))');

    // 4. Keep Highest (K)
    rollValues = [2, 10, 5, 8]; rollIdx = 0;
    res = rollFormula('4d10K2');
    global.assert(res.total === 18, '4d10K2 (2, 10, 5, 8) should keep 10, 8 = 18');

    // 5. Keep Lowest (k)
    rollValues = [2, 10, 5, 8]; rollIdx = 0;
    res = rollFormula('4d10k2');
    global.assert(res.total === 7, '4d10k2 (2, 10, 5, 8) should keep 2, 5 = 7');

    // 6. Drop Highest (X)
    rollValues = [2, 10, 5, 8]; rollIdx = 0;
    res = rollFormula('4d10X1');
    global.assert(res.total === 15, '4d10X1 (2, 10, 5, 8) should drop 10, keeping 2, 5, 8 = 15');

    // 7. Drop Lowest (x)
    rollValues = [2, 10, 5, 8]; rollIdx = 0;
    res = rollFormula('4d10x1');
    global.assert(res.total === 23, '4d10x1 (2, 10, 5, 8) should drop 2, keeping 10, 5, 8 = 23');

    // 8. Reroll (R)
    rollValues = [1, 1, 3]; rollIdx = 0;
    res = rollFormula('1d6R1');
    global.assert(res.total === 3, '1d6R1 (1, 1, 3) should reroll until 3');

    // 9. Reroll Once (r)
    rollValues = [1, 1, 3]; rollIdx = 0;
    res = rollFormula('1d6r1');
    global.assert(res.total === 1, '1d6r1 (1, 1, 3) should reroll once to 1 (index 1), then stop');

    // 10. Successes (≥, ≤)
    rollValues = [2, 10, 5, 8, 1]; rollIdx = 0;
    res = rollFormula('5d10≥6');
    global.assert(res.total === 2, '5d10≥6 (2, 10, 5, 8, 1) should have 2 successes');

    // 11. Failures (f)
    rollValues = [2, 10, 5, 8, 1]; rollIdx = 0;
    res = rollFormula('5d10≥6f1');
    global.assert(res.total === 1, '5d10≥6f1 (2, 10, 5, 8, 1) should have 2 successes - 1 failure = 1');

    // 12. Combined Explosion Condition (!≥)
    rollValues = [3, 5, 2]; rollIdx = 0;
    res = rollFormula('1d6!≥3');
    global.assert(res.total === 10, '1d6!≥3 (3, 5, 2) should explode on 3 and 5, totaling 3+5+2=10');

    // 13. Combined Compounding Condition (!!≥)
    rollValues = [3, 5, 2]; rollIdx = 0;
    res = rollFormula('1d6!!≥3');
    global.assert(res.total === 10, '1d6!!≥3 (3, 5, 2) should compound on 3 and 5, totaling 10');
    global.assert(res.terms[0].rolls.length === 1, '1d6!!≥3 should have 1 consolidated roll');

    // 14. Explosion with Success Threshold
    rollValues = [3, 5, 2]; rollIdx = 0;
    res = rollFormula('1d6!≥3≥5');
    global.assert(res.total === 1, '1d6!≥3≥5 (3, 5, 2) should explode twice, but only 5 is a success (>=5)');

    // Restore original
    rollDie = originalRollDie;
}
