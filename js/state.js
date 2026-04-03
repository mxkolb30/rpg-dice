// State
const state = {
    input: '',
    buildingCustomDie: false,
    history: JSON.parse(localStorage.getItem('critdice_history') || '[]'),
    favorites: JSON.parse(localStorage.getItem('critdice_favorites') || '[]'),
    settings: JSON.parse(localStorage.getItem('critdice_settings') || '{}'),
};

// Defaults
if (state.settings.rollSound === undefined) state.settings.rollSound = 'roll_dice_1';
if (state.settings.critSound === undefined) state.settings.critSound = 'tada';
if (state.settings.fumbleSound === undefined) state.settings.fumbleSound = 'sad_trombone';
if (state.settings.theme === undefined) state.settings.theme = 'auto';
if (state.settings.lang === undefined) {
    state.settings.lang = navigator.language?.startsWith('de') ? 'de' : 'en';
}

// DOM refs
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// HTML escaper
function esc(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}
