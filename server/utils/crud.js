'use strict';
/**
 * Builds a complete CRUD router for a money table (incomes or expenses).
 * Every query is parameterized and always filtered by the logged-in user's id,
 * so a user can never read, edit or delete somebody else's records.
 */
const express = require('express');
const { body, param } = require('express-validator');
const db = require('../config/database');
const { handleValidation, isValidDate, isValidAmount, round2 } = require('./validate');

const escapeLike = (s) => String(s).replace(/[\\%_]/g, '\\$&');
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function createCrudRouter({ table, label, categories, paymentMethods }) {
  const router = express.Router();
  const hasPayment = Array.isArray(paymentMethods);
  const fields = ['title', 'amount', 'category'].concat(hasPayment ? ['payment_method'] : [], ['date', 'description']);
  const selectCols = ['id', 'title', 'amount', 'category'].concat(hasPayment ? ['payment_method'] : [], ['date', 'description', 'created_at']).join(', ');

  const rules = [
    body('title').isString().withMessage('Title is required.').bail().trim()
      .isLength({ min: 1, max: 100 }).withMessage('Title is required (max 100 characters).'),
    body('amount').custom(isValidAmount).withMessage('Amount must be a number greater than 0.'),
    body('category').isIn(categories).withMessage('Please choose a valid category.'),
    body('date').custom(isValidDate).withMessage('Please enter a valid date.'),
    body('description').optional({ nullable: true }).isString().withMessage('Description must be text.').bail().trim()
      .isLength({ max: 500 }).withMessage('Description can be at most 500 characters.'),
  ];
  if (hasPayment) rules.push(body('payment_method').isIn(paymentMethods).withMessage('Please choose a valid payment method.'));
  const idRule = param('id').isInt({ min: 1 }).withMessage('Invalid record id.');

  function valuesFromBody(b) {
    const v = {
      title: b.title,
      amount: round2(b.amount),
      category: b.category,
      date: b.date,
      description: b.description || '',
    };
    if (hasPayment) v.payment_method = b.payment_method;
    return v;
  }

  // LIST: search, filters, sorting, pagination
  router.get('/', (req, res) => {
    const q = req.query;
    const where = ['user_id = ?'];
    const params = [req.user.id];

    if (typeof q.search === 'string' && q.search.trim()) {
      const like = `%${escapeLike(q.search.trim())}%`;
      where.push("(title LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\')");
      params.push(like, like);
    }
    if (typeof q.category === 'string' && q.category) { where.push('category = ?'); params.push(q.category); }
    if (hasPayment && typeof q.payment_method === 'string' && q.payment_method) { where.push('payment_method = ?'); params.push(q.payment_method); }
    if (typeof q.from === 'string' && DATE_RE.test(q.from)) { where.push('date >= ?'); params.push(q.from); }
    if (typeof q.to === 'string' && DATE_RE.test(q.to)) { where.push('date <= ?'); params.push(q.to); }

    const sortCols = { date: 'date', amount: 'amount', title: 'title' };
    const col = sortCols[q.sort] || 'date';
    const dir = q.order === 'asc' ? 'ASC' : 'DESC';
    const limit = Math.min(Math.max(parseInt(q.limit, 10) || 10, 1), 100);
    const whereSql = where.join(' AND ');

    const agg = db.prepare(`SELECT COUNT(*) AS total, COALESCE(SUM(amount), 0) AS sum FROM ${table} WHERE ${whereSql}`).get(...params);
    const pages = Math.max(Math.ceil(agg.total / limit), 1);
    const page = Math.min(Math.max(parseInt(q.page, 10) || 1, 1), pages);
    const items = db
      .prepare(`SELECT ${selectCols} FROM ${table} WHERE ${whereSql} ORDER BY ${col} ${dir}, id ${dir} LIMIT ? OFFSET ?`)
      .all(...params, limit, (page - 1) * limit);

    res.json({ items, total: agg.total, totalAmount: round2(agg.sum), page, pages, limit });
  });

  // CREATE
  router.post('/', rules, handleValidation, (req, res) => {
    const v = valuesFromBody(req.body);
    const sql = `INSERT INTO ${table} (user_id, ${fields.join(', ')}) VALUES (?, ${fields.map(() => '?').join(', ')})`;
    const info = db.prepare(sql).run(req.user.id, ...fields.map((f) => v[f]));
    const item = db.prepare(`SELECT ${selectCols} FROM ${table} WHERE id = ? AND user_id = ?`).get(info.lastInsertRowid, req.user.id);
    res.status(201).json({ message: `${label} added successfully.`, item });
  });

  // UPDATE (ownership checked in the WHERE clause)
  router.put('/:id', [idRule, ...rules], handleValidation, (req, res) => {
    const v = valuesFromBody(req.body);
    const sql = `UPDATE ${table} SET ${fields.map((f) => `${f} = ?`).join(', ')} WHERE id = ? AND user_id = ?`;
    const info = db.prepare(sql).run(...fields.map((f) => v[f]), Number(req.params.id), req.user.id);
    if (info.changes === 0) return res.status(404).json({ message: `${label} record not found.` });
    const item = db.prepare(`SELECT ${selectCols} FROM ${table} WHERE id = ? AND user_id = ?`).get(Number(req.params.id), req.user.id);
    res.json({ message: `${label} updated successfully.`, item });
  });

  // DELETE (ownership checked in the WHERE clause)
  router.delete('/:id', [idRule], handleValidation, (req, res) => {
    const info = db.prepare(`DELETE FROM ${table} WHERE id = ? AND user_id = ?`).run(Number(req.params.id), req.user.id);
    if (info.changes === 0) return res.status(404).json({ message: `${label} record not found.` });
    res.json({ message: `${label} deleted.` });
  });

  return router;
}

module.exports = { createCrudRouter };
