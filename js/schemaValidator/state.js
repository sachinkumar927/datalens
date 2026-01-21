// ---- State ----
const S = {
    A: { headers: [], rows: [] },
    B: { headers: [], rows: [] },
    fileAName: '',
    fileBName: '',
    issues: [],                     // {row, col, type, rule, message, aVal, bVal}
    pageSize: 20,
    currentPage: 1,
    rules: [],                      // [{ id, col, type, params }]
    profile: {},
    audit: { total: 0, valid: 0, invalid: 0 },
};

// ---- UI refs ----
const ui = {
    fileA: document.getElementById('fileA'),
    fileB: document.getElementById('fileB'),
    loadBtn: document.getElementById('loadBtn'),
    loadSpinner: document.getElementById('loadSpinner'),
    clearBtn: document.getElementById('clearBtn'),

    // Built-in settings
    primaryKey: document.getElementById('primaryKey'),
    compositeKey: document.getElementById('compositeKey'),
    mandatoryCols: document.getElementById('mandatoryCols'),
    nullTokens: document.getElementById('nullTokens'),
    mixedTypePct: document.getElementById('mixedTypePct'),
    nullThresholds: document.getElementById('nullThresholds'),
    defaultDecimalMax: document.getElementById('defaultDecimalMax'),
    crossDeps: document.getElementById('crossDeps'),

    profileBtn: document.getElementById('profileBtn'),
    validateBuiltinBtn: document.getElementById('validateBuiltinBtn'),
    validateSpinner: document.getElementById('validateSpinner'),
    profilingWrap: document.getElementById('profilingWrap'),

    // Rule builder
    rulesContainer: document.getElementById('rulesContainer'),
    addRuleBtn: document.getElementById('addRuleBtn'),
    validateBtn: document.getElementById('validateBtn'),
    validateRulesSpinner: document.getElementById('validateRulesSpinner'),
    clearRulesBtn: document.getElementById('clearRulesBtn'),

    // Compare
    compareBtn: document.getElementById('compareBtn'),
    compareSpinner: document.getElementById('compareSpinner'),

    // Issues & pagination
    issuesTableBody: document.querySelector('#issuesTable tbody'),
    paginationControls: document.getElementById('paginationControls'),
    pageSizeSelect: document.getElementById('pageSizeSelect'),
    summaryLabel: document.getElementById('summaryLabel'),
    recordInfo: document.getElementById('recordInfo'),

    // Exports
    downloadExcelIssues: document.getElementById('downloadExcelIssues'),
    downloadCsvIssues: document.getElementById('downloadCsvIssues'),

    // Loader overlay
    globalLoader: document.getElementById('globalLoader')
};

// ---- Utils ----
function showSpinner(el, show) { el.classList.toggle('d-none', !show); }
function showOverlay(show) { ui.globalLoader.classList.toggle('d-none', !show); }
function escapeHTML(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '<').replace(/>/g, '>'); }
function parseNullTokens() { return ui.nullTokens.value.split(',').map(s => s.trim()); }
function isNullLike(val) {
    if (val === undefined || val === null) return true;
    const v = String(val).trim();
    if (v.length === 0) return true;
    const lower = v.toLowerCase();
    return parseNullTokens().map(t => t.toLowerCase()).includes(lower);
}
function decimalPrecision(val) {
    const s = String(val);
    const idx = s.indexOf('.');
    return idx === -1 ? 0 : (s.length - idx - 1);
}
function detectType(val) {
    if (isNullLike(val)) return 'Null';
    const v = String(val).trim();
    const lower = v.toLowerCase();
    if (['true', 'false', 'yes', 'no'].includes(lower)) return 'Boolean';
    if (/^-?\d+$/.test(v)) return 'Integer';
    if (/^-?\d+\.\d+$/.test(v)) return 'Decimal';
    if (/^\d{4}-\d{2}-\d{2}$/.test(v) || /^\d{2}-\d{2}-\d{4}$/.test(v)) return 'Date';
    if (/^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+\-]\d{2}:\d{2})?)?$/.test(v)) return 'DateTime';
    return 'String';
}
function validDateLiteral(v) {
    const s = String(v).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const [Y, M, D] = s.split('-').map(Number);
        const dt = new Date(Date.UTC(Y, M - 1, D));
        return dt.getUTCFullYear() === Y && dt.getUTCMonth() === (M - 1) && dt.getUTCDate() === D;
    }
    if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
        const [D, M, Y] = s.split('-').map(Number);
        const dt = new Date(Date.UTC(Y, M - 1, D));
        return dt.getUTCFullYear() === Y && dt.getUTCMonth() === (M - 1) && dt.getUTCDate() === D;
    }
    const iso = Date.parse(s);
    return !Number.isNaN(iso);
}
