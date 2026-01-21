(function () {
  const searchInput = document.querySelector(".az-search");
  const sections = document.querySelectorAll("main section");
  const tocLinks = document.querySelectorAll(".az-toc-link");

  if (!searchInput) return;

  searchInput.addEventListener("input", () => {
    const q = searchInput.value.toLowerCase().trim();

    sections.forEach(section => {
      const text =
        section.innerText.toLowerCase() +
        " " +
        (section.dataset.search || "").toLowerCase();

      section.style.display = text.includes(q) ? "" : "none";
    });

    tocLinks.forEach(link => {
      const id = link.getAttribute("href").replace("#", "");
      const target = document.getElementById(id);
      link.style.display =
        target && target.style.display !== "none" ? "" : "none";
    });
  });
})();
