/************************************************************************
   * DataLens - Client-side data explorer
   * - All parsing & UI done in browser
   * - Libraries: PapaParse, SheetJS (XLSX), Chart.js
   *
   * Structure:
   *  - State: dataRaw (array of objects), columns (array), originalFile (File), viewState (filters, sort, pagination)
   *  - Parsing: parseFile() dispatches to CSV/Excel/JSON/TXT/XML handlers
   *  - Rendering: renderTable(), renderPagination(), renderColsMenu(), renderFilters()
   *  - Interactions: search, per-column filters, sorting, column visibility, export
   ************************************************************************/


import { notify } from "./utils/notifyUtils.js";
import { saveToStorage, loadFromStorage } from "./utils/storage.js";
import { exportCurrentToCSV, exportCurrentToXLSX, downloadOriginal } from "./utils/exportDownload.js";
import { getFilteredSortedData } from "./utils/dataFilter.js";
import { parseFile } from "./utils/parseFile.js";
import { renderColsMenu, renderFilters, renderPagination, renderTable } from "./utils/render.js";
import { loadSampleDataset } from "./utils/loadSample.js";

// App state
export const app = {
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
export const el = {
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

// Rendering & Table logic
export function renderAll() {
  renderColsMenu();
  renderFilters();
  renderTable();
  renderPagination();
  renderChartSelectors();
}

// Charting
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


document.getElementById("btnDrawChart").onclick = () => {
  const cat = el.chartCat.value;
  const num = el.chartNum.value;
  const type = el.chartType.value;
  if (!cat || !num) return alert("Select both columns");

  const rawData = getFilteredSortedData(app);
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


function resetView() {
  app.view = { page: 1, perPage: 10, globalSearch: '', colFilters: {}, hiddenCols: new Set(), sorts: [] };
  el.globalSearch.value = '';
  el.rowsPerPage.value = '10';
  renderAll();
  notify('View reset', 'info', 1800);
}


// File input + drop zone
el.fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  await parseFile(app, el, file);
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
  await parseFile(app, el, file);
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

