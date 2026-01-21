// === Schema building & rendering ===
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
        const dominance = dataTypeDominance(vals);
        const vcounts = valueCounts(vals);
        schema[f] = {
            field: f,
            inferred,
            nullCount,
            unique,
            mixed,
            sample: vals.slice(0, 6),
            numericStats: numericStats(vals),
            textStats: textStats(vals),
            dateStats: dateStats(vals),
            dataTypeDominance: dominance,
            valueCounts: vcounts
        };
    }
    updateSummaryCards();
    renderFieldsSummaryTable();
    updateDataTypeStats();
    renderAllTables();
}

function updateSummaryCards() {
    el('statRecords').textContent = fullData.length;
    const fields = Object.keys(schema);
    el('statFields').textContent = fields.length;
    const numericCount = fields.filter(f => schema[f].inferred === 'number' || schema[f].inferred === 'mixed').length;
    el('statNumeric').textContent = numericCount;
    let totalNulls = 0;
    fields.forEach(f => totalNulls += schema[f].nullCount || 0);
    el('statNulls').textContent = totalNulls;
}

function updateDataTypeStats() {
    const fields = Object.keys(schema);
    const totalFields = fields.length;
    if (totalFields === 0) return;
    const typeCounts = { number: 0, string: 0, boolean: 0, date: 0, mixed: 0 };
    fields.forEach(f => {
        const type = schema[f].inferred;
        if (typeCounts.hasOwnProperty(type)) typeCounts[type]++;
    });
    el('numericPercent').textContent = ((typeCounts.number / totalFields) * 100).toFixed(1) + '%';
    el('stringPercent').textContent = ((typeCounts.string / totalFields) * 100).toFixed(1) + '%';
    el('datePercent').textContent = ((typeCounts.date / totalFields) * 100).toFixed(1) + '%';
    el('booleanPercent').textContent = ((typeCounts.boolean / totalFields) * 100).toFixed(1) + '%';
}

function updateColumnList() {
    const container = el('columnList');
    container.innerHTML = '';
    const fields = Object.keys(schema);
    if (!fields.length) {
        container.textContent = 'No columns loaded';
        return;
    }
    const list = document.createElement('ul');
    list.className = 'list-unstyled mb-0';
    fields.forEach(field => {
        const li = document.createElement('li');
        li.className = 'd-flex justify-content-between small';
        li.innerHTML = `<span>${escapeHtml(field)}</span><span class="text-muted">${schema[field].inferred}</span>`;
        list.appendChild(li);
    });
    container.appendChild(list);
}

function renderFieldsSummaryTable() {
    const container = el('fieldsSummaryTable');
    container.innerHTML = '';
    const table = document.createElement('table');
    table.className = 'table table-striped';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Field</th>
                <th>Type</th>
                <th>Nulls</th>
                <th>Unique</th>
                <th>Min</th>
                <th>Max</th>
                <th>Avg</th>
                <th>Median</th>
                <th>StdDev</th>
                <th>Q1</th>
                <th>Q3</th>
                <th>Sample</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');
    Object.keys(schema).forEach(field => {
        const meta = schema[field];
        const vals = fullData.map(r => (r || {})[field]);
        const nmeta = numericStats(vals);
        const row = document.createElement('tr');
        if (meta.mixed) row.classList.add('field-mixed');
        if (meta.nullCount > (fullData.length * 0.5)) row.classList.add('field-missing');
        row.innerHTML = `
          <td><strong>${escapeHtml(field)}</strong></td>
          <td>${meta.inferred}</td>
          <td>${meta.nullCount}</td>
          <td>${meta.unique}</td>
          <td>${nmeta.min ?? '-'}</td>
          <td>${nmeta.max ?? '-'}</td>
          <td>${nmeta.avg ? nmeta.avg.toFixed(2) : '-'}</td>
          <td>${nmeta.median ?? '-'}</td>
          <td>${nmeta.stdDev ? nmeta.stdDev.toFixed(2) : '-'}</td>
          <td>${nmeta.q1 ?? '-'}</td>
          <td>${nmeta.q3 ?? '-'}</td>
          <td><small>${meta.sample.map(v => escapeHtml(String(v))).join(', ')}</small></td>
        `;
        tbody.appendChild(row);
    });
    container.appendChild(table);
}

// === Render all detailed tables ===
function renderAllTables() {
    renderNumericStatsTable();
    renderTextStatsTable();
    renderDateStatsTable();
    renderValueCountsTable();
}

function renderNumericStatsTable() {
    const container = el('numericStatsTable');
    container.innerHTML = '';
    const table = document.createElement('table');
    table.className = 'table table-striped';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Field</th>
                <th>Count</th>
                <th>Min</th>
                <th>Max</th>
                <th>Avg</th>
                <th>Median</th>
                <th>StdDev</th>
                <th>Q1</th>
                <th>Q3</th>
                <th>Unique</th>
                <th>Sum</th>
                <th>Range</th>
                <th>Variance</th>
                <th>IQR</th>
                <th>Outliers</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');
    const numericFields = Object.keys(schema).filter(f => schema[f].inferred === 'number' || schema[f].inferred === 'mixed');
    if (!numericFields.length) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="15" class="text-muted">No numeric fields available.</td>';
        tbody.appendChild(row);
    } else {
        numericFields.forEach(field => {
            const stats = schema[field].numericStats;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${escapeHtml(field)}</td>
                <td>${stats.count}</td>
                <td>${stats.min ?? '-'}</td>
                <td>${stats.max ?? '-'}</td>
                <td>${stats.avg ? stats.avg.toFixed(2) : '-'}</td>
                <td>${stats.median ?? '-'}</td>
                <td>${stats.stdDev ? stats.stdDev.toFixed(2) : '-'}</td>
                <td>${stats.q1 ?? '-'}</td>
                <td>${stats.q3 ?? '-'}</td>
                <td>${stats.unique}</td>
                <td>${stats.sum ?? '-'}</td>
                <td>${stats.range ?? '-'}</td>
                <td>${stats.variance ? stats.variance.toFixed(2) : '-'}</td>
                <td>${stats.iqr ?? '-'}</td>
                <td>${stats.outliers}</td>
            `;
            tbody.appendChild(row);
        });
    }
    container.appendChild(table);
}

function renderTextStatsTable() {
    const container = el('textStatsTable');
    container.innerHTML = '';
    const textFields = Object.keys(schema).filter(f => schema[f].inferred === 'string' || schema[f].inferred === 'mixed');
    if (!textFields.length) {
        container.innerHTML = '<p>No text fields.</p>';
        return;
    }
    const table = document.createElement('table');
    table.className = 'table table-striped';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Field</th>
                <th>Count</th>
                <th>Min Length</th>
                <th>Max Length</th>
                <th>Avg Length</th>
                <th>Most Frequent</th>
                <th>Top 5</th>
                <th>Patterns (%)</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');
    textFields.forEach(field => {
        const stats = schema[field].textStats;
        const top5 = stats.top5.map(t => `${t.value}: ${t.count} (${t.percentage}%)`).join('<br>');
        const patterns = Object.entries(stats.patternPercentages).map(([k, v]) => `${k}: ${v}%`).join('<br>');
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${escapeHtml(field)}</td>
            <td>${stats.count}</td>
            <td>${stats.minLength ?? '-'}</td>
            <td>${stats.maxLength ?? '-'}</td>
            <td>${stats.avgLength}</td>
            <td>${escapeHtml(stats.mostFrequent ?? '-')}</td>
            <td><small>${top5}</small></td>
            <td><small>${patterns}</small></td>
        `;
        tbody.appendChild(row);
    });
    container.appendChild(table);
}

function renderDateStatsTable() {
    const container = el('dateStatsTable');
    container.innerHTML = '';
    const dateFields = Object.keys(schema).filter(f => schema[f].inferred === 'date' || schema[f].inferred === 'mixed');
    if (!dateFields.length) {
        container.innerHTML = '<p>No date fields.</p>';
        return;
    }
    const table = document.createElement('table');
    table.className = 'table table-striped';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Field</th>
                <th>Count</th>
                <th>Min Date</th>
                <th>Max Date</th>
                <th>Date Range (days)</th>
                <th>Most Frequent</th>
                <th>Year-Month Dist</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');
    dateFields.forEach(field => {
        const stats = schema[field].dateStats;
        const dist = Object.entries(stats.yearMonthDist).map(([k, v]) => `${k}: ${v}`).join('<br>');
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${escapeHtml(field)}</td>
            <td>${stats.count}</td>
            <td>${stats.minDate ?? '-'}</td>
            <td>${stats.maxDate ?? '-'}</td>
            <td>${stats.dateRange ?? '-'}</td>
            <td>${stats.mostFrequent ?? '-'}</td>
            <td><small>${dist}</small></td>
        `;
        tbody.appendChild(row);
    });
    container.appendChild(table);
}

function renderValueCountsTable() {
    const container = el('valueCountsTable');
    container.innerHTML = '';
    const fields = Object.keys(schema);
    if (!fields.length) {
        container.innerHTML = '<p>No fields.</p>';
        return;
    }

    let dataToRender = [];
    if (selectedValueCountsField && selectedValueCountsField !== '') {
        // Render for selected field
        const field = selectedValueCountsField;
        const vcounts = schema[field].valueCounts;
        dataToRender = vcounts.map(vc => ({
            field: field,
            value: vc.value,
            count: vc.count,
            percentage: vc.percentage
        }));
    } else {
        // Render for all fields
        fields.forEach(field => {
            const vcounts = schema[field].valueCounts; // show all value counts
            vcounts.forEach(vc => {
                dataToRender.push({
                    field: field,
                    value: vc.value,
                    count: vc.count,
                    percentage: vc.percentage
                });
            });
        });
    }

    // Pagination
    const total = dataToRender.length;
    const pages = Math.max(1, Math.ceil(total / rowsPerPageValueCounts));
    if (currentPageValueCounts > pages) currentPageValueCounts = pages;
    const start = (currentPageValueCounts - 1) * rowsPerPageValueCounts;
    const pageData = dataToRender.slice(start, start + rowsPerPageValueCounts);

    const table = document.createElement('table');
    table.className = 'table table-striped';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Field</th>
                <th>Value</th>
                <th>Count</th>
                <th>Percentage</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');
    pageData.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${escapeHtml(item.field)}</td>
            <td>${escapeHtml(item.value)}</td>
            <td>${item.count}</td>
            <td>${item.percentage}%</td>
        `;
        tbody.appendChild(row);
    });
    container.appendChild(table);

    // Update pagination info
    el('pageInfoValueCounts').textContent = `Showing ${start + 1}-${start + pageData.length} of ${total} rows`;
    renderPaginationValueCounts(pages);
}

function renderPaginationValueCounts(totalPages) {
    const container = el('paginationValueCounts');
    container.innerHTML = '';

    const makeLi = (label, cls, action) => {
        const li = document.createElement('li'); li.className = 'page-item ' + (cls || '');
        const a = document.createElement('a'); a.className = 'page-link'; a.href = '#'; a.innerHTML = label;
        if (action) a.onclick = (e) => { e.preventDefault(); action(); };
        li.appendChild(a); return li;
    };

    container.appendChild(makeLi('&laquo;', currentPageValueCounts === 1 ? 'disabled' : '', () => { currentPageValueCounts = 1; renderValueCountsTable(); }));
    container.appendChild(makeLi('<', currentPageValueCounts === 1 ? 'disabled' : '', () => { if (currentPageValueCounts > 1) currentPageValueCounts--; renderValueCountsTable(); }));

    const start = Math.max(1, currentPageValueCounts - 2);
    const end = Math.min(totalPages, currentPageValueCounts + 2);
    for (let p = start; p <= end; p++) {
        container.appendChild(makeLi(String(p), p === currentPageValueCounts ? 'active' : '', () => { currentPageValueCounts = p; renderValueCountsTable(); }));
    }

    container.appendChild(makeLi('>', currentPageValueCounts === totalPages ? 'disabled' : '', () => { if (currentPageValueCounts < totalPages) currentPageValueCounts++; renderValueCountsTable(); }));
    container.appendChild(makeLi('&raquo;', currentPageValueCounts === totalPages ? 'disabled' : '', () => { currentPageValueCounts = totalPages; renderValueCountsTable(); }));
}
