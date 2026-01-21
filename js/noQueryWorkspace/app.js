
// --- State ---
let fullData = [];
let filteredData = [];
let currentView = [];
let currentPage = 1;
let chart = null;

// Elements
const fileInput = document.getElementById('fileInput');
const uploader = document.getElementById('uploader');
const loadBtn = document.getElementById('loadBtn');
const rowCount = document.getElementById('rowCount');
const colCount = document.getElementById('colCount');
const schemaSummary = document.getElementById('schemaSummary');
const columnsContainer = document.getElementById('columnsContainer');
const addFilterBtn = document.getElementById('addFilterBtn');
const addOrderBtn = document.getElementById('addOrderBtn');
const runQueryBtn = document.getElementById('runQueryBtn');
const filterContainer = document.getElementById('filterContainer');
const orderContainer = document.getElementById('orderContainer');
const groupBySelect = document.getElementById('groupBySelect');
const aggFuncSelect = document.getElementById('aggFuncSelect');
const aggFieldSelect = document.getElementById('aggFieldSelect');
const dataTable = document.getElementById('dataTable');
const pagination = document.getElementById('pagination');
const showingCount = document.getElementById('showingCount');
const runtimeEl = document.getElementById('runtime');
const globalSearch = document.getElementById('globalSearch');
const pageSizeSel = document.getElementById('pageSizeSel');
const selectAllCols = document.getElementById('selectAllCols');

const pageSizeDefault = () => parseInt(pageSizeSel.value || '10', 10);

// --- Helpers ---
function detectType(values) {
    // Basic detection: number, boolean, date, string
    let num = 0, bool = 0, datec = 0, str = 0, samples = 0;
    for (const v of (values || []).slice(0, 50)) {
        samples++;
        if (v === null || v === undefined || v === '') { continue }
        if (typeof v === 'boolean') { bool++; continue }
        const n = parseFloat(String(v).replace(/,/g, ''));
        if (!isNaN(n) && isFinite(n)) { num++; continue }
        const d = Date.parse(v);
        if (!isNaN(d)) { datec++; continue }
        str++;
    }
    if (samples === 0) return 'string';
    if (num > samples * 0.6) return 'number';
    if (datec > samples * 0.6) return 'date';
    if (bool > samples * 0.6) return 'boolean';
    return 'string';
}

function formatNumber(n) { return (n || 0).toLocaleString(); }

function safeGet(obj, key) { return obj && Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : null }

// --- UI building ---
function populateColumnsUI(cols) {
    columnsContainer.innerHTML = '';
    (cols || []).forEach(c => {
        const id = 'col_' + String(c).replace(/\W/g, '_');
        const div = document.createElement('div');
        div.className = 'form-check';
        div.innerHTML = `<input class="form-check-input" type="checkbox" id="${id}" value="${c}" checked>
                         <label class="form-check-label" for="${id}">${c}</label>`;
        columnsContainer.appendChild(div);
    });

    groupBySelect.innerHTML = '<option value="">(Group by)</option>';
    aggFieldSelect.innerHTML = '<option value="">(Field)</option>';
    (cols || []).forEach(c => {
        groupBySelect.insertAdjacentHTML('beforeend', `<option value="${c}">${c}</option>`);
        aggFieldSelect.insertAdjacentHTML('beforeend', `<option value="${c}">${c}</option>`);
    });
}

function getSelectedColumns() {
    return Array.from(columnsContainer.querySelectorAll('input[type=checkbox]:checked')).map(i => i.value);
}

selectAllCols.onclick = () => {
    const chks = columnsContainer.querySelectorAll('input[type=checkbox]');
    chks.forEach(c => c.checked = true);
};

// --- Filters & Orders ---
function addFilterRow(fieldOptions = []) {
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
            <option value=">">&gt;</option>
            <option value="<">&lt;</option>
            <option value=">=">&gt;=</option>
            <option value="<=">&lt;=</option>
            <option value="contains">contains</option>
          </select>
        </div>
        <div class="col-3">
          <input class="form-control form-control-sm filterValue" placeholder="Value">
        </div>
        <div class="col-1 text-end">
          <button class="btn btn-sm btn-outline-danger removeFilterBtn" title="Remove"><i class="bi bi-trash"></i></button>
        </div>`;
    filterContainer.appendChild(row);
    const sel = row.querySelector('.filterField');
    (fieldOptions || []).forEach(f => sel.insertAdjacentHTML('beforeend', `<option value="${f}">${f}</option>`));
    row.querySelector('.removeFilterBtn').onclick = () => row.remove();
}

function addOrderRule(fieldOptions = []) {
    const el = document.createElement('div');
    el.className = 'row g-2 align-items-center mb-2 order-row';
    el.innerHTML = `
        <div class="col-7"><select class="form-select form-select-sm orderField"><option value="">(Field)</option></select></div>
        <div class="col-3"><select class="form-select form-select-sm orderDir"><option value="asc">Asc</option><option value="desc">Desc</option></select></div>
        <div class="col-2 text-end"><button class="btn btn-sm btn-outline-danger removeOrderBtn"><i class="bi bi-trash"></i></button></div>`;
    orderContainer.appendChild(el);
    const sel = el.querySelector('.orderField');
    (fieldOptions || []).forEach(f => sel.insertAdjacentHTML('beforeend', `<option value="${f}">${f}</option>`));
    el.querySelector('.removeOrderBtn').onclick = () => el.remove();
}

addFilterBtn.onclick = () => addFilterRow(Object.keys(fullData[0] || {}));
addOrderBtn.onclick = () => addOrderRule(Object.keys(fullData[0] || {}));

// --- Core: apply query ---
function applyQuery() {
    const t0 = performance.now();
    let data = Array.isArray(fullData) ? [...fullData] : [];

    // WHERE filters
    Array.from(filterContainer.querySelectorAll('.filter-row')).forEach(row => {
        const field = row.querySelector('.filterField').value;
        const op = row.querySelector('.filterOp').value;
        const val = row.querySelector('.filterValue').value;
        if (!field || val === '') return;
        data = data.filter(r => {
            const rv = safeGet(r, field);
            if (rv === null || rv === undefined) return false;
            const s = String(rv).toLowerCase();
            const vv = String(val).toLowerCase();
            switch (op) {
                case '=': return s === vv;
                case '!=': return s !== vv;
                case '>': return parseFloat(String(rv).replace(/,/g, '')) > parseFloat(val);
                case '<': return parseFloat(String(rv).replace(/,/g, '')) < parseFloat(val);
                case '>=': return parseFloat(String(rv).replace(/,/g, '')) >= parseFloat(val);
                case '<=': return parseFloat(String(rv).replace(/,/g, '')) <= parseFloat(val);
                case 'contains': return s.includes(vv);
                default: return true;
            }
        });
    });

    // SELECT columns
    const cols = getSelectedColumns();
    if (cols.length) data = data.map(r => { const o = {}; cols.forEach(c => o[c] = r[c]); return o; });

    // GROUP + AGG
    const groupBy = groupBySelect.value;
    const aggFn = aggFuncSelect.value;
    const aggField = aggFieldSelect.value;
    if (groupBy && aggFn && aggField) {
        const groups = {};
        data.forEach(r => {
            const k = r[groupBy] == null ? '__NULL__' : String(r[groupBy]);
            groups[k] = groups[k] || [];
            groups[k].push(r);
        });
        data = Object.entries(groups).map(([k, arr]) => {
            const out = {}; out[groupBy] = k === '__NULL__' ? null : k;
            switch (aggFn) {
                case 'sum':
                    out[`${aggFn}(${aggField})`] = arr.reduce((a, b) => a + (parseFloat(b[aggField]) || 0), 0);
                    break;
                case 'avg':
                    out[`${aggFn}(${aggField})`] = arr.reduce((a, b) => a + (parseFloat(b[aggField]) || 0), 0) / arr.length;
                    break;
                case 'count':
                    out[`${aggFn}(${aggField})`] = arr.length;
                    break;
                case 'max':
                    out[`${aggFn}(${aggField})`] = Math.max(...arr.map(x => parseFloat(x[aggField]) || -Infinity));
                    break;
                case 'min':
                    out[`${aggFn}(${aggField})`] = Math.min(...arr.map(x => parseFloat(x[aggField]) || Infinity));
                    break;
            }
            return out;
        });
    }

    // ORDER BY
    const orderRules = Array.from(orderContainer.querySelectorAll('.order-row')).map(r => {
        const f = r.querySelector('.orderField')?.value; const d = r.querySelector('.orderDir')?.value || 'asc';
        return f ? { field: f, dir: d } : null;
    }).filter(Boolean);
    if (orderRules.length) {
        data.sort((a, b) => {
            for (const rule of orderRules) {
                const fa = a[rule.field]; const fb = b[rule.field];
                if (fa == null && fb != null) return rule.dir === 'asc' ? -1 : 1;
                if (fb == null && fa != null) return rule.dir === 'asc' ? 1 : -1;
                if (fa < fb) return rule.dir === 'asc' ? -1 : 1;
                if (fa > fb) return rule.dir === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }

    filteredData = data;
    currentView = [...filteredData];
    currentPage = 1;
    renderTable();
    renderChart();
    const t1 = performance.now();
    runtimeEl.textContent = Math.round(t1 - t0) + ' ms';
}

runQueryBtn.onclick = applyQuery;

// --- Render table/pagination/chart ---
function renderTable() {
    const thead = dataTable.querySelector('thead');
    const tbody = dataTable.querySelector('tbody');
    thead.innerHTML = ''; tbody.innerHTML = '';
    if (!Array.isArray(currentView) || !currentView.length) {
        thead.innerHTML = '<tr><th>No data</th></tr>';
        showingCount.textContent = '0';
        return;
    }
    const cols = Object.keys(currentView[0] || {});
    thead.innerHTML = `<tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr>`;
    const ps = pageSizeDefault();
    const total = currentView.length;
    const pages = Math.max(1, Math.ceil(total / ps));
    if (currentPage > pages) currentPage = pages;
    const start = (currentPage - 1) * ps; const end = Math.min(total, start + ps);
    const slice = currentView.slice(start, end);
    tbody.innerHTML = slice.map(r => `<tr>${cols.map(c => `<td>${r[c] ?? ''}</td>`).join('')}</tr>`).join('');
    showingCount.textContent = `${start + 1}-${end} of ${formatNumber(total)}`;
    renderPaginationControls(pages);
}

function renderPaginationControls(totalPages) {
    pagination.innerHTML = '';

    const makeLi = (label, disabled, active, action) => {
        const li = document.createElement('li');
        li.className = 'page-item' + (disabled ? ' disabled' : '') + (active ? ' active' : '');
        const a = document.createElement('a');
        a.className = 'page-link';
        a.href = '#';
        a.innerHTML = label;
        if (!disabled && action) a.onclick = (e) => { e.preventDefault(); action(); };
        li.appendChild(a);
        return li;
    };

    pagination.appendChild(makeLi('&laquo;', currentPage === 1, false, () => { currentPage = 1; renderTable(); }));
    pagination.appendChild(makeLi('&lt;', currentPage === 1, false, () => { if (currentPage > 1) currentPage--; renderTable(); }));

    // show sliding window of pages (2 pages left/right)
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);
    for (let p = start; p <= end; p++) {
        pagination.appendChild(makeLi(String(p), false, p === currentPage, () => { currentPage = p; renderTable(); }));
    }

    pagination.appendChild(makeLi('&gt;', currentPage === totalPages, false, () => { if (currentPage < totalPages) currentPage++; renderTable(); }));
    pagination.appendChild(makeLi('&raquo;', currentPage === totalPages, false, () => { currentPage = totalPages; renderTable(); }));
}

function renderChart() {
    const canvas = document.getElementById('chartCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return;
    if (chart) chart.destroy();
    if (!currentView.length) return;
    const cols = Object.keys(currentView[0] || {});
    const x = cols[0]; const y = cols[1] || cols[0];
    const labels = currentView.map(r => r[x]);
    const data = currentView.map(r => parseFloat(String(r[y]).replace(/,/g, '')) || 0);
    try {
        chart = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets: [{ label: y, data }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { x: { ticks: { autoSkip: true } } } }
        });
    } catch (e) {
        console.warn('Chart render failed', e);
    }
}

// --- File handling ---
function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => {
            try {
                if (file.name.toLowerCase().endsWith('.json')) {
                    const txt = new TextDecoder().decode(e.target.result);
                    resolve(JSON.parse(txt));
                } else {
                    // use array buffer for XLSX
                    const data = new Uint8Array(e.target.result);
                    const wb = XLSX.read(data, { type: 'array' });
                    const sheet = wb.Sheets[wb.SheetNames[0]];
                    const dataArr = XLSX.utils.sheet_to_json(sheet, { defval: null });
                    resolve(dataArr);
                }
            } catch (err) { reject(err); }
        };
        reader.onerror = (ev) => reject(new Error('File read error'));
        if (file.name.toLowerCase().endsWith('.json')) reader.readAsArrayBuffer(file); else reader.readAsArrayBuffer(file);
    });
}

async function handleFile(file) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert('Max 10 MB allowed'); return; }
    uploader.classList.remove('dragover');
    try {
        const data = await readFile(file);
        if (!Array.isArray(data)) throw new Error('Unsupported JSON structure — expected array of objects.');
        fullData = data.map((r, i) => ({ ...r, _row_index: i + 1 }));
        filteredData = [...fullData];
        currentView = [...fullData];
        // Populate UI
        const cols = Object.keys(fullData[0] || {});
        rowCount.textContent = formatNumber(fullData.length) + ' rows';
        colCount.textContent = cols.length + ' columns';
        const types = cols.map(c => `${c}: ${detectType(fullData.map(r => r[c]))}`);
        schemaSummary.textContent = types.slice(0, 6).join(' • ') || 'No columns';
        populateColumnsUI(cols);
        renderTable(); renderChart();
    } catch (err) { alert('Failed to load file: ' + (err && err.message ? err.message : err)); }
}

// uploader click + drag/drop
// input now covers uploader area; loadBtn opens picker too
uploader.addEventListener('dragover', e => { e.preventDefault(); uploader.classList.add('dragover'); });
uploader.addEventListener('dragleave', e => { e.preventDefault(); uploader.classList.remove('dragover'); });
uploader.addEventListener('drop', e => {
    e.preventDefault();
    uploader.classList.remove('dragover');
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) handleFile(f);
});
fileInput.onchange = (e) => handleFile(e.target.files[0]);
loadBtn.onclick = () => fileInput.click();

// --- Search debounce ---
let searchTimer = null;
globalSearch.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        const q = globalSearch.value.trim().toLowerCase();
        if (!q) { currentView = [...filteredData]; renderTable(); renderChart(); return; }
        const cols = Object.keys(filteredData[0] || {});
        currentView = filteredData.filter(r => cols.some(c => String(r[c] || '').toLowerCase().includes(q)));
        currentPage = 1; renderTable(); renderChart();
    }, 300);
});

// --- Exports ---
function exportData(format = 'xlsx') {
    try {
        const ws = XLSX.utils.json_to_sheet(filteredData || []);
        if (format === 'csv') {
            const csv = XLSX.utils.sheet_to_csv(ws);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'datalens_export.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
        } else {
            const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Results');
            XLSX.writeFile(wb, `datalens_export.xlsx`);
        }
    } catch (e) {
        alert('Export failed: ' + e.message);
    }
}
document.getElementById('exportCSVBtn').onclick = () => exportData('csv');
document.getElementById('exportExcelBtn').onclick = () => exportData('xlsx');
document.getElementById('downloadViewBtn').onclick = () => {
    try {
        const ws = XLSX.utils.json_to_sheet(currentView || []);
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'View'); XLSX.writeFile(wb, 'datalens_view.xlsx');
    } catch (e) { alert('Download failed: ' + e.message); }
}

// copy to clipboard
document.getElementById('copyBtn').onclick = async () => {
    const rows = Array.from(dataTable.querySelectorAll('tr')).map(tr => Array.from(tr.querySelectorAll('th,td')).map(td => td.innerText).join('\t')).join('\n');
    try { await navigator.clipboard.writeText(rows); alert('Table copied to clipboard'); } catch (e) { alert('Copy failed'); }
}

// clear filters
document.getElementById('clearFilters').onclick = () => { filterContainer.innerHTML = ''; }

// page size change
pageSizeSel.onchange = () => renderTable();

// reset query
document.getElementById('resetQueryBtn').onclick = () => {
    // reselect all columns
    Array.from(columnsContainer.querySelectorAll('input[type=checkbox]')).forEach(c => c.checked = true);
    filterContainer.innerHTML = '';
    orderContainer.innerHTML = '';
    groupBySelect.value = '';
    aggFuncSelect.value = '';
    aggFieldSelect.value = '';
    globalSearch.value = '';
    filteredData = [...fullData]; currentView = [...fullData]; currentPage = 1; renderTable(); renderChart();
}

// initial placeholder
renderTable();