/* Show the "⬆ Scrollable" hint only when its scroll-box actually overflows.
 * Works for any markup order:
 *   - hint as the next sibling of the box (existing includes)
 *   - hint nested inside the box (restructured includes)
 * Re-checks on window resize and theme toggle (font metrics can shift). */
(function () {
  function hintFor(box) {
    var inner = box.querySelector(".scroll-hint");
    if (inner) return inner;
    var next = box.nextElementSibling;
    return next && next.classList.contains("scroll-hint") ? next : null;
  }

  function refresh() {
    document.querySelectorAll(".scroll-box").forEach(function (box) {
      var hint = hintFor(box);
      if (!hint) return;
      var scrollable = box.scrollHeight - box.clientHeight > 1; /* 1px tolerance for subpixel rounding */
      hint.hidden = !scrollable;
    });
  }

  function init() {
    refresh();
    window.addEventListener("resize", refresh);
    /* dark/light toggle changes scrollbar metrics/fonts; recheck after reflow */
    document.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest(".theme-toggle")) setTimeout(refresh, 50);
    });
    /* late-loading images inside a box can change its height */
    document.querySelectorAll(".scroll-box img").forEach(function (img) {
      img.addEventListener("load", refresh);
      img.addEventListener("error", refresh);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
