'use strict';
const express = require('express');
const { reportData } = require('../utils/stats');
const { isMonthKey, monthKey } = require('../utils/dates');

const router = express.Router();

// ?month=YYYY-MM  (defaults to the current month)
router.get('/monthly', (req, res) => {
  const mk = isMonthKey(req.query.month) ? req.query.month : monthKey();
  res.json(reportData(req.user.id, mk));
});

module.exports = router;
