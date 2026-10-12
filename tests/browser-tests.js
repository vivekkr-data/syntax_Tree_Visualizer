'use strict';
// Optional integration suite: npm install --no-save --package-lock=false playwright
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
let count = 0;

async function main() {
  const server = http.createServer(async (request, response) => {
    const name = request.url.split('?')[0] === '/' ? 'index.html' : request.url.split('?')[0].slice(1);
    if (!/^[a-zA-Z0-9.-]+$/.test(name)) { response.writeHead(404).end(); return; }
    try {
      const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
      response.setHeader('Content-Type', types[path.extname(name)] || 'text/plain');
      response.end(await fs.readFile(path.join(root, name)));
    } catch (_) { response.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const url = `http://127.0.0.1:${server.address().port}`;
    const text = id => page.locator(`#${id}`).innerText();
    const test = async (name, run) => { await run(); count++; console.log(`PASS browser: ${name}`); };
    const source = async value => {
      await page.locator('#sourceInput').fill(value);
      await page.locator('#visualizeBtn').click();
    };
    const download = async id => {
      const pending = page.waitForEvent('download');
      await page.locator(`#${id}`).click();
      return fs.readFile(await (await pending).path(), 'utf8');
    };
    await page.goto(url);
    await test('startup compiles the initial example', async () => {
      assert.equal(await text('parserStatus'), 'Valid');
      assert.match(await text('compilerSummary'), /Semantic checks passed/);
      assert.match(await text('grammarSummary'), /LL\(1\) table ready/);
      assert.ok(await page.locator('.node-group').count() > 0);
    });
    await test('every built-in source example', async () => {
      const samples = await page.locator('#sampleSelect option').evaluateAll(options => options.map(o => o.value).filter(v => v !== 'custom'));
      for (const sample of samples) {
        await page.locator('#sampleSelect').selectOption(sample);
        assert.equal(await text('parserStatus'), 'Valid', sample);
        assert.match(await text('compilerSummary'), sample === 'errors' ? /4 semantic error/ : sample === 'advanced' ? /outside the scalar TAC subset/ : /Semantic checks passed/, sample);
        if (!['errors', 'advanced'].includes(sample)) assert.match(await text('backendSummary'), /target instructions/);
      }
    });
    await test('token spelling, node click and keyboard selection', async () => {
      await source('print(")");');
      await page.locator('[data-tab="tokens"]').click();
      assert.ok((await text('tokenList')).includes('")"'));
      await page.locator('.node-group').first().click();
      assert.match(await text('nodeDetails'), /Program/);
      await page.locator('.node-group').last().focus();
      await page.keyboard.press('Enter');
      assert.match(await text('nodeDetails'), /Literal/);
    });
    await test('zoom, reset, pan and fit', async () => {
      await page.locator('#resetViewBtn').click();
      assert.equal(await text('zoomLevel'), '100%');
      await page.locator('#zoomInBtn').click();
      assert.equal(await text('zoomLevel'), '120%');
      await page.locator('#zoomOutBtn').click();
      const before = await page.locator('#viewportGroup').getAttribute('transform');
      await page.locator('#treeSvg').scrollIntoViewIfNeeded();
      const box = await page.locator('#treeSvg').boundingBox();
      await page.mouse.move(box.x + box.width - 30, box.y + box.height / 2);
      await page.mouse.down(); await page.mouse.move(box.x + box.width - 80, box.y + box.height / 2 - 30); await page.mouse.up();
      assert.notEqual(await page.locator('#viewportGroup').getAttribute('transform'), before);
      await page.locator('#fitBtn').click();
      assert.ok(Number.parseFloat(await text('zoomLevel')) > 0);
    });
    await test('all traversals, play, step and stop', async () => {
      for (const type of ['preorder', 'postorder', 'levelorder']) {
        await page.locator('#traversalSelect').selectOption(type);
        await page.locator('#stepTraversalBtn').click();
        assert.match(await text('traversalOutput'), type === 'postorder' ? /^Literal/ : /^Program/);
      }
      await page.locator('#speedRange').fill('1400');
      await page.locator('#playTraversalBtn').click();
      await page.waitForFunction(() => document.getElementById('traversalOutput').textContent.includes('→'));
      await page.locator('#stopTraversalBtn').click();
      assert.equal(await page.locator('.traversing').count(), 0);
    });
    await test('AST JSON, full SVG and analysis downloads', async () => {
      await page.locator('[data-tab="ast"]').click();
      const ast = JSON.parse(await download('downloadJsonBtn'));
      assert.equal(ast.body[0].expression.value, ')');
      const svg = await download('downloadSvgBtn');
      assert.match(svg, /viewBox="0 0 1600 1000"/);
      assert.match(svg, /xmlns="http:\/\/www.w3.org\/2000\/svg"/);
      const report = JSON.parse(await download('downloadReportBtn'));
      assert.equal(report.source, 'print(")");');
      assert.ok(report.ir && report.optimized && report.cfg && report.backend);
      assert.equal(Object.hasOwn(report, 'bindings'), false);
    });
    await test('editing clears stale output and keyboard analysis works', async () => {
      await page.locator('#sourceInput').fill('int x=3;');
      assert.equal(await page.locator('#sampleSelect').inputValue(), 'custom');
      assert.equal(await page.locator('.node-group').count(), 0);
      assert.ok(await page.locator('#downloadReportBtn').isDisabled());
      await page.locator('#sourceInput').press('Control+Enter');
      assert.equal(await text('parserStatus'), 'Valid');
      await page.locator('#sourceInput').press('Tab');
      assert.equal(await text('parserStatus'), 'Edited');
      assert.ok(await page.locator('#downloadReportBtn').isDisabled());
    });
    await test('syntax errors clear results; semantic errors preserve AST', async () => {
      await source('int x=1 "+" 2;');
      assert.equal(await text('parserStatus'), 'Error');
      assert.equal(await page.locator('.node-group').count(), 0);
      await page.locator('#sampleSelect').selectOption('errors');
      assert.ok(await page.locator('.node-group').count() > 0);
      await page.locator('#semanticsButton').click();
      await page.locator('#diagnostics button').first().click();
      assert.equal(await page.locator('#sourceInput').evaluate(el => el.selectionEnd - el.selectionStart), 1);
    });
    await test('stage tabs and all backend settings', async () => {
      await page.locator('#sampleSelect').selectOption('registers');
      await page.locator('#semanticsButton').focus(); await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('#irButton').getAttribute('aria-selected'), 'true');
      for (const tab of ['optimization', 'cfg', 'backend']) await page.locator(`#${tab}Button`).click();
      for (const mode of ['ir', 'optimized']) for (const registers of ['3', '4', '6']) {
        await page.locator('#backendSource').selectOption(mode);
        await page.locator('#registerCount').selectOption(registers);
        assert.match(await text('backendSummary'), new RegExp(`^${registers} registers`));
        const report = JSON.parse(await download('downloadReportBtn'));
        assert.equal(report.backend.input, mode); assert.equal(report.backend.registerCount, Number(registers));
      }
    });
    await test('grammar acceptance, rejection, conflicts and reset', async () => {
      await page.locator('#grammarSample').selectOption('expression');
      await page.locator('#grammarStepBtn').click();
      await page.locator('#grammarRunBtn').click();
      assert.equal(await text('traceStatus'), 'Input accepted by this grammar.');
      await page.locator('#grammarResetBtn').click();
      assert.match(await text('traceStatus'), /Showing 1/);
      await page.locator('#grammarTokens').fill('id + * id');
      assert.ok(await page.locator('#grammarRunBtn').isDisabled());
      await page.locator('#analyzeGrammarBtn').click(); await page.locator('#grammarRunBtn').click();
      assert.match(await text('traceStatus'), /rejected/);
      for (const sample of ['conflict', 'recursive']) {
        await page.locator('#grammarSample').selectOption(sample);
        assert.match(await text('grammarSummary'), /needs changes/);
        assert.ok(await page.locator('#grammarStepBtn').isDisabled());
      }
      await page.locator('#grammarSample').selectOption('nullable');
      await page.locator('#grammarTokens').fill(''); await page.locator('#analyzeGrammarBtn').click(); await page.locator('#grammarRunBtn').click();
      assert.match(await text('traceStatus'), /accepted/);
    });
    await test('theme persists and clear resets the source workbench', async () => {
      await page.locator('#themeToggle').click();
      assert.ok(await page.locator('body').evaluate(el => el.classList.contains('dark')));
      await page.reload();
      assert.ok(await page.locator('body').evaluate(el => el.classList.contains('dark')));
      await page.locator('#clearBtn').click();
      assert.equal(await page.locator('#sourceInput').inputValue(), '');
      assert.equal(await text('nodeCount'), '0');
      assert.ok(await page.locator('#downloadReportBtn').isDisabled());
    });
    await test('clipboard success copies the actual AST JSON', async () => {
      await source('print(1);');
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.locator('[data-tab="ast"]').click();
      await page.locator('#copyJsonBtn').click();
      await page.waitForFunction(() => /copied|Clipboard access is unavailable/.test(document.getElementById('messageBox').textContent));
      assert.match(await text('messageBox'), /copied/);
      const copied = JSON.parse(await page.evaluate(() => navigator.clipboard.readText()));
      assert.equal(copied.body[0].expression.value, 1);
    });
    await test('blocked clipboard reports failure honestly', async () => {
      await source('print(1);'); await page.locator('[data-tab="ast"]').click();
      await page.evaluate(() => {
        Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('denied')) }, configurable: true });
        document.execCommand = () => false;
      });
      await page.locator('#copyJsonBtn').click();
      await page.waitForFunction(() => /copied|Clipboard access is unavailable/.test(document.getElementById('messageBox').textContent));
      assert.match(await text('messageBox'), /Clipboard access is unavailable/);
    });
    await test('mobile layout fits and all scripts run', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      assert.equal(await text('parserStatus'), 'Valid');
      await fs.mkdir(path.join(root, 'test-results'), { recursive: true });
      await page.screenshot({ path: path.join(root, 'test-results/mobile.png'), fullPage: true });
      await page.screenshot({ path: path.join(root, 'test-results/mobile-viewport.png') });
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.locator('#themeToggle').click();
      await page.waitForFunction(() => getComputedStyle(document.body).color === 'rgb(23, 32, 51)');
      await page.screenshot({ path: path.join(root, 'test-results/desktop.png'), fullPage: true });
      await page.screenshot({ path: path.join(root, 'test-results/desktop-viewport.png') });
    });
    await test('unavailable local storage does not prevent startup', async () => {
      const blocked = await context.newPage();
      blocked.on('pageerror', error => errors.push(error.message));
      await blocked.addInitScript(() => {
        Storage.prototype.getItem = () => { throw new Error('Storage denied'); };
        Storage.prototype.setItem = () => { throw new Error('Storage denied'); };
      });
      await blocked.goto(url);
      assert.equal(await blocked.locator('#parserStatus').innerText(), 'Valid');
      await blocked.locator('#themeToggle').click();
      assert.ok(await blocked.locator('body').evaluate(el => el.classList.contains('dark')));
      await blocked.close();
    });
    await test('no uncaught browser errors', async () => assert.deepEqual(errors, []));
    console.log(`ALL ${count} BROWSER TESTS PASSED`);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
