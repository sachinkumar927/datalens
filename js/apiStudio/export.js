/* CSV export from lastDataArray */
function exportCsvFromDataArray() {
    if (!Array.isArray(lastDataArray) || lastDataArray.length === 0) {
        alert("No array-like 'data' found in the response to export.");
        return;
    }
    const headers = Object.keys(flattenObject(lastDataArray[0] || {}));
    const rows = lastDataArray.map(item => {
        const flat = flattenObject(item);
        return headers.map(h => sanitizeCsvValue(flat[h]));
    });

    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, "datalens_export.csv");
}

/* Excel export from lastDataArray (XLSX) */
function exportExcelFromDataArray() {
    if (!Array.isArray(lastDataArray) || lastDataArray.length === 0) {
        alert("No array-like 'data' found in the response to export.");
        return;
    }
    const worksheetData = lastDataArray.map(obj => flattenObject(obj));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, "datalens_export.xlsx");
}
