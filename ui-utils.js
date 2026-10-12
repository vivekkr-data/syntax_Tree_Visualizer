(function (global) {
  'use strict';

  // Shared presentation helpers. Source text is always inserted as text, never HTML.
  function table(id, headers, rows) {
    const target = document.getElementById(id);
    target.replaceChildren();
    if (!rows.length) {
      target.textContent = 'No entries for this result.';
      return;
    }
    const table = document.createElement('table');
    table.className = 'compiler-table';
    const head = document.createElement('thead');
    const heading = document.createElement('tr');
    for (const label of headers) {
      const cell = document.createElement('th');
      cell.scope = 'col';
      cell.textContent = label;
      heading.append(cell);
    }
    head.append(heading);
    table.append(head);
    const body = document.createElement('tbody');
    for (const values of rows) {
      const row = document.createElement('tr');
      for (const value of values) {
        const cell = document.createElement('td');
        cell.textContent = String(value ?? '—');
        row.append(cell);
      }
      body.append(row);
    }
    table.append(body);
    target.append(table);
  }

  function downloadText(filename, content, mimeType) {
    const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    // Let the browser start reading the download before releasing its URL.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  global.SyntaxUI = { table, downloadText };
})(window);
