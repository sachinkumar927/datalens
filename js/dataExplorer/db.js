// ---------- IndexedDB ----------
const DB_NAME = 'datalens_db_v1';
const STORE = 'datasets';
let dbPromise = null;
function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((res, rej) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE)) {
                db.createObjectStore(STORE, { keyPath: 'id' });
            }
        };
        req.onsuccess = (e) => res(e.target.result);
        req.onerror = () => rej(req.error);
    });
    return dbPromise;
}

async function saveDatasetToDB(datasetObj) {
    const db = await openDB();
    return new Promise((res, rej) => {
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        store.put(datasetObj);
        tx.oncomplete = () => res(true);
        tx.onerror = () => rej(tx.error);
    });
}

async function getLatestDataset() {
    const db = await openDB();
    return new Promise((res, rej) => {
        const tx = db.transaction(STORE, 'readonly');
        const store = tx.objectStore(STORE);
        const req = store.get('latest');
        req.onsuccess = () => res(req.result || null);
        req.onerror = () => rej(req.error);
    });
}

async function clearDB() {
    const db = await openDB();
    return new Promise((res, rej) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).clear();
        tx.oncomplete = () => res(true);
        tx.onerror = () => rej(tx.error);
    });
}
