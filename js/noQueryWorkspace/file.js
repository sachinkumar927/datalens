// File handling
window.readFile = function(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => {
            try {
                if (file.name.toLowerCase().endsWith('.json')) {
                    const txt = new TextDecoder().decode(e.target.result);
                    resolve(JSON.parse(txt));
                } else {
                    // use array buffer for XLSX
                    const data = new Uint8Array(e.target.result);
                    const wb = XLSX.read(data, { type: 'array' });
                    const sheet = wb.SheetNames[0];
                    const dataArr = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { defval: null });
                    resolve(dataArr);
                }
            } catch (err) { reject(err); }
        };
        reader.onerror = (ev) => reject(new Error('File read error'));
        if (file.name.toLowerCase().endsWith('.json')) reader.readAsArrayBuffer(file); else reader.readAsArrayBuffer(file);
    });
};

window.handleFile = async function(file) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert('Max 10 MB allowed'); return; }
    window.uploader.classList.remove('dragover');
    try {
        const data = await window.readFile(file);
        if (!Array.isArray(data)) throw new Error('Unsupported JSON structure — expected array of objects.');
        window.fullData = data.map((r, i) => ({ ...r, _row_index: i + 1 }));
        window.filteredData = [...window.fullData];
        window.currentView = [...window.fullData];
        // Populate UI
        const cols = Object.keys(window.fullData[0] || {});
        window.rowCount.textContent = window.formatNumber(window.fullData.length) + ' rows';
        window.colCount.textContent = cols.length + ' columns';
        const types = cols.map(c => `${c}: ${window.detectType(window.fullData.map(r => r[c]))}`);
        window.schemaSummary.textContent = types.slice(0, 6).join(' • ') || 'No columns';
        window.populateColumnsUI(cols);
        window.renderTable(); window.renderChart();
    } catch (err) { alert('Failed to load file: ' + (err && err.message ? err.message : err)); }
};

// uploader click + drag/drop
// input now covers uploader area; loadBtn opens picker too
window.uploader.addEventListener('dragover', e => { e.preventDefault(); window.uploader.classList.add('dragover'); });
window.uploader.addEventListener('dragleave', e => { e.preventDefault(); window.uploader.classList.remove('dragover'); });
window.uploader.addEventListener('drop', e => {
    e.preventDefault();
    window.uploader.classList.remove('dragover');
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) window.handleFile(f);
});
window.fileInput.onchange = (e) => window.handleFile(e.target.files[0]);
window.loadBtn.onclick = () => window.fileInput.click();
