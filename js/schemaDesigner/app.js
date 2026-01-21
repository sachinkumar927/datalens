
document.addEventListener('DOMContentLoaded', () => {
  // Model
  const schema = { tables: {} };

  // History for undo/redo
  const history = { stack: [], idx: -1 };
  function pushHistory() {
    // store deep copy
    history.stack = history.stack.slice(0, history.idx + 1);
    history.stack.push(JSON.stringify(schema));
    history.idx = history.stack.length - 1;
    updateHistoryButtons();
  }
  function updateHistoryButtons() {
    $('undoBtn').disabled = history.idx <= 0;
    $('redoBtn').disabled = history.idx >= history.stack.length - 1 || history.idx === -1;
  }
  function undo() {
    if (history.idx <= 0) return;
    history.idx--; applyHistory();
  }
  function redo() {
    if (history.idx >= history.stack.length - 1) return;
    history.idx++; applyHistory();
  }
  function applyHistory() {
    const snapshot = history.stack[history.idx];
    if (!snapshot) return;
    const obj = JSON.parse(snapshot);
    // replace schema in place
    Object.keys(schema).forEach(k => delete schema[k]);
    Object.assign(schema, obj);
    refreshTablesList(); updateAfterChange(false);
    updateHistoryButtons();
  }

  // cytoscape registration
  if (window.cytoscape && window.cytoscapeDagre) {
    try { cytoscape.use(window.cytoscapeDagre); } catch (e) { /* already registered */ }
  }

  // DOM shortcuts
  const $ = id => document.getElementById(id);
  const tpl = id => document.getElementById(id);

  // cytoscape instance
  let cy = null;
  function initCytoscape() {
    const container = $('erCanvas');
    if (!container) return console.error('ER canvas not found');
    // clear container
    container.innerHTML = '';
    cy = cytoscape({
      container,
      elements: [],
      style: [
        { selector: 'node', style: { 'label': 'data(label)', 'text-wrap': 'wrap', 'text-valign': 'center', 'text-halign': 'center', 'background-color': '#ffffff', 'border-color': '#2563eb', 'border-width': 2, 'shape': 'round-rectangle', 'padding': '10px', 'font-size': 12 } },
        { selector: 'edge', style: { 'curve-style': 'bezier', 'target-arrow-shape': 'triangle', 'line-color': '#9ca3af', 'target-arrow-color': '#9ca3af', 'width': 2 } },
        { selector: '.pk', style: { 'border-color': '#0ea5a4', 'border-width': 3 } },
        { selector: '.fk', style: { 'line-style': 'dashed', 'line-color': '#f59e0b', 'target-arrow-color': '#f59e0b' } }
      ],
      wheelSensitivity: 0.2
    });

    // interaction: click node to edit
    cy.on('tap', 'node', evt => {
      const id = evt.target.id().replace(/^n_/, ''); loadTableToEditor(id);
    });

    // handle resize
    window.addEventListener('resize', () => { try { if (cy) cy.resize(); } catch (e) { } });
  }

  // UI helpers
  function el(tag, attrs = {}) { const e = document.createElement(tag); Object.entries(attrs).forEach(([k, v]) => { if (k === 'html') e.innerHTML = v; else e.setAttribute(k, v); }); return e }

  // Render table list
  function refreshTablesList(filter = '') {
    const list = $('tablesList'); list.innerHTML = '';
    Object.keys(schema.tables).filter(tn => tn.includes(filter)).forEach(tn => {
      const t = schema.tables[tn];
      const li = el('button', { class: 'list-group-item list-group-item-action table-item', type: 'button' });
      li.innerHTML = `<div><strong>${tn}</strong><div class="table-preview">${Object.keys(t.columns).length} columns • PK: ${t.pk || '-'}</div></div><div><span class="chip">${Object.keys(t.columns).length}</span></div>`;
      li.addEventListener('click', () => loadTableToEditor(tn));
      list.appendChild(li);
    });
  }

  // Column row renderer
  function renderColumnRow(tableName = '', colName = '', meta = { type: 'VARCHAR(255)', nullable: true, unique: false, pk: false }) {
    const tplNode = tpl('colRowTemplate').content.firstElementChild.cloneNode(true);
    const nameEl = tplNode.querySelector('.col-name'); const typeEl = tplNode.querySelector('.col-type'); const pkEl = tplNode.querySelector('.col-pk'); const nullEl = tplNode.querySelector('.col-null'); const uniqueEl = tplNode.querySelector('.col-unique'); const fkBtn = tplNode.querySelector('.col-fk'); const delBtn = tplNode.querySelector('.col-del');
    nameEl.value = colName; typeEl.value = meta.type || 'VARCHAR(255)'; pkEl.checked = !!meta.pk; nullEl.checked = meta.nullable !== false; uniqueEl.checked = meta.unique === true;

    delBtn.addEventListener('click', () => tplNode.remove());
    fkBtn.addEventListener('click', () => {
      // when user clicks FK on a column row open relationship UI and pre-select values
      populateRelSelectors();
      $('colSourceTable').value = tableName;
      // ensure fields are filled
      fillFields('colSourceTable', 'colSourceField');
      setTimeout(() => { if (nameEl.value) $('colSourceField').value = nameEl.value; }, 20);
    });

    return tplNode;
  }

  // Load table into editor
  function loadTableToEditor(name) {
    const t = schema.tables[name]; if (!t) return;
    $('tableName').value = name;
    const ce = $('columnsEditor'); ce.innerHTML = '';
    Object.entries(t.columns).forEach(([cn, meta]) => ce.appendChild(renderColumnRow(name, cn, meta)));
  }

  // Save table
  $('saveTableBtn').addEventListener('click', () => {
    const name = $('tableName').value.trim(); if (!name) return alert('Provide a table name');
    const ce = $('columnsEditor'); const rows = Array.from(ce.children);
    const cols = {};
    let pkSet = null;
    rows.forEach(r => {
      const n = r.querySelector('.col-name').value.trim();
      const t = r.querySelector('.col-type').value;
      const pkUI = r.querySelector('.col-pk').checked;
      const nullableUI = r.querySelector('.col-null').checked;
      const uniqueUI = r.querySelector('.col-unique').checked;

      if (!n) return;

      const pk = pkUI;
      const nullable = pk ? false : nullableUI;
      const unique = pk ? true : uniqueUI;

      // preserve fk
      const existing =
        schema.tables[name] &&
          schema.tables[name].columns[n]
          ? schema.tables[name].columns[n].fk
          : undefined;

      cols[n] = { type: t, nullable, unique, pk };
      if (existing) cols[n].fk = existing;
      if (pk) pkSet = n;
    });

    // if table renamed, we need to move entry
    const oldName = Object.keys(schema.tables).find(k => k === name) ? name : null;
    // create/replace
    schema.tables[name] = schema.tables[name] || { columns: {} };
    schema.tables[name].columns = cols;
    if (pkSet) schema.tables[name].pk = pkSet; else delete schema.tables[name].pk;

    // if user changed name (rare), handle rename: -- skipped as we overwrite by name

    pushHistory();
    refreshTablesList(); updateAfterChange();
  });

  // Add table
  // $('addTableBtn').addEventListener('click', () => {
  //   let base = 'table', i = 1; while (schema.tables[base + i]) i++; const name = base + i;
  //   schema.tables[name] = { columns: { id: { type: 'INTEGER', nullable: false, unique: true, pk: true } }, pk: 'id' };
  //   pushHistory();
  //   refreshTablesList(); updateAfterChange(); loadTableToEditor(name);
  // });

  // Add column UI
  $('addColBtn').addEventListener('click', () => {
    const tn = $('tableName').value || Object.keys(schema.tables)[0] || '';
    const ce = $('columnsEditor'); ce.appendChild(renderColumnRow(tn, 'col' + Math.floor(Math.random() * 900 + 100), { type: 'VARCHAR(255)', nullable: true }));
  });

  // Delete table
  $('deleteTableBtn').addEventListener('click', () => {
    const name = $('tableName').value.trim(); if (!name || !schema.tables[name]) return; if (!confirm('Delete table ' + name + ' ?')) return;
    // remove any fk pointing to this table
    Object.values(schema.tables).forEach(t => { Object.entries(t.columns).forEach(([c, m]) => { if (m && m.fk && m.fk.table === name) delete m.fk; }) });
    delete schema.tables[name];
    pushHistory();
    refreshTablesList(); updateAfterChange(); $('tableName').value = ''; $('columnsEditor').innerHTML = '';
  });

  // Clone
  $('cloneTableBtn').addEventListener('click', () => {
    const name = $('tableName').value.trim(); if (!name || !schema.tables[name]) return; let i = 1; while (schema.tables[name + '_copy' + i]) i++; const newName = name + '_copy' + i; schema.tables[newName] = JSON.parse(JSON.stringify(schema.tables[name])); pushHistory(); refreshTablesList(); updateAfterChange(); loadTableToEditor(newName);
  });

  // Populate relationship selectors
  function populateRelSelectors() {
    const sourceSel = $('colSourceTable'); const targetSel = $('colTargetTable');
    [sourceSel, targetSel].forEach(sel => { sel.innerHTML = ''; Object.keys(schema.tables).forEach(tn => sel.appendChild(el('option', { value: tn, html: tn }))); });
    // update fields
    fillFields('colSourceTable', 'colSourceField'); fillFields('colTargetTable', 'colTargetField');
  }

  function fillFields(tableSelId, fieldSelId) {
    const tsel = $(tableSelId); const fsel = $(fieldSelId);
    fsel.innerHTML = '';
    const cols = schema.tables[tsel.value] ? schema.tables[tsel.value].columns : {};
    Object.keys(cols).forEach(c => fsel.appendChild(el('option', { value: c, html: c })));
  }

  // Relationships add/remove
  $('addRelBtn').addEventListener('click', () => {
    const sT = $('colSourceTable').value, sF = $('colSourceField').value, tT = $('colTargetTable').value, tF = $('colTargetField').value;
    if (!sT || !sF || !tT || !tF) return alert('Select source and target');
    schema.tables[sT].columns[sF].fk = { table: tT, column: tF };
    pushHistory(); updateAfterChange();
  });
  $('removeRelBtn').addEventListener('click', () => {
    const sT = $('colSourceTable').value, sF = $('colSourceField').value; if (!sT || !sF) return; delete schema.tables[sT].columns[sF].fk; pushHistory(); updateAfterChange();
  });

  // Suggest FK by naming convention
  $('autoFKBtn').addEventListener('click', () => {
    Object.entries(schema.tables).forEach(([tn, t]) => {
      Object.entries(t.columns).forEach(([cn, meta]) => {
        if (/_id$/.test(cn) && !meta.fk) {
          const ref = cn.replace(/_id$/, 's'); if (schema.tables[ref] && schema.tables[ref].pk) { meta.fk = { table: ref, column: schema.tables[ref].pk }; }
        }
      });
    }); pushHistory(); updateAfterChange();
  });

  // Render ER
  function renderER() {
    const elements = [];
    Object.entries(schema.tables).forEach(([tn, t]) => {
      const lines = [tn]; Object.entries(t.columns).forEach(([cn, meta]) => {
        const pkMark = (t.pk === cn) ? ' 🔑' : '';
        const fkMark = meta.fk ? ' ↪' : '';
        lines.push(cn + ' : ' + meta.type + (meta.nullable ? '' : ' NOT NULL') + pkMark + fkMark);
      });
      elements.push({ data: { id: 'n_' + tn, label: lines.join('\n') }, classes: t.pk ? 'pk' : '' });
    });
    // edges
    Object.entries(schema.tables).forEach(([tn, t]) => {
      Object.entries(t.columns).forEach(([cn, meta]) => {
        if (meta.fk) { elements.push({ data: { id: 'e_' + tn + '_' + cn, source: 'n_' + tn, target: 'n_' + meta.fk.table }, classes: 'fk' }); }
      });
    });

    if (!cy) initCytoscape();
    cy.elements().remove(); cy.add(elements);
    try { cy.layout({ name: 'dagre', nodeSep: 60, rankSep: 80 }).run(); } catch (e) { try { cy.layout({ name: 'grid' }).run(); } catch (e) { /* ignore */ } }
    setTimeout(() => { try { cy.fit(50); } catch (e) { } }, 200);
  }

  // SQL generator
  function generateSQL() {
    const dialect = $('sqlDialect').value || 'postgres';
    const parts = [];

    Object.entries(schema.tables).forEach(([tn, t]) => {
      const cols = [];
      const uniques = [];

      Object.entries(t.columns).forEach(([cn, meta]) => {
        let type = meta.type;

        if (dialect === 'mysql') {
          type = type.replace('SERIAL', 'BIGINT AUTO_INCREMENT');
        }
        if (dialect === 'sqlite') {
          type = type.replace(/VARCHAR\(.+\)/, 'TEXT');
        }

        const notNull = meta.nullable === false ? ' NOT NULL' : '';
        cols.push(`  \`${cn}\` ${type}${notNull}`);

        // ⭐ UNIQUE (non-PK)
        if (meta.unique && !meta.pk) {
          uniques.push(`  UNIQUE (\`${cn}\`)`);
        }
      });

      let ddl = `CREATE TABLE \`${tn}\` (\n${cols.join(',\n')}`;

      if (t.pk) {
        ddl += `,\n  PRIMARY KEY (\`${t.pk}\`)`;
      }

      uniques.forEach(u => ddl += `,\n${u}`);

      Object.entries(t.columns).forEach(([cn, meta]) => {
        if (meta.fk) {
          ddl += `,\n  FOREIGN KEY (\`${cn}\`) REFERENCES \`${meta.fk.table}\`(\`${meta.fk.column}\`)`;
        }
      });

      ddl += '\n);\n';
      parts.push(ddl);
    });

    return parts.join('\n');
  }


  // update SQL area
  function updateSqlArea() { const sql = generateSQL(); $('sqlArea').textContent = sql || '-- SQL will appear here'; $('downloadSql').href = 'data:text/sql;charset=utf-8,' + encodeURIComponent($('sqlArea').textContent); }

  // update after any change
  function updateAfterChange(push = true) { populateRelUI(); renderER(); refreshTablesList($('tableSearch').value || ''); updateSqlArea(); if (push) pushHistory(); }

  // populate relation UI and choices
  function populateRelUI() {
    const tables = Object.keys(schema.tables);
    ['colSourceTable', 'colTargetTable'].forEach(id => {
      const sel = $(id); const cur = sel.value; sel.innerHTML = '';
      tables.forEach(tn => sel.appendChild(el('option', { value: tn, html: tn })));
      if (tables.includes(cur)) sel.value = cur; else if (tables[0]) sel.value = tables[0];
    });
    ['colSourceField', 'colTargetField'].forEach(id => $(id).innerHTML = '');
    // ensure fields are filled for current selections
    fillFields('colSourceTable', 'colSourceField'); fillFields('colTargetTable', 'colTargetField');
  }

  // fill fields for table selects
  $('colSourceTable').addEventListener('change', () => fillFields('colSourceTable', 'colSourceField'));
  $('colTargetTable').addEventListener('change', () => fillFields('colTargetTable', 'colTargetField'));

  // generator and clipboard
  $('genSqlBtn').addEventListener('click', () => { updateSqlArea(); alert('SQL generated'); });
  $('copySqlBtn').addEventListener('click', () => { navigator.clipboard.writeText($('sqlArea').textContent).then(() => alert('Copied to clipboard')).catch(() => alert('Copy failed')); });

  // layout & export
  $('layoutBtn').addEventListener('click', () => { try { if (cy) cy.layout({ name: 'dagre', nodeSep: 60, rankSep: 80 }).run(); } catch (e) { alert('Layout failed'); } });
  $('exportPng').addEventListener('click', () => { try { const png = cy.png({ full: true, scale: 2 }); const a = document.createElement('a'); a.href = png; a.download = 'er-diagram.png'; a.click(); } catch (e) { alert('Export failed'); } });
  $('zoomFit').addEventListener('click', () => { try { if (cy) cy.fit(50); } catch (e) { } });

  // templates
  $('applyTpl').addEventListener('click', () => {
    const v = $('templateSel').value; if (!v) return;
    if (v === 'users') {
      schema.tables['users'] = { columns: { id: { type: 'SERIAL', nullable: false, pk: true }, name: { type: 'VARCHAR(255)', nullable: false }, email: { type: 'VARCHAR(255)', nullable: false } }, pk: 'id' };
    }
    if (v === 'ecommerce') {
      schema.tables['products'] = { columns: { product_id: { type: 'SERIAL', pk: true }, name: { type: 'VARCHAR(255)' }, price: { type: 'DECIMAL(10,2)' } }, pk: 'product_id' };
      schema.tables['orders'] = { columns: { order_id: { type: 'SERIAL', pk: true }, user_id: { type: 'INTEGER' }, total: { type: 'DECIMAL(10,2)' } }, pk: 'order_id' };
      schema.tables['order_items'] = { columns: { id: { type: 'SERIAL', pk: true }, order_id: { type: 'INTEGER', fk: { table: 'orders', column: 'order_id' } }, product_id: { type: 'INTEGER', fk: { table: 'products', column: 'product_id' } }, qty: { type: 'INTEGER' } }, pk: 'id' };
    }
    if (v === 'blog') {
      schema.tables['authors'] = { columns: { id: { type: 'SERIAL', pk: true }, name: { type: 'VARCHAR(255)' } }, pk: 'id' };
      schema.tables['posts'] = { columns: { id: { type: 'SERIAL', pk: true }, author_id: { type: 'INTEGER', fk: { table: 'authors', column: 'id' } }, title: { type: 'VARCHAR(255)' }, content: { type: 'TEXT' } }, pk: 'id' };
      schema.tables['comments'] = { columns: { id: { type: 'SERIAL', pk: true }, post_id: { type: 'INTEGER', fk: { table: 'posts', column: 'id' } }, body: { type: 'TEXT' } }, pk: 'id' };
    }
    updateAfterChange();
  });

  // quick export SQL
  $('exportSqlQuick').addEventListener('click', () => { updateSqlArea(); const a = document.createElement('a'); a.href = 'data:text/sql;charset=utf-8,' + encodeURIComponent($('sqlArea').textContent); a.download = 'schema.sql'; a.click(); });

  // save/load JSON
  $('saveJson').addEventListener('click', () => { const json = JSON.stringify(schema, null, 2); const a = document.createElement('a'); a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(json); a.download = 'schema.json'; a.click(); });

  $('loadJsonBtn').addEventListener('click', () => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json'; input.onchange = e => {
      const file = e.target.files[0]; const reader = new FileReader(); reader.onload = ev => {
        try {
          const obj = JSON.parse(ev.target.result); if (obj.tables) { // replace schema
            Object.keys(schema).forEach(k => delete schema[k]); Object.assign(schema, obj); refreshTablesList(); updateAfterChange(); alert('Loaded');
          } else alert('Invalid schema file');
        } catch (err) { alert('Invalid JSON'); }
      }; reader.readAsText(file);
    }; input.click();
  });

  // search
  $('tableSearch').addEventListener('input', e => refreshTablesList(e.target.value));

  // clear all
  $('clearAll').addEventListener('click', () => { if (!confirm('Clear entire schema?')) return; Object.keys(schema.tables).forEach(k => delete schema.tables[k]); pushHistory(); refreshTablesList(); updateAfterChange(); });

  // undo/redo
  $('undoBtn').addEventListener('click', () => undo());
  $('redoBtn').addEventListener('click', () => redo());

  // initial
  initCytoscape(); refreshTablesList(); updateAfterChange(false); // don't push twice
  pushHistory();
  populateRelSelectors();

});
