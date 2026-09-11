'use strict';
const assert = require('node:assert/strict');
global.window = global;
require('../tokenizer.js'); require('../parser.js'); require('../compiler.js');
const compile = source => SyntaxCompiler.compile(new SyntaxParser.Parser(new SyntaxTokenizer.Tokenizer(source).tokenize()).parse());
let count = 0;
function test(name, run) { run(); count++; console.log(`PASS ${name}`); }

// Test-only TAC evaluator. It checks generated branch/call behavior and never ships as app execution.
function evaluate(code) {
  const labels = new Map(), functions = new Map(), globals = new Map(), output = [];
  code.forEach((q, i) => { if (q.op === 'label') labels.set(q.result, i); if (q.op === 'function') functions.set(q.result, i + 1); });
  let budget = 20000;
  function run(start, memory, args = []) {
    const params = [];
    const read = value => {
      if (value === '') return undefined;
      if (memory.has(value)) return memory.get(value);
      if (globals.has(value)) return globals.get(value);
      try { return JSON.parse(value); } catch (_) { throw new Error(`Unbound IR operand: ${value}`); }
    };
    const write = (key, value) => (key.endsWith('@0') ? globals : memory).set(key, value);
    for (let pc = start; pc < code.length; pc++) {
      assert.ok(--budget > 0, 'IR should terminate for this fixture');
      const q = code[pc];
      switch (q.op) {
        case 'label': break;
        case 'declare': write(q.result, undefined); break;
        case 'copy': write(q.result, read(q.arg1)); break;
        case 'goto': pc = labels.get(q.result); break;
        case 'ifFalse': if (!read(q.arg1)) pc = labels.get(q.result); break;
        case 'ifTrue': if (read(q.arg1)) pc = labels.get(q.result); break;
        case 'bool': write(q.result, +!!read(q.arg1)); break;
        case 'param': params.push(read(q.arg1)); break;
        case 'receive': write(q.result, args[Number(q.arg1)]); break;
        case 'call': {
          assert.ok(functions.has(q.arg1), 'Fixture calls must resolve');
          const callArgs = params.splice(params.length - Number(q.arg2), Number(q.arg2));
          write(q.result, run(functions.get(q.arg1), new Map(), callArgs)); break;
        }
        case 'print': output.push(read(q.arg1)); break;
        case 'return': return read(q.arg1);
        case 'halt': case 'end': return;
        default: {
          const a = read(q.arg1), b = q.arg2 === '' ? undefined : read(q.arg2);
          const operations = { '+': () => a + b, '-': () => a - b, '*': () => a * b, '/': () => a / b, '%': () => a % b,
            '<': () => +(a < b), '>': () => +(a > b), '<=': () => +(a <= b), '>=': () => +(a >= b), '==': () => +(a === b), '!=': () => +(a !== b),
            '&': () => a & b, '|': () => a | b, '^': () => a ^ b, '<<': () => a << b, '>>': () => a >> b,
            'unary-': () => -a, 'unary+': () => +a, 'unary!': () => +!a, 'unary~': () => ~a };
          assert.ok(operations[q.op], `Unknown test operation ${q.op}`); write(q.result, operations[q.op]());
        }
      }
    }
  }
  run(0, globals); return output;
}
function checkOutput(source, expected) {
  const result = compile(source);
  assert.ok(result.ir, JSON.stringify(result.diagnostics));
  assert.deepEqual(evaluate(result.ir.code), expected);
  assert.deepEqual(evaluate(result.optimized.code), expected);
  assert.ok(result.cfg.edges.every(e => result.cfg.blocks.some(b => b.id === e.to)));
  return result;
}
const cases = [
  ['arithmetic precedence', 'int x = (4 + 5) * (12 - 2); print(x);', [90]],
  ['while', 'int x=0; while(x<4) x++; print(x);', [4]],
  ['for with continue', 'int total=0; for(int i=0;i<6;i++){if(i==2) continue;total+=i;} print(total);', [13]],
  ['for with break', 'int total=0; for(int i=0;i<6;i++){if(i==3) break;total+=i;} print(total);', [3]],
  ['do while continue targets test', 'int x=0; do {x++; continue;} while(x<3); print(x);', [3]],
  ['nested loop break', 'int x=0; for(int i=0;i<3;i++){while(true){x++;break;}} print(x);', [3]],
  ['empty for condition', 'int x=0; for(;;){if(x==2) break;x++;} print(x);', [2]],
  ['for sequence clauses', 'int i=0,j=5; for(i=0,j=5;i<j;i++,j--) print(i);', [0,1,2]],
  ['scope shadowing', 'int x=10; {int x=20; print(x);} print(x);', [20,10]],
  ['short circuit AND', 'int x=0; bool a=false && ++x; print(x); print(a);', [0,0]],
  ['short circuit OR', 'int x=0; bool a=true || ++x; print(x); print(a);', [0,1]],
  ['logical RHS evaluated once', 'int x=0; bool a=true && ++x; print(x); print(a);', [1,1]],
  ['conditional executes one arm', 'int x=1; int a=true ? x++ : ++x; print(a); print(x);', [1,2]],
  ['left operand snapshot', 'int x=2; int y=x+x++; print(y); print(x);', [4,3]],
  ['compound target snapshot', 'int x=2; x+=x++; print(x);', [4]],
  ['prefix vs postfix', 'int x=2; print(x++); print(++x); print(x);', [2,4,4]],
  ['right associative assignment', 'int x=0,y=0; x=y=5; print(x+y);', [10]],
  ['named function call', 'int square(int n){return n*n;} print(square(7));', [49]],
  ['recursive call', 'int fact(int n){if(n<=1)return 1;return n*fact(n-1);} print(fact(5));', [120]],
  ['argument snapshot and order', 'int sub(int a,int b){return a-b;} int x=2; print(sub(x,x++)); print(x);', [0,3]],
  ['nested calls preserve arguments', 'int add(int a,int b){return a+b;} print(add(1,add(2,3)));', [6]],
  ['global update in function', 'int x=0; void inc(void){x++;return;} inc();print(x);', [1]],
  ['bitwise operators', 'int x=(5<<2)|3; x^=1;print(x);', [22]],
  ['division preserved', 'int x=6/2; print(x);', [3]],
  ['string literals', 'string x="hello@world";print(x);', ['hello@world']],
  ['unreachable after return', 'int f(int n){return n;print(999);} print(f(8));', [8]]
];
cases.forEach(([name, source, expected]) => test(name, () => checkOutput(source, expected)));
const errors = [
  ['undeclared identifier', 'print(missing);', 'UNDECLARED'],
  ['duplicate declaration', 'int x=1; int x=2;', 'DUPLICATE'],
  ['const assignment', 'const int x=1;x=2;', 'CONST_WRITE'],
  ['const update', 'const int x=1;x++;', 'CONST_WRITE'],
  ['missing const initializer', 'const x;', 'CONST_INIT'],
  ['loop control outside loop', 'break;', 'LOOP_CONTROL'],
  ['continue outside loop', 'continue;', 'LOOP_CONTROL'],
  ['return outside function', 'return 2;', 'RETURN_CONTEXT'],
  ['void return value', 'void f(void){return 2;}', 'RETURN_VALUE'],
  ['nonvoid bare return', 'int f(void){return;}', 'RETURN_VALUE'],
  ['wrong arity', 'int f(int x){return x;}f();', 'ARGUMENT_COUNT'],
  ['call nonfunction', 'int x=2;x();', 'NOT_CALLABLE'],
  ['duplicate parameter', 'int f(int x,int x){return x;}', 'DUPLICATE'],
  ['function name write', 'int f(void){return 1;}f=3;', 'FUNCTION_WRITE'],
  ['for scope ends', 'for(int i=0;i<2;i++)print(i);print(i);', 'UNDECLARED'],
  ['nested function loop context', 'while(true){function f(){break;}break;}', 'LOOP_CONTROL'],
  ['string numeric initializer', 'int x="hello";', 'TYPE_MISMATCH']
];
errors.forEach(([name, source, code]) => test(name, () => {
  const result = compile(source); assert.equal(result.ir, null); assert.ok(result.diagnostics.some(d => d.code === code));
}));
test('source diagnostic location includes leading lines', () => {
  const d = compile('\n\nprint(missing);').diagnostics.find(d => d.code === 'UNDECLARED'); assert.deepEqual(d.loc, {line:3,column:7});
});
test('array AST retained, IR explicitly unavailable', () => {
  const r = compile('int a[2]={1,2};print(a[0]);'); assert.ok(r.valid); assert.equal(r.ir,null); assert.ok(r.limitations.length);
});
test('pointer AST retained, IR explicitly unavailable', () => {
  const r=compile('int a=1;int *p=&a;*p=3;');assert.ok(r.valid);assert.equal(r.ir,null);assert.ok(r.limitations.length);
});
test('external function assumption visible', () => {
  const r=compile('printf("hello");');assert.ok(r.ir);assert.ok(r.diagnostics.some(d=>d.code==='EXTERNAL_CALL'));
});
test('constant folding saves instructions', () => {
  const r=compile('int x=(4+5)*(12-2);');assert.ok(r.optimized.code.length<r.ir.code.length);assert.equal(r.optimized.changes[0].after,'90');
});
test('optimizer does not fold unsafe integer result', () => {
  const r=compile('let x=9007199254740991+1;');assert.equal(r.optimized.changes.length,0);
});
test('optimizer does not fold division', () => {
  const r=compile('int x=5/2;');assert.equal(r.optimized.changes.length,0);
});
test('CFG marks unreachable blocks and separates functions', () => {
  const r=compile('int f(int x){return x;print(9);}print(f(1));');
  assert.ok(r.cfg.blocks.some(b=>!b.reachable));
  assert.ok(r.cfg.edges.every(e=>r.cfg.blocks.find(b=>b.id===e.from).section===r.cfg.blocks.find(b=>b.id===e.to).section));
});
test('all built-in samples compile or explain limitation', () => {
  const fs=require('node:fs'),vm=require('node:vm');const text=fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8');
  const samples=vm.runInNewContext(`(${text.match(/const samples = (\{[\s\S]*?\n  \});/)[1]})`);
  Object.entries(samples).forEach(([name, source])=>{const r=compile(source);if(name==='errors')assert.equal(r.valid,false);else assert.ok(r.valid,`${name}: ${JSON.stringify(r.diagnostics)}`);assert.ok(r.ir||r.limitations.length||!r.valid);});
});
console.log(`ALL ${count} COMPILER TESTS PASSED`);
