// ---------- Load / Save ----------
async function handleFile(file) {
    try {
        const parsed = await parseFile(file);
        rawRows = parsed.rows;
        columns = rawRows.length ? Object.keys(rawRows[0]) : [];
        columnTypes = {}; // recalc
        columns.forEach(c => columnTypes[c] = detectType(rawRows.map(r => r[c])));
        infoFilename.textContent = parsed.filename;
        infoMIME.textContent = parsed.mime;
        infoSize.textContent = formatBytes(parsed.size);
        infoRows.textContent = rawRows.length;
        infoCols.textContent = columns.length;
        schemaSummary.textContent = `Columns: ${columns.slice(0, 10).join(', ')}` + (columns.length > 10 ? ' …' : '');
        renderColumnsCheckboxes();
        clearAllFilterRules();
        ensureAtLeastOneRule();
        populateChartSelectors();
        refreshAllFilterValues();
        filteredRows = rawRows.slice();
        currentPage = 1;
        renderTable();
        const datasetObj = {
            id: 'latest',
            filename: parsed.filename,
            mime: parsed.mime,
            size: parsed.size,
            rows: rawRows,
            columns,
            columnTypes,
            uploadedAt: new Date().toISOString()
        };
        await saveDatasetToDB(datasetObj);
    } catch (e) {
        alert('Failed to parse file: ' + (e && e.message ? e.message : e));
        console.error(e);
    }
}

// ---------- load latest from DB on start ----------
(async function init() {
    try {
        const latest = await getLatestDataset();
        if (latest) {
            rawRows = latest.rows || [];
            columns = latest.columns || (rawRows.length ? Object.keys(rawRows[0]) : []);
            columnTypes = latest.columnTypes || {};
            infoFilename.textContent = latest.filename || 'stored dataset';
            infoMIME.textContent = latest.mime || '';
            infoSize.textContent = latest.size ? formatBytes(latest.size) : '—';
            infoRows.textContent = rawRows.length;
            infoCols.textContent = columns.length;
            rowCountChip.textContent = rawRows.length + ' rows';
            colCountChip.textContent = columns.length + ' columns';
            schemaSummary.textContent = `Columns: ${columns.slice(0, 10).join(', ')}` + (columns.length > 10 ? ' …' : '');
            renderColumnsCheckboxes();
            clearAllFilterRules();
            ensureAtLeastOneRule();
            populateChartSelectors();
            refreshAllFilterValues();
            filteredRows = rawRows.slice();
            renderTable();
        } else {
            // ensure UI has at least one rule slot
            ensureAtLeastOneRule();
        }
    } catch (e) { console.warn('DB load error', e); ensureAtLeastOneRule(); }
})();

