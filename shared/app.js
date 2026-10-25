// Navigation is visible without JavaScript; enhancement enables the compact menu.
document.documentElement.classList.add('js');
const menu = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');
if (menu && nav) {
  function closeMenu(returnFocus = false) {
    nav.classList.remove('open');
    menu.setAttribute('aria-expanded', 'false');
    if (returnFocus) menu.focus();
  }
  menu.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menu.setAttribute('aria-expanded', String(open));
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => closeMenu()));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && nav.classList.contains('open')) closeMenu(true);
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.header-inner')) closeMenu();
  });
}

// Language links preserve the current animation's cache version and section anchor.
for (const link of document.querySelectorAll('.language-switch a')) {
  const target = new URL(link.href, location.href);
  target.search = location.search; target.hash = location.hash;
  link.href = target.href;
}
