// Search functionality
let searchTimer = null;
window.globalSearch.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        const q = window.globalSearch.value.trim().toLowerCase();
        if (!q) { window.currentView = [...window.filteredData]; window.renderTable(); window.renderChart(); return; }
        const cols = Object.keys(window.filteredData[0] || {});
        window.currentView = window.filteredData.filter(r => cols.some(c => String(r[c] || '').toLowerCase().includes(q)));
        window.currentPage = 1; window.renderTable(); window.renderChart();
    }, 300);
});
