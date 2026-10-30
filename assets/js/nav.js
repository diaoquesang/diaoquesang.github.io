/* Sidebar behaviour: scroll-spy active link, smooth scrolling, mobile drawer. */
document.addEventListener('DOMContentLoaded', () => {
  const links = Array.from(document.querySelectorAll('.nav-link'));
  const sections = links
    .map((l) => document.getElementById(l.getAttribute('href').slice(1)))
    .filter(Boolean);

  const sidebar = document.getElementById('sidebar');

  function closeDrawer() {
    if (sidebar) sidebar.classList.remove('open');
    document.body.classList.remove('drawer-open');
  }

  // smooth scroll
  links.forEach((l) => {
    l.addEventListener('click', (e) => {
      const target = document.getElementById(l.getAttribute('href').slice(1));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
        closeDrawer();
        // URL hash intentionally NOT written (2026-10-31, user request): clicking a
        // nav link scrolls but leaves the address bar untouched. Scroll-spy below
        // still highlights the current section, so nothing else changes.
        // history.replaceState(null, '', l.getAttribute('href'));
      }
    });
  });

  // scroll-spy: the nearest section header already passed under the top edge wins
  function updateActive() {
    if (!sections.length) return;
    let active = sections[0];
    let bestTop = -Infinity;
    sections.forEach((s) => {
      const top = s.getBoundingClientRect().top;
      if (top <= 140 && top > bestTop) { bestTop = top; active = s; }
    });
    links.forEach((l) =>
      l.classList.toggle('active', l.getAttribute('href') === '#' + active.id));
  }

  window.addEventListener('scroll', updateActive, { passive: true });
  updateActive();

  // mobile drawer
  const toggle = document.getElementById('drawer-toggle');
  if (toggle && sidebar) {
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      document.body.classList.toggle('drawer-open');
    });
    document.addEventListener('click', (e) => {
      if (sidebar.classList.contains('open') &&
          !sidebar.contains(e.target) && !toggle.contains(e.target)) {
        closeDrawer();
      }
    });
  }
});
