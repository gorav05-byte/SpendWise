'use strict';
const { validationResult } = require('express-validator');

/** Sends a 400 with per-field messages if express-validator found problems. */
function handleValidation(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const errors = {};
  result.array().forEach((e) => {
    const key = e.path || e.param;
    if (key && !errors[key]) errors[key] = e.msg;
  });
  return res.status(400).json({ message: Object.values(errors)[0] || 'Invalid input.', errors });
}

/** Strict YYYY-MM-DD check (rejects things like 2026-02-31). */
function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  if (y < 1970 || y > 2100) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Money amount check: a real number between 0.01 and 10 billion. */
function isValidAmount(value) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean' || typeof value === 'object') return false;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0.01 && n <= 1e10;
}

/** Wraps async route handlers so thrown errors reach the error middleware. */
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const round1 = (n) => Math.round((Number(n) || 0) * 10) / 10;

module.exports = { handleValidation, isValidDate, isValidAmount, wrap, round2, round1 };
