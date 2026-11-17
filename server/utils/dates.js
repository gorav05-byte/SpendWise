'use strict';
/** Date helpers. All dates are plain "YYYY-MM-DD" strings in the server's local time. */
const pad = (n) => String(n).padStart(2, '0');

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "2026-11" for a Date. */
function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

function isMonthKey(s) {
  return typeof s === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
}

/** First and last possible date strings of a month (string comparison works because of the ISO format). */
function monthRange(mk) {
  return [`${mk}-01`, `${mk}-31`];
}

function prevMonthKey(mk) {
  const [y, m] = mk.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${pad(m - 1)}`;
}

/** The last n month keys ending with the current month, oldest first. */
function lastMonthKeys(n) {
  const now = new Date();
  const keys = [];
  for (let i = n - 1; i >= 0; i--) {
    keys.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  }
  return keys;
}

/** Every month key from `first` to `last`, inclusive. */
function monthKeysBetween(first, last) {
  const keys = [];
  let [y, m] = first.split('-').map(Number);
  const [ly, lm] = last.split('-').map(Number);
  while (y < ly || (y === ly && m <= lm)) {
    keys.push(`${y}-${pad(m)}`);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return keys;
}

module.exports = { pad, today, monthKey, isMonthKey, monthRange, prevMonthKey, lastMonthKeys, monthKeysBetween };
