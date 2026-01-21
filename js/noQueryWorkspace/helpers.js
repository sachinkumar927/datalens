// Helper functions
window.detectType = function(values) {
    // Basic detection: number, boolean, date, string
    let num = 0, bool = 0, datec = 0, str = 0, samples = 0;
    for (const v of (values || []).slice(0, 50)) {
        samples++;
        if (v === null || v === undefined || v === '') { continue }
        if (typeof v === 'boolean') { bool++; continue }
        const n = parseFloat(String(v).replace(/,/g, ''));
        if (!isNaN(n) && isFinite(n)) { num++; continue }
        const d = Date.parse(v);
        if (!isNaN(d)) { datec++; continue }
        str++;
    }
    if (samples === 0) return 'string';
    if (num > samples * 0.6) return 'number';
    if (datec > samples * 0.6) return 'date';
    if (bool > samples * 0.6) return 'boolean';
    return 'string';
};

window.formatNumber = function(n) { return (n || 0).toLocaleString(); };

window.safeGet = function(obj, key) { return obj && Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : null };
