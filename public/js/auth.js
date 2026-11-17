/* Login and Registration pages */
SW.start(function () {
  'use strict';

  // Show / hide password buttons
  document.querySelectorAll('.toggle-pw').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var input = SW.$(btn.dataset.target);
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.textContent = show ? 'Hide' : 'Show';
    });
  });

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /* ---------------- Login ---------------- */
  var loginForm = SW.$('login-form');
  if (loginForm) {
    if (new URLSearchParams(window.location.search).get('registered')) {
      var notice = SW.$('notice');
      notice.textContent = 'Registration successful! Please log in with your new account.';
      notice.hidden = false;
    }

    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      SW.clearFormErrors(loginForm);
      var email = SW.$('email').value.trim();
      var password = SW.$('password').value;
      var errors = {};
      if (!EMAIL_RE.test(email)) errors.email = 'Please enter a valid email address.';
      if (!password) errors.password = 'Password is required.';
      if (Object.keys(errors).length) return SW.showFormErrors(loginForm, { errors: errors });

      var btn = SW.$('submit-btn');
      btn.disabled = true;
      btn.textContent = 'Logging in...';
      try {
        await SW.api('/api/auth/login', { method: 'POST', body: { email: email, password: password, remember: SW.$('remember').checked } });
        window.location.href = '/dashboard.html';
      } catch (err) {
        SW.showFormErrors(loginForm, { message: err.message });
        btn.disabled = false;
        btn.textContent = 'Login';
      }
    });
  }

  /* ---------------- Register ---------------- */
  var registerForm = SW.$('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      SW.clearFormErrors(registerForm);
      var name = SW.$('name').value.trim();
      var email = SW.$('email').value.trim();
      var password = SW.$('password').value;
      var confirmPassword = SW.$('confirmPassword').value;

      var errors = {};
      if (name.length < 2) errors.name = 'Full name must be at least 2 characters.';
      if (!EMAIL_RE.test(email)) errors.email = 'Please enter a valid email address.';
      if (password.length < 8) errors.password = 'Password must be at least 8 characters.';
      else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) errors.password = 'Password must contain letters and numbers.';
      if (confirmPassword !== password) errors.confirmPassword = 'Passwords do not match.';
      if (Object.keys(errors).length) return SW.showFormErrors(registerForm, { errors: errors });

      var btn = SW.$('submit-btn');
      btn.disabled = true;
      btn.textContent = 'Creating account...';
      try {
        await SW.api('/api/auth/register', { method: 'POST', body: { name: name, email: email, password: password, confirmPassword: confirmPassword } });
        SW.toast('Registration successful! Redirecting to login...');
        setTimeout(function () { window.location.href = '/login.html?registered=1'; }, 1200);
      } catch (err) {
        SW.showFormErrors(registerForm, err);
        btn.disabled = false;
        btn.textContent = 'Register';
      }
    });
  }
});
