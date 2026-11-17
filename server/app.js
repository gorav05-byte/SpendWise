'use strict';
const path = require('path');
const { port, root } = require('./config/env'); // loads .env first
const express = require('express');
const cookieParser = require('cookie-parser');
require('./config/database'); // opens the database and creates the tables
const { requireAuth, requirePageAuth, redirectIfAuthed, userFromRequest } = require('./middleware/auth');

const app = express();
const publicDir = path.join(root, 'public');

app.disable('x-powered-by');

// Basic security headers. Everything (scripts, styles, charts) is served from this server only.
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'same-origin',
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  });
  next();
});

app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

// ---------- REST API ----------
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', requireAuth, require('./routes/dashboard'));
app.use('/api/income', requireAuth, require('./routes/income'));
app.use('/api/expenses', requireAuth, require('./routes/expenses'));
app.use('/api/budgets', requireAuth, require('./routes/budgets'));
app.use('/api/transactions', requireAuth, require('./routes/transactions'));
app.use('/api/analytics', requireAuth, require('./routes/analytics'));
app.use('/api/reports', requireAuth, require('./routes/reports'));
app.use('/api/settings', requireAuth, require('./routes/settings'));
app.use('/api', (req, res) => res.status(404).json({ message: 'API route not found.' }));

// ---------- Pages ----------
app.get('/', (req, res) => {
  if (userFromRequest(req)) return res.redirect('/dashboard.html');
  res.sendFile(path.join(publicDir, 'index.html'));
});
app.get('/index.html', (req, res) => res.redirect('/'));

['login', 'register'].forEach((page) => {
  app.get(`/${page}.html`, redirectIfAuthed, (req, res) => res.sendFile(path.join(publicDir, `${page}.html`)));
});

// Private pages: only reachable with a valid login cookie
['dashboard', 'income', 'expenses', 'budgets', 'transactions', 'analytics', 'reports', 'settings'].forEach((page) => {
  app.get(`/${page}.html`, requirePageAuth, (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(publicDir, `${page}.html`));
  });
});

// Chart.js comes from the locally installed npm package (no CDN)
app.use('/vendor', express.static(path.join(root, 'node_modules', 'chart.js', 'dist'), { maxAge: '1d' }));
app.use(express.static(publicDir, { index: false }));

// ---------- Errors ----------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON in request.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ message: 'Request is too large.' });
  console.error(err);
  if (req.path.startsWith('/api')) return res.status(500).json({ message: 'Something went wrong on the server.' });
  res.status(500).send('Something went wrong on the server.');
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`SpendWise is running at http://localhost:${port}`);
  });
}

module.exports = app;
