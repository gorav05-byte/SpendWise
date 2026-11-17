'use strict';
const { createCrudRouter } = require('../utils/crud');
const { EXPENSE_CATEGORIES, PAYMENT_METHODS } = require('../config/constants');

module.exports = createCrudRouter({
  table: 'expenses',
  label: 'Expense',
  categories: EXPENSE_CATEGORIES,
  paymentMethods: PAYMENT_METHODS,
});
