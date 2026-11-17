/* Settings: profile, password, currency, theme, logout */
SW.start(function () {
  'use strict';
  var $ = SW.$;

  function fillProfile() {
    $('p-name').value = SW.user.name;
    $('p-email').value = SW.user.email;
    $('p-name-display').textContent = SW.user.name;
    $('p-email-display').textContent = SW.user.email;
    $('p-avatar').textContent = SW.user.name.trim().charAt(0).toUpperCase();
    var created = String(SW.user.created_at || '').slice(0, 10);
    $('p-since').value = created ? SW.formatDate(created) : '';
  }
  fillProfile();

  $('s-currency').value = SW.settings.currency;
  document.querySelectorAll('input[name="theme"]').forEach(function (r) { r.checked = r.value === SW.settings.theme; });
  window.addEventListener('sw:themechange', function () {
    document.querySelectorAll('input[name="theme"]').forEach(function (r) { r.checked = r.value === SW.settings.theme; });
  });

  // Live preview of the theme while choosing
  document.querySelectorAll('input[name="theme"]').forEach(function (r) {
    r.addEventListener('change', function () { SW.applyTheme(r.value); });
  });

  /* ---------- Profile ---------- */
  var profileForm = $('profile-form');
  profileForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    SW.clearFormErrors(profileForm);
    var name = $('p-name').value.trim();
    if (name.length < 2) return SW.showFormErrors(profileForm, { errors: { name: 'Full name must be at least 2 characters.' } });
    var btn = $('profile-btn');
    btn.disabled = true;
    try {
      var res = await SW.api('/api/settings/profile', { method: 'PUT', body: { name: name } });
      SW.user.name = res.user.name;
      fillProfile();
      $('user-name').textContent = SW.user.name;
      $('user-avatar').textContent = SW.user.name.trim().charAt(0).toUpperCase();
      SW.toast(res.message);
    } catch (err) {
      SW.showFormErrors(profileForm, err);
    } finally {
      btn.disabled = false;
    }
  });

  /* ---------- Password ---------- */
  var pwForm = $('password-form');
  pwForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    SW.clearFormErrors(pwForm);
    var body = {
      currentPassword: $('currentPassword').value,
      newPassword: $('newPassword').value,
      confirmPassword: $('confirmPassword').value
    };
    var errors = {};
    if (!body.currentPassword) errors.currentPassword = 'Current password is required.';
    if (body.newPassword.length < 8) errors.newPassword = 'New password must be at least 8 characters.';
    else if (!/[A-Za-z]/.test(body.newPassword) || !/\d/.test(body.newPassword)) errors.newPassword = 'New password must contain letters and numbers.';
    if (body.confirmPassword !== body.newPassword) errors.confirmPassword = 'Passwords do not match.';
    if (Object.keys(errors).length) return SW.showFormErrors(pwForm, { errors: errors });

    var btn = $('password-btn');
    btn.disabled = true;
    try {
      var res = await SW.api('/api/settings/password', { method: 'PUT', body: body });
      pwForm.reset();
      SW.toast(res.message);
    } catch (err) {
      SW.showFormErrors(pwForm, err);
    } finally {
      btn.disabled = false;
    }
  });

  /* ---------- Preferences ---------- */
  var prefsForm = $('prefs-form');
  prefsForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    SW.clearFormErrors(prefsForm);
    var themeInput = document.querySelector('input[name="theme"]:checked');
    var body = { currency: $('s-currency').value, theme: themeInput ? themeInput.value : SW.settings.theme };
    var btn = $('prefs-btn');
    btn.disabled = true;
    try {
      var res = await SW.api('/api/settings', { method: 'PUT', body: body });
      SW.settings.currency = res.settings.currency;
      SW.applyTheme(res.settings.theme);
      SW.toast(res.message);
    } catch (err) {
      SW.showFormErrors(prefsForm, err);
    } finally {
      btn.disabled = false;
    }
  });

  $('settings-logout').addEventListener('click', SW.logout);
});
