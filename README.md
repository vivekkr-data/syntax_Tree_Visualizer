# Syntax Tree Visualizer and Compiler Workbench

A browser-based **Compiler Design project** built with HTML, CSS and plain JavaScript. It shows how an educational C-like program becomes tokens, an Abstract Syntax Tree (AST), scalar three-address code, basic blocks and symbolic target instructions. A separate Grammar Lab demonstrates FIRST, FOLLOW and LL(1) parsing.

**Project purpose:** make compiler stages visible so a student can explain what each stage receives, what it does and what it produces.

[Existing Render website](https://syntax-tree-visualizer-fwpv.onrender.com/) · [Project report](PROJECT_REPORT.md) · [Viva questions](VIVA_QUESTIONS.md) · [Course-topic mapping](SYLLABUS_MAPPING.md)

The website generates compilation artifacts; **it does not run the source program or display its runtime output**. Arrays and pointers can be parsed and visualized, but the later code-generation stages support scalar programs only. The Render website may serve an older revision until its deployment updates.

## Contents

1. [Run the project](#1-run-the-project)
2. [Understand the interface](#2-understand-the-interface)
3. [Follow one example through the compiler](#3-follow-one-example-through-the-compiler)
4. [Understand every compiler stage](#4-understand-every-compiler-stage)
5. [Use the Grammar Lab](#5-use-the-grammar-lab)
6. [Supported language and exact boundaries](#6-supported-language-and-exact-boundaries)
7. [Faculty demonstration sequence](#7-faculty-demonstration-sequence)
8. [Files and functions to explain](#8-files-and-functions-to-explain)
9. [Tests and verification](#9-tests-and-verification)
10. [Troubleshooting and future work](#10-troubleshooting-and-future-work)

## 1. Run the project

### Download and open

```bash
git clone https://github.com/vivekkr-data/syntax_Tree_Visualizer.git
cd syntax_Tree_Visualizer
```

Open `index.html` in a modern browser. No build, npm installation, database, API key or application server is required.

### Recommended: use a local static server

On Windows:

```bash
py -m http.server 8000
```

On Linux/macOS:

```bash
python3 -m http.server 8000
```

Visit [http://localhost:8000](http://localhost:8000). This server only serves files; compilation happens inside the browser. Node.js is needed only for automated tests.

## 2. Understand the interface

| Area | What to do | What it shows |
| --- | --- | --- |
| Source Code | Choose an example or type code; select **Analyze Program** | Input to the tokenizer and parser |
| Abstract Syntax Tree | Click a node; zoom, pan or select **Fit** | Program structure and node relationships |
| Node inspector | Select any tree node | Node type, label, depth and children |
| Tokens | Open the Tokens tab | Token type, exact lexeme and line/column |
| Symbols | Open the Symbols tab | A declaration overview with initializer expressions |
| AST JSON | Inspect, copy or download | The parser's actual AST object |
| Grammar | Open the inspector's Grammar tab | Summary of the fixed source-language grammar |
| Semantic Checks | Open the first Compiler Workbench tab | Diagnostics and the scoped symbol table |
| Three-Address Code | Open its workbench tab | TAC instructions and equivalent quadruples |
| Optimization | Compare Before and After | Folded expressions and instruction counts |
| Control-Flow Graph | Inspect blocks, arrows and full listings | Jumps, branch paths and structural reachability |
| Code Generation | Choose original/optimized TAC and 3/4/6 registers | Virtual target, allocation trace, liveness and next use |
| Grammar Lab | Enter productions and input tokens | FIRST/FOLLOW, LL(1) table and predictive parsing trace |

The two symbol views serve different purposes: **Symbols** summarizes declarations; **Scoped Symbol Table** shows the bindings actually used by semantic analysis and TAC.

**Controls:** `Ctrl+Enter` or `Cmd+Enter` analyzes source. Tab inserts two spaces in the source editor. `+`/`−` and the mouse wheel zoom; dragging empty canvas space pans. **Fit** fits the complete tree; **Reset** restores 100% zoom. Preorder, postorder and level-order support Play, Step and Stop. A node can also be selected with Enter/Space. Compiler-stage tabs support arrow keys, Home and End.

**Exports:** AST JSON saves the tree; SVG saves the complete tree independently of the current zoom; Analysis JSON saves source, diagnostics, symbols, original/optimized TAC, CFG and the currently selected backend result. Grammar Lab results are separate and are not included in Analysis JSON.

Editing source clears its old results and disables analysis export until it is analyzed again. Changing a grammar or its input clears the previous grammar trace.

## 3. Follow one example through the compiler

Enter:

```c
int result = 4 + 5 * 2;
print(result);
```

### Step 1: lexical analysis

The tokenizer produces these lexemes, followed by an internal EOF token:

```text
int  result  =  4  +  5  *  2  ;  print  (  result  )  ;
```

Examples: `int` is a keyword, `result` is an identifier, `4` is a number, `+` is an operator and `;` is punctuation. EOF is excluded from the visible token count. A quoted token such as `"+"` is a string literal, never an operator.

### Step 2: parsing and AST construction

Multiplication has higher precedence than addition, so the initializer is `4 + (5 * 2)`, with `+` above `*` in the AST. The Program contains a VariableDeclaration and a PrintStatement. The displayed tree has **9 nodes**, maximum depth **4** with the root at depth 0, and **14 visible tokens**.

The AST omits semicolons, delimiter tokens and grammar-expansion nodes. Explicit parentheses are retained as GroupingExpression nodes; this is an educational AST, not a concrete parse tree.

### Step 3: semantic analysis

`result` is declared once in the global scope and its use in `print` resolves to that declaration. Its IR name is `result@0`; the suffix distinguishes its scope from a shadowed declaration elsewhere.

### Step 4: original TAC

```text
declare result@0 : int
%t1 = 5 * 2
%t2 = 4 + %t1
result@0 = %t2
print result@0
halt
```

`%t1` and `%t2` are generated temporaries. The quadruple for multiplication is `(op="*", arg1="5", arg2="2", result="%t1")`. TAC and quadruples are two views of the same instruction records.

### Step 5: constant folding

Both operands are literals, so the optimizer evaluates the supported expression at compile time:

```text
declare result@0 : int
result@0 = 14
print result@0
halt
```

The listing shrinks from **6 instructions to 4**, including bookkeeping instructions. `14` is the expected value represented by this code; the website does not execute `print`.

### Step 6: control flow, data flow and target code

This straight-line example forms one basic block. Code Generation lowers its TAC into instructions such as CONST, BINARY, MOVE, STORE and PRINT using the selected registers. Choose **Optimized TAC** to see the backend process the folded form.

## 4. Understand every compiler stage

### 4.1 Tokenizer — `tokenizer.js`

`Tokenizer.tokenize()` scans source from left to right. It recognizes identifiers/keywords, decimal numbers, quoted strings/characters, operators and punctuation. Three-character operators are checked before two-character and one-character operators, so `>>=` remains one token.

Each token stores `type`, `lexeme`, `literal`, `line` and `column`. The lexeme preserves source spelling; the literal stores the decoded value. Whitespace and comments are skipped while locations are updated. Lines whose first non-whitespace character is `#` are ignored; macro expansion is not performed.

### 4.2 Recursive-descent parser — `parser.js`

`Parser.parse()` consumes the token stream and builds the Program AST. Statement methods handle declarations, functions, blocks, conditions and loops. Expression methods implement precedence and associativity. `consumeLexeme()` reports missing expected syntax with a line and column.

| Precedence, highest to lowest | Operators/forms | Associativity |
| --- | --- | --- |
| Postfix | Calls, indexing, postfix `++`/`--` | Left to right |
| Prefix/unary | `++`, `--`, `!`, `~`, unary `+`/`-`, `&`, `*` | Right to left |
| Multiplicative | `*`, `/`, `%` | Left to right |
| Additive | `+`, `-` | Left to right |
| Shift | `<<`, `>>` | Left to right |
| Relational | `<`, `<=`, `>`, `>=` | Left to right |
| Equality | `==`, `!=` | Left to right |
| Bitwise | `&`, then `^`, then `\|` | Left to right within each level |
| Logical | `&&`, then `\|\|` | Left to right within each level |
| Conditional | `?:` | Right to left |
| Assignment | `=`, `+=`, `-=`, `*=`, `/=`, `%=` and bitwise/shift assignments | Right to left |

Parentheses override precedence. `a = b = 5` parses as `a = (b = 5)`. Assignment/update targets must be identifiers, indexed expressions or dereferences, possibly parenthesized. Full C lvalue/type compatibility is outside scope.

### 4.3 AST visualization — `visualizer.js`

The visualizer wraps each AST node with an ID, parent, children, depth and position. A postorder layout spaces leaves horizontally, places parents above their children and uses depth for vertical position. SVG paths draw edges; SVG groups draw clickable nodes. Transforms implement zoom and pan without rebuilding the AST.

Traversal meanings: **preorder** visits a parent before children; **postorder** visits children before the parent; **level-order** visits each depth from left to right using a queue. Traversal order does not execute the source program.

### 4.4 Semantic analysis — `SyntaxCompiler.analyze(ast)`

Each lexical scope has a name map and a parent scope. Lookup searches the current scope and then its parents. A WeakMap connects AST occurrences to their resolved symbols without inserting circular references into AST JSON.

Implemented diagnostics include undeclared names, same-scope duplicates, missing constant initializers, constant/function-name writes, calls to nonfunctions, incorrect argument counts, unsupported function values, use of a known void-returning call as a value, nested functions, misplaced return/break/continue, and basic string-literal-to-numeric initialization errors.

A syntax-valid program may still have semantic errors. In that case its AST remains visible, but TAC is blocked. Passing these checks does not imply complete C type correctness.

### 4.5 TAC generation — `SyntaxCompiler.generate(...)`

Recursive AST lowering emits quadruples with `op`, `arg1`, `arg2`, `result` and a function `section`. Temporaries hold intermediate values; labels and jumps represent control flow. Earlier variable operands are copied before later side effects, preserving this teaching language's left-to-right evaluation order.

- `if`/`else` and ternary expressions use conditional jumps and join labels.
- `&&`/`||` use short-circuit jumps, so the right operand is evaluated only when needed.
- A `for` loop's continue target runs its update; a `while` continue returns to its test; a `do-while` continue reaches its trailing test.
- A loop stack gives each break/continue the innermost loop's target.
- Calls use `param`, `call`, `receive` and `return`; function bodies occupy separate sections.

**Entry rule:** the global section ends with `halt`. A function named `main` is not invoked automatically. For a complete code-generation demonstration, use a top-level call such as `print(square(7));`.

### 4.6 Optimization — constant folding

The optimized listing is generated from the same unchanged AST with folding enabled. It folds literal-only safe-integer addition, subtraction, multiplication, unary signs and comparisons. Signed zero is preserved. Each replacement appears in the rule log.

There is no constant propagation through variables, common-subexpression elimination, loop optimization or dead-code elimination. Division, modulo, bitwise/shift operations, noninteger arithmetic and unsafe-integer results are not folded. An unchanged listing can therefore be correct.

### 4.7 Basic blocks and CFG — `SyntaxCompiler.buildCFG(code)`

Entry instructions, labels/function entries and instructions after control transfers start blocks. Conditional jumps create true/false edges; ordinary flow creates a next edge. Return, halt and function end have no fall-through edge.

The CFG tab always uses **original TAC**. Each function entry and the global entry is a reachability root. Dashed blocks are structurally unreachable; constant conditions are not evaluated, and an uncalled function is not classified as unreachable. Calls remain instructions rather than interprocedural graph edges.

### 4.8 Liveness and next use — `SyntaxBackend.dataFlow(code)`

USE contains values read before a definition in a block; DEF contains names defined there. The backend repeats these equations until the sets stop changing:

```text
OUT[B] = union of IN sets of B's successors
IN[B]  = USE[B] union (OUT[B] - DEF[B])
```

A backward scan records the next use **after each instruction**. Numbers refer to the selected TAC listing's 1-based instruction numbers; `exit` means live at the block boundary. Calls and exits conservatively use globals. This is intraprocedural liveness, not a definite-assignment check.

### 4.9 Virtual target and register allocation — `SyntaxBackend.generate(code, count)`

The target is a custom symbolic register machine with **3, 4 or 6 registers**. Allocation happens separately in each basic block. It reuses cached operands and, when registers fill, evicts an unprotected register with the farthest next use, preferring values with no later local use. Current instruction operands are protected.

A dirty register, marked `*` in the trace, has a newer value than memory. Dirty values are stored before eviction, block exits and calls. Calls invalidate register caches because they may change globals. More registers do not guarantee fewer instructions for every input.

| Target instructions | Meaning |
| --- | --- |
| DECLARE, CONST | Declare a symbolic slot; load a literal |
| LOAD, STORE, MOVE | Move between memory/registers or between registers |
| BINARY, UNARY | Apply an IR operation |
| LABEL, JMP, JZ, JNZ | Define labels and perform branches |
| FUNCTION, ARG, PARAM, CALL, RET, END | Function sections and argument/return operations |
| PRINT, HALT | Symbolic print; end global section |

Local slots and temporaries conceptually belong to each call frame; globals are shared. No native byte offsets or ABI are modeled. This is not x86/ARM, LLVM or executable machine code. Only the automated test harnesses execute fixtures to check behavior.

## 5. Use the Grammar Lab

**This lab is independent of the source-code parser.** Editing its grammar does not change the C-like source language or AST.

1. Select **LL(1) Expressions** or enter productions.
2. Separate every grammar symbol with spaces. Use `->` or `→`; use `|` for alternatives and `ε`/`epsilon` for the empty word.
3. Enter space-separated input tokens such as `id + id * id`.
4. Select **Analyze Grammar**, then inspect productions, FIRST/FOLLOW and the table.
5. Use **Next Step**, **Show All** or **Reset Trace** to follow stack/input/action rows.

```text
E -> T E_tail
E_tail -> + T E_tail | ε
T -> F T_tail
T_tail -> * F T_tail | ε
F -> ( E ) | id
```

The first left-hand side is the start symbol. All left-hand-side names are nonterminals; other symbols are terminals. `$` is an automatically added end marker and must not be entered. Literal pipe terminals and grammar comments are not supported.

FIRST and FOLLOW are computed by repeated set propagation. For `A → α`, the table selects that production under FIRST(α), excluding ε; if α is nullable, it also uses FOLLOW(A). In the example, FIRST(E) is `{ (, id }` and FOLLOW(E) is `{ $, ) }`.

Multiple productions in a cell are reported as a conflict. The lab also detects direct/indirect left recursion, nonproductive nonterminals and unreachable rules. Tracing is available only when the grammar passes the conflict, recursion and productivity checks. **An LL(1) conflict alone does not prove ambiguity.** The tool does not automatically rewrite a grammar or build LR tables.

## 6. Supported language and exact boundaries

| Feature | Example | AST | Scalar TAC/target |
| --- | --- | --- | --- |
| Declarations | `int a=1,b=2;`, `let x=3;`, `const int n=5;` | Yes | Yes |
| Qualified types | `unsigned long n=0;` | Yes | Yes, as annotations |
| Decimal literals | `5`, `.5`, `5.`, `1.25e-2` | Yes | Yes |
| Strings, characters, booleans | `"hello"`, `'A'`, `true` | Yes | Yes |
| Operators and assignment | `a+b*2`, `x+=1`, `++x`, `x++`, `a?b:c` | Yes | Yes |
| Conditions and loops | if/else, while, for, do-while | Yes | Yes |
| Control statements | return, break, continue, empty `;` | Yes | Yes, with context checks |
| Functions | `int square(int n){return n*n;}` | Yes | Yes |
| Inferred functions | `function add(a,b){return a+b;}` | Yes | Yes |
| Output notation | `print(x);` | Yes | Symbolic PRINT |
| External calls | `printf("%d",x);` | Yes | Symbolic external call |
| Arrays and indexing | `int a[2]={1,2};`, `a[i]`, multidimensional arrays | Yes | No: memory lowering unavailable |
| Pointers | `int *p=&x;`, `*p=3;` | Yes | No: memory lowering unavailable |
| Comments/directives | `//...`, `/*...*/`, line-leading `#include` | Skipped | Not instructions |

Important teaching-language rules:

- All declarations, including `var`, use lexical block scope. For-loop declarations end at the loop. Bare branch/loop declarations require braces.
- Variables follow declaration order. Initializers resolve names **before** adding their own declaration; for example, an inner `int x=x+1;` can read an already declared outer `x`. This is an explicit simplification from C.
- Top-level functions are predeclared for forward calls and recursion. Function bodies are checked at their declaration; put globals used by a function before that function.
- Types are annotations with limited validation. Contradictory type words and non-pointer void variables/parameters are rejected. Full numeric conversions, type widths, overflow, format-string validation, definite assignment, array bounds and all-path return checking are not implemented.
- Digit-only numbers are decimal, including numbers with leading zeros.
- Values follow the teaching IR used by the JavaScript test evaluators. Division is numeric division (`5/2` gives `2.5` in tests), not C integer division; bitwise operators use JavaScript's 32-bit rules. Characters are one-character strings, not integer character codes. Use initialized numeric variables for arithmetic demos.
- Operands and call arguments evaluate left to right. Logical operators short-circuit and produce 0 or 1. These are project conventions, not the complete C standard.
- Supported quoted escapes are `\n`, `\t`, `\r`, `\0`, `\"`, `\'` and `\\`. Unsupported escapes, multiline quoted literals and empty/multiple-character single-quoted literals produce lexical errors.
- `printf`/`scanf` are assumed external functions only when not declared by the program. Their signatures and implementations are not supplied. A `scanf` expression with address-of remains AST-only.
- Any array/pointer memory feature blocks TAC for the **whole source input**, with an explicit explanation. This prevents misleading partial code generation.

Not supported: complete C/C++/Java syntax, macro expansion, hexadecimal numeric forms and numeric suffixes, structures/classes, switch/case, goto, function prototypes, function pointers, native compilation or source execution.

Responsiveness limits: backend analysis allows 2,000 TAC instructions; Grammar Lab allows 20,000 characters, 160 alternatives, 50 nonterminals, 100 terminals, 50 symbols per alternative and 250 input tokens. Predictive tracing is bounded. Extremely deep source nesting can exceed the browser's recursion limit; use compact classroom examples.

## 7. Faculty demonstration sequence

Selecting an example analyzes it automatically. The expected values below explain the source program; they are not runtime output from the website.

| Order | Example/action | Explain or show |
| --- | --- | --- |
| 1 | **Expression** | `4+5*2` becomes 14; show 14 tokens, precedence and AST nodes |
| 2 | Node, Tokens, AST JSON | Connect source spelling, token objects and the tree representation |
| 3 | Preorder/Postorder/Level-order; zoom and export | Demonstrate traversal, highlighting and navigation |
| 4 | **Variables**, **If / Else**, **While Loop** | Declarations, branches and repetition; expected area 96, branch `Pass`, loop values 0/1/2 |
| 5 | **Nested Scopes** | Two `value` declarations have different IR names; expected values 20 then 10 |
| 6 | **Semantic Errors** | Four diagnostics: constant write, duplicate name, undeclared name, break outside a loop; AST stays available |
| 7 | **Constant Folding** | `(4+5)*(12-2)` becomes 90; compare TAC and the rule log |
| 8 | **Control Flow** | `continue` skips 2, expected total 13; show loop test, update and back edge |
| 9 | **Function Calls** | `square(7)` represents 49; show receive, call and return |
| 10 | **Register Allocation** | Expected expression result 116; compare 3/4/6 registers, dirty values, spills and liveness |
| 11 | **Advanced Program** | Recursion and arrays in AST; explain the explicit scalar-IR boundary |
| 12 | **Grammar Lab → LL(1) Expressions** | FIRST/FOLLOW, prediction table and acceptance of `id + id * id` |
| 13 | **Table Conflict**, then **Left Recursion** | Show why deterministic predictive tracing is blocked |
| 14 | **Nullable Productions** | Show epsilon propagation and acceptance of empty input |
| 15 | Export Analysis JSON | Save the actual compilation data for the current source |

A concise introduction for evaluation: “This project visualizes a compiler pipeline for a documented C-like teaching language. It builds tokens and an AST, checks names and scopes, generates scalar TAC, folds constants, constructs a CFG, computes liveness and emits virtual register code. Its independent Grammar Lab demonstrates LL(1) construction and parsing.”

## 8. Files and functions to explain

Read the implementation in this order:

| File | Main entry points | Responsibility |
| --- | --- | --- |
| `index.html`, `style.css` | Sections, controls, responsive rules | Interface structure and appearance |
| `tokenizer.js` | tokenize, scanToken, number, string | Source characters → token objects |
| `parser.js` | parse, statement, assignment, binary, primary | Tokens → AST |
| `visualizer.js` | render, layoutTree, traversal, exportSvg | AST → interactive SVG |
| `compiler.js` | analyze, compile, generate, buildCFG, format | Semantics, TAC, constant folding and CFG |
| `backend.js` | operands, dataFlow, generate, format | Liveness, next use and symbolic target code |
| `grammar.js` | parseGrammar, analyze, trace | Grammar sets, LL(1) table and trace |
| `ui-utils.js` | table, downloadText | Shared safe table rendering and downloads |
| `app.js` | parseAndRender, invalidateAnalysis | Examples, editor, AST inspector and traversal events |
| `compiler-ui.js` | render, renderBackend, graph | Compiler panels and report export |
| `grammar-ui.js` | analyze, renderTrace | Grammar editor and trace controls |
| `tests/` | run-tests.js; separate suites | Core regressions and optional browser integration checks |

`app.js` sends `compiler:parsed` with the AST/source; `compiler-ui.js` listens and runs compilation. Reset/stale events clear the workbench. Deferred scripts load in dependency order; compiler listeners are installed before the app's initial analysis.

There is no web-server backend. The filename `backend.js` means the **compiler backend** running in the browser. Source is processed locally; the app has no source-upload API.

Tokenization is O(n) in source length. Parsing is normally O(t) in token count. AST wrapping, layout and each traversal are O(v) in node count. Grammar set propagation and liveness use fixed-point iteration; their cost depends on grammar/CFG size and the number of passes, so they are not claimed to be universally linear.

## 9. Tests and verification

Run all dependency-free core suites with Node.js 18 or newer:

```bash
node tests/run-tests.js
```

Or run suites individually:

```bash
node tests/parser-tests.js
node tests/compiler-tests.js
node tests/grammar-tests.js
node tests/backend-tests.js
```

The core suites contain **176 named checks**: 61 tokenizer/parser, 65 compiler, 26 grammar and 24 backend. Backend behavior fixtures run both original and optimized TAC with all three register counts. Test-only evaluators compare known results for arithmetic, branches, short circuits, loops, recursion, argument order and globals. These evaluators are not loaded by `index.html`.

Regressions cover quoted punctuation/keywords, exact lexemes, malformed literals/types, empty loop bodies, void/function misuse, negative zero during folding, array/pointer limitations and scope resolution. The grammar suite checks nullable rules, conflicts, recursion, rejected input and termination bounds.

Optional browser checks require Playwright and its Chromium browser:

```bash
npm install --no-save --package-lock=false playwright
npx playwright install chromium
node tests/browser-tests.js
```

The browser suite contains **16 grouped checks**. It serves the app on a temporary local port, tests examples and controls, verifies exported data, checks stale-result clearing, simulates denied clipboard/storage access and checks a mobile viewport. Screenshots go to ignored `test-results/`. Playwright is a test tool only; it is not a website dependency. Passing these tests is evidence for the covered cases, not a proof that every possible program is supported.

## 10. Troubleshooting and future work

| What you see | Meaning / action |
| --- | --- |
| Parser Error | Fix the reported syntax/lexical issue; ordinary statements need semicolons |
| Parser Valid with semantic errors | Grammar is valid, but names/types/control contexts fail an implemented check |
| Scalar TAC unavailable | An array/pointer feature needs a memory model; use a scalar example for later stages |
| No constant-folding changes | The expression is outside the deliberately small safe folding set |
| No printed result | The website displays compilation artifacts, not program execution |
| Function `main` is shown but not called | Add an explicit top-level call for the teaching IR |
| Clipboard unavailable | Use AST JSON Download instead |
| Results disappear after an edit | Re-analyze to produce results for the current source |
| Deployment looks older | Confirm Render has deployed the latest GitHub commit, then reload |

Future work: fuller type/definite-assignment analysis, array/pointer memory lowering, switch/case, source-to-node highlighting, additional optimizations, LR table construction and an optional interpreter. These are future extensions, not current feature claims.
