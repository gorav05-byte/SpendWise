'use strict';
const express = require('express');
const { dashboardData } = require('../utils/stats');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(dashboardData(req.user.id));
});

module.exports = router;
