'use strict';
const { spawnSync } = require('node:child_process');
const path = require('node:path');

for (const suite of ['parser', 'compiler', 'grammar', 'backend']) {
  const result = spawnSync(process.execPath, [path.join(__dirname, `${suite}-tests.js`)], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
