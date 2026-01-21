// ---- Profiling ----
function profileColumns(headers, rows) {
    const profile = {};
    headers.forEach(h => profile[h] = {
        typeCounts: { String: 0, Integer: 0, Decimal: 0, Boolean: 0, Date: 0, DateTime: 0, Null: 0 },
        samples: new Set(),
        uniqueSet: new Set(),
        min: null,
        max: null,
        total: 0,
        dominantType: 'String',
        nullPct: 0,
        uniquePct: 0,
        minDisplay: '',
        maxDisplay: ''
    });

    rows.forEach(r => {
        headers.forEach(h => {
            const v = r[h];
            const t = detectType(v);
            const p = profile[h];
            p.typeCounts[t] += 1;
            p.total += 1;

            if (!isNullLike(v)) {
                p.samples.add(String(v));
                p.uniqueSet.add(String(v));
            }
            if (t === 'Integer') {
                const num = Number(v);
                if (!Number.isNaN(num)) {
                    p.min = p.min === null ? num : Math.min(p.min, num);
                    p.max = p.max === null ? num : Math.max(p.max, num);
                }
            }
        });
    });

    Object.keys(profile).forEach(h => {
        const p = profile[h];
        const dominantType = Object.entries(p.typeCounts).sort((a, b) => b[1] - a[1])[0][0];
        const nullCount = p.typeCounts['Null'];
        p.dominantType = dominantType;
        p.nullPct = p.total ? (nullCount / p.total * 100) : 0;
        p.uniquePct = p.total ? (p.uniqueSet.size / p.total * 100) : 0;
        p.samples = Array.from(p.samples).slice(0, 5);
        if (dominantType === 'Date' || dominantType === 'DateTime') {
            p.minDisplay = p.min !== null ? new Date(p.min).toISOString() : '';
            p.maxDisplay = p.max !== null ? new Date(p.max).toISOString() : '';
        } else {
            p.minDisplay = p.min;
            p.maxDisplay = p.max;
        }
    });

    return profile;
}
