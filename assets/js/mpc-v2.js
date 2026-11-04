/* Homepage v2 review options (concept only): typeface, full-width photo treatment, and the
   "no positions posted" state. Settings come from ?font=&tone=&jobs= or are remembered per browser. */
(function () {
  'use strict';
  var root = document.documentElement;
  var panel = document.getElementById('v2ReviewPanel');
  if (!panel) return;
  var toggle = document.querySelector('.v2-review__toggle');
  var jobs = document.querySelector('[data-jobs]');
  var jobItems = jobs ? Array.prototype.slice.call(jobs.children) : [];
  var params = new URLSearchParams(window.location.search);
  var store = {
    get: function (k) { try { return localStorage.getItem('mpc-v2-' + k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem('mpc-v2-' + k, v); } catch (e) { /* private mode */ } }
  };

  var apply = {
    font: function (v) { root.setAttribute('data-font', v); },
    tone: function (v) { root.setAttribute('data-tone', v); },
    jobs: function (v) {
      if (!jobs) return;
      jobItems.forEach(function (li) { if (v === 'none') li.remove(); else jobs.appendChild(li); });
    }
  };
  var defaults = { font: 'archivo', tone: 'bw', jobs: 'listed' };

  Object.keys(apply).forEach(function (key) {
    var inputs = panel.querySelectorAll('input[name="v2' + key + '"]');
    var allowed = Array.prototype.map.call(inputs, function (i) { return i.value; });
    var value = params.get(key) || store.get(key) || defaults[key];
    if (allowed.indexOf(value) === -1) value = defaults[key];
    inputs.forEach(function (i) {
      i.checked = i.value === value;
      i.addEventListener('change', function () { if (i.checked) { apply[key](i.value); store.set(key, i.value); } });
    });
    apply[key](value);
  });

  toggle.addEventListener('click', function () {
    var open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    panel.hidden = !open;
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !panel.hidden) { panel.hidden = true; toggle.setAttribute('aria-expanded', 'false'); toggle.focus(); }
  });
})();
