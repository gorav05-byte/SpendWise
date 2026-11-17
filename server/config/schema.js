'use strict';
/** SQL that creates every table and index. Safe to run on every start (IF NOT EXISTS). */
module.exports = `
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password   TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS incomes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  amount      REAL NOT NULL CHECK (amount > 0),
  category    TEXT NOT NULL,
  date        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_incomes_user_date     ON incomes(user_id, date);
CREATE INDEX IF NOT EXISTS idx_incomes_user_category ON incomes(user_id, category);

CREATE TABLE IF NOT EXISTS expenses (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  amount         REAL NOT NULL CHECK (amount > 0),
  category       TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  date           TEXT NOT NULL,
  description    TEXT NOT NULL DEFAULT '',
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date     ON expenses(user_id, date);
CREATE INDEX IF NOT EXISTS idx_expenses_user_category ON expenses(user_id, category);

CREATE TABLE IF NOT EXISTS budgets (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category   TEXT NOT NULL,
  amount     REAL NOT NULL CHECK (amount > 0),
  month      INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year       INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, category, month, year)
);
CREATE INDEX IF NOT EXISTS idx_budgets_user_period ON budgets(user_id, year, month);

CREATE TABLE IF NOT EXISTS settings (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id  INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency IN ('INR','USD','EUR')),
  theme    TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('light','dark'))
);
`;
