// ---------- Table & pagination ----------
function renderTable() {
    const tbody = dataTable.querySelector('tbody');
    const thead = dataTable.querySelector('thead');
    tbody.innerHTML = ''; thead.innerHTML = '';
    if (!filteredRows || !filteredRows.length) {
        thead.innerHTML = '<tr><th>No data</th></tr>';
        showingCount.textContent = '0';
        return;
    }
    const visible = columns.filter(c => visibleColumns.has(c));
    // header
    const trHead = document.createElement('tr');
    visible.forEach(c => {
        const th = document.createElement('th');
        th.textContent = c;
        trHead.appendChild(th);
    });
    thead.appendChild(trHead);

    pageSize = Number(pageSizeSel.value || 10);
    const total = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * pageSize;
    const end = Math.min(total, start + pageSize);
    for (let i = start; i < end; i++) {
        const r = filteredRows[i];
        const tr = document.createElement('tr');
        visible.forEach(c => {
            const td = document.createElement('td');
            const v = r[c];
            td.textContent = (v === null || v === undefined) ? '' : String(v);
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    }
    showingCount.textContent = `${start + 1} - ${end} of ${total}`;
    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    paginationUL.innerHTML = '';
    function li(innerHTML, cls, onclick) {
        const li = document.createElement('li');
        li.className = 'page-item ' + (cls || '');
        li.innerHTML = `<a class="page-link" href="#">${innerHTML}</a>`;
        li.addEventListener('click', e => { e.preventDefault(); onclick && onclick(); });
        return li;
    }
    paginationUL.appendChild(li('&laquo;', currentPage === 1 ? 'disabled' : '', () => { if (currentPage > 1) { currentPage = 1; renderTable(); } }));
    paginationUL.appendChild(li('&lsaquo;', currentPage === 1 ? 'disabled' : '', () => { if (currentPage > 1) { currentPage--; renderTable(); } }));
    const maxButtons = 7;
    let start = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start < maxButtons - 1) start = Math.max(1, end - maxButtons + 1);
    for (let p = start; p <= end; p++) {
        const active = (p === currentPage) ? 'active' : '';
        paginationUL.appendChild(li(p, active, () => { currentPage = p; renderTable(); }));
    }
    paginationUL.appendChild(li('&rsaquo;', currentPage === totalPages ? 'disabled' : '', () => { if (currentPage < totalPages) { currentPage++; renderTable(); } }));
    paginationUL.appendChild(li('&raquo;', currentPage === totalPages ? 'disabled' : '', () => { if (currentPage < totalPages) { currentPage = totalPages; renderTable(); } }));
}
