# Syntax Tree Visualizer

![HTML](https://img.shields.io/badge/HTML5-Project-e34f26?logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-Responsive-1572b6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-f7df1e?logo=javascript&logoColor=111)
![No Dependencies](https://img.shields.io/badge/Dependencies-None-16a34a)

A browser-based Compiler Design lab project that shows the complete journey from source code to tokens and then to an interactive Abstract Syntax Tree (AST). The project uses a handwritten tokenizer, a recursive-descent parser, and an SVG tree renderer. It runs completely in the browser without any framework or external library.

## Main Features

- Graphical Abstract Syntax Tree generation
- Zoom in, zoom out, pan, fit-to-screen, and reset view
- Clickable node highlighting and property inspection
- Preorder, postorder, and level-order traversal animation
- Manual step-by-step traversal for classroom explanation
- Token stream with token type and line/column location
- Basic symbol table generated from variable declarations
- Live node count, token count, tree depth, parser status, and zoom level
- AST JSON viewer and JSON download
- One-click AST JSON copy
- SVG export
- Light and dark theme
- Friendly syntax-error reporting
- Responsive design for desktop and mobile

## Supported Language

The visualizer accepts:

- Variable declarations: `let x = 10;`
- Assignments: `x = x + 1;`
- Arithmetic operators: `+ - * / %`
- Comparison operators: `< <= > >= == !=`
- Logical operators: `&& || !`
- Number, string, and Boolean literals
- `print(expression);`
- `if (...) { ... } else { ... }`
- `while (...) { ... }`
- Function-call expressions such as `max(a, b);`
- Single-line and block comments

## How to Run

### Method 1: Directly

Open `index.html` in a modern browser.

### Method 2: Local Server (recommended)

From the project folder:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000` in the browser.

## Quick Demo

1. Choose an example or write a program in the editor.
2. Click **Generate Syntax Tree** or press **Ctrl + Enter**.
3. Click any node to inspect its type, value, depth, and children.
4. Open **Tokens**, **Symbols**, **AST JSON**, or **Grammar** from the right panel.
5. Select a traversal and use **Play** for animation or **Step** for one node at a time.
6. Use the toolbar to zoom, fit, or reset the tree, then export it as SVG if required.

## Project Files

- `index.html` — complete interface
- `style.css` — responsive UI and tree styling
- `tokenizer.js` — lexical analyzer
- `parser.js` — recursive-descent parser
- `visualizer.js` — AST layout, SVG rendering, zoom, pan, and traversal
- `app.js` — connects UI, parser, visualizer, tabs, downloads, and examples
- `PROJECT_REPORT.md` — ready-to-use project documentation
- `VIVA_QUESTIONS.md` — important viva questions with answers

## Project Architecture

```text
Source program
     |
     v
Tokenizer (tokenizer.js)
     |
     v
Token stream
     |
     v
Recursive-descent parser (parser.js)
     |
     v
Abstract Syntax Tree
     |
     v
Layout + SVG renderer (visualizer.js)
     |
     v
Interactive tree, traversal and node details
```

## Grammar

```text
program      → statement* EOF
statement    → "let" ID "=" expression ";"
             | ID "=" expression ";"
             | "print" "(" expression ")" ";"
             | "if" "(" expression ")" block ("else" block)?
             | "while" "(" expression ")" block
             | expression ";"
block        → "{" statement* "}"
expression   → logical-or
logical-or   → logical-and ("||" logical-and)*
logical-and  → equality ("&&" equality)*
equality     → comparison (("==" | "!=") comparison)*
comparison   → term (("<" | "<=" | ">" | ">=") term)*
term         → factor (("+" | "-") factor)*
factor       → unary (("*" | "/" | "%") unary)*
unary        → ("!" | "-") unary | primary
primary      → NUMBER | STRING | BOOLEAN | ID
             | ID "(" arguments? ")"
             | "(" expression ")"
```

## Algorithm Summary

1. The lexical analyzer scans the source from left to right and creates tokens.
2. The recursive-descent parser applies grammar and operator precedence.
3. The parser creates JavaScript AST objects.
4. The visualizer converts AST objects into drawable wrapper nodes.
5. A postorder layout computes node positions.
6. SVG curves connect parent and child nodes.
7. Traversal animations highlight nodes in sequence.

## Future Enhancements

- Add semantic analysis and symbol table
- Generate three-address code
- Add code execution/interpreter support
- Support functions and return statements
- Add syntax-directed translation
- Compare parse tree and abstract syntax tree

## Academic Note

This project is designed as a learning tool for lexical analysis, syntax analysis, operator precedence, recursive-descent parsing, syntax-tree construction, and tree traversal. It intentionally supports a small educational language instead of attempting to parse complete C, C++, or Java syntax.
