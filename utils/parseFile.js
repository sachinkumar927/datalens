import { unique, humanFileSize } from "./common.js";
import { notify } from "./notifyUtils.js";
import { renderAll } from "../index.js";
import { saveToStorage } from "./storage.js"; 
// File parsing
export async function parseFile(app, el, file, opts = { previewOnly: false }) {
    // Save original file info for download
    app.originalFile = file;
    if (file) {
        // create data URL for download original
        const reader = new FileReader();
        reader.onload = (ev) => app.originalFileDataURL = ev.target.result;
        reader.readAsDataURL(file);
    }

    const chosenType = el.fileType.value;
    const ext = file ? (file.name.split('.').pop() || '').toLowerCase() : '';
    const text = await file.text();

    // Determine parser
    let parser = chosenType;
    if (chosenType === 'auto') {
        if (ext === 'csv' || ext === 'tsv') parser = 'csv';
        else if (['xls', 'xlsx'].includes(ext)) parser = 'excel';
        else if (ext === 'json') parser = 'json';
        else if (ext === 'xml') parser = 'xml';
        else if (ext === 'txt') parser = 'txt';
        else {
            // naive content detection
            if (text.trim().startsWith('{') || text.trim().startsWith('[')) parser = 'json';
            else if (text.includes('<') && text.includes('>') && text.split(/[\r\n]+/).slice(0, 3).some(l => l.includes('<'))) parser = 'xml';
            else {
                // choose CSV/TXT
                parser = 'csv';
            }
        }
    }

    // Parseers
    try {
        if (parser === 'csv' || parser === 'txt') {
            // auto-detect delimiter for CSV/TXT
            const delimiter = simpleAutoDelimiter(text);
            const papaConfig = {
                header: true,
                dynamicTyping: false,
                skipEmptyLines: true,
                preview: opts.previewOnly ? 100 : 0,
                delimiter: delimiter
            };
            const res = Papa.parse(text, papaConfig);
            if (res.errors && res.errors.length) {
                console.warn('Papa errors', res.errors);
                // show user-friendly message for first error
                notify('CSV parse warning: ' + (res.errors[0].message || 'Unknown'), 'warning', 4000);
            }
            const data = res.data;
            postParse(data);
        } else if (parser === 'json') {
            const parsed = JSON.parse(text);

            // if top-level array, use it; if object with keys, try to extract a sensible array
            let arr;
            if (Array.isArray(parsed)) arr = parsed;
            else if (Array.isArray(parsed.data)) arr = parsed.data;
            else arr = Object.keys(parsed).length ? [parsed] : [];

            // flatten each object in the array
            arr = arr.map(item => flattenObject(item));
            postParse(arr.slice(0, opts.previewOnly ? 100 : arr.length), opts.previewOnly ? true : false);
        } else if (parser === 'excel') {
            // Use SheetJS; parse using read
            const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
            const firstSheet = wb.SheetNames[0];
            const sheet = wb.Sheets[firstSheet];
            const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
            postParse(data.slice(0, opts.previewOnly ? 100 : data.length), opts.previewOnly ? true : false);
        } else if (parser === 'xml') {
            // Very basic XML to JSON extract: convert child nodes of top-level repeating element
            const parserXml = new DOMParser();
            const xmlDoc = parserXml.parseFromString(text, 'application/xml');
            const parseError = xmlDoc.querySelector('parsererror');
            if (parseError) throw new Error('Malformed XML');
            // look for repeating elements
            // choose the deepest repeating tag
            const elements = xmlDoc.documentElement.children;
            const tagCounts = {};
            function walk(node) {
                for (const ch of node.children) {
                    tagCounts[ch.tagName] = (tagCounts[ch.tagName] || 0) + 1;
                    walk(ch);
                }
            }
            walk(xmlDoc);
            const candidates = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
            const chosenTag = candidates[0] ? candidates[0][0] : xmlDoc.documentElement.tagName;
            const nodes = Array.from(xmlDoc.getElementsByTagName(chosenTag));
            const arr = nodes.map(n => {
                const obj = {};
                for (const child of n.children) {
                    obj[child.tagName] = child.textContent;
                }
                return obj;
            });
            postParse(arr.slice(0, opts.previewOnly ? 100 : arr.length), opts.previewOnly ? true : false);
        } else {
            throw new Error('Unsupported file type');
        }
    } catch (err) {
        console.error('Parse error', err);
        notify('Error parsing file: ' + (err.message || 'Unknown'), 'danger', 5000);
    }

    function postParse(parsedArray, previewFlag = false) {
        // Normalize: ensure array of objects. If rows are arrays (no headers), attempt to make headers.
        let data = parsedArray || [];
        if (data.length > 0 && !data[0]) data = [];
        // If data rows are arrays or primitive values, convert to objects with columns like "col1"
        if (data.length > 0 && !data[0].hasOwnProperty && Array.isArray(data[0])) {
            const maxCols = Math.max(...data.map(r => r.length));
            const cols = Array.from({ length: maxCols }).map((_, i) => 'col' + (i + 1));
            data = data.map(r => {
                const obj = {};
                cols.forEach((c, i) => obj[c] = r[i] ?? '');
                return obj;
            });
        } else if (data.length > 0 && (typeof data[0] !== 'object')) {
            // primitive list -> single column
            data = data.map(v => ({ value: v }));
        }

        app.dataRaw = data;
        app.columns = unique(data.flatMap(r => Object.keys(r))).filter(Boolean);
        app.view.page = 1;
        el.infoRows.textContent = app.dataRaw.length;
        el.infoCols.textContent = app.columns.length;
        el.infoFilename.textContent = file ? file.name : 'Sample data';
        el.infoMIME.textContent = file ? (file.type || '—') : '—';
        el.infoSize.textContent = file ? humanFileSize(file.size) : '—';

        // If previewOnly flag is true, show a banner
        if (previewFlag) notify('Previewing first 100 rows; choose "Preview top 100" to load only the previewed dataset.', 'info', 4000);

        // Build UI controls
        renderAll();

        // Persist in session/local
        saveToStorage();
    }
}

const simpleAutoDelimiter = (text) => {
    // naive delimiter detection by sampling first lines
    const sample = text.split(/\r?\n/).slice(0, 5).join('\n');
    const counts = {
        ',': (sample.match(/,/g) || []).length,
        ';': (sample.match(/;/g) || []).length,
        '\t': (sample.match(/\t/g) || []).length,
        '|': (sample.match(/\|/g) || []).length
    };
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
};

//Flatten Json Object
function flattenObject(obj, parentKey = '', res = {}) {
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      if (typeof item === 'object' && item !== null) {
        flattenObject(item, `${parentKey}.${index}`, res);
      } else {
        res[`${parentKey}.${index}`] = item;
      }
    });
  } else if (typeof obj === 'object' && obj !== null) {
    for (let key in obj) {
      if (!obj.hasOwnProperty(key)) continue;
      let newKey = parentKey ? `${parentKey}.${key}` : key;
      flattenObject(obj[key], newKey, res);
    }
  } else {
    res[parentKey] = obj;
  }
  return res;
}
