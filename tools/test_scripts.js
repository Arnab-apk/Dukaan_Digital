// Runs every n8n Code-node script against sample data in a small mock of the n8n runtime.
// Usage (from the Dukaan_Digital folder):  node tools/test_scripts.js
// Writes tools/out/poster_test.html: open it in a browser to see the poster with sample text.
const { execFileSync } = require('child_process');
const path = require('path');
for (const f of ['test_flow.js', 'test_paths.js']) {
  console.log(`\n##### ${f} #####`);
  execFileSync(process.execPath, [path.join(__dirname, f)], { stdio: 'inherit' });
}
console.log('\nAll script checks finished without errors.');
