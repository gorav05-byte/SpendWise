'use strict';
/**
 * OPTIONAL demo data. Only runs when you execute:  npm run seed
 * Creates a demo user with a few months of income, expenses and budgets.
 *   Email:    demo@spendwise.com
 *   Password: Demo@1234
 */
const bcrypt = require('bcryptjs');
const db = require('../server/config/database');
const { pad } = require('../server/utils/dates');

const EMAIL = 'demo@spendwise.com';
if (db.prepare('SELECT id FROM users WHERE email = ?').get(EMAIL)) {
  console.log('Demo user already exists. Run "npm run reset-db" first if you want to start over.');
  process.exit(0);
}

// Small deterministic random generator so the demo data looks the same every time
let seed = 42;
const rand = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (a, b) => Math.round(a + rand() * (b - a));

const expenseTemplates = [
  ['Lunch at canteen', 'Food', 120, 350], ['Groceries', 'Food', 400, 1500], ['Swiggy order', 'Food', 200, 600],
  ['Metro card recharge', 'Transportation', 200, 500], ['Cab ride', 'Transportation', 150, 450],
  ['New t-shirt', 'Shopping', 500, 1800], ['Headphones', 'Shopping', 800, 2500],
  ['Course book', 'Education', 300, 900], ['Online course', 'Education', 500, 1500],
  ['Pharmacy', 'Healthcare', 150, 700], ['Movie tickets', 'Entertainment', 300, 800], ['Streaming plan', 'Entertainment', 149, 499],
  ['Electricity bill', 'Bills', 600, 1400], ['Mobile recharge', 'Bills', 199, 599], ['Weekend trip', 'Travel', 1500, 4000],
];
const methods = ['UPI', 'Cash', 'Debit Card', 'Credit Card', 'Net Banking'];

const run = db.transaction(() => {
  const hash = bcrypt.hashSync('Demo@1234', 10);
  const userId = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)').run('Demo User', EMAIL, hash).lastInsertRowid;
  db.prepare('INSERT INTO settings (user_id, currency, theme) VALUES (?, ?, ?)').run(userId, 'INR', 'light');

  const insIncome = db.prepare('INSERT INTO incomes (user_id, title, amount, category, date, description) VALUES (?, ?, ?, ?, ?, ?)');
  const insExpense = db.prepare('INSERT INTO expenses (user_id, title, amount, category, payment_method, date, description) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const now = new Date();

  for (let back = 5; back >= 0; back--) {
    const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const ym = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    const lastDay = back === 0 ? Math.max(now.getDate(), 1) : new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();

    insIncome.run(userId, 'Monthly pocket money', 20000, 'Pocket Money', `${ym}-01`, 'Allowance from home');
    if (rand() > 0.4) insIncome.run(userId, 'Freelance project', between(3000, 9000), 'Freelancing', `${ym}-${pad(Math.min(between(5, 25), lastDay))}`, 'Website work');
    if (rand() > 0.7) insIncome.run(userId, 'Mutual fund returns', between(500, 2000), 'Investment Returns', `${ym}-${pad(Math.min(15, lastDay))}`, '');

    const count = between(14, 22);
    for (let i = 0; i < count; i++) {
      const [title, category, lo, hi] = pick(expenseTemplates);
      insExpense.run(userId, title, between(lo, hi), category, pick(methods), `${ym}-${pad(between(1, lastDay))}`, '');
    }
  }

  const insBudget = db.prepare('INSERT INTO budgets (user_id, category, amount, month, year) VALUES (?, ?, ?, ?, ?)');
  const m = now.getMonth() + 1;
  const y = now.getFullYear();
  [['Overall', 15000], ['Food', 4000], ['Shopping', 2500], ['Transportation', 1500], ['Entertainment', 1000]].forEach(([c, a]) => insBudget.run(userId, c, a, m, y));
});

run();
console.log('Demo data created.\n  Email:    demo@spendwise.com\n  Password: Demo@1234');
