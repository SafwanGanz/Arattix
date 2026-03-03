// Arattix docs — interactivity
(function () {
  'use strict';

  // ─── Copy buttons on code blocks ──────────────────────────
  document.querySelectorAll('pre').forEach(function (pre) {
    var btn = document.createElement('button');
    btn.className = 'code-copy';
    btn.textContent = 'Copy';
    btn.addEventListener('click', function () {
      var code = pre.querySelector('code');
      var text = code ? code.textContent : pre.textContent;
      navigator.clipboard.writeText(text).then(function () {
        btn.textContent = 'Copied!';
        setTimeout(function () { btn.textContent = 'Copy'; }, 2000);
      });
    });
    pre.style.position = 'relative';
    pre.appendChild(btn);
  });

  // ─── Active TOC link on scroll ─────────────────────────────
  var tocLinks = document.querySelectorAll('.page-toc a');
  if (tocLinks.length > 0) {
    var headings = [];
    tocLinks.forEach(function (link) {
      var id = link.getAttribute('href');
      if (id && id.startsWith('#')) {
        var el = document.getElementById(id.slice(1));
        if (el) headings.push({ el: el, link: link });
      }
    });

    function updateToc() {
      var scrollTop = window.scrollY + 100;
      var active = null;
      for (var i = headings.length - 1; i >= 0; i--) {
        if (headings[i].el.offsetTop <= scrollTop) {
          active = headings[i];
          break;
        }
      }
      tocLinks.forEach(function (l) { l.classList.remove('active'); });
      if (active) active.link.classList.add('active');
    }

    window.addEventListener('scroll', updateToc, { passive: true });
    updateToc();
  }

  // ─── Mobile sidebar toggle ─────────────────────────────────
  // Add a hamburger button for mobile
  var sidebar = document.querySelector('.site-sidebar');
  if (sidebar && window.innerWidth <= 900) {
    var toggle = document.createElement('button');
    toggle.innerHTML = '&#9776;';
    toggle.style.cssText =
      'position:fixed;top:12px;left:12px;z-index:200;background:#252526;' +
      'color:#fff;border:none;padding:8px 12px;border-radius:6px;font-size:18px;cursor:pointer;';
    document.body.appendChild(toggle);

    var open = false;
    toggle.addEventListener('click', function () {
      open = !open;
      sidebar.style.display = open ? 'block' : 'none';
    });
  }
})();
