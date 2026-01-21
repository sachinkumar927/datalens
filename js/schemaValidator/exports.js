// ---- Exports ----
//---- Download as Excel (.xlsx) ----
function downloadProfilingExcel(headers, profile) {
    // Build data array for SheetJS
    const data = [["Column", "Dominant type", "Null %", "Unique %", "Min", "Max", "Sample values"]];
    headers.forEach(h => {
        const p = profile[h];
        data.push([h, p.dominantType, p.nullPct.toFixed(1) + "%", p.uniquePct.toFixed(1) + "%", p.minDisplay ?? "", p.maxDisplay ?? "", (p.samples || []).join("; ")]);
    });
    // Create worksheet & workbook
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Profiling");
    // Trigger download
    XLSX.writeFile(wb, "profiling_data.xlsx");
}

function downloadCSVIssues() {
    if (!S.issues.length) return;
    const headers = ['row', 'column', 'type', 'rule', 'message', 'valueA', 'valueB'];
    const lines = [headers.join(',')];
    S.issues.forEach(r => {
        const cols = [r.row, r.col, r.type, r.rule, r.message, r.aVal ?? '', r.bVal ?? ''];
        lines.push(cols.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'validation_issues.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function downloadExcelIssuesAndClean() {
    const wb = XLSX.utils.book_new();
    const issuesSheetData = [['Row', 'Column', 'Type', 'Rule', 'Message', 'Value A', 'Value B']].concat(
        S.issues.map(r => [r.row, r.col, r.type, r.rule, r.message, r.aVal ?? '', r.bVal ?? ''])
    );
    const wsIssues = XLSX.utils.aoa_to_sheet(issuesSheetData);
    XLSX.utils.book_append_sheet(wb, wsIssues, 'Issues');

    const errorRows = new Set(S.issues.filter(r => r.type === 'Invalid' && r.row !== '-').map(r => r.row));
    const cleanRows = S.A.rows.filter((_, i) => !errorRows.has(i + 1));
    const wsClean = XLSX.utils.json_to_sheet(cleanRows.length ? cleanRows : [{}], { skipHeader: false });
    XLSX.utils.book_append_sheet(wb, wsClean, 'CleanDataA');

    XLSX.writeFile(wb, 'datalens_validation.xlsx');
}
