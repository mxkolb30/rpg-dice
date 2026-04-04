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
global.assert(simulateInput([{type:'die', val:'d6'}, {type:'die', val:'d6'}]) === '2d6', 'd6 + d6 -> 2d6');
global.assert(simulateInput([{type:'die', val:'d6'}, {type:'die', val:'d6'}, {type:'die', val:'d6'}]) === '3d6', 'd6 + d6 + d6 -> 3d6');

// Test die + die (different)
global.assert(simulateInput([{type:'die', val:'d6'}, {type:'die', val:'d20'}]) === 'd6+d20', 'd6 + d20 -> d6+d20');

// Test num + die
global.assert(simulateInput([{type:'num', val:'5'}, {type:'die', val:'d6'}]) === '5d6', '5 + d6 -> 5d6');

// Test die + num
global.assert(simulateInput([{type:'die', val:'d6'}, {type:'num', val:'5'}]) === 'd6+5', 'd6 + 5 -> d6+5');

// Test die + modifier + die
global.assert(simulateInput([{type:'die', val:'d6'}, {type:'mod', val:'!'}, {type:'die', val:'d6'}]) === 'd6!+d6', 'd6! + d6 -> d6!+d6');

// Test group + die
global.assert(simulateInput([{type:'grp', val:'('}, {type:'die', val:'d6'}, {type:'grp', val:')'}, {type:'die', val:'d6'}]) === '(d6)+d6', '(d6) + d6 -> (d6)+d6');

// Test operator + die
global.assert(simulateInput([{type:'die', val:'d6'}, {type:'num', val:'+'}, {type:'die', val:'d6'}]) === 'd6+d6', 'd6 + "+" + d6 -> d6+d6');

// Test custom dN dice
global.assert(simulateInput([{type:'die', val:'d'}, {type:'num', val:'1'}, {type:'num', val:'3'}]) === 'd13', 'dN + 1 + 3 -> d13');
global.assert(simulateInput([{type:'die', val:'d'}, {type:'num', val:'1'}, {type:'num', val:'3'}, {type:'num', val:'+'}, {type:'num', val:'5'}]) === 'd13+5', 'dN + 1 + 3 + + + 5 -> d13+5');
global.assert(simulateInput([{type:'die', val:'d'}, {type:'num', val:'1'}, {type:'num', val:'3'}, {type:'die', val:'d6'}]) === 'd13+d6', 'dN + 1 + 3 + d6 -> d13+d6');


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
    global.assert(elements.dice.classList.contains('active'), 'large: dice active');
    global.assert(elements.favorites.classList.contains('active'), 'large: favorites active');
    global.assert(elements.history.classList.contains('active'), 'large: history active');

    // Rotate to medium
    applyResponsiveLayoutTest(mockDom, true, false);
    global.assert(elements.dice.classList.contains('active'), 'large->mid: dice active');
    global.assert(elements.favorites.classList.contains('active'), 'large->mid: favorites active');
    global.assert(!elements.history.classList.contains('active'), 'large->mid: history closed');
})();

// Test: Medium -> Small restores single tab
(function() {
    const { elements, tabs, mockDom } = setupLayoutTest();
    // Simulate medium: dice + favorites active
    applyResponsiveLayoutTest(mockDom, true, false);
    global.assert(elements.dice.classList.contains('active'), 'mid: dice active');
    global.assert(elements.favorites.classList.contains('active'), 'mid: favorites active');

    // Rotate to small (dice tab is the active tab)
    applyResponsiveLayoutTest(mockDom, false, false);
    global.assert(elements.dice.classList.contains('active'), 'mid->small: dice active');
    global.assert(!elements.favorites.classList.contains('active'), 'mid->small: favorites not active');
    global.assert(!elements.history.classList.contains('active'), 'mid->small: history not active');
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
    global.assert(!elements.dice.classList.contains('active'), 'mid->small(fav): dice not active');
    global.assert(elements.favorites.classList.contains('active'), 'mid->small(fav): favorites active');
    global.assert(!elements.history.classList.contains('active'), 'mid->small(fav): history not active');
})();

// Test: Large -> Small restores single tab
(function() {
    const { elements, mockDom } = setupLayoutTest();
    applyResponsiveLayoutTest(mockDom, true, true);
    // Straight to small
    applyResponsiveLayoutTest(mockDom, false, false);
    global.assert(elements.dice.classList.contains('active'), 'large->small: dice active');
    global.assert(!elements.favorites.classList.contains('active'), 'large->small: favorites not active');
    global.assert(!elements.history.classList.contains('active'), 'large->small: history not active');
})();
