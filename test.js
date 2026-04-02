// Run with: node test.js
eval(require('fs').readFileSync('dice.js', 'utf8'));

// Extract getButtonStates from app.js
const appCode = require('fs').readFileSync('app.js', 'utf8');
const match = appCode.match(/\/\/ Button state machine\nfunction getButtonStates[\s\S]*?^}/m);
eval(match[0]);

let passed = 0;
let failed = 0;

function assert(condition, msg) {
    if (condition) {
        passed++;
    } else {
        failed++;
        console.error(`FAIL: ${msg}`);
    }
}

// --- Parser fixes ---

// 1d8!+1d6! should parse as two separate terms
const r1 = rollFormula('1d8!+1d6!');
assert(r1.terms.length === 2, '1d8!+1d6! should have 2 terms, got ' + r1.terms.length);
assert(r1.terms[0].type === 'dice', '1d8!+1d6! first term should be dice');
assert(r1.terms[1].type === 'dice', '1d8!+1d6! second term should be dice');

// 1d6R+1d8 should parse as two terms
const r2 = rollFormula('1d6R+1d8');
assert(r2.terms.length === 2, '1d6R+1d8 should have 2 terms, got ' + r2.terms.length);

// 2d6K1+3 should still work
const r3 = rollFormula('2d6K1+3');
assert(r3.terms.length === 2, '2d6K1+3 should have 2 terms');
assert(r3.terms[1].type === 'constant', '2d6K1+3 second term should be constant');

// --- Group dice ---

// Basic group keep highest
const g1 = rollFormula('(1d8,1d6)K');
assert(g1.terms.length === 1, '(1d8,1d6)K should have 1 term');
assert(g1.terms[0].type === 'group', '(1d8,1d6)K should be a group term');
assert(g1.terms[0].subResults.length === 2, 'Group should have 2 sub-results');
assert(g1.terms[0].keptIdx.length === 1, 'Group K should keep 1');
assert(g1.terms[0].droppedIdx.length === 1, 'Group K should drop 1');

// Group drop lowest
const g2 = rollFormula('(1d8,1d6)x');
assert(g2.terms[0].keptIdx.length === 1, 'Group x should keep 1');
assert(g2.terms[0].droppedIdx.length === 1, 'Group x should drop 1');

// Group keep lowest
const g3 = rollFormula('(1d8,1d6)k');
assert(g3.terms[0].keptIdx.length === 1, 'Group k should keep 1');

// Group drop highest
const g4 = rollFormula('(1d8,1d6)X');
assert(g4.terms[0].keptIdx.length === 1, 'Group X should keep 1');

// Group with modifiers on sub-expressions
const g5 = rollFormula('(1d8!,1d6!)x');
assert(g5.terms[0].type === 'group', '(1d8!,1d6!)x should be a group');
assert(g5.terms[0].subResults.length === 2, 'Group with modifiers should have 2 subs');

// Group with 3 sub-expressions, keep 2
const g6 = rollFormula('(1d8,1d6,1d4)K2');
assert(g6.terms[0].keptIdx.length === 2, '(...)K2 should keep 2');
assert(g6.terms[0].droppedIdx.length === 1, '(...)K2 should drop 1');

// Group as part of larger formula
const g7 = rollFormula('(1d8,1d6)K+5');
assert(g7.terms.length === 2, '(1d8,1d6)K+5 should have 2 terms');
assert(g7.terms[0].type === 'group', 'First term should be group');
assert(g7.terms[1].type === 'constant', 'Second term should be constant');

// Group total equals the kept sub-result total
const g8 = rollFormula('(1d8,1d6)K');
const keptTotal = g8.terms[0].subResults[g8.terms[0].keptIdx[0]].total;
assert(g8.terms[0].total === keptTotal, 'Group total should equal kept sub-result total');

// Group without modifier sums all
const g9 = rollFormula('(1d4,1d4)');
const sumAll = g9.terms[0].subResults.reduce((s, r) => s + r.total, 0);
assert(g9.terms[0].total === sumAll, 'Group without modifier should sum all sub-results');

// --- describeFormula ---

assert(describeFormula('(1d8,1d6)K') === '(1d8,1d6) keep the highest 1', 'Describe group K');
assert(describeFormula('(1d8,1d6)x') === '(1d8,1d6) drop the lowest 1', 'Describe group x');
assert(describeFormula('(1d8!,1d6!)K2') === '(1d8!,1d6!) keep the highest 2', 'Describe group K2');

// --- Button states ---

function enabledKeys(input) {
    const s = getButtonStates(input);
    return Object.entries(s).filter(([, v]) => v).map(([k]) => k);
}

// Empty: dice, digits, openParen
let bs = enabledKeys('');
assert(bs.includes('dice'), 'Empty: dice enabled');
assert(bs.includes('digits'), 'Empty: digits enabled');
assert(bs.includes('openParen'), 'Empty: openParen enabled');
assert(!bs.includes('comma'), 'Empty: comma disabled');

// After (: dice and digits only
bs = enabledKeys('(');
assert(bs.includes('dice'), 'After (: dice enabled');
assert(bs.includes('digits'), 'After (: digits enabled');
assert(!bs.includes('openParen'), 'After (: openParen disabled');
assert(!bs.includes('operators'), 'After (: operators disabled');

// After (d8: modifiers + comma + closeParen
bs = enabledKeys('(d8');
assert(bs.includes('comma'), 'After (d8: comma enabled');
assert(bs.includes('closeParen'), 'After (d8: closeParen enabled');
assert(bs.includes('K'), 'After (d8: K enabled');
assert(bs.includes('bang'), 'After (d8: ! enabled');
assert(!bs.includes('operators'), 'After (d8: operators disabled (inside group)');

// After (d8,: dice and digits
bs = enabledKeys('(d8,');
assert(bs.includes('dice'), 'After (d8,: dice enabled');
assert(bs.includes('digits'), 'After (d8,: digits enabled');
assert(!bs.includes('comma'), 'After (d8,: comma disabled');

// After (d8,d6): K/k/X/x + operators + dice
bs = enabledKeys('(d8,d6)');
assert(bs.includes('K'), 'After ): K enabled');
assert(bs.includes('k'), 'After ): k enabled');
assert(bs.includes('X'), 'After ): X enabled');
assert(bs.includes('x'), 'After ): x enabled');
assert(bs.includes('operators'), 'After ): operators enabled');
assert(!bs.includes('bang'), 'After ): ! disabled');

// After operator: dice, digits, openParen
bs = enabledKeys('1d8+');
assert(bs.includes('dice'), 'After +: dice enabled');
assert(bs.includes('openParen'), 'After +: openParen enabled');
assert(!bs.includes('K'), 'After +: K disabled');

// --- Error cases ---

let threw = false;
try { rollFormula('(1d8)K'); } catch { threw = true; }
assert(threw, 'Group with 1 sub-expression should throw');

threw = false;
try { rollFormula('()K'); } catch { threw = true; }
assert(threw, 'Empty group should throw');

// --- Summary ---
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
