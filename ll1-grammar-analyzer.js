(function (global) {
  'use strict';
  const EPS = 'ε', END = '$';
  function parseGrammar(source) {
    if (source.length > 20000) throw new Error('Keep the grammar below 20,000 characters.');
    const productions = [], nonterminals = [];
    source.split(/\r?\n/).forEach((line, index) => {
      line = line.trim(); if (!line) return;
      const match = line.match(/^([^\s|]+)\s*(?:->|→)\s*(.*)$/);
      if (!match || /(?:->|→)/.test(match[1])) throw new Error(`Line ${index + 1}: use A -> symbols separated by spaces.`);
      const lhs = match[1];
      if ([EPS, 'epsilon', END].includes(lhs)) throw new Error(`Line ${index + 1}: ${lhs} is reserved.`);
      if (!nonterminals.includes(lhs)) nonterminals.push(lhs);
      match[2].split('|').forEach(part => {
        const rhs = part.trim().split(/\s+/).filter(Boolean);
        if (!rhs.length) throw new Error(`Line ${index + 1}: write ε for an empty alternative.`);
        if (rhs.some(x => [EPS, 'epsilon'].includes(x)) && rhs.length !== 1) throw new Error(`Line ${index + 1}: ε must appear alone.`);
        if (rhs.includes(END) || rhs.some(x => /(?:->|→)/.test(x))) throw new Error(`Line ${index + 1}: reserved symbol in right-hand side.`);
        const symbols = [EPS, 'epsilon'].includes(rhs[0]) ? [] : rhs;
        if (!productions.some(p => p.lhs === lhs && p.rhs.join(' ') === symbols.join(' ')))
          productions.push({ id: productions.length + 1, lhs, rhs: symbols, line: index + 1 });
      });
    });
    if (!productions.length) throw new Error('Enter at least one production.');
    if (productions.length > 160 || nonterminals.length > 50 || productions.some(p => p.rhs.length > 50))
      throw new Error('Use at most 160 alternatives, 50 nonterminals and 50 symbols per alternative.');
    const terminals = [...new Set(productions.flatMap(p => p.rhs).filter(x => !nonterminals.includes(x)))];
    if (terminals.length > 100) throw new Error('Use at most 100 distinct terminals.');
    return { productions, nonterminals, terminals, start: nonterminals[0] };
  }
  function analyze(source) {
    const grammar = parseGrammar(source), { productions, nonterminals, terminals, start } = grammar;
    const first = new Map(nonterminals.map(n => [n, new Set()]));
    const follow = new Map(nonterminals.map(n => [n, new Set()])); follow.get(start).add(END);
    const add = (set, values) => { let changed = false; for (const value of values) if (!set.has(value)) { set.add(value); changed = true; } return changed; };
    function firstOf(symbols) {
      const result = new Set();
      for (const symbol of symbols) {
        const values = first.get(symbol) || new Set([symbol]);
        add(result, [...values].filter(x => x !== EPS));
        if (!values.has(EPS)) return result;
      }
      result.add(EPS); return result;
    }
    let changed = true, firstPasses = 0, followPasses = 0;
    while (changed) { changed = false; firstPasses++; productions.forEach(p => { if (add(first.get(p.lhs), firstOf(p.rhs))) changed = true; }); }
    changed = true;
    while (changed) {
      changed = false; followPasses++;
      productions.forEach(p => p.rhs.forEach((symbol, index) => {
        if (!follow.has(symbol)) return;
        const rest = firstOf(p.rhs.slice(index + 1));
        if (add(follow.get(symbol), [...rest].filter(x => x !== EPS))) changed = true;
        if (rest.has(EPS) && add(follow.get(symbol), follow.get(p.lhs))) changed = true;
      }));
    }
    const table = new Map(nonterminals.map(n => [n, new Map()]));
    productions.forEach(p => {
      const lookahead = firstOf(p.rhs), selection = new Set([...lookahead].filter(x => x !== EPS));
      if (lookahead.has(EPS)) add(selection, follow.get(p.lhs));
      selection.forEach(t => { const row = table.get(p.lhs); if (!row.has(t)) row.set(t, []); row.get(t).push(p.id); });
    });
    const conflicts = [];
    table.forEach((row, n) => row.forEach((ids, t) => { if (ids.length > 1) conflicts.push({ nonterminal: n, terminal: t, productions: ids }); }));
    // Nullable-prefix dependency edges expose direct and indirect left recursion.
    const leftEdges = new Map(nonterminals.map(n => [n, new Set()]));
    productions.forEach(p => {
      for (const symbol of p.rhs) {
        if (!first.has(symbol)) break;
        leftEdges.get(p.lhs).add(symbol);
        if (!first.get(symbol).has(EPS)) break;
      }
    });
    const leftRecursive = nonterminals.filter(n => {
      const pending = [...leftEdges.get(n)], seen = new Set();
      while (pending.length) { const x = pending.pop(); if (x === n) return true; if (seen.has(x)) continue; seen.add(x); pending.push(...leftEdges.get(x)); }
      return false;
    });
    const productive = new Set(); changed = true;
    while (changed) { changed = false; productions.forEach(p => { if (p.rhs.every(x => !first.has(x) || productive.has(x)) && !productive.has(p.lhs)) { productive.add(p.lhs); changed = true; } }); }
    const reachable = new Set([start]), pending = [start];
    while (pending.length) { const n = pending.pop(); productions.filter(p => p.lhs === n).flatMap(p => p.rhs).forEach(x => { if (first.has(x) && !reachable.has(x)) { reachable.add(x); pending.push(x); } }); }
    const sets = map => Object.fromEntries([...map].map(([k,v]) => [k,[...v].sort()]));
    return { ...grammar, first: sets(first), follow: sets(follow),
      table: Object.fromEntries([...table].map(([n,row]) => [n,Object.fromEntries(row)])), conflicts, leftRecursive,
      unproductive: nonterminals.filter(n => !productive.has(n)), unreachable: nonterminals.filter(n => !reachable.has(n)),
      firstPasses, followPasses, ll1: !conflicts.length && !leftRecursive.length && nonterminals.every(n => productive.has(n)) };
  }
  function trace(grammar, input, limit = 1000) {
    if (!grammar.ll1) throw new Error('Resolve table conflicts, left recursion and nonproductive rules before predictive parsing.');
    const tokens = input.trim() ? input.trim().split(/\s+/) : [];
    if (tokens.length > 250) throw new Error('Use at most 250 input tokens.');
    if (tokens.includes(END)) throw new Error('Do not enter $; the end marker is added automatically.');
    const unknown = tokens.find(t => !grammar.terminals.includes(t));
    if (unknown) throw new Error(`Unknown terminal '${unknown}'. Separate input tokens with spaces.`);
    tokens.push(END);
    const stack = [END, grammar.start], steps = []; let position = 0;
    function record(action) { steps.push({ step: steps.length + 1, stack: [...stack].reverse().join(' '), input: tokens.slice(position).join(' '), action }); }
    while (steps.length < limit) {
      const top = stack[stack.length - 1], lookahead = tokens[position];
      if (top === END && lookahead === END) { record('Accept'); return { accepted: true, steps }; }
      if (!grammar.nonterminals.includes(top)) {
        if (top !== lookahead) { record(`Error: expected ${top}, found ${lookahead}`); return { accepted: false, steps }; }
        record(`Match ${top}`); stack.pop(); position++; continue;
      }
      const cell = Object.hasOwn(grammar.table[top], lookahead) ? grammar.table[top][lookahead] : null;
      if (!cell) { record(`Error: no rule for M[${top}, ${lookahead}]`); return { accepted: false, steps }; }
      const production = grammar.productions.find(p => p.id === cell[0]);
      record(`P${production.id}: ${production.lhs} → ${production.rhs.join(' ') || EPS}`);
      stack.pop(); stack.push(...[...production.rhs].reverse());
    }
    record('Stopped: parsing step limit reached.'); return { accepted: false, truncated: true, steps };
  }
  global.SyntaxGrammar = { analyze, trace, parseGrammar };
})(window);
