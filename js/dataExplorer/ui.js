// ---------- Helpers for UI ----------
function renderColumnsCheckboxes() {
    columnsContainer.innerHTML = '';
    columns.forEach(col => {
        const id = 'colchk_' + col.replace(/[^\w]/g, '_');
        const div = document.createElement('div');
        div.className = 'form-check';
        div.innerHTML = `<input class="form-check-input col-toggle" type="checkbox" value="${col}" id="${id}" checked>
                         <label class="form-check-label small" for="${id}">${col} <span class="muted">(${columnTypes[col] || 'string'})</span></label>`;
        columnsContainer.appendChild(div);
    });
    visibleColumns = new Set(columns);
    columnsContainer.querySelectorAll('.col-toggle').forEach(chk => {
        chk.addEventListener('change', e => {
            const val = e.target.value;
            if (e.target.checked) visibleColumns.add(val); else visibleColumns.delete(val);
            renderTable();
            refreshAllFilterValues();
            populateChartSelectors();
        });
    });
}

// Create a filter rule element (column select + values multi-select + remove)
function createFilterRule(initialCol) {
    const idx = Date.now() + Math.floor(Math.random() * 1000);
    const wrapper = document.createElement('div');
    wrapper.className = 'col-12 filter-rule d-flex gap-2 align-items-start';
    wrapper.dataset.ruleId = idx;
    wrapper.innerHTML = `
    <div style="flex:1">
      <label class="form-label small mb-1">Column</label>
      <select class="form-select form-select-sm filter-col-select"></select>
    </div>
    <div style="flex:1">
      <label class="form-label small mb-1">Values (multi-select)</label>
      <select class="form-select form-select-sm filter-val-select" multiple></select>
    </div>
    <div style="width:48px; display:flex; align-items:flex-end;">
      <button class="btn btn-sm btn-outline-danger remove-rule-btn" title="Remove rule"><i class="bi bi-trash"></i></button>
    </div>
  `;
    filterRulesArea.appendChild(wrapper);

    const colSelect = wrapper.querySelector('.filter-col-select');
    const valSelect = wrapper.querySelector('.filter-val-select');
    const removeBtn = wrapper.querySelector('.remove-rule-btn');

    // populate columns
    const colsToShow = columns.slice();
    colSelect.innerHTML = '<option value="">— select column —</option>';
    colsToShow.forEach(c => {
        const opt = document.createElement('option'); opt.value = c; opt.textContent = `${c} (${columnTypes[c] || 'string'})`; colSelect.appendChild(opt);
    });
    if (initialCol) colSelect.value = initialCol;

    // when column changes populate values
    colSelect.addEventListener('change', () => {
        populateValuesForSelect(colSelect.value, valSelect);
    });

    // remove rule
    removeBtn.addEventListener('click', () => {
        wrapper.remove();
    });

    // if initial col provided, populate values
    if (initialCol) populateValuesForSelect(initialCol, valSelect);

    return wrapper;
}

function populateValuesForSelect(col, selectEl) {
    selectEl.innerHTML = '';
    if (!col) return;
    // unique values (limit 2000)
    const vals = Array.from(new Set(rawRows.map(r => (r[col] === null || r[col] === undefined) ? '(null)' : String(r[col])))).slice(0, 2000);
    // sort values (strings)
    vals.sort((a, b) => (a + '').localeCompare(b + ''));
    vals.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v;
        selectEl.appendChild(opt);
    });
}

function refreshAllFilterValues() {
    // for each existing rule, repopulate values for currently selected column
    filterRulesArea.querySelectorAll('.filter-rule').forEach(rule => {
        const colSelect = rule.querySelector('.filter-col-select');
        const valSelect = rule.querySelector('.filter-val-select');
        const col = colSelect.value;
        populateValuesForSelect(col, valSelect);
    });
}

function clearAllFilterRules() {
    filterRulesArea.innerHTML = '';
}

// populate initial single empty rule
function ensureAtLeastOneRule() {
    if (!filterRulesArea.querySelector('.filter-rule')) {
        createFilterRule();
    }
}

function populateChartSelectors() {
    chartX.innerHTML = '<option value="">—</option>';
    chartY.innerHTML = '<option value="">—</option>';
    let cols = columns.slice();
    // X: all columns
    cols.forEach(c => {
        const opt = document.createElement('option'); opt.value = c; opt.textContent = c; chartX.appendChild(opt);
    });
    // Y: numeric only (regardless of candidate radio; candidate controls available columns if needed)
    const numericCols = columns.filter(c => columnTypes[c] === 'number');
    numericCols.forEach(c => {
        const opt = document.createElement('option'); opt.value = c; opt.textContent = c; chartY.appendChild(opt);
    });
}
