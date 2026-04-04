// Extract csvEscapeField and parseCsvLine from js/csv.js
const csvCode = require('fs').readFileSync('js/csv.js', 'utf8');
const csvEscapeMatch = csvCode.match(/function csvEscapeField[\s\S]*?^}/m);
eval(csvEscapeMatch[0]);
const parseCsvMatch = csvCode.match(/function parseCsvLine[\s\S]*?^}/m);
eval(parseCsvMatch[0]);

// --- CSV Export/Import ---

// csvEscapeField tests
global.assert(csvEscapeField('hello') === 'hello', 'csvEscape: plain string unchanged');
global.assert(csvEscapeField('a,b') === '"a,b"', 'csvEscape: commas get quoted');
global.assert(csvEscapeField('a"b') === '"a""b"', 'csvEscape: quotes get escaped');
global.assert(csvEscapeField('a\nb') === '"a\nb"', 'csvEscape: newlines get quoted');
global.assert(csvEscapeField('') === '', 'csvEscape: empty string unchanged');
global.assert(csvEscapeField('a,b"c\nd') === '"a,b""c\nd"', 'csvEscape: mixed special chars');

// parseCsvLine tests
let fields = parseCsvLine('name,formula,category');
global.assert(fields.length === 3, 'parseCsv: 3 fields from header');
global.assert(fields[0] === 'name' && fields[1] === 'formula' && fields[2] === 'category', 'parseCsv: header values');

fields = parseCsvLine('Fireball,6d6,Spells');
global.assert(fields[0] === 'Fireball', 'parseCsv: simple name');
global.assert(fields[1] === '6d6', 'parseCsv: simple formula');
global.assert(fields[2] === 'Spells', 'parseCsv: simple category');

fields = parseCsvLine('"Fire,ball",6d6,Spells');
global.assert(fields[0] === 'Fire,ball', 'parseCsv: quoted field with comma');

fields = parseCsvLine('"He said ""hello""",1d20,Greetings');
global.assert(fields[0] === 'He said "hello"', 'parseCsv: escaped quotes inside quoted field');

fields = parseCsvLine('a,,c');
global.assert(fields.length === 3 && fields[1] === '', 'parseCsv: empty middle field');

// Round-trip test: escape then parse
const testData = [
    ['Attack, Power', '2d6+3', 'Combat "Special"'],
    ['Simple', '1d20', 'General'],
];
for (const row of testData) {
    const csvLine = row.map(csvEscapeField).join(',');
    const parsed = parseCsvLine(csvLine);
    global.assert(parsed[0] === row[0], `Round-trip name: "${row[0]}" -> "${parsed[0]}"`);
    global.assert(parsed[1] === row[1], `Round-trip formula: "${row[1]}" -> "${parsed[1]}"`);
    global.assert(parsed[2] === row[2], `Round-trip category: "${row[2]}" -> "${parsed[2]}"`);
}
