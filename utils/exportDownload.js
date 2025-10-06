import { app, el } from "../index.js";
import { notify } from "./notifyUtils.js";
import { getFilteredSortedData } from "./dataFilter.js";
// Download original
export function downloadOriginal() {
    if (!app.originalFileDataURL) {
        notify('No original file available for download', 'warning');
        return;
    }
    const a = document.createElement('a');
    a.href = app.originalFileDataURL;
    a.download = app.originalFile ? app.originalFile.name : 'original';
    document.body.appendChild(a); a.click(); a.remove();
}

// ---------------------------
// Exports or Download
// ---------------------------
export function exportCurrentToCSV() {
    const data = getFilteredSortedData();
    // only visible columns
    const cols = app.columns.filter(c => !app.view.hiddenCols.has(c));
    const toExport = data.map(r => {
        const obj = {};
        cols.forEach(c => obj[c] = r[c] ?? '');
        return obj;
    });
    const csv = Papa.unparse(toExport, { header: true });
    downloadString(csv, 'text/csv;charset=utf-8;', (app.originalFile?.name?.replace(/\.[^.]+$/, '') || 'data') + '_export.csv');
}

export function exportCurrentToXLSX() {
    const data = getFilteredSortedData();
    const cols = app.columns.filter(c => !app.view.hiddenCols.has(c));
    const toExport = data.map(r => {
        const obj = {};
        cols.forEach(c => obj[c] = r[c] ?? '');
        return obj;
    });
    const ws = XLSX.utils.json_to_sheet(toExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, (app.originalFile?.name?.replace(/\.[^.]+$/, '') || 'data') + '_export.xlsx');
}

function downloadString(text, mimeType, filename) {
    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}