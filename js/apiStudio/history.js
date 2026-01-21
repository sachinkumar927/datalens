/* History (max 10, newest at top) */
function addToHistoryCapped(method, url) {
    const historyList = document.getElementById("historyList");
    const li = document.createElement("li");
    li.className = "list-group-item";
    li.textContent = `${method} ${url}`;
    li.dataset.entry = `${method} ${url}`;

    // Insert at top
    historyList.insertBefore(li, historyList.firstChild);

    // Cap at 10
    if (historyList.children.length > 10) {
        historyList.removeChild(historyList.lastChild);
    }
}
