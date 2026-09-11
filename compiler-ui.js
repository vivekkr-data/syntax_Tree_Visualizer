(function () {
  'use strict';
  const byId = id => document.getElementById(id);
  let result = null, source = '';
  const backendFields = ['backendSummary', 'targetCode', 'allocationTrace', 'livenessTable', 'nextUseTable'];
  const fields = [...backendFields, 'diagnostics', 'scopedSymbols', 'tacOutput', 'quadruples', 'beforeCode', 'afterCode', 'optimizationSummary', 'optimizationRules', 'cfgGraph', 'cfgEdges'];
  function table(id, headers, rows) {
    const target = byId(id); target.replaceChildren();
    if (!rows.length) { target.textContent = 'No entries for this program.'; return; }
    const table = document.createElement('table'); table.className = 'compiler-table';
    const head = document.createElement('thead'), tr = document.createElement('tr');
    headers.forEach(label => { const th = document.createElement('th'); th.scope = 'col'; th.textContent = label; tr.append(th); });
    head.append(tr); table.append(head);
    const body = document.createElement('tbody');
    rows.forEach(row => { const tr = document.createElement('tr'); row.forEach(value => { const td = document.createElement('td'); td.textContent = String(value ?? '—'); tr.append(td); }); body.append(tr); });
    table.append(body); target.append(table);
  }
  function svgElement(tag, attrs = {}, text) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function graph(cfg) {
    const host = byId('cfgGraph'); host.replaceChildren();
    let y = 35;
    const positions = new Map();
    cfg.blocks.forEach(b => { const height = 60 + Math.min(5, b.instructions.length) * 21; positions.set(b.id, { y, height }); y += height + 54; });
    const width = 720;
    const svg = svgElement('svg', { viewBox: `0 0 ${width} ${y}`, width, height: y, role: 'img', 'aria-label': 'Control-flow graph. Complete instructions and connections are provided below.' });
    const title = svgElement('title', {}, 'Basic blocks and control flow'); svg.append(title);
    const defs = svgElement('defs'), marker = svgElement('marker', { id: 'cfg-arrow', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' });
    marker.append(svgElement('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: 'currentColor' })); defs.append(marker); svg.append(defs);
    cfg.edges.forEach((edge, i) => {
      const a = positions.get(edge.from), b = positions.get(edge.to); if (!a || !b) return;
      const adjacent = b.y === a.y + a.height + 54;
      const startY = a.y + a.height / 2, endY = b.y + b.height / 2, lane = 595 + (i % 5) * 21;
      const d = adjacent ? `M 320 ${a.y + a.height} L 320 ${b.y}` : `M 550 ${startY} H ${lane} V ${endY} H 550`;
      svg.append(svgElement('path', { d, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.5, 'marker-end': 'url(#cfg-arrow)', class: 'cfg-edge' }));
      svg.append(svgElement('text', { x: adjacent ? 330 : lane + 4, y: adjacent ? a.y + a.height + 31 : (startY + endY) / 2, class: 'cfg-edge-label' }, edge.label));
    });
    cfg.blocks.forEach(block => {
      const pos = positions.get(block.id);
      const group = svgElement('g', { class: `cfg-block${block.reachable ? '' : ' unreachable'}` });
      group.append(svgElement('rect', { x: 55, y: pos.y, width: 495, height: pos.height, rx: 9 }));
      group.append(svgElement('text', { x: 72, y: pos.y + 27, class: 'cfg-block-title' }, `${block.id} · ${block.section}${block.reachable ? '' : ' · unreachable'}`));
      block.instructions.slice(0, 5).forEach((q, i) => {
        const full = SyntaxCompiler.format(q); const text = full.length > 52 ? full.slice(0, 49) + '…' : full;
        group.append(svgElement('text', { x: 72, y: pos.y + 51 + i * 21, class: 'cfg-instruction' }, text));
      });
      if (block.instructions.length > 5) group.append(svgElement('text', { x: 72, y: pos.y + pos.height - 9, class: 'cfg-edge-label' }, `+ ${block.instructions.length - 5} more instructions in block listing`));
      group.append(svgElement('title', {}, block.instructions.map(SyntaxCompiler.format).join('\n'))); svg.append(group);
    });
    host.append(svg);
    const details = document.createElement('details'), summary = document.createElement('summary');
    summary.textContent = 'Complete block instructions'; details.append(summary);
    const pre = document.createElement('pre'); pre.className = 'code-output';
    pre.textContent = cfg.blocks.map(b => `${b.id} (${b.section})${b.reachable ? '' : ' — unreachable'}\n${b.instructions.map(SyntaxCompiler.format).join('\n')}`).join('\n\n');
    details.append(pre); host.append(details);
    table('cfgEdges', ['From', 'To', 'Condition'], cfg.edges.map(e => [e.from, e.to, e.label]));
  }
  const listing = code => code.map((q, i) => `${String(i + 1).padStart(3)}  ${SyntaxCompiler.format(q)}`).join('\n');
  function render(ast) {
    result = SyntaxCompiler.compile(ast);
    const errors = result.diagnostics.filter(d => d.severity === 'error');
    const diagnostics = byId('diagnostics'); diagnostics.replaceChildren();
    const messages = [...result.diagnostics, ...result.limitations];
    if (!messages.length) diagnostics.textContent = 'No issues found by the implemented checks.';
    messages.forEach(d => {
      const item = document.createElement('div'); item.className = `diagnostic diagnostic-${d.severity}`;
      const title = document.createElement('strong'); title.textContent = `${d.severity.toUpperCase()} · ${d.code}`;
      const text = document.createElement('p'); text.textContent = d.message;
      item.append(title, text);
      if (d.loc) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'link-button';
        button.textContent = `Line ${d.loc.line}, column ${d.loc.column}`;
        button.addEventListener('click', () => {
          const editor = byId('sourceInput');
          if (editor.value !== source) { byId('compilerSummary').textContent = 'Source changed. Analyze again for current locations.'; return; }
          const offset = source.split('\n').slice(0, d.loc.line - 1).reduce((n, line) => n + line.length + 1, 0) + d.loc.column - 1;
          editor.focus(); editor.setSelectionRange(offset, offset + 1); editor.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }); item.append(button);
      }
      diagnostics.append(item);
    });
    table('scopedSymbols', ['Name', 'Kind / Type', 'Scope', 'IR Name'], result.symbols.map(s => [s.name, `${s.kind} / ${s.dataType}${'*'.repeat(s.pointerDepth)}${'[]'.repeat(s.dimensions)}`, s.scope, s.irName]));
    byId('compilerSummary').textContent = errors.length ? `${errors.length} semantic error(s). AST inspection is available; intermediate code is blocked.` : result.ir ? `Semantic checks passed · ${result.symbols.length} symbols · ${result.ir.code.length} TAC instructions · ${result.cfg.blocks.length} basic blocks` : 'AST and semantic checks complete. This program uses features outside the scalar TAC subset.';
    byId('downloadReportBtn').disabled = false;
    if (!result.ir) {
      [...backendFields, 'tacOutput', 'quadruples', 'beforeCode', 'afterCode', 'optimizationSummary', 'optimizationRules', 'cfgGraph', 'cfgEdges'].forEach(id => { byId(id).textContent = errors.length ? 'Resolve semantic errors to generate intermediate code.' : 'Unavailable for this input. See Semantic Checks for the supported subset.'; });
      return;
    }
    byId('tacOutput').textContent = listing(result.ir.code);
    table('quadruples', ['#', 'Op', 'Arg 1', 'Arg 2', 'Result'], result.ir.code.map((q, i) => [i + 1, q.op, q.arg1 || '—', q.arg2 || '—', q.result || '—']));
    byId('beforeCode').textContent = listing(result.ir.code); byId('afterCode').textContent = listing(result.optimized.code);
    byId('optimizationSummary').textContent = `${result.optimized.changes.length} expression(s) folded · ${result.ir.code.length} → ${result.optimized.code.length} instructions`;
    table('optimizationRules', ['Rule', 'Before', 'After'], result.optimized.changes.map(c => [c.rule, c.before, c.after]));
    graph(result.cfg);
    renderBackend();
  }
  function renderBackend() {
    if (!result || !result.ir) return;
    try {
      const mode = byId('backendSource').value;
      const backend = SyntaxBackend.generate(result[mode].code, Number(byId('registerCount').value));
      result.backend = { input: mode, ...backend };
      byId('backendSummary').textContent = `${backend.registerCount} registers · ${backend.stats.instructions} target instructions · ${backend.stats.loads} loads · ${backend.stats.stores} stores · ${backend.stats.evictions} register evictions · liveness converged in ${backend.flow.iterations} passes`;
      byId('targetCode').textContent = backend.instructions.map((q,i) => `${String(i+1).padStart(3)}  ${SyntaxBackend.format(q)}`).join('\n');
      table('allocationTrace', ['TAC #', 'Allocation / Event'], backend.allocation.map(row => [row.tac, row.event]));
      const set = values => `{ ${values.join(', ')} }`;
      table('livenessTable', ['Block', 'USE', 'DEF', 'IN', 'OUT'], backend.flow.blocks.map(b => [b.id, set(b.use), set(b.def), set(b.liveIn), set(b.liveOut)]));
      table('nextUseTable', ['TAC #', 'Block', 'Live names → next use'], backend.flow.nextUse.map(row => [row.index + 1, row.block, Object.entries(row.after).map(([name, next]) => `${name} → ${next}`).join(', ') || '∅']));
    } catch (error) {
      result.backend = null;
      backendFields.forEach(id => { byId(id).textContent = error.message; });
    }
  }
  byId('backendSource').addEventListener('change', renderBackend);
  byId('registerCount').addEventListener('change', renderBackend);
  function reset(message) {
    result = null; byId('downloadReportBtn').disabled = true;
    fields.forEach(id => { byId(id).textContent = 'Analyze a program to view this stage.'; });
    byId('compilerSummary').textContent = message;
  }
  document.addEventListener('compiler:parsed', event => {
    source = event.detail.source;
    try { render(event.detail.ast); }
    catch (error) { reset(`Compiler analysis could not finish: ${error.message}. AST inspection remains available.`); }
  });
  document.addEventListener('compiler:reset', () => reset('Analyze a program to inspect compiler stages.'));
  document.addEventListener('compiler:stale', () => reset('Source changed. Select Analyze Program to refresh all compiler stages.'));
  const tabs = [...document.querySelectorAll('.lab-tab')];
  function activate(tab) {
    tabs.forEach(t => { const selected = t === tab; t.classList.toggle('active', selected); t.setAttribute('aria-selected', selected); t.tabIndex = selected ? 0 : -1; byId(`${t.dataset.stage}Panel`).hidden = !selected; });
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => activate(tab));
    tab.addEventListener('keydown', event => {
      let index;
      if (event.key === 'ArrowRight') index = (i + 1) % tabs.length;
      if (event.key === 'ArrowLeft') index = (i + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') index = 0;
      if (event.key === 'End') index = tabs.length - 1;
      if (index !== undefined) { event.preventDefault(); activate(tabs[index]); tabs[index].focus(); }
    });
  });
  byId('downloadReportBtn').addEventListener('click', () => {
    if (!result) return;
    const { bindings, ...report } = result;
    const blob = new Blob([JSON.stringify({ source, ...report }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), anchor = document.createElement('a');
    anchor.href = url; anchor.download = 'compiler-analysis.json'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
})();
