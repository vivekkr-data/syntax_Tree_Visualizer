'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');

global.window = global;
require(path.join(__dirname, '..', 'tokenizer.js'));
require(path.join(__dirname, '..', 'parser.js'));

function tokenize(source) {
  return new SyntaxTokenizer.Tokenizer(source).tokenize();
}

function parse(source) {
  return new SyntaxParser.Parser(tokenize(source)).parse();
}

const validPrograms = [
  ['quoted punctuation arguments', 'printf(")", ";", ",", "if", "+", "(");'],
  ['empty statements and loop bodies', '; for(int i=0;i<3;i++); while(false); if(true); else;'],
  ['decimal and exponent literals', 'double x=.5, y=5., z=1.25e-2;'],
  ['type specifier order', 'long unsigned int x; long long int y; long double z;'],
  ['void pointer declaration', 'void *p; void *identity(void *p){return p;}'],
  ['operator precedence', 'let result = 4 + 5 * 2 - 8 / 2; print(result);'],
  ['logical expressions', 'bool allowed = age >= 18 && active == true || admin;'],
  ['nested if and else-if', 'if (a > b) { if (a > c) print(a); else print(c); } else if (b > c) print(b); else print(c);'],
  ['while loop', 'int i = 0; while (i < 5) { i++; }'],
  ['do-while loop', 'int i = 0; do { ++i; } while (i < 5);'],
  ['for declaration', 'for (int i = 0; i < 10; i++) { if (i == 4) continue; }'],
  ['for expression lists', 'int i = 0, j = 9; for (i = 0, j = 9; i < j; i++, j--) print(i);'],
  ['one-dimensional array', 'int values[3] = {1, 2, 3}; values[1] *= 4;'],
  ['multi-dimensional array', 'int matrix[2][2] = {{1, 2}, {3, 4}}; print(matrix[1][0]);'],
  ['typed recursive C program', '#include <stdio.h>\nint factorial(int n) { if (n <= 1) return 1; return n * factorial(n - 1); } int main(void) { int answer = factorial(5); printf("%d", answer); return 0; }'],
  ['function keyword', 'function add(a, b) { return a + b; } print(add(2, 3));'],
  ['qualified declaration', 'const int limit = 10; unsigned long total = 0;'],
  ['pointer assignment', 'int value = 7; int *ptr = &value; *ptr = 9; (*ptr)++;'],
  ['pointer-return function', 'int *identity(int *value) { return value; }'],
  ['comments and escaped strings', '/* setup */ string text = "hello\\nworld"; // output\nprintf("%s", text);'],
  ['character literal', "char grade = 'A'; print(grade);"],
  ['ternary expression', 'int max = a > b ? a : b;'],
  ['bitwise and shifts', 'int flags = (5 << 2) | 3; flags ^= 1;'],
  ['empty for clauses', 'for (;;) { break; }'],
  ['scanf-style call', 'int value; scanf("%d", &value);'],
  ['multiple declarations', 'double a = 1.5, b = 2.5, result; result = a + b;'],
  ['empty function call', 'function ready() { return true; } print(ready());'],
  ['void return', 'void log(void) { print("done"); return; }'],
  ['single-statement branches', 'if (ready) print("yes"); else print("no");']
];

const invalidPrograms = [
  ['quoted operator is not an operator', 'int x=1 "+" 2;'],
  ['quoted keyword is not a statement', '"if"(true) print(1);'],
  ['quoted type is not a declaration', '"int" x=1;'],
  ['quoted assignment is not an assignment', 'x "=" 1;'],
  ['hash within code is not a directive', 'int x=1; # hidden junk'],
  ['raw multiline string', 'print("hello\nworld");'],
  ['empty character', "char x='';"],
  ['multicharacter literal', "char x='ab';"],
  ['unknown escape', 'print("\\q");'],
  ['nonfinite literal', 'print(1e400);'],
  ['incomplete exponent', 'print(1e+);'],
  ['contradictory types', 'int float x;'],
  ['repeated sign', 'unsigned unsigned x;'],
  ['void declaration with let', 'let void x;'],
  ['named void parameter', 'int f(void x){return 1;}'],
  ['declaration as bare branch', 'if(true) int x=1;'],
  ['missing semicolon', 'let x = 10'],
  ['unclosed block', 'if (x > 0) { print(x);'],
  ['bad for header', 'for (int i = 0 i < 3; i++) print(i);'],
  ['bad assignment target', '(a + b) = 4;'],
  ['bad update target', '++5;'],
  ['unterminated string', 'print("hello);'],
  ['unterminated comment', 'int x = 1; /* never closed'],
  ['unknown character', 'int x = 2 @ 3;'],
  ['missing parenthesis', 'while (x < 3 { x++; }'],
  ['void variable', 'void value;']
];

let passed = 0;

for (const [name, source] of validPrograms) {
  const ast = parse(source);
  assert.equal(ast.type, 'Program', `${name}: root should be Program`);
  assert.ok(ast.body.length > 0, `${name}: AST should not be empty`);
  passed += 1;
  console.log(`PASS valid: ${name}`);
}

for (const [name, source] of invalidPrograms) {
  assert.throws(
    () => parse(source),
    error => /line \d+, column \d+/.test(error.message),
    `${name}: error should contain line and column`
  );
  passed += 1;
  console.log(`PASS invalid: ${name}`);
}

const precedenceAst = parse('let result = 4 + 5 * 2;');
assert.equal(precedenceAst.body[0].initializer.operator, '+');
assert.equal(precedenceAst.body[0].initializer.right.operator, '*');
passed += 1;
console.log('PASS AST shape: multiplication precedence');

const assignmentAst = parse('a = b = 5;');
assert.equal(assignmentAst.body[0].expression.right.type, 'AssignmentExpression');
passed += 1;
console.log('PASS AST shape: right-associative assignment');

const includeTokens = tokenize('#include <stdio.h>\nint value = 1;');
assert.equal(includeTokens[0].lexeme, 'int');
assert.equal(includeTokens[0].line, 2);
assert.equal(includeTokens[0].column, 1);
passed += 1;
console.log('PASS tokenizer: preprocessor line and source location');

const longExpression = `let total = ${Array.from({ length: 500 }, (_, index) => index + 1).join(' + ')};`;
assert.equal(parse(longExpression).body.length, 1);
passed += 1;
console.log('PASS stress: 500-term expression');

const spelling = tokenize('print("a\\nb");')[2];
assert.equal(spelling.lexeme, '"a\\nb"');
assert.equal(spelling.literal, 'a\nb');
assert.equal(tokenize("'\\0'")[0].literal, '\0');
passed++;
console.log('PASS tokenizer: raw lexeme and decoded value stay separate');
assert.equal(tokenize('  #include <stdio.h>\nprint(1);')[0].line, 2);
assert.equal(parse('int a[2][3];').body[0].dimensions.length, 2);
assert.equal(Object.hasOwn(parse('int a[2];').body[0], 'arraySize'), false);
passed++;
console.log('PASS AST: array dimensions stored once');
console.log(`ALL ${passed} TESTS PASSED`);
