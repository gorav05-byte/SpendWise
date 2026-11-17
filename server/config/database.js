'use strict';
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { dbPath } = require('./env');
const schema = require('./schema');

// The database file and its folder are created automatically.
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Automatic table creation on every start.
db.exec(schema);

module.exports = db;
