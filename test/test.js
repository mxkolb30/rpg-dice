// Run with: node test/test.js (from project root)

let passed = 0;
let failed = 0;

global.assert = function(condition, msg) {
    if (condition) {
        passed++;
    } else {
        failed++;
        console.error(`FAIL: ${msg}`);
    }
};

require('./dice.test.js');
require('./input.test.js');
require('./csv.test.js');
require('./app.test.js');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
