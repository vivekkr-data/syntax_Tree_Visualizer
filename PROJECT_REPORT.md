# PROJECT REPORT: SYNTAX TREE VISUALIZER

## 1. Title

**Syntax Tree Visualizer — An Interactive Compiler Teaching Tool**

## 2. Abstract

The Syntax Tree Visualizer is a browser-based educational project that demonstrates the front-end stages of a compiler. It accepts a small programming-language input, performs lexical analysis, parses the token stream using a recursive-descent parser, constructs an Abstract Syntax Tree (AST), and displays the tree graphically. The user can zoom, pan, inspect nodes, and animate common tree traversals. The tool helps students understand tokens, grammar, operator precedence, parsing, and AST construction through direct interaction.

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
- Generate a basic symbol table from variable declarations.

## 5. Scope

The current project supports variable declarations, assignments, arithmetic and logical expressions, print statements, if/else conditions, while loops, literals, identifiers, function calls, and comments. It focuses on lexical analysis, syntax analysis, and AST visualization. Semantic analysis and machine-code generation are outside the current scope.

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

Walks through the generated AST and collects variable declarations. It displays the identifier name, symbol kind, and initializer expression. This is a small educational extension that connects syntax analysis with the next compiler phase.

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
- The user shall export AST JSON and SVG.

## 9. Non-Functional Requirements

- The interface should be simple and responsive.
- Parsing should complete quickly for classroom-sized programs.
- The project should not require a database or external library.
- The output should remain readable on different screen sizes.

## 10. Data Flow

```text
Source Code
    ↓
Tokenizer / Lexical Analyzer
    ↓
Token Stream
    ↓
Recursive-Descent Parser
    ↓
Abstract Syntax Tree
    ↓
Tree Layout Algorithm
    ↓
SVG Visualizer + Traversal Animation
```

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
while (count < 3) {
  count = count + 1;
}
```

Expected: `WhileStatement` with condition and body.

## 13. Advantages

- Provides visual understanding of compiler concepts.
- Demonstrates lexical analysis and syntax analysis together.
- Requires no installation beyond a browser.
- Works offline.
- Uses scalable SVG graphics.
- Helps in classroom demonstrations and self-learning.

## 14. Limitations

- It implements a small educational language rather than full C, C++, or Java.
- It does not perform type checking.
- It does not execute the program.
- Very large trees may become visually dense.

## 15. Future Scope

- Add nested scopes and type information to the basic symbol-table panel.
- Add semantic analysis and type checking.
- Generate intermediate code or three-address code.
- Highlight the source-code segment corresponding to a selected node.
- Support functions, arrays, and return statements.
- Add an interpreter and step-by-step execution.
- Compare concrete parse trees with abstract syntax trees.

## 16. Conclusion

The project successfully demonstrates the major front-end stages of a compiler in an interactive manner. It combines tokenization, recursive-descent parsing, AST construction, graphical rendering, traversal, and node inspection. It is useful as a practical compiler-design project and as an educational visualization tool.
