/* ==========================================================================
   SpendWise - shared browser code (API helper, layout, theme, formatting, UI helpers)
   Loaded in <head> on every page. Exposes one global: window.SW
   ========================================================================== */
(function () {
  'use strict';

  var THEME_KEY = 'sw-theme';

  // Apply the saved theme immediately so the page never flashes the wrong colours.
  try {
    var saved = localStorage.getItem(THEME_KEY);
    if (saved) document.documentElement.setAttribute('data-theme', saved);
  } catch (e) { /* storage may be blocked */ }

  var SW = { user: null, settings: { currency: 'INR', theme: 'light' }, meta: null };
  window.SW = SW;

  /* ---------------- Small helpers ---------------- */
  SW.esc = function (value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  SW.$ = function (id) { return document.getElementById(id); };

  SW.debounce = function (fn, ms) {
    var t;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, ms || 300);
    };
  };

  SW.todayStr = function () {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  SW.MONTHS = MONTHS;

  /** "2026-11-16" -> "16 Nov 2026" (parsed manually so time zones can never shift the day) */
  SW.formatDate = function (s) {
    if (!s) return '';
    var p = String(s).split('-');
    if (p.length !== 3) return s;
    return Number(p[2]) + ' ' + MONTHS[Number(p[1]) - 1].slice(0, 3) + ' ' + p[0];
  };

  /** "2026-11" -> "Nov 2026" (or "November 2026" when long = true) */
  SW.formatMonth = function (k, long) {
    var p = String(k).split('-');
    var name = MONTHS[Number(p[1]) - 1] || '';
    return (long ? name : name.slice(0, 3)) + ' ' + p[0];
  };

  /** Database timestamps are UTC "YYYY-MM-DD HH:MM:SS" -> "5 minutes ago" */
  SW.timeAgo = function (ts) {
    var d = new Date(String(ts).replace(' ', 'T') + 'Z');
    if (isNaN(d)) return '';
    var s = Math.floor((Date.now() - d.getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + ' min ago';
    if (s < 86400) return Math.floor(s / 3600) + ' hr ago';
    if (s < 86400 * 7) return Math.floor(s / 86400) + ' day' + (Math.floor(s / 86400) === 1 ? '' : 's') + ' ago';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  var LOCALES = { INR: 'en-IN', USD: 'en-US', EUR: 'en-IE' };
  var fmtCache = {};
  SW.money = function (n) {
    var cur = SW.settings.currency || 'INR';
    if (!fmtCache[cur]) fmtCache[cur] = new Intl.NumberFormat(LOCALES[cur] || 'en-US', { style: 'currency', currency: cur });
    return fmtCache[cur].format(Number(n) || 0);
  };
  SW.moneyCompact = function (n) {
    var cur = SW.settings.currency || 'INR';
    return new Intl.NumberFormat(LOCALES[cur] || 'en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(n) || 0);
  };

  /* ---------------- API ---------------- */
  SW.api = async function (url, opts) {
    opts = opts || {};
    var init = { method: opts.method || 'GET', credentials: 'same-origin', headers: {} };
    if (opts.body !== undefined) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(opts.body);
    }
    var res;
    try {
      res = await fetch(url, init);
    } catch (e) {
      var netErr = new Error('Cannot reach the server. Is it running?');
      netErr.status = 0;
      throw netErr;
    }
    var data = null;
    try { data = await res.json(); } catch (e) { /* no body */ }
    if (res.status === 401 && document.body && document.body.dataset.protected === 'true') {
      window.location.href = '/login.html';
      var authErr = new Error('Please log in.');
      authErr.status = 401;
      throw authErr;
    }
    if (!res.ok) {
      var err = new Error((data && data.message) || 'Something went wrong. Please try again.');
      err.status = res.status;
      err.errors = (data && data.errors) || {};
      throw err;
    }
    return data;
  };

  /* ---------------- Theme ---------------- */
  var ICONS = {
    wallet: '<path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>',
    dashboard: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    income: '<circle cx="12" cy="12" r="10"/><polyline points="8 12 12 16 16 12"/><line x1="12" y1="8" x2="12" y2="16"/>',
    expenses: '<circle cx="12" cy="12" r="10"/><polyline points="16 12 12 8 8 12"/><line x1="12" y1="16" x2="12" y2="8"/>',
    budgets: '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
    transactions: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
    analytics: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    reports: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    settings: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    menu: '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    sun: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
    edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>'
  };
  SW.icon = function (name) {
    return '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  };

  function applyTheme(theme) {
    theme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* ignore */ }
    SW.settings.theme = theme;
    var btn = SW.$('theme-btn');
    if (btn) {
      btn.innerHTML = SW.icon(theme === 'dark' ? 'sun' : 'moon');
      btn.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    }
    window.dispatchEvent(new CustomEvent('sw:themechange'));
  }
  SW.applyTheme = applyTheme;

  /** Theme-aware colours for Chart.js */
  SW.chartTheme = function () {
    var cs = getComputedStyle(document.documentElement);
    return {
      text: cs.getPropertyValue('--muted').trim() || '#6b7280',
      grid: cs.getPropertyValue('--border').trim() || '#e5e7eb',
      surface: cs.getPropertyValue('--surface').trim() || '#ffffff',
      income: '#22c55e',
      expense: '#ef4444',
      primary: '#6366f1',
      savings: '#06b6d4',
      palette: ['#6366f1', '#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b']
    };
  };

  var charts = {};
  /**
   * Draws (or redraws) a chart. When hasData is false the canvas is hidden and a friendly message is shown.
   * The canvas must sit inside a ".chart-box" that also contains a ".chart-empty" element.
   */
  SW.makeChart = function (canvasId, config, hasData) {
    var canvas = SW.$(canvasId);
    if (!canvas) return null;
    var empty = canvas.parentElement.querySelector('.chart-empty');
    if (charts[canvasId]) { charts[canvasId].destroy(); delete charts[canvasId]; }
    if (!window.Chart) {
      canvas.hidden = true;
      if (empty) { empty.hidden = false; empty.textContent = 'Chart library not found. Run "npm install" and restart the server.'; }
      return null;
    }
    if (!hasData) {
      canvas.hidden = true;
      if (empty) { empty.hidden = false; empty.textContent = 'No data to show yet.'; }
      return null;
    }
    canvas.hidden = false;
    if (empty) empty.hidden = true;
    var t = SW.chartTheme();
    Chart.defaults.color = t.text;
    Chart.defaults.borderColor = t.grid;
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
    Chart.defaults.maintainAspectRatio = false;
    charts[canvasId] = new Chart(canvas.getContext('2d'), config);
    return charts[canvasId];
  };

  /* ---------------- Toast & confirm ---------------- */
  SW.toast = function (message, type) {
    var box = SW.$('toasts');
    if (!box) {
      box = document.createElement('div');
      box.id = 'toasts';
      box.setAttribute('aria-live', 'polite');
      document.body.appendChild(box);
    }
    var el = document.createElement('div');
    el.className = 'toast' + (type === 'error' ? ' error' : '');
    el.textContent = message;
    box.appendChild(el);
    setTimeout(function () { el.remove(); }, type === 'error' ? 5000 : 3000);
  };

  SW.confirm = function (message, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var wrap = document.createElement('div');
      wrap.className = 'modal-backdrop';
      wrap.innerHTML =
        '<div class="modal modal-sm" role="dialog" aria-modal="true">' +
        '<div class="modal-header"><h3>' + SW.esc(opts.title || 'Please confirm') + '</h3></div>' +
        '<div class="modal-body"><p>' + SW.esc(message) + '</p></div>' +
        '<div class="modal-footer"><button class="btn btn-ghost" data-r="0">Cancel</button>' +
        '<button class="btn btn-danger" data-r="1">' + SW.esc(opts.confirmText || 'Delete') + '</button></div></div>';
      function close(result) {
        document.removeEventListener('keydown', onKey);
        wrap.remove();
        resolve(result);
      }
      function onKey(e) { if (e.key === 'Escape') close(false); }
      wrap.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-r]');
        if (b) close(b.dataset.r === '1');
        else if (e.target === wrap) close(false);
      });
      document.addEventListener('keydown', onKey);
      document.body.appendChild(wrap);
      wrap.querySelector('[data-r="1"]').focus();
    });
  };

  /* ---------------- Form helpers ---------------- */
  /** Fills a <select>. items: array of strings. placeholder (optional) adds an empty first option. */
  SW.fillSelect = function (select, items, placeholder) {
    if (!select) return;
    var html = placeholder !== undefined ? '<option value="">' + SW.esc(placeholder) + '</option>' : '';
    items.forEach(function (i) { html += '<option value="' + SW.esc(i) + '">' + SW.esc(i) + '</option>'; });
    select.innerHTML = html;
  };

  SW.clearFormErrors = function (form) {
    form.querySelectorAll('.field.invalid').forEach(function (f) { f.classList.remove('invalid'); });
    form.querySelectorAll('[data-error-for]').forEach(function (e) { e.textContent = ''; });
    var general = form.querySelector('.form-error');
    if (general) { general.hidden = true; general.textContent = ''; }
  };

  /** Shows per-field errors returned by the API; falls back to the general error box. */
  SW.showFormErrors = function (form, err) {
    var shown = false;
    var errors = (err && err.errors) || {};
    Object.keys(errors).forEach(function (name) {
      var target = form.querySelector('[data-error-for="' + name + '"]');
      if (target) {
        target.textContent = errors[name];
        var field = target.closest('.field');
        if (field) field.classList.add('invalid');
        shown = true;
      }
    });
    var general = form.querySelector('.form-error');
    if (general && (!shown || !Object.keys(errors).length)) {
      general.textContent = (err && err.message) || 'Something went wrong.';
      general.hidden = false;
    }
  };

  SW.renderPager = function (el, page, pages, total, onChange) {
    if (!el) return;
    var info = '<span class="pager-info">' + total + ' record' + (total === 1 ? '' : 's') + (pages > 1 ? ' &middot; Page ' + page + ' of ' + pages : '') + '</span>';
    if (pages <= 1) { el.innerHTML = total ? info : ''; el.onclick = null; return; }
    var nums = [];
    for (var i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i);
      else if (nums[nums.length - 1] !== '...') nums.push('...');
    }
    var btns = '<button data-page="' + (page - 1) + '"' + (page === 1 ? ' disabled' : '') + '>&lsaquo; Prev</button>';
    nums.forEach(function (n) {
      btns += n === '...' ? '<button disabled>&hellip;</button>' :
        '<button data-page="' + n + '"' + (n === page ? ' class="active"' : '') + '>' + n + '</button>';
    });
    btns += '<button data-page="' + (page + 1) + '"' + (page === pages ? ' disabled' : '') + '>Next &rsaquo;</button>';
    el.innerHTML = info + '<div class="pager-buttons">' + btns + '</div>';
    el.onclick = function (e) {
      var b = e.target.closest('button[data-page]');
      if (b && !b.disabled) onChange(Number(b.dataset.page));
    };
  };

  /* ---------------- Layout (sidebar + top bar) ---------------- */
  var NAV = [
    ['dashboard', 'Dashboard', '/dashboard.html'],
    ['income', 'Income', '/income.html'],
    ['expenses', 'Expenses', '/expenses.html'],
    ['budgets', 'Budgets', '/budgets.html'],
    ['transactions', 'Transactions', '/transactions.html'],
    ['analytics', 'Analytics', '/analytics.html'],
    ['reports', 'Reports', '/reports.html'],
    ['settings', 'Settings', '/settings.html']
  ];

  SW.logout = async function () {
    try { await SW.api('/api/auth/logout', { method: 'POST' }); } catch (e) { /* ignore */ }
    window.location.href = '/login.html';
  };

  function buildShell() {
    var sidebar = SW.$('sidebar');
    var topbar = SW.$('topbar');
    if (!sidebar || !topbar) return;
    var page = document.body.dataset.page;
    var title = document.body.dataset.title || 'SpendWise';

    sidebar.innerHTML =
      '<a class="brand" href="/dashboard.html">' + SW.icon('wallet') + '<span>SpendWise</span></a>' +
      '<nav class="nav" aria-label="Main">' +
      NAV.map(function (n) {
        return '<a class="nav-link' + (n[0] === page ? ' active' : '') + '" href="' + n[2] + '">' + SW.icon(n[0]) + '<span>' + n[1] + '</span></a>';
      }).join('') +
      '</nav>' +
      '<button class="nav-link nav-logout" id="logout-btn" type="button">' + SW.icon('logout') + '<span>Logout</span></button>';

    var initial = (SW.user.name || '?').trim().charAt(0).toUpperCase();
    topbar.innerHTML =
      '<button class="icon-btn menu-btn" id="menu-btn" type="button" aria-label="Open menu">' + SW.icon('menu') + '</button>' +
      '<h1 class="page-title">' + SW.esc(title) + '</h1>' +
      '<div class="topbar-right">' +
      '<button class="icon-btn" id="theme-btn" type="button" aria-label="Toggle dark mode"></button>' +
      '<div class="user-chip"><span class="avatar" id="user-avatar">' + SW.esc(initial) + '</span><span class="user-name" id="user-name">' + SW.esc(SW.user.name) + '</span></div>' +
      '</div>';

    var overlay = SW.$('sidebar-overlay');
    function toggleMenu(open) {
      sidebar.classList.toggle('open', open);
      if (overlay) overlay.classList.toggle('show', open);
    }
    SW.$('menu-btn').addEventListener('click', function () { toggleMenu(!sidebar.classList.contains('open')); });
    if (overlay) overlay.addEventListener('click', function () { toggleMenu(false); });
    SW.$('logout-btn').addEventListener('click', SW.logout);

    SW.$('theme-btn').addEventListener('click', async function () {
      var next = SW.settings.theme === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try {
        await SW.api('/api/settings', { method: 'PUT', body: { theme: next } });
      } catch (e) {
        SW.toast('Could not save theme: ' + e.message, 'error');
      }
    });
    applyTheme(SW.settings.theme);
  }

  /** Loads the logged-in user, settings and category lists (also proves the cookie is valid). */
  SW.load = async function () {
    var data = await SW.api('/api/auth/me');
    SW.user = data.user;
    SW.settings = data.settings;
    SW.meta = data.meta;
  };

  /**
   * Every page script calls SW.start(fn). On private pages this first loads the user,
   * builds the sidebar/top bar, then runs fn.
   */
  SW.start = function (fn) {
    async function run() {
      try {
        if (document.body.dataset.protected === 'true') {
          await SW.load();
          buildShell();
        }
        await fn();
      } catch (e) {
        if (e && e.status === 401) return;
        console.error(e);
        SW.toast((e && e.message) || 'Something went wrong.', 'error');
      }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
    else run();
  };
})();
