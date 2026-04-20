// German translations (Deutsch)
// To add a new language, copy lang/en.js to lang/<code>.js,
// change the language code in registerLanguage(), and translate the values.
registerLanguage('de', {
    // App
    'app.title': 'RpgDice',

    // Dice tab
    'dice.placeholder': 'Tippe auf einen Würfel',
    'modifiers.label.closed': 'Modifikatoren \u25BC',
    'modifiers.label.open': 'Modifikatoren \u25B2',

    // Action buttons
    'btn.roll': 'Würfeln',
    'btn.clear.title': 'Löschen',
    'btn.fav.title': 'Favorit',
    'btn.backspace.title': 'Zurück',

    // Modifier tooltips
    'mod.K.desc': 'Höchste behalten \u2014 nur die N höchsten Würfel behalten',
    'mod.X.desc': 'Höchste entfernen \u2014 die N höchsten Würfel entfernen',
    'mod.R.desc': 'Neu würfeln \u2014 bei jedem Auftreten des Werts neu würfeln',
    'mod.bang.desc': 'Explodieren \u2014 bei Maximalwert erneut würfeln und addieren',
    'mod.lte.desc': 'Kleiner gleich \u2014 Schwellenwert setzen (z.B. R\u22642 würfelt 1er und 2er neu)',
    'mod.gte.desc': 'Größer gleich \u2014 Schwellenwert setzen (z.B. \u22657 zählt Erfolge)',
    'mod.k.desc': 'Niedrigste behalten \u2014 nur die N niedrigsten Würfel behalten',
    'mod.x.desc': 'Niedrigste entfernen \u2014 die N niedrigsten Würfel entfernen',
    'mod.r.desc': 'Einmal neu würfeln \u2014 einmal pro Würfel neu würfeln',
    'mod.bangbang.desc': 'Kompound \u2014 wie Explodieren, aber zum selben Würfeltotal addiert',
    'mod.bangp.desc': 'Penetrieren \u2014 wie Explodieren, aber jeder Extrawurf bekommt -1',
    'mod.f.desc': 'Fehlschläge zählen \u2014 Würfel die den Schwellenwert erreichen abziehen',

    // Group tooltips
    'grp.open.desc': 'Gruppe öffnen \u2014 verschiedene Würfel für kombiniertes Behalten/Entfernen gruppieren',
    'grp.sep.desc': 'Trennzeichen \u2014 Würfel innerhalb einer Gruppe trennen',
    'grp.close.desc': 'Gruppe schließen \u2014 Gruppe schließen, dann K/k/X/x hinzufügen',

    // Tabs
    'tab.dice': 'Würfel',
    'tab.favorites': 'Favoriten',
    'tab.history': 'Verlauf',

    // Favorites tab
    'fav.empty': 'Noch keine Favoriten. Speichere einen Wurf, indem du nach Eingabe einer Formel auf das Stern-Symbol tippst.',
    'btn.import': 'Importieren',
    'btn.export': 'Exportieren',
    'fav.delete.confirm': 'Diesen Favoriten löschen?',

    // History tab
    'hist.empty': 'Keine bisherigen Würfe.',
    'btn.clearHistory': 'Verlauf löschen',
    'hist.clear.confirm': 'Gesamten Verlauf löschen?',

    // Settings
    'settings.title': 'Einstellungen',
    'settings.language': 'Sprache',
    'settings.theme': 'Design',
    'theme.auto': 'Automatisch (System)',
    'theme.light': 'Hell',
    'theme.dark': 'Dunkel',
    'settings.mute': 'Alle Töne stumm',
    'settings.rollSound': 'Würfelgeräusch',
    'settings.critSound': 'Kritischer Treffer',
    'settings.fumbleSound': 'Patzer-Geräusch',
    'settings.keepAwake': 'Bildschirm anlassen',
    'settings.data': 'Favoritendaten',
    'settings.sounds': 'Sound',
    'sound.none': 'Keins',
    'sound.roll1': 'Würfelwurf 1',
    'sound.roll2': 'Würfelwurf 2',
    'sound.roll3': 'Würfelwurf 3',
    'sound.tada': 'Tada',
    'sound.applause': 'Applaus',
    'sound.bullseye': 'Volltreffer',
    'sound.sadTrombone': 'Traurige Posaune',
    'sound.aww': 'Aww',
    'sound.crickets': 'Grillen',
    'btn.update': 'Nach Updates suchen',
    'link.github': 'GitHub Repository',

    // Save favorite modal
    'fav.save.title': 'Favorit speichern',
    'fav.name': 'Name',
    'fav.name.placeholder': 'z.B. Feuerball-Schaden',
    'fav.category': 'Kategorie',
    'fav.category.placeholder': 'z.B. Zauber',
    'btn.cancel': 'Abbrechen',
    'btn.save': 'Speichern',

    // Import/Export
    'import.empty': 'CSV-Datei ist leer oder enthält keine Datenzeilen.',
    'import.success': '{count} Favorit(en) importiert.',

    // Update
    'update.checking': 'Prüfe\u2026',
    'update.upToDate': 'Bereits aktuell',
    'update.failed': 'Update fehlgeschlagen',
});
