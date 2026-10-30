/* Theme toggle — head snippet applies the saved theme before first paint. */
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;

  const render = () => {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    btn.querySelector('i').className = dark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    btn.querySelector('.theme-toggle-text').textContent = dark ? 'Light' : 'Dark';
  };

  btn.addEventListener('click', () => {
    const nextTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('theme', nextTheme);
    render();
  });

  render();
});
