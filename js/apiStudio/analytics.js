/* Analytics panel control */
function openAnalyticsPanel() {
    const card = document.getElementById("analyticsCard");
    card.classList.remove("d-none");
    updateAnalyticsSummary();
}

/* Summary: basic stats for numeric metrics */
function updateAnalyticsSummary() {
    const summaryEl = document.getElementById("analyticsSummary");
    if (!Array.isArray(lastDataArray) || lastDataArray.length === 0) {
        summaryEl.textContent = "No array-like dataset detected in response. Analytics use response.data or root array.";
        return;
    }
    summaryEl.textContent = `Rows: ${lastDataArray.length}. Sample keys: ${Object.keys(lastDataArray[0] || {}).slice(0, 8).join(", ")}`;
}

/* Build chart inputs and render chart */
function renderAnalyticsChart() {
    if (!Array.isArray(lastDataArray) || lastDataArray.length === 0) {
        alert("No dataset available. Ensure the response contains an array in 'data' or at the root.");
        return;
    }
    const chartType = document.getElementById("chartType").value;
    const dimField = document.getElementById("dimField").value.trim();
    const metricField = document.getElementById("metricField").value.trim();
    const datasetSource = document.getElementById("datasetSource").value;

    // Choose source (currently both resolve to lastDataArray; hook for custom logic)
    const data = lastDataArray;

    if (!dimField || !metricField) {
        alert("Please provide both Dimension and Metric fields.");
        return;
    }

    const labels = [];
    const values = [];
    for (const row of data) {
        const label = deepGet(row, dimField);
        const value = Number(deepGet(row, metricField));
        if (label !== undefined && !Number.isNaN(value)) {
            labels.push(String(label));
            values.push(value);
        }
    }

    if (labels.length === 0 || values.length === 0) {
        alert("No valid labels/values found. Check field names and ensure metric is numeric.");
        return;
    }

    // Destroy previous chart if any
    if (chartInstance) {
        chartInstance.destroy();
    }

    const ctx = document.getElementById("analyticsChart").getContext("2d");
    chartInstance = new Chart(ctx, {
        type: chartType,
        data: {
            labels,
            datasets: [{
                label: `${metricField} by ${dimField}`,
                data: values,
                backgroundColor: chartType === "pie" ? generateColors(values.length) : "rgba(54, 162, 235, 0.5)",
                borderColor: chartType === "pie" ? "#fff" : "rgba(54, 162, 235, 1)",
                borderWidth: chartType === "pie" ? 1 : 2,
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: chartType === "pie" },
                tooltip: { enabled: true }
            },
            scales: chartType === "pie" ? {} : {
                x: { ticks: { color: "#495057" } },
                y: { ticks: { color: "#495057" }, beginAtZero: true }
            }
        }
    });
}
