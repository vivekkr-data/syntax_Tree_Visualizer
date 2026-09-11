(function (global) {
  'use strict';

  // Each pass owns its state. Parsing and AST inspection still work when later stages cannot run.
  const children = node => Object.entries(node || {}).flatMap(([key, value]) => {
    if (key === 'arraySize' || key === 'loc') return [];
    if (Array.isArray(value)) return value.filter(item => item && item.type);
    return value && value.type ? [value] : [];
  });
  const unwrap = node => node && node.type === 'GroupingExpression' ? unwrap(node.expression) : node;

  function analyze(ast) {
    const diagnostics = [], symbols = [], bindings = new WeakMap();
    let nextScope = 0;
    const scope = (parent, name) => ({ id: nextScope++, parent, name, names: new Map() });
    const root = scope(null, 'global');
    const report = (code, message, node, severity = 'error') => diagnostics.push({ code, severity, message, loc: node && node.loc || null });
    const lookup = (env, name) => env && (env.names.get(name) || lookup(env.parent, name));
    function declare(node, env, kind) {
      if (env.names.has(node.name)) report('DUPLICATE', `'${node.name}' is already declared in ${env.name}.`, node);
      const symbol = { name: node.name, kind, dataType: node.dataType || node.returnType || 'inferred',
        scope: `${env.name} #${env.id}`, irName: `${node.name}@${env.id}`, constant: node.kind === 'const',
        loc: node.loc || null, parameters: node.parameters ? node.parameters.length : null,
        pointerDepth: node.pointerDepth || node.returnPointerDepth || 0, dimensions: (node.dimensions || []).length };
      env.names.set(node.name, symbol); symbols.push(symbol); bindings.set(node, symbol);
      return symbol;
    }
    function use(node, env) {
      const symbol = lookup(env, node.name);
      if (!symbol) report('UNDECLARED', `'${node.name}' has no declaration in this scope.`, node);
      else bindings.set(node, symbol);
      return symbol;
    }
    function target(node, env) {
      node = unwrap(node);
      if (node.type === 'Identifier') {
        const symbol = use(node, env);
        if (symbol && symbol.constant) report('CONST_WRITE', `Cannot modify constant '${node.name}'.`, node);
        if (symbol && symbol.kind === 'function') report('FUNCTION_WRITE', `Cannot assign to function '${node.name}'.`, node);
      } else visit(node, env, null, 0);
    }
    function visit(node, env, fn, loops) {
      if (!node) return;
      switch (node.type) {
        case 'Program':
          // Top-level functions are visible for recursion and forward calls in this teaching language.
          node.body.filter(n => n.type === 'FunctionDeclaration').forEach(n => declare(n, env, 'function'));
          node.body.forEach(n => visit(n, env, fn, loops)); return;
        case 'FunctionDeclaration': {
          if (env !== root) {
            report('NESTED_FUNCTION', 'Nested function declarations are outside the compiler subset.', node);
            declare(node, env, 'function');
          }
          const local = scope(env, node.name);
          node.parameters.forEach(n => declare(n, local, 'parameter'));
          node.body.body.forEach(n => visit(n, local, node, 0)); return;
        }
        case 'BlockStatement': {
          const local = scope(env, 'block');
          node.body.forEach(n => visit(n, local, fn, loops)); return;
        }
        case 'VariableDeclaration': {
          (node.dimensions || []).forEach(n => visit(n, env, fn, loops));
          visit(node.initializer, env, fn, loops);
          declare(node, env, 'variable');
          if (node.kind === 'const' && !node.initializer) report('CONST_INIT', 'A constant needs an initializer.', node);
          if (node.initializer && node.initializer.type === 'Literal' && typeof node.initializer.value === 'string' &&
              node.dataType && !['string', 'char'].includes(node.dataType) && !node.pointerDepth) {
            report('TYPE_MISMATCH', `String literal cannot initialize '${node.dataType} ${node.name}'.`, node);
          }
          return;
        }
        case 'Identifier': use(node, env); return;
        case 'AssignmentExpression': target(node.left, env); visit(node.right, env, fn, loops); return;
        case 'UpdateExpression': target(node.argument, env); return;
        case 'CallExpression': {
          const callee = unwrap(node.callee);
          const external = callee.type === 'Identifier' && ['printf', 'scanf'].includes(callee.name) && !lookup(env, callee.name);
          if (external) report('EXTERNAL_CALL', `${callee.name} is treated as an external function; its signature is not checked.`, callee, 'info');
          else {
            visit(node.callee, env, fn, loops);
            const symbol = bindings.get(callee);
            if (symbol && symbol.kind !== 'function') report('NOT_CALLABLE', `'${callee.name}' is not a function.`, callee);
            if (symbol && symbol.kind === 'function' && symbol.parameters !== node.arguments.length)
              report('ARGUMENT_COUNT', `'${callee.name}' expects ${symbol.parameters} argument(s), received ${node.arguments.length}.`, callee);
          }
          node.arguments.forEach(n => visit(n, env, fn, loops)); return;
        }
        case 'ForStatement': {
          const local = scope(env, 'for');
          visit(node.initializer, local, fn, loops); visit(node.condition, local, fn, loops);
          visit(node.update, local, fn, loops); visit(node.body, local, fn, loops + 1); return;
        }
        case 'WhileStatement': case 'DoWhileStatement':
          visit(node.condition, env, fn, loops); visit(node.body, env, fn, loops + 1); return;
        case 'BreakStatement': case 'ContinueStatement':
          if (!loops) report('LOOP_CONTROL', `${node.type === 'BreakStatement' ? 'break' : 'continue'} must be inside a loop.`, node);
          return;
        case 'ReturnStatement':
          if (!fn) report('RETURN_CONTEXT', 'return must be inside a function.', node);
          else if (fn.returnType === 'void' && node.argument) report('RETURN_VALUE', 'A void function cannot return a value.', node);
          else if (fn.returnType !== 'void' && fn.returnType !== 'inferred' && !node.argument) report('RETURN_VALUE', 'This function must return a value.', node);
          visit(node.argument, env, fn, loops); return;
        default: children(node).forEach(n => visit(n, env, fn, loops));
      }
    }
    visit(ast, root, null, 0);
    return { diagnostics, symbols, bindings, valid: !diagnostics.some(d => d.severity === 'error') };
  }

  function unsupported(ast) {
    const issues = [];
    function visit(node) {
      if (!node) return;
      let reason = '';
      if (['ArrayExpression', 'IndexExpression'].includes(node.type) || node.pointerDepth || node.returnPointerDepth || (node.dimensions || []).length)
        reason = 'Arrays and pointers remain available in AST mode; scalar TAC does not model memory layout.';
      if (node.type === 'UnaryExpression' && ['&', '*'].includes(node.operator)) reason = 'Address and dereference operations require a memory model; scalar TAC is unavailable.';
      if (node.type === 'CallExpression' && unwrap(node.callee).type !== 'Identifier') reason = 'Scalar TAC supports named function calls only.';
      if (reason && !issues.some(x => x.message === reason)) issues.push({ severity: 'info', code: 'IR_SUBSET', message: reason, loc: node.loc || null });
      children(node).forEach(visit);
    }
    visit(ast); return issues;
  }

  function generate(ast, analysis, optimize) {
    const code = [], changes = [], stack = [];
    let tempCount = 0, labelCount = 0;
    let section = 'global';
    const temp = () => `%t${++tempCount}`;
    const label = () => `L${++labelCount}`;
    const emit = (op, arg1 = '', arg2 = '', result = '') => code.push({ op, arg1, arg2, result, section });
    const mark = name => emit('label', '', '', name);
    const jump = name => emit('goto', '', '', name);
    const name = node => (analysis.bindings.get(node) || {}).irName || node.name;
    function folded(node) {
      if (!node) return null;
      if (node.type === 'Literal' && Number.isSafeInteger(node.value)) return node.value;
      if (node.type === 'GroupingExpression') return folded(node.expression);
      if (node.type === 'UnaryExpression' && ['+', '-'].includes(node.operator)) {
        const value = folded(node.argument);
        return value === null ? null : node.operator === '-' ? -value : value;
      }
      if (node.type !== 'BinaryExpression' || !['+', '-', '*', '<', '<=', '>', '>=', '==', '!='].includes(node.operator)) return null;
      const a = folded(node.left), b = folded(node.right);
      if (a === null || b === null) return null;
      const operations = { '+': () => a + b, '-': () => a - b, '*': () => a * b,
        '<': () => +(a < b), '<=': () => +(a <= b), '>': () => +(a > b), '>=': () => +(a >= b),
        '==': () => +(a === b), '!=': () => +(a !== b) };
      const value = operations[node.operator]();
      return Number.isSafeInteger(value) ? value : null;
    }
    // Snapshot operands before later side effects (x + x++, nested calls, compound assignment).
    function snapshot(node) {
      const value = expr(node);
      if (value.includes('@')) { const saved = temp(); emit('copy', value, '', saved); return saved; }
      return value;
    }
    function expr(node) {
      if (!node) return '';
      if (optimize && !['Literal', 'Identifier'].includes(node.type)) {
        const value = folded(node);
        if (value !== null) { changes.push({ rule: 'Constant folding', before: describe(node), after: String(value) }); return String(value); }
      }
      switch (node.type) {
        case 'Literal': return JSON.stringify(node.value);
        case 'Identifier': return name(node);
        case 'GroupingExpression': return expr(node.expression);
        case 'SequenceExpression': { let value = ''; node.expressions.forEach(n => { value = expr(n); }); return value; }
        case 'AssignmentExpression': {
          const target = name(unwrap(node.left));
          let value;
          if (node.operator === '=') value = expr(node.right);
          else {
            const before = snapshot(node.left), right = expr(node.right);
            value = temp(); emit(node.operator.slice(0, -1), before, right, value);
          }
          emit('copy', value, '', target); return target;
        }
        case 'UpdateExpression': {
          const target = name(unwrap(node.argument)), before = temp(), after = temp();
          emit('copy', target, '', before); emit(node.operator === '++' ? '+' : '-', before, '1', after);
          emit('copy', after, '', target); return node.prefix ? after : before;
        }
        case 'UnaryExpression': {
          const value = expr(node.argument), result = temp(); emit(`unary${node.operator}`, value, '', result); return result;
        }
        case 'BinaryExpression': {
          if (['&&', '||'].includes(node.operator)) {
            const result = temp(), shortcut = label(), end = label();
            const isAnd = node.operator === '&&';
            emit(isAnd ? 'ifFalse' : 'ifTrue', expr(node.left), '', shortcut);
            const right = expr(node.right); emit('bool', right, '', result); jump(end);
            mark(shortcut); emit('copy', isAnd ? '0' : '1', '', result); mark(end); return result;
          }
          const left = snapshot(node.left), right = expr(node.right), result = temp();
          emit(node.operator, left, right, result); return result;
        }
        case 'ConditionalExpression': {
          const other = label(), end = label(), result = temp();
          emit('ifFalse', expr(node.test), '', other); emit('copy', expr(node.consequent), '', result); jump(end);
          mark(other); emit('copy', expr(node.alternate), '', result); mark(end); return result;
        }
        case 'CallExpression': {
          const args = node.arguments.map(snapshot);
          args.forEach(a => emit('param', a));
          const result = temp(); emit('call', name(unwrap(node.callee)), String(args.length), result); return result;
        }
        default: throw new Error(`TAC expression not supported: ${node.type}`);
      }
    }
    function statement(node) {
      if (!node) return;
      switch (node.type) {
        case 'Program':
          node.body.filter(n => n.type !== 'FunctionDeclaration').forEach(statement);
          emit('halt');
          node.body.filter(n => n.type === 'FunctionDeclaration').forEach(statement); return;
        case 'BlockStatement': node.body.forEach(statement); return;
        case 'VariableDeclarationList': node.declarations.forEach(statement); return;
        case 'VariableDeclaration':
          emit('declare', node.dataType || node.kind, '', name(node));
          if (node.initializer) emit('copy', expr(node.initializer), '', name(node)); return;
        case 'FunctionDeclaration':
          section = name(node); emit('function', '', '', section);
          node.parameters.forEach((n, i) => emit('receive', String(i), '', name(n)));
          statement(node.body); emit('end', '', '', section); section = 'global'; return;
        case 'ExpressionStatement': expr(node.expression); return;
        case 'PrintStatement': emit('print', expr(node.expression)); return;
        case 'ReturnStatement': emit('return', expr(node.argument)); return;
        case 'BreakStatement': jump(stack[stack.length - 1].exit); return;
        case 'ContinueStatement': jump(stack[stack.length - 1].next); return;
        case 'IfStatement': {
          const other = label(), end = node.alternate ? label() : other;
          emit('ifFalse', expr(node.condition), '', other); statement(node.consequent);
          if (node.alternate) { jump(end); mark(other); statement(node.alternate); }
          mark(end); return;
        }
        case 'WhileStatement': case 'ForStatement': case 'DoWhileStatement': {
          const start = label(), next = label(), exit = label();
          if (node.type === 'ForStatement') statement(node.initializer);
          stack.push({ next, exit }); mark(start);
          if (node.type !== 'DoWhileStatement' && node.condition) emit('ifFalse', expr(node.condition), '', exit);
          statement(node.body); mark(next);
          if (node.type === 'ForStatement') expr(node.update);
          if (node.type === 'DoWhileStatement') emit('ifTrue', expr(node.condition), '', start);
          else jump(start);
          mark(exit); stack.pop(); return;
        }
        default: expr(node);
      }
    }
    statement(ast);
    return { code, changes };
  }

  function describe(node) {
    if (node.type === 'Literal') return JSON.stringify(node.value);
    if (node.type === 'GroupingExpression') return `(${describe(node.expression)})`;
    if (node.type === 'UnaryExpression') return `${node.operator}${describe(node.argument)}`;
    if (node.type === 'BinaryExpression') return `(${describe(node.left)} ${node.operator} ${describe(node.right)})`;
    return node.type;
  }

  function format(q) {
    switch (q.op) {
      case 'label': return `${q.result}:`;
      case 'goto': return `goto ${q.result}`;
      case 'ifFalse': return `ifFalse ${q.arg1} goto ${q.result}`;
      case 'ifTrue': return `if ${q.arg1} goto ${q.result}`;
      case 'copy': return `${q.result} = ${q.arg1}`;
      case 'declare': return `declare ${q.result} : ${q.arg1}`;
      case 'function': return `function ${q.result}:`;
      case 'end': return `end ${q.result}`;
      case 'receive': return `${q.result} = argument ${Number(q.arg1) + 1}`;
      case 'param': case 'print': case 'return': return `${q.op} ${q.arg1}`.trim();
      case 'halt': return 'halt';
      case 'call': return `${q.result} = call ${q.arg1}, ${q.arg2}`;
      case 'bool': return `${q.result} = bool ${q.arg1}`;
      default: return q.op.startsWith('unary') ? `${q.result} = ${q.op.slice(5)}${q.arg1}` : `${q.result} = ${q.arg1} ${q.op} ${q.arg2}`;
    }
  }

  function buildCFG(code) {
    const stops = new Set(['goto', 'ifFalse', 'ifTrue', 'return', 'halt', 'end']);
    const leaders = new Set(code.length ? [0] : []);
    code.forEach((q, i) => {
      if (q.op === 'label' || q.op === 'function') leaders.add(i);
      if (stops.has(q.op) && i + 1 < code.length) leaders.add(i + 1);
    });
    const starts = [...leaders].sort((a, b) => a - b);
    const blocks = starts.map((start, i) => ({ id: `B${i}`, section: code[start].section, start,
      instructions: code.slice(start, starts[i + 1] === undefined ? code.length : starts[i + 1]) }));
    const targets = new Map();
    blocks.forEach(b => b.instructions.filter(q => q.op === 'label').forEach(q => targets.set(q.result, b.id)));
    const edges = [];
    blocks.forEach((b, i) => {
      const last = b.instructions[b.instructions.length - 1], next = blocks[i + 1];
      if (['goto', 'ifFalse', 'ifTrue'].includes(last.op)) edges.push({ from: b.id, to: targets.get(last.result), label: last.op === 'goto' ? 'jump' : last.op === 'ifFalse' ? 'false' : 'true' });
      if ((!stops.has(last.op) || ['ifFalse', 'ifTrue'].includes(last.op)) && next && next.section === b.section)
        edges.push({ from: b.id, to: next.id, label: last.op === 'ifFalse' ? 'true' : last.op === 'ifTrue' ? 'false' : 'next' });
    });
    const reached = new Set(), pending = blocks.filter((b, i) => i === 0 || b.instructions[0].op === 'function').map(b => b.id);
    while (pending.length) { const id = pending.pop(); if (reached.has(id)) continue; reached.add(id); edges.filter(e => e.from === id).forEach(e => pending.push(e.to)); }
    blocks.forEach(b => { b.reachable = reached.has(b.id); });
    return { blocks, edges };
  }

  function compile(ast) {
    const analysis = analyze(ast);
    const limitations = unsupported(ast);
    if (!analysis.valid || limitations.length) return { ...analysis, limitations, ir: null, optimized: null, cfg: null };
    const ir = generate(ast, analysis, false), optimized = generate(ast, analysis, true);
    return { ...analysis, limitations, ir, optimized, cfg: buildCFG(ir.code) };
  }
  global.SyntaxCompiler = { analyze, compile, generate, buildCFG, format };
})(window);
