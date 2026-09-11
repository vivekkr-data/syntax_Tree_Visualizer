# BCSE307L Compiler Design: Project Coverage

Based on the uploaded `BCSE307L_COMPILER-DESIGN_TH_1.0_70_BCSE307L.pdf`, syllabus version 1.0, approved 17 March 2022. “Implemented” below describes the listed feature only, not complete module coverage.

| Module | Implemented project features | Topics still outside the implementation |
| --- | --- | --- |
| 1. Introduction and lexical analysis | Visible compilation stages; scanner; lexemes, tokens, attributes and source locations | LLVM integration, regex-to-DFA direct construction, Lex-generated scanner |
| 2. Syntax analysis | Recursive-descent C-like parser, AST, precedence; independent editable grammar with FIRST/FOLLOW, LL(1) table, conflict detection and predictive parsing trace; left-recursion detection | Concrete parse-tree view, automatic grammar rewriting/ambiguity elimination, shift-reduce/SLR/CLR/LALR table generators |
| 3. Semantics analysis | Scoped name resolution and basic semantic diagnostics; recursive AST passes | Formal SDD/SDT editor and general L-attributed definition evaluator |
| 4. Intermediate code generation | AST, scalar declarations/expressions/procedures, TAC, quadruples, control flow and label-based lowering | Backpatch-list visualization, switch/case, array/pointer memory lowering |
| 5. Code optimization | Literal constant folding, basic blocks and CFG, fixed-point live-variable analysis, local register target generation | Loop optimization, common-subexpression DAG, peephole optimizer, virtual-code security verifier |
| 6. Code generation | Symbolic register-machine target, per-instruction next-use information, local register allocation/eviction, load/store code, call barriers | Native target generation, ABI/stack offsets, production activation-record layout, global graph-coloring allocation |
| 7. Parallelism | Not implemented | SSA construction, vectorization, instruction scheduling, software pipelining and parallelization |
| 8. Contemporary issues | No standalone implementation claim; the syllabus gives no detailed topic list | Depends on the instructor's selected topics |

## Recommended project title

**Syntax Tree Visualizer and Compiler Workbench**

The extension connects an interactive AST to semantic analysis, intermediate code, optimization, data flow and virtual target code. The independent Grammar Lab lets students inspect LL(1) construction for grammars they enter themselves.

## Short evaluation demo

1. **Expression** → Tokens and AST: explain precedence.
2. **Semantic Errors** → diagnostics and source locations.
3. **Nested Scopes** → distinct IR names for shadowed declarations.
4. **Constant Folding** → compare original/optimized TAC and applied rule log.
5. **Control Flow** → block edges, continue target and back edge.
6. **Register Allocation** → Code Generation: change 3 registers to 6; inspect actual allocation/eviction traces, load/store totals and liveness sets. More registers need not improve every program.
7. **Function Calls** → FUNCTION, ARG, PARAM, CALL and RET in virtual target code.
8. **Grammar Lab / LL(1) Expressions** → FIRST/FOLLOW, numbered rules, table and Next Step trace.
9. **Grammar Lab / Table Conflict** → multiple productions in a table cell; explain why this prevents deterministic LL(1) selection. A conflict alone does not prove ambiguity.
10. **Grammar Lab / Left Recursion** → show the detection warning, then switch to the LL(1) expression example.

Use the uploaded syllabus for the course requirements and this mapping for the project's actual implementation. Do not describe the project as a complete C compiler or as covering every syllabus topic.
