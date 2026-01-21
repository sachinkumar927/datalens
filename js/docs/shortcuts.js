(function () {
  window.addEventListener("keydown", e => {
    const tag = document.activeElement.tagName.toLowerCase();
    if (tag === "input" || tag === "textarea") return;

    if (e.key === "/") {
      e.preventDefault();
      const search = document.querySelector(".az-search");
      if (search) search.focus();
    }
  });
})();
