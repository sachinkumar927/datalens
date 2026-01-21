// === Visuals: field chart, histogram, scatter, bar, line ===
function renderFieldChart(field) {
    const meta = schema[field];
    if (!meta) return;
    // destroy previous
    if (charts.fieldChart) charts.fieldChart.destroy();
    const ctx = el('fieldChart').getContext('2d');
    const vals = fullData.map(r => (r || {})[field]).filter(v => v !== null && v !== undefined && v !== "");
    if (meta.inferred === 'number' || meta.inferred === 'mixed') {
        const numeric = vals.map(v => toNumberSafe(v)).filter(n => n !== null);
        if (numeric.length === 0) {
            charts.fieldChart = new Chart(ctx, { type: 'bar', data: { labels: ['no numeric data'], datasets: [{ data: [1] }] }, options: {} });
            return;
        }
        const buckets = Math.min(12, 8 + Math.floor(Math.log2(numeric.length)));
        const min = Math.min(...numeric), max = Math.max(...numeric);
        const width = (max - min) / buckets || 1;
        const labels = [], data = new Array(buckets).fill(0);
        for (let i = 0; i < buckets; i++) labels.push((min + i * width).toFixed(2));
        numeric.forEach(n => {
            let idx = Math.floor((n - min) / width);
            if (idx < 0) idx = 0;
            if (idx >= buckets) idx = buckets - 1;
            data[idx]++;
        });
        charts.fieldChart = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets: [{ label: field, data }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    } else {
        const freq = {};
        vals.forEach(v => { const key = String(v); freq[key] = (freq[key] || 0) + 1; });
        const entries = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 8);
        const labels = entries.map(e => e[0]);
        const data = entries.map(e => e[1]);
        charts.fieldChart = new Chart(ctx, {
            type: 'pie',
            data: { labels, datasets: [{ data }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
    }
}

// Histogram for any column selected in #chart-col
function drawHistogram(col) {
    if (!col) return;
    const vals = fullData.map(r => (r || {})[col]).filter(v => v !== null && v !== undefined && String(v).trim() !== '');
    const t = (schema[col] && schema[col].inferred) || inferType(vals.slice(0, 500));
    // destroy old
    if (charts.hist) charts.hist.destroy();
    const ctx = el('chart-canvas').getContext('2d');
    if (t === 'number' || t === 'mixed') {
        const nums = vals.map(v => toNumberSafe(v)).filter(n => n !== null);
        if (!nums.length) return;
        const bins = Math.min(30, Math.max(6, Math.ceil(Math.sqrt(nums.length))));
        const min = Math.min(...nums), max = Math.max(...nums);
        const step = (max - min) / bins || 1;
        const counts = new Array(bins).fill(0);
        for (const n of nums) {
            let idx = Math.floor((n - min) / step);
            if (idx < 0) idx = 0;
            if (idx >= bins) idx = bins - 1;
            counts[idx]++;
        }
        const labels = []; for (let i = 0; i < bins; i++) labels.push((min + i * step).toFixed(2));
        charts.hist = new Chart(ctx, { type: 'bar', data: { labels, datasets: [{ label: col, data: counts }] }, options: { responsive: true } });
    } else {
        const freq = {};
        for (const v of vals) { const s = String(v); freq[s] = (freq[s] || 0) + 1; }
        const arr = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 30);
        const labels = arr.map(a => a[0]), data = arr.map(a => a[1]);
        charts.hist = new Chart(ctx, { type: 'bar', data: { labels, datasets: [{ label: col, data }] }, options: { indexAxis: 'y', responsive: true } });
    }
}

// Scatter: xCol vs yCol
function drawScatter(xCol, yCol) {
    if (!xCol || !yCol) return;
    const pts = fullData.map(r => ({ x: toNumberSafe((r || {})[xCol]), y: toNumberSafe((r || {})[yCol]) })).filter(p => isNumeric(p.x) && isNumeric(p.y));
    if (charts.scatter) charts.scatter.destroy();
    const ctx = el('scatter-canvas').getContext('2d');
    charts.scatter = new Chart(ctx, {
        type: 'scatter',
        data: { datasets: [{ label: `${yCol} vs ${xCol}`, data: pts }] },
        options: {
            responsive: true,
            scales: {
                x: { title: { display: true, text: xCol } },
                y: { title: { display: true, text: yCol } }
            }
        }
    });
}

// Bar Chart: xCol (categorical) vs yCol (numeric, aggregated)
function drawBarChart(xCol, yCol) {
    if (!xCol || !yCol) return;
    const dataMap = {};
    fullData.forEach(r => {
        const x = String((r || {})[xCol] || '');
        const y = toNumberSafe((r || {})[yCol]);
        if (x && y !== null) {
            if (!dataMap[x]) dataMap[x] = [];
            dataMap[x].push(y);
        }
    });
    const labels = Object.keys(dataMap);
    const data = labels.map(l => dataMap[l].reduce((a, b) => a + b, 0) / dataMap[l].length); // average
    if (charts.bar) charts.bar.destroy();
    const ctx = el('bar-canvas').getContext('2d');
    charts.bar = new Chart(ctx, { type: 'bar', data: { labels, datasets: [{ label: `${yCol} by ${xCol}`, data }] }, options: { responsive: true } });
}

// Line Chart: xCol vs yCol (both numeric)
function drawLineChart(xCol, yCol) {
    if (!xCol || !yCol) return;
    const pts = fullData.map(r => ({
        x: toNumberSafe((r || {})[xCol]),
        y: toNumberSafe((r || {})[yCol])
    })).filter(p => isNumeric(p.x) && isNumeric(p.y)).sort((a, b) => a.x - b.x);
    if (!pts.length) return;
    if (charts.line) charts.line.destroy();
    const ctx = el('line-canvas').getContext('2d');
    charts.line = new Chart(ctx, {
        type: 'line',
        data: { datasets: [{ label: `${yCol} vs ${xCol}`, data: pts }] },
        options: {
            responsive: true,
            scales: {
                x: { type: 'linear', title: { display: true, text: xCol } },
                y: { type: 'linear', title: { display: true, text: yCol } }
            }
        }
    });
}

// Pie Chart: xCol (categorical) vs yCol (numeric, aggregated)
function drawPieChart(xCol, yCol) {
    if (!xCol || !yCol) return;
    const dataMap = {};
    fullData.forEach(r => {
        const x = String((r || {})[xCol] || '');
        const y = toNumberSafe((r || {})[yCol]);
        if (x && y !== null) {
            if (!dataMap[x]) dataMap[x] = [];
            dataMap[x].push(y);
        }
    });
    const labels = Object.keys(dataMap);
    const data = labels.map(l => dataMap[l].reduce((a, b) => a + b, 0)); // sum
    if (charts.pie) charts.pie.destroy();
    const ctx = el('pie-canvas').getContext('2d');
    charts.pie = new Chart(ctx, {
        type: 'pie',
        data: { labels, datasets: [{ data }] },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
}

// === Schema building ===
function buildSchema() {
    schema = {};
    if (!fullData.length) return;
    const fields = new Set();
    fullData.forEach(r => Object.keys(r || {}).forEach(k => fields.add(k)));
    for (const f of fields) {
        const vals = fullData.map(r => (r || {})[f]);
        const inferred = inferType(vals);
        const nullCount = vals.filter(v => v === null || v === undefined || v === "").length;
        const unique = new Set(vals.filter(v => v !== null && v !== undefined && v !== "")).size;
        const mixed = inferred === 'mixed';
        schema[f] = { field: f, inferred, nullCount, unique, mixed, sample: vals.slice(0, 6) };
    }
    updateFieldSelect();
    refreshVisualSelectors();
}

function updateFieldSelect() {
    const sel = el('fieldSelect');
    sel.innerHTML = '<option value="">(choose field)</option>';
    Object.keys(schema).forEach(f => {
        const opt = document.createElement('option');
        opt.value = f; opt.textContent = f + ' • ' + schema[f].inferred;
        sel.appendChild(opt);
    });
    sel.onchange = () => {
        const f = sel.value; if (!f) { el('fieldDetail').textContent = 'No field selected'; return; }
        renderFieldDetail(f);
        renderFieldChart(f);
    };
}

function renderFieldDetail(field) {
    const meta = schema[field];
    if (!meta) return;
    const vals = fullData.map(r => (r || {})[field]);
    const info = `
        <div><strong>${escapeHtml(field)}</strong></div>
        <div class="small-muted">Type: ${meta.inferred}${meta.mixed ? ' (mixed)' : ''}</div>
        <div class="small-muted">Nulls: ${meta.nullCount} • Unique: ${meta.unique}</div>
        <div class="small-muted">Sample: ${meta.sample.map(v => escapeHtml(String(v))).join(', ')}</div>
      `;
    el('fieldDetail').innerHTML = info;
}

// Refresh the column selectors used by visuals
function refreshVisualSelectors() {
    const cols = Object.keys(schema);
    const colSelect = el('chart-col'), sx = el('scatter-x'), sy = el('scatter-y'), barX = el('bar-x'), barY = el('bar-y'), lineX = el('line-x'), lineY = el('line-y'), pieX = el('pie-x'), pieY = el('pie-y');
    [colSelect, sx, sy, barX, barY, lineX, lineY, pieX, pieY].forEach(s => { s.innerHTML = '<option value="">(choose)</option>'; });
    cols.forEach(c => {
        const opt = document.createElement('option'); opt.value = c; opt.textContent = c + ' • ' + schema[c].inferred;
        colSelect.appendChild(opt.cloneNode(true));
        sx.appendChild(opt.cloneNode(true));
        sy.appendChild(opt.cloneNode(true));
        barX.appendChild(opt.cloneNode(true));
        barY.appendChild(opt.cloneNode(true));
        lineX.appendChild(opt.cloneNode(true));
        lineY.appendChild(opt.cloneNode(true));
        pieX.appendChild(opt.cloneNode(true));
        pieY.appendChild(opt.cloneNode(true));
    });
    // bind events
    colSelect.onchange = () => drawHistogram(colSelect.value);
    sx.onchange = () => drawScatter(sx.value, sy.value);
    sy.onchange = () => drawScatter(sx.value, sy.value);
    barX.onchange = () => drawBarChart(barX.value, barY.value);
    barY.onchange = () => drawBarChart(barX.value, barY.value);
    lineX.onchange = () => drawLineChart(lineX.value, lineY.value);
    lineY.onchange = () => drawLineChart(lineX.value, lineY.value);
    pieX.onchange = () => drawPieChart(pieX.value, pieY.value);
    pieY.onchange = () => drawPieChart(pieX.value, pieY.value);
}
