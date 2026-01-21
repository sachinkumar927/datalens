
// === Event listeners ===
el('fileInput').onchange = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    el('fileInfo').textContent = 'Parsing...';
    const arr = await parseFile(f);
    onDataLoaded(arr);
};

el('globalSearch').oninput = () => { applyGlobalSearch(); };
el('rowsPerPage').onchange = () => { rowsPerPage = parseInt(el('rowsPerPage').value); currentPage = 1; renderTablePreview(); };

el('exportSummaryBtn').onclick = () => {
    const choice = prompt('Type "json" or "csv" to export summary. (json/csv)', 'json');
    if (!choice) return; const ch = choice.toLowerCase();
    if (ch === 'json') exportSummaryJSON();
    else if (ch === 'csv') exportSummaryCSV();
    else alert('Unknown option');
};

el('exportNumericStatsBtn').onclick = () => { exportNumericStatsExcel(); };
el('exportTextStatsBtn').onclick = () => { exportTextStatsExcel(); };
el('exportDateStatsBtn').onclick = () => { exportDateStatsExcel(); };
el('exportValueCountsBtn').onclick = () => { exportValueCountsExcel(); };

el('valueCountsFieldSelect').onchange = () => {
    selectedValueCountsField = el('valueCountsFieldSelect').value;
    currentPageValueCounts = 1;
    renderValueCountsTable();
};

el('rowsPerPageValueCounts').onchange = () => {
    rowsPerPageValueCounts = parseInt(el('rowsPerPageValueCounts').value);
    currentPageValueCounts = 1;
    renderValueCountsTable();
};

// keyboard shortcut to load sample
document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault(); onDataLoaded(sampleData);
    }
});
