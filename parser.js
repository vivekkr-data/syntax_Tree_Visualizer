(function (global) {
  'use strict';

  const DECLARATION_KEYWORDS = new Set(['let', 'var', 'const']);
  const TYPE_KEYWORDS = new Set([
    'int', 'float', 'double', 'char', 'string', 'bool', 'void',
    'short', 'long', 'signed', 'unsigned'
  ]);
  const ASSIGNMENT_OPERATORS = new Set([
    '=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>='
  ]);

  class ParserError extends Error {
    constructor(message, token) {
      const location = token ? ` at line ${token.line}, column ${token.column}` : '';
      super(`${message}${location}`);
      this.name = 'ParserError';
      this.token = token;
    }
  }

  class Parser {
    constructor(tokens) {
      this.tokens = tokens;
      this.current = 0;
    }

    parse() {
      const body = [];
      while (!this.isAtEnd()) body.push(this.statement());
      return { type: 'Program', body };
    }

    statement() {
      if (this.matchLexeme('function')) return this.functionDeclaration(null);

      if (this.isTypedFunctionStart()) {
        const returnType = this.typeName();
        let returnPointerDepth = 0;
        while (this.matchLexeme('*')) returnPointerDepth += 1;
        return this.functionDeclaration(returnType, returnPointerDepth);
      }

      if (this.checkDeclarationKeyword()) {
        const kind = this.advance().lexeme;
        const dataType = TYPE_KEYWORDS.has(this.peek().lexeme) ? this.typeName() : null;
        return this.variableDeclaration(kind, true, dataType);
      }

      if (TYPE_KEYWORDS.has(this.peek().lexeme) && this.peek().lexeme !== 'void') {
        const dataType = this.typeName();
        return this.variableDeclaration(dataType, true, dataType);
      }

      if (this.matchLexeme('print')) return this.printStatement();
      if (this.matchLexeme('if')) return this.ifStatement();
      if (this.matchLexeme('while')) return this.whileStatement();
      if (this.matchLexeme('for')) return this.forStatement();
      if (this.matchLexeme('do')) return this.doWhileStatement();
      if (this.matchLexeme('return')) return this.returnStatement();
      if (this.matchLexeme('break')) return this.controlStatement('BreakStatement');
      if (this.matchLexeme('continue')) return this.controlStatement('ContinueStatement');
      if (this.checkLexeme('{')) return this.blockStatement();
      return this.expressionStatement();
    }

    isTypedFunctionStart() {
      let offset = 0;
      while (TYPE_KEYWORDS.has(this.peekAt(offset).lexeme)) offset += 1;
      if (offset === 0) return false;
      while (this.peekAt(offset).lexeme === '*') offset += 1;
      return this.peekAt(offset).type === 'IDENTIFIER' && this.peekAt(offset + 1).lexeme === '(';
    }

    checkDeclarationKeyword() {
      return DECLARATION_KEYWORDS.has(this.peek().lexeme);
    }

    typeName() {
      const parts = [];
      while (TYPE_KEYWORDS.has(this.peek().lexeme)) parts.push(this.advance().lexeme);
      if (parts.length === 0) throw new ParserError('Expected a data type', this.peek());
      return parts.join(' ');
    }

    variableDeclaration(kind, consumeSemicolon, explicitDataType = null) {
      const declarations = [];
      do {
        let pointerDepth = 0;
        while (this.matchLexeme('*')) pointerDepth += 1;
        const name = this.consumeType('IDENTIFIER', `Expected a variable name after ${kind}`);
        const dimensions = [];
        while (this.matchLexeme('[')) {
          let size = null;
          if (!this.checkLexeme(']')) size = this.expression();
          this.consumeLexeme(']', "Expected ']' after array size");
          dimensions.push(size);
        }
        const arraySize = dimensions[0] || null;
        let initializer = null;
        if (this.matchLexeme('=')) initializer = this.expression();
        declarations.push({
          type: 'VariableDeclaration',
          kind,
          dataType: explicitDataType,
          name: name.lexeme,
          pointerDepth,
          arraySize,
          dimensions,
          initializer
        });
      } while (this.matchLexeme(','));

      if (consumeSemicolon) this.consumeLexeme(';', "Expected ';' after variable declaration");
      if (declarations.length === 1) return declarations[0];
      return { type: 'VariableDeclarationList', kind, declarations };
    }

    functionDeclaration(returnType, returnPointerDepth = 0) {
      const name = this.consumeType('IDENTIFIER', 'Expected a function name');
      this.consumeLexeme('(', "Expected '(' after function name");
      const parameters = [];

      if (this.checkLexeme('void') && this.peekAt(1).lexeme === ')') {
        this.advance();
      } else if (!this.checkLexeme(')')) {
        do {
          let dataType = null;
          if (TYPE_KEYWORDS.has(this.peek().lexeme)) dataType = this.typeName();
          let pointerDepth = 0;
          while (this.matchLexeme('*')) pointerDepth += 1;
          const parameter = this.consumeType('IDENTIFIER', 'Expected a parameter name');
          const dimensions = [];
          while (this.matchLexeme('[')) {
            let size = null;
            if (!this.checkLexeme(']')) size = this.expression();
            this.consumeLexeme(']', "Expected ']' after parameter array size");
            dimensions.push(size);
          }
          const arraySize = dimensions[0] || null;
          parameters.push({ type: 'Parameter', name: parameter.lexeme, dataType, pointerDepth, arraySize, dimensions });
        } while (this.matchLexeme(','));
      }

      this.consumeLexeme(')', "Expected ')' after parameters");
      const body = this.blockStatement();
      return {
        type: 'FunctionDeclaration',
        name: name.lexeme,
        returnType: returnType || 'inferred',
        returnPointerDepth,
        parameters,
        body
      };
    }

    printStatement() {
      this.consumeLexeme('(', "Expected '(' after print");
      const expression = this.expression();
      this.consumeLexeme(')', "Expected ')' after print expression");
      this.consumeLexeme(';', "Expected ';' after print statement");
      return { type: 'PrintStatement', expression };
    }

    ifStatement() {
      this.consumeLexeme('(', "Expected '(' after if");
      const condition = this.expression();
      this.consumeLexeme(')', "Expected ')' after condition");
      const consequent = this.statement();
      let alternate = null;
      if (this.matchLexeme('else')) {
        alternate = this.matchLexeme('if') ? this.ifStatement() : this.statement();
      }
      return { type: 'IfStatement', condition, consequent, alternate };
    }

    whileStatement() {
      this.consumeLexeme('(', "Expected '(' after while");
      const condition = this.expression();
      this.consumeLexeme(')', "Expected ')' after condition");
      const body = this.statement();
      return { type: 'WhileStatement', condition, body };
    }

    forStatement() {
      this.consumeLexeme('(', "Expected '(' after for");
      let initializer = null;
      if (this.matchLexeme(';')) {
        initializer = null;
      } else if (this.checkDeclarationKeyword()) {
        const kind = this.advance().lexeme;
        const dataType = TYPE_KEYWORDS.has(this.peek().lexeme) ? this.typeName() : null;
        initializer = this.variableDeclaration(kind, true, dataType);
      } else if (TYPE_KEYWORDS.has(this.peek().lexeme) && this.peek().lexeme !== 'void') {
        const dataType = this.typeName();
        initializer = this.variableDeclaration(dataType, true, dataType);
      } else {
        initializer = this.forExpressionList();
        this.consumeLexeme(';', "Expected ';' after for-loop initializer");
      }

      let condition = null;
      if (!this.checkLexeme(';')) condition = this.expression();
      this.consumeLexeme(';', "Expected ';' after for-loop condition");

      let update = null;
      if (!this.checkLexeme(')')) update = this.forExpressionList();
      this.consumeLexeme(')', "Expected ')' after for-loop clauses");
      const body = this.statement();
      return { type: 'ForStatement', initializer, condition, update, body };
    }

    forExpressionList() {
      const expressions = [this.expression()];
      while (this.matchLexeme(',')) expressions.push(this.expression());
      return expressions.length === 1 ? expressions[0] : { type: 'SequenceExpression', expressions };
    }

    doWhileStatement() {
      const body = this.statement();
      this.consumeLexeme('while', "Expected 'while' after do-loop body");
      this.consumeLexeme('(', "Expected '(' after while");
      const condition = this.expression();
      this.consumeLexeme(')', "Expected ')' after do-while condition");
      this.consumeLexeme(';', "Expected ';' after do-while statement");
      return { type: 'DoWhileStatement', body, condition };
    }

    returnStatement() {
      let argument = null;
      if (!this.checkLexeme(';')) argument = this.expression();
      this.consumeLexeme(';', "Expected ';' after return statement");
      return { type: 'ReturnStatement', argument };
    }

    controlStatement(type) {
      const keyword = type === 'BreakStatement' ? 'break' : 'continue';
      this.consumeLexeme(';', `Expected ';' after ${keyword}`);
      return { type };
    }

    blockStatement() {
      this.consumeLexeme('{', "Expected '{' before block");
      const body = [];
      while (!this.checkLexeme('}') && !this.isAtEnd()) body.push(this.statement());
      this.consumeLexeme('}', "Expected '}' after block");
      return { type: 'BlockStatement', body };
    }

    expressionStatement() {
      const expression = this.expression();
      this.consumeLexeme(';', "Expected ';' after expression");
      return { type: 'ExpressionStatement', expression };
    }

    expression() { return this.assignment(); }

    assignment() {
      const left = this.conditional();
      if (ASSIGNMENT_OPERATORS.has(this.peek().lexeme)) {
        const operator = this.advance().lexeme;
        if (!this.isAssignable(left)) {
          throw new ParserError('Invalid assignment target', this.previous());
        }
        const right = this.assignment();
        return { type: 'AssignmentExpression', operator, left, right };
      }
      return left;
    }

    conditional() {
      let expression = this.logicalOr();
      if (this.matchLexeme('?')) {
        const consequent = this.expression();
        this.consumeLexeme(':', "Expected ':' in conditional expression");
        const alternate = this.conditional();
        expression = { type: 'ConditionalExpression', test: expression, consequent, alternate };
      }
      return expression;
    }

    logicalOr() { return this.binary(() => this.logicalAnd(), ['||']); }
    logicalAnd() { return this.binary(() => this.bitwiseOr(), ['&&']); }
    bitwiseOr() { return this.binary(() => this.bitwiseXor(), ['|']); }
    bitwiseXor() { return this.binary(() => this.bitwiseAnd(), ['^']); }
    bitwiseAnd() { return this.binary(() => this.equality(), ['&']); }
    equality() { return this.binary(() => this.comparison(), ['==', '!=']); }
    comparison() { return this.binary(() => this.shift(), ['<', '<=', '>', '>=']); }
    shift() { return this.binary(() => this.term(), ['<<', '>>']); }
    term() { return this.binary(() => this.factor(), ['+', '-']); }
    factor() { return this.binary(() => this.unary(), ['*', '/', '%']); }

    binary(parseOperand, operators) {
      let expression = parseOperand();
      while (operators.includes(this.peek().lexeme)) {
        const operator = this.advance().lexeme;
        expression = { type: 'BinaryExpression', operator, left: expression, right: parseOperand() };
      }
      return expression;
    }

    unary() {
      if (this.matchLexeme('++', '--')) {
        const operator = this.previous().lexeme;
        const argument = this.unary();
        if (!this.isAssignable(argument)) {
          throw new ParserError('Invalid update target', this.previous());
        }
        return { type: 'UpdateExpression', operator, argument, prefix: true };
      }
      if (this.matchLexeme('!', '-', '+', '~', '&', '*')) {
        const operator = this.previous().lexeme;
        return { type: 'UnaryExpression', operator, argument: this.unary() };
      }
      return this.postfix();
    }

    postfix() {
      let expression = this.primary();
      while (true) {
        if (this.matchLexeme('(')) {
          expression = this.finishCall(expression);
        } else if (this.matchLexeme('[')) {
          const index = this.expression();
          this.consumeLexeme(']', "Expected ']' after array index");
          expression = { type: 'IndexExpression', object: expression, index };
        } else if (this.matchLexeme('++', '--')) {
          if (!this.isAssignable(expression)) {
            throw new ParserError('Invalid update target', this.previous());
          }
          expression = { type: 'UpdateExpression', operator: this.previous().lexeme, argument: expression, prefix: false };
        } else {
          break;
        }
      }
      return expression;
    }

    primary() {
      if (this.matchType('NUMBER', 'STRING')) return { type: 'Literal', value: this.previous().literal };
      if (this.matchLexeme('true')) return { type: 'Literal', value: true };
      if (this.matchLexeme('false')) return { type: 'Literal', value: false };
      if (this.matchType('IDENTIFIER')) return { type: 'Identifier', name: this.previous().lexeme };

      if (this.matchLexeme('[')) {
        const elements = [];
        if (!this.checkLexeme(']')) {
          do { elements.push(this.expression()); } while (this.matchLexeme(','));
        }
        this.consumeLexeme(']', "Expected ']' after array elements");
        return { type: 'ArrayExpression', elements };
      }

      if (this.matchLexeme('{')) {
        const elements = [];
        if (!this.checkLexeme('}')) {
          do { elements.push(this.expression()); } while (this.matchLexeme(','));
        }
        this.consumeLexeme('}', "Expected '}' after initializer list");
        return { type: 'ArrayExpression', elements };
      }

      if (this.matchLexeme('(')) {
        const expression = this.expression();
        this.consumeLexeme(')', "Expected ')' after expression");
        return { type: 'GroupingExpression', expression };
      }

      throw new ParserError(`Expected an expression but found '${this.peek().lexeme}'`, this.peek());
    }

    finishCall(callee) {
      const args = [];
      if (!this.checkLexeme(')')) {
        do { args.push(this.expression()); } while (this.matchLexeme(','));
      }
      this.consumeLexeme(')', "Expected ')' after function arguments");
      return { type: 'CallExpression', callee, arguments: args };
    }

    isAssignable(node) {
      if (!node) return false;
      if (node.type === 'Identifier' || node.type === 'IndexExpression') return true;
      if (node.type === 'UnaryExpression' && node.operator === '*') return true;
      return node.type === 'GroupingExpression' && this.isAssignable(node.expression);
    }

    matchLexeme(...lexemes) {
      for (const lexeme of lexemes) {
        if (this.checkLexeme(lexeme)) {
          this.advance();
          return true;
        }
      }
      return false;
    }

    matchType(...types) {
      for (const type of types) {
        if (this.checkType(type)) {
          this.advance();
          return true;
        }
      }
      return false;
    }

    consumeLexeme(lexeme, message) {
      if (this.checkLexeme(lexeme)) return this.advance();
      throw new ParserError(message, this.peek());
    }

    consumeType(type, message) {
      if (this.checkType(type)) return this.advance();
      throw new ParserError(message, this.peek());
    }

    checkLexeme(lexeme) { return !this.isAtEnd() && this.peek().lexeme === lexeme; }
    checkType(type) { return !this.isAtEnd() && this.peek().type === type; }
    advance() { if (!this.isAtEnd()) this.current += 1; return this.previous(); }
    isAtEnd() { return this.peek().type === 'EOF'; }
    peek() { return this.tokens[this.current]; }
    peekAt(offset) { return this.tokens[Math.min(this.current + offset, this.tokens.length - 1)]; }
    previous() { return this.tokens[this.current - 1]; }
  }

  global.SyntaxParser = { Parser, ParserError };
})(window);
