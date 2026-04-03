// CSV import/export
function csvEscapeField(value) {
    const s = String(value);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
}

function exportFavorites() {
    if (state.favorites.length === 0) return;
    const header = 'name,formula,category';
    const rows = state.favorites.map(fav =>
        [fav.name, fav.formula, fav.category || 'Uncategorized']
            .map(csvEscapeField).join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rpgdice-favorites.csv';
    a.click();
    URL.revokeObjectURL(url);
}

function parseCsvLine(line) {
    const fields = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
            if (ch === '"' && line[i + 1] === '"') {
                current += '"';
                i++;
            } else if (ch === '"') {
                inQuotes = false;
            } else {
                current += ch;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
            } else if (ch === ',') {
                fields.push(current);
                current = '';
            } else {
                current += ch;
            }
        }
    }
    fields.push(current);
    return fields;
}

function importFavorites() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,text/csv';
    input.addEventListener('change', () => {
        const file = input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const lines = reader.result.split(/\r?\n/).filter(l => l.trim());
            if (lines.length < 2) { alert(t('import.empty')); return; }

            const rows = lines.slice(1);
            let added = 0;
            for (const line of rows) {
                const fields = parseCsvLine(line);
                const name = (fields[0] || '').trim();
                const formula = (fields[1] || '').trim();
                const category = (fields[2] || '').trim() || 'Uncategorized';
                if (!name || !formula) continue;

                const exists = state.favorites.some(f => f.name === name && f.formula === formula);
                if (exists) continue;

                state.favorites.push({
                    name,
                    formula,
                    category,
                    theme: getDieTheme(formula),
                    id: Date.now() + added,
                });
                added++;
            }
            saveFavorites();
            renderFavorites();
            alert(t('import.success', { count: added }));
        };
        reader.readAsText(file);
    });
    input.click();
}

$('#exportFavBtn').addEventListener('click', exportFavorites);
$('#importFavBtn').addEventListener('click', importFavorites);
