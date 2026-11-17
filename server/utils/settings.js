'use strict';
const db = require('../config/database');

/** Returns the user's settings, creating the default row if it is missing. */
function getSettings(userId) {
  let row = db.prepare('SELECT currency, theme FROM settings WHERE user_id = ?').get(userId);
  if (!row) {
    db.prepare('INSERT INTO settings (user_id) VALUES (?)').run(userId);
    row = db.prepare('SELECT currency, theme FROM settings WHERE user_id = ?').get(userId);
  }
  return { currency: row.currency, theme: row.theme };
}

module.exports = { getSettings };
