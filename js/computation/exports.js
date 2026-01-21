// === Exports ===
function exportSummaryJSON() {
    const summary = { records: fullData.length, fields: Object.keys(schema).length, schema };
    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'data_summary.json'; a.click(); URL.revokeObjectURL(url);
}

function exportSummaryCSV() {
    const rows = [['field', 'type', 'nullCount', 'unique', 'min', 'max', 'avg', 'median', 'stdDev', 'q1', 'q3', 'sample']];
    Object.keys(schema).forEach(f => {
        const meta = schema[f];
        const vals = fullData.map(r => (r || {})[f]);
        const nmeta = numericStats(vals);
        rows.push([meta.field, meta.inferred, meta.nullCount, meta.unique, nmeta.min ?? '', nmeta.max ?? '', nmeta.avg ?? '', nmeta.median ?? '', nmeta.stdDev ?? '', nmeta.q1 ?? '', nmeta.q3 ?? '', JSON.stringify(meta.sample)]);
    });
    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'schema_summary.csv'; a.click(); URL.revokeObjectURL(url);
}

function exportFilteredDataCSV() {
    if (!filteredView.length) { alert('No data to export'); return; }
    const cols = Array.from(new Set(filteredView.flatMap(r => Object.keys(r || {}))));
    const rows = [cols];
    filteredView.forEach(r => rows.push(cols.map(c => (r && r[c]) == null ? '' : String(r[c]))));
    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'filtered_data.csv'; a.click(); URL.revokeObjectURL(url);
}

function exportFilteredDataExcel() {
    if (!filteredView.length) { alert('No data to export'); return; }
    const ws = XLSX.utils.json_to_sheet(filteredView);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Filtered');
    XLSX.writeFile(wb, 'filtered_data.xlsx');
}

function exportNumericStatsExcel() {
    const numericFields = Object.keys(schema).filter(f => schema[f].inferred === 'number' || schema[f].inferred === 'mixed');
    if (!numericFields.length) { alert('No numeric fields to export'); return; }
    const data = numericFields.map(field => {
        const stats = schema[field].numericStats;
        return {
            Field: field,
            Count: stats.count,
            Min: stats.min ?? '',
            Max: stats.max ?? '',
            Avg: stats.avg ? stats.avg.toFixed(2) : '',
            Median: stats.median ?? '',
            StdDev: stats.stdDev ? stats.stdDev.toFixed(2) : '',
            Q1: stats.q1 ?? '',
            Q3: stats.q3 ?? '',
            Unique: stats.unique,
            Sum: stats.sum ?? '',
            Range: stats.range ?? '',
            Variance: stats.variance ? stats.variance.toFixed(2) : '',
            IQR: stats.iqr ?? '',
            Outliers: stats.outliers
        };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'NumericStats');
    XLSX.writeFile(wb, 'numeric_field_statistics.xlsx');
}

function exportTextStatsExcel() {
    const textFields = Object.keys(schema).filter(f => schema[f].inferred === 'string' || schema[f].inferred === 'mixed');
    if (!textFields.length) { alert('No text fields to export'); return; }
    const data = textFields.map(field => {
        const stats = schema[field].textStats;
        return {
            Field: field,
            Count: stats.count,
            MinLength: stats.minLength ?? '',
            MaxLength: stats.maxLength ?? '',
            AvgLength: stats.avgLength,
            MostFrequent: stats.mostFrequent ?? '',
            Top5: stats.top5.map(t => `${t.value}: ${t.count} (${t.percentage}%)`).join('; '),
            Patterns: Object.entries(stats.patternPercentages).map(([k, v]) => `${k}: ${v}%`).join('; ')
        };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'TextStats');
    XLSX.writeFile(wb, 'text_field_statistics.xlsx');
}

function exportDateStatsExcel() {
    const dateFields = Object.keys(schema).filter(f => schema[f].inferred === 'date' || schema[f].inferred === 'mixed');
    if (!dateFields.length) { alert('No date fields to export'); return; }
    const data = dateFields.map(field => {
        const stats = schema[field].dateStats;
        return {
            Field: field,
            Count: stats.count,
            MinDate: stats.minDate ?? '',
            MaxDate: stats.maxDate ?? '',
            DateRange: stats.dateRange ?? '',
            MostFrequent: stats.mostFrequent ?? '',
            YearMonthDist: Object.entries(stats.yearMonthDist).map(([k, v]) => `${k}: ${v}`).join('; ')
        };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DateStats');
    XLSX.writeFile(wb, 'date_field_statistics.xlsx');
}

function exportValueCountsExcel() {
    const fields = Object.keys(schema);
    if (!fields.length) { alert('No fields to export'); return; }
    const data = [];
    if (selectedValueCountsField && selectedValueCountsField !== '') {
        // Export for selected field
        const field = selectedValueCountsField;
        const vcounts = schema[field].valueCounts;
        vcounts.forEach(vc => {
            data.push({
                Field: field,
                Value: vc.value,
                Count: vc.count,
                Percentage: vc.percentage
            });
        });
    } else {
        // Export for all fields
        fields.forEach(field => {
            const vcounts = schema[field].valueCounts;
            vcounts.forEach(vc => {
                data.push({
                    Field: field,
                    Value: vc.value,
                    Count: vc.count,
                    Percentage: vc.percentage
                });
            });
        });
    }
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ValueCounts');
    XLSX.writeFile(wb, 'value_counts.xlsx');
}
