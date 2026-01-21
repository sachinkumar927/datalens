// ---- File loading ----
async function readFile(file) {
    const name = file.name.toLowerCase();
    const buf = await file.arrayBuffer();
    if (name.endsWith('.csv')) {
        const text = new TextDecoder().decode(buf);
        return parseCSVText(text);
    } else if (name.endsWith('.json')) {
        const text = new TextDecoder().decode(buf);
        const json = JSON.parse(text);
        return normalizeJSON(json);
    } else if (name.endsWith('.xlsx')) {
        const wb = XLSX.read(buf, { type: 'array' });
        const sheetName = wb.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
        return normalizeRows(rows);
    } else {
        throw new Error('Unsupported file type');
    }
}
function parseCSVText(text) {
    const res = Papa.parse(text, { header: true, skipEmptyLines: true });
    return normalizeRows(res.data);
}
function flatten(obj, prefix = '') {
    const result = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const newKey = prefix ? `${prefix}.${key}` : key;
            if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                Object.assign(result, flatten(obj[key], newKey));
            } else {
                result[newKey] = obj[key];
            }
        }
    }
    return result;
}

function normalizeJSON(json) {
    let data;
    if (Array.isArray(json)) {
        data = json.map(item => flatten(item));
    } else if (Array.isArray(json.data)) {
        data = json.data.map(item => flatten(item));
    } else {
        data = [flatten(json)];
    }
    return normalizeRows(data);
}
function normalizeRows(arr) {
    const headers = [...new Set(arr.flatMap(obj => Object.keys(obj)))];
    const rows = arr.map(obj => {
        const r = {};
        headers.forEach(h => { r[h] = obj[h] !== undefined ? obj[h] : ''; });
        return r;
    });
    return { headers, rows };
}
