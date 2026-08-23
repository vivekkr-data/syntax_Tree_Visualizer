(function (global) {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';

  function astChildren(node) {
    if (!node || typeof node !== 'object') return [];
    switch (node.type) {
      case 'Program': return node.body;
      case 'VariableDeclaration': return [node.arraySize, node.initializer].filter(Boolean);
      case 'VariableDeclarationList': return node.declarations;
      case 'FunctionDeclaration': return [...node.parameters, node.body];
      case 'Parameter': return node.arraySize ? [node.arraySize] : [];
      case 'AssignmentStatement': return [node.value];
      case 'AssignmentExpression': return [node.left, node.right];
      case 'PrintStatement': return [node.expression];
      case 'IfStatement': return [node.condition, node.consequent, ...(node.alternate ? [node.alternate] : [])];
      case 'WhileStatement': return [node.condition, node.body];
      case 'ForStatement': return [node.initializer, node.condition, node.update, node.body].filter(Boolean);
      case 'DoWhileStatement': return [node.body, node.condition];
      case 'ReturnStatement': return node.argument ? [node.argument] : [];
      case 'BlockStatement': return node.body;
      case 'ExpressionStatement': return [node.expression];
      case 'BinaryExpression': return [node.left, node.right];
      case 'UnaryExpression': return [node.argument];
      case 'UpdateExpression': return [node.argument];
      case 'ConditionalExpression': return [node.test, node.consequent, node.alternate];
      case 'GroupingExpression': return [node.expression];
      case 'CallExpression': return [node.callee, ...node.arguments];
      case 'ArrayExpression': return node.elements;
      case 'IndexExpression': return [node.object, node.index];
      default: return [];
    }
  }

  function nodeLabel(node) {
    switch (node.type) {
      case 'VariableDeclaration': {
        const prefix = node.dataType || node.kind || '';
        const pointer = '*'.repeat(node.pointerDepth || 0);
        const array = node.arraySize ? '[]' : '';
        return { title: 'VariableDeclaration', value: `${prefix} ${pointer}${node.name}${array}`.trim() };
      }
      case 'VariableDeclarationList': return { title: 'DeclarationList', value: `${node.declarations.length} variables` };
      case 'FunctionDeclaration': return { title: 'FunctionDeclaration', value: `${node.name}() → ${node.returnType}` };
      case 'Parameter': return { title: 'Parameter', value: `${node.dataType || 'any'} ${'*'.repeat(node.pointerDepth || 0)}${node.name}${node.arraySize ? '[]' : ''}` };
      case 'AssignmentStatement': return { title: 'Assignment', value: node.name };
      case 'AssignmentExpression': return { title: 'Assignment', value: node.operator };
      case 'BinaryExpression': return { title: 'BinaryExpression', value: node.operator };
      case 'UnaryExpression': return { title: 'UnaryExpression', value: node.operator };
      case 'UpdateExpression': return { title: 'UpdateExpression', value: `${node.prefix ? 'prefix ' : 'postfix '}${node.operator}` };
      case 'ConditionalExpression': return { title: 'ConditionalExpression', value: '?:' };
      case 'Literal': return { title: 'Literal', value: JSON.stringify(node.value) };
      case 'Identifier': return { title: 'Identifier', value: node.name };
      case 'CallExpression': return { title: 'CallExpression', value: `${node.arguments.length} arg(s)` };
      case 'IfStatement': return { title: 'IfStatement', value: node.alternate ? 'with else' : 'no else' };
      case 'WhileStatement': return { title: 'WhileStatement', value: 'loop' };
      case 'ForStatement': return { title: 'ForStatement', value: 'init · test · update' };
      case 'DoWhileStatement': return { title: 'DoWhileStatement', value: 'post-test loop' };
      case 'ReturnStatement': return { title: 'ReturnStatement', value: node.argument ? 'with value' : 'void' };
      case 'BreakStatement': return { title: 'BreakStatement', value: 'exit loop' };
      case 'ContinueStatement': return { title: 'ContinueStatement', value: 'next iteration' };
      case 'ArrayExpression': return { title: 'ArrayExpression', value: `${node.elements.length} element(s)` };
      case 'IndexExpression': return { title: 'IndexExpression', value: '[]' };
      case 'BlockStatement': return { title: 'BlockStatement', value: `${node.body.length} statement(s)` };
      case 'Program': return { title: 'Program', value: `${node.body.length} statement(s)` };
      default: return { title: node.type, value: '' };
    }
  }

  function nodeKind(node) {
    if (['Literal', 'Identifier'].includes(node.type)) return 'value';
    if (node.type.endsWith('Expression')) return 'expression';
    return 'statement';
  }

  class TreeVisualizer {
    constructor(svg, viewportGroup, edgeLayer, nodeLayer, onNodeSelected, onViewChanged) {
      this.svg = svg;
      this.viewportGroup = viewportGroup;
      this.edgeLayer = edgeLayer;
      this.nodeLayer = nodeLayer;
      this.onNodeSelected = onNodeSelected;
      this.onViewChanged = onViewChanged;
      this.root = null;
      this.nodes = [];
      this.nodeElements = new Map();
      this.selectedId = null;
      this.scale = 1;
      this.translateX = 36;
      this.translateY = 42;
      this.dragging = false;
      this.lastPointer = null;
      this.animationToken = 0;
      this.setupInteractions();
    }

    render(ast) {
      this.stopTraversal();
      this.edgeLayer.textContent = '';
      this.nodeLayer.textContent = '';
      this.nodeElements.clear();
      this.selectedId = null;
      this.nodes = [];
      this.root = this.wrapNode(ast, null, 0);
      this.layoutTree();
      this.drawEdges();
      this.drawNodes();
      this.resetView();
      requestAnimationFrame(() => this.fitToView());
    }

    clear() {
      this.stopTraversal();
      this.edgeLayer.textContent = '';
      this.nodeLayer.textContent = '';
      this.nodeElements.clear();
      this.selectedId = null;
      this.root = null;
      this.nodes = [];
      this.resetView();
    }

    wrapNode(data, parent, depth) {
      const wrapper = {
        id: `node-${this.nodes.length + 1}`,
        data,
        parent,
        depth,
        children: [],
        x: 0,
        y: 0,
        width: 154,
        height: 58
      };
      this.nodes.push(wrapper);
      wrapper.children = astChildren(data).map(child => this.wrapNode(child, wrapper, depth + 1));
      return wrapper;
    }

    layoutTree() {
      const horizontalGap = 190;
      const verticalGap = 110;
      let leafCursor = 0;

      const assign = node => {
        node.children.forEach(assign);
        if (node.children.length === 0) {
          node.x = leafCursor * horizontalGap;
          leafCursor += 1;
        } else {
          node.x = node.children.reduce((sum, child) => sum + child.x, 0) / node.children.length;
        }
        node.y = node.depth * verticalGap;
      };

      assign(this.root);
      const minX = Math.min(...this.nodes.map(node => node.x));
      this.nodes.forEach(node => { node.x = node.x - minX + 90; });
    }

    drawEdges() {
      for (const node of this.nodes) {
        for (const child of node.children) {
          const path = document.createElementNS(SVG_NS, 'path');
          const startX = node.x;
          const startY = node.y + node.height / 2;
          const endX = child.x;
          const endY = child.y - child.height / 2;
          const midY = (startY + endY) / 2;
          path.setAttribute('d', `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`);
          path.setAttribute('class', 'edge');
          this.edgeLayer.appendChild(path);
        }
      }
    }

    drawNodes() {
      for (const node of this.nodes) {
        const group = document.createElementNS(SVG_NS, 'g');
        group.setAttribute('class', 'node-group');
        group.setAttribute('data-kind', nodeKind(node.data));
        group.setAttribute('transform', `translate(${node.x}, ${node.y})`);
        group.setAttribute('role', 'button');
        group.setAttribute('aria-label', nodeLabel(node.data).title);
        group.setAttribute('tabindex', '0');

        const rect = document.createElementNS(SVG_NS, 'rect');
        rect.setAttribute('x', -node.width / 2);
        rect.setAttribute('y', -node.height / 2);
        rect.setAttribute('width', node.width);
        rect.setAttribute('height', node.height);
        rect.setAttribute('class', 'node-rect');

        const label = nodeLabel(node.data);
        const title = document.createElementNS(SVG_NS, 'text');
        title.setAttribute('x', 0);
        title.setAttribute('y', label.value ? -8 : 0);
        title.setAttribute('class', 'node-title');
        title.textContent = this.truncate(label.title, 20);

        group.appendChild(rect);
        group.appendChild(title);

        if (label.value) {
          const value = document.createElementNS(SVG_NS, 'text');
          value.setAttribute('x', 0);
          value.setAttribute('y', 13);
          value.setAttribute('class', 'node-value');
          value.textContent = this.truncate(String(label.value), 22);
          group.appendChild(value);
        }

        group.addEventListener('click', event => {
          event.stopPropagation();
          this.selectNode(node.id);
          if (typeof this.onNodeSelected === 'function') this.onNodeSelected(node);
        });
        group.addEventListener('keydown', event => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          this.selectNode(node.id);
          if (typeof this.onNodeSelected === 'function') this.onNodeSelected(node);
        });

        this.nodeElements.set(node.id, group);
        this.nodeLayer.appendChild(group);
      }
    }

    truncate(value, max) { return value.length > max ? `${value.slice(0, max - 1)}…` : value; }

    selectNode(id) {
      if (this.selectedId && this.nodeElements.has(this.selectedId)) {
        this.nodeElements.get(this.selectedId).classList.remove('selected');
      }
      this.selectedId = id;
      if (id && this.nodeElements.has(id)) this.nodeElements.get(id).classList.add('selected');
    }

    setupInteractions() {
      this.svg.addEventListener('wheel', event => {
        event.preventDefault();
        const rect = this.svg.getBoundingClientRect();
        const pointerX = event.clientX - rect.left;
        const pointerY = event.clientY - rect.top;
        const factor = event.deltaY < 0 ? 1.12 : 0.89;
        this.zoomAt(pointerX, pointerY, factor);
      }, { passive: false });

      this.svg.addEventListener('pointerdown', event => {
        if (event.button !== 0) return;
        if (event.target instanceof Element && event.target.closest('.node-group')) return;
        this.dragging = true;
        this.lastPointer = { x: event.clientX, y: event.clientY };
        this.svg.setPointerCapture(event.pointerId);
        this.svg.classList.add('panning');
      });

      this.svg.addEventListener('pointermove', event => {
        if (!this.dragging || !this.lastPointer) return;
        this.translateX += event.clientX - this.lastPointer.x;
        this.translateY += event.clientY - this.lastPointer.y;
        this.lastPointer = { x: event.clientX, y: event.clientY };
        this.applyTransform();
      });

      const stopDrag = event => {
        this.dragging = false;
        this.lastPointer = null;
        this.svg.classList.remove('panning');
        if (event.pointerId !== undefined && this.svg.hasPointerCapture(event.pointerId)) {
          this.svg.releasePointerCapture(event.pointerId);
        }
      };
      this.svg.addEventListener('pointerup', stopDrag);
      this.svg.addEventListener('pointercancel', stopDrag);
      this.svg.addEventListener('click', () => this.selectNode(null));
    }

    applyTransform() {
      this.viewportGroup.setAttribute('transform', `translate(${this.translateX} ${this.translateY}) scale(${this.scale})`);
      if (typeof this.onViewChanged === 'function') this.onViewChanged(this.scale);
    }

    zoomAt(screenX, screenY, factor) {
      const nextScale = Math.min(3.2, Math.max(0.04, this.scale * factor));
      const worldX = (screenX - this.translateX) / this.scale;
      const worldY = (screenY - this.translateY) / this.scale;
      this.translateX = screenX - worldX * nextScale;
      this.translateY = screenY - worldY * nextScale;
      this.scale = nextScale;
      this.applyTransform();
    }

    zoomIn() {
      const rect = this.svg.getBoundingClientRect();
      this.zoomAt(rect.width / 2, rect.height / 2, 1.2);
    }

    zoomOut() {
      const rect = this.svg.getBoundingClientRect();
      this.zoomAt(rect.width / 2, rect.height / 2, 0.82);
    }

    resetView() {
      this.scale = 1;
      this.translateX = 36;
      this.translateY = 48;
      this.applyTransform();
    }

    fitToView() {
      if (!this.root || this.nodes.length === 0) return;
      const svgRect = this.svg.getBoundingClientRect();
      const minX = Math.min(...this.nodes.map(n => n.x - n.width / 2));
      const maxX = Math.max(...this.nodes.map(n => n.x + n.width / 2));
      const minY = Math.min(...this.nodes.map(n => n.y - n.height / 2));
      const maxY = Math.max(...this.nodes.map(n => n.y + n.height / 2));
      const contentWidth = Math.max(1, maxX - minX);
      const contentHeight = Math.max(1, maxY - minY);
      const padding = 70;
      this.scale = Math.min(1.15, Math.max(0.04, Math.min((svgRect.width - padding) / contentWidth, (svgRect.height - padding) / contentHeight)));
      this.translateX = (svgRect.width - contentWidth * this.scale) / 2 - minX * this.scale;
      this.translateY = (svgRect.height - contentHeight * this.scale) / 2 - minY * this.scale;
      this.applyTransform();
    }

    traversal(type) {
      if (!this.root) return [];
      if (type === 'postorder') {
        const result = [];
        const walk = node => { node.children.forEach(walk); result.push(node); };
        walk(this.root);
        return result;
      }
      if (type === 'levelorder') {
        const result = [];
        const queue = [this.root];
        while (queue.length) {
          const node = queue.shift();
          result.push(node);
          queue.push(...node.children);
        }
        return result;
      }
      const result = [];
      const walk = node => { result.push(node); node.children.forEach(walk); };
      walk(this.root);
      return result;
    }

    async animateTraversal(type, delay, onStep, onComplete) {
      if (!this.root) return;
      this.stopTraversal();
      const token = this.animationToken;
      const sequence = this.traversal(type);
      for (let index = 0; index < sequence.length; index += 1) {
        if (token !== this.animationToken) return;
        this.clearTraversalClass();
        const node = sequence[index];
        this.nodeElements.get(node.id)?.classList.add('traversing');
        if (typeof onStep === 'function') onStep(sequence, index);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      if (token === this.animationToken) {
        this.clearTraversalClass();
        if (typeof onComplete === 'function') onComplete(sequence);
      }
    }

    stopTraversal() {
      this.animationToken += 1;
      this.clearTraversalClass();
    }

    clearTraversalClass() {
      this.nodeElements.forEach(element => element.classList.remove('traversing'));
    }

    highlightTraversalNode(node) {
      this.clearTraversalClass();
      if (node && this.nodeElements.has(node.id)) {
        this.nodeElements.get(node.id).classList.add('traversing');
      }
    }

    exportSvg() {
      if (!this.root) throw new Error('Generate a tree before exporting SVG.');
      const clone = this.svg.cloneNode(true);
      clone.setAttribute('xmlns', SVG_NS);
      clone.setAttribute('width', '1600');
      clone.setAttribute('height', '1000');
      clone.setAttribute('viewBox', '0 0 1600 1000');
      const style = document.createElementNS(SVG_NS, 'style');
      style.textContent = `
        .edge{fill:none;stroke:#94a3b8;stroke-width:2}
        .node-rect{fill:#fff;stroke:#64748b;stroke-width:2;rx:12;ry:12}
        .node-title{fill:#172033;font:700 13px sans-serif;text-anchor:middle;dominant-baseline:middle}
        .node-value{fill:#64748b;font:11px sans-serif;text-anchor:middle;dominant-baseline:middle}
      `;
      clone.insertBefore(style, clone.firstChild);
      const serializer = new XMLSerializer();
      return serializer.serializeToString(clone);
    }
  }

  global.SyntaxTreeView = { TreeVisualizer, nodeLabel, nodeKind };
})(window);
