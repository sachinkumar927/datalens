function showSection(id) {
    document.querySelectorAll(".section").forEach(sec => sec.classList.remove("active-section"));
    const current = document.getElementById(id);
    if (current) current.classList.add("active-section");
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function redirectToPage(pageName) {
    window.location.href = pageName;
}