'use strict';
const db = require('../config/database');
const { OVERALL_BUDGET } = require('../config/constants');
const { pad, monthRange } = require('./dates');
const { round2, round1 } = require('./validate');

/** ok < 75% <= warning < 90% <= critical < 100% <= exceeded */
function statusFor(percent) {
  if (percent >= 100) return 'exceeded';
  if (percent >= 90) return 'critical';
  if (percent >= 75) return 'warning';
  return 'ok';
}

function messageFor(budget) {
  const label = budget.category === OVERALL_BUDGET ? 'Overall monthly budget' : `${budget.category} budget`;
  switch (budget.status) {
    case 'exceeded': return `${label} has been exceeded (${budget.percent}% used).`;
    case 'critical': return `${label}: ${budget.percent}% used. Almost exhausted!`;
    case 'warning': return `${label}: ${budget.percent}% used. Keep an eye on your spending.`;
    default: return `${label}: on track.`;
  }
}

/**
 * Budgets of one month with live progress, calculated from the user's real expense records.
 * The "Overall" budget is compared with all expenses of the month; category budgets with that category only.
 */
function getBudgetProgress(userId, month, year) {
  const [from, to] = monthRange(`${year}-${pad(month)}`);
  const budgets = db
    .prepare(`SELECT id, category, amount, month, year FROM budgets
              WHERE user_id = ? AND month = ? AND year = ?
              ORDER BY (category = '${OVERALL_BUDGET}') DESC, category`)
    .all(userId, month, year);

  const spentRows = db
    .prepare('SELECT category, SUM(amount) AS spent FROM expenses WHERE user_id = ? AND date BETWEEN ? AND ? GROUP BY category')
    .all(userId, from, to);
  const spentByCategory = {};
  let totalSpent = 0;
  spentRows.forEach((r) => {
    spentByCategory[r.category] = r.spent;
    totalSpent += r.spent;
  });

  return budgets.map((b) => {
    const spent = round2(b.category === OVERALL_BUDGET ? totalSpent : spentByCategory[b.category] || 0);
    const percent = round1((spent / b.amount) * 100);
    const item = {
      id: b.id,
      category: b.category,
      amount: round2(b.amount),
      month: b.month,
      year: b.year,
      spent,
      remaining: round2(b.amount - spent),
      percent,
      status: statusFor(percent),
    };
    item.message = messageFor(item);
    return item;
  });
}

module.exports = { getBudgetProgress, statusFor };
