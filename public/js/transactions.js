/* Transaction history: income + expenses together with search, filters, sorting and pagination */
SW.start(async function () {
  'use strict';
  var $ = SW.$;
  var page = 1;

  var cats = Array.from(new Set(SW.meta.incomeCategories.concat(SW.meta.expenseCategories)));
  SW.fillSelect($('filter-category'), cats, 'All categories');

  async function load() {
    var sort = $('filter-sort').value.split(':');
    var p = new URLSearchParams({ page: page, limit: 10, sort: sort[0], order: sort[1] });
    var search = $('filter-search').value.trim();
    if (search) p.set('search', search);
    ['type', 'category', 'from', 'to'].forEach(function (k) {
      var v = $('filter-' + k).value;
      if (v) p.set(k, v);
    });
    var data = await SW.api('/api/transactions?' + p.toString());
    page = data.page;

    $('tbody').innerHTML = data.items.length
      ? data.items.map(function (t) {
        var inc = t.type === 'income';
        return '<tr><td><div class="cell-title">' + SW.esc(t.title) + '</div>' +
          (t.payment_method ? '<div class="cell-sub">Paid via ' + SW.esc(t.payment_method) + '</div>' : '') + '</td>' +
          '<td><span class="badge ' + (inc ? 'badge-income' : 'badge-expense') + '">' + (inc ? 'Income' : 'Expense') + '</span></td>' +
          '<td>' + SW.esc(t.category) + '</td>' +
          '<td>' + SW.esc(SW.formatDate(t.date)) + '</td>' +
          '<td class="num ' + (inc ? 'amount-income' : 'amount-expense') + '">' + (inc ? '+' : '-') + SW.esc(SW.money(t.amount)) + '</td>' +
          '<td><div class="cell-sub" title="' + SW.esc(t.description) + '">' + SW.esc(t.description || '-') + '</div></td></tr>';
      }).join('')
      : '<tr><td colspan="6" class="empty-row">No transactions match your filters.</td></tr>';

    $('summary-count').textContent = data.total + ' record' + (data.total === 1 ? '' : 's');
    $('summary-income').textContent = SW.money(data.totals.income);
    $('summary-expense').textContent = SW.money(data.totals.expense);
    SW.renderPager($('pager'), data.page, data.pages, data.total, function (n) { page = n; load().catch(onErr); });
  }

  function onErr(e) { if (e && e.status !== 401) SW.toast(e.message || 'Something went wrong.', 'error'); }
  function reload() { page = 1; load().catch(onErr); }

  $('filter-search').addEventListener('input', SW.debounce(reload, 300));
  ['filter-type', 'filter-category', 'filter-from', 'filter-to', 'filter-sort'].forEach(function (id) {
    $(id).addEventListener('change', reload);
  });
  $('btn-clear').addEventListener('click', function () {
    $('filter-search').value = '';
    $('filter-type').value = '';
    $('filter-category').value = '';
    $('filter-from').value = '';
    $('filter-to').value = '';
    $('filter-sort').value = 'date:desc';
    reload();
  });

  await load();
});
