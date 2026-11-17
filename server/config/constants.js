'use strict';

const INCOME_CATEGORIES = ['Salary', 'Freelancing', 'Business', 'Pocket Money', 'Investment Returns', 'Other Income'];
const EXPENSE_CATEGORIES = ['Food', 'Shopping', 'Transportation', 'Education', 'Healthcare', 'Entertainment', 'Bills', 'Travel', 'Other'];
const PAYMENT_METHODS = ['Cash', 'UPI', 'Debit Card', 'Credit Card', 'Net Banking', 'Wallet', 'Other'];
const CURRENCIES = ['INR', 'USD', 'EUR'];
const THEMES = ['light', 'dark'];
const OVERALL_BUDGET = 'Overall';
const BUDGET_CATEGORIES = [OVERALL_BUDGET, ...EXPENSE_CATEGORIES];

module.exports = {
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  CURRENCIES,
  THEMES,
  OVERALL_BUDGET,
  BUDGET_CATEGORIES,
};
