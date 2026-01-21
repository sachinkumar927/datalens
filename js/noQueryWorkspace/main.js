// Event bindings and initialization
window.runQueryBtn.onclick = window.applyQuery;

// clear filters
document.getElementById('clearFilters').onclick = () => { window.filterContainer.innerHTML = ''; }

// page size change
window.pageSizeSel.onchange = () => window.renderTable();

// reset query
document.getElementById('resetQueryBtn').onclick = () => {
    // reselect all columns
    Array.from(window.columnsContainer.querySelectorAll('input[type=checkbox]')).forEach(c => c.checked = true);
    window.filterContainer.innerHTML = '';
    window.orderContainer.innerHTML = '';
    window.groupBySelect.value = '';
    window.aggFuncSelect.value = '';
    window.aggFieldSelect.value = '';
    window.globalSearch.value = '';
    window.filteredData = [...window.fullData]; window.currentView = [...window.fullData]; window.currentPage = 1; window.renderTable(); window.renderChart();
}

// initial placeholder
window.renderTable();
