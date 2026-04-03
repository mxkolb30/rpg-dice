// i18n engine — language files are loaded from lang/*.js
// To add a new language: create lang/<code>.js calling registerLanguage('<code>', { ... })
// then add a <script> tag in index.html and cache it in sw.js.

const translations = {};
let currentLang = 'en';

function registerLanguage(code, strings) {
    translations[code] = strings;
}

function t(key, params) {
    const str = translations[currentLang]?.[key] || translations['en']?.[key] || key;
    if (!params) return str;
    return str.replace(/\{(\w+)\}/g, (_, k) => params[k] !== undefined ? params[k] : `{${k}}`);
}

function setLanguage(lang) {
    currentLang = lang;
    document.documentElement.lang = lang;
    translatePage();
}

function translatePage() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        el.title = t(el.dataset.i18nTitle);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    document.querySelectorAll('[data-i18n-desc]').forEach(el => {
        el.dataset.desc = t(el.dataset.i18nDesc);
    });
}
