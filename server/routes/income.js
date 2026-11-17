'use strict';
const { createCrudRouter } = require('../utils/crud');
const { INCOME_CATEGORIES } = require('../config/constants');

module.exports = createCrudRouter({
  table: 'incomes',
  label: 'Income',
  categories: INCOME_CATEGORIES,
});
