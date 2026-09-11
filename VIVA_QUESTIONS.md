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

The workbench already adds a scoped symbol table, basic semantic checks, scalar intermediate code, constant folding and control-flow graphs. Future extensions include fuller type checking, array/pointer memory lowering, source-to-node mapping and an interpreter.

## 19. Which data structure is used for level-order traversal?

A queue is used.

## 20. What is node highlighting used for?

Node highlighting helps the user identify a selected node and understand the order of traversal.

## 21. What is a symbol table?

A symbol table is a compiler data structure that stores information about identifiers, such as their names, types, scopes, and memory locations. This project shows a basic table of functions, parameters, variables, and initializer expressions.

## 22. Why does multiplication appear below addition in the AST for `4 + 5 * 2`?

Multiplication has higher precedence, so the parser groups `5 * 2` first. The multiplication node becomes the right child of the addition node.

## 23. Why is this project called an AST visualizer instead of a parse-tree visualizer?

The displayed tree keeps meaningful constructs such as declarations, operators, and literals, but removes punctuation and many grammar-only nodes. Therefore, it is an Abstract Syntax Tree.

## 24. What is the difference between Play and Step traversal?

Play highlights every node automatically after a fixed delay. Step highlights one node per button click, which is useful while explaining the traversal in a lab demonstration.

## 25. Why are no external libraries used?

Using plain JavaScript and SVG keeps the project lightweight and makes the tokenizer, parser, layout, and traversal logic easy to explain during viva.

## 26. How does the parser handle a for loop?

It parses four parts: initializer, condition, update expression, and loop body. Any of the first three clauses can be empty where the grammar allows it.

## 27. How are arrays represented in the AST?

An array initializer becomes an `ArrayExpression`. Access such as `values[i]` becomes an `IndexExpression` with separate object and index children.

## 28. How are assignment operators handled?

The assignment grammar recognizes `=`, `+=`, `-=`, `*=`, `/=`, and `%=`. Assignment is right-associative and only identifiers or indexed array elements are accepted as targets.

## 29. Does the project parse complete C or Java?

No. It parses a documented educational C-like subset. Common `#include` lines can be pasted and are ignored before parsing, but macro expansion and complete preprocessing are not implemented. A production C or Java compiler requires a much larger grammar, semantic analysis, and type checking.

## 30. Which advanced programs can be demonstrated?

Recursive functions, typed functions, nested conditions, for/while/do-while loops, one-dimensional and two-dimensional arrays, pointers, compound assignments, ternary expressions, bitwise operations, and nested function calls can be demonstrated.

## 31. Can a program be typed directly instead of selecting an example?

Yes. The user can type or paste supported C-like code into the editor and click Analyze Program or press Ctrl + Enter. The examples only provide convenient demonstrations; they are not hard-coded output.

## 32. Why are `#include` lines ignored?

Preprocessing happens before lexical and syntax analysis in the normal C compilation pipeline. The project safely skips complete preprocessor lines and visualizes the remaining program.

## 33. How are very large trees displayed?

The visualizer computes the complete tree bounds and automatically fits them inside the SVG canvas. The user can then zoom in and pan to inspect individual nodes.

## 34. What extends this project beyond an AST learning tool?

The Compiler Workbench connects the AST to scoped name analysis, scalar TAC, quadruples, literal constant folding and a basic-block control-flow graph. Each stage exposes its actual generated data.

## 35. Why does an IR name contain @?

`value@0` and `value@1` identify different declarations in different lexical scopes. This prevents shadowed source names from referring to the same IR storage location.

## 36. How are short-circuit operators lowered?

The generator uses conditional jumps and labels. For `false && expression`, control skips the right operand, so its side effects are not generated on the executed path.

## 37. How does constant folding preserve behavior?

It folds only supported literal-only safe-integer expressions. It does not discard calls, updates or variable reads. Division and overflow-sensitive operations are left unchanged; both original and optimized IR are checked in regression fixtures.

## 38. What defines a basic block?

A basic block is a maximal straight-line sequence with entry at its beginning and transfer of control at its end. Entry instructions, labels and instructions after a control transfer start blocks in this implementation.

## 39. Is an unreachable CFG block always dead code?

The tool reports structural reachability from each function entry and the global entry. It does not evaluate branch conditions or infer whether a function is called, so its result is conservative.

## 40. Does this implement a full C compiler?

No. The grammar is educational and the scalar IR has documented teaching-language rules. Arrays and pointers can still be visualized as ASTs but are not lowered to TAC. Complete C type checking, memory layout, machine code and app-side program execution are not implemented.

## 41. How are FIRST and FOLLOW computed?

The Grammar Lab repeatedly propagates set elements until no set changes. FIRST accounts for nullable prefixes. FOLLOW propagates FIRST of the remaining suffix, excluding epsilon, and the parent's FOLLOW when that suffix is nullable.

## 42. How is the LL(1) table constructed?

For A → α, place the production under terminals in FIRST(α). If α is nullable, also place it under FOLLOW(A). More than one production in a cell is a conflict, which the tool displays instead of guessing a rule.

## 43. Does a table conflict prove ambiguity?

No. It proves that this grammar is not directly usable by the implemented deterministic LL(1) parser. It may need left factoring or another grammar/parser strategy; ambiguity requires a separate argument.

## 44. What is liveness?

A variable is live at a point when its current value may be used on a future path before being redefined. The backend iterates IN/OUT equations over the CFG. Calls and exits conservatively use globals.

## 45. How does next-use allocation work here?

Each block is scanned backward to record next uses. During target generation, the allocator keeps cached values in registers. Under pressure it chooses an unprotected register whose value has the farthest next use, storing a dirty value before eviction.

## 46. Why are registers flushed at block boundaries and calls?

Blocks are allocated independently, so successor blocks reload from agreed symbolic memory locations. Calls may alter globals and clobber registers, so dirty values are saved and the register cache is invalidated.

## 47. What target architecture is implemented?

A custom symbolic register machine with 3, 4 or 6 registers, named memory slots, operations and control transfers. It is not native machine code or LLVM. The app generates and displays this representation; only automated test harnesses execute its fixtures.
