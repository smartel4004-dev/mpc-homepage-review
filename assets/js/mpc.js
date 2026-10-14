/* MPC Construction — site behaviours. No dependencies beyond Bootstrap's bundle (offcanvas). */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var doc = document.documentElement;

  /* Header state ---------------------------------------------------------- */
  var header = document.getElementById('siteHeader');
  var hero = document.querySelector('.hero');
  var top = hero || document.querySelector('.page-hero');
  function updateHeader() {
    var threshold = top ? Math.min(top.offsetHeight * 0.25, 240) : 40;
    header.classList.toggle('is-scrolled', window.scrollY > threshold);
  }

  /* Hero entrance ---------------------------------------------------------- */
  if (hero) {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { hero.classList.add('is-loaded'); });
    });
  }

  /* Scroll reveals & line drawing ------------------------------------------ */
  var revealSel = '.reveal, .reveal-img, .draw-x, .draw-y, .framelines, .draw-frame';
  var revealEls = document.querySelectorAll(revealSel);

  // Light stagger for siblings that enter together
  document.querySelectorAll('.cap-list, .jobs, .principles, .timeline ol, .ministries, .social-strip .row.g-2, .offer').forEach(function (group) {
    group.querySelectorAll(':scope > * ').forEach(function (child, i) {
      child.querySelectorAll(revealSel).forEach(function (el) { el.style.setProperty('--d', (i * 0.08) + 's'); });
      if (child.matches(revealSel)) child.style.setProperty('--d', (i * 0.08) + 's');
    });
  });

  var pending = new Set(revealEls);
  function reveal(el) {
    el.classList.add('is-inview');
    pending.delete(el);
    if (io) io.unobserve(el);
  }
  var io = null;
  if (!('IntersectionObserver' in window) || reduceMotion.matches) {
    revealEls.forEach(reveal);
  } else {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { if (entry.isIntersecting) reveal(entry.target); });
    }, { rootMargin: '0px 0px -4% 0px', threshold: 0.04 });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  // Fallback: IntersectionObserver can stall (hidden/embedded tabs, anchor jumps).
  // Anything at or above the reveal line is shown on scroll/load so content is never stranded.
  function checkPending() {
    if (!pending.size) return;
    var line = window.innerHeight * 0.92;
    pending.forEach(function (el) {
      if (el.getBoundingClientRect().top < line) reveal(el);
    });
  }

  /* Parallax (transform only, rAF-throttled) -------------------------------- */
  var parallaxEls = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
  var ticking = false;

  function updateParallax() {
    if (reduceMotion.matches) return;
    var vh = window.innerHeight;
    var factor = window.innerWidth < 768 ? 0.5 : 1;
    parallaxEls.forEach(function (el) {
      var host = el.parentElement;
      var rect = host.getBoundingClientRect();
      if (rect.bottom < -100 || rect.top > vh + 100) return;
      var progress = (rect.top + rect.height / 2 - vh / 2) / (vh / 2 + rect.height / 2); // -1..1
      var speed = parseFloat(el.getAttribute('data-parallax')) || 0.1;
      el.style.transform = 'translate3d(0,' + (progress * speed * rect.height * factor * -0.5).toFixed(1) + 'px,0)';
    });
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      checkPending();
      updateHeader();
      updateParallax();
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  updateHeader();
  updateParallax();
  window.addEventListener('load', checkPending);
  window.addEventListener('beforeprint', function () { revealEls.forEach(reveal); });

  /* Capability preview ------------------------------------------------------ */
  var capItems = document.querySelectorAll('.cap-item');
  var capImgs = document.querySelectorAll('.cap-preview img');
  function setCap(i) {
    capItems.forEach(function (it) { it.classList.toggle('is-active', it.getAttribute('data-cap') === i); });
    capImgs.forEach(function (img) { img.classList.toggle('is-active', img.getAttribute('data-cap') === i); });
  }
  capItems.forEach(function (item) {
    var i = item.getAttribute('data-cap');
    item.addEventListener('mouseenter', function () { setCap(i); });
    item.addEventListener('focusin', function () { setCap(i); });
  });

  /* Hero video (optional) ---------------------------------------------------- */
  var video = hero && hero.getAttribute('data-media') === 'video' ? hero.querySelector('.hero__video') : null;
  var toggle = hero && hero.querySelector('.hero__toggle');
  // Phones and data-saver connections keep the poster image: the reel is ~5 MB.
  var conn = navigator.connection || {};
  var lightweight = window.matchMedia('(max-width: 767.98px)').matches || conn.saveData === true || /(^|-)2g$/.test(conn.effectiveType || '');
  if (video && !reduceMotion.matches && !lightweight) {
    // Reveal on the first 'playing' event rather than play()'s promise, which rejects if the
    // first attempt is interrupted (e.g. a background tab) even though a later play() succeeds.
    video.addEventListener('playing', function () {
      video.classList.add('is-playing');
      toggle.hidden = false;
    }, { once: true });
    // Start the reel after the page has loaded, so it never competes with the poster, fonts and CSS.
    var startReel = function () { video.play().catch(function () { /* autoplay blocked or interrupted — the image remains */ }); };
    if (document.readyState === 'complete') startReel(); else window.addEventListener('load', startReel, { once: true });

    var userPaused = false;
    toggle.addEventListener('click', function () {
      userPaused = !video.paused;
      userPaused ? video.pause() : video.play();
      toggle.classList.toggle('is-paused', userPaused);
      toggle.setAttribute('aria-label', userPaused ? 'Play background video' : 'Pause background video');
    });

    // Pause when off-screen to save battery/CPU (unless the visitor paused it themselves)
    new IntersectionObserver(function (entries) {
      if (userPaused) return;
      entries[0].isIntersecting ? video.play() : video.pause();
    }).observe(hero);
  }

  /* Lite YouTube embed ------------------------------------------------------ */
  document.querySelectorAll('.video-lite').forEach(function (wrap) {
    var btn = wrap.querySelector('.video-lite__play');
    btn.addEventListener('click', function () {
      var id = wrap.getAttribute('data-yt');
      var iframe = document.createElement('iframe');
      iframe.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
      iframe.title = btn.textContent.trim();
      iframe.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      wrap.appendChild(iframe);
      btn.remove();
      iframe.focus();
    });
  });


  /* Capabilities jump nav: mark the section in view ------------------------ */
  var jumpLinks = document.querySelectorAll('.jumpnav a');
  if (jumpLinks.length && 'IntersectionObserver' in window) {
    var jumpIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        jumpLinks.forEach(function (a) { a.classList.toggle('is-current', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    document.querySelectorAll('.cap-section').forEach(function (s) { jumpIO.observe(s); });
  }

  /* Photo viewer (project galleries) ---------------------------------------- */
  var lb = document.getElementById('lightbox');
  var lbItems = Array.prototype.slice.call(document.querySelectorAll('[data-lightbox]'));
  if (lb && lbItems.length && typeof lb.showModal === 'function') {
    var lbImg = lb.querySelector('.lightbox__img');
    var lbCap = lb.querySelector('.lightbox__cap');
    var lbIndex = 0, lbReturn = null;
    var show = function (i) {
      lbIndex = (i + lbItems.length) % lbItems.length;
      var a = lbItems[lbIndex];
      lbImg.src = a.getAttribute('href');
      lbImg.alt = a.querySelector('img').alt;
      lbCap.textContent = a.getAttribute('data-caption') || '';
    };
    lbItems.forEach(function (a, i) {
      a.addEventListener('click', function (ev) {
        ev.preventDefault();
        lbReturn = a;
        show(i);
        lb.showModal();
      });
    });
    lb.addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-lb]');
      if (btn) {
        var act = btn.getAttribute('data-lb');
        if (act === 'close') lb.close();
        else show(lbIndex + (act === 'next' ? 1 : -1));
      } else if (ev.target === lb) {
        lb.close();
      }
    });
    lb.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowRight') show(lbIndex + 1);
      if (ev.key === 'ArrowLeft') show(lbIndex - 1);
    });
    lb.addEventListener('close', function () { if (lbReturn) lbReturn.focus(); });
  }

  /* Forms: validation + confirmation (delivery is wired up in Drupal) ------- */
  document.querySelectorAll('form.form-mpc').forEach(function (form) {
    // Pre-select a position from ?position=slug
    var pos = form.querySelector('#position');
    var wanted = new URLSearchParams(window.location.search).get('position');
    if (pos && wanted && pos.querySelector('option[value="' + wanted + '"]')) pos.value = wanted;

    var summary = form.querySelector('.form-summary');
    var fields = Array.prototype.slice.call(form.querySelectorAll('input, select, textarea'));

    function errorEl(field) { return form.querySelector('#' + field.id + '-error'); }
    function check(field) {
      var err = errorEl(field);
      if (!err) return true;
      var ok = field.checkValidity();
      field.setAttribute('aria-invalid', ok ? 'false' : 'true');
      if (ok) { field.removeAttribute('aria-describedby'); err.hidden = true; }
      else { field.setAttribute('aria-describedby', err.id); err.hidden = false; }
      return ok;
    }

    // Validate on blur, and re-check while correcting an error
    fields.forEach(function (f) {
      f.addEventListener('blur', function () { if (f.value) check(f); });
      f.addEventListener('input', function () { if (f.getAttribute('aria-invalid') === 'true') check(f); });
      f.addEventListener('change', function () { if (f.getAttribute('aria-invalid') === 'true') check(f); });
    });

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var bad = fields.filter(function (f) { return !check(f); });
      if (bad.length) {
        var list = summary.querySelector('ul');
        list.innerHTML = '';
        bad.forEach(function (f) {
          var li = document.createElement('li');
          var a = document.createElement('a');
          a.href = '#' + f.id;
          a.textContent = errorEl(f).textContent;
          a.addEventListener('click', function (e) { e.preventDefault(); f.focus(); });
          li.appendChild(a);
          list.appendChild(li);
        });
        summary.hidden = false;
        summary.focus();
        return;
      }
      summary.hidden = true;
      var success = document.getElementById(form.getAttribute('data-success'));
      var email = form.querySelector('input[type="email"]');
      success.querySelectorAll('[data-echo="email"]').forEach(function (el) { el.textContent = email ? email.value : ''; });
      form.hidden = true;
      success.hidden = false;
      success.focus();
      success.scrollIntoView({ block: 'center', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    });
  });


  /* Selected work, horizontal ---------------------------------------------------
     Desktop: the panel pins (CSS sticky) and native vertical scroll drives the track sideways.
     Elsewhere the track is a native swipe row; we only sync the progress rule. */
  document.querySelectorAll('.hscroll').forEach(function (sec) {
    var pin = sec.querySelector('.hscroll__pin');
    var sticky = sec.querySelector('.hscroll__sticky');
    var track = sec.querySelector('.hscroll__track');
    var head = sec.querySelector('.hscroll__head');
    var wide = window.matchMedia('(min-width: 992px)');
    var distance = 0, pinned = false;

    function setPad() {
      // Track starts on the container's content edge, like the heading above it
      var left = head.getBoundingClientRect().left + parseFloat(getComputedStyle(head).paddingLeft);
      sec.style.setProperty('--hs-pad', Math.max(12, Math.round(left)) + 'px');
    }
    function measure() {
      setPad();
      pinned = wide.matches && !reduceMotion.matches;
      sec.classList.toggle('is-pinned', pinned);
      if (!pinned) {
        sec.style.removeProperty('--hs-h'); sec.style.removeProperty('--hs-x');
        swipeProgress();
        return;
      }
      sec.style.setProperty('--hs-x', '0px');
      // scrollWidth omits the flex container's end padding, so add it back: the last card stops on the right margin
      var pad = parseFloat(getComputedStyle(sec).getPropertyValue('--hs-pad')) || 0;
      distance = Math.max(0, track.scrollWidth + pad - document.documentElement.clientWidth);
      // Pin length = visible panel + the sideways distance (1px of scroll = 1px of travel)
      sec.style.setProperty('--hs-h', (sticky.offsetHeight + distance) + 'px');
      update();
    }
    function progressAt() {
      var r = pin.getBoundingClientRect();
      var top = parseFloat(getComputedStyle(sticky).top) || 0;
      return distance ? Math.min(1, Math.max(0, (top - r.top) / distance)) : 0;
    }
    function update() {
      if (!pinned) return;
      var p = progressAt();
      sec.style.setProperty('--hs-x', (-p * distance).toFixed(1) + 'px');
      sec.style.setProperty('--hs-p', p.toFixed(4));
    }
    function swipeProgress() {
      var max = track.scrollWidth - track.clientWidth;
      sec.style.setProperty('--hs-p', max > 0 ? (track.scrollLeft / max).toFixed(4) : '1');
    }

    var raf = 0;
    window.addEventListener('scroll', function () {
      if (raf || !pinned) return;
      raf = requestAnimationFrame(function () { raf = 0; update(); });
    }, { passive: true });
    track.addEventListener('scroll', function () { if (!pinned) swipeProgress(); }, { passive: true });
    window.addEventListener('resize', function () { clearTimeout(sec._t); sec._t = setTimeout(measure, 120); });
    if (wide.addEventListener) { wide.addEventListener('change', measure); reduceMotion.addEventListener('change', measure); }
    window.addEventListener('load', measure);

    // Keyboard: tabbing to an off-screen card scrolls the page so the card slides into view
    track.addEventListener('focusin', function (e) {
      if (!pinned) return;
      var item = e.target.closest('.hscroll__item');
      if (!item) return;
      var pad = parseFloat(getComputedStyle(sec).getPropertyValue('--hs-pad')) || 0;
      var x = Math.min(distance, Math.max(0, item.offsetLeft - pad));
      var pinTop = pin.getBoundingClientRect().top + window.scrollY - (parseFloat(getComputedStyle(sticky).top) || 0);
      window.scrollTo({ top: pinTop + x, behavior: 'auto' });
      track.scrollLeft = 0; // focus can nudge overflow:visible tracks; keep transform as the only offset
    });

    measure();
  });


  /* Navigation dropdowns ------------------------------------------------------
     Disclosure pattern: the caret button toggles the panel (aria-expanded); pointer hover opens it too.
     Escape closes and returns focus to the caret; clicking outside or tabbing away closes. */
  var menus = Array.prototype.slice.call(document.querySelectorAll('[data-menu]'));
  function setMenu(item, open) {
    var btn = item.querySelector('.menu-caret'), panel = item.querySelector('.navmenu');
    if (open) menus.forEach(function (m) { if (m !== item) setMenu(m, false); });
    btn.setAttribute('aria-expanded', String(open));
    panel.hidden = !open;
    if (open) {
      // Keep the panel on screen: near the right edge it aligns to the item's right side instead
      panel.classList.remove('navmenu--end');
      if (panel.getBoundingClientRect().right > document.documentElement.clientWidth - 16) panel.classList.add('navmenu--end');
    }
  }
  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)');
  menus.forEach(function (item) {
    var btn = item.querySelector('.menu-caret'), closeT;
    btn.addEventListener('click', function () { setMenu(item, btn.getAttribute('aria-expanded') !== 'true'); });
    item.addEventListener('mouseenter', function () { if (!canHover.matches) return; clearTimeout(closeT); setMenu(item, true); });
    item.addEventListener('mouseleave', function () { if (!canHover.matches) return; closeT = setTimeout(function () { setMenu(item, false); }, 180); });
    item.addEventListener('focusout', function (e) { if (!item.contains(e.relatedTarget)) setMenu(item, false); });
    item.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { setMenu(item, false); btn.focus(); }
    });
  });
  document.addEventListener('click', function (e) { menus.forEach(function (m) { if (!m.contains(e.target)) setMenu(m, false); }); });

  // Mobile menu sub-lists
  document.querySelectorAll('.mobile-nav__caret').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      document.getElementById(btn.getAttribute('aria-controls')).hidden = !open;
    });
  });


  /* Projects type filter: ?type=<slug> (from the Projects dropdown) or the filter links */
  var grid = document.querySelector('.project-grid');
  if (grid) {
    var filterLinks = document.querySelectorAll('.type-filter [data-filter]');
    var countEl = document.querySelector('.type-filter [data-count]');
    var applyType = function (type) {
      var known = Array.prototype.some.call(filterLinks, function (a) { return a.getAttribute('data-filter') === type; });
      if (!known) type = 'all';
      var shown = 0;
      grid.querySelectorAll('.project-col').forEach(function (col) {
        var on = type === 'all' || col.getAttribute('data-type') === type;
        col.hidden = !on; if (on) shown++;
      });
      grid.classList.toggle('is-filtered', type !== 'all');
      filterLinks.forEach(function (a) { a.setAttribute('aria-current', String(a.getAttribute('data-filter') === type)); });
      if (countEl) countEl.parentNode.innerHTML = '<span data-count>' + shown + '</span> ' + (shown === 1 ? 'project' : 'projects');
      countEl = document.querySelector('.type-filter [data-count]');
      grid.querySelectorAll('.reveal-img').forEach(function (el) { el.classList.add('is-inview'); });
    };
    filterLinks.forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var type = a.getAttribute('data-filter');
        history.replaceState(null, '', type === 'all' ? '/projects/' : '/projects/?type=' + type);
        applyType(type);
      });
    });
    applyType(new URLSearchParams(window.location.search).get('type') || 'all');
  }


  /* Careers: Meet our people — previous/next buttons for the native scroll row */
  document.querySelectorAll('.people').forEach(function (sec) {
    var track = sec.querySelector('.people__track');
    var btns = sec.querySelectorAll('.people__nav');
    function sync() {
      var max = track.scrollWidth - track.clientWidth - 2;
      btns[0].disabled = track.scrollLeft <= 2;
      btns[1].disabled = track.scrollLeft >= max;
    }
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        var card = track.querySelector('.person');
        var step = card ? card.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 0) : track.clientWidth * .8;
        track.scrollBy({ left: step * +b.getAttribute('data-dir'), behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      });
    });
    track.addEventListener('scroll', function () { window.requestAnimationFrame(sync); }, { passive: true });

    // Profile cards (after Turner): desktop pointers open on hover; the "+" button opens on touch and
    // keyboard. The box grows over the neighbouring card, or leftwards when there's no room to the right.
    var hoverWide = window.matchMedia('(min-width: 992px) and (hover: hover)');
    var people = Array.prototype.slice.call(sec.querySelectorAll('.person'));
    people.forEach(function (person) {
      var btn = person.querySelector('.person__toggle'), extra = person.querySelector('.person__extra');
      var name = person.querySelector('.person__name').textContent.trim();
      var label = btn.querySelector('.visually-hidden');
      function set(open) {
        if (open) {
          people.forEach(function (p) { if (p !== person && p.classList.contains('is-open')) p._set(false); });
          var r = person.getBoundingClientRect(), box = track.getBoundingClientRect();
          person.classList.toggle('open-left', r.right + r.width > Math.min(box.right, document.documentElement.clientWidth) + 4);
        }
        person.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', String(open));
        label.textContent = (open ? 'Close profile of ' : 'Read more from ') + name;
        extra.inert = !open;
      }
      person._set = set;
      btn.addEventListener('click', function () { set(btn.getAttribute('aria-expanded') !== 'true'); });
      person.addEventListener('mouseenter', function () { if (hoverWide.matches) set(true); });
      person.addEventListener('mouseleave', function () { if (hoverWide.matches) set(false); });
      person.addEventListener('focusout', function (e) { if (hoverWide.matches && !person.contains(e.relatedTarget)) set(false); });
      person.addEventListener('keydown', function (e) { if (e.key === 'Escape' && person.classList.contains('is-open')) { set(false); btn.focus(); } });
      set(false);
    });
    // Hide the arrows when every card already fits
    function staticCheck() { sec.classList.toggle('is-static', track.scrollWidth <= track.clientWidth + 2); }
    window.addEventListener('resize', staticCheck); staticCheck();
    window.addEventListener('resize', sync);
    sync();
  });

  /* Footer year ------------------------------------------------------------ */
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
