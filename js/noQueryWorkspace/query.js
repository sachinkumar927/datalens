// Core query logic
window.applyQuery = function() {
    const t0 = performance.now();
    let data = Array.isArray(window.fullData) ? [...window.fullData] : [];

    // WHERE filters
    Array.from(window.filterContainer.querySelectorAll('.filter-row')).forEach(row => {
        const field = row.querySelector('.filterField').value;
        const op = row.querySelector('.filterOp').value;
        const val = row.querySelector('.filterValue').value;
        if (!field || val === '') return;
        data = data.filter(r => {
            const rv = window.safeGet(r, field);
            if (rv === null || rv === undefined) return false;
            const s = String(rv).toLowerCase();
            const vv = String(val).toLowerCase();
            switch (op) {
                case '=': return s === vv;
                case '!=': return s !== vv;
                case '>': return parseFloat(String(rv).replace(/,/g, '')) > parseFloat(val);
                case '<': return parseFloat(String(rv).replace(/,/g, '')) < parseFloat(val);
                case '>=': return parseFloat(String(rv).replace(/,/g, '')) >= parseFloat(val);
                case '<=': return parseFloat(String(rv).replace(/,/g, '')) <= parseFloat(val);
                case 'contains': return s.includes(vv);
                default: return true;
            }
        });
    });

    // SELECT columns
    const cols = window.getSelectedColumns();
    if (cols.length) data = data.map(r => { const o = {}; cols.forEach(c => o[c] = r[c]); return o; });

    // GROUP + AGG
    const groupBy = window.groupBySelect.value;
    const aggFn = window.aggFuncSelect.value;
    const aggField = window.aggFieldSelect.value;
    if (groupBy && aggFn && aggField) {
        const groups = {};
        data.forEach(r => {
            const k = r[groupBy] == null ? '__NULL__' : String(r[groupBy]);
            groups[k] = groups[k] || [];
            groups[k].push(r);
        });
        data = Object.entries(groups).map(([k, arr]) => {
            const out = {}; out[groupBy] = k === '__NULL__' ? null : k;
            switch (aggFn) {
                case 'sum':
                    out[`${aggFn}(${aggField})`] = arr.reduce((a, b) => a + (parseFloat(b[aggField]) || 0), 0);
                    break;
                case 'avg':
                    out[`${aggFn}(${aggField})`] = arr.reduce((a, b) => a + (parseFloat(b[aggField]) || 0), 0) / arr.length;
                    break;
                case 'count':
                    out[`${aggFn}(${aggField})`] = arr.length;
                    break;
                case 'max':
                    out[`${aggFn}(${aggField})`] = Math.max(...arr.map(x => parseFloat(x[aggField]) || -Infinity));
                    break;
                case 'min':
                    out[`${aggFn}(${aggField})`] = Math.min(...arr.map(x => parseFloat(x[aggField]) || Infinity));
                    break;
            }
            return out;
        });
    }

    // ORDER BY
    const orderRules = Array.from(window.orderContainer.querySelectorAll('.order-row')).map(r => {
        const f = r.querySelector('.orderField')?.value; const d = r.querySelector('.orderDir')?.value || 'asc';
        return f ? { field: f, dir: d } : null;
    }).filter(Boolean);
    if (orderRules.length) {
        data.sort((a, b) => {
            for (const rule of orderRules) {
                const fa = a[rule.field]; const fb = b[rule.field];
                if (fa == null && fb != null) return rule.dir === 'asc' ? -1 : 1;
                if (fb == null && fa != null) return rule.dir === 'asc' ? 1 : -1;
                if (fa < fb) return rule.dir === 'asc' ? -1 : 1;
                if (fa > fb) return rule.dir === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }

    window.filteredData = data;
    window.currentView = [...window.filteredData];
    window.currentPage = 1;
    window.renderTable();
    window.renderChart();
    const t1 = performance.now();
    window.runtimeEl.textContent = Math.round(t1 - t0) + ' ms';
};

window.runQueryBtn.onclick = window.applyQuery;
