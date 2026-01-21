function redirectToPage(pageName) {
    window.location.href = pageName;
}

function openExplorer() {
  window.location.href = "data-explorer.html";
}

function goHome() {
  window.location.href = "index.html";
}

function goDocs() {
  window.location.href = "docs.html";
}

AOS.init({
  duration: 800,
  once: true
});
