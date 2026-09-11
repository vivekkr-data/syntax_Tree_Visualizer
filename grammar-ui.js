(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const examples = {
    expression: { grammar: 'E -> T E_tail\nE_tail -> + T E_tail | ε\nT -> F T_tail\nT_tail -> * F T_tail | ε\nF -> ( E ) | id', input: 'id + id * id' },
    nullable: { grammar: 'S -> A B\nA -> a A | ε\nB -> b B | ε', input: 'a a b b' },
    conflict: { grammar: 'S -> a A | a B\nA -> c\nB -> d', input: 'a c' },
    recursive: { grammar: 'E -> E + T | T\nT -> id', input: 'id + id' }
  };
  let trace = null, shown = 0;
  function table(id, headers, rows) {
    const target = $(id); target.replaceChildren();
    const table = document.createElement('table'); table.className = 'compiler-table';
    const head = document.createElement('thead'), row = document.createElement('tr');
    headers.forEach(value => { const th = document.createElement('th'); th.scope = 'col'; th.textContent = value; row.append(th); }); head.append(row); table.append(head);
    const body = document.createElement('tbody');
    rows.forEach(values => { const row = document.createElement('tr'); values.forEach(value => { const td = document.createElement('td'); td.textContent = value; row.append(td); }); body.append(row); });
    table.append(body); target.append(table);
  }
  function renderTrace() {
    const rows = trace ? trace.steps.slice(0, shown) : [];
    table('grammarTrace', ['Step', 'Stack (top first)', 'Remaining input', 'Action'], rows.map(s => [s.step, s.stack, s.input, s.action]));
    $('grammarStepBtn').disabled = !trace || shown >= trace.steps.length;
    $('grammarRunBtn').disabled = !trace || shown >= trace.steps.length;
    $('grammarResetBtn').disabled = !trace || shown <= 1;
    $('traceStatus').textContent = !trace ? 'Analyze a conflict-free, productive grammar to start predictive parsing.' : shown < trace.steps.length ? `Showing ${shown} of ${trace.steps.length} steps.` : trace.accepted ? 'Input accepted by this grammar.' : 'Input rejected or stopped. Read the final trace action.';
  }
  function clear() {
    trace = null; shown = 0;
    ['firstFollowTable', 'productionTable', 'll1Table', 'grammarWarnings'].forEach(id => $(id).replaceChildren());
    $('grammarSummary').textContent = 'Grammar or input changed. Analyze again for current results.'; renderTrace();
  }
  function analyze() {
    clear();
    try {
      const grammar = SyntaxGrammar.analyze($('grammarInput').value);
      table('firstFollowTable', ['Nonterminal', 'FIRST', 'FOLLOW'], grammar.nonterminals.map(n => [n, `{ ${grammar.first[n].join(', ')} }`, `{ ${grammar.follow[n].join(', ')} }`]));
      table('productionTable', ['ID', 'Production'], grammar.productions.map(p => [`P${p.id}`, `${p.lhs} → ${p.rhs.join(' ') || 'ε'}`]));
      const terminals = [...grammar.terminals, '$'];
      table('ll1Table', ['Nonterminal', ...terminals], grammar.nonterminals.map(n => [n, ...terminals.map(t => Object.hasOwn(grammar.table[n],t) ? grammar.table[n][t].map(id => `P${id}`).join(' / ') : '—')]));
      const warnings = [
        ...grammar.conflicts.map(c => `Conflict M[${c.nonterminal}, ${c.terminal}]: ${c.productions.map(id => `P${id}`).join(', ')}. A conflict alone does not prove ambiguity.`),
        ...(grammar.leftRecursive.length ? [`Left recursion: ${grammar.leftRecursive.join(', ')}. Rewrite these rules before LL(1) parsing.`] : []),
        ...(grammar.unproductive.length ? [`Nonproductive nonterminals: ${grammar.unproductive.join(', ')}.`] : []),
        ...(grammar.unreachable.length ? [`Unreachable from ${grammar.start}: ${grammar.unreachable.join(', ')}.`] : [])
      ];
      warnings.forEach(message => { const p = document.createElement('p'); p.className = 'diagnostic diagnostic-info'; p.textContent = message; $('grammarWarnings').append(p); });
      $('grammarSummary').textContent = `${grammar.ll1 ? 'LL(1) table ready' : 'Grammar needs changes'} · start: ${grammar.start} · ${grammar.productions.length} productions · FIRST: ${grammar.firstPasses} passes · FOLLOW: ${grammar.followPasses} passes`;
      if (grammar.ll1) {
        try { trace = SyntaxGrammar.trace(grammar, $('grammarTokens').value); shown = 1; }
        catch (error) { $('traceStatus').textContent = error.message; return; }
      }
      renderTrace();
    } catch (error) { $('grammarSummary').textContent = error.message; }
  }
  function loadExample() { const sample = examples[$('grammarSample').value]; $('grammarInput').value = sample.grammar; $('grammarTokens').value = sample.input; analyze(); }
  $('grammarInput').addEventListener('input', clear); $('grammarTokens').addEventListener('input', clear);
  $('grammarSample').addEventListener('change', loadExample); $('analyzeGrammarBtn').addEventListener('click', analyze);
  $('grammarStepBtn').addEventListener('click', () => { if (trace) { shown = Math.min(shown + 1, trace.steps.length); renderTrace(); } });
  $('grammarRunBtn').addEventListener('click', () => { if (trace) { shown = trace.steps.length; renderTrace(); } });
  $('grammarResetBtn').addEventListener('click', () => { if (trace) { shown = 1; renderTrace(); } });
  loadExample();
})();
