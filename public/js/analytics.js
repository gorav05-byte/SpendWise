/* Analytics: every chart is built from /api/analytics (the logged-in user's records) */
SW.start(async function () {
  'use strict';
  var $ = SW.$;
  var data = null;

  async function load() {
    data = await SW.api('/api/analytics?months=' + $('period').value);
    renderText();
    renderCharts();
  }

  function legendTable(rows, t) {
    if (!rows.length) return '<tbody><tr><td class="muted">No data for this period.</td></tr></tbody>';
    return '<tbody>' + rows.map(function (r, i) {
      return '<tr><td><span class="swatch" style="background:' + t.palette[i % t.palette.length] + '"></span>' + SW.esc(r.category) + '</td>' +
        '<td class="num">' + SW.esc(SW.money(r.total)) + '</td><td class="num muted">' + r.percent + '%</td></tr>';
    }).join('') + '</tbody>';
  }

  function renderText() {
    var tot = data.totals;
    $('period-text').textContent = SW.formatMonth(data.period.from.slice(0, 7)) + ' to ' + SW.formatMonth(data.period.to.slice(0, 7)) +
      ' (' + data.period.months + ' month' + (data.period.months === 1 ? '' : 's') + ')';
    $('k-income').textContent = SW.money(tot.income);
    $('k-income-sub').textContent = 'Average ' + SW.money(tot.avgIncome) + ' / month';
    $('k-expense').textContent = SW.money(tot.expense);
    $('k-expense-sub').textContent = 'Average ' + SW.money(tot.avgExpense) + ' / month';
    var s = $('k-savings');
    s.textContent = SW.money(tot.savings);
    s.className = 'stat-value ' + (tot.savings < 0 ? 'negative' : 'positive');
    $('k-rate').textContent = tot.savingsRate + '%';

    var h = data.highlights;
    var items = [];
    if (h.topCategory) items.push('<li><strong>Top spending category</strong>' + SW.esc(h.topCategory.category) + ' - ' + SW.esc(SW.money(h.topCategory.total)) + ' (' + h.topCategory.percent + '% of spending)</li>');
    if (h.largestExpense) items.push('<li><strong>Largest expense</strong>' + SW.esc(h.largestExpense.title) + ' - ' + SW.esc(SW.money(h.largestExpense.amount)) + ' on ' + SW.esc(SW.formatDate(h.largestExpense.date)) + '</li>');
    if (h.largestIncome) items.push('<li><strong>Largest income</strong>' + SW.esc(h.largestIncome.title) + ' - ' + SW.esc(SW.money(h.largestIncome.amount)) + ' on ' + SW.esc(SW.formatDate(h.largestIncome.date)) + '</li>');
    items.push('<li><strong>Savings analysis</strong>' + (tot.income > 0
      ? 'You saved ' + tot.savingsRate + '% of your income in this period' + (tot.savings < 0 ? ' (you spent more than you earned).' : '.')
      : 'Add income records to see your savings rate.') + '</li>');
    $('highlights').innerHTML = items.join('');
  }

  function renderCharts() {
    var t = SW.chartTheme();
    var tr = data.trend;
    var labels = tr.labels.map(function (k) { return SW.formatMonth(k); });
    var hasTrend = tr.income.some(Boolean) || tr.expense.some(Boolean);
    var money = function (c) { return c.dataset.label + ': ' + SW.money(c.parsed.y); };
    var yScale = { y: { ticks: { callback: function (v) { return SW.moneyCompact(v); } } }, x: { grid: { display: false } } };

    SW.makeChart('chart-trend', {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          { label: 'Income', data: tr.income, borderColor: t.income, backgroundColor: t.income, tension: 0.3, pointRadius: 3 },
          { label: 'Expenses', data: tr.expense, borderColor: t.expense, backgroundColor: t.expense, tension: 0.3, pointRadius: 3 },
          { label: 'Savings', data: tr.savings, borderColor: t.savings, backgroundColor: t.savings, tension: 0.3, pointRadius: 3, borderDash: [6, 4] }
        ]
      },
      options: { interaction: { mode: 'index', intersect: false }, plugins: { tooltip: { callbacks: { label: money } } }, scales: yScale }
    }, hasTrend);

    SW.makeChart('chart-compare', {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          { label: 'Income', data: tr.income, backgroundColor: t.income, borderRadius: 5 },
          { label: 'Expenses', data: tr.expense, backgroundColor: t.expense, borderRadius: 5 }
        ]
      },
      options: { plugins: { tooltip: { callbacks: { label: money } } }, scales: Object.assign({}, yScale, { y: { beginAtZero: true, ticks: yScale.y.ticks } }) }
    }, hasTrend);

    function doughnut(id, rows) {
      SW.makeChart(id, {
        type: 'doughnut',
        data: {
          labels: rows.map(function (r) { return r.category; }),
          datasets: [{ data: rows.map(function (r) { return r.total; }), backgroundColor: t.palette, borderColor: t.surface, borderWidth: 2 }]
        },
        options: { cutout: '60%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (c) { return c.label + ': ' + SW.money(c.parsed); } } } } }
      }, rows.length > 0);
    }
    doughnut('chart-expcat', data.expenseByCategory);
    doughnut('chart-inccat', data.incomeByCategory);
    $('expcat-table').innerHTML = legendTable(data.expenseByCategory, t);
    $('inccat-table').innerHTML = legendTable(data.incomeByCategory, t);

    var b = data.budgets;
    SW.makeChart('chart-budget', {
      type: 'bar',
      data: {
        labels: b.map(function (x) { return x.category === SW.meta.overallBudget ? 'Overall' : x.category; }),
        datasets: [
          { label: 'Budget', data: b.map(function (x) { return x.amount; }), backgroundColor: t.primary, borderRadius: 5 },
          { label: 'Spent', data: b.map(function (x) { return x.spent; }), backgroundColor: b.map(function (x) { return x.status === 'ok' ? t.income : x.status === 'exceeded' ? t.expense : '#f59e0b'; }), borderRadius: 5 }
        ]
      },
      options: {
        indexAxis: 'y',
        plugins: { tooltip: { callbacks: { label: function (c) { return c.dataset.label + ': ' + SW.money(c.parsed.x); } } } },
        scales: { x: { beginAtZero: true, ticks: { callback: function (v) { return SW.moneyCompact(v); } } }, y: { grid: { display: false } } }
      }
    }, b.length > 0);
    var canvas = $('chart-budget');
    var empty = canvas.parentElement.querySelector('.chart-empty');
    if (!b.length && empty) empty.textContent = 'No budgets set for this month yet.';
  }

  $('period').addEventListener('change', function () { load().catch(function (e) { SW.toast(e.message, 'error'); }); });
  window.addEventListener('sw:themechange', function () { if (data) renderCharts(); });
  await load();
});
