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


pageSizeSel.addEventListener('change', renderTable);
