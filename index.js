/************************************************************************
   * DataLens - Single file front-end data explorer
   * - All parsing & UI done in browser
   * - Libraries: PapaParse, SheetJS (XLSX), Chart.js
   *
   * Structure:
   *  - State: dataRaw (array of objects), columns (array), originalFile (File), viewState (filters, sort, pagination)
   *  - Parsing: parseFile() dispatches to CSV/Excel/JSON/TXT/XML handlers
   *  - Rendering: renderTable(), renderPagination(), renderColsMenu(), renderFilters()
   *  - Interactions: search, per-column filters, sorting, column visibility, export
   ************************************************************************/

// ---------------------------
// App state
// ---------------------------
const app = {
  dataRaw: [],        // full parsed data (array of objects)
  columns: [],        // column names order
  originalFile: null, // original File object
  originalFileDataURL: null, // for download original
  view: {             // view state: pagination, filters, sorts
    page: 1,
    perPage: 10,
    globalSearch: '',
    colFilters: {},   // { colName: Set(values) or {type:'range',min,max} }
    hiddenCols: new Set(),
    sorts: []         // [{col:'Name', dir: 'asc'|'desc'}] primary to secondary
  },
  theme: localStorage.getItem('datalens.theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
  persistLocal: false // whether to use localStorage persistence
};

// Constants / elements
const el = {
  fileInput: document.getElementById('fileInput'),
  dropZone: document.getElementById('dropZone'),
  fileType: document.getElementById('fileType'),
  infoFilename: document.getElementById('infoFilename'),
  infoMIME: document.getElementById('infoMIME'),
  infoSize: document.getElementById('infoSize'),
  infoRows: document.getElementById('infoRows'),
  infoCols: document.getElementById('infoCols'),
  tableHead: document.getElementById('tableHead'),
  tableBody: document.getElementById('tableBody'),
  rowsPerPage: document.getElementById('rowsPerPage'),
  pagination: document.getElementById('pagination'),
  pageInfo: document.getElementById('pageInfo'),
  globalSearch: document.getElementById('globalSearch'),
  colsList: document.getElementById('colsList'),
  colFilters: document.getElementById('colFilters'),
  btnExportCSV: document.getElementById('btnExportCSV'),
  btnExportXLSX: document.getElementById('btnExportXLSX'),
  btnDownloadOriginal: document.getElementById('btnDownloadOriginal'),
  btnSample: document.getElementById('btnSample'),
  btnClearStorage: document.getElementById('btnClearStorage'),
  btnResetView: document.getElementById('btnResetView'),
  persistLocalCheckbox: document.getElementById('persistLocal'),
  colsToggle: document.getElementById('colsToggle'),
  chartType: document.getElementById('chartType'),
  chartCat: document.getElementById('chartCat'),
  chartNum: document.getElementById('chartNum'),
  btnDrawChart: document.getElementById('btnDrawChart'),
  chartCanvas: document.getElementById('chartCanvas'),
  toggleTheme: document.getElementById('toggleTheme')
};

let chartInstance = null;

// utils
const notify = (msg, type = 'info', timeout = 3500) => {
  const id = 'n' + Date.now();
  const div = document.createElement('div');
  div.id = id;
  div.className = `toast align-items-center text-bg-${type} border-0`;
  div.role = 'alert';
  div.innerHTML = `<div class="d-flex"><div class="toast-body small">${msg}</div><button class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div>`;
  document.getElementById('notif').appendChild(div);
  const t = new bootstrap.Toast(div);
  t.show();
  if (timeout) setTimeout(() => t.hide(), timeout);
};
const humanFileSize = (size) => {
  if (size === 0) return '0 B';
  const i = Math.floor(Math.log(size) / Math.log(1024));
  return (size / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + ['B', 'KB', 'MB', 'GB', 'TB'][i];
};
const unique = (arr) => Array.from(new Set(arr));
const isNumericArray = (arr) => arr.every(v => v === null || v === '' || !isNaN(Number(v)));
const simpleAutoDelimiter = (text) => {
  // naive delimiter detection by sampling first lines
  const sample = text.split(/\r?\n/).slice(0, 5).join('\n');
  const counts = {
    ',': (sample.match(/,/g) || []).length,
    ';': (sample.match(/;/g) || []).length,
    '\t': (sample.match(/\t/g) || []).length,
    '|': (sample.match(/\|/g) || []).length
  };
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
};

// ---------------------------
// Persistence
// ---------------------------
const saveToStorage = () => {
  try {
    const payload = {
      columns: app.columns,
      dataRaw: app.dataRaw,
      view: {
        page: app.view.page,
        perPage: app.view.perPage,
        globalSearch: app.view.globalSearch,
        colFilters: Object.fromEntries(Object.entries(app.view.colFilters).map(([k, v]) => [k, Array.isArray(v) ? v : Array.from(v)])),
        hiddenCols: Array.from(app.view.hiddenCols),
        sorts: app.view.sorts
      },
      originalFilename: app.originalFile ? app.originalFile.name : null,
      theme: app.theme
    };
    if (app.persistLocal) localStorage.setItem('datalens.persist', JSON.stringify(payload));
    else sessionStorage.setItem('datalens.session', JSON.stringify(payload));
  } catch (e) {
    console.error(e);
  }
};

const loadFromStorage = () => {
  const s = localStorage.getItem('datalens.persist') || sessionStorage.getItem('datalens.session');
  if (!s) return false;
  try {
    const payload = JSON.parse(s);
    app.columns = payload.columns || [];
    app.dataRaw = payload.dataRaw || [];
    app.view.page = payload.view?.page || 1;
    app.view.perPage = payload.view?.perPage || 10;
    app.view.globalSearch = payload.view?.globalSearch || '';
    app.view.colFilters = {};
    if (payload.view?.colFilters) {
      Object.entries(payload.view.colFilters).forEach(([k, v]) => {
        app.view.colFilters[k] = new Set(v);
      });
    }
    app.view.hiddenCols = new Set(payload.view?.hiddenCols || []);
    app.view.sorts = payload.view?.sorts || [];
    app.theme = payload.theme || app.theme;
    renderAll();
    notify('Loaded persisted dataset', 'success', 2500);
    return true;
  } catch (e) { console.error('Load storage error', e); return false; }
};

//Flatten Json Object
function flattenObject(obj, parentKey = '', res = {}) {
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      if (typeof item === 'object' && item !== null) {
        flattenObject(item, `${parentKey}.${index}`, res);
      } else {
        res[`${parentKey}.${index}`] = item;
      }
    });
  } else if (typeof obj === 'object' && obj !== null) {
    for (let key in obj) {
      if (!obj.hasOwnProperty(key)) continue;
      let newKey = parentKey ? `${parentKey}.${key}` : key;
      flattenObject(obj[key], newKey, res);
    }
  } else {
    res[parentKey] = obj;
  }
  return res;
}


// ---------------------------
// File parsing
// ---------------------------
async function parseFile(file, opts = { previewOnly: false }) {
  // Save original file info for download
  app.originalFile = file;
  if (file) {
    // create data URL for download original
    const reader = new FileReader();
    reader.onload = (ev) => app.originalFileDataURL = ev.target.result;
    reader.readAsDataURL(file);
  }

  const chosenType = el.fileType.value;
  const ext = file ? (file.name.split('.').pop() || '').toLowerCase() : '';
  const text = await file.text();

  // Determine parser
  let parser = chosenType;
  if (chosenType === 'auto') {
    if (ext === 'csv' || ext === 'tsv') parser = 'csv';
    else if (['xls', 'xlsx'].includes(ext)) parser = 'excel';
    else if (ext === 'json') parser = 'json';
    else if (ext === 'xml') parser = 'xml';
    else if (ext === 'txt') parser = 'txt';
    else {
      // naive content detection
      if (text.trim().startsWith('{') || text.trim().startsWith('[')) parser = 'json';
      else if (text.includes('<') && text.includes('>') && text.split(/[\r\n]+/).slice(0, 3).some(l => l.includes('<'))) parser = 'xml';
      else {
        // choose CSV/TXT
        parser = 'csv';
      }
    }
  }

  // Parseers
  try {
    if (parser === 'csv' || parser === 'txt') {
      // auto-detect delimiter for CSV/TXT
      const delimiter = simpleAutoDelimiter(text);
      const papaConfig = {
        header: true,
        dynamicTyping: false,
        skipEmptyLines: true,
        preview: opts.previewOnly ? 100 : 0,
        delimiter: delimiter
      };
      const res = Papa.parse(text, papaConfig);
      if (res.errors && res.errors.length) {
        console.warn('Papa errors', res.errors);
        // show user-friendly message for first error
        notify('CSV parse warning: ' + (res.errors[0].message || 'Unknown'), 'warning', 4000);
      }
      const data = res.data;
      postParse(data);
    } else if (parser === 'json') {
      const parsed = JSON.parse(text);

      // if top-level array, use it; if object with keys, try to extract a sensible array
      let arr;
      if (Array.isArray(parsed)) arr = parsed;
      else if (Array.isArray(parsed.data)) arr = parsed.data;
      else arr = Object.keys(parsed).length ? [parsed] : [];

      // flatten each object in the array
      arr = arr.map(item => flattenObject(item));
      postParse(arr.slice(0, opts.previewOnly ? 100 : arr.length), opts.previewOnly ? true : false);
    } else if (parser === 'excel') {
      // Use SheetJS; parse using read
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const firstSheet = wb.SheetNames[0];
      const sheet = wb.Sheets[firstSheet];
      const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      postParse(data.slice(0, opts.previewOnly ? 100 : data.length), opts.previewOnly ? true : false);
    } else if (parser === 'xml') {
      // Very basic XML to JSON extract: convert child nodes of top-level repeating element
      const parserXml = new DOMParser();
      const xmlDoc = parserXml.parseFromString(text, 'application/xml');
      const parseError = xmlDoc.querySelector('parsererror');
      if (parseError) throw new Error('Malformed XML');
      // look for repeating elements
      // choose the deepest repeating tag
      const elements = xmlDoc.documentElement.children;
      const tagCounts = {};
      function walk(node) {
        for (const ch of node.children) {
          tagCounts[ch.tagName] = (tagCounts[ch.tagName] || 0) + 1;
          walk(ch);
        }
      }
      walk(xmlDoc);
      const candidates = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
      const chosenTag = candidates[0] ? candidates[0][0] : xmlDoc.documentElement.tagName;
      const nodes = Array.from(xmlDoc.getElementsByTagName(chosenTag));
      const arr = nodes.map(n => {
        const obj = {};
        for (const child of n.children) {
          obj[child.tagName] = child.textContent;
        }
        return obj;
      });
      postParse(arr.slice(0, opts.previewOnly ? 100 : arr.length), opts.previewOnly ? true : false);
    } else {
      throw new Error('Unsupported file type');
    }
  } catch (err) {
    console.error('Parse error', err);
    notify('Error parsing file: ' + (err.message || 'Unknown'), 'danger', 5000);
  }

  function postParse(parsedArray, previewFlag = false) {
    // Normalize: ensure array of objects. If rows are arrays (no headers), attempt to make headers.
    let data = parsedArray || [];
    if (data.length > 0 && !data[0]) data = [];
    // If data rows are arrays or primitive values, convert to objects with columns like "col1"
    if (data.length > 0 && !data[0].hasOwnProperty && Array.isArray(data[0])) {
      const maxCols = Math.max(...data.map(r => r.length));
      const cols = Array.from({ length: maxCols }).map((_, i) => 'col' + (i + 1));
      data = data.map(r => {
        const obj = {};
        cols.forEach((c, i) => obj[c] = r[i] ?? '');
        return obj;
      });
    } else if (data.length > 0 && (typeof data[0] !== 'object')) {
      // primitive list -> single column
      data = data.map(v => ({ value: v }));
    }

    app.dataRaw = data;
    app.columns = unique(data.flatMap(r => Object.keys(r))).filter(Boolean);
    app.view.page = 1;
    el.infoRows.textContent = app.dataRaw.length;
    el.infoCols.textContent = app.columns.length;
    el.infoFilename.textContent = file ? file.name : 'Sample data';
    el.infoMIME.textContent = file ? (file.type || '—') : '—';
    el.infoSize.textContent = file ? humanFileSize(file.size) : '—';

    // If previewOnly flag is true, show a banner
    if (previewFlag) notify('Previewing first 100 rows; choose "Preview top 100" to load only the previewed dataset.', 'info', 4000);

    // Build UI controls
    renderAll();

    // Persist in session/local
    saveToStorage();
  }
}

// ---------------------------
// Rendering & Table logic
// ---------------------------
function renderAll() {
  renderColsMenu();
  renderFilters();
  renderTable();
  renderPagination();
  renderChartSelectors();
}

function getFilteredSortedData() {
  let data = app.dataRaw.slice();

  // Column filters (categorical with allowed values in set)
  for (const [col, filterSet] of Object.entries(app.view.colFilters)) {
    if (
      !filterSet ||
      (Array.isArray(filterSet) && filterSet.length === 0) ||
      (filterSet instanceof Set && filterSet.size === 0)
    ) {
      continue;
    }

    // always normalize to Set
    const set = filterSet instanceof Set ? filterSet : new Set(filterSet);

    data = data.filter(row => {
      const v = row[col] ?? ""; // treat null/undefined as empty string
      return set.has(String(v));
    });
  }

  // Global search across visible columns
  const q = app.view.globalSearch.trim().toLowerCase();
  if (q) {
    data = data.filter(row => {
      return app.columns.some(c => {
        if (app.view.hiddenCols.has(c)) return false;
        const val = row[c];
        return (val !== null && val !== undefined) && String(val).toLowerCase().includes(q);
      });
    });
  }

  // Sorting (multi-column)
  if (app.view.sorts && app.view.sorts.length) {
    data.sort((a, b) => {
      for (const s of app.view.sorts) {
        const av = a[s.col] ?? '';
        const bv = b[s.col] ?? '';
        // numeric if both numeric
        const anum = parseFloat(av);
        const bnum = parseFloat(bv);
        let cmp = 0;
        if (!isNaN(anum) && !isNaN(bnum)) cmp = anum - bnum;
        else cmp = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' });
        if (cmp !== 0) return s.dir === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
  }
  return data;
}

function renderTable() {
  // smooth animation
  el.tableBody.innerHTML = '';
  el.tableHead.innerHTML = '';

  const data = getFilteredSortedData();
  const total = data.length;

  // Pagination
  const per = app.view.perPage = Number(el.rowsPerPage.value || app.view.perPage || 10);
  const totalPages = Math.max(1, Math.ceil(total / per));
  if (app.view.page > totalPages) app.view.page = 1;
  const start = (app.view.page - 1) * per;
  const pageData = data.slice(start, start + per);

  // Build header
  const thead = document.createElement('tr');

  app.columns.forEach(col => {
    if (app.view.hiddenCols.has(col)) return;
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
    // Sorting toggles: none -> asc -> desc -> none
    th.addEventListener('click', (e) => {
      toggleSort(col);
    });
    th.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') toggleSort(col);
    });
    // mark current sort direction
    const sortObj = app.view.sorts.find(s => s.col === col);
    if (sortObj) {
      const span = th.querySelector('.col-sort');
      span.innerHTML = sortObj.dir === 'asc' ? '&#9650;' : '&#9660;';
    }
    thead.appendChild(th);
  });
  el.tableHead.appendChild(thead);

  // Build body
  const tbodyFrag = document.createDocumentFragment();
  pageData.forEach((row, rIndex) => {
    const tr = document.createElement('tr');
    tr.dataset.index = start + rIndex;
    tr.tabIndex = 0;

    // row selection highlight
    tr.addEventListener('click', () => {
      tr.classList.toggle('selected');
    });

    app.columns.forEach(col => {
      if (app.view.hiddenCols.has(col)) return;
      const td = document.createElement('td');
      const v = row[col] === null || row[col] === undefined ? '' : row[col];
      td.innerHTML = escapeHtml(String(v));
      tbodyFrag.appendChild(td);
      tr.appendChild(td);
    });

    tbodyFrag.appendChild(tr);
  });

  el.tableBody.appendChild(tbodyFrag);

  // Update info
  el.pageInfo.textContent = `Showing ${Math.min(total, start + 1)}–${Math.min(total, start + pageData.length)} of ${total}`;
  el.infoRows.textContent = total;
  el.infoCols.textContent = app.columns.length - app.view.hiddenCols.size;

  // Update table-wrapper shadow on scroll
  const wrapper = document.querySelector('.table-wrapper');
  const tableScroll = wrapper.querySelector('.table-responsive');
  tableScroll.onscroll = () => {
    wrapper.classList.toggle('scrolled', tableScroll.scrollTop > 10);
  };

  // Render small-screen card view
  renderCardView(pageData);

  // Save state
  saveToStorage();
}

function renderCardView(pageData) {
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

function renderPagination() {
  const data = getFilteredSortedData();
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
function renderColsMenu() {
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

function renderFilters() {
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

// ---------------------------
// Sorting
// ---------------------------
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

// ---------------------------
// Exports
// ---------------------------
function exportCurrentToCSV() {
  const data = getFilteredSortedData();
  // only visible columns
  const cols = app.columns.filter(c => !app.view.hiddenCols.has(c));
  const toExport = data.map(r => {
    const obj = {};
    cols.forEach(c => obj[c] = r[c] ?? '');
    return obj;
  });
  const csv = Papa.unparse(toExport, { header: true });
  downloadString(csv, 'text/csv;charset=utf-8;', (app.originalFile?.name?.replace(/\.[^.]+$/, '') || 'data') + '_export.csv');
}

function exportCurrentToXLSX() {
  const data = getFilteredSortedData();
  const cols = app.columns.filter(c => !app.view.hiddenCols.has(c));
  const toExport = data.map(r => {
    const obj = {};
    cols.forEach(c => obj[c] = r[c] ?? '');
    return obj;
  });
  const ws = XLSX.utils.json_to_sheet(toExport);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, (app.originalFile?.name?.replace(/\.[^.]+$/, '') || 'data') + '_export.xlsx');
}

function downloadString(text, mimeType, filename) {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Download original
function downloadOriginal() {
  if (!app.originalFileDataURL) {
    notify('No original file available for download', 'warning');
    return;
  }
  const a = document.createElement('a');
  a.href = app.originalFileDataURL;
  a.download = app.originalFile ? app.originalFile.name : 'original';
  document.body.appendChild(a); a.click(); a.remove();
}

// ---------------------------
// Charting
// ---------------------------
function renderChartSelectors() {
  // populate category (categorical) and numeric selectors
  el.chartCat.innerHTML = '';
  el.chartNum.innerHTML = '';
  app.columns.forEach(col => {
    const optCat = document.createElement('option');
    optCat.value = col; optCat.textContent = col;
    el.chartCat.appendChild(optCat);
    const optNum = document.createElement('option');
    optNum.value = col; optNum.textContent = col;
    el.chartNum.appendChild(optNum);
  });
}

// Chart Section
function populateChartOptions() {
  const headers = Object.keys(rawData[0] || {});
  const catSel = document.getElementById("categoryColumn");
  const numSel = document.getElementById("numericColumn");
  catSel.innerHTML = "<option disabled selected>Select Category</option>";
  numSel.innerHTML = "<option disabled selected>Select Numeric</option>";
  headers.forEach(h => {
    catSel.innerHTML += `<option>${h}</option>`;
    numSel.innerHTML += `<option>${h}</option>`;
  });
}

document.getElementById("btnDrawChart").onclick = () => {
  const cat = el.chartCat.value;
  const num = el.chartNum.value;
  const type = el.chartType.value;
  if (!cat || !num) return alert("Select both columns");

  const rawData = getFilteredSortedData();
  let agg = {};

  rawData.forEach(r => {
    const c = r[cat], n = parseFloat(r[num]);
    if (c && !isNaN(n)) agg[c] = (agg[c] || 0) + n;
  });

  const labels = Object.keys(agg);
  const data = Object.values(agg);

  // Generate random colors for each label
  const backgroundColors = labels.map(() => {
    const r = Math.floor(Math.random() * 255);
    const g = Math.floor(Math.random() * 255);
    const b = Math.floor(Math.random() * 255);
    return `rgba(${r},${g},${b},0.6)`;
  });

  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(document.getElementById("chartCanvas"), {
    type: type,
    data: {
      labels: labels,
      datasets: [{
        label: num,
        data: data,
        backgroundColor: backgroundColors
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
};


// ---------------------------
// Utilities & helpers
// ---------------------------
function escapeHtml(s) {
  return s.replace?.(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") ?? s;
}

// ---------------------------
// Small features: preview, sample, reset
// ---------------------------
async function previewTop100() {
  // If originalFile, parse preview
  if (!app.originalFile) { notify('No file loaded to preview', 'warning'); return; }
  await parseFile(app.originalFile, { previewOnly: true });
  notify('Displayed preview (first 100 rows)', 'info');
}

function loadSampleDataset() {
  Papa.parse("./SampleDataset.csv", {
    download: true,      // 👈 important for file path
    header: true,
    dynamicTyping: false,
    complete: function (res) {
      app.dataRaw = res.data;
      app.columns = unique(app.dataRaw.flatMap(r => Object.keys(r))).filter(Boolean);
      app.originalFile = null;
      app.originalFileDataURL = null;
      el.infoFilename.textContent = 'sample.csv';
      el.infoMIME.textContent = 'text/csv';
      el.infoSize.textContent = humanFileSize(new Blob([res.data]).size);
      renderAll();
      notify('Sample dataset loaded', 'success');
    }
  });
}


function resetView() {
  app.view = { page: 1, perPage: 10, globalSearch: '', colFilters: {}, hiddenCols: new Set(), sorts: [] };
  el.globalSearch.value = '';
  el.rowsPerPage.value = '10';
  renderAll();
  notify('View reset', 'info', 1800);
}

// ---------------------------
// Events wiring
// ---------------------------
// File input + drop zone
el.fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  await parseFile(file);
});
el.dropZone.addEventListener('click', () => el.fileInput.click());
;['dragenter', 'dragover'].forEach(evt => {
  el.dropZone.addEventListener(evt, (e) => { e.preventDefault(); e.stopPropagation(); el.dropZone.classList.add('dragover'); });
});
;['dragleave', 'drop'].forEach(evt => {
  el.dropZone.addEventListener(evt, (e) => { e.preventDefault(); e.stopPropagation(); el.dropZone.classList.remove('dragover'); });
});
el.dropZone.addEventListener('drop', async (e) => {
  const file = e.dataTransfer.files[0];
  if (!file) return;
  await parseFile(file);
});

// search + pagination change
el.globalSearch.addEventListener('input', (e) => {
  app.view.globalSearch = e.target.value;
  app.view.page = 1;
  renderTable(); renderPagination();
});
el.rowsPerPage.addEventListener('change', () => {
  app.view.perPage = Number(el.rowsPerPage.value);
  app.view.page = 1;
  renderTable(); renderPagination();
});

// export buttons
el.btnExportCSV.addEventListener('click', () => exportCurrentToCSV());
el.btnExportXLSX.addEventListener('click', () => exportCurrentToXLSX());
el.btnDownloadOriginal.addEventListener('click', () => downloadOriginal());


// sample & clear & reset
el.btnSample.addEventListener('click', () => loadSampleDataset());
el.btnClearStorage.addEventListener('click', () => {
  localStorage.removeItem('datalens.persist');
  sessionStorage.removeItem('datalens.session');
  app.dataRaw = [];
  app.columns = [];
  app.originalFile = null;
  app.originalFileDataURL = null;
  el.infoFilename.textContent = 'No file';
  el.infoMIME.textContent = '—';
  el.infoSize.textContent = '—';
  el.infoRows.textContent = 0;
  el.infoCols.textContent = 0;
  renderAll();
  notify('Cleared stored data', 'success');
});
el.btnResetView.addEventListener('click', () => resetView());

// persist option
el.persistLocalCheckbox.addEventListener('change', (e) => {
  app.persistLocal = e.target.checked;
  saveToStorage();
  notify('Persistence: ' + (app.persistLocal ? 'localStorage' : 'sessionStorage'), 'info', 1400);
});

// Download original already handled

// Theme toggle
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
  el.toggleTheme.checked = theme === 'dark';
  app.theme = theme;
  localStorage.setItem('datalens.theme', theme);
}
applyTheme(app.theme);
el.toggleTheme.addEventListener('change', (e) => {
  applyTheme(e.target.checked ? 'dark' : 'light');
});

// column filter dropdown close behavior fixed: re-render filters when closed
document.addEventListener('click', (e) => {
  const filters = document.getElementById('filtersToggle');
  if (!filters) return;
});

// clear sorts on double click header
el.tableHead.addEventListener('dblclick', (e) => {
  app.view.sorts = [];
  renderTable();
});

// Init: try to load from storage
document.addEventListener('DOMContentLoaded', () => {
  // read persisted settings
  const persisted = loadFromStorage();
  if (!persisted) {
    // initial sample dataset
    // loadSampleDataset();
  } else {
    // sync UI controls
    el.globalSearch.value = app.view.globalSearch || '';
    el.rowsPerPage.value = app.view.perPage || '10';
    el.persistLocal.checked = !!localStorage.getItem('datalens.persist');
    el.infoFilename.textContent = app.originalFile?.name || 'Persisted dataset';
  }
});

// Accessibility helper: keyboard to toggle column menu
el.colsToggle.addEventListener('keypress', (e) => { if (e.key === 'Enter') el.colsToggle.click(); });

// Warn user when working with very large files: preview first 100 rows
// If user loads extremely large file (>200k rows or >10MB), we show a preview prompt
// (This is run inside parseFile's try block if needed in future.)

// End of scriptk