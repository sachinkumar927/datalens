// === File parsing (CSV/Excel/JSON) ===
async function parseFile(file) {
    const name = (file.name || '').toLowerCase();
    try {
        if (name.endsWith('.json')) {
            const txt = await file.text();
            const parsed = JSON.parse(txt);
            if (Array.isArray(parsed)) return parsed;
            if (typeof parsed === 'object') return [parsed];
            return [];
        } else if (name.endsWith('.csv')) {
            const txt = await file.text();
            const wb = XLSX.read(txt, { type: 'string' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            return XLSX.utils.sheet_to_json(ws, { defval: null });
        } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
            const buf = await file.arrayBuffer();
            const wb = XLSX.read(buf, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            return XLSX.utils.sheet_to_json(ws, { defval: null });
        } else {
            alert('Unsupported file type');
            return [];
        }
    } catch (err) {
        console.error(err);
        alert('Failed to parse file: ' + (err.message || err));
        return [];
    }
}

// === Exports ===
function exportChart(chart, filename) {
    if (!chart) return;
    const link = document.createElement('a');
    link.download = filename + '.png';
    link.href = chart.toBase64Image();
    link.click();
}

function exportHistogram() {
    exportChart(charts.hist, 'histogram');
}

function exportScatter() {
    exportChart(charts.scatter, 'scatter_plot');
}

function exportBar() {
    exportChart(charts.bar, 'bar_chart');
}

function exportLine() {
    exportChart(charts.line, 'line_chart');
}

function exportPie() {
    exportChart(charts.pie, 'pie_chart');
}

function exportCharts() {
    const chartNames = [
        { chart: charts.hist, name: 'histogram' },
        { chart: charts.scatter, name: 'scatter_plot' },
        { chart: charts.bar, name: 'bar_chart' },
        { chart: charts.line, name: 'line_chart' },
        { chart: charts.pie, name: 'pie_chart' }
    ];
    chartNames.forEach(({ chart, name }) => {
        if (chart) exportChart(chart, name);
    });
}

// === Data load & normalize ===
function onDataLoaded(arr, fileName = 'Unknown') {
    fullData = (arr || []).map(r => {
        const obj = {};
        Object.keys(r || {}).forEach(k => {
            const v = r[k];
            obj[k] = (v === '' ? null : v);
        });
        return obj;
    });
    buildSchema();
    el('fileInfo').textContent = `Loaded ${fullData.length} records from ${fileName}`;
    renderChartsContainer();
}

// === Render charts container dynamically ===
function renderChartsContainer() {
    // No need to overwrite innerHTML since containers already exist
    refreshVisualSelectors();

    // Bind export events
    el('export-histogram').onclick = exportHistogram;
    el('export-scatter').onclick = exportScatter;
    el('export-bar').onclick = exportBar;
    el('export-line').onclick = exportLine;
    el('export-pie').onclick = exportPie;
    el('exportChartsBtn').onclick = exportCharts;
}

