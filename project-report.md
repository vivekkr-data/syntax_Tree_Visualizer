# PROJECT REPORT: SYNTAX TREE VISUALIZER

## 1. Title

**Syntax Tree Visualizer and Compiler Workbench**

## 2. Abstract

The Syntax Tree Visualizer is a browser-based educational project that demonstrates compiler stages from lexical analysis through symbolic target generation. It accepts a small programming-language input, performs lexical analysis, parses the token stream using a recursive-descent parser, constructs an Abstract Syntax Tree (AST), and displays the tree graphically. The user can zoom, pan, inspect nodes, and animate common tree traversals. The extended workbench also performs scoped semantic checks, generates scalar three-address code and quadruples, folds supported constant expressions, and displays a basic-block control-flow graph. It also computes liveness and next use, allocates local registers and produces a symbolic target. A separate Grammar Lab computes FIRST/FOLLOW and LL(1) parsing traces. The website does not execute the submitted program.

## 3. Problem Statement

Compiler data structures such as syntax trees are difficult to understand only through textual explanations. The objective is to design a tool that displays syntax trees graphically and supports zoom, traversal, and node highlighting. The project should also work as an interactive teaching aid for compiler-design concepts.

## 4. Objectives

- Convert source code into tokens.
- Parse tokens according to a defined context-free grammar.
- Construct a correct Abstract Syntax Tree.
- Display parent-child relationships graphically.
- Support zoom, pan, fit, and reset operations.
- Highlight a node and show its properties.
- Animate preorder, postorder, and level-order traversals, with a manual step mode.
- Display helpful errors with line and column numbers.
- Build lexical scopes and check name resolution, duplicate declarations, constant writes and control contexts.
- Generate scalar three-address code and quadruples.
- Show safe-integer literal constant folding and basic-block control flow.
- Compute liveness and next use and generate virtual target instructions.
- Compute FIRST/FOLLOW, construct LL(1) tables and trace predictive parsing.

## 5. Scope

The current project supports inferred, qualified, and typed variable declarations; functions; one-dimensional and multi-dimensional arrays; indexing; simple pointer expressions and dereferenced assignments; arithmetic, logical, bitwise, shift, and conditional expressions; generic calls such as `printf` and `scanf`; if/else chains; while/for/do-while loops; return/break/continue statements; literals; and comments. Common preprocessor lines such as `#include` are ignored before parsing, matching their position before compiler syntax analysis. The extension adds scoped semantic checks, scalar TAC, quadruples, literal constant folding and CFG construction. The syllabus-based expansion adds configurable FIRST/FOLLOW and LL(1) table construction, predictive traces, live-variable analysis, next use and local register allocation to a symbolic target. Complete language standards, memory lowering for arrays/pointers, and native machine-code generation remain outside the scope. See [Project Guide](README.md#6-supported-language-and-exact-boundaries) for exact pass boundaries.

## 6. Technologies Used

- HTML5 for user-interface structure
- CSS3 for responsive design and themes
- JavaScript for tokenization, parsing, tree algorithms, and interactions
- SVG for scalable tree graphics
- Recursive-descent parsing for syntax analysis

## 7. System Modules

### 7.1 Source Code Editor

Accepts the program entered by the user and provides sample programs.

### 7.2 Lexical Analyzer

Reads the character stream and generates tokens such as NUMBER, STRING, IDENTIFIER, KEYWORD, OPERATOR, and PUNCTUATION. It records the line and column of every token.

### 7.3 Parser

Uses one function for every grammar level. This technique naturally handles operator precedence. For example, multiplication is parsed at a deeper level than addition, so `4 + 5 * 2` becomes `4 + (5 * 2)`.

### 7.4 AST Builder

The parser returns structured JavaScript objects. Each object has a `type` field and child fields. For example:

```json
{
  "type": "BinaryExpression",
  "operator": "+",
  "left": { "type": "Literal", "value": 4 },
  "right": { "type": "Literal", "value": 5 }
}
```

### 7.5 Tree Layout Engine

The layout algorithm visits child nodes first. Leaf nodes receive sequential horizontal positions. A parent is placed at the average horizontal position of its children. Depth determines the vertical position.

### 7.6 SVG Renderer

Every syntax-tree node is displayed as an SVG rectangle with text. Curved SVG paths show parent-child relationships.

### 7.7 Interaction Module

Implements mouse-wheel zoom, drag-to-pan, fit-to-screen, reset, node selection, traversal playback, and file export.

### 7.8 Symbol Table Module

Walks through the generated AST and collects functions, parameters, and variable declarations. It displays each identifier's name, kind, and initializer or parameter count. This educational extension connects syntax analysis with the next compiler phase.

### 7.9 Semantic and Intermediate-Code Module

Builds lexical scopes, resolves identifier uses and reports implemented semantic errors. Valid scalar input is lowered to TAC/quadruples; supported literal expressions are folded in an independent optimized listing. Labels and branch instructions define a basic-block CFG.

### 7.10 Compiler Backend

Computes fixed-point live-variable sets, records next use and allocates 3, 4 or 6 virtual registers locally per block. Dirty values are saved before eviction, block exits and calls. The backend emits symbolic target instructions, not native machine code.

### 7.11 Grammar Lab

Accepts a separate user-entered grammar, computes FIRST/FOLLOW, builds an LL(1) table and shows stack/input/action traces. Conflicts, left recursion and nonproductive rules block predictive tracing. This grammar does not replace the source parser.

## 8. Functional Requirements

- The user shall enter source code.
- The system shall tokenize and parse valid source.
- The system shall report invalid syntax.
- The system shall display an AST for valid code.
- The user shall zoom and pan the AST.
- The user shall click any node to inspect it.
- The user shall select and animate a traversal.
- The user shall move through a traversal one node at a time.
- The system shall display node count, tree depth, token count, and parser status.
- The system shall show declared identifiers in a basic symbol table.
- The user shall export AST JSON, SVG and compiler analysis JSON.
- The system shall preserve AST inspection when semantic checks fail and explain unsupported scalar IR features.
- The system shall display TAC, optimization, CFG, liveness and virtual code for supported input.
- The user shall inspect and step through independent LL(1) grammar analysis.

## 9. Non-Functional Requirements

- The interface should be simple and responsive.
- Parsing should complete quickly for classroom-sized programs.
- The project should not require a database or external library.
- The output should remain readable on different screen sizes.

## 10. Data Flow

| Input | Processing | Output |
| --- | --- | --- |
| Source characters | Tokenizer | Tokens with locations |
| Tokens | Recursive-descent parser | AST |
| AST | Layout and SVG rendering | Interactive tree and traversals |
| AST | Semantic analysis and scalar lowering | Diagnostics, symbol bindings, TAC |
| AST / TAC | Folding and CFG construction | Optimized TAC and basic blocks |
| Selected TAC | Data flow and register allocation | Liveness, next use and symbolic target |
| Independent grammar and input | FIRST/FOLLOW, LL(1) table, predictive parsing | Sets, table, warnings and trace |

## 11. Important Algorithms

### 11.1 Tokenization

1. Read one character.
2. Ignore whitespace.
3. Detect comments, identifiers, numbers, strings, operators, and punctuation.
4. Create a token object.
5. Repeat until end of input.

Time complexity: **O(n)**, where `n` is the number of source characters.

### 11.2 Recursive-Descent Parsing

Each non-terminal is implemented as a JavaScript function. The parser consumes tokens and creates AST nodes. Invalid sequences throw a parser error.

Typical time complexity: **O(t)**, where `t` is the number of tokens.

### 11.3 Tree Layout

1. Visit all children.
2. Give each leaf a new horizontal slot.
3. Place each parent at the average x-coordinate of its children.
4. Use depth for the y-coordinate.

Time complexity: **O(v)**, where `v` is the number of AST nodes.

### 11.4 Traversal

- Preorder: Root → Children
- Postorder: Children → Root
- Level-order: Breadth-first using a queue

Time complexity: **O(v)**.

## 12. Test Cases

### Test 1: Operator Precedence

Input:

```text
let result = 4 + 5 * 2;
```

Expected: multiplication appears below addition and is evaluated first structurally.

### Test 2: If/Else

Input:

```text
int marks = 78;
if (marks >= 40) {
  print("Pass");
} else {
  print("Fail");
}
```

Expected: `IfStatement` with condition, consequent block, and alternate block.

### Test 3: Invalid Syntax

Input:

```text
let x = 10
```

Expected: error stating that a semicolon is required, including line and column.

### Test 4: While Loop

Input:

```text
int count = 0;
while (count < 3) {
  count = count + 1;
}
```

Expected: `WhileStatement` with condition and body.

### Test 5: Function, Array, and For Loop

Input:

```text
int sum(int values[5]) {
  int total = 0;
  for (int i = 0; i < 5; i++) {
    total += values[i];
  }
  return total;
}
```

Expected: function, parameter, declaration, for-loop, assignment, index, update, and return nodes are generated.

### Test 6: Direct C-Style Recursive Program

Input begins with `#include <stdio.h>`, declares a recursive factorial function and `main`, and calls `printf`.

Expected: the preprocessor line is ignored and a valid tree is generated for the remaining program.

### Automated Regression Suite

Run `node tests/run-all-tests.js` for all 176 core checks (61 tokenizer/parser, 65 compiler, 26 grammar, 24 backend). The compiler and backend suites contain test-only evaluators for known expected results, including recursion, loop control, short-circuit side effects and negative zero. Backend fixtures check original/optimized TAC at three register budgets.

The optional `tests/browser-integration-tests.js` checks real browser interactions, source examples, downloads, grammar traces, responsive layout and blocked clipboard/storage handling. Installation and execution steps are in the [Project Guide](README.md#9-tests-and-verification).

## 13. Advantages

- Provides visual understanding of compiler concepts.
- Demonstrates lexical analysis and syntax analysis together.
- Requires no installation beyond a browser.
- Works offline.
- Uses scalable SVG graphics.
- Helps in classroom demonstrations and self-learning.

## 14. Limitations

- It implements a strong educational C-like subset rather than every rule of full C, C++, or Java.
- Type checks include valid type specifiers, void-value use and simple string/numeric initializers; complete type compatibility, definite assignment and all-path return analysis are not implemented.
- TAC supports scalar input. Arrays and pointers retain AST support with an explicit IR limitation message.
- It does not execute the program.
- Very large trees initially appear as a fitted overview and can be inspected with zoom and pan.

## 15. Future Scope

- Expand semantic checks to full type compatibility and definite assignment.
- Add memory operations to TAC for arrays and pointers.
- Highlight the source-code segment corresponding to a selected node.
- Add `switch/case`, structures, and more complete C declarators.
- Add an interpreter and step-by-step execution.
- Compare concrete parse trees with abstract syntax trees.

## 16. Conclusion

The project connects tokenization, parsing and AST visualization to semantic checks, scalar TAC, constant folding, CFG/data-flow analysis and symbolic target generation. Its independent Grammar Lab adds LL(1) construction and predictive traces. Each stage exposes data that can be explained during a Compiler Design demonstration, within the documented teaching-language boundaries.

## 17. Syllabus-Based Extension

The independent Grammar Lab demonstrates FIRST/FOLLOW, LL(1) tables, conflicts and predictive traces (Module 2). Data-flow/next-use views and the symbolic register-machine backend extend Modules 5 and 6. The exact features, bounds, target conventions and missing topics are documented in `README.md`. The project does not claim complete coverage of all eight modules.
