'use strict';
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const suites = [
  'lexical-and-syntax-tests.js',
  'compiler-pipeline-tests.js',
  'll1-grammar-tests.js',
  'compiler-backend-tests.js',
];

for (const suite of suites) {
  const result = spawnSync(process.execPath, [path.join(__dirname, suite)], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
