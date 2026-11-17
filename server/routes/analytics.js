'use strict';
const express = require('express');
const { analyticsData } = require('../utils/stats');

const router = express.Router();

// ?months=3|6|12|all
router.get('/', (req, res) => {
  res.json(analyticsData(req.user.id, String(req.query.months || '12')));
});

module.exports = router;
