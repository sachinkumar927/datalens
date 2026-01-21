
// /******************************************************************
//  * Fixed & polished Computation Engine (single-file)
//  ******************************************************************/

// // === App state ===
// let fullData = [];            // array of objects (records)
// let filteredView = [];        // after search/filter
// let schema = {};              // field -> meta
// let currentPage = 1;
// let rowsPerPage = 10;
// let charts = {};              // Chart.js instances: charts.fieldChart, charts.hist, charts.scatter
// let chartInstance = null;
// let scatterInstance = null;

// // sample dataset
// const sampleData = [
//     { id: 1, name: "Alice", age: 34, city: "Bangalore", active: true, joinDate: "2022-02-10" },
//     { id: 2, name: "Bob", age: 29, city: "Mumbai", active: false, joinDate: "2021-08-22" },
//     { id: 3, name: "Charlie", age: 41, city: "Delhi", active: true, joinDate: "2020-12-15" },
//     { id: 4, name: "Diana", age: null, city: "Chennai", active: false, joinDate: "2023-01-05" },
//     { id: 5, name: "Eve", age: 27, city: "Bangalore", active: true, joinDate: "2022-06-03" },
//     { id: 6, name: "Frank", age: 50, city: "Hyderabad", active: true, joinDate: "2019-03-11" },
//     { id: 7, name: "Gita", age: 38, city: "Mumbai", active: false, joinDate: "2018-11-28" },
//     { id: 8, name: "Hari", age: 45, city: "Bangalore", active: true, joinDate: "2020-04-30" },
//     { id: 9, name: "Isha", age: null, city: "Chennai", active: false, joinDate: "2021-01-19" },
//     { id: 10, name: "Jay", age: 32, city: "Delhi", active: true, joinDate: "2022-09-09" },
//     { id: 11, name: "Kiran", age: 26, city: "Bangalore", active: true, joinDate: "2022-07-21" },
//     { id: 12, name: "Leena", age: 31, city: "Pune", active: false, joinDate: "2020-10-10" },
//     { id: 13, name: "Mohan", age: 39, city: "Mumbai", active: true, joinDate: "2019-05-02" },
//     { id: 14, name: "Nina", age: 28, city: "Hyderabad", active: false, joinDate: "2021-12-12" },
//     { id: 15, name: "Omar", age: 44, city: "Chennai", active: true, joinDate: "2017-07-07" }
// ];

// // Handy selectors
// const el = id => document.getElementById(id);

// // === Helpers: type detection and conversion ===
// function isDateString(s) {
//     if (s == null) return false;
//     // Accept ISO-like dates or common formats: try Date parse
//     const d = new Date(s);
//     return !isNaN(d.valueOf());
// }

// function isBooleanLike(v) {
//     if (typeof v === 'boolean') return true;
//     const s = String(v).trim().toLowerCase();
//     return ['true', 'false', '0', '1', 'yes', 'no'].includes(s);
// }

// function isNumberLike(v) {
//     if (v == null || v === '') return false;
//     // Strings that parse to finite numbers
//     return !isNaN(parseFloat(String(v))) && isFinite(Number(String(v)));
// }

// function toNumberSafe(v) {
//     if (v == null || v === '') return null;
//     const n = Number(String(v));
//     return isFinite(n) ? n : null;
// }

// function isNumeric(n) {
//     return typeof n === 'number' && isFinite(n);
// }

// // infer type for an array of values
// function inferType(values) {
//     const counts = { number: 0, string: 0, boolean: 0, date: 0, empty: 0 };
//     for (const v of values) {
//         if (v === null || v === undefined || v === "") { counts.empty++; continue; }
//         if (typeof v === 'boolean') { counts.boolean++; continue; }
//         if (isNumberLike(v)) { counts.number++; continue; }
//         if (isDateString(v)) { counts.date++; continue; }
//         if (isBooleanLike(v)) { counts.boolean++; continue; }
//         counts.string++;
//     }
//     // pick dominant
//     const nonEmptyKeys = Object.keys(counts).filter(k => k !== 'empty');
//     let best = 'string', bestCount = -1;
//     for (const k of nonEmptyKeys) {
//         if (counts[k] > bestCount) { best = k; bestCount = counts[k]; }
//     }
//     // if multiple significant types -> mixed
//     const nonZero = nonEmptyKeys.filter(k => counts[k] > 0);
//     if (nonZero.length > 1) return 'mixed';
//     if (best === 'empty') return 'empty';
//     return best;
// }

// function numericStats(values) {
//     const nums = values.map(v => toNumberSafe(v)).filter(v => v !== null);
//     if (!nums.length) return { count: 0, min: null, max: null, avg: null, median: null, unique: 0 };
//     nums.sort((a, b) => a - b);
//     const count = nums.length;
//     const min = nums[0], max = nums[nums.length - 1];
//     const sum = nums.reduce((s, x) => s + x, 0);
//     const avg = sum / count;
//     const median = (count % 2 === 1) ? nums[(count - 1) / 2] : (nums[count / 2 - 1] + nums[count / 2]) / 2;
//     const unique = new Set(nums).size;
//     return { count, min, max, avg, median, unique };
// }

// // === Schema building & rendering ===
// function buildSchema() {
//     schema = {};
//     if (!fullData.length) return;
//     const fields = new Set();
//     fullData.forEach(r => Object.keys(r || {}).forEach(k => fields.add(k)));
//     for (const f of fields) {
//         const vals = fullData.map(r => (r || {})[f]);
//         const inferred = inferType(vals);
//         const nullCount = vals.filter(v => v === null || v === undefined || v === "").length;
//         const unique = new Set(vals.filter(v => v !== null && v !== undefined && v !== "")).size;
//         const mixed = inferred === 'mixed';
//         schema[f] = { field: f, inferred, nullCount, unique, mixed, sample: vals.slice(0, 6) };
//     }
//     updateFieldSelect();
//     updateSummaryCards();
//     renderFieldsSummaryTable();
//     refreshVisualSelectors();
// }

// function updateSummaryCards() {
//     el('statRecords').textContent = fullData.length;
//     const fields = Object.keys(schema);
//     el('statFields').textContent = fields.length;
//     const numericCount = fields.filter(f => schema[f].inferred === 'number' || schema[f].inferred === 'mixed').length;
//     el('statNumeric').textContent = numericCount;
//     let totalNulls = 0;
//     fields.forEach(f => totalNulls += schema[f].nullCount || 0);
//     el('statNulls').textContent = totalNulls;
// }

// function updateFieldSelect() {
//     const sel = el('fieldSelect');
//     sel.innerHTML = '<option value="">(choose field)</option>';
//     Object.keys(schema).forEach(f => {
//         const opt = document.createElement('option');
//         opt.value = f; opt.textContent = f + ' • ' + schema[f].inferred;
//         sel.appendChild(opt);
//     });
//     sel.onchange = () => {
//         const f = sel.value; if (!f) { el('fieldDetail').textContent = 'No field selected'; return; }
//         renderFieldDetail(f);
//         renderFieldChart(f);
//     };
// }

// function renderFieldDetail(field) {
//     const meta = schema[field];
//     if (!meta) return;
//     const vals = fullData.map(r => (r || {})[field]);
//     const numericMeta = numericStats(vals);
//     const info = `
//         <div><strong>${escapeHtml(field)}</strong></div>
//         <div class="small-muted">Type: ${meta.inferred}${meta.mixed ? ' (mixed)' : ''}</div>
//         <div class="small-muted">Nulls: ${meta.nullCount} • Unique: ${meta.unique}</div>
//         <div class="small-muted">Sample: ${meta.sample.map(v => escapeHtml(String(v))).join(', ')}</div>
//         ${(meta.inferred === 'number' || meta.inferred === 'mixed') ? `<div class="small-muted">Min: ${numericMeta.min ?? '-'} • Max: ${numericMeta.max ?? '-'} • Avg: ${numericMeta.avg ? numericMeta.avg.toFixed(2) : '-'} • Median: ${numericMeta.median ?? '-'}</div>` : ''}
//       `;
//     el('fieldDetail').innerHTML = info;
// }

// function renderFieldsSummaryTable() {
//     const tbody = el('fieldsSummaryTable').querySelector('tbody');
//     tbody.innerHTML = '';
//     Object.keys(schema).forEach(field => {
//         const meta = schema[field];
//         const vals = fullData.map(r => (r || {})[field]);
//         const nmeta = numericStats(vals);
//         const row = document.createElement('tr');
//         if (meta.mixed) row.classList.add('field-mixed');
//         if (meta.nullCount > (fullData.length * 0.5)) row.classList.add('field-missing');
//         row.innerHTML = `
//           <td><strong>${escapeHtml(field)}</strong></td>
//           <td>${meta.inferred}</td>
//           <td>${meta.nullCount}</td>
//           <td>${meta.unique}</td>
//           <td>${nmeta.min ?? '-'}</td>
//           <td>${nmeta.max ?? '-'}</td>
//           <td>${nmeta.avg ? nmeta.avg.toFixed(2) : '-'}</td>
//           <td>${nmeta.median ?? '-'}</td>
//           <td><small>${meta.sample.map(v => escapeHtml(String(v))).join(', ')}</small></td>
//         `;
//         tbody.appendChild(row);
//     });
// }

// // === Visuals: field chart, histogram, scatter ===
// function renderFieldChart(field) {
//     const meta = schema[field];
//     if (!meta) return;
//     // destroy previous
//     if (charts.fieldChart) charts.fieldChart.destroy();
//     const ctx = el('fieldChart').getContext('2d');
//     const vals = fullData.map(r => (r || {})[field]).filter(v => v !== null && v !== undefined && v !== "");
//     if (meta.inferred === 'number' || meta.inferred === 'mixed') {
//         const numeric = vals.map(v => toNumberSafe(v)).filter(n => n !== null);
//         if (numeric.length === 0) {
//             charts.fieldChart = new Chart(ctx, { type: 'bar', data: { labels: ['no numeric data'], datasets: [{ data: [1] }] }, options: {} });
//             return;
//         }
//         const buckets = Math.min(12, 8 + Math.floor(Math.log2(numeric.length)));
//         const min = Math.min(...numeric), max = Math.max(...numeric);
//         const width = (max - min) / buckets || 1;
//         const labels = [], data = new Array(buckets).fill(0);
//         for (let i = 0; i < buckets; i++) labels.push((min + i * width).toFixed(2));
//         numeric.forEach(n => {
//             let idx = Math.floor((n - min) / width);
//             if (idx < 0) idx = 0;
//             if (idx >= buckets) idx = buckets - 1;
//             data[idx]++;
//         });
//         charts.fieldChart = new Chart(ctx, {
//             type: 'bar',
//             data: { labels, datasets: [{ label: field, data }] },
//             options: { responsive: true, maintainAspectRatio: false }
//         });
//     } else {
//         const freq = {};
//         vals.forEach(v => { const key = String(v); freq[key] = (freq[key] || 0) + 1; });
//         const entries = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 8);
//         const labels = entries.map(e => e[0]);
//         const data = entries.map(e => e[1]);
//         charts.fieldChart = new Chart(ctx, {
//             type: 'pie',
//             data: { labels, datasets: [{ data }] },
//             options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
//         });
//     }
// }

// // Histogram for any column selected in #chart-col
// function drawHistogram(col) {
//     if (!col) return;
//     // use fullData
//     const vals = fullData.map(r => (r || {})[col]).filter(v => v !== null && v !== undefined && String(v).trim() !== '');
//     const t = (schema[col] && schema[col].inferred) || inferType(vals.slice(0, 500));
//     // destroy old
//     if (charts.hist) charts.hist.destroy();
//     const ctx = el('chart-canvas').getContext('2d');
//     if (t === 'number' || t === 'mixed') {
//         const nums = vals.map(v => toNumberSafe(v)).filter(n => n !== null);
//         if (!nums.length) return;
//         const bins = Math.min(30, Math.max(6, Math.ceil(Math.sqrt(nums.length))));
//         const min = Math.min(...nums), max = Math.max(...nums);
//         const step = (max - min) / bins || 1;
//         const counts = new Array(bins).fill(0);
//         for (const n of nums) {
//             let idx = Math.floor((n - min) / step);
//             if (idx < 0) idx = 0;
//             if (idx >= bins) idx = bins - 1;
//             counts[idx]++;
//         }
//         const labels = []; for (let i = 0; i < bins; i++) labels.push((min + i * step).toFixed(2));
//         charts.hist = new Chart(ctx, { type: 'bar', data: { labels, datasets: [{ label: col, data: counts }] }, options: { responsive: true } });
//     } else {
//         const freq = {};
//         for (const v of vals) { const s = String(v); freq[s] = (freq[s] || 0) + 1; }
//         const arr = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 30);
//         const labels = arr.map(a => a[0]), data = arr.map(a => a[1]);
//         charts.hist = new Chart(ctx, { type: 'bar', data: { labels, datasets: [{ label: col, data }] }, options: { indexAxis: 'y', responsive: true } });
//     }
// }

// // Scatter: xCol vs yCol
// function drawScatter(xCol, yCol) {
//     if (!xCol || !yCol) return;
//     const pts = fullData.map(r => ({ x: toNumberSafe((r || {})[xCol]), y: toNumberSafe((r || {})[yCol]) })).filter(p => isNumeric(p.x) && isNumeric(p.y));
//     if (charts.scatter) charts.scatter.destroy();
//     const ctx = el('scatter-canvas').getContext('2d');
//     charts.scatter = new Chart(ctx, {
//         type: 'scatter',
//         data: { datasets: [{ label: `${yCol} vs ${xCol}`, data: pts }] },
//         options: {
//             responsive: true,
//             scales: {
//                 x: { title: { display: true, text: xCol } },
//                 y: { title: { display: true, text: yCol } }
//             }
//         }
//     });
// }

// // Refresh the column selectors used by visuals
// function refreshVisualSelectors() {
//     const cols = Object.keys(schema);
//     const colSelect = el('chart-col'), sx = el('scatter-x'), sy = el('scatter-y');
//     [colSelect, sx, sy].forEach(s => { s.innerHTML = '<option value="">(choose)</option>'; });
//     cols.forEach(c => {
//         const opt1 = document.createElement('option'); opt1.value = c; opt1.textContent = c + ' • ' + schema[c].inferred; colSelect.appendChild(opt1);
//         const opt2 = opt1.cloneNode(true); sx.appendChild(opt2);
//         const opt3 = opt1.cloneNode(true); sy.appendChild(opt3);
//     });
//     // bind events
//     colSelect.onchange = () => drawHistogram(colSelect.value);
//     sx.onchange = () => drawScatter(sx.value, sy.value);
//     sy.onchange = () => drawScatter(sx.value, sy.value);
// }

// // === Table preview & search/pagination ===
// function applyGlobalSearch() {
//     const q = (el('globalSearch').value || '').trim().toLowerCase();
//     if (!q) {
//         filteredView = [...fullData];
//     } else {
//         filteredView = fullData.filter(row => {
//             return Object.values(row || {}).some(v => String(v).toLowerCase().includes(q));
//         });
//     }
//     currentPage = 1;
//     renderTablePreview();
// }

// function renderTablePreview() {
//     const table = el('dataTable');
//     const thead = table.querySelector('thead');
//     const tbody = table.querySelector('tbody');
//     thead.innerHTML = ''; tbody.innerHTML = '';

//     if (!filteredView.length) {
//         thead.innerHTML = '<tr><th>No data</th></tr>';
//         el('pageInfo').textContent = 'Showing 0-0 of 0 rows';
//         el('pagination').innerHTML = '';
//         return;
//     }

//     // columns from schema (or from first row)
//     const cols = Array.from(new Set(filteredView.flatMap(r => Object.keys(r || {}))));
//     thead.innerHTML = '<tr>' + cols.map(c => `<th>${escapeHtml(c)}</th>`).join('') + '</tr>';

//     rowsPerPage = parseInt(el('rowsPerPage').value || '10');
//     const total = filteredView.length;
//     const pages = Math.max(1, Math.ceil(total / rowsPerPage));
//     if (currentPage > pages) currentPage = pages;
//     const start = (currentPage - 1) * rowsPerPage;
//     const pageData = filteredView.slice(start, start + rowsPerPage);

//     tbody.innerHTML = pageData.map(r => {
//         return '<tr>' + cols.map(c => `<td>${escapeHtml((r && r[c]) == null ? '' : String(r[c]))}</td>`).join('') + '</tr>';
//     }).join('');

//     el('pageInfo').textContent = `Showing ${currentPage} - ${pages} of ${total} rows`;
//     renderPaginationControls(pages);
// }

// function renderPaginationControls(totalPages) {
//     const container = el('pagination');
//     container.innerHTML = '';

//     const makeLi = (label, cls, action) => {
//         const li = document.createElement('li'); li.className = 'page-item ' + (cls || '');
//         const a = document.createElement('a'); a.className = 'page-link'; a.href = '#'; a.innerHTML = label;
//         if (action) a.onclick = (e) => { e.preventDefault(); action(); };
//         li.appendChild(a); return li;
//     };

//     container.appendChild(makeLi('&laquo;', currentPage === 1 ? 'disabled' : '', () => { currentPage = 1; renderTablePreview(); }));
//     container.appendChild(makeLi('&lt;', currentPage === 1 ? 'disabled' : '', () => { if (currentPage > 1) currentPage--; renderTablePreview(); }));

//     const start = Math.max(1, currentPage - 2);
//     const end = Math.min(totalPages, currentPage + 2);
//     for (let p = start; p <= end; p++) {
//         container.appendChild(makeLi(String(p), p === currentPage ? 'active' : '', () => { currentPage = p; renderTablePreview(); }));
//     }

//     container.appendChild(makeLi('&gt;', currentPage === totalPages ? 'disabled' : '', () => { if (currentPage < totalPages) currentPage++; renderTablePreview(); }));
//     container.appendChild(makeLi('&raquo;', currentPage === totalPages ? 'disabled' : '', () => { currentPage = totalPages; renderTablePreview(); }));
// }

// // === File parsing (CSV/Excel/JSON) ===
// async function parseFile(file) {
//     const name = (file.name || '').toLowerCase();
//     try {
//         if (name.endsWith('.json')) {
//             const txt = await file.text();
//             const parsed = JSON.parse(txt);
//             if (Array.isArray(parsed)) return parsed;
//             if (typeof parsed === 'object') return [parsed];
//             return [];
//         } else if (name.endsWith('.csv')) {
//             const txt = await file.text();
//             // parse via XLSX CSV parser
//             const wb = XLSX.read(txt, { type: 'string' });
//             const ws = wb.Sheets[wb.SheetNames[0]];
//             return XLSX.utils.sheet_to_json(ws, { defval: null });
//         } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
//             const buf = await file.arrayBuffer();
//             const wb = XLSX.read(buf, { type: 'array' });
//             const ws = wb.Sheets[wb.SheetNames[0]];
//             return XLSX.utils.sheet_to_json(ws, { defval: null });
//         } else {
//             alert('Unsupported file type');
//             return [];
//         }
//     } catch (err) {
//         console.error(err);
//         alert('Failed to parse file: ' + (err.message || err));
//         return [];
//     }
// }

// // === Exports ===
// function exportSummaryJSON() {
//     const summary = { records: fullData.length, fields: Object.keys(schema).length, schema };
//     const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement('a'); a.href = url; a.download = 'data_summary.json'; a.click(); URL.revokeObjectURL(url);
// }

// function exportSummaryCSV() {
//     const rows = [['field', 'type', 'nullCount', 'unique', 'sample']];
//     Object.values(schema).forEach(m => rows.push([m.field, m.inferred, m.nullCount, m.unique, JSON.stringify(m.sample)]));
//     const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
//     const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob);
//     const a = document.createElement('a'); a.href = url; a.download = 'schema_summary.csv'; a.click(); URL.revokeObjectURL(url);
// }

// function exportFilteredDataCSV() {
//     if (!filteredView.length) { alert('No data to export'); return; }
//     const cols = Array.from(new Set(filteredView.flatMap(r => Object.keys(r || {}))));
//     const rows = [cols];
//     filteredView.forEach(r => rows.push(cols.map(c => (r && r[c]) == null ? '' : String(r[c]))));
//     const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
//     const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob);
//     const a = document.createElement('a'); a.href = url; a.download = 'filtered_data.csv'; a.click(); URL.revokeObjectURL(url);
// }

// function exportFilteredDataExcel() {
//     if (!filteredView.length) { alert('No data to export'); return; }
//     const ws = XLSX.utils.json_to_sheet(filteredView);
//     const wb = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(wb, ws, 'Filtered');
//     XLSX.writeFile(wb, 'filtered_data.xlsx');
// }

// // === Data load & normalize ===
// function onDataLoaded(arr) {
//     fullData = (arr || []).map(r => {
//         const obj = {};
//         Object.keys(r || {}).forEach(k => {
//             const v = r[k];
//             // normalize empty strings to null, keep booleans and numbers
//             obj[k] = (v === '' ? null : v);
//         });
//         return obj;
//     });
//     filteredView = [...fullData];
//     buildSchema();
//     applyGlobalSearch();
//     el('fileInfo').textContent = `Loaded ${fullData.length} records`;
//     renderTopFields();
//     renderNumericInsights();
// }

// function renderTopFields() {
//     const container = el('topFields');
//     const keys = Object.keys(schema).slice(0, 6);
//     container.innerHTML = keys.map(k => `<div><strong>${escapeHtml(k)}</strong> • <span class="small-muted">${schema[k].inferred}</span></div>`).join('') || '—';
// }

// function renderNumericInsights() {
//     const container = el('numericInsights');
//     const numericFields = Object.keys(schema).filter(k => schema[k].inferred === 'number' || schema[k].inferred === 'mixed');
//     if (!numericFields.length) { container.textContent = 'No numeric fields detected'; return; }
//     const insights = numericFields.map(f => {
//         const stats = numericStats(fullData.map(r => (r || {})[f]));
//         return `<div><strong>${escapeHtml(f)}</strong>: min ${stats.min ?? '-'} • max ${stats.max ?? '-'} • avg ${stats.avg ? stats.avg.toFixed(1) : '-'}</div>`;
//     }).join('');
//     container.innerHTML = insights;
// }

// el('fileInput').onchange = async (e) => {
//     const f = e.target.files && e.target.files[0];
//     if (!f) return;
//     el('fileInfo').textContent = 'Parsing...';
//     const arr = await parseFile(f);
//     onDataLoaded(arr);
// };

// el('globalSearch').oninput = () => { applyGlobalSearch(); };
// el('rowsPerPage').onchange = () => { rowsPerPage = parseInt(el('rowsPerPage').value); currentPage = 1; renderTablePreview(); };

// el('exportSummaryBtn').onclick = () => {
//     const choice = prompt('Type "json" or "csv" or "excel" to export summary. (json/csv/excel)', 'json');
//     if (!choice) return; const ch = choice.toLowerCase();
//     if (ch === 'json') exportSummaryJSON();
//     else if (ch === 'csv') exportSummaryCSV();
//     else if (ch === 'excel') {
//         const rows = Object.values(schema).map(m => ({ field: m.field, type: m.inferred, nullCount: m.nullCount, unique: m.unique, sample: JSON.stringify(m.sample) }));
//         const ws = XLSX.utils.json_to_sheet(rows);
//         const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'schema');
//         XLSX.writeFile(wb, 'schema_summary.xlsx');
//     } else alert('Unknown option');
// };

// el('exportCSVData').onclick = () => exportFilteredDataCSV();
// el('exportExcelData').onclick = () => exportFilteredDataExcel();

// // keyboard shortcut to load sample
// document.addEventListener('keydown', (e) => {
//     if (e.key.toLowerCase() === 's' && (e.ctrlKey || e.metaKey)) {
//         e.preventDefault(); onDataLoaded(sampleData);
//     }
// });

// // window resize: keep charts responsive
// window.addEventListener('resize', () => {
//     if (charts.fieldChart) charts.fieldChart.resize();
//     if (charts.hist) charts.hist.resize();
//     if (charts.scatter) charts.scatter.resize();
// });

// // initial render
// renderTablePreview();
// renderFieldsSummaryTable();
// updateSummaryCards();

// // utility escape for HTML
// function escapeHtml(str) {
//     return String(str || '').replace(/[&<>"'`=\/]/g, function (s) {
//         return ({
//             '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;', '`': '&#x60;', '=': '&#x3D;'
//         })[s];
//     });
// }

// // run sample initially for quick demo
// // onDataLoaded(sampleData);
