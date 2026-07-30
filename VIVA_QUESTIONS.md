# Syntax Tree Visualizer — Viva Questions and Answers

## 1. What is a syntax tree?

A syntax tree is a hierarchical representation of the grammatical structure of source code. Parent nodes represent language constructs or operators, and child nodes represent their components.

## 2. What is the difference between a parse tree and an AST?

A parse tree shows every grammar rule and punctuation symbol. An Abstract Syntax Tree removes unnecessary grammar details and keeps only meaningful program structure.

## 3. What is lexical analysis?

Lexical analysis converts a sequence of characters into tokens such as identifiers, keywords, literals, operators, and punctuation.

## 4. What is a token?

A token is a categorized unit of source code. For example, in `let x = 5;`, `let` is a keyword, `x` is an identifier, `=` is an operator, and `5` is a number token.

## 5. Which parsing technique is used?

The project uses recursive-descent parsing. Every grammar level is represented by a parser function.

## 6. How is operator precedence handled?

Operators with higher precedence are parsed in deeper functions. Multiplication is parsed before addition, and comparison is parsed after arithmetic expressions.

## 7. Why is SVG used?

SVG remains sharp at every zoom level, supports individual clickable elements, and is suitable for drawing nodes and edges.

## 8. How is the tree positioned?

Leaf nodes receive sequential horizontal positions. A parent is placed at the average horizontal position of its children. Node depth decides the vertical position.

## 9. What is preorder traversal?

Preorder visits the current node first and then recursively visits its children.

## 10. What is postorder traversal?

Postorder recursively visits all children before visiting the current node.

## 11. What is level-order traversal?

Level-order visits nodes level by level and uses a queue. It is also called breadth-first traversal.

## 12. What is the time complexity of tokenization?

It is O(n), where n is the number of characters in the source program.

## 13. What is the time complexity of traversal?

It is O(v), where v is the number of syntax-tree nodes.

## 14. What happens when syntax is invalid?

The parser throws an error containing a message and the line and column of the unexpected token.

## 15. Does this project execute the program?

No. It currently performs lexical analysis, syntax analysis, AST construction, and visualization. Execution can be added later through an interpreter.

## 16. What is recursive descent?

Recursive descent is a top-down parsing technique in which a set of mutually recursive functions processes the grammar.

## 17. Why is an AST important in a compiler?

Later compiler phases such as semantic analysis, optimization, intermediate-code generation, and code generation operate on the AST.

## 18. How can the project be extended?

It can be extended with a symbol table, type checking, intermediate-code generation, source-to-node mapping, and an interpreter.

## 19. Which data structure is used for level-order traversal?

A queue is used.

## 20. What is node highlighting used for?

Node highlighting helps the user identify a selected node and understand the order of traversal.
