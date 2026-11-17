'use strict';
const express = require('express');
const { listTransactions } = require('../utils/transactionsQuery');
const { INCOME_CATEGORIES, EXPENSE_CATEGORIES } = require('../config/constants');

const router = express.Router();

// Combined income + expense history with search, filters, sorting and pagination
router.get('/', (req, res) => {
  const result = listTransactions(req.user.id, req.query);
  res.json({
    ...result,
    categories: Array.from(new Set([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES])),
  });
});

module.exports = router;
