'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const db = require('../config/database');
const C = require('../config/constants');
const { requireAuth, setAuthCookie, clearAuthCookie } = require('../middleware/auth');
const { handleValidation, wrap } = require('../utils/validate');
const { getSettings } = require('../utils/settings');

const router = express.Router();

// A real bcrypt hash used to keep login timing the same when the email does not exist.
const DUMMY_HASH = bcrypt.hashSync('spendwise-dummy-password', 10);

// Very small in-memory brute-force protection: 10 failed logins per 15 minutes per IP + email.
const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 10;
function entry(key) {
  const now = Date.now();
  if (attempts.size > 5000) attempts.clear();
  let a = attempts.get(key);
  if (!a || now - a.start > WINDOW_MS) {
    a = { count: 0, start: now };
    attempts.set(key, a);
  }
  return a;
}

const passwordRule = body('password')
  .isString().withMessage('Password is required.').bail()
  .isLength({ min: 8, max: 72 }).withMessage('Password must be 8 to 72 characters.')
  .matches(/[A-Za-z]/).withMessage('Password must contain at least one letter.')
  .matches(/\d/).withMessage('Password must contain at least one number.');

const emailRule = body('email').isString().withMessage('Email is required.').bail()
  .trim().toLowerCase()
  .isEmail().withMessage('Please enter a valid email address.')
  .isLength({ max: 120 }).withMessage('Email is too long.');

// ---------- Register ----------
router.post(
  '/register',
  [
    body('name').isString().withMessage('Full name is required.').bail().trim()
      .isLength({ min: 2, max: 60 }).withMessage('Full name must be 2 to 60 characters.'),
    emailRule,
    passwordRule,
    body('confirmPassword').custom((value, { req }) => value === req.body.password).withMessage('Passwords do not match.'),
  ],
  handleValidation,
  wrap(async (req, res) => {
    const { name, email, password } = req.body;

    if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
      return res.status(409).json({ message: 'An account with this email already exists.', errors: { email: 'An account with this email already exists.' } });
    }

    const hash = await bcrypt.hash(password, 10);
    try {
      db.transaction(() => {
        const info = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)').run(name, email, hash);
        db.prepare('INSERT INTO settings (user_id) VALUES (?)').run(info.lastInsertRowid);
      })();
    } catch (err) {
      if (String(err.code).startsWith('SQLITE_CONSTRAINT')) {
        return res.status(409).json({ message: 'An account with this email already exists.', errors: { email: 'An account with this email already exists.' } });
      }
      throw err;
    }
    res.status(201).json({ message: 'Registration successful! Please log in.' });
  })
);

// ---------- Login ----------
router.post(
  '/login',
  [
    body('email').isString().withMessage('Email is required.').bail().trim().toLowerCase().isEmail().withMessage('Please enter a valid email address.'),
    body('password').isString().notEmpty().withMessage('Password is required.'),
  ],
  handleValidation,
  wrap(async (req, res) => {
    const { email, password } = req.body;
    const remember = req.body.remember === true;
    const key = `${req.ip}|${email}`;
    const a = entry(key);
    if (a.count >= MAX_FAILS) {
      return res.status(429).json({ message: 'Too many failed attempts. Please try again in 15 minutes.' });
    }

    const user = db.prepare('SELECT id, name, email, password FROM users WHERE email = ?').get(email);
    const ok = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);
    if (!user || !ok) {
      a.count += 1;
      return res.status(401).json({ message: 'Incorrect email or password.' });
    }

    attempts.delete(key);
    setAuthCookie(res, user.id, remember);
    res.json({ message: 'Login successful.', user: { id: user.id, name: user.name, email: user.email } });
  })
);

// ---------- Logout ----------
router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ message: 'Logged out.' });
});

// ---------- Current user (used by every page on load) ----------
router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: req.user,
    settings: getSettings(req.user.id),
    meta: {
      incomeCategories: C.INCOME_CATEGORIES,
      expenseCategories: C.EXPENSE_CATEGORIES,
      paymentMethods: C.PAYMENT_METHODS,
      budgetCategories: C.BUDGET_CATEGORIES,
      currencies: C.CURRENCIES,
      overallBudget: C.OVERALL_BUDGET,
    },
  });
});

module.exports = router;
