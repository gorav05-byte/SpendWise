'use strict';
const db = require('../config/database');
const { round2 } = require('./validate');

const escapeLike = (s) => String(s).replace(/[\\%_]/g, '\\$&');
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Income and expenses combined into one virtual table.
const UNION_SQL = `
  SELECT id, 'income' AS type, title, category, amount, date, description, NULL AS payment_method, created_at
    FROM incomes WHERE user_id = ?
  UNION ALL
  SELECT id, 'expense' AS type, title, category, amount, date, description, payment_method, created_at
    FROM expenses WHERE user_id = ?`;

/**
 * Lists a user's combined transactions with search, filters, sorting and pagination.
 * q: { type, category, search, from, to, sort, order, page, limit }
 */
function listTransactions(userId, q = {}, { maxLimit = 100 } = {}) {
  const where = [];
  const params = [];

  if (q.type === 'income' || q.type === 'expense') { where.push('type = ?'); params.push(q.type); }
  if (typeof q.category === 'string' && q.category) { where.push('category = ?'); params.push(q.category); }
  if (typeof q.search === 'string' && q.search.trim()) {
    const like = `%${escapeLike(q.search.trim())}%`;
    where.push("(title LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\')");
    params.push(like, like);
  }
  if (typeof q.from === 'string' && DATE_RE.test(q.from)) { where.push('date >= ?'); params.push(q.from); }
  if (typeof q.to === 'string' && DATE_RE.test(q.to)) { where.push('date <= ?'); params.push(q.to); }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const sortCols = { date: 'date', amount: 'amount', title: 'title', category: 'category' };
  const col = sortCols[q.sort] || 'date';
  const dir = q.order === 'asc' ? 'ASC' : 'DESC';
  const limit = Math.min(Math.max(parseInt(q.limit, 10) || 10, 1), maxLimit);

  const base = [userId, userId];
  const agg = db
    .prepare(`SELECT COUNT(*) AS total,
                     COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
                     COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense
              FROM (${UNION_SQL}) ${whereSql}`)
    .get(...base, ...params);

  const pages = Math.max(Math.ceil(agg.total / limit), 1);
  const page = Math.min(Math.max(parseInt(q.page, 10) || 1, 1), pages);
  const items = db
    .prepare(`SELECT * FROM (${UNION_SQL}) ${whereSql}
              ORDER BY ${col} ${dir}, created_at ${dir}, id ${dir} LIMIT ? OFFSET ?`)
    .all(...base, ...params, limit, (page - 1) * limit);

  return {
    items,
    total: agg.total,
    page,
    pages,
    limit,
    totals: { income: round2(agg.income), expense: round2(agg.expense) },
  };
}

/** Latest activity ordered by when the record was created (not by its date). */
function recentActivity(userId, limit = 6) {
  return db
    .prepare(`SELECT * FROM (${UNION_SQL}) ORDER BY created_at DESC, id DESC LIMIT ?`)
    .all(userId, userId, limit);
}

/** Every category used by either income or expense records (for the filter drop-down). */
function allCategories(incomeCats, expenseCats) {
  return Array.from(new Set([...incomeCats, ...expenseCats]));
}

module.exports = { listTransactions, recentActivity, allCategories };
