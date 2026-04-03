// English translations
// To add a new language, copy this file to lang/<code>.js,
// change the language code in registerLanguage(), and translate the values.
registerLanguage('en', {
    // App
    'app.title': 'RpgDice',

    // Dice tab
    'dice.placeholder': 'Tap a die to roll',
    'modifiers.label.closed': 'Modifiers \u25BC',
    'modifiers.label.open': 'Modifiers \u25B2',

    // Action buttons
    'btn.roll': 'Roll',
    'btn.clear.title': 'Clear',
    'btn.fav.title': 'Favorite',
    'btn.backspace.title': 'Backspace',

    // Modifier tooltips
    'mod.K.desc': 'Keep Highest \u2014 keep only the N highest dice',
    'mod.X.desc': 'Drop Highest \u2014 remove the N highest dice',
    'mod.R.desc': 'Reroll \u2014 reroll every time the value is rolled',
    'mod.bang.desc': 'Explode \u2014 roll again and add when max is rolled',
    'mod.lte.desc': 'Less or Equal \u2014 set a threshold (e.g. R\u22642 rerolls 1s and 2s)',
    'mod.gte.desc': 'Greater or Equal \u2014 set a threshold (e.g. \u22657 counts successes)',
    'mod.k.desc': 'Keep Lowest \u2014 keep only the N lowest dice',
    'mod.x.desc': 'Drop Lowest \u2014 remove the N lowest dice',
    'mod.r.desc': 'Reroll Once \u2014 reroll once per die if value is rolled',
    'mod.bangbang.desc': 'Compound \u2014 like explode, but added to the same die total',
    'mod.bangp.desc': 'Penetrate \u2014 like explode, but each extra roll gets -1',
    'mod.f.desc': 'Count Failures \u2014 subtract dice meeting a threshold',

    // Group tooltips
    'grp.open.desc': 'Open Group \u2014 group different dice for combined keep/drop',
    'grp.sep.desc': 'Separator \u2014 separate dice within a group',
    'grp.close.desc': 'Close Group \u2014 close group, then add K/k/X/x',

    // Tabs
    'tab.dice': 'Dice',
    'tab.favorites': 'Favorites',
    'tab.history': 'History',

    // Favorites tab
    'fav.empty': 'No favorites yet. Save a roll by tapping the star icon after entering a formula.',
    'btn.import': 'Import',
    'btn.export': 'Export',
    'fav.delete.confirm': 'Delete this favorite?',

    // History tab
    'hist.empty': 'No previous rolls.',
    'btn.clearHistory': 'Clear History',
    'hist.clear.confirm': 'Clear all history?',

    // Settings
    'settings.title': 'Settings',
    'settings.language': 'Language',
    'settings.theme': 'Theme',
    'theme.auto': 'Auto (System)',
    'theme.light': 'Light',
    'theme.dark': 'Dark',
    'settings.mute': 'Mute all sounds',
    'settings.rollSound': 'Roll sound',
    'settings.critSound': 'Critical sound',
    'settings.fumbleSound': 'Fumble sound',
    'settings.keepAwake': 'Keep screen awake',
    'sound.none': 'None',
    'sound.roll1': 'Dice Roll 1',
    'sound.roll2': 'Dice Roll 2',
    'sound.roll3': 'Dice Roll 3',
    'sound.tada': 'Tada',
    'sound.applause': 'Applause',
    'sound.bullseye': 'Bullseye',
    'sound.sadTrombone': 'Sad Trombone',
    'sound.aww': 'Aww',
    'sound.crickets': 'Crickets',
    'btn.update': 'Check for updates',
    'link.github': 'GitHub Repository',

    // Save favorite modal
    'fav.save.title': 'Save Favorite',
    'fav.name': 'Name',
    'fav.name.placeholder': 'e.g. Fireball Damage',
    'fav.category': 'Category',
    'fav.category.placeholder': 'e.g. Spells',
    'btn.cancel': 'Cancel',
    'btn.save': 'Save',

    // Import/Export
    'import.empty': 'CSV file is empty or has no data rows.',
    'import.success': 'Imported {count} favorite(s).',

    // Update
    'update.checking': 'Checking\u2026',
    'update.upToDate': 'Already up to date',
    'update.failed': 'Update failed',
});
