/* Reports: monthly financial report built from /api/reports/monthly, printable via the browser */
SW.start(async function () {
  'use strict';
  var $ = SW.$;
  var now = new Date();

  var years = [];
  for (var y = now.getFullYear() - 5; y <= now.getFullYear() + 1; y++) years.push(y);
  $('period-month').innerHTML = SW.MONTHS.map(function (m, i) { return '<option value="' + (i + 1) + '">' + m + '</option>'; }).join('');
  $('period-year').innerHTML = years.map(function (v) { return '<option value="' + v + '">' + v + '</option>'; }).join('');
  $('period-month').value = now.getMonth() + 1;
  $('period-year').value = now.getFullYear();

  var STATUS_TEXT = { ok: 'On track', warning: '75%+ used', critical: '90%+ used', exceeded: 'Exceeded' };

  function categoryRows(rows, cls) {
    if (!rows.length) return '<tr><td colspan="4" class="empty-row">No records this month.</td></tr>';
    return rows.map(function (r) {
      return '<tr><td>' + SW.esc(r.category) + '</td><td class="num">' + r.count + '</td>' +
        '<td class="num ' + cls + '">' + SW.esc(SW.money(r.total)) + '</td>' +
        '<td class="bar-cell"><div class="mini-bar"><span style="width:' + r.percent + '%"></span></div><small class="muted">' + r.percent + '%</small></td></tr>';
    }).join('');
  }

  async function load() {
    var mk = $('period-year').value + '-' + String($('period-month').value).padStart(2, '0');
    var d = await SW.api('/api/reports/monthly?month=' + mk);

    $('r-month').textContent = SW.formatMonth(d.month, true);
    $('r-user').textContent = 'Prepared for ' + SW.user.name;
    $('r-generated').textContent = 'Generated on ' + new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    $('r-income').textContent = SW.money(d.totals.income);
    $('r-expense').textContent = SW.money(d.totals.expense);
    var s = $('r-savings');
    s.textContent = SW.money(d.totals.savings);
    s.className = d.totals.savings < 0 ? 'amount-expense' : 'amount-income';
    $('r-rate').textContent = d.totals.savingsRate + '%';

    var prev = d.previous;
    var changeText = prev.expense > 0
      ? (Math.round(((d.totals.expense - prev.expense) / prev.expense) * 100) > 0 ? '+' : '') + Math.round(((d.totals.expense - prev.expense) / prev.expense) * 100) + '% compared with the previous month'
      : 'No data for the previous month';
    $('r-savings-list').innerHTML =
      '<li><span>Net savings this month</span><strong>' + SW.esc(SW.money(d.totals.savings)) + '</strong></li>' +
      '<li><span>Savings rate</span><strong>' + d.totals.savingsRate + '%</strong></li>' +
      '<li><span>Previous month savings</span><strong>' + SW.esc(SW.money(prev.savings)) + '</strong></li>' +
      '<li><span>Spending change</span><strong>' + SW.esc(changeText) + '</strong></li>' +
      '<li><span>Transactions recorded</span><strong>' + d.transactionCount + '</strong></li>';

    $('r-income-body').innerHTML = categoryRows(d.incomeByCategory, 'amount-income');
    $('r-expense-body').innerHTML = categoryRows(d.expenseByCategory, 'amount-expense');

    $('r-budget-body').innerHTML = d.budgets.length
      ? d.budgets.map(function (b) {
        return '<tr><td>' + SW.esc(b.category === SW.meta.overallBudget ? 'Overall monthly budget' : b.category) + '</td>' +
          '<td class="num">' + SW.esc(SW.money(b.amount)) + '</td><td class="num">' + SW.esc(SW.money(b.spent)) + '</td>' +
          '<td class="num">' + SW.esc(SW.money(b.remaining)) + '</td>' +
          '<td>' + STATUS_TEXT[b.status] + ' (' + b.percent + '%)</td></tr>';
      }).join('')
      : '<tr><td colspan="5" class="empty-row">No budgets were set for this month.</td></tr>';

    $('r-tx-body').innerHTML = d.transactions.length
      ? d.transactions.map(function (t) {
        var inc = t.type === 'income';
        return '<tr><td>' + SW.esc(SW.formatDate(t.date)) + '</td><td>' + SW.esc(t.title) + '</td>' +
          '<td>' + (inc ? 'Income' : 'Expense') + '</td><td>' + SW.esc(t.category) + '</td>' +
          '<td class="num ' + (inc ? 'amount-income' : 'amount-expense') + '">' + (inc ? '+' : '-') + SW.esc(SW.money(t.amount)) + '</td></tr>';
      }).join('')
      : '<tr><td colspan="5" class="empty-row">No transactions in this month.</td></tr>';
  }

  function onErr(e) { if (e && e.status !== 401) SW.toast(e.message || 'Something went wrong.', 'error'); }
  $('period-month').addEventListener('change', function () { load().catch(onErr); });
  $('period-year').addEventListener('change', function () { load().catch(onErr); });
  $('btn-print').addEventListener('click', function () { window.print(); });

  await load();
});
