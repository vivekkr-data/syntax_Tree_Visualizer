(function (global) {
  'use strict';

  const TokenType = Object.freeze({
    NUMBER: 'NUMBER',
    STRING: 'STRING',
    IDENTIFIER: 'IDENTIFIER',
    KEYWORD: 'KEYWORD',
    OPERATOR: 'OPERATOR',
    PUNCTUATION: 'PUNCTUATION',
    EOF: 'EOF'
  });

  const KEYWORDS = new Set(['let', 'print', 'if', 'else', 'while', 'true', 'false']);
  const TWO_CHAR_OPERATORS = new Set(['==', '!=', '<=', '>=', '&&', '||']);
  const ONE_CHAR_OPERATORS = new Set(['+', '-', '*', '/', '%', '=', '!', '<', '>']);
  const PUNCTUATION = new Set(['(', ')', '{', '}', ';', ',']);

  class TokenizerError extends Error {
    constructor(message, line, column) {
      super(`${message} at line ${line}, column ${column}`);
      this.name = 'TokenizerError';
      this.line = line;
      this.column = column;
    }
  }

  class Tokenizer {
    constructor(source) {
      this.source = source;
      this.current = 0;
      this.line = 1;
      this.column = 1;
      this.tokens = [];
    }

    tokenize() {
      while (!this.isAtEnd()) {
        this.scanToken();
      }
      this.tokens.push(this.makeToken(TokenType.EOF, 'EOF', '', this.line, this.column));
      return this.tokens;
    }

    scanToken() {
      const startLine = this.line;
      const startColumn = this.column;
      const char = this.advance();

      if (/\s/.test(char)) return;

      if (char === '/' && this.peek() === '/') {
        while (this.peek() !== '\n' && !this.isAtEnd()) this.advance();
        return;
      }

      if (char === '/' && this.peek() === '*') {
        this.advance();
        this.blockComment(startLine, startColumn);
        return;
      }

      if (/\d/.test(char)) {
        this.number(char, startLine, startColumn);
        return;
      }

      if (/[A-Za-z_]/.test(char)) {
        this.identifier(char, startLine, startColumn);
        return;
      }

      if (char === '"' || char === "'") {
        this.string(char, startLine, startColumn);
        return;
      }

      const pair = char + this.peek();
      if (TWO_CHAR_OPERATORS.has(pair)) {
        this.advance();
        this.tokens.push(this.makeToken(TokenType.OPERATOR, pair, pair, startLine, startColumn));
        return;
      }

      if (ONE_CHAR_OPERATORS.has(char)) {
        this.tokens.push(this.makeToken(TokenType.OPERATOR, char, char, startLine, startColumn));
        return;
      }

      if (PUNCTUATION.has(char)) {
        this.tokens.push(this.makeToken(TokenType.PUNCTUATION, char, char, startLine, startColumn));
        return;
      }

      throw new TokenizerError(`Unexpected character '${char}'`, startLine, startColumn);
    }

    blockComment(startLine, startColumn) {
      while (!this.isAtEnd()) {
        if (this.peek() === '*' && this.peekNext() === '/') {
          this.advance();
          this.advance();
          return;
        }
        this.advance();
      }
      throw new TokenizerError('Unterminated block comment', startLine, startColumn);
    }

    number(first, line, column) {
      let value = first;
      while (/\d/.test(this.peek())) value += this.advance();

      if (this.peek() === '.' && /\d/.test(this.peekNext())) {
        value += this.advance();
        while (/\d/.test(this.peek())) value += this.advance();
      }

      this.tokens.push(this.makeToken(TokenType.NUMBER, value, Number(value), line, column));
    }

    identifier(first, line, column) {
      let value = first;
      while (/[A-Za-z0-9_]/.test(this.peek())) value += this.advance();
      const type = KEYWORDS.has(value) ? TokenType.KEYWORD : TokenType.IDENTIFIER;
      this.tokens.push(this.makeToken(type, value, value, line, column));
    }

    string(quote, line, column) {
      let value = '';
      while (!this.isAtEnd() && this.peek() !== quote) {
        if (this.peek() === '\\') {
          this.advance();
          const escaped = this.advance();
          const replacements = { n: '\n', t: '\t', r: '\r', '"': '"', "'": "'", '\\': '\\' };
          value += replacements[escaped] ?? escaped;
        } else {
          value += this.advance();
        }
      }

      if (this.isAtEnd()) throw new TokenizerError('Unterminated string', line, column);
      this.advance();
      this.tokens.push(this.makeToken(TokenType.STRING, value, value, line, column));
    }

    makeToken(type, lexeme, literal, line, column) {
      return { type, lexeme, literal, line, column };
    }

    advance() {
      const char = this.source[this.current++] ?? '\0';
      if (char === '\n') {
        this.line += 1;
        this.column = 1;
      } else {
        this.column += 1;
      }
      return char;
    }

    peek() { return this.isAtEnd() ? '\0' : this.source[this.current]; }
    peekNext() { return this.current + 1 >= this.source.length ? '\0' : this.source[this.current + 1]; }
    isAtEnd() { return this.current >= this.source.length; }
  }

  global.SyntaxTokenizer = { Tokenizer, TokenizerError, TokenType };
})(window);
