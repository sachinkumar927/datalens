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
