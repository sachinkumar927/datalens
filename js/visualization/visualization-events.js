// === Event listeners ===
el('fileInput').onchange = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    el('fileInfo').textContent = 'Parsing...';
    const arr = await parseFile(f);
    onDataLoaded(arr, f.name);
};

el('exportChartsBtn').onclick = () => exportCharts();
el('export-histogram').onclick = exportHistogram;
el('export-scatter').onclick = exportScatter;
el('export-bar').onclick = exportBar;
el('export-line').onclick = exportLine;
el('export-pie').onclick = exportPie;

// keyboard shortcut to load sample
document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault(); onDataLoaded(sampleData);
    }
});

// window resize: keep charts responsive
window.addEventListener('resize', () => {
    if (charts.fieldChart) charts.fieldChart.resize();
    if (charts.hist) charts.hist.resize();
    if (charts.scatter) charts.scatter.resize();
    if (charts.bar) charts.bar.resize();
    if (charts.line) charts.line.resize();
});
