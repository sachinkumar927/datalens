// === Helpers: type detection and conversion ===
function isDateString(s) {
    if (s == null) return false;
    const d = new Date(s);
    return !isNaN(d.valueOf());
}

function isBooleanLike(v) {
    if (typeof v === 'boolean') return true;
    const s = String(v).trim().toLowerCase();
    return ['true', 'false', '0', '1', 'yes', 'no'].includes(s);
}

function isNumberLike(v) {
    if (v == null || v === '') return false;
    return !isNaN(parseFloat(String(v))) && isFinite(Number(String(v)));
}

function toNumberSafe(v) {
    if (v == null || v === '') return null;
    const n = Number(String(v));
    return isFinite(n) ? n : null;
}

function isNumeric(n) {
    return typeof n === 'number' && isFinite(n);
}

// infer type for an array of values
function inferType(values) {
    const counts = { number: 0, string: 0, boolean: 0, date: 0, empty: 0 };
    for (const v of values) {
        if (v === null || v === undefined || v === "") { counts.empty++; continue; }
        if (typeof v === 'boolean') { counts.boolean++; continue; }
        if (isNumberLike(v)) { counts.number++; continue; }
        if (isDateString(v)) { counts.date++; continue; }
        if (isBooleanLike(v)) { counts.boolean++; continue; }
        counts.string++;
    }
    const nonEmptyKeys = Object.keys(counts).filter(k => k !== 'empty');
    let best = 'string', bestCount = -1;
    for (const k of nonEmptyKeys) {
        if (counts[k] > bestCount) { best = k; bestCount = counts[k]; }
    }
    const nonZero = nonEmptyKeys.filter(k => counts[k] > 0);
    if (nonZero.length > 1) return 'mixed';
    if (best === 'empty') return 'empty';
    return best;
}

// Handy selectors
const el = id => document.getElementById(id);

// utility escape for HTML
function escapeHtml(str) {
    return String(str || '').replace(/[&<>"'`=\/]/g, function (s) {
        return ({
            '&': '&amp;', '<': '<', '>': '>', '"': '"', "'": '&#39;', '/': '&#x2F;', '`': '&#x60;', '=': '&#x3D;'
        })[s];
    });
}
