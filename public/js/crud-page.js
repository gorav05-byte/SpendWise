/* ==========================================================================
   Shared logic for the Income and Expenses pages:
   list + search + filters + sorting + pagination + add/edit/delete modal.
   Usage: SW.crudPage({ endpoint, categoriesKey, hasPayment, label, amountClass })
   ========================================================================== */
SW.crudPage = function (cfg) {
  'use strict';
  var $ = SW.$;
  var state = { page: 1, limit: 10, items: [], editingId: null };
  var categories = SW.meta[cfg.categoriesKey];

  SW.fillSelect($('filter-category'), categories, 'All categories');
  SW.fillSelect($('f-category'), categories);
  if (cfg.hasPayment) {
    SW.fillSelect($('filter-payment'), SW.meta.paymentMethods, 'All payment methods');
    SW.fillSelect($('f-payment'), SW.meta.paymentMethods);
  }

  var form = $('form');
  var modal = $('modal');
  var colCount = cfg.hasPayment ? 6 : 5;

  /* ---------- Load + render ---------- */
  async function load() {
    var sort = $('filter-sort').value.split(':');
    var p = new URLSearchParams({ page: state.page, limit: state.limit, sort: sort[0], order: sort[1] });
    var search = $('filter-search').value.trim();
    if (search) p.set('search', search);
    if ($('filter-category').value) p.set('category', $('filter-category').value);
    if (cfg.hasPayment && $('filter-payment').value) p.set('payment_method', $('filter-payment').value);
    if ($('filter-from').value) p.set('from', $('filter-from').value);
    if ($('filter-to').value) p.set('to', $('filter-to').value);

    var data = await SW.api(cfg.endpoint + '?' + p.toString());
    state.items = data.items;
    state.page = data.page;
    render(data);
  }

  function rowHtml(item) {
    return '<tr>' +
      '<td><div class="cell-title">' + SW.esc(item.title) + '</div>' +
      (item.description ? '<div class="cell-sub" title="' + SW.esc(item.description) + '">' + SW.esc(item.description) + '</div>' : '') + '</td>' +
      '<td><span class="badge">' + SW.esc(item.category) + '</span></td>' +
      (cfg.hasPayment ? '<td>' + SW.esc(item.payment_method) + '</td>' : '') +
      '<td>' + SW.esc(SW.formatDate(item.date)) + '</td>' +
      '<td class="num ' + cfg.amountClass + '">' + SW.esc(SW.money(item.amount)) + '</td>' +
      '<td class="actions-col"><div class="row-actions">' +
      '<button class="icon-btn" type="button" data-action="edit" data-id="' + item.id + '" title="Edit" aria-label="Edit">' + SW.icon('edit') + '</button>' +
      '<button class="icon-btn btn-del" type="button" data-action="delete" data-id="' + item.id + '" title="Delete" aria-label="Delete">' + SW.icon('trash') + '</button>' +
      '</div></td></tr>';
  }

  function render(data) {
    $('tbody').innerHTML = data.items.length
      ? data.items.map(rowHtml).join('')
      : '<tr><td colspan="' + colCount + '" class="empty-row">No ' + cfg.plural + ' found. Click "Add ' + cfg.label + '" to create one.</td></tr>';
    $('summary-count').textContent = data.total + ' record' + (data.total === 1 ? '' : 's');
    $('summary-total').textContent = SW.money(data.totalAmount);
    SW.renderPager($('pager'), data.page, data.pages, data.total, function (page) { state.page = page; load().catch(handleError); });
  }

  function handleError(e) {
    if (e && e.status === 401) return;
    SW.toast(e.message || 'Something went wrong.', 'error');
  }

  /* ---------- Filters ---------- */
  function reload() { state.page = 1; load().catch(handleError); }
  $('filter-search').addEventListener('input', SW.debounce(reload, 300));
  ['filter-category', 'filter-from', 'filter-to', 'filter-sort'].concat(cfg.hasPayment ? ['filter-payment'] : []).forEach(function (id) {
    $(id).addEventListener('change', reload);
  });
  $('btn-clear').addEventListener('click', function () {
    $('filter-search').value = '';
    $('filter-category').value = '';
    $('filter-from').value = '';
    $('filter-to').value = '';
    $('filter-sort').value = 'date:desc';
    if (cfg.hasPayment) $('filter-payment').value = '';
    reload();
  });

  /* ---------- Modal ---------- */
  function openModal(item) {
    SW.clearFormErrors(form);
    form.reset();
    state.editingId = item ? item.id : null;
    $('modal-title').textContent = (item ? 'Edit ' : 'Add ') + cfg.label;
    $('btn-save').textContent = item ? 'Save changes' : 'Save ' + cfg.label.toLowerCase();
    $('f-date').value = item ? item.date : SW.todayStr();
    if (item) {
      $('f-title').value = item.title;
      $('f-amount').value = item.amount;
      $('f-category').value = item.category;
      $('f-description').value = item.description || '';
      if (cfg.hasPayment) $('f-payment').value = item.payment_method;
    }
    modal.hidden = false;
    $('f-title').focus();
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
      title: $('f-title').value.trim(),
      amount: $('f-amount').value,
      category: $('f-category').value,
      date: $('f-date').value,
      description: $('f-description').value.trim()
    };
    if (cfg.hasPayment) body.payment_method = $('f-payment').value;

    var errors = {};
    if (!body.title) errors.title = 'Title is required.';
    if (!(Number(body.amount) > 0)) errors.amount = 'Enter an amount greater than 0.';
    if (!body.date) errors.date = 'Please choose a date.';
    if (Object.keys(errors).length) return SW.showFormErrors(form, { errors: errors });

    var btn = $('btn-save');
    btn.disabled = true;
    try {
      var editing = state.editingId;
      var res = await SW.api(editing ? cfg.endpoint + '/' + editing : cfg.endpoint, { method: editing ? 'PUT' : 'POST', body: body });
      SW.toast(res.message);
      closeModal();
      await load();
    } catch (err) {
      SW.showFormErrors(form, err);
    } finally {
      btn.disabled = false;
    }
  });

  /* ---------- Edit / delete buttons ---------- */
  $('tbody').addEventListener('click', async function (e) {
    var btn = e.target.closest('button[data-action]');
    if (!btn) return;
    var id = Number(btn.dataset.id);
    var item = state.items.find(function (i) { return i.id === id; });
    if (!item) return;
    if (btn.dataset.action === 'edit') return openModal(item);

    var ok = await SW.confirm('Delete "' + item.title + '" (' + SW.money(item.amount) + ')? This cannot be undone.');
    if (!ok) return;
    try {
      var res = await SW.api(cfg.endpoint + '/' + id, { method: 'DELETE' });
      SW.toast(res.message);
      await load();
    } catch (err) {
      handleError(err);
    }
  });

  return load();
};
