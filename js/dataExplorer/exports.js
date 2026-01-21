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
