const fs = require('fs');

// Read the source package.json
const pkg = JSON.parse(fs.readFileSync('libs/minimal-gorules/package.json', 'utf8'));

// Fix the paths to be relative to the dist folder
pkg.main = './node/src/index.node.js';
pkg.module = './browser/src/index.browser.js';
pkg.browser = './browser/src/index.browser.js';
pkg.types = './node/src/index.node.d.ts';

// Fix exports paths
pkg.exports['.'].node.types = './node/src/index.node.d.ts';
pkg.exports['.'].node.require = './node/src/index.node.js';
pkg.exports['.'].node.default = './node/src/index.node.js';
pkg.exports['.'].browser.types = './browser/src/index.browser.d.ts';
pkg.exports['.'].browser.import = './browser/src/index.browser.js';
pkg.exports['.'].browser.default = './browser/src/index.browser.js';
pkg.exports['.'].types = './node/src/index.node.d.ts';
pkg.exports['.'].require = './node/src/index.node.js';
pkg.exports['.'].default = './node/src/index.node.js';

pkg.exports['./node'].types = './node/src/index.node.d.ts';
pkg.exports['./node'].require = './node/src/index.node.js';
pkg.exports['./node'].default = './node/src/index.node.js';

pkg.exports['./browser'].types = './browser/src/index.browser.d.ts';
pkg.exports['./browser'].import = './browser/src/index.browser.js';
pkg.exports['./browser'].default = './browser/src/index.browser.js';

// Remove bundle exports if they exist (since we're not using them)
if (pkg.exports['./bundle/node']) {
  delete pkg.exports['./bundle/node'];
}
if (pkg.exports['./bundle/browser']) {
  delete pkg.exports['./bundle/browser'];
}

// Ensure dist directory exists
fs.mkdirSync('libs/minimal-gorules/dist', { recursive: true });

// Write the fixed package.json
fs.writeFileSync('libs/minimal-gorules/dist/package.json', JSON.stringify(pkg, null, 2));

console.log('✅ Fixed package.json paths for dist folder');
