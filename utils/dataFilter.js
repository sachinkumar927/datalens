import { app, el } from "../index.js"
export function getFilteredSortedData() {
  let data = app.dataRaw.slice();

  // Column filters (categorical with allowed values in set)
  for (const [col, filterSet] of Object.entries(app.view.colFilters)) {
    if (
      !filterSet ||
      (Array.isArray(filterSet) && filterSet.length === 0) ||
      (filterSet instanceof Set && filterSet.size === 0)
    ) {
      continue;
    }

    // always normalize to Set
    const set = filterSet instanceof Set ? filterSet : new Set(filterSet);

    data = data.filter(row => {
      const v = row[col] ?? ""; // treat null/undefined as empty string
      return set.has(String(v));
    });
  }

  // // Column input filters (startsWith search)
  // for (const [col, q] of Object.entries(app.view.colInputFilters)) {
  //   if (!q) continue;
  //   const norm = q.toLowerCase();
  //   data = data.filter(row => {
  //     const val = row[col] ?? "";
  //     return String(val).toLowerCase().startsWith(norm);
  //   });
  // }

  // Global search across visible columns
  const q = app.view.globalSearch.trim().toLowerCase();
  if (q) {
    data = data.filter(row => {
      return app.columns.some(c => {
        if (app.view.hiddenCols.has(c)) return false;
        const val = row[c];
        return (val !== null && val !== undefined) && String(val).toLowerCase().includes(q);
      });
    });
  }

  // Sorting (multi-column)
  if (app.view.sorts && app.view.sorts.length) {
    data.sort((a, b) => {
      for (const s of app.view.sorts) {
        const av = a[s.col] ?? '';
        const bv = b[s.col] ?? '';
        // numeric if both numeric
        const anum = parseFloat(av);
        const bnum = parseFloat(bv);
        let cmp = 0;
        if (!isNaN(anum) && !isNaN(bnum)) cmp = anum - bnum;
        else cmp = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' });
        if (cmp !== 0) return s.dir === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
  }
  return data;
}