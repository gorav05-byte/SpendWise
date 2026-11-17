/* Dashboard: every number and chart comes from /api/dashboard (the logged-in user's records) */
SW.start(async function () {
  'use strict';
  var $ = SW.$;
  var data = await SW.api('/api/dashboard');

  function draw() {
    renderStatic();
    renderCharts();
  }

  function renderStatic() {
    var first = SW.user.name.trim().split(/\s+/)[0];
    $('welcome').textContent = 'Welcome back, ' + first + '!';
    $('today-text').textContent = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    // Budget alerts
    var alerts = data.budget.alerts;
    $('alerts').innerHTML = alerts.map(function (b) {
      var title = b.status === 'exceeded' ? 'Budget exceeded' : b.status === 'critical' ? 'Budget almost used up' : 'Budget warning';
      return '<div class="alert alert-' + b.status + '"><div><strong>' + title + ':</strong> ' + SW.esc(b.message) +
        ' <a href="/budgets.html">Manage budgets</a></div></div>';
    }).join('');

    // Stat cards
    $('stat-income').textContent = SW.money(data.totals.income);
    $('stat-expense').textContent = SW.money(data.totals.expense);
    var bal = $('stat-balance');
    bal.textContent = SW.money(data.totals.balance);
    bal.className = 'stat-value ' + (data.totals.balance < 0 ? 'negative' : 'positive');

    var overall = data.budget.overall;
    if (overall) {
      $('stat-budget').textContent = SW.money(overall.amount);
      $('stat-budget-sub').textContent = overall.remaining >= 0
        ? SW.money(overall.remaining) + ' remaining (' + overall.percent + '% used)'
        : 'Over budget by ' + SW.money(-overall.remaining);
      $('stat-budget-progress').hidden = false;
      var bar = $('stat-budget-bar');
      bar.className = 'progress-bar status-' + overall.status;
      bar.style.width = Math.min(overall.percent, 100) + '%';
    } else {
      $('stat-budget').textContent = 'Not set';
      $('stat-budget-sub').innerHTML = '<a href="/budgets.html">Set a monthly budget</a>';
      $('stat-budget-progress').hidden = true;
    }

    // Savings overview
    var m = data.month;
    var sm = $('savings-month');
    sm.textContent = SW.money(m.savings);
    sm.className = 'savings-big ' + (m.savings < 0 ? 'amount-expense' : 'amount-income');
    var rate = Math.max(Math.min(m.savingsRate, 100), 0);
    $('savings-rate').textContent = m.savingsRate + '%';
    $('savings-bar').style.width = rate + '%';
    $('savings-total').textContent = SW.money(data.totals.balance);
    $('savings-prev').textContent = SW.money(data.previousMonth.savings);

    // Monthly summary
    $('summary-month').textContent = SW.formatMonth(m.key, true);
    $('sum-income').textContent = SW.money(m.income);
    $('sum-expense').textContent = SW.money(m.expense);
    var ns = $('sum-savings');
    ns.textContent = SW.money(m.savings);
    ns.className = m.savings < 0 ? 'amount-expense' : 'amount-income';
    $('sum-count').textContent = m.transactions;
    var prev = data.previousMonth.expense;
    var change = $('sum-change');
    if (prev > 0) {
      var pct = Math.round(((m.expense - prev) / prev) * 100);
      change.textContent = (pct > 0 ? '+' : '') + pct + '%';
      change.className = pct > 0 ? 'amount-expense' : 'amount-income';
    } else {
      change.textContent = 'No data last month';
      change.className = '';
    }

    // Recent transactions
    $('recent-body').innerHTML = data.recentTransactions.length
      ? data.recentTransactions.map(function (t) {
        return '<tr><td><div class="cell-title">' + SW.esc(t.title) + '</div></td>' +
          '<td><span class="badge ' + (t.type === 'income' ? 'badge-income' : 'badge-expense') + '">' + SW.esc(t.category) + '</span></td>' +
          '<td>' + SW.esc(SW.formatDate(t.date)) + '</td>' +
          '<td class="num ' + (t.type === 'income' ? 'amount-income' : 'amount-expense') + '">' +
          (t.type === 'income' ? '+' : '-') + SW.esc(SW.money(t.amount)) + '</td></tr>';
      }).join('')
      : '<tr><td colspan="4" class="empty-row">No transactions yet. Add your first income or expense!</td></tr>';

    // Recent activity
    $('activity-list').innerHTML = data.recentActivity.length
      ? data.recentActivity.map(function (a) {
        return '<li><span class="dot ' + a.type + '"></span><div class="activity-text">You added ' +
          (a.type === 'income' ? 'income' : 'an expense') + ' <strong>' + SW.esc(a.title) + '</strong>' +
          '<span class="when">' + SW.esc(SW.timeAgo(a.created_at)) + '</span></div>' +
          '<span class="activity-amount ' + (a.type === 'income' ? 'amount-income' : 'amount-expense') + '">' +
          (a.type === 'income' ? '+' : '-') + SW.esc(SW.money(a.amount)) + '</span></li>';
      }).join('')
      : '<li class="muted">No activity yet.</li>';
  }

  function renderCharts() {
    var t = SW.chartTheme();
    var tr = data.trend;
    var labels = tr.labels.map(function (k) { return SW.formatMonth(k); });
    var hasTrend = tr.income.some(Boolean) || tr.expense.some(Boolean);

    SW.makeChart('chart-trend', {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          { label: 'Income', data: tr.income, backgroundColor: t.income, borderRadius: 6 },
          { label: 'Expenses', data: tr.expense, backgroundColor: t.expense, borderRadius: 6 }
        ]
      },
      options: {
        plugins: { tooltip: { callbacks: { label: function (c) { return c.dataset.label + ': ' + SW.money(c.parsed.y); } } } },
        scales: { y: { beginAtZero: true, ticks: { callback: function (v) { return SW.moneyCompact(v); } } }, x: { grid: { display: false } } }
      }
    }, hasTrend);

    var cats = data.expenseByCategory;
    SW.makeChart('chart-category', {
      type: 'doughnut',
      data: {
        labels: cats.map(function (c) { return c.category; }),
        datasets: [{ data: cats.map(function (c) { return c.total; }), backgroundColor: t.palette, borderColor: t.surface, borderWidth: 2 }]
      },
      options: {
        cutout: '62%',
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12 } },
          tooltip: { callbacks: { label: function (c) { return c.label + ': ' + SW.money(c.parsed); } } }
        }
      }
    }, cats.length > 0);
  }

  draw();
  window.addEventListener('sw:themechange', renderCharts);
});
