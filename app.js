(function () {
  'use strict';

  const samples = {
    expression: `let result = 4 + 5 * 2;\nprint(result);`,
    variables: `let length = 12;\nlet width = 8;\nlet area = length * width;\nprint(area);`,
    condition: `let marks = 78;\nif (marks >= 40) {\n  print("Pass");\n} else {\n  print("Fail");\n}`,
    loop: `let count = 0;\nwhile (count < 3) {\n  print(count);\n  count = count + 1;\n}`,
    advanced: `int factorial(int n) {\n  if (n <= 1) {\n    return 1;\n  }\n  return n * factorial(n - 1);\n}\n\nint main(void) {\n  int values[5] = {1, 2, 3, 4, 5};\n  int total = 0;\n\n  for (int i = 0; i < 5; i++) {\n    if (values[i] % 2 == 0) {\n      continue;\n    }\n    total += factorial(values[i]);\n  }\n\n  print(total);\n  return 0;\n}`
  };

  const elements = {
    sourceInput: document.getElementById('sourceInput'),
    sampleSelect: document.getElementById('sampleSelect'),
    visualizeBtn: document.getElementById('visualizeBtn'),
    clearBtn: document.getElementById('clearBtn'),
    messageBox: document.getElementById('messageBox'),
    treeSvg: document.getElementById('treeSvg'),
    viewportGroup: document.getElementById('viewportGroup'),
    edgeLayer: document.getElementById('edgeLayer'),
    nodeLayer: document.getElementById('nodeLayer'),
    emptyState: document.getElementById('emptyState'),
    nodeDetails: document.getElementById('nodeDetails'),
    tokenList: document.getElementById('tokenList'),
    tokenCount: document.getElementById('tokenCount'),
    symbolCount: document.getElementById('symbolCount'),
    symbolTable: document.getElementById('symbolTable'),
    astJson: document.getElementById('astJson'),
    nodeCount: document.getElementById('nodeCount'),
    treeDepth: document.getElementById('treeDepth'),
    tokenStat: document.getElementById('tokenStat'),
    parserStatus: document.getElementById('parserStatus'),
    zoomLevel: document.getElementById('zoomLevel'),
    zoomInBtn: document.getElementById('zoomInBtn'),
    zoomOutBtn: document.getElementById('zoomOutBtn'),
    fitBtn: document.getElementById('fitBtn'),
    resetViewBtn: document.getElementById('resetViewBtn'),
    traversalSelect: document.getElementById('traversalSelect'),
    speedRange: document.getElementById('speedRange'),
    playTraversalBtn: document.getElementById('playTraversalBtn'),
    stepTraversalBtn: document.getElementById('stepTraversalBtn'),
    stopTraversalBtn: document.getElementById('stopTraversalBtn'),
    traversalOutput: document.getElementById('traversalOutput'),
    themeToggle: document.getElementById('themeToggle'),
    downloadJsonBtn: document.getElementById('downloadJsonBtn'),
    copyJsonBtn: document.getElementById('copyJsonBtn'),
    downloadSvgBtn: document.getElementById('downloadSvgBtn')
  };

  let currentAst = null;
  let currentTokens = [];
  let traversalStep = 0;
  let stepTraversalType = '';

  const visualizer = new SyntaxTreeView.TreeVisualizer(
    elements.treeSvg,
    elements.viewportGroup,
    elements.edgeLayer,
    elements.nodeLayer,
    showNodeDetails,
    scale => { elements.zoomLevel.textContent = `${Math.round(scale * 100)}%`; }
  );

  function parseAndRender() {
    clearMessage();
    const source = elements.sourceInput.value.trim();
    if (!source) {
      showMessage('Please enter some source code first.', 'error');
      return;
    }

    try {
      const tokenizer = new SyntaxTokenizer.Tokenizer(source);
      currentTokens = tokenizer.tokenize();
      const parser = new SyntaxParser.Parser(currentTokens);
      currentAst = parser.parse();

      visualizer.render(currentAst);
      elements.emptyState.classList.add('hidden');
      renderTokens(currentTokens.filter(token => token.type !== 'EOF'));
      elements.astJson.textContent = JSON.stringify(currentAst, null, 2);
      renderSymbolTable(currentAst);
      updateTreeStats();
      elements.nodeDetails.innerHTML = '<div class="placeholder-copy">Tree generated. Click a node to inspect its properties.</div>';
      elements.traversalOutput.textContent = 'Traversal order will appear here.';
      traversalStep = 0;
      stepTraversalType = '';
      showMessage(`Tree generated successfully: ${visualizer.nodes.length} nodes.`, 'success');
    } catch (error) {
      currentAst = null;
      currentTokens = [];
      visualizer.clear();
      elements.emptyState.classList.remove('hidden');
      resetResults();
      elements.parserStatus.textContent = 'Error';
      elements.parserStatus.className = 'status-error';
      showMessage(error.message || 'Unable to parse the program.', 'error');
    }
  }

  function updateTreeStats() {
    const maxDepth = visualizer.nodes.reduce((max, node) => Math.max(max, node.depth), 0);
    elements.nodeCount.textContent = String(visualizer.nodes.length);
    elements.treeDepth.textContent = String(maxDepth);
    elements.tokenStat.textContent = String(currentTokens.filter(token => token.type !== 'EOF').length);
    elements.parserStatus.textContent = 'Valid';
    elements.parserStatus.className = 'status-ready';
  }

  function expressionSummary(node) {
    if (!node) return '—';
    if (node.type === 'Literal') return JSON.stringify(node.value);
    if (node.type === 'Identifier') return node.name;
    if (node.type === 'BinaryExpression') return `${expressionSummary(node.left)} ${node.operator} ${expressionSummary(node.right)}`;
    if (node.type === 'UnaryExpression') return `${node.operator}${expressionSummary(node.argument)}`;
    if (node.type === 'GroupingExpression') return `(${expressionSummary(node.expression)})`;
    if (node.type === 'CallExpression') return `${expressionSummary(node.callee)}(...)`;
    if (node.type === 'ArrayExpression') return `[${node.elements.map(expressionSummary).join(', ')}]`;
    if (node.type === 'IndexExpression') return `${expressionSummary(node.object)}[${expressionSummary(node.index)}]`;
    if (node.type === 'AssignmentExpression') return `${expressionSummary(node.left)} ${node.operator} ${expressionSummary(node.right)}`;
    if (node.type === 'UpdateExpression') return node.prefix
      ? `${node.operator}${expressionSummary(node.argument)}`
      : `${expressionSummary(node.argument)}${node.operator}`;
    if (node.type === 'ConditionalExpression') return `${expressionSummary(node.test)} ? … : …`;
    return node.type;
  }

  function renderSymbolTable(ast) {
    const symbols = [];
    const visit = node => {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'VariableDeclaration') {
        const array = node.arraySize ? '[]' : '';
        symbols.push({
          name: node.name,
          kind: `${node.dataType || node.kind || 'variable'}${array}`,
          value: expressionSummary(node.initializer)
        });
      }
      if (node.type === 'Parameter') {
        symbols.push({
          name: node.name,
          kind: `parameter · ${node.dataType || 'any'}${node.arraySize ? '[]' : ''}`,
          value: '—'
        });
      }
      Object.values(node).forEach(value => {
        if (Array.isArray(value)) value.forEach(visit);
        else if (value && typeof value === 'object') visit(value);
      });
    };
    visit(ast);

    elements.symbolCount.textContent = `${symbols.length} symbol${symbols.length === 1 ? '' : 's'}`;
    elements.symbolTable.innerHTML = '';
    if (symbols.length === 0) {
      elements.symbolTable.className = 'symbol-table placeholder-copy';
      elements.symbolTable.textContent = 'No variable declarations found.';
      return;
    }

    elements.symbolTable.className = 'symbol-table';
    const header = document.createElement('div');
    header.className = 'symbol-row header';
    header.innerHTML = '<span>Name</span><span>Kind</span><span>Initializer</span>';
    elements.symbolTable.appendChild(header);
    symbols.forEach(symbol => {
      const row = document.createElement('div');
      row.className = 'symbol-row';
      const name = document.createElement('code');
      name.textContent = symbol.name;
      const kind = document.createElement('span');
      kind.textContent = symbol.kind;
      const value = document.createElement('code');
      value.textContent = symbol.value;
      row.append(name, kind, value);
      elements.symbolTable.appendChild(row);
    });
  }

  function renderTokens(tokens) {
    elements.tokenCount.textContent = `${tokens.length} token${tokens.length === 1 ? '' : 's'}`;
    if (tokens.length === 0) {
      elements.tokenList.innerHTML = '<div class="placeholder-copy">No tokens.</div>';
      return;
    }

    elements.tokenList.innerHTML = '';
    tokens.forEach(token => {
      const item = document.createElement('div');
      item.className = 'token-item';
      const main = document.createElement('div');
      main.className = 'token-main';
      const type = document.createElement('span');
      type.className = 'token-type';
      type.textContent = token.type;
      const value = document.createElement('span');
      value.className = 'token-value';
      value.textContent = token.lexeme || String(token.literal);
      const location = document.createElement('span');
      location.className = 'token-location';
      location.textContent = `L${token.line}:C${token.column}`;
      main.append(type, value);
      item.append(main, location);
      elements.tokenList.appendChild(item);
    });
  }

  function showNodeDetails(wrapper) {
    const label = SyntaxTreeView.nodeLabel(wrapper.data);
    const rows = [
      ['Node ID', wrapper.id],
      ['Type', wrapper.data.type],
      ['Label', label.value || '—'],
      ['Depth', wrapper.depth],
      ['Children', wrapper.children.length]
    ];

    Object.entries(wrapper.data).forEach(([key, value]) => {
      if (key === 'type') return;
      if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) {
        rows.push([key, JSON.stringify(value)]);
      }
    });

    const dl = document.createElement('dl');
    dl.className = 'property-list';
    rows.forEach(([key, value]) => {
      const row = document.createElement('div');
      row.className = 'property-row';
      const dt = document.createElement('dt');
      dt.textContent = key;
      const dd = document.createElement('dd');
      dd.textContent = String(value);
      row.append(dt, dd);
      dl.appendChild(row);
    });
    elements.nodeDetails.innerHTML = '';
    elements.nodeDetails.appendChild(dl);
    activateTab('details');
  }

  function activateTab(tabName) {
    document.querySelectorAll('.tab').forEach(tab => {
      const active = tab.dataset.tab === tabName;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    document.querySelectorAll('.tab-content').forEach(panel => panel.classList.remove('active'));
    document.getElementById(`${tabName}Tab`).classList.add('active');
  }

  function showMessage(text, type) {
    elements.messageBox.textContent = text;
    elements.messageBox.className = `message ${type}`;
  }

  function clearMessage() {
    elements.messageBox.textContent = '';
    elements.messageBox.className = 'message hidden';
  }

  function clearAll() {
    visualizer.clear();
    elements.sourceInput.value = '';
    elements.emptyState.classList.remove('hidden');
    resetResults();
    currentAst = null;
    currentTokens = [];
    traversalStep = 0;
    stepTraversalType = '';
    clearMessage();
  }

  function resetResults() {
    elements.nodeDetails.innerHTML = '<div class="placeholder-copy">Click any syntax-tree node to view its type and properties.</div>';
    elements.tokenList.innerHTML = '<div class="placeholder-copy">Tokens will appear after parsing.</div>';
    elements.tokenCount.textContent = '0 tokens';
    elements.symbolTable.className = 'symbol-table placeholder-copy';
    elements.symbolTable.textContent = 'Symbols will appear after parsing.';
    elements.symbolCount.textContent = '0 symbols';
    elements.astJson.textContent = 'Generate a tree to view JSON.';
    elements.traversalOutput.textContent = 'Traversal order will appear here.';
    elements.nodeCount.textContent = '0';
    elements.treeDepth.textContent = '0';
    elements.tokenStat.textContent = '0';
    elements.parserStatus.textContent = 'Ready';
    elements.parserStatus.className = 'status-ready';
  }

  function traversalNodeName(node) {
    const label = SyntaxTreeView.nodeLabel(node.data);
    return label.value ? `${label.title}(${label.value})` : label.title;
  }

  function playTraversal() {
    if (!currentAst) {
      showMessage('Generate a syntax tree before starting traversal.', 'error');
      return;
    }
    clearMessage();
    const type = elements.traversalSelect.value;
    traversalStep = 0;
    stepTraversalType = type;
    const delay = Number(elements.speedRange.max) + Number(elements.speedRange.min) - Number(elements.speedRange.value);
    visualizer.animateTraversal(
      type,
      delay,
      (sequence, currentIndex) => {
        elements.traversalOutput.textContent = sequence
          .map((node, index) => index <= currentIndex ? traversalNodeName(node) : '…')
          .join('  →  ');
      },
      sequence => {
        elements.traversalOutput.textContent = sequence.map(traversalNodeName).join('  →  ');
      }
    );
  }

  function stepThroughTraversal() {
    if (!currentAst) {
      showMessage('Generate a syntax tree before using step traversal.', 'error');
      return;
    }
    clearMessage();
    visualizer.stopTraversal();
    const type = elements.traversalSelect.value;
    if (stepTraversalType !== type) {
      stepTraversalType = type;
      traversalStep = 0;
    }
    const sequence = visualizer.traversal(type);
    if (traversalStep >= sequence.length) traversalStep = 0;
    const node = sequence[traversalStep];
    visualizer.highlightTraversalNode(node);
    visualizer.selectNode(node.id);
    showNodeDetails(node);
    elements.traversalOutput.textContent = sequence
      .slice(0, traversalStep + 1)
      .map(traversalNodeName)
      .join('  →  ');
    traversalStep += 1;
  }

  function downloadText(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function downloadJson() {
    if (!currentAst) {
      showMessage('Generate a tree before downloading AST JSON.', 'error');
      return;
    }
    downloadText('syntax-tree.json', JSON.stringify(currentAst, null, 2), 'application/json');
  }

  async function copyJson() {
    if (!currentAst) {
      showMessage('Generate a tree before copying AST JSON.', 'error');
      return;
    }
    const text = JSON.stringify(currentAst, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      showMessage('AST JSON copied to the clipboard.', 'success');
    } catch (_error) {
      const helper = document.createElement('textarea');
      helper.value = text;
      helper.style.position = 'fixed';
      helper.style.opacity = '0';
      document.body.appendChild(helper);
      helper.select();
      document.execCommand('copy');
      helper.remove();
      showMessage('AST JSON copied to the clipboard.', 'success');
    }
  }

  function downloadSvg() {
    try {
      const svgText = visualizer.exportSvg();
      downloadText('syntax-tree.svg', svgText, 'image/svg+xml');
    } catch (error) {
      showMessage(error.message, 'error');
    }
  }

  elements.visualizeBtn.addEventListener('click', parseAndRender);
  elements.clearBtn.addEventListener('click', clearAll);
  elements.sampleSelect.addEventListener('change', event => {
    elements.sourceInput.value = samples[event.target.value];
    parseAndRender();
  });
  elements.zoomInBtn.addEventListener('click', () => visualizer.zoomIn());
  elements.zoomOutBtn.addEventListener('click', () => visualizer.zoomOut());
  elements.fitBtn.addEventListener('click', () => visualizer.fitToView());
  elements.resetViewBtn.addEventListener('click', () => visualizer.resetView());
  elements.playTraversalBtn.addEventListener('click', playTraversal);
  elements.stepTraversalBtn.addEventListener('click', stepThroughTraversal);
  elements.stopTraversalBtn.addEventListener('click', () => {
    visualizer.stopTraversal();
    traversalStep = 0;
  });
  elements.downloadJsonBtn.addEventListener('click', downloadJson);
  elements.copyJsonBtn.addEventListener('click', copyJson);
  elements.downloadSvgBtn.addEventListener('click', downloadSvg);

  elements.themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    const dark = document.body.classList.contains('dark');
    elements.themeToggle.querySelector('[aria-hidden="true"]').textContent = dark ? '☀' : '◐';
    elements.themeToggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    localStorage.setItem('syntax-tree-theme', dark ? 'dark' : 'light');
  });

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => activateTab(tab.dataset.tab));
  });

  elements.sourceInput.addEventListener('keydown', event => {
    if (event.key === 'Tab') {
      event.preventDefault();
      const start = elements.sourceInput.selectionStart;
      const end = elements.sourceInput.selectionEnd;
      elements.sourceInput.value = elements.sourceInput.value.slice(0, start) + '  ' + elements.sourceInput.value.slice(end);
      elements.sourceInput.selectionStart = elements.sourceInput.selectionEnd = start + 2;
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') parseAndRender();
  });

  if (localStorage.getItem('syntax-tree-theme') === 'dark') {
    document.body.classList.add('dark');
    elements.themeToggle.querySelector('[aria-hidden="true"]').textContent = '☀';
    elements.themeToggle.setAttribute('aria-label', 'Switch to light mode');
  }

  elements.sourceInput.value = samples.expression;
  parseAndRender();
})();
