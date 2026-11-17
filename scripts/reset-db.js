'use strict';
/** Deletes the local SQLite database. A fresh empty one is created the next time you run "npm start". */
const fs = require('fs');
const { dbPath } = require('../server/config/env');

let removed = 0;
['', '-wal', '-shm'].forEach((suffix) => {
  const file = dbPath + suffix;
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    removed += 1;
  }
});

console.log(removed ? `Database deleted (${dbPath}). Run "npm start" to create a fresh one.` : 'No database file found. Nothing to reset.');
