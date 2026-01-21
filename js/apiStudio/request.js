document.addEventListener("DOMContentLoaded", () => {
    const sendBtn = document.getElementById("sendBtn");
    const sendSpinner = document.getElementById("sendSpinner");
    const methodSelect = document.getElementById("method");
    const urlInput = document.getElementById("urlInput");
    const rawCode = document.getElementById("rawCode");
    const jsonOutput = document.getElementById("jsonOutput");
    const headersOutput = document.getElementById("headersOutput");
    const statusLabel = document.getElementById("statusLabel");
    const timeLabel = document.getElementById("timeLabel");
    const sizeLabel = document.getElementById("sizeLabel");
    const historyList = document.getElementById("historyList");
    const keyInput = document.getElementById("jsonKeyInput");

    // History click: restore method & URL
    historyList.addEventListener("click", (e) => {
        const item = e.target.closest(".list-group-item");
        if (!item) return;
        const [method, ...urlParts] = item.dataset.entry.split(" ");
        methodSelect.value = method;
        urlInput.value = urlParts.join(" ");
    });

    // Live update: when jsonKeyInput changes, re-evaluate lastDataArray from lastJson
    if (keyInput) {
        const onKeyPathChange = () => {
            if (!lastJson) return; // nothing parsed yet
            const selectedPath = keyInput.value.trim() || "data";
            lastDataArray = resolveDataArray(selectedPath, lastJson);
            updateAnalyticsSummary();
            // Optional: if chart is visible and inputs are set, auto-refresh chart.
            // Uncomment if desired:
            // try { renderAnalyticsChart(); } catch { /* ignore */ }
        };
        keyInput.addEventListener("input", onKeyPathChange);
        keyInput.addEventListener("change", onKeyPathChange);
    }

    // Send request
    sendBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        const method = methodSelect.value;
        let url = urlInput.value.trim();
        if (!url) return alert("Please enter a valid API URL");

        // Collect headers
        const headers = {};
        document.querySelectorAll("#headersEditor .editor-row").forEach(row => {
            const key = row.querySelector("input[name='key']").value.trim();
            const val = row.querySelector("input[name='value']").value.trim();
            if (key) headers[key] = val;
        });

        // Collect params
        const params = new URLSearchParams();
        document.querySelectorAll("#paramsEditor .editor-row").forEach(row => {
            const key = row.querySelector("input[name='key']").value.trim();
            const val = row.querySelector("input[name='value']").value.trim();
            if (key) params.append(key, val);
        });
        if ([...params].length) {
            url += (url.includes("?") ? "&" : "?") + params.toString();
        }

        // Collect body
        let bodyData = null;
        const bodyMode = document.getElementById("bodyMode").value;
        const bodyInputEl = document.getElementById("bodyInput");
        const bodyErrorEl = document.getElementById("bodyError");
        const bodyInput = bodyInputEl.value.trim();
        if (bodyInput) {
            if (bodyMode === "json") {
                try {
                    bodyData = JSON.parse(bodyInput);
                    bodyErrorEl.classList.add("d-none");
                    headers["Content-Type"] = headers["Content-Type"] || "application/json";
                } catch {
                    bodyErrorEl.textContent = "Invalid JSON format";
                    bodyErrorEl.classList.remove("d-none");
                    return;
                }
            } else {
                bodyData = bodyInput;
            }
        }

        sendSpinner.classList.remove("d-none");
        const startTime = performance.now();

        try {
            const response = await fetch(url, {
                method,
                headers,
                body: ["GET", "HEAD"].includes(method) ? undefined
                    : bodyData instanceof Object ? JSON.stringify(bodyData) : bodyData
            });

            const text = await response.text();
            const elapsed = (performance.now() - startTime).toFixed(2);

            // Response info
            statusLabel.textContent = `Status: ${response.status}`;
            timeLabel.textContent = `Time: ${elapsed} ms`;
            sizeLabel.textContent = `Size: ${new Blob([text]).size} bytes`;

            // Raw
            rawCode.textContent = text;

            // Headers
            let headersText = "";
            response.headers.forEach((val, key) => { headersText += `${key}: ${val}\n`; });
            headersOutput.textContent = headersText;

            // Get path from input field
            const selectedPath = keyInput?.value?.trim() || "data";

            // JSON parse + store
            lastJson = null;
            lastDataArray = null;
            try {
                const parsed = JSON.parse(text);
                lastJson = parsed;
                jsonOutput.textContent = JSON.stringify(parsed, null, 2);

                // Resolve data array using selected path + fallbacks
                lastDataArray = resolveDataArray(selectedPath, parsed);
                updateAnalyticsSummary();

            } catch {
                jsonOutput.textContent = "Not valid JSON";
            }

            // Save to history (cap 10, newest first)
            addToHistoryCapped(method, url);

        } catch (err) {
            rawCode.textContent = `Error: ${err.message}`;
            statusLabel.textContent = "Failed";
        } finally {
            sendSpinner.classList.add("d-none");
        }
    });

    // Clear history
    document.getElementById("clearHistory").addEventListener("click", () => {
        historyList.innerHTML = "";
    });

    // Downloads and analytics
    document.getElementById("downloadCsv").addEventListener("click", () => {
        exportCsvFromDataArray();
    });

    document.getElementById("downloadExcel").addEventListener("click", () => {
        exportExcelFromDataArray();
    });

    document.getElementById("openAnalytics").addEventListener("click", () => {
        openAnalyticsPanel();
    });

    document.getElementById("closeAnalytics").addEventListener("click", () => {
        document.getElementById("analyticsCard").classList.add("d-none");
    });

    document.getElementById("renderChart").addEventListener("click", () => {
        renderAnalyticsChart();
    });
});
