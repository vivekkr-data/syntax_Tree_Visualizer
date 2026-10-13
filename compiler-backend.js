(function (global) {
  'use strict';
  const variable = (value) => /^(?:%t\d+|[A-Za-z_][A-Za-z_0-9]*@\d+)$/.test(value);
  const binaryOps = new Set([
    '+',
    '-',
    '*',
    '/',
    '%',
    '<',
    '<=',
    '>',
    '>=',
    '==',
    '!=',
    '&',
    '|',
    '^',
    '<<',
    '>>',
  ]);
  function operands(instruction, globals = []) {
    let use = [],
      def = [];
    if (binaryOps.has(instruction.op)) {
      use = [instruction.arg1, instruction.arg2];
      def = [instruction.result];
    } else if (instruction.op.startsWith('unary') || ['copy', 'bool'].includes(instruction.op)) {
      use = [instruction.arg1];
      def = [instruction.result];
    } else if (['ifFalse', 'ifTrue', 'print', 'param'].includes(instruction.op))
      use = [instruction.arg1];
    else if (instruction.op === 'return') use = [instruction.arg1, ...globals];
    else if (instruction.op === 'call') {
      use = globals;
      def = [instruction.result];
    } else if (['declare', 'receive'].includes(instruction.op)) def = [instruction.result];
    else if (['end', 'halt'].includes(instruction.op)) use = globals;
    return { use: [...new Set(use.filter(variable))], def: def.filter(variable) };
  }
  function dataFlow(code) {
    if (code.length > 2000)
      throw new Error('Data-flow and target-code view supports up to 2,000 TAC instructions.');
    const globals = code
      .filter((instruction) => instruction.op === 'declare' && /@0$/.test(instruction.result))
      .map((instruction) => instruction.result);
    const cfg = SyntaxCompiler.buildCFG(code);

    // USE records reads before a local definition; DEF records all definitions.
    const blocks = cfg.blocks.map((block) => {
      const use = new Set();
      const def = new Set();
      for (const instruction of block.instructions) {
        const operandsUsed = operands(instruction, globals);
        for (const name of operandsUsed.use) {
          if (!def.has(name)) use.add(name);
        }
        for (const name of operandsUsed.def) def.add(name);
      }
      return { ...block, use, def, liveIn: new Set(), liveOut: new Set() };
    });
    const byId = new Map(blocks.map((block) => [block.id, block]));
    const successors = new Map(blocks.map((block) => [block.id, []]));
    for (const edge of cfg.edges) successors.get(edge.from).push(edge.to);
    const equalSets = (a, b) => a.size === b.size && [...a].every((name) => b.has(name));

    // Repeat backwards until IN and OUT stop changing, including around loops.
    let changed = true;
    let iterations = 0;
    while (changed) {
      iterations++;
      changed = false;
      for (let index = blocks.length - 1; index >= 0; index--) {
        const block = blocks[index];
        const liveOut = new Set();
        for (const successorId of successors.get(block.id)) {
          for (const name of byId.get(successorId).liveIn) liveOut.add(name);
        }
        const liveIn = new Set(block.use);
        for (const name of liveOut) {
          if (!block.def.has(name)) liveIn.add(name);
        }
        if (!equalSets(block.liveIn, liveIn) || !equalSets(block.liveOut, liveOut)) {
          changed = true;
        }
        block.liveIn = liveIn;
        block.liveOut = liveOut;
      }
    }

    const nextUse = [];
    for (const block of blocks) {
      const next = new Map([...block.liveOut].map((name) => [name, 'exit']));
      for (let offset = block.instructions.length - 1; offset >= 0; offset--) {
        const index = block.start + offset;
        const operandsUsed = operands(block.instructions[offset], globals);
        // Save the state AFTER this instruction, then step backwards over it.
        nextUse[index] = { index, block: block.id, after: Object.fromEntries(next) };
        for (const name of operandsUsed.def) next.delete(name);
        for (const name of operandsUsed.use) next.set(name, index + 1);
      }
    }
    return {
      iterations,
      globals,
      edges: cfg.edges,
      blocks: blocks.map((block) => ({
        ...block,
        use: [...block.use].sort(),
        def: [...block.def].sort(),
        liveIn: [...block.liveIn].sort(),
        liveOut: [...block.liveOut].sort(),
      })),
      nextUse,
    };
  }
  function generate(code, registerCount = 3) {
    if (![3, 4, 6].includes(registerCount)) throw new Error('Choose 3, 4 or 6 registers.');
    const flow = dataFlow(code),
      instructions = [],
      allocation = [];
    let loads = 0,
      stores = 0,
      evictions = 0;
    const registerNames = Array.from({ length: registerCount }, (_, i) => `R${i}`);
    flow.blocks.forEach((block) => {
      let registers = registerNames.map(() => null),
        index = block.start;
      const emit = (op, ...args) =>
        instructions.push({ op, args, tac: index + 1, block: block.id });
      const flush = () =>
        registers.forEach((entry, registerIndex) => {
          if (entry && entry.dirty) {
            emit('STORE', entry.name, registerNames[registerIndex]);
            stores++;
            entry.dirty = false;
          }
        });
      function release(registerIndex, reason) {
        const entry = registers[registerIndex];
        if (entry && entry.dirty) {
          emit('STORE', entry.name, registerNames[registerIndex]);
          stores++;
        }
        if (entry) {
          evictions++;
          allocation.push({
            tac: index + 1,
            event: `${registerNames[registerIndex]} evicts ${entry.name}: ${reason}`,
          });
        }
        registers[registerIndex] = null;
      }
      function slot(protectedRegisters = []) {
        const empty = registers.findIndex(
          (entry, registerIndex) => !entry && !protectedRegisters.includes(registerIndex),
        );
        if (empty >= 0) return empty;
        const after = flow.nextUse[index].after;
        const candidates = registerNames
          .map((_, registerIndex) => registerIndex)
          .filter((registerIndex) => !protectedRegisters.includes(registerIndex));
        const distance = (registerIndex) => {
          const value = after[registers[registerIndex].name];
          return value === undefined
            ? Infinity
            : value === 'exit'
              ? Number.MAX_SAFE_INTEGER
              : value;
        };
        candidates.sort((a, b) => distance(b) - distance(a));
        const registerIndex = candidates[0];
        if (registerIndex === undefined)
          throw new Error('No register available for this instruction.');
        release(registerIndex, 'farthest next use (or no further local use)');
        return registerIndex;
      }
      function read(value, protectedRegisters = []) {
        const existing = registers.findIndex((entry) => entry && entry.name === value);
        if (existing >= 0) return existing;
        const registerIndex = slot(protectedRegisters);
        emit(variable(value) ? 'LOAD' : 'CONST', registerNames[registerIndex], value);
        loads += variable(value) ? 1 : 0;
        registers[registerIndex] = { name: value, dirty: false };
        return registerIndex;
      }
      function write(value, protectedRegisters = []) {
        const existing = registers.findIndex((entry) => entry && entry.name === value);
        if (existing >= 0 && !protectedRegisters.includes(existing)) {
          registers[existing] = null;
          return existing;
        }
        return slot(protectedRegisters);
      }
      function bind(registerIndex, value) {
        // Any old register for the overwritten variable is no longer a valid cache entry.
        registers.forEach((entry, i) => {
          if (i !== registerIndex && entry && entry.name === value) registers[i] = null;
        });
        registers[registerIndex] = { name: value, dirty: true };
      }
      block.instructions.forEach((instruction, offset) => {
        index = block.start + offset;
        if (binaryOps.has(instruction.op)) {
          const leftRegister = read(instruction.arg1);
          const rightRegister = read(instruction.arg2, [leftRegister]);
          const resultRegister = write(instruction.result, [leftRegister, rightRegister]);
          emit(
            'BINARY',
            registerNames[resultRegister],
            instruction.op,
            registerNames[leftRegister],
            registerNames[rightRegister],
          );
          bind(resultRegister, instruction.result);
        } else if (
          instruction.op.startsWith('unary') ||
          ['copy', 'bool'].includes(instruction.op)
        ) {
          const operandRegister = read(instruction.arg1);
          const resultRegister = write(instruction.result, [operandRegister]);
          if (instruction.op === 'copy') {
            emit('MOVE', registerNames[resultRegister], registerNames[operandRegister]);
          } else {
            const operator = instruction.op === 'bool' ? 'bool' : instruction.op.slice(5);
            emit('UNARY', registerNames[resultRegister], operator, registerNames[operandRegister]);
          }
          bind(resultRegister, instruction.result);
        } else if (instruction.op === 'declare') {
          registers.forEach((entry, i) => {
            if (entry && entry.name === instruction.result) registers[i] = null;
          });
          emit('DECLARE', instruction.result, instruction.arg1);
        } else if (instruction.op === 'receive') {
          const registerIndex = write(instruction.result);
          emit('ARG', registerNames[registerIndex], instruction.arg1);
          bind(registerIndex, instruction.result);
        } else if (instruction.op === 'label' || instruction.op === 'function')
          emit(instruction.op === 'label' ? 'LABEL' : 'FUNCTION', instruction.result);
        else if (instruction.op === 'call') {
          flush();
          registers = registerNames.map(() => null);
          // Calls may change global memory and clobber registers, so the cache is invalidated.
          emit('CALL', 'R0', instruction.arg1, instruction.arg2);
          bind(0, instruction.result);
        } else if (['print', 'param'].includes(instruction.op)) {
          const registerIndex = read(instruction.arg1);
          emit(instruction.op.toUpperCase(), registerNames[registerIndex]);
        } else if (instruction.op === 'ifFalse' || instruction.op === 'ifTrue') {
          const registerIndex = read(instruction.arg1);
          flush();
          emit(
            instruction.op === 'ifFalse' ? 'JZ' : 'JNZ',
            registerNames[registerIndex],
            instruction.result,
          );
        } else if (instruction.op === 'return') {
          const registerIndex = instruction.arg1 ? read(instruction.arg1) : null;
          flush();
          emit('RET', ...(registerIndex === null ? [] : [registerNames[registerIndex]]));
        } else if (instruction.op === 'goto') {
          flush();
          emit('JMP', instruction.result);
        } else if (instruction.op === 'halt' || instruction.op === 'end') {
          flush();
          emit(
            instruction.op === 'halt' ? 'HALT' : 'END',
            ...(instruction.op === 'end' ? [instruction.result] : []),
          );
        } else throw new Error(`Target lowering does not support ${instruction.op}.`);
        allocation.push({
          tac: index + 1,
          event: registerNames
            .map(
              (name, i) =>
                `${name}: ${registers[i] ? registers[i].name + (registers[i].dirty ? ' *' : '') : '—'}`,
            )
            .join(' | '),
        });
      });
      flush();
    });
    return {
      registerCount,
      instructions,
      allocation,
      flow,
      stats: { loads, stores, evictions, instructions: instructions.length },
    };
  }
  const format = (instruction) =>
    `${instruction.op.padEnd(9)} ${instruction.args.join(', ')}`.trimEnd();
  global.SyntaxBackend = { dataFlow, generate, format, operands };
})(window);
