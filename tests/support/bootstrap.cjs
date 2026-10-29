/**
 * Entry point for a single test file in the native suite.
 *
 * Loading the file through `require` (rather than as the process entry point)
 * keeps Node's built-in ESM/type-stripping loader out of the way, so the
 * ts-node CommonJS hook in `jest-register.cjs` handles the TypeScript source
 * even inside packages that declare `"type": "module"`.
 */
const path = require('node:path');

const target = process.argv[2];
if (!target) {
  console.error('bootstrap: missing test file');
  process.exit(1);
}

require(path.resolve(target));
