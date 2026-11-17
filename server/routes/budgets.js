'use strict';
const express = require('express');
const { body, param } = require('express-validator');
const db = require('../config/database');
const { BUDGET_CATEGORIES } = require('../config/constants');
const { handleValidation, isValidAmount, round2 } = require('../utils/validate');
const { getBudgetProgress } = require('../utils/budgetCalc');

const router = express.Router();

const rules = [
  body('category').isIn(BUDGET_CATEGORIES).withMessage('Please choose a valid category.'),
  body('amount').custom(isValidAmount).withMessage('Budget amount must be a number greater than 0.'),
  body('month').isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12.').toInt(),
  body('year').isInt({ min: 2000, max: 2100 }).withMessage('Year must be between 2000 and 2100.').toInt(),
];
const idRule = param('id').isInt({ min: 1 }).withMessage('Invalid budget id.');

const duplicateMessage = 'A budget for this category already exists for that month. Edit the existing one instead.';

// List budgets (with live progress) for a month
router.get('/', (req, res) => {
  const now = new Date();
  let month = parseInt(req.query.month, 10);
  let year = parseInt(req.query.year, 10);
  if (!(month >= 1 && month <= 12)) month = now.getMonth() + 1;
  if (!(year >= 2000 && year <= 2100)) year = now.getFullYear();
  res.json({ month, year, items: getBudgetProgress(req.user.id, month, year) });
});

// Create
router.post('/', rules, handleValidation, (req, res) => {
  const { category, amount, month, year } = req.body;
  try {
    const info = db
      .prepare('INSERT INTO budgets (user_id, category, amount, month, year) VALUES (?, ?, ?, ?, ?)')
      .run(req.user.id, category, round2(amount), month, year);
    const item = getBudgetProgress(req.user.id, month, year).find((b) => b.id === Number(info.lastInsertRowid));
    res.status(201).json({ message: 'Budget created.', item });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ message: duplicateMessage, errors: { category: duplicateMessage } });
    }
    throw err;
  }
});

// Update (ownership checked in the WHERE clause)
router.put('/:id', [idRule, ...rules], handleValidation, (req, res) => {
  const { category, amount, month, year } = req.body;
  try {
    const info = db
      .prepare('UPDATE budgets SET category = ?, amount = ?, month = ?, year = ? WHERE id = ? AND user_id = ?')
      .run(category, round2(amount), month, year, Number(req.params.id), req.user.id);
    if (info.changes === 0) return res.status(404).json({ message: 'Budget not found.' });
    const item = getBudgetProgress(req.user.id, month, year).find((b) => b.id === Number(req.params.id));
    res.json({ message: 'Budget updated.', item });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ message: duplicateMessage, errors: { category: duplicateMessage } });
    }
    throw err;
  }
});

// Delete
router.delete('/:id', [idRule], handleValidation, (req, res) => {
  const info = db.prepare('DELETE FROM budgets WHERE id = ? AND user_id = ?').run(Number(req.params.id), req.user.id);
  if (info.changes === 0) return res.status(404).json({ message: 'Budget not found.' });
  res.json({ message: 'Budget deleted.' });
});

module.exports = router;
