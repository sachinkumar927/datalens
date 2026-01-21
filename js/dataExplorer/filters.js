// --------- Filtering & search ----------
function applyFiltersAndSearch() {
    const start = performance.now();
    // gather filter rules
    const rules = [];
    filterRulesArea.querySelectorAll('.filter-rule').forEach(rule => {
        const col = rule.querySelector('.filter-col-select').value;
        const vals = Array.from(rule.querySelector('.filter-val-select').selectedOptions).map(o => o.value);
        if (col && vals.length > 0) rules.push({ col, vals: new Set(vals) });
    });

    const search = (globalSearch.value || '').toLowerCase().trim();

    filteredRows = rawRows.filter(row => {
        // rules: all must pass (AND)
        for (const r of rules) {
            const v = (row[r.col] === null || row[r.col] === undefined) ? '(null)' : String(row[r.col]);
            if (!r.vals.has(v)) return false;
        }
        // global search across visible columns
        if (search) {
            let matched = false;
            for (const col of columns) {
                if (!visibleColumns.has(col)) continue;
                const v = row[col];
                if (v === null || v === undefined) continue;
                if (String(v).toLowerCase().includes(search)) { matched = true; break; }
            }
            if (!matched) return false;
        }
        return true;
    });

    const end = performance.now();
    runtimeEl.textContent = `${Math.round(end - start)} ms`;
    currentPage = 1;
    renderTable();
}
