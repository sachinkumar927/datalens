// Rendering functions
window.renderTable = function() {
    const thead = window.dataTable.querySelector('thead');
    const tbody = window.dataTable.querySelector('tbody');
    thead.innerHTML = ''; tbody.innerHTML = '';
    if (!Array.isArray(window.currentView) || !window.currentView.length) {
        thead.innerHTML = '<tr><th>No data</th></tr>';
        window.showingCount.textContent = '0';
        return;
    }
    const cols = Object.keys(window.currentView[0] || {});
    thead.innerHTML = `<tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr>`;
    const ps = window.pageSizeDefault();
    const total = window.currentView.length;
    const pages = Math.max(1, Math.ceil(total / ps));
    if (window.currentPage > pages) window.currentPage = pages;
    const start = (window.currentPage - 1) * ps; const end = Math.min(total, start + ps);
    const slice = window.currentView.slice(start, end);
    tbody.innerHTML = slice.map(r => `<tr>${cols.map(c => `<td>${r[c] ?? ''}</td>`).join('')}</tr>`).join('');
    window.showingCount.textContent = `${start + 1}-${end} of ${window.formatNumber(total)}`;
    window.renderPaginationControls(pages);
};

window.renderPaginationControls = function(totalPages) {
    window.pagination.innerHTML = '';

    const makeLi = (label, disabled, active, action) => {
        const li = document.createElement('li');
        li.className = 'page-item' + (disabled ? ' disabled' : '') + (active ? ' active' : '');
        const a = document.createElement('a');
        a.className = 'page-link';
        a.href = '#';
        a.innerHTML = label;
        if (!disabled && action) a.onclick = (e) => { e.preventDefault(); action(); };
        li.appendChild(a);
        return li;
    };

    window.pagination.appendChild(makeLi('&laquo;', window.currentPage === 1, false, () => { window.currentPage = 1; window.renderTable(); }));
    window.pagination.appendChild(makeLi('<', window.currentPage === 1, false, () => { if (window.currentPage > 1) window.currentPage--; window.renderTable(); }));

    // show sliding window of pages (2 pages left/right)
    const start = Math.max(1, window.currentPage - 2);
    const end = Math.min(totalPages, window.currentPage + 2);
    for (let p = start; p <= end; p++) {
        window.pagination.appendChild(makeLi(String(p), false, p === window.currentPage, () => { window.currentPage = p; window.renderTable(); }));
    }

    window.pagination.appendChild(makeLi('>', window.currentPage === totalPages, false, () => { if (window.currentPage < totalPages) window.currentPage++; window.renderTable(); }));
    window.pagination.appendChild(makeLi('&raquo;', window.currentPage === totalPages, false, () => { window.currentPage = totalPages; window.renderTable(); }));
};

window.renderChart = function() {
    const canvas = document.getElementById('chartCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return;
    if (window.chart) window.chart.destroy();
    if (!window.currentView.length) return;
    const cols = Object.keys(window.currentView[0] || {});
    const x = cols[0]; const y = cols[1] || cols[0];
    const labels = window.currentView.map(r => r[x]);
    const data = window.currentView.map(r => parseFloat(String(r[y]).replace(/,/g, '')) || 0);
    try {
        window.chart = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets: [{ label: y, data }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { x: { ticks: { autoSkip: true } } } }
        });
    } catch (e) {
        console.warn('Chart render failed', e);
    }
};
