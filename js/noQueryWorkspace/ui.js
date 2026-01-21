// UI building functions
window.populateColumnsUI = function(cols) {
    window.columnsContainer.innerHTML = '';
    (cols || []).forEach(c => {
        const id = 'col_' + String(c).replace(/\W/g, '_');
        const div = document.createElement('div');
        div.className = 'form-check';
        div.innerHTML = `<input class="form-check-input" type="checkbox" id="${id}" value="${c}" checked>
                         <label class="form-check-label" for="${id}">${c}</label>`;
        window.columnsContainer.appendChild(div);
    });

    window.groupBySelect.innerHTML = '<option value="">(Group by)</option>';
    window.aggFieldSelect.innerHTML = '<option value="">(Field)</option>';
    (cols || []).forEach(c => {
        window.groupBySelect.insertAdjacentHTML('beforeend', `<option value="${c}">${c}</option>`);
        window.aggFieldSelect.insertAdjacentHTML('beforeend', `<option value="${c}">${c}</option>`);
    });
};

window.getSelectedColumns = function() {
    return Array.from(window.columnsContainer.querySelectorAll('input[type=checkbox]:checked')).map(i => i.value);
};

window.selectAllCols.onclick = () => {
    const chks = window.columnsContainer.querySelectorAll('input[type=checkbox]');
    chks.forEach(c => c.checked = true);
};

window.addFilterRow = function(fieldOptions = []) {
    const row = document.createElement('div');
    row.className = 'row g-2 align-items-center mb-2 filter-row';
    row.innerHTML = `
        <div class="col-5">
          <select class="form-select form-select-sm filterField"><option value="">(Field)</option></select>
        </div>
        <div class="col-3">
          <select class="form-select form-select-sm filterOp">
            <option value="=">=</option>
            <option value="!=">!=</option>
            <option value=">">></option>
            <option value="<"><</option>
            <option value=">=">>=</option>
            <option value="<="><=</option>
            <option value="contains">contains</option>
          </select>
        </div>
        <div class="col-3">
          <input class="form-control form-control-sm filterValue" placeholder="Value">
        </div>
        <div class="col-1 text-end">
          <button class="btn btn-sm btn-outline-danger removeFilterBtn" title="Remove"><i class="bi bi-trash"></i></button>
        </div>`;
    window.filterContainer.appendChild(row);
    const sel = row.querySelector('.filterField');
    (fieldOptions || []).forEach(f => sel.insertAdjacentHTML('beforeend', `<option value="${f}">${f}</option>`));
    row.querySelector('.removeFilterBtn').onclick = () => row.remove();
};

window.addOrderRule = function(fieldOptions = []) {
    const el = document.createElement('div');
    el.className = 'row g-2 align-items-center mb-2 order-row';
    el.innerHTML = `
        <div class="col-7"><select class="form-select form-select-sm orderField"><option value="">(Field)</option></select></div>
        <div class="col-3"><select class="form-select form-select-sm orderDir"><option value="asc">Asc</option><option value="desc">Desc</option></select></div>
        <div class="col-2 text-end"><button class="btn btn-sm btn-outline-danger removeOrderBtn"><i class="bi bi-trash"></i></button></div>`;
    window.orderContainer.appendChild(el);
    const sel = el.querySelector('.orderField');
    (fieldOptions || []).forEach(f => sel.insertAdjacentHTML('beforeend', `<option value="${f}">${f}</option>`));
    el.querySelector('.removeOrderBtn').onclick = () => el.remove();
};

window.addFilterBtn.onclick = () => window.addFilterRow(Object.keys(window.fullData[0] || {}));
window.addOrderBtn.onclick = () => window.addOrderRule(Object.keys(window.fullData[0] || {}));
