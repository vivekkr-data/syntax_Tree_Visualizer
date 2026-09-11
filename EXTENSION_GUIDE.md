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

This extension demonstrates semantic analysis, symbol tables, intermediate code generation, a basic optimization and control-flow analysis in addition to the original lexical/syntax analysis. The earlier uploaded proposal describes the initial version; its future-TAC paragraph should be updated for a new proposal submission. An exact syllabus document was not available during this extension, so this guide does not claim complete syllabus/module coverage. Machine-code generation, LLVM integration, FIRST/FOLLOW computation and LR parser-table construction are not implemented.
