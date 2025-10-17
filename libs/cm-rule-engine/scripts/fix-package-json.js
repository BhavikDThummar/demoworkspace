const fs = require('fs');

// Read the source package.json
const pkg = JSON.parse(fs.readFileSync('libs/cm-rule-engine/package.json', 'utf8'));

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

// Fix React export paths
if (pkg.exports['./react']) {
  pkg.exports['./react'].types = './browser/src/lib/react/index.d.ts';
  pkg.exports['./react'].import = './browser/src/lib/react/index.js';
  pkg.exports['./react'].default = './browser/src/lib/react/index.js';
}

// Fix NestJS export paths
if (pkg.exports['./nestjs']) {
  pkg.exports['./nestjs'].types = './node/src/lib/nestjs/index.d.ts';
  pkg.exports['./nestjs'].require = './node/src/lib/nestjs/index.js';
  pkg.exports['./nestjs'].default = './node/src/lib/nestjs/index.js';
}



// Ensure dist directory exists
fs.mkdirSync('libs/cm-rule-engine/dist', { recursive: true });

// Write the fixed package.json
fs.writeFileSync('libs/cm-rule-engine/dist/package.json', JSON.stringify(pkg, null, 2));

console.log('✅ Fixed package.json paths for dist folder');
