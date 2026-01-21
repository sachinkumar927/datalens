// === Data load & normalize ===
function onDataLoaded(arr) {
    fullData = (arr || []).map(r => {
        const obj = {};
        Object.keys(r || {}).forEach(k => {
            const v = r[k];
            obj[k] = (v === '' ? null : v);
        });
        return obj;
    });
    filteredView = [...fullData];
    buildSchema();
    updateColumnList();
    applyGlobalSearch();
    el('fileInfo').textContent = `Loaded ${fullData.length} records`;
    populateValueCountsFieldSelect();
    renderAllTables();
}

function populateValueCountsFieldSelect() {
    const select = el('valueCountsFieldSelect');
    select.innerHTML = '<option value="">All Fields</option>';
    Object.keys(schema).forEach(field => {
        const option = document.createElement('option');
        option.value = field;
        option.textContent = field;
        select.appendChild(option);
    });
}

// === Table preview & search/pagination ===
function applyGlobalSearch() {
    const q = (el('globalSearch').value || '').trim().toLowerCase();
    if (!q) {
        filteredView = [...fullData];
    } else {
        filteredView = fullData.filter(row => {
            return Object.values(row || {}).some(v => String(v).toLowerCase().includes(q));
        });
    }
    currentPage = 1;
    renderTablePreview();
}

function renderTablePreview() {
    const container = el('dataTable');
    container.innerHTML = '';

    const table = document.createElement('table');
    table.className = 'table table-striped';
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');
    table.appendChild(thead);
    table.appendChild(tbody);
    container.appendChild(table);

    if (!filteredView.length) {
        thead.innerHTML = '<tr><th>No data</th></tr>';
        el('pageInfo').textContent = 'Showing 0-0 of 0 rows';
        el('pagination').innerHTML = '';
        return;
    }

    const cols = Array.from(new Set(filteredView.flatMap(r => Object.keys(r || {}))));
    thead.innerHTML = '<tr>' + cols.map(c => `<th>${escapeHtml(c)}</th>`).join('') + '</tr>';

    rowsPerPage = parseInt(el('rowsPerPage').value || '10');
    const total = filteredView.length;
    const pages = Math.max(1, Math.ceil(total / rowsPerPage));
    if (currentPage > pages) currentPage = pages;
    const start = (currentPage - 1) * rowsPerPage;
    const pageData = filteredView.slice(start, start + rowsPerPage);

    tbody.innerHTML = pageData.map(r => {
        return '<tr>' + cols.map(c => `<td>${escapeHtml((r && r[c]) == null ? '' : String(r[c]))}</td>`).join('') + '</tr>';
    }).join('');

    el('pageInfo').textContent = `Showing ${start + 1}-${start + pageData.length} of ${total} rows`;
    renderPaginationControls(pages);
}

function renderPaginationControls(totalPages) {
    const container = el('pagination');
    container.innerHTML = '';

    const makeLi = (label, cls, action) => {
        const li = document.createElement('li'); li.className = 'page-item ' + (cls || '');
        const a = document.createElement('a'); a.className = 'page-link'; a.href = '#'; a.innerHTML = label;
        if (action) a.onclick = (e) => { e.preventDefault(); action(); };
        li.appendChild(a); return li;
    };

    container.appendChild(makeLi('&laquo;', currentPage === 1 ? 'disabled' : '', () => { currentPage = 1; renderTablePreview(); }));
    container.appendChild(makeLi('<', currentPage === 1 ? 'disabled' : '', () => { if (currentPage > 1) currentPage--; renderTablePreview(); }));

    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);
    for (let p = start; p <= end; p++) {
        container.appendChild(makeLi(String(p), p === currentPage ? 'active' : '', () => { currentPage = p; renderTablePreview(); }));
    }

    container.appendChild(makeLi('>', currentPage === totalPages ? 'disabled' : '', () => { if (currentPage < totalPages) currentPage++; renderTablePreview(); }));
    container.appendChild(makeLi('&raquo;', currentPage === totalPages ? 'disabled' : '', () => { currentPage = totalPages; renderTablePreview(); }));
}

// === Section toggle functionality ===
document.addEventListener('DOMContentLoaded', () => {
    const sectionToggles = document.querySelectorAll('.section-toggle');
    sectionToggles.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const section = button.getAttribute('data-section');
            const sectionId = section + '-section';
            const sectionElement = document.getElementById(sectionId);
            if (sectionElement) {
                // Hide all sections
                document.querySelectorAll('[id$="-section"]').forEach(sec => {
                    sec.style.display = 'none';
                });
                // Show the selected section
                sectionElement.style.display = 'block';
                // Update active state
                sectionToggles.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
            }
        });
    });
    // Show field summaries section by default
    const defaultSection = document.getElementById('field-summaries-section');
    if (defaultSection) {
        defaultSection.style.display = 'block';
        const defaultButton = document.querySelector('.section-toggle[data-section="field-summaries"]');
        if (defaultButton) defaultButton.classList.add('active');
    }
});

// initial render
renderTablePreview();
renderFieldsSummaryTable();
updateSummaryCards();
updateDataTypeStats();
renderAllTables();
