(function (global) {
  'use strict';
  const variable = value => /^(?:%t\d+|[A-Za-z_][A-Za-z_0-9]*@\d+)$/.test(value);
  const binaryOps = new Set(['+', '-', '*', '/', '%', '<', '<=', '>', '>=', '==', '!=', '&', '|', '^', '<<', '>>']);
  function operands(q, globals = []) {
    let use = [], def = [];
    if (binaryOps.has(q.op)) { use = [q.arg1, q.arg2]; def = [q.result]; }
    else if (q.op.startsWith('unary') || ['copy', 'bool'].includes(q.op)) { use = [q.arg1]; def = [q.result]; }
    else if (['ifFalse', 'ifTrue', 'print', 'param'].includes(q.op)) use = [q.arg1];
    else if (q.op === 'return') use = [q.arg1, ...globals];
    else if (q.op === 'call') { use = globals; def = [q.result]; }
    else if (['declare', 'receive'].includes(q.op)) def = [q.result];
    else if (['end', 'halt'].includes(q.op)) use = globals;
    return { use: [...new Set(use.filter(variable))], def: def.filter(variable) };
  }
  function dataFlow(code) {
    if (code.length > 2000) throw new Error('Data-flow and target-code view supports up to 2,000 TAC instructions.');
    const globals = code.filter(q => q.op === 'declare' && /@0$/.test(q.result)).map(q => q.result);
    const cfg = SyntaxCompiler.buildCFG(code);
    const rows = cfg.blocks.map(block => {
      const use = new Set(), def = new Set();
      block.instructions.forEach(q => {
        const sets = operands(q, globals); sets.use.forEach(x => { if (!def.has(x)) use.add(x); }); sets.def.forEach(x => def.add(x));
      });
      return { ...block, use, def, liveIn: new Set(), liveOut: new Set() };
    });
    const byId = new Map(rows.map(b => [b.id, b]));
    const successors = new Map(rows.map(b => [b.id, cfg.edges.filter(e => e.from === b.id).map(e => e.to)]));
    let changed = true, iterations = 0;
    const equal = (a, b) => a.size === b.size && [...a].every(x => b.has(x));
    while (changed) {
      iterations++; changed = false;
      for (let i = rows.length - 1; i >= 0; i--) {
        const row = rows[i], out = new Set();
        successors.get(row.id).forEach(id => byId.get(id).liveIn.forEach(x => out.add(x)));
        const input = new Set([...row.use, ...[...out].filter(x => !row.def.has(x))]);
        if (!equal(row.liveIn, input) || !equal(row.liveOut, out)) changed = true;
        row.liveIn = input; row.liveOut = out;
      }
    }
    const nextUse = [];
    rows.forEach(block => {
      const next = new Map([...block.liveOut].map(x => [x, 'exit']));
      for (let i = block.instructions.length - 1; i >= 0; i--) {
        const index = block.start + i, q = block.instructions[i], sets = operands(q, globals);
        nextUse[index] = { index, block: block.id, after: Object.fromEntries(next) };
        sets.def.forEach(x => next.delete(x)); sets.use.forEach(x => next.set(x, index + 1));
      }
    });
    return { iterations, globals, edges: cfg.edges, blocks: rows.map(b => ({ ...b, use: [...b.use].sort(), def: [...b.def].sort(), liveIn: [...b.liveIn].sort(), liveOut: [...b.liveOut].sort() })), nextUse };
  }
  function generate(code, registerCount = 3) {
    if (![3, 4, 6].includes(registerCount)) throw new Error('Choose 3, 4 or 6 registers.');
    const flow = dataFlow(code), instructions = [], allocation = [];
    let loads = 0, stores = 0, evictions = 0;
    const names = Array.from({ length: registerCount }, (_, i) => `R${i}`);
    flow.blocks.forEach(block => {
      let regs = names.map(() => null), index = block.start;
      const emit = (op, ...args) => instructions.push({ op, args, tac: index + 1, block: block.id });
      const flush = () => regs.forEach((entry, r) => {
        if (entry && entry.dirty) { emit('STORE', entry.name, names[r]); stores++; entry.dirty = false; }
      });
      function release(r, reason) {
        const entry = regs[r];
        if (entry && entry.dirty) { emit('STORE', entry.name, names[r]); stores++; }
        if (entry) { evictions++; allocation.push({ tac: index + 1, event: `${names[r]} evicts ${entry.name}: ${reason}` }); }
        regs[r] = null;
      }
      function slot(protectedRegs = []) {
        const empty = regs.findIndex((entry, r) => !entry && !protectedRegs.includes(r));
        if (empty >= 0) return empty;
        const after = flow.nextUse[index].after;
        const candidates = names.map((_, r) => r).filter(r => !protectedRegs.includes(r));
        const distance = r => {
          const value = after[regs[r].name];
          return value === undefined ? Infinity : value === 'exit' ? Number.MAX_SAFE_INTEGER : value;
        };
        candidates.sort((a, b) => distance(b) - distance(a));
        const r = candidates[0];
        if (r === undefined) throw new Error('No register available for this instruction.');
        release(r, 'farthest next use (or no further local use)'); return r;
      }
      function read(value, protect = []) {
        const existing = regs.findIndex(entry => entry && entry.name === value);
        if (existing >= 0) return existing;
        const r = slot(protect);
        emit(variable(value) ? 'LOAD' : 'CONST', names[r], value); loads += variable(value) ? 1 : 0;
        regs[r] = { name: value, dirty: false }; return r;
      }
      function write(value, protect = []) {
        const existing = regs.findIndex(entry => entry && entry.name === value);
        if (existing >= 0 && !protect.includes(existing)) { regs[existing] = null; return existing; }
        return slot(protect);
      }
      function bind(r, value) {
        // Any old register for the overwritten variable is no longer a valid cache entry.
        regs.forEach((entry, i) => { if (i !== r && entry && entry.name === value) regs[i] = null; });
        regs[r] = { name: value, dirty: true };
      }
      block.instructions.forEach((q, offset) => {
        index = block.start + offset;
        if (binaryOps.has(q.op)) {
          const a = read(q.arg1), b = read(q.arg2, [a]), r = write(q.result, [a,b]);
          emit('BINARY', names[r], q.op, names[a], names[b]); bind(r, q.result);
        } else if (q.op.startsWith('unary') || ['copy','bool'].includes(q.op)) {
          const a = read(q.arg1), r = write(q.result, [a]);
          emit(q.op === 'copy' ? 'MOVE' : 'UNARY', names[r], ...(q.op === 'copy' ? [names[a]] : [q.op === 'bool' ? 'bool' : q.op.slice(5), names[a]])); bind(r, q.result);
        } else if (q.op === 'declare') {
          regs.forEach((entry, i) => { if (entry && entry.name === q.result) regs[i] = null; }); emit('DECLARE', q.result, q.arg1);
        } else if (q.op === 'receive') {
          const r = write(q.result); emit('ARG', names[r], q.arg1); bind(r, q.result);
        } else if (q.op === 'label' || q.op === 'function') emit(q.op === 'label' ? 'LABEL' : 'FUNCTION', q.result);
        else if (q.op === 'call') {
          flush(); regs = names.map(() => null);
          // Calls may change global memory and clobber registers, so the cache is invalidated.
          emit('CALL', 'R0', q.arg1, q.arg2); bind(0, q.result);
        } else if (['print','param'].includes(q.op)) {
          const r = read(q.arg1); emit(q.op.toUpperCase(), names[r]);
        } else if (q.op === 'ifFalse' || q.op === 'ifTrue') {
          const r = read(q.arg1); flush(); emit(q.op === 'ifFalse' ? 'JZ' : 'JNZ', names[r], q.result);
        } else if (q.op === 'return') {
          const r = q.arg1 ? read(q.arg1) : null; flush(); emit('RET', ...(r === null ? [] : [names[r]]));
        } else if (q.op === 'goto') { flush(); emit('JMP', q.result); }
        else if (q.op === 'halt' || q.op === 'end') { flush(); emit(q.op === 'halt' ? 'HALT' : 'END', ...(q.op === 'end' ? [q.result] : [])); }
        else throw new Error(`Target lowering does not support ${q.op}.`);
        allocation.push({ tac: index + 1, event: names.map((name,i) => `${name}: ${regs[i] ? regs[i].name + (regs[i].dirty ? ' *' : '') : '—'}`).join(' | ') });
      });
      flush();
    });
    return { registerCount, instructions, allocation, flow, stats: { loads, stores, evictions, instructions: instructions.length } };
  }
  const format = instruction => `${instruction.op.padEnd(9)} ${instruction.args.join(', ')}`.trimEnd();
  global.SyntaxBackend = { dataFlow, generate, format, operands };
})(window);
