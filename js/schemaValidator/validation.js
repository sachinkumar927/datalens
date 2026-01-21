// ---- Built-in validations (3–9) ----
function readBuiltinConfig() {
    let nullThresholds = {};
    let crossDeps = [];
    try {
        nullThresholds = ui.nullThresholds.value.trim() ? JSON.parse(ui.nullThresholds.value) : {};
    } catch { alert('Invalid JSON in Null thresholds'); }
    try {
        crossDeps = ui.crossDeps.value.trim() ? JSON.parse(ui.crossDeps.value) : [];
    } catch { alert('Invalid JSON in Cross-column dependencies'); }

    // Get checked checkboxes for composite key
    const compositeKey = Array.from(document.querySelectorAll('#compositeKeyList input[type="checkbox"]:checked')).map(cb => cb.value);

    // Get checked checkboxes for mandatory columns
    const mandatoryCols = Array.from(document.querySelectorAll('#mandatoryColsList input[type="checkbox"]:checked')).map(cb => cb.value);

    return {
        primaryKey: ui.primaryKey.value.trim(),
        compositeKey,
        mandatoryCols,
        nullTokens: parseNullTokens(),
        mixedTypePct: Number(ui.mixedTypePct.value) || 20,
        nullThresholds,
        defaultDecimalMax: Number(ui.defaultDecimalMax.value) || 2,
        crossDeps
    };
}

function validateBuiltin(headers, rows, profile, cfg) {
    const issues = [];

    // 3.1 Mixed type threshold
    headers.forEach(h => {
        const p = profile[h];
        const nonDominant = p.total - p.typeCounts[p.dominantType];
        const nonDomPct = p.total ? (nonDominant / p.total * 100) : 0;
        if (nonDomPct > cfg.mixedTypePct) {
            issues.push({ row: '-', col: h, type: 'Warning', rule: '3.1', message: `Mixed types ${nonDomPct.toFixed(1)}% > ${cfg.mixedTypePct}%`, aVal: '', bVal: '' });
        }
    });

    // 4.2 Null % threshold
    headers.forEach(h => {
        const p = profile[h];
        const th = cfg.nullThresholds[h];
        if (th !== undefined) {
            if (p.nullPct > th) {
                issues.push({ row: '-', col: h, type: 'Invalid', rule: '4.2', message: `Null % ${p.nullPct.toFixed(1)} > ${th}%`, aVal: '', bVal: '' });
            }
        }
    });

    // 6.1 Primary key uniqueness
    if (cfg.primaryKey) {
        const seen = new Set();
        rows.forEach((r, i) => {
            const k = String(r[cfg.primaryKey] ?? '');
            if (isNullLike(k)) {
                issues.push({ row: i + 1, col: cfg.primaryKey, type: 'Invalid', rule: '6.1', message: 'Primary key is NULL', aVal: k, bVal: '' });
            } else if (seen.has(k)) {
                issues.push({ row: i + 1, col: cfg.primaryKey, type: 'Invalid', rule: '6.1', message: `Duplicate key: ${k}`, aVal: k, bVal: '' });
            } else {
                seen.add(k);
            }
        });
    }

    // 6.3 Composite key uniqueness
    if (cfg.compositeKey.length > 0) {
        const seen = new Set();
        rows.forEach((r, i) => {
            const parts = cfg.compositeKey.map(c => String(r[c] ?? ''));
            const nullish = parts.some(p => isNullLike(p));
            const key = parts.join('|');
            if (nullish) {
                issues.push({ row: i + 1, col: cfg.compositeKey.join(','), type: 'Invalid', rule: '6.3', message: 'Composite key has NULL part', aVal: key, bVal: '' });
            } else if (seen.has(key)) {
                issues.push({ row: i + 1, col: cfg.compositeKey.join(','), type: 'Invalid', rule: '6.3', message: `Duplicate composite: ${key}`, aVal: key, bVal: '' });
            } else {
                seen.add(key);
            }
        });
    }

    // 6.2 Row-level duplicates
    {
        const seen = new Set();
        rows.forEach((r, i) => {
            const key = headers.map(h => String(r[h] ?? '')).join('|');
            if (seen.has(key)) {
                issues.push({ row: i + 1, col: '(row)', type: 'Warning', rule: '6.2', message: 'Duplicate row', aVal: '', bVal: '' });
            } else {
                seen.add(key);
            }
        });
    }

    // 4.3 Mandatory columns not null
    cfg.mandatoryCols.forEach(col => {
        rows.forEach((r, i) => {
            if (isNullLike(r[col])) {
                issues.push({ row: i + 1, col, type: 'Invalid', rule: '4.3', message: 'Value must not be NULL', aVal: '', bVal: '' });
            }
        });
    });

    // 3.2 Numeric rules (integer format + decimal precision)
    headers.forEach(h => {
        rows.forEach((r, i) => {
            const v = r[h];
            if (isNullLike(v)) return;
            const t = detectType(v);
            if (t === 'Integer') {
                if (!/^-?\d+$/.test(String(v).trim())) {
                    issues.push({ row: i + 1, col: h, type: 'Invalid', rule: '3.2', message: 'Integer contains invalid chars', aVal: v, bVal: '' });
                }
            }
            if (t === 'Decimal') {
                const prec = decimalPrecision(v);
                if (prec > cfg.defaultDecimalMax) {
                    issues.push({ row: i + 1, col: h, type: 'Invalid', rule: '3.2', message: `Precision ${prec} > ${cfg.defaultDecimalMax}`, aVal: v, bVal: '' });
                }
            }
        });
    });

    // 3.3 Date validation
    headers.forEach(h => {
        rows.forEach((r, i) => {
            const v = r[h];
            if (isNullLike(v)) return;
            const t = detectType(v);
            if ((t === 'Date' || t === 'DateTime') && !validDateLiteral(v)) {
                issues.push({ row: i + 1, col: h, type: 'Invalid', rule: '3.3', message: 'Invalid date literal', aVal: v, bVal: '' });
            }
        });
    });

    // 3.4 Boolean validation
    headers.forEach(h => {
        rows.forEach((r, i) => {
            const v = r[h];
            if (isNullLike(v)) return;
            const t = detectType(v);
            if (t === 'Boolean') {
                const ok = ['true', 'false', '1', '0', 'yes', 'no'].includes(String(v).trim().toLowerCase());
                if (!ok) {
                    issues.push({ row: i + 1, col: h, type: 'Invalid', rule: '3.4', message: 'Invalid boolean value', aVal: v, bVal: '' });
                }
            }
        });
    });

    // 5.x Examples (Age & Salary range, length, patterns, domain) — same as before
    // Age 0–120
    const ageCol = headers.find(h => h.toLowerCase() === 'age');
    if (ageCol) {
        rows.forEach((r, i) => {
            const v = r[ageCol];
            if (isNullLike(v)) return;
            if (!/^-?\d+(\.\d+)?$/.test(String(v))) {
                issues.push({ row: i + 1, col: ageCol, type: 'Invalid', rule: '5.1', message: 'Age must be numeric', aVal: v, bVal: '' });
            } else {
                const n = Number(v);
                if (n < 0 || n > 120) {
                    issues.push({ row: i + 1, col: ageCol, type: 'Invalid', rule: '5.1', message: 'Age out of range (0–120)', aVal: v, bVal: '' });
                }
            }
        });
    }
    // Salary ≥ 0
    const salaryCol = headers.find(h => h.toLowerCase() === 'salary');
    if (salaryCol) {
        rows.forEach((r, i) => {
            const v = r[salaryCol];
            if (isNullLike(v)) return;
            if (!/^-?\d+(\.\d+)?$/.test(String(v))) {
                issues.push({ row: i + 1, col: salaryCol, type: 'Invalid', rule: '5.1', message: 'Salary must be numeric', aVal: v, bVal: '' });
            } else if (Number(v) < 0) {
                issues.push({ row: i + 1, col: salaryCol, type: 'Invalid', rule: '5.1', message: 'Salary must be ≥ 0', aVal: v, bVal: '' });
            }
        });
    }
    // Phone length = 10
    const phoneCol = headers.find(h => h.toLowerCase() === 'phone');
    if (phoneCol) {
        rows.forEach((r, i) => {
            const s = String(r[phoneCol] ?? '').trim();
            if (isNullLike(s)) return;
            if (s.length !== 10) {
                issues.push({ row: i + 1, col: phoneCol, type: 'Invalid', rule: '5.2', message: 'Phone length must be 10', aVal: s, bVal: '' });
            }
        });
    }
    // Name ≤100
    const nameCol = headers.find(h => h.toLowerCase() === 'name');
    if (nameCol) {
        rows.forEach((r, i) => {
            const s = String(r[nameCol] ?? '');
            if (isNullLike(s)) return;
            if (s.length > 100) {
                issues.push({ row: i + 1, col: nameCol, type: 'Invalid', rule: '5.2', message: 'Name must be ≤ 100 chars', aVal: s, bVal: '' });
            }
        });
    }
    // Patterns: Email, Phone, PIN/ZIP, UUID
    const emailCol = headers.find(h => h.toLowerCase() === 'email');
    if (emailCol) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        rows.forEach((r, i) => {
            const v = r[emailCol];
            if (isNullLike(v)) return;
            if (!re.test(String(v))) {
                issues.push({ row: i + 1, col: emailCol, type: 'Invalid', rule: '5.3', message: 'Invalid email format', aVal: v, bVal: '' });
            }
        });
    }
    if (phoneCol) {
        const rePhone = /^\d{10}$/;
        rows.forEach((r, i) => {
            const v = r[phoneCol];
            if (isNullLike(v)) return;
            if (!rePhone.test(String(v))) {
                issues.push({ row: i + 1, col: phoneCol, type: 'Invalid', rule: '5.3', message: 'Invalid phone format', aVal: v, bVal: '' });
            }
        });
    }
    const pincodeCol = headers.find(h => ['pincode', 'zip', 'zipcode'].includes(h.toLowerCase()));
    if (pincodeCol) {
        const rePin = /^\d{5,6}$/;
        rows.forEach((r, i) => {
            const v = r[pincodeCol];
            if (isNullLike(v)) return;
            if (!rePin.test(String(v))) {
                issues.push({ row: i + 1, col: pincodeCol, type: 'Invalid', rule: '5.3', message: 'Invalid PIN/ZIP format', aVal: v, bVal: '' });
            }
        });
    }
    const uuidCol = headers.find(h => h.toLowerCase() === 'uuid');
    if (uuidCol) {
        const reUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        rows.forEach((r, i) => {
            const v = r[uuidCol];
            if (isNullLike(v)) return;
            if (!reUUID.test(String(v))) {
                issues.push({ row: i + 1, col: uuidCol, type: 'Invalid', rule: '5.3', message: 'Invalid UUID format', aVal: v, bVal: '' });
            }
        });
    }
    // Domain: Gender, Status
    const genderCol = headers.find(h => h.toLowerCase() === 'gender');
    if (genderCol) {
        const allowed = new Set(['m', 'f', 'other']);
        rows.forEach((r, i) => {
            const v = String(r[genderCol] ?? '').toLowerCase().trim();
            if (isNullLike(v)) return;
            if (!allowed.has(v)) {
                issues.push({ row: i + 1, col: genderCol, type: 'Invalid', rule: '5.4', message: 'Allowed: M/F/Other', aVal: v, bVal: '' });
            }
        });
    }
    const statusCol = headers.find(h => h.toLowerCase() === 'status');
    if (statusCol) {
        const allowed = new Set(['active', 'inactive', 'pending', 'closed']);
        rows.forEach((r, i) => {
            const v = String(r[statusCol] ?? '').toLowerCase().trim();
            if (isNullLike(v)) return;
            if (!allowed.has(v)) {
                issues.push({ row: i + 1, col: statusCol, type: 'Invalid', rule: '5.4', message: 'Allowed: Active/Inactive/Pending/Closed', aVal: v, bVal: '' });
            }
        });
    }

    // 7.2 Cross-column dependencies
    cfg.crossDeps.forEach(dep => {
        const rule = String(dep.rule || '').trim();
        if (!rule) return;
        rows.forEach((r, i) => {
            const parts = rule.split('=>').map(s => s.trim());
            const left = parts[0];
            const right = parts[1] || null;
            const evalExpr = (expr) => {
                const m = expr.match(/^(.+?)\s*(==|!=|>=|<=|>|<)\s*(.+)$/);
                if (!m) return { ok: false, msg: 'Invalid expression' };
                let [_, a, op, b] = m;
                a = a.trim(); b = b.trim();
                const valA = r[a] !== undefined ? r[a] : a;
                let valB = r[b] !== undefined ? r[b] : b;

                const isNullA = isNullLike(valA);
                const isNullBLit = b.toUpperCase() === 'NULL';

                const numAok = /^-?\d+(\.\d+)?$/.test(String(valA));
                const numBok = /^-?\d+(\.\d+)?$/.test(String(valB));

                function cmp(aVal, bVal) {
                    if (op === '==') return aVal == bVal;
                    if (op === '!=') return aVal != bVal;
                    if (op === '>=') return aVal >= bVal;
                    if (op === '<=') return aVal <= bVal;
                    if (op === '>') return aVal > bVal;
                    if (op === '<') return aVal < bVal;
                    return false;
                }

                if (isNullBLit) {
                    if (op === '==') return { ok: isNullA, msg: isNullA ? '' : `${a} should be NULL` };
                    if (op === '!=') return { ok: !isNullA, msg: !isNullA ? '' : `${a} should NOT be NULL` };
                }

                if (numAok && numBok) {
                    const ok = cmp(Number(valA), Number(valB));
                    return { ok, msg: ok ? '' : `${a} ${op} ${b} failed` };
                } else if (/^\d{4}-\d{2}-\d{2}/.test(String(valA)) || /^\d{4}-\d{2}-\d{2}/.test(String(valB))) {
                    const ok = cmp(Date.parse(valA), Date.parse(valB));
                    return { ok, msg: ok ? '' : `${a} ${op} ${b} failed` };
                } else {
                    const ok = cmp(String(valA), String(valB));
                    return { ok, msg: ok ? '' : `${a} ${op} ${b} failed` };
                }
            };

            if (!right) {
                const res = evalExpr(left);
                if (!res.ok) issues.push({ row: i + 1, col: '(cross)', type: 'Invalid', rule: '7.2', message: res.msg || 'Dependency failed', aVal: '', bVal: '' });
            } else {
                const trig = evalExpr(left);
                if (trig.ok) {
                    const res = evalExpr(right);
                    if (!res.ok) issues.push({ row: i + 1, col: '(cross)', type: 'Invalid', rule: '7.2', message: res.msg || 'Conditional dependency failed', aVal: '', bVal: '' });
                }
            }
        });
    });

    // Audit
    const invalidRows = new Set(issues.filter(x => x.type === 'Invalid' && x.row !== '-').map(x => x.row));
    S.audit.total = rows.length;
    S.audit.invalid = invalidRows.size;
    S.audit.valid = rows.length - invalidRows.size;

    return issues;
}

// ---- Custom rule builder types ----
// Rule type constants
const RULE_TYPES = [
    { v: 'isNotNull', t: 'Not Null' },
    { v: 'isInteger', t: 'Integer' },
    { v: 'isFloat', t: 'Float (decimal precision)' },
    { v: 'stringLength', t: 'String length (min/max)' },
    { v: 'booleanAllowed', t: 'Boolean (allowed values)' },
    { v: 'contains', t: 'Contains / Like' },
    { v: 'regex', t: 'Regex match' },
    { v: 'dataType', t: 'Data type enforce' },
    { v: 'numericRange', t: 'Numeric range (min/max)' }
];

function addRuleRow(defaults = {}) {
    const id = cryptoRandomId();
    const rule = {
        id,
        col: S.A.headers[0] || '',
        type: 'isNotNull',
        params: {}, // per type fields
        ...defaults
    };
    S.rules.push(rule);
    renderRuleRows();
}

function renderRuleRows() {
    ui.rulesContainer.innerHTML = '';
    if (!S.rules.length) {
        ui.rulesContainer.innerHTML = '<div class="text-muted small">No custom rules added. Click "Add rule".</div>';
        return;
    }

    S.rules.forEach(rule => {
        const row = document.createElement('div');
        // CHANGED: Using CSS Grid. 
        // 2 equal columns for selects, and 40px for the remove button
        row.className = 'rule-row mb-4 p-2 border-bottom';
        row.style.display = 'grid';
        row.style.gridTemplateColumns = '1fr 1fr 40px';
        row.style.gap = '10px';
        row.dataset.id = rule.id;

        // Column select label + select
        const colWrap = document.createElement('div');
        colWrap.className = 'd-flex flex-column';

        const colLabel = document.createElement('label');
        colLabel.className = 'form-label small mb-1 fw-bold';
        colLabel.textContent = 'Column Name';

        const colSel = document.createElement('select');
        colSel.className = 'form-select form-select-sm';
        colSel.innerHTML = S.A.headers.map(h => `<option value="${escapeHTML(h)}">${escapeHTML(h)}</option>`).join('');
        colSel.value = rule.col || S.A.headers[0] || '';
        colSel.addEventListener('change', () => { rule.col = colSel.value; });

        colWrap.appendChild(colLabel);
        colWrap.appendChild(colSel);

        // Type select label + select
        const typeWrap = document.createElement('div');
        typeWrap.className = 'd-flex flex-column';

        const typeLabel = document.createElement('label');
        typeLabel.className = 'form-label small mb-1 fw-bold';
        typeLabel.textContent = 'Rule Type';

        const typeSel = document.createElement('select');
        typeSel.className = 'form-select form-select-sm';
        typeSel.innerHTML = RULE_TYPES.map(rt => `<option value="${rt.v}">${rt.t}</option>`).join('');
        typeSel.value = rule.type;
        typeSel.addEventListener('change', () => {
            rule.type = typeSel.value;
            renderParams(paramWrap, rule);
        });

        typeWrap.appendChild(typeLabel);
        typeWrap.appendChild(typeSel);

        // Remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn btn-sm btn-outline-danger remove-btn';
        removeBtn.innerHTML = '<i class="bi bi-x-circle"></i>';
        removeBtn.title = 'Remove rule';
        // Position it better in the grid
        removeBtn.style.alignSelf = 'end';
        removeBtn.style.height = '31px';
        removeBtn.addEventListener('click', () => {
            S.rules = S.rules.filter(r => r.id !== rule.id);
            renderRuleRows();
        });

        // Params wrap
        const paramWrap = document.createElement('div');
        // CHANGED: Force this to span across all columns so it starts on a new row
        paramWrap.className = 'param-wrap mt-2';
        paramWrap.style.gridColumn = '1 / span 3';

        // Initial params render
        renderParams(paramWrap, rule);

        // Append items: 
        // Row 1: colWrap (Col 1), typeWrap (Col 2), removeBtn (Col 3)
        // Row 2: paramWrap (Spans all 3 columns)
        row.appendChild(colWrap);
        row.appendChild(typeWrap);
        row.appendChild(removeBtn);
        row.appendChild(paramWrap);

        ui.rulesContainer.appendChild(row);
    });
}


function renderParams(container, rule) {
    container.innerHTML = '';
    container.classList.add('rule-params-grid');
    const addInput = (label, key, type = 'text', opts = {}) => {
        const wrap = document.createElement('div');
        if (opts.full) wrap.classList.add('col-span-3');
        const lbl = document.createElement('label');
        lbl.className = 'form-label small mb-0';
        lbl.textContent = label;
        const inp = document.createElement('input');
        inp.className = 'form-control form-control-sm';
        inp.type = type;
        if (opts.placeholder) inp.placeholder = opts.placeholder;
        inp.value = rule.params[key] ?? '';
        inp.addEventListener('input', () => { rule.params[key] = inp.value; });
        wrap.appendChild(lbl); wrap.appendChild(inp);
        container.appendChild(wrap);
        return inp;
    };
    const addSelect = (label, key, options, opts = {}) => {
        const wrap = document.createElement('div');
        if (opts.full) wrap.classList.add('col-span-3');
        const lbl = document.createElement('label');
        lbl.className = 'form-label small mb-0';
        lbl.textContent = label;
        const sel = document.createElement('select');
        sel.className = 'form-select form-select-sm';
        sel.innerHTML = options.map(o => `<option value="${o}">${o}</option>`).join('');
        sel.value = rule.params[key] ?? options[0];
        sel.addEventListener('change', () => { rule.params[key] = sel.value; });
        wrap.appendChild(lbl); wrap.appendChild(sel);
        container.appendChild(wrap);
        return sel;
    };

    switch (rule.type) {
        case 'isNotNull':
            addInput('Note (optional)', 'note', 'text', { placeholder: 'e.g. must be present', full: true });
            break;
        case 'isInteger':
            addInput('Min (optional)', 'min', 'number');
            addInput('Max (optional)', 'max', 'number');
            break;
        case 'isFloat':
            addInput('Min (optional)', 'min', 'number');
            addInput('Max (optional)', 'max', 'number');
            addInput('Max precision (decimals)', 'precision', 'number');
            break;
        case 'stringLength':
            addInput('Min length', 'minLen', 'number');
            addInput('Max length', 'maxLen', 'number');
            break;
        case 'booleanAllowed':
            addInput('Allowed values (comma-separated)', 'allowed', 'text', { placeholder: 'true,false,yes,no,1,0', full: true });
            break;
        case 'contains':
            addInput('Substring', 'substr', 'text', { placeholder: 'e.g. @example.com' });
            addSelect('Case sensitive', 'caseSensitive', ['false', 'true']);
            addSelect('Mode', 'mode', ['contains', 'startsWith', 'endsWith']);
            break;
        case 'regex':
            addInput('Regex pattern', 'pattern', 'text', { placeholder: '^\\d{6}$', full: true });
            addInput('Flags', 'flags', 'text', { placeholder: 'i,m' });
            break;
        case 'dataType':
            addSelect('Expected type', 'expected', ['String', 'Integer', 'Decimal', 'Boolean', 'Date', 'DateTime'], { full: true });
            break;
        case 'numericRange':
            addInput('Min', 'max', 'number');
            addInput('Max', 'max', 'number');
            break;
        default:
            addInput('Param', 'param', 'text', { full: true });
    }
}

// ---- Custom rule executor ----
function runCustomRules(headers, rows, rules) {
    const issues = [];
    rules.forEach(rule => {
        const col = rule.col;
        const params = rule.params || {};
        rows.forEach((r, i) => {
            const raw = r[col];
            const val = raw; // keep string nature

            const pushErr = (msg, ruleName) => {
                issues.push({ row: i + 1, col, type: 'Invalid', rule: ruleName, message: msg, aVal: val, bVal: '' });
            };

            if (rule.type === 'isNotNull') {
                if (isNullLike(val)) pushErr('Must not be NULL/empty', 'Not Null');
            } else if (rule.type === 'isInteger') {
                if (isNullLike(val)) return;
                if (!/^-?\d+$/.test(String(val))) pushErr('Not an integer', 'Integer');
                const n = Number(val);
                if (params.min !== undefined && params.min !== '' && n < Number(params.min)) pushErr(`Value < min (${params.min})`, 'Integer');
                if (params.max !== undefined && params.max !== '' && n > Number(params.max)) pushErr(`Value > max (${params.max})`, 'Integer');
            } else if (rule.type === 'isFloat') {
                if (isNullLike(val)) return;
                if (!/^-?\d+(\.\d+)?$/.test(String(val))) pushErr('Not a float', 'Float');
                const n = Number(val);
                if (params.min !== undefined && params.min !== '' && n < Number(params.min)) pushErr(`Value < min (${params.min})`, 'Float');
                if (params.max !== undefined && params.max !== '' && n > Number(params.max)) pushErr(`Value > max (${params.max})`, 'Float');
                if (params.precision !== undefined && params.precision !== '' && decimalPrecision(val) > Number(params.precision)) {
                    pushErr(`Precision ${decimalPrecision(val)} > ${params.precision}`, 'Float');
                }
            } else if (rule.type === 'stringLength') {
                const s = String(val ?? '');
                if (isNullLike(s)) return;
                const minLen = Number(params.minLen ?? 0);
                const maxLen = Number(params.maxLen ?? Number.POSITIVE_INFINITY);
                if (s.length < minLen) pushErr(`Length < ${minLen}`, 'String length');
                if (s.length > maxLen) pushErr(`Length > ${maxLen}`, 'String length');
            } else if (rule.type === 'booleanAllowed') {
                const s = String(val ?? '').toLowerCase().trim();
                if (isNullLike(s)) return;
                const allowed = new Set(String(params.allowed || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean));
                if (allowed.size === 0) {
                    // If not provided, default to standard set
                    ['true', 'false', '1', '0', 'yes', 'no'].forEach(x => allowed.add(x));
                }
                if (!allowed.has(s)) pushErr(`Not in allowed set: ${Array.from(allowed).join(', ')}`, 'Boolean allowed');
            } else if (rule.type === 'contains') {
                const s = String(val ?? '');
                if (isNullLike(s)) return;
                const sub = String(params.substr || '');
                if (!sub) return;
                const cs = String(params.caseSensitive || 'false') === 'true';
                const mode = String(params.mode || 'contains');
                const hay = cs ? s : s.toLowerCase();
                const needle = cs ? sub : sub.toLowerCase();
                let ok = false;
                if (mode === 'contains') ok = hay.includes(needle);
                else if (mode === 'startsWith') ok = hay.startsWith(needle);
                else if (mode === 'endsWith') ok = hay.endsWith(needle);
                if (!ok) pushErr(`Does not ${mode} "${sub}"`, 'Contains');
            } else if (rule.type === 'regex') {
                const s = String(val ?? '');
                if (isNullLike(s)) return;
                const pat = String(params.pattern || '');
                const flags = String(params.flags || '');
                if (!pat) return;
                let re;
                try { re = new RegExp(pat, flags); }
                catch { pushErr('Invalid regex pattern', 'Regex'); return; }
                if (!re.test(s)) pushErr('Regex match failed', 'Regex');
            } else if (rule.type === 'dataType') {
                const expected = String(params.expected || '');
                if (isNullLike(val)) return;
                const t = detectType(val);
                const map = { String: 'String', Integer: 'Integer', Decimal: 'Decimal', Boolean: 'Boolean', Date: 'Date', DateTime: 'DateTime' };
                if (map[expected] && t !== map[expected]) pushErr(`Expected ${expected}, got ${t}`, 'Data type');
                if ((expected === 'Date' || expected === 'DateTime') && !validDateLiteral(val)) pushErr('Invalid date literal', 'Data type');
            } else if (rule.type === 'numericRange') {
                if (isNullLike(val)) return;
                if (!/^-?\d+(\.\d+)?$/.test(String(val))) pushErr('Not numeric', 'Numeric range');
                const n = Number(val);
                if (params.min !== undefined && params.min !== '' && n < Number(params.min)) pushErr(`Value < min (${params.min})`, 'Numeric range');
                if (params.max !== undefined && params.max !== '' && n > Number(params.max)) pushErr(`Value > max (${params.max})`, 'Numeric range');
            }
        });
    });
    return issues;
}
