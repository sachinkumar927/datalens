// ---- Compare A vs B ----
function compareDatasets(A, B) {
    const issues = [];
    if (!A.rows.length || !B.rows.length) return issues;
    const n = Math.min(A.rows.length, B.rows.length);
    for (let i = 0; i < n; i++) {
        const ra = A.rows[i];
        const rb = B.rows[i];
        A.headers.forEach(h => {
            const va = ra[h] ?? '';
            const vb = rb[h] ?? '';
            if (String(va) !== String(vb)) {
                issues.push({ row: i + 1, col: h, type: 'Mismatch', rule: 'Compare', message: 'A != B', aVal: va, bVal: vb });
            }
        });
    }
    return issues;
}
