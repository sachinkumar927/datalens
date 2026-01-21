// ---- Event handlers ----
ui.loadBtn.addEventListener('click', async () => {
    const fileA = ui.fileA.files[0];
    const fileB = ui.fileB.files[0];

    if (!fileA) { alert('Please select Dataset A'); return; }

    showSpinner(ui.loadSpinner, true);
    showOverlay(true);
    try {
        const A = await readFile(fileA);
        S.A.headers = A.headers;
        S.A.rows = A.rows;

        if (fileB) {
            const B = await readFile(fileB);
            S.B.headers = B.headers;
            S.B.rows = B.rows;
        } else {
            S.B = { headers: [], rows: [] };
        }

        // Populate primary key, composite key, and mandatory columns dropdowns with column names
        ui.primaryKey.innerHTML = '<option value="">Select primary key</option>' + S.A.headers.map(h => `<option value="${escapeHTML(h)}">${escapeHTML(h)}</option>`).join('');
        populateDropdownWithCheckboxes('compositeKeyList', S.A.headers);
        populateDropdownWithCheckboxes('mandatoryColsList', S.A.headers);

        S.profile = {};
        S.issues = [];
        S.audit = { total: S.A.rows.length, valid: 0, invalid: 0 };
        ui.summaryLabel.textContent = `Rows: ${S.A.rows.length} • Issues: 0`;
        S.currentPage = 1;
        renderIssues();
        ui.profilingWrap.innerHTML = '<div class="text-muted small">Click "Profile A" to compute column stats.</div>';

        // Ensure rule builder shows column names
        if (!S.rules.length) {
            addRuleRow(); // create one default row
        } else {
            renderRuleRows();
        }
    } catch (e) {
        console.error(e);
        alert('Failed to load file(s): ' + e.message);
    } finally {
        showSpinner(ui.loadSpinner, false);
        showOverlay(false);
    }
});

ui.clearBtn.addEventListener('click', () => {
    S.A = { headers: [], rows: [] };
    S.B = { headers: [], rows: [] };
    S.issues = [];
    S.profile = {};
    S.rules = [];
    S.audit = { total: 0, valid: 0, invalid: 0 };
    ui.fileA.value = '';
    ui.fileB.value = '';
    document.getElementById('fileAName').textContent = '';
    document.getElementById('fileBName').textContent = '';
    ui.primaryKey.innerHTML = '<option value="">Select primary key</option>';
    populateDropdownWithCheckboxes('compositeKeyList', []);
    populateDropdownWithCheckboxes('mandatoryColsList', []);
    ui.profilingWrap.innerHTML = '';
    ui.summaryLabel.textContent = 'No data loaded';
    S.currentPage = 1;
    renderIssues();
    renderRuleRows();
});

// Profile A
ui.profileBtn.addEventListener('click', () => {
    if (!S.A.rows.length) { alert('Load Dataset A first'); return; }
    S.profile = profileColumns(S.A.headers, S.A.rows);
    renderProfiling(S.A.headers, S.profile);
});

// Built-in validation
ui.validateBuiltinBtn.addEventListener('click', () => {
    if (!S.A.rows.length) { alert('Load Dataset A first'); return; }
    if (!Object.keys(S.profile).length) S.profile = profileColumns(S.A.headers, S.A.rows);
    showSpinner(ui.validateSpinner, true);
    setTimeout(() => {
        const cfg = readBuiltinConfig();
        const builtIssues = validateBuiltin(S.A.headers, S.A.rows, S.profile, cfg);
        // S.issues = mergeIssues(S.issues, builtIssues);
        S.issues = builtIssues;
        S.currentPage = 1;
        renderIssues();
        showSpinner(ui.validateSpinner, false);
    }, 10);
});

// Rule builder actions
ui.addRuleBtn.addEventListener('click', () => {
    if (!S.A.headers.length) { alert('Load Dataset A first'); return; }
    addRuleRow();
});

ui.clearRulesBtn.addEventListener('click', () => {
    S.rules = [];
    renderRuleRows();
});

ui.validateBtn.addEventListener('click', () => {
    if (!S.A.rows.length) { alert('Load Dataset A first'); return; }
    if (!S.rules.length) { alert('No custom rules added'); return; }
    showSpinner(ui.validateRulesSpinner, true);
    setTimeout(() => {
        const issues = runCustomRules(S.A.headers, S.A.rows, S.rules);
        // S.issues = mergeIssues(S.issues, issues);
        S.issues = issues;
        S.currentPage = 1;
        renderIssues();
        showSpinner(ui.validateRulesSpinner, false);
    }, 10);
});

// Compare
ui.compareBtn.addEventListener('click', () => {
    if (!S.A.rows.length || !S.B.rows.length) { alert('Load both Dataset A and B'); return; }
    showSpinner(ui.compareSpinner, true);
    setTimeout(() => {
        const cmpIssues = compareDatasets(S.A, S.B);
        S.issues = mergeIssues(S.issues, cmpIssues);
        S.currentPage = 1;
        renderIssues();
        showSpinner(ui.compareSpinner, false);
    }, 10);
});

// Pagination & page size
ui.pageSizeSelect.addEventListener('change', () => {
    S.pageSize = Number(ui.pageSizeSelect.value);
    S.currentPage = 1;
    renderIssues();
});

// Exports
ui.downloadCsvIssues.addEventListener('click', downloadCSVIssues);
ui.downloadExcelIssues.addEventListener('click', downloadExcelIssuesAndClean);

// ---- Helpers ----
function mergeIssues(existing, incoming) {
    const map = new Map();
    existing.concat(incoming).forEach(r => {
        const key = `${r.row}|${r.col}|${r.type}|${r.rule}|${r.message}|${r.aVal}|${r.bVal}`;
        if (!map.has(key)) map.set(key, r);
    });
    return Array.from(map.values());
}
function cryptoRandomId() {
    // Simple random id
    return 'r' + Math.random().toString(36).slice(2, 9);
}


['fileAWrapper', 'fileBWrapper'].forEach(wrapperId => {
    const wrapper = document.getElementById(wrapperId);
    wrapper.addEventListener('dragover', e => {
        e.preventDefault();
        wrapper.classList.add('dragover');
    });
    wrapper.addEventListener('dragleave', () => {
        wrapper.classList.remove('dragover');
    });
    wrapper.addEventListener('drop', e => {
        e.preventDefault();
        wrapper.classList.remove('dragover');
        const input = wrapper.querySelector('input[type="file"]');
        input.files = e.dataTransfer.files;
    });
});

function showFileName(inputId, labelId) {
  const input = document.getElementById(inputId);
  const label = document.getElementById(labelId);

  input.addEventListener('change', () => {
    if (input.files.length > 0) {
      label.textContent = input.files[0].name;
    } else {
      label.textContent = "";
    }
  });
}

// Attach to both inputs
showFileName('fileA', 'fileAName');
showFileName('fileB', 'fileBName');

function populateDropdownWithCheckboxes(listId, headers) {
    const list = document.getElementById(listId);
    list.innerHTML = '';
    headers.forEach(h => {
        const li = document.createElement('li');
        li.className = 'dropdown-item';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'form-check-input me-2';
        checkbox.value = h;
        checkbox.id = `${listId}_${h}`;
        // Initially unchecked
        checkbox.checked = false;
        const label = document.createElement('label');
        label.className = 'form-check-label';
        label.htmlFor = checkbox.id;
        label.textContent = h;
        li.appendChild(checkbox);
        li.appendChild(label);
        list.appendChild(li);

        // Add event listener to update button text on change
        checkbox.addEventListener('change', () => updateDropdownText(listId));
    });

    // Initial update
    updateDropdownText(listId);
}

function updateDropdownText(listId) {
    const list = document.getElementById(listId);
    const checked = Array.from(list.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
    const buttonId = listId.replace('List', 'Dropdown');
    const button = document.getElementById(buttonId);
    if (checked.length === 0) {
        button.textContent = 'Select columns';
    } else if (checked.length <= 3) {
        button.textContent = checked.join(', ');
    } else {
        button.textContent = `${checked.length} selected`;
    }
}
