'use strict';
/**
 * All financial calculations used by the dashboard, analytics and reports.
 * Everything is calculated from the logged-in user's own records in SQLite.
 */
const db = require('../config/database');
const { round2, round1 } = require('./validate');
const { monthKey, monthRange, prevMonthKey, lastMonthKeys, monthKeysBetween } = require('./dates');
const { getBudgetProgress } = require('./budgetCalc');
const { listTransactions, recentActivity } = require('./transactionsQuery');

function sumBetween(table, userId, from, to) {
  return round2(
    db.prepare(`SELECT COALESCE(SUM(amount), 0) AS s FROM ${table} WHERE user_id = ? AND date BETWEEN ? AND ?`).get(userId, from, to).s
  );
}

function countBetween(table, userId, from, to) {
  return db.prepare(`SELECT COUNT(*) AS c FROM ${table} WHERE user_id = ? AND date BETWEEN ? AND ?`).get(userId, from, to).c;
}

function totalsBetween(userId, from, to) {
  const income = sumBetween('incomes', userId, from, to);
  const expense = sumBetween('expenses', userId, from, to);
  const savings = round2(income - expense);
  return { income, expense, savings, savingsRate: income > 0 ? round1((savings / income) * 100) : 0 };
}

/** Map of "YYYY-MM" -> total for a table between two dates. */
function monthlySeries(table, userId, from, to) {
  const map = new Map();
  db.prepare(`SELECT substr(date, 1, 7) AS m, SUM(amount) AS s FROM ${table}
              WHERE user_id = ? AND date BETWEEN ? AND ? GROUP BY m`)
    .all(userId, from, to)
    .forEach((r) => map.set(r.m, round2(r.s)));
  return map;
}

function byCategory(table, userId, from, to) {
  const rows = db
    .prepare(`SELECT category, SUM(amount) AS total, COUNT(*) AS count FROM ${table}
              WHERE user_id = ? AND date BETWEEN ? AND ? GROUP BY category ORDER BY total DESC`)
    .all(userId, from, to);
  const grand = rows.reduce((a, r) => a + r.total, 0);
  return rows.map((r) => ({
    category: r.category,
    total: round2(r.total),
    count: r.count,
    percent: grand > 0 ? round1((r.total / grand) * 100) : 0,
  }));
}

function largest(table, userId, from, to) {
  const cols = table === 'expenses' ? 'title, amount, category, date' : 'title, amount, category, date';
  return db
    .prepare(`SELECT ${cols} FROM ${table} WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY amount DESC, id DESC LIMIT 1`)
    .get(userId, from, to) || null;
}

function dashboardData(userId) {
  const now = new Date();
  const mk = monthKey(now);
  const [from, to] = monthRange(mk);

  const allIncome = round2(db.prepare('SELECT COALESCE(SUM(amount), 0) AS s FROM incomes WHERE user_id = ?').get(userId).s);
  const allExpense = round2(db.prepare('SELECT COALESCE(SUM(amount), 0) AS s FROM expenses WHERE user_id = ?').get(userId).s);

  const current = totalsBetween(userId, from, to);
  const [pFrom, pTo] = monthRange(prevMonthKey(mk));
  const previous = totalsBetween(userId, pFrom, pTo);
  const transactions = countBetween('incomes', userId, from, to) + countBetween('expenses', userId, from, to);

  const budgets = getBudgetProgress(userId, now.getMonth() + 1, now.getFullYear());
  const keys = lastMonthKeys(6);
  const inc = monthlySeries('incomes', userId, `${keys[0]}-01`, to);
  const exp = monthlySeries('expenses', userId, `${keys[0]}-01`, to);

  return {
    totals: { income: allIncome, expense: allExpense, balance: round2(allIncome - allExpense) },
    month: { key: mk, ...current, transactions },
    previousMonth: previous,
    budget: {
      overall: budgets.find((b) => b.category === 'Overall') || null,
      alerts: budgets.filter((b) => b.status !== 'ok'),
    },
    trend: {
      labels: keys,
      income: keys.map((k) => inc.get(k) || 0),
      expense: keys.map((k) => exp.get(k) || 0),
    },
    expenseByCategory: byCategory('expenses', userId, from, to),
    recentTransactions: listTransactions(userId, { sort: 'date', order: 'desc', limit: 6 }).items,
    recentActivity: recentActivity(userId, 6),
  };
}

function analyticsData(userId, monthsParam) {
  const current = monthKey();
  let keys;
  if (monthsParam === 'all') {
    const row = db
      .prepare(`SELECT MIN(d) AS d FROM (SELECT MIN(date) AS d FROM incomes WHERE user_id = ?
                                         UNION ALL SELECT MIN(date) AS d FROM expenses WHERE user_id = ?)`)
      .get(userId, userId);
    keys = monthKeysBetween(row && row.d ? row.d.slice(0, 7) : current, current);
    if (keys.length > 60) keys = keys.slice(-60);
  } else {
    const n = [3, 6, 12].includes(Number(monthsParam)) ? Number(monthsParam) : 12;
    keys = lastMonthKeys(n);
  }
  const from = `${keys[0]}-01`;
  const to = `${keys[keys.length - 1]}-31`;

  const totals = totalsBetween(userId, from, to);
  const inc = monthlySeries('incomes', userId, from, to);
  const exp = monthlySeries('expenses', userId, from, to);
  const incomeSeries = keys.map((k) => inc.get(k) || 0);
  const expenseSeries = keys.map((k) => exp.get(k) || 0);
  const expenseByCat = byCategory('expenses', userId, from, to);
  const now = new Date();

  return {
    period: { from, to, months: keys.length },
    totals: {
      ...totals,
      avgIncome: round2(totals.income / keys.length),
      avgExpense: round2(totals.expense / keys.length),
    },
    trend: {
      labels: keys,
      income: incomeSeries,
      expense: expenseSeries,
      savings: keys.map((_, i) => round2(incomeSeries[i] - expenseSeries[i])),
    },
    expenseByCategory: expenseByCat,
    incomeByCategory: byCategory('incomes', userId, from, to),
    budgets: getBudgetProgress(userId, now.getMonth() + 1, now.getFullYear()),
    highlights: {
      largestExpense: largest('expenses', userId, from, to),
      largestIncome: largest('incomes', userId, from, to),
      topCategory: expenseByCat[0] || null,
    },
  };
}

function reportData(userId, mk) {
  const [from, to] = monthRange(mk);
  const [y, m] = mk.split('-').map(Number);
  const totals = totalsBetween(userId, from, to);
  const [pFrom, pTo] = monthRange(prevMonthKey(mk));
  const previous = totalsBetween(userId, pFrom, pTo);
  const list = listTransactions(userId, { from, to, sort: 'date', order: 'asc', limit: 1000 }, { maxLimit: 1000 });

  return {
    month: mk,
    totals,
    previous,
    transactionCount: list.total,
    incomeByCategory: byCategory('incomes', userId, from, to),
    expenseByCategory: byCategory('expenses', userId, from, to),
    budgets: getBudgetProgress(userId, m, y),
    highlights: {
      largestExpense: largest('expenses', userId, from, to),
      largestIncome: largest('incomes', userId, from, to),
    },
    transactions: list.items,
  };
}

module.exports = { dashboardData, analyticsData, reportData };
