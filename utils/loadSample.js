import { app, el, renderAll } from "../index.js";
import { notify } from "./notifyUtils.js";
import { humanFileSize,unique } from "./common.js";

export function loadSampleDataset() {
    Papa.parse("./SampleDataset.csv", {
        download: true,      // 👈 important for file path
        header: true,
        dynamicTyping: false,
        complete: function (res) {
            app.dataRaw = res.data;
            app.columns = unique(app.dataRaw.flatMap(r => Object.keys(r))).filter(Boolean);
            app.originalFile = null;
            app.originalFileDataURL = null;
            el.infoFilename.textContent = 'sample.csv';
            el.infoMIME.textContent = 'text/csv';
            el.infoSize.textContent = humanFileSize(new Blob([res.data]).size);
            renderAll();
            notify('Sample dataset loaded', 'success');
        }
    });
}