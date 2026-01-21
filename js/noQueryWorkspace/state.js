// State variables
window.fullData = [];
window.filteredData = [];
window.currentView = [];
window.currentPage = 1;
window.chart = null;

// DOM Elements
window.fileInput = document.getElementById('fileInput');
window.uploader = document.getElementById('uploader');
window.loadBtn = document.getElementById('loadBtn');
window.rowCount = document.getElementById('rowCount');
window.colCount = document.getElementById('colCount');
window.schemaSummary = document.getElementById('schemaSummary');
window.columnsContainer = document.getElementById('columnsContainer');
window.addFilterBtn = document.getElementById('addFilterBtn');
window.addOrderBtn = document.getElementById('addOrderBtn');
window.runQueryBtn = document.getElementById('runQueryBtn');
window.filterContainer = document.getElementById('filterContainer');
window.orderContainer = document.getElementById('orderContainer');
window.groupBySelect = document.getElementById('groupBySelect');
window.aggFuncSelect = document.getElementById('aggFuncSelect');
window.aggFieldSelect = document.getElementById('aggFieldSelect');
window.dataTable = document.getElementById('dataTable');
window.pagination = document.getElementById('pagination');
window.showingCount = document.getElementById('showingCount');
window.runtimeEl = document.getElementById('runtime');
window.globalSearch = document.getElementById('globalSearch');
window.pageSizeSel = document.getElementById('pageSizeSel');
window.selectAllCols = document.getElementById('selectAllCols');

window.pageSizeDefault = () => parseInt(window.pageSizeSel.value || '10', 10);
