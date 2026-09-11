# Syntax Tree Visualizer: Compiler Workbench Extension

The existing AST visualizer now exposes later compiler stages. It remains a browser-only HTML/CSS/JavaScript application with no external packages, server, database or API keys.

## What changed

| Earlier version | Extended version |
| --- | --- |
| Flat list of declarations | Additional scoped symbol table with distinct IR names |
| Tokenizer/parser errors | Additional semantic diagnostics with source locations where available |
| AST and AST JSON | Scalar TAC and quadruples generated from the same AST |
| No optimizer | Literal constant folding, before/after listing and applied-rule log |
| Tree edges only | Additional basic-block control-flow graph with branch labels |
| AST/SVG export | Additional complete analysis JSON export |

Existing AST traversal, samples, zoom/pan, theme switching and exports remain available. The original Symbols inspector remains a declaration overview; the new Scoped Symbol Table is the compiler pass result.

## Demonstration sequence

1. Open `index.html` in a modern browser, or use the existing deployment after its update.
2. Select **Constant Folding**. In **Compiler Workbench → Optimization**, `(4 + 5) * (12 - 2)` becomes `90`. Compare instruction counts and the rule log.
3. Select **Nested Scopes**. Two declarations of `value` have separate scope IDs. In TAC, their IR names are different.
4. Select **Semantic Errors**. Demonstrate constant reassignment, a duplicate declaration, an undeclared name and `break` outside a loop. Click a source-location link. TAC is blocked but the AST remains inspectable.
5. Select **Control Flow**. The for loop accumulates all values from 0 through 5 except 2. Inspect the conditional jump, continue target, loop update and back edge. The website shows compilation artifacts; it does not print the runtime total.
6. Select **Function Calls**. See function entry, parameter receive, call and return instructions. Each function has a separate CFG entry.
7. Select **Advanced Program**. Its arrays retain their AST support, and a clear limitation explains why scalar TAC is unavailable.
8. Export Analysis JSON to capture source, diagnostics, symbols, both IR forms, optimization log and CFG data.

## Compiler pass design

`parser.js` produces AST nodes and attaches locations to declarations, identifiers and statements. `compiler.js` performs these independent operations:

1. `analyze(ast)`: lexical environment stack, symbol bindings, diagnostic collection.
2. `unsupported(ast)`: checks whether the AST requires memory operations outside the scalar IR subset.
3. `generate(ast, analysis, false)`: TAC generation using temporaries and labels.
4. `generate(ast, analysis, true)`: the same lowering with supported literal constant folding.
5. `buildCFG(code)`: leader detection, basic blocks, successors and structural reachability.

`compiler-ui.js` renders those results with text-safe DOM APIs and SVG. Keyboard arrows, Home and End operate the compiler-stage tabs. Changing source invalidates previous output and disables its export.

## Exact boundaries

### Semantic checks

Implemented: undeclared identifiers, same-scope duplicates, constant initialization/reassignment, function-name writes, named-call arity, nonfunction calls, nested-function rejection, return placement/value presence and loop-control placement. A basic diagnostic rejects a string literal initializing a numeric scalar declaration.

Type annotations are displayed, but full C type compatibility is **not** implemented. There is no definite-assignment, full array-bound, pointer-compatibility, format-string or all-path return analysis. “Checks passed” means these implemented checks passed, not that a production C compiler accepts the program.

All declarations use lexical block scope in this teaching language, including `var`. A for-loop declaration ends at the loop. Top-level functions are predeclared to allow recursion and forward calls. Variable visibility follows declaration order; function bodies are analyzed at their declaration. Initializers resolve names before the new declaration enters the scope. `printf` and `scanf`, when not declared by the program, are marked as assumed external functions; their signatures are not checked.

### Intermediate representation

Supported: scalar declarations, numbers/strings/booleans, expressions, assignment/updates, named function calls, sequences, if/else, ternary, while/for/do-while, break/continue, print and return. Arrays, indexing, pointer declarations, address-of and dereference deliberately block TAC for the whole input instead of producing partial instructions.

Operands evaluate left to right in this educational IR. The generator snapshots earlier variable operands before later side effects. This is a teaching-language convention, not the C standard's evaluation-order rules. Conditions use zero/false as false and logical results are normalized to 0 or 1. Type widths, implicit conversions, native overflow, stack layout and machine-specific division are not modeled; TAC is a symbolic representation, not native C execution.

`%tN` names generated temporaries; `name@scope` names declarations. Neither form collides with a source identifier. Quadruples are `(operator, argument 1, argument 2, result)` records. Global initialization ends at `halt`; function bodies are separate sections. A function named `main` is not automatically invoked. Calls are shown as instructions, not interprocedural CFG edges.

### Optimization

Folds literal-only safe-integer `+`, `-`, `*`, unary signs and integer comparisons. No variable propagation, common-subexpression elimination or dead-code elimination is claimed. Division, modulo, bitwise/shift folding, unsafe-integer results, noninteger arithmetic, and side-effecting expressions are preserved. Before and after listings are generated independently from the same unchanged AST. Instruction counts include declaration/label/function bookkeeping.

### Control flow

Leaders include entry, labels/function entries and instructions following transfers. Conditional jumps have true/false successors. Return, halt and function-end instructions do not fall through. Function entries are separate reachability roots. Dashed blocks are unreachable by graph structure; the pass does not evaluate constant conditions, compute call reachability or eliminate blocks. The SVG abbreviates long blocks; full block listings and edge tables remain accessible.

## Running checks

From the repository directory:

```bash
node tests/parser-tests.js
node tests/compiler-tests.js
```

The current suites run 38 parser checks and 52 compiler checks. The compiler suite contains a **test-only** TAC evaluator for deterministic fixtures, comparing both original and optimized output against expected results. It covers loops, short circuits, nested calls, recursion, scope shadowing, operand snapshots, diagnostics, IR limitations and CFG edges. No interpreter is included in the website.

Browser visual/interaction QA was not run as part of this extension. Syntax checks and static local-asset/DOM-ID checks accompany the automated compiler checks.

## Academic scope

This extension demonstrates semantic analysis, symbol tables, intermediate code generation, a basic optimization and control-flow analysis in addition to the original lexical/syntax analysis. The earlier uploaded proposal describes the initial version; its future-TAC paragraph should be updated for a new proposal submission. The uploaded BCSE307L syllabus now grounds the mapping in SYLLABUS_MAPPING.md. FIRST/FOLLOW and LL(1) construction were added in the syllabus-based expansion below. Native machine-code generation, LLVM integration and LR parser-table construction remain outside scope.

## Syllabus-based expansion: Grammar Lab and Code Generation

The uploaded BCSE307L version 1.0 syllabus is now available. See [SYLLABUS_MAPPING.md](SYLLABUS_MAPPING.md) for an explicit implemented/missing mapping for all eight modules.

### Grammar Lab

`grammar.js` computes FIRST and FOLLOW by fixed-point iteration, constructs the LL(1) prediction table, keeps conflicting productions instead of choosing one arbitrarily, detects nullable-prefix direct/indirect left recursion, and reports unproductive/unreachable nonterminals. `grammar-ui.js` presents the table and a stepwise stack/input/action trace.

This is an independent configurable grammar laboratory. It does not dynamically replace the source-code parser. Define rules with `->` or `→`; separate every symbol with spaces; use `|` for alternatives and `ε` or `epsilon` for the empty word. Left-hand sides define nonterminals; all other symbols are terminals. The first defined nonterminal is the start symbol. `$` is reserved for the automatically appended end marker. Literal pipe tokens and grammar comments are not supported. Duplicate alternatives are deduplicated.

Predictive tracing requires no table conflicts, no left recursion and productive rules. Unreachable rules receive a warning. Invalid input is rejected with a final trace action or an input-format message. Bounds: 20,000 grammar characters, 160 alternatives, 50 nonterminals, 100 terminals, 50 symbols per alternative, 250 input tokens and 1,000 trace actions. These are responsiveness limits, not language-theory limits. The tool detects left recursion but does not rewrite the grammar automatically.

### Data flow and next use

`backend.js` uses the existing CFG to compute `OUT[B] = union(IN[successors])` and `IN[B] = USE[B] union (OUT[B] - DEF[B])` to convergence. A reverse instruction scan then records each live value's next use after each TAC instruction, or `exit` for a block-boundary value. Instruction positions are numbered consistently with the selected original/optimized TAC.

Calls and exits conservatively treat all declared globals as used. There is no interprocedural liveness solution or alias analysis. Register allocation is local to a basic block. The liveness/next-use view is not a definite-assignment validator. The backend supports at most 2,000 TAC instructions per analysis.

### Virtual register-machine target

Select original or optimized TAC and 3, 4 or 6 registers. The allocator reuses cached operands and, under pressure, evicts an unprotected register with the farthest next use (preferring no later local use). Dirty values are stored before eviction; dirty state is also flushed at block boundaries and before calls. Every register cache is invalidated after a call because globals may change and registers may be clobbered. Values are conservatively stored even if a more advanced dead-store analysis could remove the write.

The output is a **custom symbolic target**, not x86, ARM, JVM bytecode, WebAssembly or LLVM. Values use the teaching IR model described earlier; native types, overflow and ABI rules are not claimed.

| Instruction | Meaning |
| --- | --- |
| `DECLARE slot, type` | Declare a symbolic memory slot; no native byte offset is assigned |
| `CONST R, literal` | Load a literal value into a register |
| `LOAD R, slot` / `STORE slot, R` | Transfer a value between a register and symbolic memory |
| `MOVE Rd, Rs` | Copy a register value |
| `BINARY Rd, op, Ra, Rb` | Apply the specified binary IR operation |
| `UNARY Rd, op, Rs` | Apply unary arithmetic, logical or boolean normalization |
| `LABEL name` / `JMP name` | Define a target / unconditional transfer |
| `JZ R, label` / `JNZ R, label` | Conditional jump based on zero/false |
| `FUNCTION name` / `END name` | Delimit a function section |
| `ARG R, index` | Receive a zero-indexed argument into a register |
| `PARAM R` | Queue a value as an argument to the next call |
| `CALL R, function, count` | Consume arguments, call the function and place its return value in R |
| `RET R` / `RET` | Return a value / return without a value |
| `PRINT R` | Symbolic print operation |
| `HALT` | End the global section |

At a call, a virtual frame conceptually owns local slots, temporaries, registers, arguments and a return address; global slots are shared. The app does not execute this target or draw physical activation records. A test-only evaluator checks these conventions, including recursion and invalidation after global writes. External calls remain symbolic without providing external function implementations.

The allocation trace ties target decisions to TAC instruction numbers. `*` marks dirty register values. Analysis JSON includes the currently selected backend input, register count, target instructions, allocation trace and data-flow output.

### Additional tests

```bash
node tests/grammar-tests.js
node tests/backend-tests.js
```

26 grammar checks and 21 backend checks supplement the 90 previous checks (137 total). Six target-generation combinations (original/optimized × 3/4/6 registers) run inside each of 16 backend behavior fixtures. Passing these fixtures is not a proof of arbitrary-program correctness. Browser visual/interaction testing remains separate and has not been performed.
