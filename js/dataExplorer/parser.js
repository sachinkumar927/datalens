// ---------- Parsing ----------
async function parseFile(file) {
    const name = file.name;
    const size = file.size;
    const type = file.type || '';
    const ext = (name.split('.').pop() || '').toLowerCase();

    const text = async () => {
        return new Promise((res, rej) => {
            const fr = new FileReader();
            fr.onload = e => res(e.target.result);
            fr.onerror = e => rej(e);
            fr.readAsText(file);
        });
    };

    if (['xlsx', 'xls'].includes(ext)) {
        const data = await file.arrayBuffer();
        const wb = XLSX.read(data, { type: 'array' });
        const sheetName = wb.SheetNames[0];
        const sheet = wb.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: null });
        return { rows: normalizeRows(json), filename: name, size, mime: type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
    }

    if (ext === 'json') {
        const t = await text();
        let parsed;
        try { parsed = JSON.parse(t); }
        catch (e) { throw new Error('Invalid JSON'); }
        let arr = [];
        if (Array.isArray(parsed)) arr = parsed;
        else {
            const arrProp = Object.keys(parsed).find(k => Array.isArray(parsed[k]));
            if (arrProp) arr = parsed[arrProp];
            else arr = [parsed];
        }
        const rows = arr.map(r => flattenObject(r, '', {}));
        return { rows: normalizeRows(rows), filename: name, size, mime: 'application/json' };
    }

    if (ext === 'xml') {
        const t = await text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(t, 'text/xml');
        const root = doc.documentElement;
        const children = Array.from(root.children);
        const tagCounts = {};
        children.forEach(c => tagCounts[c.tagName] = (tagCounts[c.tagName] || 0) + 1);
        let repeatingTag = null;
        for (const k in tagCounts) if (tagCounts[k] > 1) { repeatingTag = k; break; }
        const nodes = repeatingTag ? Array.from(root.getElementsByTagName(repeatingTag)) : children;
        const rows = nodes.map(n => {
            const obj = {};
            for (const child of Array.from(n.children)) {
                obj[child.tagName] = child.textContent;
            }
            return obj;
        });
        return { rows: normalizeRows(rows), filename: name, size, mime: 'application/xml' };
    }

    // fallback for csv/txt
    const raw = await text();
    if (ext === 'csv' || ext === 'txt' || raw.includes(',') || raw.includes('\n')) {
        const lines = raw.split(/\r\n|\n/);
        if (lines.length === 0) return { rows: [], filename: name, size, mime: 'text/plain' };
        const headerLine = lines[0];
        function splitCSVLine(line) {
            const out = []; let cur = ''; let inQuote = false;
            for (let i = 0; i < line.length; i++) {
                const ch = line[i];
                if (ch === '"') { inQuote = !inQuote; continue; }
                if (ch === ',' && !inQuote) { out.push(cur); cur = ''; continue; }
                cur += ch;
            }
            out.push(cur);
            return out;
        }
        const headers = splitCSVLine(headerLine).map(h => h.trim());
        const rows = [];
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const cells = splitCSVLine(lines[i]);
            const obj = {};
            for (let c = 0; c < headers.length; c++) obj[headers[c] || ('col' + c)] = (cells[c] !== undefined ? cells[c] : null);
            rows.push(obj);
        }
        return { rows: normalizeRows(rows), filename: name, size, mime: 'text/csv' };
    }

    try {
        const t2 = await text();
        const parsed = JSON.parse(t2);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        return { rows: normalizeRows(arr.map(r => flattenObject(r, '', {}))), filename: name, size, mime: 'application/json' };
    } catch (e) {
        const lines = (await text()).split(/\r\n|\n/).filter(Boolean);
        const rows = lines.map((l, i) => ({ line: l }));
        return { rows: normalizeRows(rows), filename: name, size, mime: 'text/plain' };
    }
}

function normalizeRows(rows) {
    const allKeys = new Set();
    rows.forEach(r => {
        if (typeof r !== 'object' || r === null) { allKeys.add('value'); }
        else Object.keys(r).forEach(k => allKeys.add(k));
    });
    const keys = Array.from(allKeys);
    return rows.map(r => {
        const out = {};
        keys.forEach(k => out[k] = (r && (k in r) ? r[k] : null));
        return out;
    });
}
