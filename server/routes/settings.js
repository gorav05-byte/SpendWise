'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const db = require('../config/database');
const { CURRENCIES, THEMES } = require('../config/constants');
const { handleValidation, wrap } = require('../utils/validate');
const { getSettings } = require('../utils/settings');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ settings: getSettings(req.user.id) });
});

// Currency and theme (both optional, send either or both)
router.put(
  '/',
  [
    body('currency').optional().isIn(CURRENCIES).withMessage('Currency must be INR, USD or EUR.'),
    body('theme').optional().isIn(THEMES).withMessage('Theme must be light or dark.'),
  ],
  handleValidation,
  (req, res) => {
    const current = getSettings(req.user.id);
    const next = {
      currency: req.body.currency || current.currency,
      theme: req.body.theme || current.theme,
    };
    db.prepare('UPDATE settings SET currency = ?, theme = ? WHERE user_id = ?').run(next.currency, next.theme, req.user.id);
    res.json({ message: 'Settings saved.', settings: next });
  }
);

// Update profile (full name)
router.put(
  '/profile',
  [
    body('name').isString().withMessage('Full name is required.').bail().trim()
      .isLength({ min: 2, max: 60 }).withMessage('Full name must be 2 to 60 characters.'),
  ],
  handleValidation,
  (req, res) => {
    db.prepare('UPDATE users SET name = ? WHERE id = ?').run(req.body.name, req.user.id);
    res.json({ message: 'Profile updated.', user: { id: req.user.id, name: req.body.name, email: req.user.email } });
  }
);

// Change password
router.put(
  '/password',
  [
    body('currentPassword').isString().notEmpty().withMessage('Current password is required.'),
    body('newPassword')
      .isString().withMessage('New password is required.').bail()
      .isLength({ min: 8, max: 72 }).withMessage('New password must be 8 to 72 characters.')
      .matches(/[A-Za-z]/).withMessage('New password must contain at least one letter.')
      .matches(/\d/).withMessage('New password must contain at least one number.'),
    body('confirmPassword').custom((value, { req }) => value === req.body.newPassword).withMessage('Passwords do not match.'),
  ],
  handleValidation,
  wrap(async (req, res) => {
    const row = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
    const ok = await bcrypt.compare(req.body.currentPassword, row.password);
    if (!ok) {
      return res.status(400).json({ message: 'Current password is incorrect.', errors: { currentPassword: 'Current password is incorrect.' } });
    }
    if (req.body.currentPassword === req.body.newPassword) {
      return res.status(400).json({ message: 'New password must be different from the current one.', errors: { newPassword: 'New password must be different from the current one.' } });
    }
    const hash = await bcrypt.hash(req.body.newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, req.user.id);
    res.json({ message: 'Password changed successfully.' });
  })
);

module.exports = router;
