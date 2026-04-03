// Run with: node test/test.js (from project root)
eval(require('fs').readFileSync('js/dice.js', 'utf8'));

// Extract getButtonStates from js/input.js
const inputCode = require('fs').readFileSync('js/input.js', 'utf8');
const match = inputCode.match(/\/\/ Button state machine\nfunction getButtonStates[\s\S]*?^}/m);
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

// --- Smart Input Grouping ---

function simulateInput(sequence) {
    let input = '';
    let buildingCustomDie = false;
    
    // Mimic the logic from app.js
    sequence.forEach(step => {
        const type = step.type; // 'die' or 'num' or 'grp' or 'mod'
        const val = step.val;
        
        if (type === 'die') {
            const die = val;
            buildingCustomDie = (die === 'd');
            const matchDie = input.match(/(\d*)(d[0-9F]+)$/);
            
            if (matchDie && die !== 'd') {
                if (matchDie[2] === die) {
                    const count = matchDie[1] ? parseInt(matchDie[1], 10) : 1;
                    input = input.slice(0, -matchDie[0].length) + (count + 1) + die;
                } else {
                    input += '+' + die;
                }
            } else if (input === '' || /[+\-(,]$/.test(input) || /(?:^|[+\-(,])\d+$/.test(input)) {
                input += die;
            } else {
                input += '+' + die;
            }
        } else if (type === 'num') {
            if (val === '+' || val === '-') {
                buildingCustomDie = false;
                input += val;
            } else {
                if (!buildingCustomDie && /(?:d[0-9F]+|\))$/.test(input)) {
                    input += '+' + val;
                } else {
                    input += val;
                }
            }
        } else {
            buildingCustomDie = false;
            input += val;
        }
    });
    
    return input;
}

// Test die + die (same)
assert(simulateInput([{type:'die', val:'d6'}, {type:'die', val:'d6'}]) === '2d6', 'd6 + d6 -> 2d6');
assert(simulateInput([{type:'die', val:'d6'}, {type:'die', val:'d6'}, {type:'die', val:'d6'}]) === '3d6', 'd6 + d6 + d6 -> 3d6');

// Test die + die (different)
assert(simulateInput([{type:'die', val:'d6'}, {type:'die', val:'d20'}]) === 'd6+d20', 'd6 + d20 -> d6+d20');

// Test num + die
assert(simulateInput([{type:'num', val:'5'}, {type:'die', val:'d6'}]) === '5d6', '5 + d6 -> 5d6');

// Test die + num
assert(simulateInput([{type:'die', val:'d6'}, {type:'num', val:'5'}]) === 'd6+5', 'd6 + 5 -> d6+5');

// Test die + modifier + die
assert(simulateInput([{type:'die', val:'d6'}, {type:'mod', val:'!'}, {type:'die', val:'d6'}]) === 'd6!+d6', 'd6! + d6 -> d6!+d6');

// Test group + die
assert(simulateInput([{type:'grp', val:'('}, {type:'die', val:'d6'}, {type:'grp', val:')'}, {type:'die', val:'d6'}]) === '(d6)+d6', '(d6) + d6 -> (d6)+d6');

// Test operator + die
assert(simulateInput([{type:'die', val:'d6'}, {type:'num', val:'+'}, {type:'die', val:'d6'}]) === 'd6+d6', 'd6 + "+" + d6 -> d6+d6');

// Test custom dN dice
assert(simulateInput([{type:'die', val:'d'}, {type:'num', val:'1'}, {type:'num', val:'3'}]) === 'd13', 'dN + 1 + 3 -> d13');
assert(simulateInput([{type:'die', val:'d'}, {type:'num', val:'1'}, {type:'num', val:'3'}, {type:'num', val:'+'}, {type:'num', val:'5'}]) === 'd13+5', 'dN + 1 + 3 + + + 5 -> d13+5');
assert(simulateInput([{type:'die', val:'d'}, {type:'num', val:'1'}, {type:'num', val:'3'}, {type:'die', val:'d6'}]) === 'd13+d6', 'dN + 1 + 3 + d6 -> d13+d6');

// --- CSV Export/Import ---

// Extract csvEscapeField and parseCsvLine from js/csv.js
const csvCode = require('fs').readFileSync('js/csv.js', 'utf8');
const csvEscapeMatch = csvCode.match(/function csvEscapeField[\s\S]*?^}/m);
eval(csvEscapeMatch[0]);
const parseCsvMatch = csvCode.match(/function parseCsvLine[\s\S]*?^}/m);
eval(parseCsvMatch[0]);

// csvEscapeField tests
assert(csvEscapeField('hello') === 'hello', 'csvEscape: plain string unchanged');
assert(csvEscapeField('a,b') === '"a,b"', 'csvEscape: commas get quoted');
assert(csvEscapeField('a"b') === '"a""b"', 'csvEscape: quotes get escaped');
assert(csvEscapeField('a\nb') === '"a\nb"', 'csvEscape: newlines get quoted');
assert(csvEscapeField('') === '', 'csvEscape: empty string unchanged');
assert(csvEscapeField('a,b"c\nd') === '"a,b""c\nd"', 'csvEscape: mixed special chars');

// parseCsvLine tests
let fields = parseCsvLine('name,formula,category');
assert(fields.length === 3, 'parseCsv: 3 fields from header');
assert(fields[0] === 'name' && fields[1] === 'formula' && fields[2] === 'category', 'parseCsv: header values');

fields = parseCsvLine('Fireball,6d6,Spells');
assert(fields[0] === 'Fireball', 'parseCsv: simple name');
assert(fields[1] === '6d6', 'parseCsv: simple formula');
assert(fields[2] === 'Spells', 'parseCsv: simple category');

fields = parseCsvLine('"Fire,ball",6d6,Spells');
assert(fields[0] === 'Fire,ball', 'parseCsv: quoted field with comma');

fields = parseCsvLine('"He said ""hello""",1d20,Greetings');
assert(fields[0] === 'He said "hello"', 'parseCsv: escaped quotes inside quoted field');

fields = parseCsvLine('a,,c');
assert(fields.length === 3 && fields[1] === '', 'parseCsv: empty middle field');

// Round-trip test: escape then parse
const testData = [
    ['Attack, Power', '2d6+3', 'Combat "Special"'],
    ['Simple', '1d20', 'General'],
];
for (const row of testData) {
    const csvLine = row.map(csvEscapeField).join(',');
    const parsed = parseCsvLine(csvLine);
    assert(parsed[0] === row[0], `Round-trip name: "${row[0]}" -> "${parsed[0]}"`);
    assert(parsed[1] === row[1], `Round-trip formula: "${row[1]}" -> "${parsed[1]}"`);
    assert(parsed[2] === row[2], `Round-trip category: "${row[2]}" -> "${parsed[2]}"`);
}

// --- Responsive Layout ---

// Minimal DOM mock for layout tests
function createMockElement(id, classes) {
    const cls = new Set(classes || []);
    return {
        id,
        dataset: {},
        classList: {
            add(c) { cls.add(c); },
            remove(c) { cls.delete(c); },
            contains(c) { return cls.has(c); },
            _set: cls,
        },
    };
}

function setupLayoutTest() {
    const dice = createMockElement('dice', ['tab-content', 'active']);
    const favorites = createMockElement('favorites', ['tab-content']);
    const history = createMockElement('history', ['tab-content']);
    const backdrop = createMockElement('historyBackdrop', ['hidden']);
    const tabDice = createMockElement(null, ['tab', 'active']);
    tabDice.dataset.tab = 'dice';
    const tabFav = createMockElement(null, ['tab']);
    tabFav.dataset.tab = 'favorites';
    const tabHist = createMockElement(null, ['tab']);
    tabHist.dataset.tab = 'history';

    const elements = { dice, favorites, history, historyBackdrop: backdrop };
    const tabs = [tabDice, tabFav, tabHist];
    const tabContents = [dice, favorites, history];

    const mockDom = {
        $: (sel) => {
            if (sel.startsWith('#')) return elements[sel.slice(1)];
            if (sel === '.tab.active') return tabs.find(t => t.classList.contains('active')) || null;
            return null;
        },
        $$: (sel) => {
            if (sel === '.tab-content') return tabContents;
            if (sel === '.tab') return tabs;
            return [];
        },
    };

    return { elements, tabs, tabContents, mockDom };
}

function applyResponsiveLayoutTest(mockDom, isMulti, isThree) {
    const { $, $$ } = mockDom;
    const backdrop = $('#historyBackdrop');

    if (isThree) {
        $('#dice').classList.add('active');
        $('#favorites').classList.add('active');
        $('#history').classList.add('active');
        backdrop.classList.add('hidden');
    } else if (isMulti) {
        $('#dice').classList.add('active');
        $('#favorites').classList.add('active');
        $('#history').classList.remove('active');
        backdrop.classList.add('hidden');
    } else {
        backdrop.classList.add('hidden');
        $$('.tab-content').forEach(t => t.classList.remove('active'));
        const activeTab = $('.tab.active');
        if (activeTab) {
            $(`#${activeTab.dataset.tab}`).classList.add('active');
        } else {
            $$('.tab')[0].classList.add('active');
            $('#dice').classList.add('active');
        }
    }
}

// Test: Large -> Medium closes history
(function() {
    const { elements, mockDom } = setupLayoutTest();
    // Simulate large screen: all panels active
    applyResponsiveLayoutTest(mockDom, true, true);
    assert(elements.dice.classList.contains('active'), 'large: dice active');
    assert(elements.favorites.classList.contains('active'), 'large: favorites active');
    assert(elements.history.classList.contains('active'), 'large: history active');

    // Rotate to medium
    applyResponsiveLayoutTest(mockDom, true, false);
    assert(elements.dice.classList.contains('active'), 'large->mid: dice active');
    assert(elements.favorites.classList.contains('active'), 'large->mid: favorites active');
    assert(!elements.history.classList.contains('active'), 'large->mid: history closed');
})();

// Test: Medium -> Small restores single tab
(function() {
    const { elements, tabs, mockDom } = setupLayoutTest();
    // Simulate medium: dice + favorites active
    applyResponsiveLayoutTest(mockDom, true, false);
    assert(elements.dice.classList.contains('active'), 'mid: dice active');
    assert(elements.favorites.classList.contains('active'), 'mid: favorites active');

    // Rotate to small (dice tab is the active tab)
    applyResponsiveLayoutTest(mockDom, false, false);
    assert(elements.dice.classList.contains('active'), 'mid->small: dice active');
    assert(!elements.favorites.classList.contains('active'), 'mid->small: favorites not active');
    assert(!elements.history.classList.contains('active'), 'mid->small: history not active');
})();

// Test: Medium -> Small with favorites tab active
(function() {
    const { elements, tabs, mockDom } = setupLayoutTest();
    // Set favorites tab as active
    tabs[0].classList.remove('active');
    tabs[1].classList.add('active');

    applyResponsiveLayoutTest(mockDom, true, false);
    // Rotate to small
    applyResponsiveLayoutTest(mockDom, false, false);
    assert(!elements.dice.classList.contains('active'), 'mid->small(fav): dice not active');
    assert(elements.favorites.classList.contains('active'), 'mid->small(fav): favorites active');
    assert(!elements.history.classList.contains('active'), 'mid->small(fav): history not active');
})();

// Test: Large -> Small restores single tab
(function() {
    const { elements, mockDom } = setupLayoutTest();
    applyResponsiveLayoutTest(mockDom, true, true);
    // Straight to small
    applyResponsiveLayoutTest(mockDom, false, false);
    assert(elements.dice.classList.contains('active'), 'large->small: dice active');
    assert(!elements.favorites.classList.contains('active'), 'large->small: favorites not active');
    assert(!elements.history.classList.contains('active'), 'large->small: history not active');
})();

// --- Summary ---
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
