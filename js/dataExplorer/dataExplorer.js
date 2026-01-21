(function () {
    // ---------- Utilities ----------
    function formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function flattenObject(obj, prefix = '', out = {}) {
        // Handle primitives & null
        if (obj === null || obj === undefined) {
            out[prefix.replace(/\.$/, '')] = null;
            return out;
        }

        // If not an object (string, number, boolean, Date)
        if (typeof obj !== 'object' || obj instanceof Date) {
            out[prefix.replace(/\.$/, '')] = obj;
            return out;
        }

        // Array handling
        if (Array.isArray(obj)) {

            // Case: primitive array → expand index-wise
            if (obj.every(v => v === null || typeof v !== 'object')) {
                obj.forEach((v, i) => {
                    out[`${prefix}${i}`] = v;
                });
                return out;
            }

            // Case: array of objects → flatten each with index prefix
            obj.forEach((v, i) => {
                flattenObject(v, `${prefix}${i}.`, out);
            });
            return out;
        }

        // Object handling
        Object.keys(obj).forEach(key => {
            flattenObject(obj[key], `${prefix}${key}.`, out);
        });

        return out;
    }


    function detectType(values) {
        let hasString = false;
        let hasNumber = false;
        let hasDate = false;
        let hasBool = false;
        for (let v of values) {
            if (v === null || v === undefined || v === '') continue;
            if (typeof v === 'boolean') { hasBool = true; continue; }
            if (!isNaN(Number(v)) && v !== true && v !== false) { hasNumber = true; continue; }
            const d = Date.parse(v);
            if (!isNaN(d)) { hasDate = true; continue; }
            hasString = true;
        }
        if (hasString && !hasNumber && !hasDate && !hasBool) return 'string';
        if (hasNumber && !hasString) return 'number';
        if (hasDate && !hasString && !hasNumber) return 'date';
        if (hasBool && !hasString) return 'boolean';
        if (hasNumber && hasString) return 'string';
        if (hasDate && (hasNumber || hasString)) return 'string';
        return 'string';
    }

    function csvEscape(value) {
        if (value === null || value === undefined) return '';
        const s = String(value);
        if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
            return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
    }

    function arrayToCSV(rows) {
        if (!rows || !rows.length) return '';
        const cols = Object.keys(rows[0]);
        const lines = [];
        lines.push(cols.map(csvEscape).join(','));
        for (const r of rows) {
            lines.push(cols.map(c => csvEscape(r[c])).join(','));
        }
        return lines.join('\n');
    }

    function downloadBlob(filename, blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; document.body.appendChild(a); a.click();
        setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
    }

    // ---------- IndexedDB ----------
    const DB_NAME = 'datalens_db_v1';
    const STORE = 'datasets';
    let dbPromise = null;
    function openDB() {
        if (dbPromise) return dbPromise;
        dbPromise = new Promise((res, rej) => {
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE)) {
                    db.createObjectStore(STORE, { keyPath: 'id' });
                }
            };
            req.onsuccess = (e) => res(e.target.result);
            req.onerror = () => rej(req.error);
        });
        return dbPromise;
    }

    async function saveDatasetToDB(datasetObj) {
        const db = await openDB();
        return new Promise((res, rej) => {
            const tx = db.transaction(STORE, 'readwrite');
            const store = tx.objectStore(STORE);
            store.put(datasetObj);
            tx.oncomplete = () => res(true);
            tx.onerror = () => rej(tx.error);
        });
    }

    async function getLatestDataset() {
        const db = await openDB();
        return new Promise((res, rej) => {
            const tx = db.transaction(STORE, 'readonly');
            const store = tx.objectStore(STORE);
            const req = store.get('latest');
            req.onsuccess = () => res(req.result || null);
            req.onerror = () => rej(req.error);
        });
    }

    async function clearDB() {
        const db = await openDB();
        return new Promise((res, rej) => {
            const tx = db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).clear();
            tx.oncomplete = () => res(true);
            tx.onerror = () => rej(tx.error);
        });
    }

    // ---------- Parsing ----------
    async function parseFile(file) {
        const name = file.name;
        const size = file.size;
        const type = file.type || '';
        const ext = (name.split('.').pop() || '').toLowerCase();

        const text = async () => {
            return new Promise((res, rej) => {
                const fr = new FileReader();
                fr.onload = e => res(e.target.result);
                fr.onerror = e => rej(e);
                fr.readAsText(file);
            });
        };

        if (['xlsx', 'xls'].includes(ext)) {
            const data = await file.arrayBuffer();
            const wb = XLSX.read(data, { type: 'array' });
            const sheetName = wb.SheetNames[0];
            const sheet = wb.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(sheet, { defval: null });
            return { rows: normalizeRows(json), filename: name, size, mime: type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
        }

        if (ext === 'json') {
            const t = await text();
            let parsed;
            try { parsed = JSON.parse(t); }
            catch (e) { throw new Error('Invalid JSON'); }
            let arr = [];
            if (Array.isArray(parsed)) arr = parsed;
            else {
                const arrProp = Object.keys(parsed).find(k => Array.isArray(parsed[k]));
                if (arrProp) arr = parsed[arrProp];
                else arr = [parsed];
            }
            const rows = arr.map(r => flattenObject(r, '', {}));
            return { rows: normalizeRows(rows), filename: name, size, mime: 'application/json' };
        }

        if (ext === 'xml') {
            const t = await text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(t, 'text/xml');
            const root = doc.documentElement;
            const children = Array.from(root.children);
            const tagCounts = {};
            children.forEach(c => tagCounts[c.tagName] = (tagCounts[c.tagName] || 0) + 1);
            let repeatingTag = null;
            for (const k in tagCounts) if (tagCounts[k] > 1) { repeatingTag = k; break; }
            const nodes = repeatingTag ? Array.from(root.getElementsByTagName(repeatingTag)) : children;
            const rows = nodes.map(n => {
                const obj = {};
                for (const child of Array.from(n.children)) {
                    obj[child.tagName] = child.textContent;
                }
                return obj;
            });
            return { rows: normalizeRows(rows), filename: name, size, mime: 'application/xml' };
        }

        // fallback for csv/txt
        const raw = await text();
        if (ext === 'csv' || ext === 'txt' || raw.includes(',') || raw.includes('\n')) {
            const lines = raw.split(/\r\n|\n/);
            if (lines.length === 0) return { rows: [], filename: name, size, mime: 'text/plain' };
            const headerLine = lines[0];
            function splitCSVLine(line) {
                const out = []; let cur = ''; let inQuote = false;
                for (let i = 0; i < line.length; i++) {
                    const ch = line[i];
                    if (ch === '"') { inQuote = !inQuote; continue; }
                    if (ch === ',' && !inQuote) { out.push(cur); cur = ''; continue; }
                    cur += ch;
                }
                out.push(cur);
                return out;
            }
            const headers = splitCSVLine(headerLine).map(h => h.trim());
            const rows = [];
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                const cells = splitCSVLine(lines[i]);
                const obj = {};
                for (let c = 0; c < headers.length; c++) obj[headers[c] || ('col' + c)] = (cells[c] !== undefined ? cells[c] : null);
                rows.push(obj);
            }
            return { rows: normalizeRows(rows), filename: name, size, mime: 'text/csv' };
        }

        try {
            const t2 = await text();
            const parsed = JSON.parse(t2);
            const arr = Array.isArray(parsed) ? parsed : [parsed];
            return { rows: normalizeRows(arr.map(r => flattenObject(r, '', {}))), filename: name, size, mime: 'application/json' };
        } catch (e) {
            const lines = (await text()).split(/\r\n|\n/).filter(Boolean);
            const rows = lines.map((l, i) => ({ line: l }));
            return { rows: normalizeRows(rows), filename: name, size, mime: 'text/plain' };
        }
    }

    function normalizeRows(rows) {
        const allKeys = new Set();
        rows.forEach(r => {
            if (typeof r !== 'object' || r === null) { allKeys.add('value'); }
            else Object.keys(r).forEach(k => allKeys.add(k));
        });
        const keys = Array.from(allKeys);
        return rows.map(r => {
            const out = {};
            keys.forEach(k => out[k] = (r && (k in r) ? r[k] : null));
            return out;
        });
    }

    // ---------- State ----------
    let rawRows = []; // original rows array of objects
    let columns = []; // list of column names
    let columnTypes = {}; // column -> type
    let filteredRows = []; // after filters & global search
    let visibleColumns = new Set();
    let currentPage = 1;
    let pageSize = 10;
    let chartInstance = null;

    // ---------- DOM references ----------
    const fileInput = document.getElementById('fileInput');
    const uploader = document.getElementById('uploader');
    const loadBtn = document.getElementById('loadBtn');
    const clearDBBtn = document.getElementById('clearDB');
    const infoFilename = document.getElementById('infoFilename');
    const infoMIME = document.getElementById('infoMIME');
    const infoSize = document.getElementById('infoSize');
    const infoRows = document.getElementById('infoRows');
    const infoCols = document.getElementById('infoCols');
    const rowCountChip = document.getElementById('rowCount');
    const colCountChip = document.getElementById('colCount');
    const schemaSummary = document.getElementById('schemaSummary');
    const columnsContainer = document.getElementById('columnsContainer');
    const selectAllColsBtn = document.getElementById('selectAllCols');

    const globalSearch = document.getElementById('globalSearch');
    const pageSizeSel = document.getElementById('pageSizeSel');

    const filterRulesArea = document.getElementById('filterRulesArea');
    const addFilterRuleBtn = document.getElementById('addFilterRuleBtn');
    const clearAllRulesBtn = document.getElementById('clearAllRulesBtn');
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');

    const dataTable = document.getElementById('dataTable');
    const paginationUL = document.getElementById('pagination');
    const showingCount = document.getElementById('showingCount');
    const runtimeEl = document.getElementById('runtime');

    const exportCSVBtn = document.getElementById('exportCSVBtn');
    const exportExcelBtn = document.getElementById('exportExcelBtn');
    const exportJSONBtn = document.getElementById('exportJSONBtn');
    const downloadViewBtn = document.getElementById('downloadViewBtn');
    const copyBtn = document.getElementById('copyBtn');

    const chartCanvas = document.getElementById('chartCanvas');
    const chartTypeSel = document.getElementById('chartType');
    const chartX = document.getElementById('chartX');
    const chartY = document.getElementById('chartY');
    const renderChartBtn = document.getElementById('renderChartBtn');
    const resetAllBtn = document.getElementById('resetAllBtn');

    const resetQueryBtn = document.getElementById('resetQueryBtn');
    const previewLimit = 100;

    // Attach event listener (best practice)
    globalSearch.addEventListener("input", function () {
        applyFiltersAndSearch();
    });

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

    // --------- Filtering & search ----------
    function applyFiltersAndSearch() {
        const start = performance.now();
        // gather filter rules
        const rules = [];
        filterRulesArea.querySelectorAll('.filter-rule').forEach(rule => {
            const col = rule.querySelector('.filter-col-select').value;
            const vals = Array.from(rule.querySelector('.filter-val-select').selectedOptions).map(o => o.value);
            if (col && vals.length > 0) rules.push({ col, vals: new Set(vals) });
        });

        const search = (globalSearch.value || '').toLowerCase().trim();

        filteredRows = rawRows.filter(row => {
            // rules: all must pass (AND)
            for (const r of rules) {
                const v = (row[r.col] === null || row[r.col] === undefined) ? '(null)' : String(row[r.col]);
                if (!r.vals.has(v)) return false;
            }
            // global search across visible columns
            if (search) {
                let matched = false;
                for (const col of columns) {
                    if (!visibleColumns.has(col)) continue;
                    const v = row[col];
                    if (v === null || v === undefined) continue;
                    if (String(v).toLowerCase().includes(search)) { matched = true; break; }
                }
                if (!matched) return false;
            }
            return true;
        });

        const end = performance.now();
        runtimeEl.textContent = `${Math.round(end - start)} ms`;
        currentPage = 1;
        renderTable();
    }

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

    // ---------- Exports ----------
    function exportCSV(rowsToExport) {
        const csv = arrayToCSV(rowsToExport);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        downloadBlob('export.csv', blob);
    }

    function exportJSON(rowsToExport) {
        const blob = new Blob([JSON.stringify(rowsToExport, null, 2)], { type: 'application/json' });
        downloadBlob('export.json', blob);
    }

    function exportExcel(rowsToExport) {
        const ws = XLSX.utils.json_to_sheet(rowsToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/octet-stream' });
        downloadBlob('export.xlsx', blob);
    }

    // ---------- Chart ----------
    function renderChart() {
        if (!filteredRows || !filteredRows.length) return alert('No data to chart.');

        const type = chartTypeSel.value;
        const xcol = chartX.value;
        const ycol = chartY.value;

        if (!xcol) return alert('Select X column (category).');
        if (!ycol) return alert('Select Y column (numeric).');

        // --- Prepare Data ---
        const map = new Map();
        filteredRows.forEach(r => {
            const x = r[xcol] === null || r[xcol] === undefined ? '(null)' : String(r[xcol]);
            const yv = Number(r[ycol]);
            const y = isNaN(yv) ? 0 : yv;
            map.set(x, (map.get(x) || 0) + y);
        });

        const labels = Array.from(map.keys()).slice(0, 1000);
        const data = labels.map(l => map.get(l));

        // --- Destroy existing chart ---
        if (chartInstance) chartInstance.destroy();

        const ctx = chartCanvas.getContext('2d');

        // --- Chart Config ---
        const cfg = {
            type: type,
            data: {
                labels,
                datasets: [{
                    label: `${ycol} by ${xcol}`,
                    data: data,

                    // ✅ Smooth line for line chart
                    tension: type === 'line' ? 0.4 : 0,

                    borderWidth: 2,
                    pointRadius: type === 'line' ? 3 : 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        };

        // Pie chart settings
        if (type === 'pie') {
            cfg.options.plugins = {
                legend: { position: 'right' }
            };
        }

        // --- Initialize Chart ---
        chartInstance = new Chart(ctx, cfg);
    }

    // ---------- Load / Save ----------
    async function handleFile(file) {
        try {
            const parsed = await parseFile(file);
            rawRows = parsed.rows;
            columns = rawRows.length ? Object.keys(rawRows[0]) : [];
            columnTypes = {}; // recalc
            columns.forEach(c => columnTypes[c] = detectType(rawRows.map(r => r[c])));
            infoFilename.textContent = parsed.filename;
            infoMIME.textContent = parsed.mime;
            infoSize.textContent = formatBytes(parsed.size);
            infoRows.textContent = rawRows.length;
            infoCols.textContent = columns.length;
            schemaSummary.textContent = `Columns: ${columns.slice(0, 10).join(', ')}` + (columns.length > 10 ? ' …' : '');
            renderColumnsCheckboxes();
            clearAllFilterRules();
            ensureAtLeastOneRule();
            populateChartSelectors();
            refreshAllFilterValues();
            filteredRows = rawRows.slice();
            currentPage = 1;
            renderTable();
            const datasetObj = {
                id: 'latest',
                filename: parsed.filename,
                mime: parsed.mime,
                size: parsed.size,
                rows: rawRows,
                columns,
                columnTypes,
                uploadedAt: new Date().toISOString()
            };
            await saveDatasetToDB(datasetObj);
        } catch (e) {
            alert('Failed to parse file: ' + (e && e.message ? e.message : e));
            console.error(e);
        }
    }

    // ---------- Events ----------
    fileInput.addEventListener('change', async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        if (f.size > 10 * 1024 * 1024) { if (!confirm('File > 10MB. Continue?')) return; }
        await handleFile(f);
        fileInput.value = '';
    });

    uploader.addEventListener('dragover', e => { e.preventDefault(); uploader.classList.add('dragover'); });
    uploader.addEventListener('dragleave', e => { e.preventDefault(); uploader.classList.remove('dragover'); });
    uploader.addEventListener('drop', async e => {
        e.preventDefault(); uploader.classList.remove('dragover');
        const f = e.dataTransfer.files[0];
        if (!f) return;
        await handleFile(f);
    });

    loadBtn.addEventListener('click', () => fileInput.click());
    clearDBBtn.addEventListener('click', async () => {
        if (!confirm('Clear stored dataset in IndexedDB?')) return;
        await clearDB();
        alert('Cleared.');
        location.reload();
    });

    selectAllColsBtn.addEventListener('click', () => {
        columnsContainer.querySelectorAll('.col-toggle').forEach(chk => { chk.checked = true; visibleColumns.add(chk.value); });
        renderTable();
    });

    addFilterRuleBtn.addEventListener('click', () => { createFilterRule(); });
    clearAllRulesBtn.addEventListener('click', () => { clearAllFilterRules(); ensureAtLeastOneRule(); });

    applyFiltersBtn.addEventListener('click', applyFiltersAndSearch);
    clearFiltersBtn.addEventListener('click', () => {
        clearAllFilterRules(); ensureAtLeastOneRule();
        globalSearch.value = '';
        applyFiltersAndSearch();
    });

    pageSizeSel.addEventListener('change', () => { currentPage = 1; renderTable(); });

    exportCSVBtn.addEventListener('click', () => {
        const rowsToExport = filteredRows.map(r => {
            const out = {};
            columns.forEach(c => { if (visibleColumns.has(c)) out[c] = r[c]; });
            return out;
        });
        exportCSV(rowsToExport);
    });
    exportExcelBtn.addEventListener('click', () => {
        const rowsToExport = filteredRows.map(r => {
            const out = {};
            columns.forEach(c => { if (visibleColumns.has(c)) out[c] = r[c]; });
            return out;
        });
        exportExcel(rowsToExport);
    });
    exportJSONBtn.addEventListener('click', () => {
        const rowsToExport = filteredRows.map(r => {
            const out = {};
            columns.forEach(c => { if (visibleColumns.has(c)) out[c] = r[c]; });
            return out;
        });
        exportJSON(rowsToExport);
    });

    downloadViewBtn.addEventListener('click', () => {
        const rowsToExport = filteredRows.map(r => {
            const out = {};
            columns.forEach(c => { if (visibleColumns.has(c)) out[c] = r[c]; });
            return out;
        });
        exportCSV(rowsToExport);
    });

    copyBtn.addEventListener('click', async () => {
        const rowsToCopy = filteredRows.map(r => {
            const out = {};
            columns.forEach(c => { if (visibleColumns.has(c)) out[c] = r[c]; });
            return out;
        });
        const txt = arrayToCSV(rowsToCopy);
        try { await navigator.clipboard.writeText(txt); alert('Copied to clipboard'); }
        catch (e) { alert('Copy failed: ' + e); }
    });

    renderChartBtn.addEventListener('click', renderChart);

    resetAllBtn.addEventListener('click', () => {
        if (!confirm('Reset filters, selections and chart?')) return;
        globalSearch.value = '';
        clearAllFilterRules(); ensureAtLeastOneRule();
        columnsContainer.querySelectorAll('.col-toggle').forEach(chk => chk.checked = true);
        visibleColumns = new Set(columns);
        filteredRows = rawRows.slice();
        currentPage = 1;
        renderTable();
        if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
    });

    resetQueryBtn.addEventListener('click', () => {
        globalSearch.value = '';
        clearAllFilterRules(); ensureAtLeastOneRule();
        filteredRows = rawRows.slice();
        currentPage = 1;
        renderTable();
    });

    pageSizeSel.addEventListener('change', renderTable);

    // ---------- load latest from DB on start ----------
    (async function init() {
        try {
            const latest = await getLatestDataset();
            if (latest) {
                rawRows = latest.rows || [];
                columns = latest.columns || (rawRows.length ? Object.keys(rawRows[0]) : []);
                columnTypes = latest.columnTypes || {};
                infoFilename.textContent = latest.filename || 'stored dataset';
                infoMIME.textContent = latest.mime || '';
                infoSize.textContent = latest.size ? formatBytes(latest.size) : '—';
                infoRows.textContent = rawRows.length;
                infoCols.textContent = columns.length;
                rowCountChip.textContent = rawRows.length + ' rows';
                colCountChip.textContent = columns.length + ' columns';
                schemaSummary.textContent = `Columns: ${columns.slice(0, 10).join(', ')}` + (columns.length > 10 ? ' …' : '');
                renderColumnsCheckboxes();
                clearAllFilterRules();
                ensureAtLeastOneRule();
                populateChartSelectors();
                refreshAllFilterValues();
                filteredRows = rawRows.slice();
                renderTable();
            } else {
                // ensure UI has at least one rule slot
                ensureAtLeastOneRule();
            }
        } catch (e) { console.warn('DB load error', e); ensureAtLeastOneRule(); }
    })();

    // small help
    document.getElementById('helpBtn').addEventListener('click', () => {
        alert('DataLens tips:\\n- Upload CSV/XLSX/JSON/XML/TXT.\\n- Add filter rules: choose a column then pick one or more values for that rule.\\n- Use Add rule to apply multiple column filters (AND).\\n- Export filtered view to CSV/Excel/JSON.\\n- Charts: select X (any column) and Y (numeric only).');
    });

})();
