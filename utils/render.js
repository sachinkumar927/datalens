import { app, el, renderAll } from "../index.js";
import { escapeHtml, unique } from "./common.js";
import { getFilteredSortedData } from "./dataFilter.js";
import { saveToStorage } from "./storage.js";
export function renderTable() {
    el.tableBody.innerHTML = '';
    el.tableHead.innerHTML = '';

    const data = getFilteredSortedData(app);
    const total = data.length;

    // Pagination
    const per = app.view.perPage = Number(el.rowsPerPage.value || app.view.perPage || 10);
    const totalPages = Math.max(1, Math.ceil(total / per));
    if (app.view.page > totalPages) app.view.page = 1;
    const start = (app.view.page - 1) * per;
    const pageData = data.slice(start, start + per);

    // --- Build header ---
    const headerRow = document.createElement('tr');
    const filterRow = document.createElement('tr'); // for column filters

    app.columns.forEach(col => {
        if (app.view.hiddenCols.has(col)) return;

        // Header cell
        const th = document.createElement('th');
        th.scope = 'col';
        th.className = 'align-middle';
        th.style.cursor = 'pointer';
        th.tabIndex = 0;
        th.setAttribute('role', 'columnheader');
        th.innerHTML = `<div class="d-flex align-items-center justify-content-between">
        <span class="col-title">${escapeHtml(col)}</span>
        <span class="col-sort ms-2 small text-muted"></span>
      </div>`;
        // Sorting
        th.addEventListener('click', () => toggleSort(col));
        th.addEventListener('keypress', (e) => { if (e.key === 'Enter') toggleSort(col); });

        const sortObj = app.view.sorts.find(s => s.col === col);
        if (sortObj) th.querySelector('.col-sort').innerHTML = sortObj.dir === 'asc' ? '&#9650;' : '&#9660;';

        headerRow.appendChild(th);

        // Filter input
        const filterTh = document.createElement('th');
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-control form-control-sm';
        input.placeholder = `Filter ${col}`;
        input.value = app.view.colFilters[col]?.input || '';
        input.addEventListener('input', (e) => {
            if (!app.view.colFilters[col]) app.view.colFilters[col] = { input: '' };
            app.view.colFilters[col].input = e.target.value;
            renderTable();
        });
        filterTh.appendChild(input);
        filterRow.appendChild(filterTh);
    });

    el.tableHead.appendChild(headerRow);
    el.tableHead.appendChild(filterRow);

    // --- Build body ---
    const tbodyFrag = document.createDocumentFragment();
    pageData.forEach((row, rIndex) => {
        const tr = document.createElement('tr');
        tr.dataset.index = start + rIndex;
        tr.tabIndex = 0;
        tr.addEventListener('click', () => tr.classList.toggle('selected'));

        app.columns.forEach(col => {
            if (app.view.hiddenCols.has(col)) return;

            const td = document.createElement('td');
            const v = row[col] === null || row[col] === undefined ? '' : row[col];

            // Apply column filter
            const filterVal = app.view.colFilters[col]?.input || '';
            if (filterVal && !String(v).toLowerCase().includes(filterVal.toLowerCase())) return;

            td.innerHTML = escapeHtml(String(v));
            tr.appendChild(td);
        });

        if (tr.childElementCount > 0) tbodyFrag.appendChild(tr);
    });

    el.tableBody.appendChild(tbodyFrag);

    // Update info
    el.pageInfo.textContent = `Showing ${Math.min(total, start + 1)}–${Math.min(total, start + pageData.length)} of ${total}`;
    el.infoRows.textContent = total;
    el.infoCols.textContent = app.columns.length - app.view.hiddenCols.size;

    // Table scroll shadow
    const wrapper = document.querySelector('.table-wrapper');
    const tableScroll = wrapper.querySelector('.table-responsive');
    tableScroll.onscroll = () => wrapper.classList.toggle('scrolled', tableScroll.scrollTop > 10);

    // Small-screen card view
    renderCardView(pageData);

    saveToStorage(app);
}

export function renderCardView(pageData) {
    const container = document.querySelector('.card-view');
    container.innerHTML = '';
    if (!pageData || pageData.length === 0) return;
    pageData.forEach((row, idx) => {
        const card = document.createElement('div');
        card.className = 'mb-2 p-2 border rounded fade-up in';
        const inner = document.createElement('div');
        inner.className = 'd-flex justify-content-between';
        inner.innerHTML = `<div><strong>Row ${idx + 1}</strong></div><div class="text-muted small">cols: ${Object.keys(row).length}</div>`;
        card.appendChild(inner);
        const list = document.createElement('dl');
        list.className = 'row small mb-0 mt-2';
        app.columns.forEach(col => {
            if (app.view.hiddenCols.has(col)) return;
            const dt = document.createElement('dt'); dt.className = 'col-5 text-truncate'; dt.textContent = col;
            const dd = document.createElement('dd'); dd.className = 'col-7'; dd.textContent = row[col] ?? '';
            list.appendChild(dt); list.appendChild(dd);
        });
        card.appendChild(list);
        container.appendChild(card);
    });
}

export function renderPagination() {
    const data = getFilteredSortedData(app);
    const total = data.length;
    const per = app.view.perPage = Number(el.rowsPerPage.value || app.view.perPage || 10);
    const totalPages = Math.max(1, Math.ceil(total / per));
    el.pagination.innerHTML = '';
    // Prev
    const createLi = (html, disabled = false, onClick = null) => {
        const li = document.createElement('li');
        li.className = 'page-item' + (disabled ? ' disabled' : '');
        const a = document.createElement('a');
        a.className = 'page-link';
        a.href = '#';
        a.innerHTML = html;
        a.addEventListener('click', (e) => { e.preventDefault(); if (!disabled && onClick) onClick(); });
        li.appendChild(a);
        return li;
    };
    el.pagination.appendChild(createLi('&laquo;', app.view.page === 1, () => { app.view.page = 1; renderTable(); renderPagination(); }));
    el.pagination.appendChild(createLi('&lsaquo;', app.view.page === 1, () => { if (app.view.page > 1) app.view.page--; renderTable(); renderPagination(); }));

    // show page numbers (compact)
    const start = Math.max(1, app.view.page - 2);
    const end = Math.min(totalPages, app.view.page + 2);
    for (let i = start; i <= end; i++) {
        const li = createLi(String(i), false, () => { app.view.page = i; renderTable(); renderPagination(); });
        if (i === app.view.page) li.classList.add('active');
        el.pagination.appendChild(li);
    }

    el.pagination.appendChild(createLi('&rsaquo;', app.view.page === totalPages, () => { if (app.view.page < totalPages) app.view.page++; renderTable(); renderPagination(); }));
    el.pagination.appendChild(createLi('&raquo;', app.view.page === totalPages, () => { app.view.page = totalPages; renderTable(); renderPagination(); }));
}

// ---------------------------
// Columns menu & filters
// ---------------------------
export function renderColsMenu() {
    el.colsList.innerHTML = '';
    app.columns.forEach(col => {
        const id = `colvis_${col}`;
        const row = document.createElement('div');
        row.className = 'col-12 d-flex align-items-center';
        row.innerHTML = `
        <div class="form-check">
          <input class="form-check-input col-vis-checkbox" type="checkbox" id="${id}" ${app.view.hiddenCols.has(col) ? '' : 'checked'}>
          <label class="form-check-label" for="${id}">${escapeHtml(col)}</label>
        </div>
      `;
        el.colsList.appendChild(row);
        row.querySelector('input').addEventListener('change', (e) => {
            if (e.target.checked) app.view.hiddenCols.delete(col);
            else app.view.hiddenCols.add(col);
            renderAll();
        });
    });
}

export function renderFilters() {
    el.colFilters.innerHTML = '';
    // Lists of unique values (categorical) for each column (but limit to columns with reasonable cardinality)
    app.columns.forEach(col => {
        const values = unique(app.dataRaw.map(r => r[col] === undefined || r[col] === null ? '' : String(r[col])));
        // skip if too many unique values (>200)
        if (values.length > 200) return;
        const div = document.createElement('div');
        div.className = 'mb-2';
        div.innerHTML = `<div class="fw-semibold">${escapeHtml(col)} <small class="text-muted">(${values.length})</small></div>`;
        const inner = document.createElement('div');
        inner.className = 'd-flex flex-wrap gap-1 mt-1';
        values.slice(0, 200).forEach(v => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-outline-secondary btn-sm';
            btn.textContent = v === '' ? '(empty)' : v;
            if (app.view.colFilters[col] && app.view.colFilters[col].has(v)) btn.classList.remove('btn-outline-secondary'), btn.classList.add('btn-secondary');
            btn.addEventListener('click', () => {
                if (!app.view.colFilters[col]) app.view.colFilters[col] = new Set();
                if (app.view.colFilters[col].has(v)) app.view.colFilters[col].delete(v);
                else app.view.colFilters[col].add(v);
                renderTable(); renderFilters();
            });
            inner.appendChild(btn);
        });
        div.appendChild(inner);
        const clearBtn = document.createElement('div');
        clearBtn.innerHTML = `<button class="btn btn-link btn-sm text-danger mt-1">Clear filter</button>`;
        clearBtn.querySelector('button').addEventListener('click', () => {
            delete app.view.colFilters[col];
            renderTable(); renderFilters();
        });
        div.appendChild(clearBtn);
        el.colFilters.appendChild(div);
    });
}

// Sorting
function toggleSort(col) {
    const existing = app.view.sorts.find(s => s.col === col);
    if (!existing) {
        app.view.sorts.unshift({ col, dir: 'asc' });
    } else if (existing.dir === 'asc') {
        existing.dir = 'desc';
    } else {
        // remove sort (none)
        app.view.sorts = app.view.sorts.filter(s => s.col !== col);
    }
    renderTable();
}
