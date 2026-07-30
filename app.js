(function () {
  'use strict';

  const samples = {
    expression: `let result = 4 + 5 * 2;\nprint(result);`,
    variables: `let length = 12;\nlet width = 8;\nlet area = length * width;\nprint(area);`,
    condition: `let marks = 78;\nif (marks >= 40) {\n  print("Pass");\n} else {\n  print("Fail");\n}`,
    loop: `let count = 0;\nwhile (count < 3) {\n  print(count);\n  count = count + 1;\n}`
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
    astJson: document.getElementById('astJson'),
    zoomInBtn: document.getElementById('zoomInBtn'),
    zoomOutBtn: document.getElementById('zoomOutBtn'),
    fitBtn: document.getElementById('fitBtn'),
    resetViewBtn: document.getElementById('resetViewBtn'),
    traversalSelect: document.getElementById('traversalSelect'),
    speedRange: document.getElementById('speedRange'),
    playTraversalBtn: document.getElementById('playTraversalBtn'),
    stopTraversalBtn: document.getElementById('stopTraversalBtn'),
    traversalOutput: document.getElementById('traversalOutput'),
    themeToggle: document.getElementById('themeToggle'),
    downloadJsonBtn: document.getElementById('downloadJsonBtn'),
    downloadSvgBtn: document.getElementById('downloadSvgBtn')
  };

  let currentAst = null;
  let currentTokens = [];

  const visualizer = new SyntaxTreeView.TreeVisualizer(
    elements.treeSvg,
    elements.viewportGroup,
    elements.edgeLayer,
    elements.nodeLayer,
    showNodeDetails
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
      elements.nodeDetails.innerHTML = '<div class="placeholder-copy">Tree generated. Click a node to inspect its properties.</div>';
      elements.traversalOutput.textContent = 'Traversal order will appear here.';
      showMessage(`Tree generated successfully: ${visualizer.nodes.length} nodes.`, 'success');
    } catch (error) {
      currentAst = null;
      showMessage(error.message || 'Unable to parse the program.', 'error');
    }
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
    visualizer.stopTraversal();
    elements.sourceInput.value = '';
    elements.edgeLayer.textContent = '';
    elements.nodeLayer.textContent = '';
    elements.emptyState.classList.remove('hidden');
    elements.nodeDetails.innerHTML = '<div class="placeholder-copy">Click any syntax-tree node to view its type and properties.</div>';
    elements.tokenList.innerHTML = '<div class="placeholder-copy">Tokens will appear after parsing.</div>';
    elements.tokenCount.textContent = '0 tokens';
    elements.astJson.textContent = 'Generate a tree to view JSON.';
    elements.traversalOutput.textContent = 'Traversal order will appear here.';
    currentAst = null;
    currentTokens = [];
    clearMessage();
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
  elements.stopTraversalBtn.addEventListener('click', () => visualizer.stopTraversal());
  elements.downloadJsonBtn.addEventListener('click', downloadJson);
  elements.downloadSvgBtn.addEventListener('click', downloadSvg);

  elements.themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    elements.themeToggle.textContent = document.body.classList.contains('dark') ? '☀' : '◐';
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

  elements.sourceInput.value = samples.expression;
  parseAndRender();
})();
