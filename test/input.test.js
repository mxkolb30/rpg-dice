// Extract getButtonStates from js/input.js
const inputCode = require('fs').readFileSync('js/input.js', 'utf8');
const match = inputCode.match(/\/\/ Button state machine\nfunction getButtonStates[\s\S]*?^}/m);
eval(match[0]);

// --- Button states ---

function enabledKeys(input) {
    const s = getButtonStates(input);
    return Object.entries(s).filter(([, v]) => v).map(([k]) => k);
}

// Empty: dice, digits, openParen
let bs = enabledKeys('');
global.assert(bs.includes('dice'), 'Empty: dice enabled');
global.assert(bs.includes('digits'), 'Empty: digits enabled');
global.assert(bs.includes('openParen'), 'Empty: openParen enabled');
global.assert(!bs.includes('comma'), 'Empty: comma disabled');

// After (: dice and digits only
bs = enabledKeys('(');
global.assert(bs.includes('dice'), 'After (: dice enabled');
global.assert(bs.includes('digits'), 'After (: digits enabled');
global.assert(!bs.includes('openParen'), 'After (: openParen disabled');
global.assert(!bs.includes('operators'), 'After (: operators disabled');

// After (d8: modifiers + comma + closeParen
bs = enabledKeys('(d8');
global.assert(bs.includes('comma'), 'After (d8: comma enabled');
global.assert(bs.includes('closeParen'), 'After (d8: closeParen enabled');
global.assert(bs.includes('K'), 'After (d8: K enabled');
global.assert(bs.includes('bang'), 'After (d8: ! enabled');
global.assert(!bs.includes('operators'), 'After (d8: operators disabled (inside group)');

// After (d8,: dice and digits
bs = enabledKeys('(d8,');
global.assert(bs.includes('dice'), 'After (d8,: dice enabled');
global.assert(bs.includes('digits'), 'After (d8,: digits enabled');
global.assert(!bs.includes('comma'), 'After (d8,: comma disabled');

// After (d8,d6): K/k/X/x + operators + dice
bs = enabledKeys('(d8,d6)');
global.assert(bs.includes('K'), 'After ): K enabled');
global.assert(bs.includes('k'), 'After ): k enabled');
global.assert(bs.includes('X'), 'After ): X enabled');
global.assert(bs.includes('x'), 'After ): x enabled');
global.assert(bs.includes('operators'), 'After ): operators enabled');
global.assert(!bs.includes('bang'), 'After ): ! disabled');

// After operator: dice, digits, openParen
bs = enabledKeys('1d8+');
global.assert(bs.includes('dice'), 'After +: dice enabled');
global.assert(bs.includes('openParen'), 'After +: openParen enabled');
global.assert(!bs.includes('K'), 'After +: K disabled');

// --- Regression: Multiple comparison operators ---
// After 1d6!≥3: compare (≥/≤) should still be enabled (for a success threshold)
bs = enabledKeys('1d6!≥3');
global.assert(bs.includes('compare'), 'After 1d6!≥3: compare should be enabled for success threshold');

// After 1d6≥5: modifiers like ! should be DISABLED
bs = enabledKeys('1d6≥5');
global.assert(!bs.includes('bang'), 'After 1d6≥5: explode should be disabled');
global.assert(!bs.includes('K'), 'After 1d6≥5: keep should be disabled');
global.assert(bs.includes('f'), 'After 1d6≥5: failure threshold should be enabled');
