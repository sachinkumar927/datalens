// Export functions
window.exportData = function(format = 'xlsx') {
    try {
        const ws = XLSX.utils.json_to_sheet(window.filteredData || []);
        if (format === 'csv') {
            const csv = XLSX.utils.sheet_to_csv(ws);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'datalens_export.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
        } else {
            const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Results');
            XLSX.writeFile(wb, `datalens_export.xlsx`);
        }
    } catch (e) {
        alert('Export failed: ' + e.message);
    }
};
document.getElementById('exportCSVBtn').onclick = () => window.exportData('csv');
document.getElementById('exportExcelBtn').onclick = () => window.exportData('xlsx');
document.getElementById('downloadViewBtn').onclick = () => {
    try {
        const ws = XLSX.utils.json_to_sheet(window.currentView || []);
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'View'); XLSX.writeFile(wb, 'datalens_view.xlsx');
    } catch (e) { alert('Download failed: ' + e.message); }
};

// copy to clipboard
document.getElementById('copyBtn').onclick = async () => {
    const rows = Array.from(window.dataTable.querySelectorAll('tr')).map(tr => Array.from(tr.querySelectorAll('th,td')).map(td => td.innerText).join('\t')).join('\n');
    try { await navigator.clipboard.writeText(rows); alert('Table copied to clipboard'); } catch (e) { alert('Copy failed'); }
}
