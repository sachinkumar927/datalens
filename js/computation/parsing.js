// === Helpers for flattening ===
function flattenObject(obj, prefix = '') {
    let flattened = {};
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            let newKey = prefix ? prefix + '.' + key : key;
            if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                Object.assign(flattened, flattenObject(obj[key], newKey));
            } else {
                flattened[newKey] = obj[key];
            }
        }
    }
    return flattened;
}

// === File parsing (CSV/Excel/JSON) ===
async function parseFile(file) {
    const name = (file.name || '').toLowerCase();
    try {
        if (name.endsWith('.json')) {
            const txt = await file.text();
            let parsed = JSON.parse(txt);
            if (Array.isArray(parsed)) {
                parsed = parsed.map(item => typeof item === 'object' && item !== null ? flattenObject(item) : item);
                return parsed;
            } else if (typeof parsed === 'object' && parsed !== null) {
                return [flattenObject(parsed)];
            }
            return [];
        } else if (name.endsWith('.csv')) {
            const txt = await file.text();
            const wb = XLSX.read(txt, { type: 'string' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            return XLSX.utils.sheet_to_json(ws, { defval: null });
        } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
            const buf = await file.arrayBuffer();
            const wb = XLSX.read(buf, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            return XLSX.utils.sheet_to_json(ws, { defval: null });
        } else {
            alert('Unsupported file type');
            return [];
        }
    } catch (err) {
        console.error(err);
        alert('Failed to parse file: ' + (err.message || err));
        return [];
    }
}
