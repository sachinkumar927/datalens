/* Utility: add key/value row */
function addRow(editorId) {
    const editor = document.getElementById(editorId);
    const row = document.createElement("div");
    row.className = "editor-row";
    row.innerHTML = `
    <input type="text" class="form-control form-control-sm" placeholder="Key" name="key">
    <input type="text" class="form-control form-control-sm" placeholder="Value" name="value">
    <button class="btn btn-sm btn-outline-danger" onclick="this.parentElement.remove()">×</button>
  `;
    editor.appendChild(row);
}

/* Helper: safely get nested value by path (supports numeric indices, e.g., items.0.value) */
function getNestedValue(obj, path) {
    if (!path) return undefined;
    return path.split(".").reduce((acc, key) => {
        if (acc === null || acc === undefined) return undefined;
        if (Array.isArray(acc) && /^\d+$/.test(key)) return acc[Number(key)];
        return acc?.[key];
    }, obj);
}

/* Resolve array from a path and a source JSON, with fallbacks */
function resolveDataArray(path, sourceJson) {
    const candidate = getNestedValue(sourceJson, path);
    if (Array.isArray(candidate)) return candidate;
    if (Array.isArray(sourceJson)) return sourceJson;
    if (Array.isArray(sourceJson?.items)) return sourceJson.items;
    return null;
}

/* Helpers for CSV */
function sanitizeCsvValue(val) {
    if (val === null || val === undefined) return "";
    const str = String(val).replace(/\r?\n|\r/g, " ");
    if (str.includes(",") || str.includes("\"")) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

function flattenObject(obj, prefix = "", res = {}) {
    if (obj === null || obj === undefined) return res;
    if (Array.isArray(obj)) {
        obj.forEach((v, i) => flattenObject(v, `${prefix}${prefix ? "." : ""}${i}`, res));
        return res;
    }
    if (typeof obj === "object") {
        Object.entries(obj).forEach(([k, v]) => {
            flattenObject(v, `${prefix}${prefix ? "." : ""}${k}`, res);
        });
        return res;
    }
    res[prefix] = obj;
    return res;
}

/* Trigger download */
function triggerDownload(objectUrl, filename) {
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
}

/* Utilities for analytics */
function deepGet(obj, path) {
    // dot notation path e.g., "user.name" or "items.0.price"
    if (!path) return undefined;
    return path.split(".").reduce((acc, key) => {
        if (acc === null || acc === undefined) return undefined;
        if (Array.isArray(acc) && /^\d+$/.test(key)) return acc[Number(key)];
        return acc?.[key];
    }, obj);
}

function generateColors(n) {
    const base = [
        "rgba(75, 192, 192, 0.6)",
        "rgba(255, 99, 132, 0.6)",
        "rgba(255, 206, 86, 0.6)",
        "rgba(54, 162, 235, 0.6)",
        "rgba(153, 102, 255, 0.6)",
        "rgba(255, 159, 64, 0.6)"
    ];
    const out = [];
    for (let i = 0; i < n; i++) out.push(base[i % base.length]);
    return out;
}
