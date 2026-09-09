(function () {
  "use strict";

  /* ---- theme toggle ---- */
  var root = document.documentElement;
  var themeToggle = document.getElementById('themeToggle');
  var stored = localStorage.getItem('devpublish-theme');
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  var initial = stored || (prefersDark ? 'dark' : 'light');
  applyTheme(initial);

  function applyTheme(theme) {
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
      if (themeToggle) themeToggle.setAttribute('aria-label', 'Switch to light mode');
    } else {
      root.removeAttribute('data-theme');
      if (themeToggle) themeToggle.setAttribute('aria-label', 'Switch to dark mode');
    }
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var isDark = root.getAttribute('data-theme') === 'dark';
      var next = isDark ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem('devpublish-theme', next);
    });
  }

  /* ---- mobile nav ---- */
  var menuToggle = document.getElementById('menuToggle');
  var mainNav = document.getElementById('mainNav');
  if (menuToggle && mainNav) {
    menuToggle.addEventListener('click', function () {
      var open = document.body.classList.toggle('nav-open');
      menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    mainNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        document.body.classList.remove('nav-open');
        menuToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---- sticky section rail: highlight current section ---- */
  var railLinks = Array.prototype.slice.call(document.querySelectorAll('.rail-link'));
  var sections = railLinks
    .map(function (link) { return document.getElementById(link.dataset.target); })
    .filter(Boolean);

  if (sections.length && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var link = railLinks.filter(function (l) { return l.dataset.target === entry.target.id; })[0];
        if (!link) return;
        if (entry.isIntersecting) {
          railLinks.forEach(function (l) { l.classList.remove('is-active'); });
          link.classList.add('is-active');
        }
      });
    }, { rootMargin: '-40% 0px -50% 0px', threshold: 0 });

    sections.forEach(function (section) { observer.observe(section); });
  }
})();

const avatarMenu = document.querySelector(".avatar-menu");
const avatarBtn = document.getElementById("avatarBtn");
const avatarDropdown = document.getElementById("avatarDropdown");

if (avatarMenu && avatarBtn && avatarDropdown) {

    avatarBtn.addEventListener("click", function (event) {
        event.stopPropagation();

        const isHidden = avatarDropdown.hasAttribute("hidden");

        if (isHidden) {
            avatarDropdown.removeAttribute("hidden");
            avatarBtn.setAttribute("aria-expanded", "true");
        } else {
            avatarDropdown.setAttribute("hidden", "");
            avatarBtn.setAttribute("aria-expanded", "false");
        }
    });

    document.addEventListener("click", function (event) {

        if (!avatarMenu.contains(event.target)) {
            avatarDropdown.setAttribute("hidden", "");
            avatarBtn.setAttribute("aria-expanded", "false");
        }

    });
}