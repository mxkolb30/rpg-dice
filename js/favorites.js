// Favorites
function saveFavorites() {
    localStorage.setItem('critdice_favorites', JSON.stringify(state.favorites));
}

function openFavModal(formula) {
    $('#favFormula').textContent = formula;
    $('#favName').value = '';
    $('#favCategory').value = '';
    const cats = [...new Set(state.favorites.map(f => f.category).filter(Boolean))];
    $('#categoryList').innerHTML = cats.map(c => `<option value="${c}">`).join('');
    $('#favModal').classList.remove('hidden');
    setTimeout(() => $('#favName').focus(), 100);
}

$('#closeFavModal').addEventListener('click', () => $('#favModal').classList.add('hidden'));
$('#cancelFav').addEventListener('click', () => $('#favModal').classList.add('hidden'));

$('#saveFav').addEventListener('click', () => {
    const name = $('#favName').value.trim();
    const formula = $('#favFormula').textContent;
    const category = $('#favCategory').value.trim() || 'Uncategorized';
    const theme = getDieTheme(formula);

    if (!name) { $('#favName').focus(); return; }

    state.favorites.push({ name, formula, category, theme, id: Date.now() });
    saveFavorites();
    renderFavorites();
    $('#favModal').classList.add('hidden');
});

function renderFavorites() {
    const list = $('#favList');
    const empty = $('#favEmpty');
    const header = $('#favoritesHeader');

    if (state.favorites.length === 0) {
        empty.classList.remove('hidden');
        header.style.display = 'none';
        list.innerHTML = '';
        return;
    }
    empty.classList.add('hidden');
    header.style.display = '';

    const groups = {};
    for (const fav of state.favorites) {
        const cat = fav.category || 'Uncategorized';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(fav);
    }

    list.innerHTML = Object.entries(groups).map(([cat, items]) => `
        <div class="fav-category">
            <div class="fav-category-header" onclick="this.classList.toggle('collapsed')">
                <span class="arrow">&#9660;</span> ${cat} (${items.length})
            </div>
            <div class="fav-category-items">
                ${items.map(fav => {
                    const theme = fav.theme || getDieTheme(fav.formula);
                    return `
                    <div class="fav-item" data-id="${fav.id}">
                        <div class="fav-result" onclick="rollFavorite(${fav.id})" style="background-color: ${theme.bg}; color: ${theme.text}">${esc(t('btn.roll'))}</div>
                        <div class="fav-info" onclick="rollFavorite(${fav.id})">
                            <div class="fav-name">${esc(fav.name)}</div>
                            <div class="fav-formula-text">${esc(fav.formula)}</div>
                        </div>
                        <div class="fav-actions">
                            <button class="fav-action-btn delete" onclick="deleteFavorite(${fav.id})" title="Delete">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 20px; height: 20px;">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                    </div>
                `}).join('')}
            </div>
        </div>
    `).join('');
}

window.rollFavorite = function(id) {
    const fav = state.favorites.find(f => f.id === id);
    if (!fav) return;

    if (!isMultiPanel()) {
        $$('.tab').forEach(t => t.classList.remove('active'));
        $$('.tab-content').forEach(t => t.classList.remove('active'));
        $$('.tab')[0].classList.add('active');
        $('#dice').classList.add('active');
    }

    state.input = fav.formula;
    updateDisplay();
    doRoll(fav.formula);
};

window.deleteFavorite = function(id) {
    if (!confirm(t('fav.delete.confirm'))) return;
    state.favorites = state.favorites.filter(f => f.id !== id);
    saveFavorites();
    renderFavorites();
};
