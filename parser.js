(function (global) {
  'use strict';

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
      if (this.matchLexeme('let')) return this.variableDeclaration();
      if (this.matchLexeme('print')) return this.printStatement();
      if (this.matchLexeme('if')) return this.ifStatement();
      if (this.matchLexeme('while')) return this.whileStatement();

      if (this.checkType('IDENTIFIER') && this.peekNext().lexeme === '=') {
        return this.assignmentStatement();
      }

      return this.expressionStatement();
    }

    variableDeclaration() {
      const name = this.consumeType('IDENTIFIER', 'Expected a variable name after let');
      this.consumeLexeme('=', "Expected '=' after variable name");
      const initializer = this.expression();
      this.consumeLexeme(';', "Expected ';' after variable declaration");
      return { type: 'VariableDeclaration', name: name.lexeme, initializer };
    }

    assignmentStatement() {
      const name = this.advance();
      this.consumeLexeme('=', "Expected '=' in assignment");
      const value = this.expression();
      this.consumeLexeme(';', "Expected ';' after assignment");
      return { type: 'AssignmentStatement', name: name.lexeme, value };
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
      const consequent = this.blockStatement();
      let alternate = null;
      if (this.matchLexeme('else')) alternate = this.blockStatement();
      return { type: 'IfStatement', condition, consequent, alternate };
    }

    whileStatement() {
      this.consumeLexeme('(', "Expected '(' after while");
      const condition = this.expression();
      this.consumeLexeme(')', "Expected ')' after condition");
      const body = this.blockStatement();
      return { type: 'WhileStatement', condition, body };
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

    expression() { return this.logicalOr(); }

    logicalOr() {
      let expression = this.logicalAnd();
      while (this.matchLexeme('||')) {
        const operator = this.previous().lexeme;
        const right = this.logicalAnd();
        expression = { type: 'BinaryExpression', operator, left: expression, right };
      }
      return expression;
    }

    logicalAnd() {
      let expression = this.equality();
      while (this.matchLexeme('&&')) {
        const operator = this.previous().lexeme;
        const right = this.equality();
        expression = { type: 'BinaryExpression', operator, left: expression, right };
      }
      return expression;
    }

    equality() {
      let expression = this.comparison();
      while (this.matchLexeme('==', '!=')) {
        const operator = this.previous().lexeme;
        const right = this.comparison();
        expression = { type: 'BinaryExpression', operator, left: expression, right };
      }
      return expression;
    }

    comparison() {
      let expression = this.term();
      while (this.matchLexeme('<', '<=', '>', '>=')) {
        const operator = this.previous().lexeme;
        const right = this.term();
        expression = { type: 'BinaryExpression', operator, left: expression, right };
      }
      return expression;
    }

    term() {
      let expression = this.factor();
      while (this.matchLexeme('+', '-')) {
        const operator = this.previous().lexeme;
        const right = this.factor();
        expression = { type: 'BinaryExpression', operator, left: expression, right };
      }
      return expression;
    }

    factor() {
      let expression = this.unary();
      while (this.matchLexeme('*', '/', '%')) {
        const operator = this.previous().lexeme;
        const right = this.unary();
        expression = { type: 'BinaryExpression', operator, left: expression, right };
      }
      return expression;
    }

    unary() {
      if (this.matchLexeme('!', '-')) {
        const operator = this.previous().lexeme;
        const argument = this.unary();
        return { type: 'UnaryExpression', operator, argument };
      }
      return this.primary();
    }

    primary() {
      if (this.matchType('NUMBER', 'STRING')) {
        return { type: 'Literal', value: this.previous().literal };
      }

      if (this.matchLexeme('true')) return { type: 'Literal', value: true };
      if (this.matchLexeme('false')) return { type: 'Literal', value: false };

      if (this.matchType('IDENTIFIER')) {
        const identifier = { type: 'Identifier', name: this.previous().lexeme };
        if (this.matchLexeme('(')) return this.finishCall(identifier);
        return identifier;
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
        do {
          args.push(this.expression());
        } while (this.matchLexeme(','));
      }
      this.consumeLexeme(')', "Expected ')' after function arguments");
      return { type: 'CallExpression', callee, arguments: args };
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
    peekNext() { return this.tokens[Math.min(this.current + 1, this.tokens.length - 1)]; }
    previous() { return this.tokens[this.current - 1]; }
  }

  global.SyntaxParser = { Parser, ParserError };
})(window);
