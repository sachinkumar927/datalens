import { app, el } from "../index.js";

// Persistence
export const saveToStorage = () => {
    try {
        const payload = {
            columns: app.columns,
            dataRaw: app.dataRaw,
            view: {
                page: app.view.page,
                perPage: app.view.perPage,
                globalSearch: app.view.globalSearch,
                colFilters: Object.fromEntries(Object.entries(app.view.colFilters).map(([k, v]) => [k, Array.isArray(v) ? v : Array.from(v)])),
                hiddenCols: Array.from(app.view.hiddenCols),
                sorts: app.view.sorts
            },
            originalFilename: app.originalFile ? app.originalFile.name : null,
            theme: app.theme
        };
        if (app.persistLocal) localStorage.setItem('datalens.persist', JSON.stringify(payload));
        else sessionStorage.setItem('datalens.session', JSON.stringify(payload));
    } catch (e) {
        console.error(e);
    }
};

export const loadFromStorage = () => {
    const s = localStorage.getItem('datalens.persist') || sessionStorage.getItem('datalens.session');
    if (!s) return false;
    try {
        const payload = JSON.parse(s);
        app.columns = payload.columns || [];
        app.dataRaw = payload.dataRaw || [];
        app.view.page = payload.view?.page || 1;
        app.view.perPage = payload.view?.perPage || 10;
        app.view.globalSearch = payload.view?.globalSearch || '';
        app.view.colFilters = {};
        if (payload.view?.colFilters) {
            Object.entries(payload.view.colFilters).forEach(([k, v]) => {
                app.view.colFilters[k] = new Set(v);
            });
        }
        app.view.hiddenCols = new Set(payload.view?.hiddenCols || []);
        app.view.sorts = payload.view?.sorts || [];
        app.theme = payload.theme || app.theme;
        renderAll();
        notify('Loaded persisted dataset', 'success', 2500);
        return true;
    } catch (e) { console.error('Load storage error', e); return false; }
};

// Open (or create) a database
const request = indexedDB.open('MyDatabase', 1);

request.onupgradeneeded = (event) => {
    const db = event.target.result;
    // Create an object store (like a table) with a key
    const store = db.createObjectStore('files', { keyPath: 'id' });
    store.createIndex('name', 'name', { unique: false });
};

request.onsuccess = (event) => {
    const db = event.target.result;

    // Add data
    const transaction = db.transaction('files', 'readwrite');
    const store = transaction.objectStore('files');
    store.add({ id: 1, name: 'data.csv', content: 'large CSV content...' });

    transaction.oncomplete = () => console.log('Data saved!');
};

request.onerror = (event) => {
    console.error('Error opening DB', event.target.error);
};
