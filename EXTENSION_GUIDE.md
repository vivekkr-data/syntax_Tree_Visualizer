# Compiler Workbench Extension Guide

The extension is now documented together with the original visualizer in the [README](README.md). That is the main explanation and faculty demonstration guide.

| Extension | Detailed explanation |
| --- | --- |
| Scoped semantic checks and scalar TAC | [Compiler stages](README.md#4-understand-every-compiler-stage) |
| Constant folding, CFG and data flow | [Compiler stages](README.md#4-understand-every-compiler-stage) |
| Virtual target and register allocation | [Compiler stages](README.md#4-understand-every-compiler-stage) |
| FIRST/FOLLOW, LL(1) table and parsing trace | [Grammar Lab](README.md#5-use-the-grammar-lab) |
| Language rules and AST-only features | [Supported language and boundaries](README.md#6-supported-language-and-exact-boundaries) |
| Examples to present in order | [Faculty demonstration](README.md#7-faculty-demonstration-sequence) |
| Regression and browser tests | [Tests and verification](README.md#9-tests-and-verification) |

The website remains browser-only. Arrays/pointers are available in AST mode; the code generator supports scalar programs. The symbolic target is displayed, not executed by the website. Grammar Lab is independent of the fixed source parser.
