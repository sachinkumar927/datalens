// ---- Rendering ----
function renderProfiling(headers, profile) {
    if (!headers.length) {
        ui.profilingWrap.innerHTML = '<div class="text-muted small">No dataset loaded.</div>';
        return;
    }

    let html = `
    <div class="table-responsive">
      <table class="table table-sm table-striped align-middle">
        <thead>
          <tr>
            <th>Column</th>
            <th>Dominant type</th>
            <th>Null %</th>
            <th>Unique %</th>
            <th>Min</th>
            <th>Max</th>
            <th>Sample values</th>
          </tr>
        </thead>
        <tbody>`;
    headers.forEach(h => {
        const p = profile[h];
        html += `
      <tr>
        <td><code class="small">${escapeHTML(h)}</code></td>
        <td><span class="badge bg-primary badge-type">${p.dominantType}</span></td>
        <td>${p.nullPct.toFixed(1)}%</td>
        <td>${p.uniquePct.toFixed(1)}%</td>
        <td class="wrap">${p.minDisplay ?? ''}</td>
        <td class="wrap">${p.maxDisplay ?? ''}</td>
        <td class="wrap">${escapeHTML((p.samples || []).join(', '))}</td>
      </tr>`;
    });
    html += `</tbody></table></div>`;

    // Render profiling table
    ui.profilingWrap.innerHTML = html;

    // Show and enable download button
    const downloadBtn = document.getElementById('downloadProfilingBtn');
    downloadBtn.classList.remove('d-none');   // make visible
    downloadBtn.disabled = false;             // ensure enabled
    downloadBtn.onclick = () => downloadProfilingExcel(headers, profile);
}

function renderIssues() {
    const start = (S.currentPage - 1) * S.pageSize;
    const end = start + S.pageSize;
    const pageRows = S.issues.slice(start, end);

    ui.issuesTableBody.innerHTML = pageRows.map(r => `
    <tr>
      <td>${r.row}</td>
      <td><code class="small">${escapeHTML(r.col)}</code></td>
      <td><span class="badge ${r.type === 'Invalid' ? 'bg-danger' : r.type === 'Warning' ? 'bg-warning text-dark' : 'badge-color-mismatch'}">${r.type}</span></td>
      <td>${escapeHTML(r.rule)}</td>
      <td class="wrap">${escapeHTML(r.message)}</td>
      <td class="wrap">${escapeHTML(r.aVal ?? '')}</td>
      <td class="wrap">${escapeHTML(r.bVal ?? '')}</td>
    </tr>
  `).join('');

    ui.recordInfo.textContent = `${S.issues.length} issues`;
    ui.summaryLabel.textContent = S.A.rows.length
        ? `Rows: ${S.A.rows.length} • Issues: ${S.issues.length}`
        : 'No data loaded';

    renderPagination();
}

function renderPagination() {
    const totalPages = Math.max(1, Math.ceil(S.issues.length / S.pageSize));
    const cur = S.currentPage = Math.min(S.currentPage, totalPages);
    let html = '';

    function pageItem(page, label = page, disabled = false, active = false) {
        return `<li class="page-item ${disabled ? 'disabled' : ''} ${active ? 'active' : ''}">
          <button class="page-link" data-page="${page}">${label}</button>
        </li>`;
    }

    // First page <<
    html += pageItem(1, '<<', cur === 1);

    // Previous page <
    html += pageItem(Math.max(1, cur - 1), '<', cur === 1);

    // Numbered pages
    const windowSize = 7;
    const start = Math.max(1, cur - 3);
    const end = Math.min(totalPages, start + windowSize - 1);
    for (let p = start; p <= end; p++) {
        html += pageItem(p, p, false, p === cur);
    }

    // Next page >
    html += pageItem(Math.min(totalPages, cur + 1), '>', cur === totalPages);

    // Last page >>
    html += pageItem(totalPages, '>>', cur === totalPages);

    // Render pagination controls
    ui.paginationControls.innerHTML = html;

    // Attach click handlers
    ui.paginationControls.querySelectorAll('button.page-link').forEach(btn => {
        btn.addEventListener('click', () => {
            S.currentPage = Number(btn.dataset.page);
            renderIssues();
        });
    });

    // Update record info with page counter
    ui.recordInfo.textContent = `Page ${cur} of ${totalPages}`;
}
