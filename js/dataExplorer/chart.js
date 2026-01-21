// ---------- Chart ----------
function renderChart() {
    if (!filteredRows || !filteredRows.length) return alert('No data to chart.');

    const type = chartTypeSel.value;
    const xcol = chartX.value;
    const ycol = chartY.value;

    if (!xcol) return alert('Select X column (category).');
    if (!ycol) return alert('Select Y column (numeric).');

    // --- Prepare Data ---
    const map = new Map();
    filteredRows.forEach(r => {
        const x = r[xcol] === null || r[xcol] === undefined ? '(null)' : String(r[xcol]);
        const yv = Number(r[ycol]);
        const y = isNaN(yv) ? 0 : yv;
        map.set(x, (map.get(x) || 0) + y);
    });

    const labels = Array.from(map.keys()).slice(0, 1000);
    const data = labels.map(l => map.get(l));

    // --- Destroy existing chart ---
    if (chartInstance) chartInstance.destroy();

    const ctx = chartCanvas.getContext('2d');

    // --- Chart Config ---
    const cfg = {
        type: type,
        data: {
            labels,
            datasets: [{
                label: `${ycol} by ${xcol}`,
                data: data,

                // ✅ Smooth line for line chart
                tension: type === 'line' ? 0.4 : 0,

                borderWidth: 2,
                pointRadius: type === 'line' ? 3 : 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    };

    // Pie chart settings
    if (type === 'pie') {
        cfg.options.plugins = {
            legend: { position: 'right' }
        };
    }

    // --- Initialize Chart ---
    chartInstance = new Chart(ctx, cfg);
}
