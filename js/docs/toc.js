(function () {
  const tocLinks = document.querySelectorAll(".az-toc-link");
  const sections = [...document.querySelectorAll("main section[id]")];

  function activateTOC() {
    let currentId = sections[0]?.id;
    const offset = window.scrollY + 140;

    sections.forEach(section => {
      if (section.offsetTop <= offset) {
        currentId = section.id;
      }
    });

    tocLinks.forEach(link => {
      link.classList.toggle(
        "active",
        link.getAttribute("href") === `#${currentId}`
      );
    });
  }

  function scrollToSection(id) {
    const el = document.getElementById(id);
    if (!el) return;
    window.scrollTo({
      top: el.offsetTop - 100,
      behavior: "smooth"
    });
  }

  tocLinks.forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      scrollToSection(link.getAttribute("href").replace("#", ""));
    });
  });

  window.addEventListener("scroll", activateTOC, { passive: true });
  activateTOC();
})();
