# Syntax Tree Visualizer

A complete browser-based Compiler Design mini-project that tokenizes source code, parses it using a recursive-descent parser, creates an Abstract Syntax Tree (AST), and displays the tree interactively with SVG.

## Main Features

- Graphical Abstract Syntax Tree generation
- Zoom in, zoom out, pan, fit-to-screen, and reset view
- Clickable node highlighting and property inspection
- Preorder, postorder, and level-order traversal animation
- Token stream with token type and line/column location
- AST JSON viewer and JSON download
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

## Project Files

- `index.html` — complete interface
- `style.css` — responsive UI and tree styling
- `tokenizer.js` — lexical analyzer
- `parser.js` — recursive-descent parser
- `visualizer.js` — AST layout, SVG rendering, zoom, pan, and traversal
- `app.js` — connects UI, parser, visualizer, tabs, downloads, and examples
- `PROJECT_REPORT.md` — ready-to-use project documentation
- `VIVA_QUESTIONS.md` — important viva questions with answers

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
