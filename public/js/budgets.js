/* Budgets: monthly + category budgets with live progress calculated from real expenses */
SW.start(async function () {
  'use strict';
  var $ = SW.$;
  var now = new Date();
  var items = [];
  var editingId = null;
  var form = $('form');
  var modal = $('modal');

  // Month / year selectors
  var monthOptions = SW.MONTHS.map(function (m, i) { return '<option value="' + (i + 1) + '">' + m + '</option>'; }).join('');
  var years = [];
  for (var y = now.getFullYear() - 3; y <= now.getFullYear() + 2; y++) years.push(y);
  var yearOptions = years.map(function (y2) { return '<option value="' + y2 + '">' + y2 + '</option>'; }).join('');
  ['period-month', 'f-month'].forEach(function (id) { $(id).innerHTML = monthOptions; });
  ['period-year', 'f-year'].forEach(function (id) { $(id).innerHTML = yearOptions; });
  $('period-month').value = now.getMonth() + 1;
  $('period-year').value = now.getFullYear();

  // Category selector: Overall + expense categories
  $('f-category').innerHTML = SW.meta.budgetCategories.map(function (c) {
    return '<option value="' + SW.esc(c) + '">' + SW.esc(c === SW.meta.overallBudget ? 'Overall monthly budget' : c) + '</option>';
  }).join('');

  var STATUS_TEXT = { ok: 'On track', warning: '75% used', critical: '90% used', exceeded: 'Exceeded' };

  async function load() {
    var data = await SW.api('/api/budgets?month=' + $('period-month').value + '&year=' + $('period-year').value);
    items = data.items;
    render();
  }

  function render() {
    var alerts = items.filter(function (b) { return b.status !== 'ok'; });
    $('alerts').innerHTML = alerts.map(function (b) {
      return '<div class="alert alert-' + b.status + '"><div>' + SW.esc(b.message) + '</div></div>';
    }).join('');

    if (!items.length) {
      $('budget-list').innerHTML = '<div class="card empty-state" style="grid-column:1/-1">No budgets for ' +
        SW.esc(SW.MONTHS[$('period-month').value - 1] + ' ' + $('period-year').value) +
        '. Click "Set Budget" to create one.</div>';
      return;
    }

    $('budget-list').innerHTML = items.map(function (b) {
      var label = b.category === SW.meta.overallBudget ? 'Overall monthly budget' : b.category;
      return '<article class="card budget-card">' +
        '<div class="budget-top"><div><h3>' + SW.esc(label) + '</h3><span class="badge badge-' + b.status + '">' + STATUS_TEXT[b.status] + '</span></div>' +
        '<div class="row-actions">' +
        '<button class="icon-btn" type="button" data-action="edit" data-id="' + b.id + '" title="Edit" aria-label="Edit">' + SW.icon('edit') + '</button>' +
        '<button class="icon-btn btn-del" type="button" data-action="delete" data-id="' + b.id + '" title="Delete" aria-label="Delete">' + SW.icon('trash') + '</button></div></div>' +
        '<div class="progress" role="progressbar" aria-valuenow="' + Math.min(b.percent, 100) + '" aria-valuemin="0" aria-valuemax="100">' +
        '<div class="progress-bar status-' + b.status + '" style="width:' + Math.min(b.percent, 100) + '%"></div></div>' +
        '<div class="budget-meta">' +
        '<span>Spent<strong>' + SW.esc(SW.money(b.spent)) + '</strong></span>' +
        '<span>Budget<strong>' + SW.esc(SW.money(b.amount)) + '</strong></span>' +
        '<span>' + (b.remaining >= 0 ? 'Remaining' : 'Over by') + '<strong class="' + (b.remaining >= 0 ? '' : 'amount-expense') + '">' + SW.esc(SW.money(Math.abs(b.remaining))) + '</strong></span>' +
        '<span>Used<strong>' + b.percent + '%</strong></span></div>' +
        '<p class="budget-msg">' + SW.esc(b.message) + '</p></article>';
    }).join('');
  }

  $('period-month').addEventListener('change', function () { load().catch(onErr); });
  $('period-year').addEventListener('change', function () { load().catch(onErr); });

  function onErr(e) { if (e && e.status !== 401) SW.toast(e.message || 'Something went wrong.', 'error'); }

  /* ---------- Modal ---------- */
  function openModal(item) {
    SW.clearFormErrors(form);
    form.reset();
    editingId = item ? item.id : null;
    $('modal-title').textContent = item ? 'Edit Budget' : 'Set Budget';
    $('f-category').value = item ? item.category : SW.meta.overallBudget;
    $('f-amount').value = item ? item.amount : '';
    $('f-month').value = item ? item.month : $('period-month').value;
    $('f-year').value = item ? item.year : $('period-year').value;
    modal.hidden = false;
    $('f-amount').focus();
  }
  function closeModal() { modal.hidden = true; }

  $('btn-add').addEventListener('click', function () { openModal(null); });
  $('btn-close').addEventListener('click', closeModal);
  $('btn-cancel').addEventListener('click', closeModal);
  modal.addEventListener('mousedown', function (e) { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    SW.clearFormErrors(form);
    var body = {
      category: $('f-category').value,
      amount: $('f-amount').value,
      month: Number($('f-month').value),
      year: Number($('f-year').value)
    };
    if (!(Number(body.amount) > 0)) return SW.showFormErrors(form, { errors: { amount: 'Enter an amount greater than 0.' } });

    var btn = $('btn-save');
    btn.disabled = true;
    try {
      var res = await SW.api(editingId ? '/api/budgets/' + editingId : '/api/budgets', { method: editingId ? 'PUT' : 'POST', body: body });
      SW.toast(res.message);
      closeModal();
      // Jump to the month of the saved budget so the user sees it
      $('period-month').value = body.month;
      $('period-year').value = body.year;
      await load();
    } catch (err) {
      SW.showFormErrors(form, err);
    } finally {
      btn.disabled = false;
    }
  });

  $('budget-list').addEventListener('click', async function (e) {
    var btn = e.target.closest('button[data-action]');
    if (!btn) return;
    var id = Number(btn.dataset.id);
    var item = items.find(function (i) { return i.id === id; });
    if (!item) return;
    if (btn.dataset.action === 'edit') return openModal(item);

    var label = item.category === SW.meta.overallBudget ? 'the overall monthly budget' : 'the ' + item.category + ' budget';
    var ok = await SW.confirm('Delete ' + label + ' of ' + SW.money(item.amount) + '?');
    if (!ok) return;
    try {
      var res = await SW.api('/api/budgets/' + id, { method: 'DELETE' });
      SW.toast(res.message);
      await load();
    } catch (err) { onErr(err); }
  });

  await load();
});
