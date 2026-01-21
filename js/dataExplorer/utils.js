// ---------- Utilities ----------
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}

function flattenObject(obj, prefix = '', out = {}) {
    // Handle primitives & null
    if (obj === null || obj === undefined) {
        out[prefix.replace(/\.$/, '')] = null;
        return out;
    }

    // If not an object (string, number, boolean, Date)
    if (typeof obj !== 'object' || obj instanceof Date) {
        out[prefix.replace(/\.$/, '')] = obj;
        return out;
    }

    // Array handling
    if (Array.isArray(obj)) {

        // Case: primitive array → expand index-wise
        if (obj.every(v => v === null || typeof v !== 'object')) {
            obj.forEach((v, i) => {
                out[`${prefix}${i}`] = v;
            });
            return out;
        }

        // Case: array of objects → flatten each with index prefix
        obj.forEach((v, i) => {
            flattenObject(v, `${prefix}${i}.`, out);
        });
        return out;
    }

    // Object handling
    Object.keys(obj).forEach(key => {
        flattenObject(obj[key], `${prefix}${key}.`, out);
    });

    return out;
}


function detectType(values) {
    let hasString = false;
    let hasNumber = false;
    let hasDate = false;
    let hasBool = false;
    for (let v of values) {
        if (v === null || v === undefined || v === '') continue;
        if (typeof v === 'boolean') { hasBool = true; continue; }
        if (!isNaN(Number(v)) && v !== true && v !== false) { hasNumber = true; continue; }
        const d = Date.parse(v);
        if (!isNaN(d)) { hasDate = true; continue; }
        hasString = true;
    }
    if (hasString && !hasNumber && !hasDate && !hasBool) return 'string';
    if (hasNumber && !hasString) return 'number';
    if (hasDate && !hasString && !hasNumber) return 'date';
    if (hasBool && !hasString) return 'boolean';
    if (hasNumber && hasString) return 'string';
    if (hasDate && (hasNumber || hasString)) return 'string';
    return 'string';
}

function csvEscape(value) {
    if (value === null || value === undefined) return '';
    const s = String(value);
    if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
        return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
}

function arrayToCSV(rows) {
    if (!rows || !rows.length) return '';
    const cols = Object.keys(rows[0]);
    const lines = [];
    lines.push(cols.map(csvEscape).join(','));
    for (const r of rows) {
        lines.push(cols.map(c => csvEscape(r[c])).join(','));
    }
    return lines.join('\n');
}

function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}
